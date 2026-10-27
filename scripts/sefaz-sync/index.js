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

    while (paginas < MAX_PAGINAS) {
        paginas++;
        const envelope = buildEnvelope(cUFAutor, cnpj, tpAmb, ultNSU);
        const resp = await postSoap(envelope, pfxBuffer, senha);
        if (resp.status < 200 || resp.status >= 300) {
            console.error("SEFAZ respondeu HTTP", resp.status, resp.texto.slice(0, 500));
            process.exit(1);
        }

        const cStat = extractTag(resp.texto, "cStat") || "";
        const xMotivo = extractTag(resp.texto, "xMotivo") || "";
        ultimoCStat = cStat; ultimoXMotivo = xMotivo;
        const novoUltNSU = extractTag(resp.texto, "ultNSU") || ultNSU;
        const maxNSU = extractTag(resp.texto, "maxNSU") || novoUltNSU;

        if (cStat === "137") { ultNSU = novoUltNSU; break; } // 137 = nenhum documento novo
        if (cStat !== "138") { // 138 = documentos encontrados
            console.error("SEFAZ recusou a consulta:", cStat, xMotivo, resp.texto.slice(0, 800));
            process.exit(1);
        }

        const docZipRegex = /<docZip[^>]*schema="([^"]+)"[^>]*>([^<]+)<\/docZip>/g;
        let match;
        const linhas = [];
        while ((match = docZipRegex.exec(resp.texto)) !== null) {
            const [, schema, docZipB64] = match;
            totalProcessados++;
            try {
                const xmlDoc = zlib.gunzipSync(Buffer.from(docZipB64, "base64")).toString("utf-8");
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

    console.log(JSON.stringify({
        ok: true,
        processados: totalProcessados,
        gravados: totalGravados,
        paginas,
        ultNSU,
        ultimoStatus: `${ultimoCStat} - ${ultimoXMotivo}`,
    }));
}

main().catch((e) => {
    console.error("Erro geral:", e && e.stack ? e.stack : String(e));
    process.exit(1);
});
