// nfse-sync (29/10/2026)
//
// Puxa as NFS-e (padrao NACIONAL) em que a empresa e' TOMADORA, pela API do ADN
// (Ambiente de Dados Nacional da NFS-e, adn.nfse.gov.br), usando o mesmo certificado
// digital A1 da sincronizacao da SEFAZ, e grava na tabela nfecloud_documentos
// (tipo "NFSe") - a mesma que a tela Notas Fiscais do financeiro.html le.
//
// - E' outro servico, separado da SEFAZ: nao divide limite nem bloqueio com a NF-e.
// - Cursor por NSU na tabela nfse_nsu_controle (sql_extra/nfse_nsu_controle.sql).
//   So' avanca depois que a gravacao no Supabase deu certo.
// - Notas emitidas PELA empresa (como prestadora) entram com direcao = 'enviada' (aba Notas
//   Enviadas); as tomadas entram com direcao = 'recebida'. (sql_extra/nfse_direcao.sql)
// - Evento de cancelamento marca situacao_sefaz = 'cancelada' na nota.
// - O repositorio e' publico: o log mostra so' contagens, nunca nomes/valores/chaves.

const https = require("https");
const zlib = require("zlib");
const { createClient } = require("@supabase/supabase-js");

const HOST = process.env.ADN_AMBIENTE === "restrita" ? "adn.producaorestrita.nfse.gov.br" : "adn.nfse.gov.br";
// Conservador de proposito: o ADN tem limite de requisicoes (erro 429) que a documentacao
// nao detalha. 10 paginas por rodada = ate 500 documentos, com 2s entre cada pedido; o
// historico entra aos poucos (de hora em hora). Se vier 429 o script para na hora.
const MAX_PAGINAS = 10;
const PAUSA_ENTRE_PAGINAS_MS = 2000;

const so = (v) => String(v || "").replace(/\D/g, "");

function decodificaEntidades(t) {
    return String(t == null ? "" : t)
        .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(parseInt(n, 10)))
        .replace(/&amp;/g, "&");
}
function tag(xml, nome) {
    const m = String(xml || "").match(new RegExp(`<${nome}[^>]*>([^<]*)</${nome}>`, "i"));
    return m ? m[1].trim() : "";
}
function bloco(xml, nome) {
    const m = String(xml || "").match(new RegExp(`<${nome}[ >][\\s\\S]*?</${nome}>`, "i"));
    return m ? m[0] : "";
}

// Le uma NFS-e do padrao nacional (mesma logica do financeiro.html).
function lerNfse(xml) {
    const chave = (xml.match(/<infNFSe[^>]*\bId="NFS(\d{50})"/i) || [])[1] || null;
    if (!chave) return null;
    const emit = bloco(xml, "emit");
    const toma = bloco(xml, "toma");
    const dps = bloco(xml, "infDPS") || xml;
    return {
        chave,
        numero: tag(xml, "nNFSe") || null,
        serie: tag(dps, "serie") || null,
        emitenteNome: decodificaEntidades(tag(emit, "xNome")),
        emitenteCnpj: so(tag(emit, "CNPJ") || tag(emit, "CPF")),
        destinatarioNome: decodificaEntidades(tag(toma, "xNome")),
        destinatarioCnpj: so(tag(toma, "CNPJ") || tag(toma, "CPF")),
        valorTotal: parseFloat(tag(dps, "vServ") || "0") || null,
        dataEmissao: (tag(dps, "dhEmi") || tag(xml, "dhProc") || "").slice(0, 10) || null,
    };
}

