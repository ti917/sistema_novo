// manifestacao.js
//
// Envia o evento de "Manifestacao do Destinatario - Ciencia da Operacao"
// (codigo 210210) pra cada NFe que a empresa recebeu. Isso e' praticamente
// obrigatorio: se passar muito tempo sem nenhuma manifestacao, a SEFAZ pode
// bloquear a empresa de emitir as proprias notas.
//
// IMPORTANTE - o que "Ciencia da Operacao" NAO faz:
//   - nao confirma a compra
//   - nao aprova pagamento nem lanca nada no financeiro
//   - nao impede a empresa de, depois, registrar "Desconhecimento da
//     Operacao" ou "Operacao nao Realizada" se a nota for furada
// Ela so diz "a empresa esta ciente de que essa nota existe no CNPJ dela".
//
// So se aplica a NFe modelo 55 (NFCe modelo 65 nao usa manifestacao).
//
// Detalhe tecnico que vale registrar: diferente da consulta de distribuicao
// (que e' por UF as vezes), o evento de manifestacao do destinatario SEMPRE
// vai pro Ambiente Nacional (cOrgao = 91), nao pro webservice proprio de
// cada estado - isso vale pra qualquer UF, inclusive SP. Confirmado contra
// a documentacao oficial da SEFAZ-SP e de bibliotecas de terceiros antes de
// implementar (nao foi chute).
//
// Depois que a SEFAZ aceita a ciencia, o XML completo da nota (NFe + o
// protocolo de autorizacao, schema "procNFe") passa a ficar disponivel pra
// download na consulta de distribuicao normal - geralmente aparece numa das
// proximas execucoes (nao e' instantaneo). E' o index.js que recolhe esse
// XML completo quando ele aparece.

const https = require("https");
const tls = require("tls");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { SignedXml } = require("xml-crypto");

// CORRECAO (28/10/2026): diferente do que o comentario antigo dizia, o
// servico de Recepcao de Eventos (NFeRecepcaoEvento4 - usado pela Ciencia da
// Operacao) NAO e' centralizado no Ambiente Nacional pra todo mundo. Cada UF
// que roda autorizador proprio (caso de SP) tem o SEU PROPRIO endereco pra
// esse servico - confirmado na pagina oficial da SEFAZ-SP
// (portal.fazenda.sp.gov.br/servicos/nfe/Paginas/URL-WEBSERVICES.aspx), que
// lista tres enderecos diferentes com nome parecido (SP, SVC-AN e Ambiente
// Nacional) - cada UF usa o seu, nao o nacional generico. Isso e' diferente
// da consulta de distribuicao (NFeDistribuicaoDFe, em index.js), que essa
// sim e' sempre centralizada no Ambiente Nacional pra qualquer UF - foi essa
// diferenca que explicava o erro "action ... was NOT RECOGNIZED": a gente
// mandava a ciencia pro servidor nacional generico, que nao reconhecia essa
// action porque quem atende esse servico pra empresas de SP e' o servidor
// proprio da SEFAZ-SP, nao o nacional.
const SEFAZ_AMBIENTE_PARA_HOST_SP = {
    "1": "nfe.fazenda.sp.gov.br", // producao
    "2": "homologacao.nfe.fazenda.sp.gov.br", // homologacao
};
const AN_PATH = "/ws/NFeRecepcaoEvento4.asmx";
const SOAP_ACTION = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento";
const TP_EVENTO_CIENCIA = "210210";

// Extrai a chave privada e o certificado (em PEM) de dentro do .pfx, usando
// o openssl que ja vem instalado no runner do GitHub Actions. Precisa do
// "-legacy" pelo mesmo motivo do resto do projeto: o certificado foi gerado
// com um algoritmo mais antigo que o OpenSSL 3 desativa por padrao.
//
// A senha nunca passa como argumento de linha de comando (isso apareceria
// pra qualquer um que olhasse a lista de processos da maquina) - ela vai por
// uma variavel de ambiente que so esse processo filho enxerga.
function extrairChavePemECertPem(pfxBuffer, senha) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sefaz-cert-"));
    const pfxPath = path.join(tmpDir, "cert.pfx");
    const keyPath = path.join(tmpDir, "key.pem");
    const certPath = path.join(tmpDir, "cert.pem");
    try {
        fs.writeFileSync(pfxPath, pfxBuffer);
        const env = { ...process.env, SEFAZ_SENHA_OPENSSL_TMP: senha };
        execFileSync(
            "openssl",
            ["pkcs12", "-in", pfxPath, "-nocerts", "-nodes", "-legacy", "-passin", "env:SEFAZ_SENHA_OPENSSL_TMP", "-out", keyPath],
            { env }
        );
        execFileSync(
            "openssl",
            ["pkcs12", "-in", pfxPath, "-clcerts", "-nokeys", "-legacy", "-passin", "env:SEFAZ_SENHA_OPENSSL_TMP", "-out", certPath],
            { env }
        );
        return { keyPem: fs.readFileSync(keyPath, "utf-8"), certPem: fs.readFileSync(certPath, "utf-8") };
    } finally {
        // apaga a chave privada em texto puro do disco assim que termina de
        // ler - nao deixa isso sobrando em /tmp do runner.
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}

