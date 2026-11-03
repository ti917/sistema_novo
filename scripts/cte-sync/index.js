// cte-sync (03/11/2026)
//
// Puxa os CT-e (conhecimento de transporte eletronico) em que a empresa aparece
// (destinatario, remetente, tomador, expedidor, recebedor ou autXML) no webservice
// CTeDistribuicaoDFe do AMBIENTE NACIONAL, usando o mesmo certificado digital A1 da
// sincronizacao da NF-e, e grava na tabela nfecloud_documentos (tipo "CTe") - a mesma
// que a tela Notas Fiscais do financeiro.html le.
//
// - E' um servico separado do da NF-e (NFeDistribuicaoDFe): nao divide NSU nem limite.
// - O CT-e vem COMPLETO (procCTe), sem precisar de manifestacao/ciencia.
// - Os documentos ficam disponiveis na distribuicao por cerca de 3 meses; os mais antigos
//   entram so' pela importacao manual do .zip/.xml.
// - Cursor por NSU na tabela cte_nsu_controle (sql_extra/cte_nsu_controle.sql).
// - Mesma regra da NF-e: depois de uma consulta que volta 137 ("nenhum documento"), esperar
//   1 hora (senao vem 656 - Consumo Indevido). Por isso o script espera 65 min desde a
//   ULTIMA consulta; o workflow acorda a cada 5 min e o script encerra sozinho se for cedo.
// - Eventos: so' o de CANCELAMENTO (110111) e' usado, pra marcar a nota como cancelada.
//
// MODO SO' LEITURA (teste): CTE_SOMENTE_LER=1 - nao fala com o Supabase (nem le, nem grava) e
// mostra so' um resumo no log, sem nomes, valores nem chaves completas (o repositorio e'
// publico, entao os logs do GitHub Actions tambem). Veja .github/workflows/cte-teste.yml.
//
// Segredos (GitHub Actions Secrets): SEFAZ_CERT_PFX_BASE64, SEFAZ_CERT_SENHA, SEFAZ_CNPJ,
// SEFAZ_UF_CODIGO, SEFAZ_AMBIENTE (opcional, 1 = producao), SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

const https = require("https");
const zlib = require("zlib");

const CTE_HOST_PROD = "www1.cte.fazenda.gov.br";
const CTE_HOST_HOM = "hom1.cte.fazenda.gov.br";
const CTE_PATH = "/CTeDistribuicaoDFe/CTeDistribuicaoDFe.asmx";
const SOAP_ACTION = "http://www.portalfiscal.inf.br/cte/wsdl/CTeDistribuicaoDFe/cteDistDFeInteresse";
const MAX_PAGINAS = 20;
const MIN_MINUTOS_ENTRE_CONSULTAS = 65;

function extractTag(xml, tag) {
    const m = String(xml || "").match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
    return m ? m[1].trim() : null;
}
function extractBlock(xml, tag) {
    const m = String(xml || "").match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
    return m ? m[1] : null;
}
// O repositorio e' publico: no log vai so' o final da chave.
function chaveLog(chave) {
    const c = String(chave || "");
    return c.length > 8 ? "..." + c.slice(-8) : c;
}

// Envelope SOAP 1.2 do CT-e: distDFeInt COM cUFAutor, dentro de cteDistDFeInteresse > cteDadosMsg,
// sem cabecalho (cteCabecMsg). A acao do SOAP 1.2 vai no Content-Type, nao em header SOAPAction.
function buildEnvelope(cUFAutor, cnpj, tpAmb, ultNSU) {
    const distDFeInt = `<distDFeInt xmlns="http://www.portalfiscal.inf.br/cte" versao="1.00"><tpAmb>${tpAmb}</tpAmb><cUFAutor>${cUFAutor}</cUFAutor><CNPJ>${cnpj}</CNPJ><distNSU><ultNSU>${String(ultNSU).padStart(15, "0")}</ultNSU></distNSU></distDFeInt>`;
    return `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><cteDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/cte/wsdl/CTeDistribuicaoDFe"><cteDadosMsg>${distDFeInt}</cteDadosMsg></cteDistDFeInteresse></soap12:Body></soap12:Envelope>`;
}