// Separa um lote do ADN em notas tomadas (pra gravar) e chaves canceladas.
function processarLote(lote, cnpjCert, mapaCnpjUnidade) {
    const raizCert = cnpjCert.slice(0, 8);
    const r = { linhas: [], canceladas: [], tomadasIgnoradas: 0, emitidasPelaEmpresa: 0, enviadasLidas: 0, outras: 0, eventosOutros: 0, semXml: 0, maiorNsu: 0 };
    for (const d of lote) {
        const nsu = parseInt(d.NSU || d.nsu || "0", 10) || 0;
        if (nsu > r.maiorNsu) r.maiorNsu = nsu;
        const tipoEvento = String(d.TipoEvento || d.tipoEvento || "").toUpperCase();
        const chaveItem = so(d.ChaveAcesso || d.chaveAcesso);
        if (tipoEvento) {
            if (tipoEvento.includes("CANCELAMENTO") && chaveItem.length === 50) r.canceladas.push(chaveItem);
            else r.eventosOutros++;
            continue;
        }
        const b64 = d.ArquivoXml || d.arquivoXml;
        if (!b64) { r.semXml++; continue; }
        let xml;
        try { xml = zlib.gunzipSync(Buffer.from(b64, "base64")).toString("utf-8"); }
        catch (_e) { xml = Buffer.from(b64, "base64").toString("utf-8"); }
        const n = lerNfse(xml);
        if (!n) { r.outras++; continue; }
        if (!n.destinatarioCnpj || !(mapaCnpjUnidade.has(n.destinatarioCnpj) || n.destinatarioCnpj.slice(0, 8) === raizCert)) {
            if (n.emitenteCnpj && n.emitenteCnpj.slice(0, 8) === raizCert) {
                // Emitida pela empresa (prestadora): vai pra aba Notas Enviadas. O "cliente" e' o tomador.
                r.emitidasPelaEmpresa++;
                r.linhas.push({
                    chave_acesso: n.chave,
                    tipo: "NFSe",
                    numero: n.numero,
                    serie: n.serie,
                    emitente_nome: n.emitenteNome,
                    emitente_cnpj: n.emitenteCnpj,
                    destinatario_nome: n.destinatarioNome,
                    destinatario_cnpj: n.destinatarioCnpj,
                    valor_total: n.valorTotal,
                    data_emissao: n.dataEmissao,
                    centro_custo_id: null,
                    xml_completo: xml,
                    direcao: "enviada",
                });
            } else r.outras++;
            continue;
        }
        r.linhas.push({
            chave_acesso: n.chave,
            tipo: "NFSe",
            numero: n.numero,
            serie: n.serie,
            emitente_nome: n.emitenteNome,
            emitente_cnpj: n.emitenteCnpj,
            destinatario_nome: n.destinatarioNome,
            destinatario_cnpj: n.destinatarioCnpj,
            valor_total: n.valorTotal,
            data_emissao: n.dataEmissao,
            centro_custo_id: mapaCnpjUnidade.get(n.destinatarioCnpj) || null,
            xml_completo: xml,
            direcao: "recebida",
        });
    }
    return r;
}

function pedir(caminho, pfx, senha) {
    return new Promise((resolve, reject) => {
        const req = https.request(
            { host: HOST, path: caminho, method: "GET", pfx, passphrase: senha, headers: { Accept: "application/json" }, timeout: 30000 },
            (res) => {
                const chunks = [];
                res.on("data", (c) => chunks.push(c));
                res.on("end", () => resolve({ status: res.statusCode, texto: Buffer.concat(chunks).toString("utf-8") }));
            }
        );
        req.on("timeout", () => req.destroy(new Error("timeout de 30s")));
        req.on("error", reject);
        req.end();
    });
}

