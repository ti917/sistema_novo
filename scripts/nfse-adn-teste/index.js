// nfse-adn-teste (29/10/2026)
//
// TESTE DE LEITURA da API nacional da NFS-e (ADN - Ambiente de Dados Nacional):
// pergunta "quais NFS-e existem contra o CNPJ da Soul?" usando o mesmo certificado
// digital A1 da sincronizacao da SEFAZ. NAO grava nada no Supabase, so' LE e
// escreve um resumo no log.
//
// IMPORTANTE: o repositorio e' publico, entao o log do Actions tambem e'. Por isso
// este script NAO imprime nomes, valores nem chaves completas - so' contagens,
// codigos de resposta e as ultimas 6 digitos de cada chave.
//
// Endereco e parametros seguem o manual do ADN (GET /contribuintes/DFe/{NSU}); como
// nao deu pra conferir tudo sem o certificado, o teste existe justamente pra ver o
// que a API responde de verdade (codigo HTTP, formato) antes de gravar qualquer coisa.
//
// Variaveis (GitHub Secrets / inputs do workflow): SEFAZ_CERT_PFX_BASE64,
// SEFAZ_CERT_SENHA, SEFAZ_CNPJ, NSU_INICIAL (padrao 0), PAGINAS (padrao 3),
// ADN_AMBIENTE ("producao" ou "restrita"; padrao producao).

const https = require("https");
const zlib = require("zlib");

const pfxBase64 = process.env.SEFAZ_CERT_PFX_BASE64;
const senha = process.env.SEFAZ_CERT_SENHA;
const cnpj = (process.env.SEFAZ_CNPJ || "").replace(/\D/g, "");
let nsu = parseInt(process.env.NSU_INICIAL || "0", 10) || 0;
const paginas = Math.min(parseInt(process.env.PAGINAS || "3", 10) || 3, 10);
const host = process.env.ADN_AMBIENTE === "restrita" ? "adn.producaorestrita.nfse.gov.br" : "adn.nfse.gov.br";

if (!pfxBase64 || !senha || !cnpj) {
    console.error("Faltam secrets: SEFAZ_CERT_PFX_BASE64, SEFAZ_CERT_SENHA ou SEFAZ_CNPJ.");
    process.exit(1);
}
const pfx = Buffer.from(pfxBase64, "base64");

function get(caminho) {
    return new Promise((resolve, reject) => {
        const req = https.request(
            { host, path: caminho, method: "GET", pfx, passphrase: senha, headers: { Accept: "application/json" }, timeout: 30000 },
            (res) => {
                const chunks = [];
                res.on("data", (c) => chunks.push(c));
                res.on("end", () => resolve({ status: res.statusCode, tipo: res.headers["content-type"] || "", texto: Buffer.concat(chunks).toString("utf-8") }));
            }
        );
        req.on("timeout", () => req.destroy(new Error("timeout de 30s")));
        req.on("error", reject);
        req.end();
    });
}

function tag(xml, nome, dentroDe) {
    let base = xml;
    if (dentroDe) {
        const b = xml.match(new RegExp(`<${dentroDe}[ >][\\s\\S]*?</${dentroDe}>`, "i"));
        if (!b) return "";
        base = b[0];
    }
    const m = base.match(new RegExp(`<${nome}[^>]*>([^<]*)</${nome}>`, "i"));
    return m ? m[1].trim() : "";
}

(async () => {
    console.log(`ADN ${host} | CNPJ ...${cnpj.slice(-6)} | NSU inicial ${nsu} | ate ${paginas} pagina(s)`);
    const resumo = { docs: 0, comoTomador: 0, comoPrestador: 0, outros: 0, eventos: 0, tipos: {}, semXml: 0 };
    for (let p = 1; p <= paginas; p++) {
        const caminho = `/contribuintes/DFe/${nsu}?cnpjConsulta=${cnpj}&lote=true`;
        let r;
        try {
            r = await get(caminho);
        } catch (e) {
            console.log(`Pagina ${p}: erro de conexao: ${e.message}`);
            process.exit(1);
        }
        console.log(`Pagina ${p}: HTTP ${r.status} (${r.tipo.split(";")[0]})`);
        let j = null;
        try { j = JSON.parse(r.texto); } catch (_e) { /* nao e' JSON */ }
        if (!j) {
            console.log("  Resposta nao e' JSON. Primeiros 200 caracteres (sem dados da empresa):", r.texto.replace(/\d{11,}/g, "<num>").slice(0, 200));
            break;
        }
        console.log("  Campos da resposta:", Object.keys(j).join(", "));
        console.log("  StatusProcessamento:", j.StatusProcessamento || j.statusProcessamento || "(nao veio)");
        const erros = j.Erros || j.erros || [];
        if (erros.length) console.log("  Erros:", JSON.stringify(erros).replace(/\d{11,}/g, "<num>").slice(0, 400));
        const lote = j.LoteDFe || j.loteDFe || [];
        console.log(`  Documentos neste lote: ${lote.length}`);
        if (!lote.length || r.status !== 200) break;

        let maior = nsu;
        for (const d of lote) {
            resumo.docs++;
            const n = parseInt(d.NSU || d.nsu || "0", 10);
            if (n > maior) maior = n;
            const tipoDoc = d.TipoDocumento || d.tipoDocumento || "?";
            const tipoEv = d.TipoEvento || d.tipoEvento || "";
            resumo.tipos[tipoDoc + (tipoEv ? "/" + tipoEv : "")] = (resumo.tipos[tipoDoc + (tipoEv ? "/" + tipoEv : "")] || 0) + 1;
            const b64 = d.ArquivoXml || d.arquivoXml;
            if (!b64) { resumo.semXml++; continue; }
            let xml = "";
            try { xml = zlib.gunzipSync(Buffer.from(b64, "base64")).toString("utf-8"); } catch (_e) { xml = Buffer.from(b64, "base64").toString("utf-8"); }
            if (/<evento|<pedRegEvento|<infPedReg/i.test(xml) && !/<infNFSe/i.test(xml)) { resumo.eventos++; continue; }
            const emit = tag(xml, "CNPJ", "emit").replace(/\D/g, "");
            const toma = tag(xml, "CNPJ", "toma").replace(/\D/g, "");
            if (toma === cnpj) resumo.comoTomador++;
            else if (emit === cnpj) resumo.comoPrestador++;
            else resumo.outros++;
        }
        if (maior <= nsu) break;
        nsu = maior;
    }
    console.log("RESUMO:", JSON.stringify(resumo));
    console.log("Ultimo NSU lido:", nsu);
})().catch((e) => { console.error("Falhou:", e.message); process.exit(1); });
