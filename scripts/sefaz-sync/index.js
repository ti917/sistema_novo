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

// Regra da SEFAZ: depois de uma consulta que volta 137 ("nenhum documento"),
// tem que esperar 1 HORA antes de consultar de novo - senao vem 656 (Consumo
// Indevido). O agendamento de 1h30 respeita isso, mas o botao "Sincronizar
// Agora" do financeiro podia disparar uma consulta poucos minutos depois de
// outra. Agora, se a ultima consulta de distribuicao foi ha menos que isso, o
// script PULA so' a consulta (a parte de ciencia continua rodando normal).
//
// ATUALIZADO 29/10/2026 (pedido do Italo): o intervalo agora e' contado a
// partir da ULTIMA consulta - 65 min depois dela (1h da regra da SEFAZ + 5
// min de folga). O GitHub acorda o workflow a cada 5 min; se ainda nao deu
// 65 min, o script encerra na hora, sem falar com a SEFAZ (nem ciencia, nem
// recuperacao) - ver o "return" logo depois de calcular pularConsulta.
// O financeiro.html le o mesmo horario (funcao sefaz_ultima_consulta) pra
// mostrar "Proxima atualizacao automatica".
const MIN_MINUTOS_ENTRE_CONSULTAS = 65;

// Prazo legal da Ciencia da Operacao: 10 dias a partir da autorizacao da NFe.
// Depois disso a SEFAZ recusa sempre - nao adianta tentar (e gastar cota).
// Usa 9 dias de margem.
const CIENCIA_PRAZO_DIAS = 9;

// Recuperacao do XML completo de notas antigas por CHAVE (consChNFe).
// Motivo: a distribuicao por NSU entrega cada documento uma vez so'. Muitas
// notas antigas ja foram manifestadas (pela NFeCloud ou por nos), mas o XML
// completo delas passou pela consulta antes desse codigo saber gravar
// procNFe - e nao volta mais sozinho. A consulta por chave pede a nota
// diretamente.
//
// LIMITE DA SEFAZ (NT 2014.002 v1.12+): no maximo 20 consultas por chave por
// HORA, por CNPJ - contando as de QUALQUER sistema que use esse CNPJ (a
// NFeCloud inclusive). Estourar = 656 e CNPJ bloqueado por 1h. Por isso:
// - poucas por execucao (5 a cada 1h30 = ~3 por hora, bem longe das 20);
// - pausa de 3s entre cada uma;
// - so' roda se a consulta de distribuicao desta execucao rodou e NAO deu
//   erro (se a SEFAZ ja esta irritada, nao cutuca);
// - para na hora se vier 656;
// - cada nota que nao veio completa so' e' tentada de novo depois de 24h;
// - so' notas de ate 89 dias (a SEFAZ so' guarda 90 dias pra distribuicao).
// Precisa da coluna nfecloud_documentos.xml_completo_tentado_em (ver
// sql_extra/sefaz_recupera_xml_completo.sql). Se a coluna nao existir, essa
// parte so' e' pulada (com aviso no log) - o resto do script roda normal.
// 29/10/2026: de 5 para 15 por rodada (pedido do Italo: a NFeCloud foi cancelada e a fila de
// notas antigas sem XML andava devagar). Roda 1 vez a cada ~65 min, entao sao ~14 por hora,
// abaixo do limite de ~20/h da SEFAZ. Se vier 656 o loop para na hora.
const RECUPERA_XML_POR_EXECUCAO = 15;
const RECUPERA_XML_PAUSA_MS = 3000;
const RECUPERA_XML_RETENTAR_HORAS = 24;
const RECUPERA_XML_MAX_DIAS = 89;

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
    return buildEnvelopeComCorpo(cUFAutor, cnpj, tpAmb, `<distNSU><ultNSU>${ultNSU.padStart(15, "0")}</ultNSU></distNSU>`);
}

// Mesma consulta de distribuicao, mas pedindo UMA nota especifica pela chave.
function buildEnvelopePorChave(cUFAutor, cnpj, tpAmb, chave) {
    return buildEnvelopeComCorpo(cUFAutor, cnpj, tpAmb, `<consChNFe><chNFe>${chave}</chNFe></consChNFe>`);
}