function postSoap(envelope, pfxBuffer, senha, host) {
    return new Promise((resolve, reject) => {
        const body = Buffer.from(envelope, "utf-8");
        const req = https.request(
            {
                host,
                path: CTE_PATH,
                method: "POST",
                pfx: pfxBuffer,
                passphrase: senha,
                headers: {
                    "Content-Type": `application/soap+xml; charset=utf-8; action="${SOAP_ACTION}"`,
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
        req.on("timeout", () => req.destroy(new Error("timeout de 30s falando com o Ambiente Nacional do CT-e")));
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}

// Quem e' o TOMADOR (quem paga o frete): toma3 -> 0 remetente, 1 expedidor, 2 recebedor, 3 destinatario;
// toma4 -> um quarto participante, com nome e CNPJ proprios.
function nomeDoTomador(xml) {
    const ide = extractBlock(xml, "ide") || "";
    const toma4 = extractBlock(ide, "toma4");
    if (toma4) return extractTag(toma4, "xNome") || null;
    const codigo = extractTag(extractBlock(ide, "toma3") || "", "toma");
    const bloco = { "0": "rem", "1": "exped", "2": "receb", "3": "dest" }[codigo];
    return bloco ? extractTag(extractBlock(xml, bloco) || "", "xNome") : null;
}

// Linha da tabela nfecloud_documentos a partir de um procCTe (CT-e + protocolo de autorizacao).
function linhaDoCte(xmlDoc, cnpjEmpresa, centroCustoId) {
    const chave =
        extractTag(extractBlock(xmlDoc, "protCTe") || "", "chCTe") ||
        (xmlDoc.match(/Id="CTe(\d{44})"/) || [])[1] ||
        "";
    if (!/^\d{44}$/.test(chave)) return null;
    const emit = extractBlock(xmlDoc, "emit") || "";
    const ide = extractBlock(xmlDoc, "ide") || "";
    return {
        chave_acesso: chave,
        tipo: "CTe",
        numero: extractTag(ide, "nCT") ? String(parseInt(extractTag(ide, "nCT"), 10)) : null,
        serie: extractTag(ide, "serie") ? String(parseInt(extractTag(ide, "serie"), 10)) : null,
        emitente_nome: extractTag(emit, "xNome"),
        emitente_cnpj: extractTag(emit, "CNPJ") || extractTag(emit, "CPF"),
        // destinatario_nome guarda o TOMADOR do servico (quem paga o frete) - a tela mostra "Tomador: ...".
        destinatario_nome: nomeDoTomador(xmlDoc),
        destinatario_cnpj: cnpjEmpresa,
        valor_total: parseFloat(extractTag(extractBlock(xmlDoc, "vPrest") || "", "vTPrest") || "0") || null,
        data_emissao: (extractTag(ide, "dhEmi") || "").slice(0, 10) || null,
        centro_custo_id: centroCustoId,
        xml_completo: xmlDoc,
    };
}

async function main() {
    const somenteLer = process.env.CTE_SOMENTE_LER === "1";
    const pfxBase64 = process.env.SEFAZ_CERT_PFX_BASE64;
    const senha = process.env.SEFAZ_CERT_SENHA;
    const cnpj = (process.env.SEFAZ_CNPJ || "").replace(/\D/g, "");
    const cUFAutor = process.env.SEFAZ_UF_CODIGO;
    const tpAmb = process.env.SEFAZ_AMBIENTE || "1";
    const host = tpAmb === "2" ? CTE_HOST_HOM : CTE_HOST_PROD;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const obrigatorios = ["SEFAZ_CERT_PFX_BASE64", "SEFAZ_CERT_SENHA", "SEFAZ_CNPJ", "SEFAZ_UF_CODIGO"]
        .concat(somenteLer ? [] : ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
    const faltando = obrigatorios.filter((k) => !process.env[k]);
    if (faltando.length) {
        console.error("Faltam secrets:", faltando.join(", "));
        process.exit(1);
    }

    const pfxBuffer = Buffer.from(pfxBase64, "base64");
    let supabase = null;
    if (!somenteLer) {
        const { createClient } = require("@supabase/supabase-js");
        supabase = createClient(supabaseUrl, supabaseKey);
    }

    let ultNSU = "0";
    let maxPaginas = MAX_PAGINAS;
    if (somenteLer) {
        ultNSU = String(process.env.CTE_NSU_INICIAL || "0").replace(/\D/g, "") || "0";
        maxPaginas = Math.min(Math.max(parseInt(process.env.CTE_PAGINAS || "3", 10) || 3, 1), MAX_PAGINAS);
    } else {
        const { data: controle, error: erroControle } = await supabase.from("cte_nsu_controle").select("ultimo_nsu, atualizado_em").eq("cnpj", cnpj).maybeSingle();
        if (erroControle) {
            // Tabela ainda nao criada (falta rodar sql_extra/cte_nsu_controle.sql): so' avisa e sai SEM erro, sem
            // falar com o Ambiente Nacional - senao o workflow (a cada 5 min) ficaria vermelho ate o SQL ser rodado.
            if (/does not exist|schema cache|PGRST205|42P01/i.test(String(erroControle.message || "") + String(erroControle.code || ""))) {
                console.log(JSON.stringify({ ok: false, aguardando: "rodar sql_extra/cte_nsu_controle.sql no SQL Editor do Supabase (a tabela cte_nsu_controle ainda nao existe)", consultou: false }));
                return;
            }
            // Outro erro: sem saber o ultimo NSU, consultar com "0" baixaria tudo de novo e gastaria cota a toa.
            console.error("Erro lendo cte_nsu_controle:", erroControle.message);
            process.exit(1);
        }
        ultNSU = controle?.ultimo_nsu || "0";
        const minutos = controle?.atualizado_em ? (Date.now() - new Date(controle.atualizado_em).getTime()) / 60000 : Infinity;
        if (minutos < MIN_MINUTOS_ENTRE_CONSULTAS) {
            const faltam = Math.ceil(MIN_MINUTOS_ENTRE_CONSULTAS - minutos);
            console.log(JSON.stringify({ ok: true, consultaPulada: true, motivo: `ultima consulta ha ${Math.floor(minutos)} min - proxima em ~${faltam} min (intervalo de ${MIN_MINUTOS_ENTRE_CONSULTAS} min)` }));
            return;
        }
    }

    let centroCustoId = null;
    let temColSituacao = false;
    if (!somenteLer) {
        const { data: unidades } = await supabase.from("financeiro_centros_custo").select("id, cnpj");
        const mapa = new Map();
        (unidades || []).forEach((u) => { if (u.cnpj) mapa.set(String(u.cnpj).replace(/\D/g, ""), u.id); });
        centroCustoId = mapa.get(cnpj) || null;
        const { error: erroCol } = await supabase.from("nfecloud_documentos").select("situacao_sefaz").limit(1);
        temColSituacao = !erroCol;
    }

    let paginas = 0, totalDocs = 0, totalGravados = 0, ultimoCStat = "", ultimoXMotivo = "";
    let consultaComErro = false, gravacaoFalhou = false;
    const porSchema = {};
    const chavesCanceladas = new Set();
    const resumoLeitura = [];

    while (paginas < maxPaginas) {
        if (paginas > 0) await new Promise((r) => setTimeout(r, 400)); // pausa pequena entre paginas
        paginas++;
        const resp = await postSoap(buildEnvelope(cUFAutor, cnpj, tpAmb, ultNSU), pfxBuffer, senha, host);
        if (resp.status < 200 || resp.status >= 300) {
            console.error("Ambiente Nacional do CT-e respondeu HTTP", resp.status, resp.texto.slice(0, 500));
            consultaComErro = true; process.exitCode = 1; break;
        }
        const cStat = extractTag(resp.texto, "cStat") || "";
        const xMotivo = extractTag(resp.texto, "xMotivo") || "";
        ultimoCStat = cStat; ultimoXMotivo = xMotivo;
        const novoUltNSU = extractTag(resp.texto, "ultNSU") || ultNSU;
        const maxNSU = extractTag(resp.texto, "maxNSU") || novoUltNSU;

        if (cStat === "137") { ultNSU = novoUltNSU; break; } // 137 = nenhum documento novo
        if (cStat !== "138") { // 138 = documentos localizados
            console.error("Ambiente Nacional do CT-e recusou a consulta:", cStat, xMotivo, resp.texto.slice(0, 800));
            consultaComErro = true; process.exitCode = 1; break;
        }

        const docZipRegex = /<docZip[^>]*schema="([^"]+)"[^>]*>([^<]+)<\/docZip>/g;
        let match;
        const linhas = [];
        while ((match = docZipRegex.exec(resp.texto)) !== null) {
            const [, schema, docZipB64] = match;
            totalDocs++;
            porSchema[schema] = (porSchema[schema] || 0) + 1;
            try {
                const xmlDoc = zlib.gunzipSync(Buffer.from(docZipB64, "base64")).toString("utf-8");
                if (/^proc(CTe|CTeOS|CTeSimp)/i.test(schema)) {
                    const linha = linhaDoCte(xmlDoc, cnpj, centroCustoId);
                    if (!linha) continue;
                    linhas.push(linha);
                    if (somenteLer) resumoLeitura.push(`${schema} chave ${chaveLog(linha.chave_acesso)} situacao ${extractTag(extractBlock(xmlDoc, "protCTe") || "", "cStat")}`);
                } else if (/^procEventoCTe/i.test(schema)) {
                    // 110111 = Cancelamento. So' vale se o evento foi registrado (cStat 135 ou 136).
                    const tpEvento = extractTag(xmlDoc, "tpEvento") || "";
                    const cStatEvt = extractTag(extractBlock(xmlDoc, "retEventoCTe") || "", "cStat") || extractTag(extractBlock(xmlDoc, "infEvento") || "", "cStat") || "";
                    const chaveEvt = extractTag(xmlDoc, "chCTe") || "";
                    if (tpEvento === "110111" && chaveEvt && (!cStatEvt || cStatEvt === "135" || cStatEvt === "136")) chavesCanceladas.add(chaveEvt);
                    if (somenteLer) resumoLeitura.push(`${schema} evento ${tpEvento} chave ${chaveLog(chaveEvt)}`);
                }
                // outros schemas (resumos, eventos de entrega, CC-e...) nao interessam aqui
            } catch (e) {
                // docZip corrompido: registra, mas nao trava o NSU (tentar de novo daria o mesmo erro)
                console.error("Erro processando um docZip:", String(e));
            }
        }

        if (!somenteLer && linhas.length) {
            const { error } = await supabase.from("nfecloud_documentos").upsert(linhas, { onConflict: "chave_acesso", ignoreDuplicates: false });
            if (error) { console.error("Erro gravando no Supabase:", error.message); gravacaoFalhou = true; }
            else totalGravados += linhas.length;
        }
        if (gravacaoFalhou) {
            // Nao avanca o NSU: a proxima execucao pede essa mesma pagina de novo (o upsert e' por chave).
            console.error("Gravacao no Supabase falhou - NSU mantido em", ultNSU, "pra nao perder CT-e.");
            consultaComErro = true; process.exitCode = 1; break;
        }
        ultNSU = novoUltNSU;
        if (BigInt(novoUltNSU) >= BigInt(maxNSU)) break;
    }

    let canceladasMarcadas = 0;
    if (!somenteLer) {
        // So' grava o controle quando a consulta realmente rodou (inclusive com erro/656 - assim o proximo
        // disparo tambem respeita o intervalo).
        const { error: erroNsu } = await supabase.from("cte_nsu_controle").upsert({ cnpj, ultimo_nsu: ultNSU, atualizado_em: new Date().toISOString() }, { onConflict: "cnpj" });
        if (erroNsu) { console.error("Erro salvando ultimo NSU:", erroNsu.message); process.exitCode = 1; }
        if (temColSituacao && chavesCanceladas.size) {
            const { data: canc, error: erroCanc } = await supabase.from("nfecloud_documentos").update({ situacao_sefaz: "cancelada" }).in("chave_acesso", Array.from(chavesCanceladas)).select("chave_acesso");
            if (erroCanc) console.error("Erro marcando CT-e cancelados:", erroCanc.message);
            else canceladasMarcadas = (canc || []).length;
        }
    }

    console.log(JSON.stringify({
        ok: !consultaComErro,
        modo: somenteLer ? "somente leitura (nada foi gravado)" : "gravando",
        paginas, documentosRecebidos: totalDocs, porSchema,
        gravados: totalGravados, canceladosMarcados: canceladasMarcadas, cancelamentosVistos: chavesCanceladas.size,
        ultimoNSU: ultNSU, ultimoCStat, ultimoXMotivo,
        ...(somenteLer ? { amostra: resumoLeitura.slice(0, 20) } : {}),
    }));
}

if (require.main === module) {
    main().catch((e) => { console.error("Erro inesperado no cte-sync:", String(e && e.stack || e)); process.exit(1); });
}
module.exports = { linhaDoCte, nomeDoTomador, buildEnvelope, extractTag, extractBlock };