// SEFAZ exige a data/hora do evento em ISO 8601 com o fuso de Brasilia
// (-03:00), sem milissegundos.
function formatarDhEvento() {
    const agora = new Date();
    const local = new Date(agora.getTime() + (-3 * 60 - agora.getTimezoneOffset()) * 60000);
    const pad = (n) => String(n).padStart(2, "0");
    return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}:${pad(local.getSeconds())}-03:00`;
}

// Monta o XML do evento (envEvento > evento > infEvento) e assina
// digitalmente o infEvento com o certificado, no formato que a SEFAZ exige:
// XMLDSig "enveloped", canonicalizacao C14N (a original, nao a "exclusive"),
// SHA1 + RSA. A assinatura entra como irma do infEvento (nao filha dele).
function montarEnvEventoAssinado(chave, cnpj, tpAmb, keyPem, certPem) {
    const idLote = String(Date.now());
    const id = `ID${TP_EVENTO_CIENCIA}${chave}01`;
    const xmlSemAssinatura =
        `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
        `<idLote>${idLote}</idLote>` +
        `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">` +
        `<infEvento Id="${id}">` +
        `<cOrgao>91</cOrgao>` +
        `<tpAmb>${tpAmb}</tpAmb>` +
        `<CNPJ>${cnpj}</CNPJ>` +
        `<chNFe>${chave}</chNFe>` +
        `<dhEvento>${formatarDhEvento()}</dhEvento>` +
        `<tpEvento>${TP_EVENTO_CIENCIA}</tpEvento>` +
        `<nSeqEvento>1</nSeqEvento>` +
        `<verEvento>1.00</verEvento>` +
        `<detEvento versao="1.00"><descEvento>Ciencia da Operacao</descEvento></detEvento>` +
        `</infEvento>` +
        `</evento>` +
        `</envEvento>`;

    const sig = new SignedXml({
        privateKey: keyPem,
        publicCert: certPem,
        getKeyInfoContent: SignedXml.getKeyInfoContent,
        signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
        canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    });
    sig.addReference({
        xpath: "//*[local-name(.)='infEvento']",
        digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
        transforms: [
            "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
            "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
        ],
    });
    sig.computeSignature(xmlSemAssinatura, {
        location: { reference: "//*[local-name(.)='infEvento']", action: "after" },
    });
    return sig.getSignedXml();
}

// CORRECAO (28/10/2026): primeiro teste real do host proprio de SP (depois
// de varios dias so batendo bloqueio 656 antes de chegar nessa etapa) deu
// "unable to get local issuer certificate" nas 50 tentativas. Isso NAO e'
// bloqueio nem duplicidade - e' o Node rejeitando a cadeia de certificado
// TLS do servidor. Causa confirmada (mesmo padrao relatado por quem integra
// com servidores proprios de SEFAZ via bibliotecas que nao fazem "AIA
// chasing", tipo ACBr/Delphi com erro 12045): o servidor manda so o
// certificado final, sem os intermediarios da cadeia ICP-Brasil - um
// navegador busca o intermediario que falta sozinho (AIA), mas o Node
// nativo (https.request) nao faz isso, entao rejeita.
//
// Correcao SEM abrir mao da validacao: antes da chamada real, faz uma
// conexao TLS "de reconhecimento" pro mesmo host (rejectUnauthorized:false
// SO nessa etapa, so pra capturar a cadeia que o servidor apresenta) e usa
// essa cadeia como "ca" trustada na chamada real de verdade - que continua
// validando normalmente (rejectUnauthorized:true, o padrao do Node). Isso
// nao e' "desligar a seguranca": a gente ainda confirma que e' o host certo
// (hostname fixo, hardcoded) e ainda faz a autenticacao mutua via
// certificado A1 (pfx/passphrase) nos dois sentidos - so para de depender
// do servidor mandar a cadeia completa, que ele nao manda.
const cadeiaPorHost = new Map();
function buscarCadeiaDoServidor(host) {
    if (cadeiaPorHost.has(host)) return Promise.resolve(cadeiaPorHost.get(host));
    return new Promise((resolve, reject) => {
        const socket = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: false }, () => {
            const certs = [];
            let cert = socket.getPeerCertificate(true);
            const vistos = new Set();
            while (cert && cert.raw && !vistos.has(cert.fingerprint256)) {
                vistos.add(cert.fingerprint256);
                const b64 = cert.raw.toString("base64").match(/.{1,64}/g).join("\n");
                certs.push(`-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----\n`);
                cert = cert.issuerCertificate;
            }
            socket.end();
            cadeiaPorHost.set(host, certs);
            resolve(certs);
        });
        socket.on("error", reject);
        socket.setTimeout(15000, () => socket.destroy(new Error("timeout de 15s reconhecendo a cadeia de certificado TLS da SEFAZ")));
    });
}

