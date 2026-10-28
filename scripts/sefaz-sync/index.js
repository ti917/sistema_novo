// sefaz-sync
//
// Roda pelo GitHub Actions (nao pelo Supabase - o ambiente de Edge Functions
// do Supabase se mostrou instavel pra lidar com certificado digital / mTLS).
//
// O que faz: usa o certificado digital A1 da empresa pra se autenticar no
// webservice nacional da SEFAZ (NFeDistribuicaoDFe) e perguntar "chegou nota
// fiscal nova pro meu CNPJ?". Se chegou, baixa o resumo de cada nota e grava
// na tabela nfecloud_documentos do Supabase (a mesma que o financeiro.html ja
// le pra mostrar na aba Almoxarifado > Notas Recebidas).
//
// Segredo nenhum fica escrito aqui no codigo - tudo vem de variaveis de
// ambiente (GitHub Actions Secrets): SEFAZ_CERT_PFX_BASE64, SEFAZ_CERT_SENHA,
// SEFAZ_CNPJ, SEFAZ_UF_CODIGO, SEFAZ_AMBIENTE, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

const https = require("https");
const zlib = require("zlib");
const { createClient } = require("@supabase/supabase-js");
const { extrairChavePemECertPem, enviarCienciaDaOperacao } = require("./manifestacao");

const MAX_CIENCIAS_POR_EXECUCAO = 50; // nao manda mais que isso por rodada

const SEFAZ_HOST = "www1.nfe.fazenda.gov.br";
const SEFAZ_PATH = "/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";
const SOAP_ACTION = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse";
const MAX_PAGINAS = 20;

function extractTag(xml, tag) {
    const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
    return m ? m[1].trim() : null;
}

function decodificarChave(chave) {
    if (!/^\d{44}$/.test(chave || "")) return null;
    return {
        mod: chave.substring(20, 22),
        serie: chave.substring(22, 25),
        numero: chave.substring(25, 34),
    };
}

function buildEnvelope(cUFAutor, cnpj, tpAmb, ultNSU) {
    const distDFeInt = `<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>${tpAmb}</tpAmb><cUFAutor>${cUFAutor}</cUFAutor><CNPJ>${cnpj}</CNPJ><distNSU><ultNSU>${ultNSU.padStart(15, "0")}</ultNSU></distNSU></distDFeInt>`;
    return `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe"><nfeDadosMsg>${distDFeInt}</nfeDadosMsg></nfeDistDFeInteresse></soap12:Body></soap12:Envelope>`;
}