async function main() {
    const faltando = ["SEFAZ_CERT_PFX_BASE64", "SEFAZ_CERT_SENHA", "SEFAZ_CNPJ", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((k) => !process.env[k]);
    if (faltando.length) { console.error("Faltam secrets:", faltando.join(", ")); process.exit(1); }
    const cnpj = so(process.env.SEFAZ_CNPJ);
    const pfx = Buffer.from(process.env.SEFAZ_CERT_PFX_BASE64, "base64");
    const senha = process.env.SEFAZ_CERT_SENHA;
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: controle, error: erroCtl } = await supabase.from("nfse_nsu_controle").select("ultimo_nsu").eq("cnpj", cnpj).maybeSingle();
    if (erroCtl) {
        console.error("Erro lendo nfse_nsu_controle (rodou sql_extra/nfse_nsu_controle.sql no Supabase?):", erroCtl.message);
        process.exit(1);
    }
    let nsu = parseInt(controle?.ultimo_nsu || "0", 10) || 0;
    const nsuInicial = nsu;

    const { data: unidades } = await supabase.from("financeiro_centros_custo").select("id, cnpj");
    const mapaCnpjUnidade = new Map();
    (unidades || []).forEach((u) => { if (u.cnpj) mapaCnpjUnidade.set(so(u.cnpj), u.id); });

    const tot = { paginas: 0, docs: 0, gravadas: 0, canceladasMarcadas: 0, emitidasPelaEmpresa: 0, outras: 0, eventosOutros: 0, semXml: 0 };
    let parou = "fila vazia";
    let falhou = false;

    for (let p = 0; p < MAX_PAGINAS; p++) {
        if (p > 0) await new Promise((r) => setTimeout(r, PAUSA_ENTRE_PAGINAS_MS));
        let r;
        try { r = await pedir(`/contribuintes/DFe/${nsu}?cnpjConsulta=${cnpj}&lote=true`, pfx, senha); }
        catch (e) { console.error("Erro de conexao com o ADN:", e.message); parou = "erro de conexao"; falhou = true; break; }
        tot.paginas++;
        if (r.status === 404) { parou = "fila vazia (404)"; break; }
        if (r.status === 429) { console.error("ADN pediu pra ir mais devagar (429). Tenta na proxima rodada."); parou = "429"; break; }
        let j = null;
        try { j = JSON.parse(r.texto); } catch (_e) { /* ignora */ }
        if (r.status !== 200 || !j) {
            console.error("ADN respondeu HTTP", r.status, String(r.texto || "").replace(/\d{11,}/g, "<num>").slice(0, 200));
            parou = "HTTP " + r.status; falhou = r.status >= 500 || r.status === 401 || r.status === 403;
            break;
        }
        const lote = j.LoteDFe || j.loteDFe || [];
        if (!lote.length) { parou = "fila vazia"; break; }

        const res = processarLote(lote, cnpj, mapaCnpjUnidade);
        tot.docs += lote.length;
        tot.emitidasPelaEmpresa += res.emitidasPelaEmpresa; tot.outras += res.outras;
        tot.eventosOutros += res.eventosOutros; tot.semXml += res.semXml;

        // 1) notas tomadas (sem repetir chave dentro do mesmo lote)
        const unicas = Array.from(new Map(res.linhas.map((l) => [l.chave_acesso, l])).values());
        if (unicas.length) {
            let { error } = await supabase.from("nfecloud_documentos").upsert(unicas, { onConflict: "chave_acesso", ignoreDuplicates: false });
            let gravar = unicas;
            if (error && /direcao/i.test(error.message || "")) {
                // Coluna "direcao" ainda nao existe (falta rodar sql_extra/nfse_direcao.sql): segue
                // gravando so' as recebidas, como antes, e as enviadas ficam pra depois do SQL
                // (o cursor so' avanca depois de gravar, entao nao se perde nada se o cursor for zerado).
                console.warn("Coluna direcao ausente: gravando so' as recebidas (rode sql_extra/nfse_direcao.sql).");
                gravar = unicas.filter((l) => l.direcao !== "enviada").map(({ direcao, ...resto }) => resto);
                ({ error } = gravar.length ? await supabase.from("nfecloud_documentos").upsert(gravar, { onConflict: "chave_acesso", ignoreDuplicates: false }) : { error: null });
            }
            if (error) { console.error("Erro gravando NFS-e:", error.message); parou = "erro ao gravar"; falhou = true; break; }
            tot.gravadas += gravar.length;
        }
        // 2) cancelamentos (depois das notas, pro caso das duas virem no mesmo lote)
        if (res.canceladas.length) {
            const { data, error } = await supabase.from("nfecloud_documentos").update({ situacao_sefaz: "cancelada" }).in("chave_acesso", Array.from(new Set(res.canceladas))).select("chave_acesso");
            if (error) { console.error("Erro marcando NFS-e cancelada:", error.message); parou = "erro ao gravar"; falhou = true; break; }
            tot.canceladasMarcadas += (data || []).length;
        }
        // 3) so' agora o cursor avanca
        if (res.maiorNsu <= nsu) { parou = "sem avanco de NSU"; break; }
        nsu = res.maiorNsu;
        const { error: erroNsu } = await supabase.from("nfse_nsu_controle").upsert({ cnpj, ultimo_nsu: nsu, atualizado_em: new Date().toISOString() }, { onConflict: "cnpj" });
        if (erroNsu) { console.error("Erro salvando NSU:", erroNsu.message); parou = "erro ao salvar NSU"; falhou = true; break; }
        if (p === MAX_PAGINAS - 1) parou = "limite de paginas desta rodada (continua na proxima)";
    }

    console.log(JSON.stringify({ ok: !falhou, parou, nsuInicial, nsuFinal: nsu, ...tot }));
    if (falhou) process.exitCode = 1;
}

if (require.main === module) {
    main().catch((e) => { console.error("Falhou:", e.message); process.exit(1); });
}
module.exports = { lerNfse, processarLote, decodificaEntidades };