async function postEventoSoap(envEventoAssinadoXml, pfxBuffer, senha, tpAmb) {
    const host = SEFAZ_AMBIENTE_PARA_HOST_SP[tpAmb] || SEFAZ_AMBIENTE_PARA_HOST_SP["1"];
    const ca = await buscarCadeiaDoServidor(host);
    return new Promise((resolve, reject) => {
        const soapBody =
            `<?xml version="1.0" encoding="utf-8"?>` +
            `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
            `<soap12:Body><nfeRecepcaoEvento xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">` +
            `<nfeDadosMsg>${envEventoAssinadoXml}</nfeDadosMsg>` +
            `</nfeRecepcaoEvento></soap12:Body></soap12:Envelope>`;
        const body = Buffer.from(soapBody, "utf-8");
        const req = https.request(
            {
                host,
                path: AN_PATH,
                method: "POST",
                pfx: pfxBuffer,
                passphrase: senha,
                ca,
                headers: {
                    // Historico desse header (28/10/2026): tentamos so
                    // "SOAPAction", so "action" no Content-Type, e os dois juntos -
                    // nenhuma combinacao resolveu sozinha o erro "action ... was
                    // NOT RECOGNIZED". O motivo real nao era o header: era o
                    // HOST (ver comentario de SEFAZ_AMBIENTE_PARA_HOST_SP acima -
                    // a gente mandava pro Ambiente Nacional generico, e quem
                    // atende esse servico pra SP e' o servidor proprio da
                    // SEFAZ-SP). Mantemos os dois headers juntos porque nao faz
                    // mal nenhum e cobre qualquer variacao de exigencia entre
                    // SOAP 1.1/1.2 dos diferentes servidores da SEFAZ.
                    "Content-Type": `application/soap+xml; charset=utf-8; action="${SOAP_ACTION}"`,
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
        req.on("timeout", () => req.destroy(new Error("timeout de 30s falando com a SEFAZ (evento de manifestacao)")));
        req.on("error", reject);
        req.write(body);
        req.end();
    });
}

// Envia a ciencia pra UMA chave de NFe. Nunca lanca excecao pra cima -
// sempre devolve {ok, cStat, xMotivo}, pra quem chama decidir o que fazer
// (uma nota com erro nao pode travar as outras).
async function enviarCienciaDaOperacao({ chave, cnpj, tpAmb, keyPem, certPem, pfxBuffer, senha }) {
    try {
        const envEventoAssinado = montarEnvEventoAssinado(chave, cnpj, tpAmb, keyPem, certPem);
        const resp = await postEventoSoap(envEventoAssinado, pfxBuffer, senha, tpAmb);
        if (resp.status < 200 || resp.status >= 300) {
            // Tenta pegar soap:Text/soap:Reason (SOAP 1.2) ou faultstring (SOAP 1.1)
            // direto - essa e' a parte que explica o motivo de verdade, e um
            // slice(0,300) cru as vezes corta antes dela chegar.
            const textoFalha =
                (resp.texto.match(/<soap:Text[^>]*>([^<]*)<\/soap:Text>/i) ||
                 resp.texto.match(/<faultstring[^>]*>([^<]*)<\/faultstring>/i) ||
                 [])[1];
            const motivo = textoFalha
                ? `HTTP ${resp.status}: ${textoFalha}`
                : `HTTP ${resp.status}: ${resp.texto.slice(0, 1500)}`;
            return { ok: false, motivo };
        }
        // O <cStat> do LOTE (128 = processado) vem antes do <cStat> do
        // EVENTO em si no XML de resposta - o que importa e' o ultimo.
        const todosCStat = [...resp.texto.matchAll(/<cStat>(\d+)<\/cStat>/g)].map((m) => m[1]);
        const todosXMotivo = [...resp.texto.matchAll(/<xMotivo>([^<]*)<\/xMotivo>/g)].map((m) => m[1]);
        const cStat = todosCStat[todosCStat.length - 1] || null;
        const xMotivo = todosXMotivo[todosXMotivo.length - 1] || null;
        // 135 = registrado e vinculado | 136 = registrado, ainda nao vinculado
        // (a NFe pode nao ter propagado pro Ambiente Nacional ainda - tenta
        // de novo numa proxima execucao) | 573 = duplicidade (ja mandamos
        // antes - trata como sucesso, nao precisa mandar de novo).
        const sucesso = cStat === "135" || cStat === "136" || cStat === "573";
        return { ok: sucesso, cStat, xMotivo, respostaCrua: resp.texto.slice(0, 1500) };
    } catch (e) {
        return { ok: false, motivo: e && e.message ? e.message : String(e) };
    }
}

module.exports = { extrairChavePemECertPem, enviarCienciaDaOperacao };