function buildEnvelopeComCorpo(cUFAutor, cnpj, tpAmb, corpo) {
    const distDFeInt = `<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>${tpAmb}</tpAmb><cUFAutor>${cUFAutor}</cUFAutor><CNPJ>${cnpj}</CNPJ>${corpo}</distDFeInt>`;
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

// Grava a nota completa (procNFe = NFe + protocolo de autorizacao). So'
// mexe nos campos que vem da propria nota + xml_completo - nunca apaga o
// resumo (xml_raw) nem o status de ciencia/revisao de uma linha que ja
// existe. Preenche tipo/numero/etc porque, pra uma nota cujo resumo nunca
// chegou, o upsert vira INSERT e "tipo" e' NOT NULL.
// Devolve { chave } se gravou, { chave: null } se o XML nao tinha chave, ou
// { erro } se o Supabase recusou.
async function salvarProcNFe(supabase, xmlDoc, cnpj, centroCustoId) {
    const chave =
        extractTag(xmlDoc, "chNFe") ||
        (xmlDoc.match(/Id="NFe(\d{44})"/) || [])[1] ||
        "";
    if (!chave) return { chave: null };
    const decod = decodificarChave(chave);
    const { error } = await supabase
        .from("nfecloud_documentos")
        .upsert({
            chave_acesso: chave,
            xml_completo: xmlDoc,
            tipo: decod?.mod === "65" ? "NFCe" : "NFe",
            numero: decod?.numero ? String(parseInt(decod.numero, 10)) : null,
            serie: decod?.serie ? String(parseInt(decod.serie, 10)) : null,
            emitente_nome: extractTag(xmlDoc, "xNome"),
            emitente_cnpj: extractTag(xmlDoc, "CNPJ"),
            destinatario_cnpj: cnpj,
            valor_total: parseFloat(extractTag(xmlDoc, "vNF") || "0") || null,
            data_emissao: (extractTag(xmlDoc, "dhEmi") || "").slice(0, 10) || null,
            centro_custo_id: centroCustoId,
        }, { onConflict: "chave_acesso", ignoreDuplicates: false });
    if (error) {
        console.error("Erro gravando xml completo:", chaveLog(chave), error.message);
        return { erro: error.message };
    }
    return { chave };
}

// O repositorio e' publico, entao os logs do GitHub Actions tambem sao: nao
// escreve a chave de acesso inteira das notas no log - so' os ultimos 8
// digitos, que bastam pra achar a nota no financeiro.
function chaveLog(chave) {
    const c = String(chave || "");
    return c.length > 8 ? "..." + c.slice(-8) : c;
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

    const { data: controle, error: erroControle } = await supabase.from("sefaz_nsu_controle").select("ultimo_nsu, atualizado_em").eq("cnpj", cnpj).maybeSingle();
    if (erroControle) {
        // Sem saber o ultimo NSU, consultar com "0" baixaria tudo de novo e
        // gastaria cota a toa. Melhor parar aqui.
        console.error("Erro lendo sefaz_nsu_controle:", erroControle.message);
        process.exit(1);
    }
    let ultNSU = controle?.ultimo_nsu || "0";

    const minutosDesdeUltimaConsulta = controle?.atualizado_em
        ? (Date.now() - new Date(controle.atualizado_em).getTime()) / 60000
        : Infinity;
    const pularConsulta = minutosDesdeUltimaConsulta < MIN_MINUTOS_ENTRE_CONSULTAS;
    if (pularConsulta) {
        // Ainda nao deu o intervalo: encerra sem fazer NADA na SEFAZ. Com o
        // workflow acordando a cada 5 min, a proxima rodada que passar dos
        // 65 min faz a consulta (e a ciencia/recuperacao junto).
        const faltam = Math.ceil(MIN_MINUTOS_ENTRE_CONSULTAS - minutosDesdeUltimaConsulta);
        console.log(JSON.stringify({
            ok: true,
            consultaPulada: true,
            motivo: `ultima consulta ha ${Math.floor(minutosDesdeUltimaConsulta)} min - proxima em ~${faltam} min (intervalo de ${MIN_MINUTOS_ENTRE_CONSULTAS} min)`,
        }));
        return;
    }

    // Coluna situacao_sefaz (sql_extra/sefaz_situacao_cancelada.sql) guarda
    // "cancelada" quando a SEFAZ avisa que o fornecedor cancelou a nota. O
    // resumo (resNFe) chega uma vez so' e nunca e' atualizado - se a nota for
    // cancelada depois, o que chega e' um EVENTO de cancelamento separado.
    // Se a coluna ainda nao existir, so' essa parte fica desligada.
    const { error: erroColSituacao } = await supabase.from("nfecloud_documentos").select("situacao_sefaz").limit(1);
    const temColSituacao = !erroColSituacao;
    if (!temColSituacao) console.error("Aviso: coluna situacao_sefaz nao existe (rodar sql_extra/sefaz_situacao_cancelada.sql) - cancelamentos nao serao marcados.");

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
    // Se gravar no Supabase falhar, o NSU NAO pode avancar - senao essas notas
    // nunca mais voltam na distribuicao (a SEFAZ so' entrega cada NSU uma vez
    // por consulta sequencial). Ver uso mais abaixo.
    let gravacaoFalhou = false;
    // Chaves que a propria consulta de distribuicao revelou que JA TEM
    // manifestacao registrada na SEFAZ (de qualquer sistema - ver comentario
    // mais abaixo, onde o resEvento e' lido).
    const chavesComManifestacaoNaDistribuicao = new Set();
    // Chaves que a distribuicao mostrou que foram CANCELADAS pelo emitente.
    const chavesCanceladas = new Set();

    while (!pularConsulta && paginas < MAX_PAGINAS) {
        // Pausa pequena entre paginas (pedido do Italo, 28/10/2026 - mesma ideia
        // da pausa na ciencia logo abaixo): se tiver bastante nota nova pra trazer,
        // esse loop pode rodar varias paginas seguidas - sem pausa, isso vira uma
        // rajada de requisicoes pra SEFAZ bem rapido. So' pula a pausa na
        // primeira pagina (paginas === 0 ainda).
        if (paginas > 0) await new Promise((r) => setTimeout(r, 400));
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
                    const r = await salvarProcNFe(supabase, xmlDoc, cnpj, centroCustoId);
                    if (r.erro) gravacaoFalhou = true;
                    else if (r.chave) totalGravados++;
                    continue;
                }

                // 👇 Pedido do Italo (28/10/2026): quando a nota JA TEM manifestacao
                // registrada na SEFAZ (de qualquer sistema - NFeCloud, outro
                // certificado, etc, nao so o nosso), a propria consulta de
                // distribuicao devolve um "resEvento" com essa informacao - antes
                // isso era ignorado e o sistema tentava mandar Ciencia da Operacao
                // de novo do mesmo jeito, gastando uma requisicao a toa (e, se a
                // SEFAZ ja tivesse processado o evento, a resposta seria so
                // "573 - duplicidade", ou seja, a gente ja sabia a resposta antes
                // de perguntar). Qualquer tipo de manifestacao (210200 Confirmacao,
                // 210210 Ciencia, 210220 Desconhecimento, 210240 Nao Realizada)
                // cumpre a obrigacao do destinatario - nao precisa ser
                // especificamente Ciencia pra poder pular o envio.
                // Eventos podem vir resumidos (resEvento) ou completos
                // (procEventoNFe) - os dois tem chNFe e tpEvento.
                if (schema.startsWith("resEvento") || schema.startsWith("procEventoNFe")) {
                    const chaveEvento = extractTag(xmlDoc, "chNFe") || "";
                    const tpEvento = extractTag(xmlDoc, "tpEvento") || "";
                    const TIPOS_MANIFESTACAO = ["210200", "210210", "210220", "210240"];
                    if (chaveEvento && TIPOS_MANIFESTACAO.includes(tpEvento)) {
                        chavesComManifestacaoNaDistribuicao.add(chaveEvento);
                    }
                    // 110111 = Cancelamento | 110112 = Cancelamento por substituicao
                    if (chaveEvento && (tpEvento === "110111" || tpEvento === "110112")) {
                        chavesCanceladas.add(chaveEvento);
                    }
                    continue;
                }

                if (!schema.startsWith("resNFe")) continue; // ignora outros schemas desconhecidos
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
                // docZip corrompido/ilegivel: registra, mas nao trava o NSU
                // (tentar de novo daria o mesmo erro pra sempre).
                console.error("Erro processando um docZip:", String(e));
            }
        }

        if (linhas.length) {
            const { error } = await supabase.from("nfecloud_documentos").upsert(linhas, { onConflict: "chave_acesso", ignoreDuplicates: false });
            if (error) {
                console.error("Erro gravando no Supabase:", error.message);
                gravacaoFalhou = true;
            } else totalGravados += linhas.length;
        }

        if (gravacaoFalhou) {
            // Nao avanca o NSU: a proxima execucao pede essa mesma pagina de
            // novo (o upsert e' por chave_acesso, entao nao duplica nada).
            console.error("Gravacao no Supabase falhou - NSU mantido em", ultNSU, "pra nao perder notas.");
            consultaComErro = true;
            process.exitCode = 1;
            break;
        }

        ultNSU = novoUltNSU;
        if (BigInt(novoUltNSU) >= BigInt(maxNSU)) break;
    }

    // So' grava o controle quando a consulta realmente rodou (inclusive com
    // erro/656 - assim o proximo clique no botao tambem respeita o intervalo).
    if (!pularConsulta) {
        const { error: erroSalvarNsu } = await supabase.from("sefaz_nsu_controle").upsert(
            { cnpj, ultimo_nsu: ultNSU, atualizado_em: new Date().toISOString() },
            { onConflict: "cnpj" }
        );
        if (erroSalvarNsu) {
            console.error("Erro salvando ultimo NSU:", erroSalvarNsu.message);
            process.exitCode = 1;
        }
    }

    // Antes de tentar mandar Ciencia da Operacao, marca como "ja resolvido"
    // (sem gastar requisicao nenhuma) qualquer chave que a propria
    // distribuicao ja revelou ter manifestacao registrada - normalmente
    // porque o NFeCloud (ou outro sistema) ja manifestou essa nota antes da
    // gente. So atualiza quem ainda nao estava marcado como enviado, pra nao
    // sobrescrever um ciencia_detalhe que o nosso proprio envio ja gravou.
    let jaManifestadasForaDoNossoSistema = 0;
    if (chavesComManifestacaoNaDistribuicao.size) {
        const { data: atualizadas, error: erroJaManifestadas } = await supabase
            .from("nfecloud_documentos")
            .update({
                ciencia_status: "enviado",
                ciencia_enviada_em: new Date().toISOString(),
                ciencia_detalhe: "Manifestacao ja existia na SEFAZ (detectada na consulta de distribuicao - provavelmente feita pelo NFeCloud ou outro sistema antes da gente)",
            })
            .in("chave_acesso", Array.from(chavesComManifestacaoNaDistribuicao))
            .or("ciencia_status.is.null,ciencia_status.eq.erro")
            .select("chave_acesso");
        if (erroJaManifestadas) console.error("Erro marcando notas ja manifestadas:", erroJaManifestadas.message);
        else jaManifestadasForaDoNossoSistema = (atualizadas || []).length;
    }

    let canceladasMarcadas = 0;
    if (temColSituacao && chavesCanceladas.size) {
        const { data: canc, error: erroCanc } = await supabase
            .from("nfecloud_documentos")
            .update({ situacao_sefaz: "cancelada" })
            .in("chave_acesso", Array.from(chavesCanceladas))
            .select("chave_acesso");
        if (erroCanc) console.error("Erro marcando notas canceladas:", erroCanc.message);
        else canceladasMarcadas += (canc || []).length;
    }

    // ---- Recuperacao do XML completo por chave (ver RECUPERA_XML_*) ----
    let xmlRecuperados = 0, xmlRecuperacaoTentativas = 0, xmlRecuperacaoStatus = "nao rodou";
    if (pularConsulta) {
        xmlRecuperacaoStatus = "pulada (consulta de distribuicao pulada nesta execucao)";
    } else if (consultaComErro) {
        xmlRecuperacaoStatus = "pulada (consulta de distribuicao deu erro nesta execucao)";
    } else {
        try {
            const agoraMs = Date.now();
            const limiteEmissao = new Date(agoraMs - RECUPERA_XML_MAX_DIAS * 24 * 3600 * 1000).toISOString().slice(0, 10);
            const limiteTentativa = new Date(agoraMs - RECUPERA_XML_RETENTAR_HORAS * 3600 * 1000).toISOString();
            // Da' 2h pra nota chegar sozinha pela distribuicao antes de pedir
            // por chave (o normal e' ela vir sozinha depois de manifestada).
            const limiteCriacao = new Date(agoraMs - 2 * 3600 * 1000).toISOString();
            const { data: semXml, error: erroSemXml } = await supabase
                .from("nfecloud_documentos")
                .select(temColSituacao ? "chave_acesso, ciencia_status, xml_completo_tentado_em, situacao_sefaz" : "chave_acesso, ciencia_status, xml_completo_tentado_em")
                .eq("tipo", "NFe")
                .is("xml_completo", null)
                .gte("data_emissao", limiteEmissao)
                .lt("criado_em", limiteCriacao)
                .or(`xml_completo_tentado_em.is.null,xml_completo_tentado_em.lt."${limiteTentativa}"`)
                .order("data_emissao", { ascending: true }) // mais antigas primeiro (mais perto de sair dos 90 dias)
                .limit(200);

            if (erroSemXml) {
                xmlRecuperacaoStatus = /xml_completo_tentado_em/.test(erroSemXml.message)
                    ? "pulada (falta rodar sql_extra/sefaz_recupera_xml_completo.sql no Supabase)"
                    : "erro: " + erroSemXml.message;
                console.error("Recuperacao de XML completo:", xmlRecuperacaoStatus);
            } else {
                xmlRecuperacaoStatus = "ok";
                // Primeiro as que a gente SABE que ja tem manifestacao
                // (ciencia "enviado"), depois as outras - mantendo a ordem
                // de data dentro de cada grupo (sort do JS e' estavel).
                const fila = (semXml || [])
                    .filter((r) => r.situacao_sefaz !== "cancelada") // cancelada nunca vai ter XML pra baixar
                    .slice()
                    .sort((a, b) => (b.ciencia_status === "enviado") - (a.ciencia_status === "enviado"))
                    .slice(0, RECUPERA_XML_POR_EXECUCAO);
                for (let i = 0; i < fila.length; i++) {
                    const chave = fila[i].chave_acesso;
                    if (!/^\d{44}$/.test(chave || "")) continue;
                    if (i > 0) await new Promise((r) => setTimeout(r, RECUPERA_XML_PAUSA_MS));
                    xmlRecuperacaoTentativas++;
                    let veioCompleto = false;
                    let resp;
                    try {
                        resp = await postSoap(buildEnvelopePorChave(cUFAutor, cnpj, tpAmb, chave), pfxBuffer, senha);
                    } catch (e) {
                        console.error("Recuperacao de XML: falha de rede na chave", chaveLog(chave), String(e));
                        xmlRecuperacaoStatus = "parou por falha de rede";
                        break;
                    }
                    const cStatChave = extractTag(resp.texto, "cStat") || "";
                    if (resp.status < 200 || resp.status >= 300) {
                        console.error("Recuperacao de XML: HTTP", resp.status, "na chave", chaveLog(chave));
                        xmlRecuperacaoStatus = "parou por HTTP " + resp.status;
                        break;
                    }
                    if (cStatChave === "656") {
                        console.error("Recuperacao de XML: SEFAZ devolveu 656 - parando na hora.");
                        xmlRecuperacaoStatus = "parou por 656";
                        break;
                    }
                    if (cStatChave === "138") {
                        const re = /<docZip[^>]*schema="([^"]+)"[^>]*>([^<]+)<\/docZip>/g;
                        let m;
                        while ((m = re.exec(resp.texto)) !== null) {
                            if (!m[1].startsWith("procNFe")) continue;
                            try {
                                const xmlDoc = zlib.gunzipSync(Buffer.from(m[2], "base64")).toString("utf-8");
                                const r = await salvarProcNFe(supabase, xmlDoc, cnpj, centroCustoId);
                                if (r.chave) { veioCompleto = true; xmlRecuperados++; }
                            } catch (e) {
                                console.error("Recuperacao de XML: docZip ilegivel na chave", chaveLog(chave), String(e));
                            }
                        }
                    }
                    // 653 = "NF-e Cancelada, arquivo indisponivel para download":
                    // o emitente cancelou. Marca e nunca mais pede essa nota.
                    if (cStatChave === "653" && temColSituacao) {
                        const { error: erro653 } = await supabase
                            .from("nfecloud_documentos")
                            .update({ situacao_sefaz: "cancelada" })
                            .eq("chave_acesso", chave);
                        if (erro653) console.error("Erro marcando nota cancelada:", chaveLog(chave), erro653.message);
                        else canceladasMarcadas++;
                    }
                    if (!veioCompleto) {
                        // Ainda sem manifestacao (veio so' o resumo) ou a SEFAZ
                        // recusou por outro motivo: registra a tentativa pra
                        // nao insistir nessa nota antes de 24h.
                        console.log("Recuperacao de XML: chave", chaveLog(chave), "sem XML completo ainda -", cStatChave, extractTag(resp.texto, "xMotivo") || "");
                    }
                    const { error: erroMarca } = await supabase
                        .from("nfecloud_documentos")
                        .update({ xml_completo_tentado_em: new Date().toISOString() })
                        .eq("chave_acesso", chave);
                    if (erroMarca) console.error("Recuperacao de XML: erro marcando tentativa:", chaveLog(chave), erroMarca.message);
                }
            }
        } catch (e) {
            xmlRecuperacaoStatus = "erro geral: " + (e && e.message ? e.message : String(e));
            console.error("Recuperacao de XML completo:", e && e.stack ? e.stack : String(e));
        }
    }

    // Se a SEFAZ ja liberou o XML COMPLETO (procNFe) de uma nota, e' porque ela
    // JA tem manifestacao registrada pro nosso CNPJ (feita por qualquer
    // sistema). Marca essas como resolvidas sem gastar nenhuma requisicao.
    // Antes isso nao era feito, e depois de 48h o script mandava Ciencia pra
    // notas ja manifestadas - se a manifestacao delas fosse a final
    // (Confirmacao), a SEFAZ recusa a Ciencia, a nota virava "erro" e era
    // tentada de novo toda execucao, gastando cota pra nada.
    let jaComXmlCompleto = 0;
    {
        const { data: atualizadas, error: erroXml } = await supabase
            .from("nfecloud_documentos")
            .update({
                ciencia_status: "enviado",
                ciencia_enviada_em: new Date().toISOString(),
                ciencia_detalhe: "Manifestacao ja existia na SEFAZ (XML completo ja liberado - provavelmente feita pelo NFeCloud ou outro sistema)",
            })
            .eq("tipo", "NFe")
            .not("xml_completo", "is", null)
            .or("ciencia_status.is.null,ciencia_status.eq.erro")
            .select("chave_acesso");
        if (erroXml) console.error("Erro marcando notas com XML completo:", erroXml.message);
        else jaComXmlCompleto = (atualizadas || []).length;
    }

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
        //
        // SO' DEPOIS DE 48H (pedido do Italo, 29/10/2026): descoberto que
        // quando a gente recebe o XML COMPLETO (procNFe) de uma nota, isso
        // so acontece se ela JA foi manifestada por alguem - manifestacao e'
        // por CNPJ, nao por sistema (confirmado contra forum tecnico de NFe:
        // https://www.projetoacbr.com.br/forum/topic/35543-distribuicaodfe-xml-resumo-ou-completo/).
        // Ou seja, tem outro sistema (provavelmente a NFeCloud) manifestando
        // as notas quase na hora, sozinho - e' provavelmente ele que fica
        // consumindo boa parte da cota do certificado e causando os 656.
        // Em vez de competir com ele tentando ciencia pra TODA nota pendente
        // toda execucao, a gente so tenta a nossa propria ciencia como rede
        // de seguranca: se uma nota ficar 48h+ sem ninguem mais ter
        // manifestado ela (ciencia_status ainda null/erro), af sim tenta.
        // Isso corta MUITO o volume de tentativas de ciencia (menos cota
        // gasta, menos chance de contribuir pro bloqueio) sem abrir mao da
        // protecao contra a SEFAZ bloquear a emissao das nossas proprias
        // notas por falta de manifestacao acumulada.
        const CIENCIA_SO_APOS_HORAS = 48;
        const corteCiencia = new Date(Date.now() - CIENCIA_SO_APOS_HORAS * 60 * 60 * 1000).toISOString();
        // data_emissao e' "AAAA-MM-DD" - compara so' a data.
        const limitePrazo = new Date(Date.now() - CIENCIA_PRAZO_DIAS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const { data: pendentesBrutos, error: erroPendentes } = await supabase
            .from("nfecloud_documentos")
            .select(temColSituacao ? "chave_acesso, situacao_sefaz" : "chave_acesso")
            .eq("tipo", "NFe")
            .or("ciencia_status.is.null,ciencia_status.eq.erro")
            .is("xml_completo", null) // XML completo = ja manifestada (ver acima)
            .lt("criado_em", corteCiencia)
            .gte("data_emissao", limitePrazo) // fora do prazo de 10 dias a SEFAZ recusa sempre
            .order("data_emissao", { ascending: true }) // as mais perto de vencer o prazo primeiro
            .limit(200);
        // Nota cancelada nao recebe Ciencia (a SEFAZ recusa) - filtrado aqui
        // e nao na consulta porque "diferente de cancelada" no banco tambem
        // descartaria as linhas com situacao vazia.
        const pendentes = (pendentesBrutos || [])
            .filter((r) => r.situacao_sefaz !== "cancelada")
            .slice(0, MAX_CIENCIAS_POR_EXECUCAO);

        if (erroPendentes) {
            console.error("Erro buscando notas pendentes de ciencia:", erroPendentes.message);
        } else if (pendentes && pendentes.length) {
            const { keyPem, certPem } = extrairChavePemECertPem(pfxBuffer, senha);
            let primeiraCiencia = true;
            let falhasSeguidas = 0;
            for (const doc of pendentes) {
                // Pausa pequena entre cada ciencia (pedido do Italo, 28/10/2026): antes
                // mandava as ate 50 ciencias uma atras da outra sem nenhum intervalo -
                // sozinho isso nao e' o suficiente pra estourar o limite da SEFAZ
                // (600 consultas/5min), mas e' uma precaucao barata enquanto a causa
                // real do bloqueio 656 recorrente de hoje nao e' confirmada.
                if (!primeiraCiencia) await new Promise((r) => setTimeout(r, 400));
                primeiraCiencia = false;
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
                if (erroUpdate) console.error("Erro gravando status da ciencia:", chaveLog(doc.chave_acesso), erroUpdate.message);

                // Freios pra nao insistir quando o problema e' geral (nao da nota):
                // - 656 = SEFAZ bloqueou por consumo indevido: cada tentativa a
                //   mais so' estende o bloqueio. Para na hora.
                // - 3 falhas seguidas de qualquer tipo (rede, TLS, HTTP, schema):
                //   quase certeza que todas as outras vao falhar igual.
                if (resultado.cStat === "656") {
                    console.error("SEFAZ devolveu 656 (Consumo Indevido) na ciencia - parando o lote por aqui.");
                    break;
                }
                falhasSeguidas = resultado.ok ? 0 : falhasSeguidas + 1;
                if (falhasSeguidas >= 3) {
                    console.error("3 ciencias seguidas falharam - parando o lote por aqui. Ultimo erro:", detalhe.slice(0, 300));
                    break;
                }
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
        consultaPulada: pularConsulta,
        ultNSU,
        ultimoStatus: `${ultimoCStat} - ${ultimoXMotivo}`,
        cienciasEnviadas,
        cienciasComErro,
        jaManifestadasForaDoNossoSistema,
        jaComXmlCompleto,
        canceladasMarcadas,
        xmlRecuperados,
        xmlRecuperacaoTentativas,
        xmlRecuperacaoStatus,
    }));
}

main().catch((e) => {
    console.error("Erro geral:", e && e.stack ? e.stack : String(e));
    process.exit(1);
});