function postSoap(envelope, pfxBuffer, senha) {
    return new Promise((resolve, reject) => {
        const body = Buffer.from(envelope, "utf-8");
        const req = https.request(
            {
                host: SEFAZ_HOST,
                path: SEFAZ_PATH,
                method: "POST",
                pfx: pfxBuffer,
                passphrase: senha,
                headers: {
                    "Content-Type": "application/soap+xml; charset=utf-8",
                    "SOAPAction": SOAP_ACTION,
                    "Content-Length": body.length,
                },
                timeout: 30000,
            },
            (res) => {
                const chunks = [];
                res.on("data", (c) => chunks.push(c));
                res.on("end", () => resolve({ status: res.statusCode, texto: Buffer.concat(chunks).toString("utf-8") }));
            }
        );
        req.on("timeout", () => req.destroy(new Error("timeout de 30s falando com a SEFAZ")));
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}

async function main() {
    const pfxBase64 = process.env.SEFAZ_CERT_PFX_BASE64;
    const senha = process.env.SEFAZ_CERT_SENHA;
    const cnpj = (process.env.SEFAZ_CNPJ || "").replace(/\D/g, "");
    const cUFAutor = process.env.SEFAZ_UF_CODIGO;
    const tpAmb = process.env.SEFAZ_AMBIENTE || "1";
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const faltando = ["SEFAZ_CERT_PFX_BASE64", "SEFAZ_CERT_SENHA", "SEFAZ_CNPJ", "SEFAZ_UF_CODIGO", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
        .filter((k) => !process.env[k]);
    if (faltando.length) {
        console.error("Faltam secrets:", faltando.join(", "));
        process.exit(1);
    }

    const pfxBuffer = Buffer.from(pfxBase64, "base64");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: controle } = await supabase.from("sefaz_nsu_controle").select("ultimo_nsu").eq("cnpj", cnpj).maybeSingle();
    let ultNSU = controle?.ultimo_nsu || "0";

    const { data: unidades } = await supabase.from("financeiro_centros_custo").select("id, cnpj");
    const mapaCnpjUnidade = new Map();
    (unidades || []).forEach((u) => { if (u.cnpj) mapaCnpjUnidade.set(String(u.cnpj).replace(/\D/g, ""), u.id); });
    const centroCustoId = mapaCnpjUnidade.get(cnpj) || null;

    let totalProcessados = 0, totalGravados = 0, paginas = 0;
    let ultimoCStat = "", ultimoXMotivo = "";
    // Erro na consulta de notas novas (ex: SEFAZ bloqueando por "Consumo
    // Indevido" quando a gente testa rapido demais seguidas vezes) NAO deve
    // impedir o envio de Ciencia da Operacao pras notas que ja estao
    // pendentes - por isso isso so marca o processo como "deu erro" no final
    // (process.exitCode), sem interromper o resto do script (process.exit
    // mataria tudo na hora, inclusive a parte da ciencia logo abaixo).
    let consultaComErro = false;

    while (paginas < MAX_PAGINAS) {
        paginas++;
        const envelope = buildEnvelope(cUFAutor, cnpj, tpAmb, ultNSU);
        const resp = await postSoap(envelope, pfxBuffer, senha);
        if (resp.status < 200 || resp.status >= 300) {
            console.error("SEFAZ respondeu HTTP", resp.status, resp.texto.slice(0, 500));
            consultaComErro = true;
            process.exitCode = 1;
            break;
        }

        const cStat = extractTag(resp.texto, "cStat") || "";
        const xMotivo = extractTag(resp.texto, "xMotivo") || "";
        ultimoCStat = cStat; ultimoXMotivo = xMotivo;
        const novoUltNSU = extractTag(resp.texto, "ultNSU") || ultNSU;
        const maxNSU = extractTag(resp.texto, "maxNSU") || novoUltNSU;

        if (cStat === "137") { ultNSU = novoUltNSU; break; } // 137 = nenhum documento novo
        if (cStat !== "138") { // 138 = documentos encontrados
            console.error("SEFAZ recusou a consulta:", cStat, xMotivo, resp.texto.slice(0, 800));
            consultaComErro = true;
            process.exitCode = 1;
            break;
        }

        const docZipRegex = /<docZip[^>]*schema="([^"]+)"[^>]*>([^<]+)<\/docZip>/g;
        let match;
        const linhas = [];
        while ((match = docZipRegex.exec(resp.texto)) !== null) {
            const [, schema, docZipB64] = match;
            totalProcessados++;
            try {
                const xmlDoc = zlib.gunzipSync(Buffer.from(docZipB64, "base64")).toString("utf-8");

                // procNFe = a nota completa (NFe + protocolo de autorizacao),
                // so fica disponivel depois que a empresa manda "Ciencia da
                // Operacao" (ver mais abaixo). E' o que precisa pra gerar o
                // DANFE em PDF de verdade. So atualiza a coluna xml_completo
                // dessa nota - nao mexe em mais nada da linha que ja existe.
                if (schema.startsWith("procNFe")) {
                    const chaveCompleta =
                        extractTag(xmlDoc, "chNFe") ||
                        (xmlDoc.match(/Id="NFe(\d{44})"/) || [])[1] ||
                        "";
                    if (chaveCompleta) {
                        const decodCompleta = decodificarChave(chaveCompleta);
                        // Preenche os mesmos campos que o resumo (resNFe) preencheria,
                        // nao so chave_acesso + xml_completo. Sem isso, pra uma nota
                        // cujo resumo a gente NUNCA recebeu antes (ex: NSU ja tinha
                        // passado por ela antes dessa parte do codigo existir), o
                        // upsert vira um INSERT sem a coluna "tipo" (NOT NULL) e
                        // quebra. A NFe completa tem os mesmos dados do resumo, entao
                        // da pra extrair igual - numa linha que ja existe isso so
                        // reescreve os mesmos valores de novo, sem problema.
                        const { error: erroXmlCompleto } = await supabase
                            .from("nfecloud_documentos")
                            .upsert({
                                chave_acesso: chaveCompleta,
                                xml_completo: xmlDoc,
                                tipo: decodCompleta?.mod === "65" ? "NFCe" : "NFe",
                                numero: decodCompleta?.numero ? String(parseInt(decodCompleta.numero, 10)) : null,
                                serie: decodCompleta?.serie ? String(parseInt(decodCompleta.serie, 10)) : null,
                                emitente_nome: extractTag(xmlDoc, "xNome"),
                                emitente_cnpj: extractTag(xmlDoc, "CNPJ"),
                                destinatario_cnpj: cnpj,
                                valor_total: parseFloat(extractTag(xmlDoc, "vNF") || "0") || null,
                                data_emissao: (extractTag(xmlDoc, "dhEmi") || "").slice(0, 10) || null,
                                centro_custo_id: centroCustoId,
                            }, { onConflict: "chave_acesso", ignoreDuplicates: false });
                        if (erroXmlCompleto) console.error("Erro gravando xml completo:", erroXmlCompleto.message);
                        else totalGravados++;
                    }
                    continue;
                }

                if (!schema.startsWith("resNFe")) continue; // ignora resEvento etc.
                const chave = extractTag(xmlDoc, "chNFe") || "";
                const decod = decodificarChave(chave);
                if (!chave) continue;
                linhas.push({
                    chave_acesso: chave,
                    tipo: decod?.mod === "65" ? "NFCe" : "NFe",
                    numero: decod?.numero ? String(parseInt(decod.numero, 10)) : null,
                    serie: decod?.serie ? String(parseInt(decod.serie, 10)) : null,
                    emitente_nome: extractTag(xmlDoc, "xNome"),
                    emitente_cnpj: extractTag(xmlDoc, "CNPJ"),
                    destinatario_nome: null,
                    destinatario_cnpj: cnpj,
                    valor_total: parseFloat(extractTag(xmlDoc, "vNF") || "0") || null,
                    data_emissao: (extractTag(xmlDoc, "dhEmi") || "").slice(0, 10) || null,
                    centro_custo_id: centroCustoId,
                    xml_raw: xmlDoc,
                });
            } catch (e) {
                console.error("Erro processando um docZip:", String(e));
            }
        }

        if (linhas.length) {
            const { error } = await supabase.from("nfecloud_documentos").upsert(linhas, { onConflict: "chave_acesso", ignoreDuplicates: false });
            if (error) console.error("Erro gravando no Supabase:", error.message);
            else totalGravados += linhas.length;
        }

        ultNSU = novoUltNSU;
        if (BigInt(novoUltNSU) >= BigInt(maxNSU)) break;
    }

    await supabase.from("sefaz_nsu_controle").upsert(
        { cnpj, ultimo_nsu: ultNSU, atualizado_em: new Date().toISOString() },
        { onConflict: "cnpj" }
    );

    // Manda "Ciencia da Operacao" pras NFe que ainda nao foram manifestadas -
    // tanto as novas quanto backlog antigo (ciencia_status comeca nulo pra
    // notas que ja existiam antes dessa funcionalidade). Em lotes pequenos,
    // pra nao estourar o tempo nem sobrecarregar nada. Erro numa nota so
    // marca aquela nota como erro - nunca trava as outras nem mexe em mais
    // nenhum dado ja gravado.
    let cienciasEnviadas = 0, cienciasComErro = 0;
    try {
        // Pega tanto quem nunca tentou (null) quanto quem tentou e deu erro
        // (erro) - antes so pegava "null", entao uma nota que falhasse uma
        // vez ficava travada pra sempre, mesmo depois de um bug ser
        // corrigido (foi exatamente o que aconteceu com ~140 notas presas
        // pelo bug do SOAPAction, corrigido em 28/10/2026 - precisou de um
        // UPDATE manual no banco pra desempacar, porque o codigo nunca ia
        // tentar de novo sozinho).
        const { data: pendentes, error: erroPendentes } = await supabase
            .from("nfecloud_documentos")
            .select("chave_acesso")
            .eq("tipo", "NFe")
            .or("ciencia_status.is.null,ciencia_status.eq.erro")
            .limit(MAX_CIENCIAS_POR_EXECUCAO);

        if (erroPendentes) {
            console.error("Erro buscando notas pendentes de ciencia:", erroPendentes.message);
        } else if (pendentes && pendentes.length) {
            const { keyPem, certPem } = extrairChavePemECertPem(pfxBuffer, senha);
            for (const doc of pendentes) {
                const resultado = await enviarCienciaDaOperacao({
                    chave: doc.chave_acesso,
                    cnpj,
                    tpAmb,
                    keyPem,
                    certPem,
                    pfxBuffer,
                    senha,
                });
                if (resultado.ok) cienciasEnviadas++;
                else cienciasComErro++;
                const detalhe = resultado.ok || resultado.cStat
                    ? `${resultado.cStat || ""} - ${resultado.xMotivo || ""}`.trim()
                    : (resultado.motivo || "erro desconhecido");
                const { error: erroUpdate } = await supabase
                    .from("nfecloud_documentos")
                    .update({
                        ciencia_status: resultado.ok ? "enviado" : "erro",
                        ciencia_enviada_em: new Date().toISOString(),
                        ciencia_detalhe: detalhe.slice(0, 1500),
                    })
                    .eq("chave_acesso", doc.chave_acesso);
                if (erroUpdate) console.error("Erro gravando status da ciencia:", doc.chave_acesso, erroUpdate.message);
            }
        }
    } catch (e) {
        console.error("Erro geral no envio de ciencia da operacao:", e && e.stack ? e.stack : String(e));
    }

    console.log(JSON.stringify({
        ok: !consultaComErro,
        consultaComErro,
        processados: totalProcessados,
        gravados: totalGravados,
        paginas,
        ultNSU,
        ultimoStatus: `${ultimoCStat} - ${ultimoXMotivo}`,
        cienciasEnviadas,
        cienciasComErro,
    }));
}

main().catch((e) => {
    console.error("Erro geral:", e && e.stack ? e.stack : String(e));
    process.exit(1);
});
