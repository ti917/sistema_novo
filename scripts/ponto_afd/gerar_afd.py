#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador do AFD (Arquivo Fonte de Dados) do ponto-app — REP-P, Portaria MTP 671/2021.

IMPORTANTE: este arquivo so tem CODIGO. Nenhum dado de colaborador fica no repositorio
(que e publico). O AFD gerado e assinado (.p7s) e enviado pro bucket PRIVADO `ponto-fiscal`
do Supabase. Nada de CPF/nome/horario e impresso no log.

Fontes (somente leitura, exceto --sincronizar):
  ponto_batidas  -> registros tipo 7 (batidas)
  ponto_eventos  -> registros tipo 2 (empregador), 5 (empregados), 6 (eventos do REP-P)
  perfis         -> CPF (dados_admissao.cpf) e nome dos colaboradores

Layout: https://www.gov.br/trabalho-e-emprego/.../leiaute-do-arquivo-fonte-de-dados-afd.pdf
Premissas (o leiaute nao especifica; documentadas aqui):
  * hash SHA-256 do tipo 7 = SHA-256( campos 1 a 7 do registro, como gravados nas posicoes
    001-073, concatenados + hash do tipo 7 anterior do arquivo, se houver ).
  * CRC-16/KERMIT calculado sobre o texto do registro ate antes do campo CRC.
"""
import argparse, base64, datetime as dt, hashlib, json, os, subprocess, sys, tempfile
import urllib.request, urllib.parse, urllib.error

FUSO = dt.timezone(dt.timedelta(hours=-3))  # Brasil (sem horario de verao desde 2019)
COLETOR = {"app": "01", "quiosque": "01", "clara": "05"}


def crc16_kermit(data: bytes) -> str:
    crc = 0
    for b in data:
        crc ^= b
        for _ in range(8):
            crc = (crc >> 1) ^ 0x8408 if crc & 1 else crc >> 1
    return "%04X" % crc


def num(v, n):
    s = "".join(ch for ch in str(v or "") if ch.isdigit())
    if len(s) > n:
        raise ValueError("numero maior que o campo (%d > %d)" % (len(s), n))
    return s.rjust(n, "0")


def alfa(v, n):
    s = str(v or "")
    # ISO-8859-1: troca o que nao existe nela por '?', corta e completa com espaco
    s = s.encode("latin-1", "replace").decode("latin-1")
    return s[:n].ljust(n)


def parse_ts(s):
    if isinstance(s, dt.datetime):
        d = s
    else:
        d = dt.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    return d.astimezone(FUSO)


def dh(s):
    d = parse_ts(s)
    return d.strftime("%Y-%m-%dT%H:%M:00") + "-0300"


def com_crc(corpo):
    return corpo + crc16_kermit(corpo.encode("latin-1"))


def montar_afd(emp, eventos, batidas, perfis, ini, fim, gerado_em, inpi):
    """emp: dict(cnpj, razao, local, cpf_resp). Retorna (texto, contagens, ultimo_nsr)."""
    cnpj = num(emp["cnpj"], 14)
    linhas = []  # (nsr, texto)
    cont = {2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0}

    for ev in eventos:
        t = int(ev["tipo_afd"])
        d = ev.get("dados") or {}
        nsr = num(ev["nsr"], 9)
        if t == 2:
            corpo = (nsr + "2" + dh(ev["data_hora"]) + num(d.get("cpf_resp") or emp.get("cpf_resp"), 14)
                     + "1" + cnpj + num(d.get("cno"), 14) + alfa(d.get("razao") or emp["razao"], 150)
                     + alfa(d.get("local") or emp.get("local"), 100))
            linhas.append((ev["nsr"], com_crc(corpo)))
        elif t == 5:
            corpo = (nsr + "5" + dh(ev["data_hora"]) + alfa(d.get("operacao", "I"), 1)
                     + num(d.get("cpf"), 12) + alfa(d.get("nome"), 52) + alfa("", 4)
                     + num(d.get("cpf_resp") or emp.get("cpf_resp"), 11))
            linhas.append((ev["nsr"], com_crc(corpo)))
        elif t == 6:
            corpo = nsr + "6" + dh(ev["data_hora"]) + num(d.get("codigo"), 2)
            linhas.append((ev["nsr"], corpo))
        else:
            continue
        cont[t] += 1

    # tipo 7, em ordem de NSR, com o hash encadeado
    hash_ant = ""
    for b in sorted(batidas, key=lambda x: int(x["nsr"])):
        cpf = perfis.get(b["colaborador_id"], {}).get("cpf")
        if not cpf:
            raise SystemExit("batida NSR %s sem CPF do colaborador — AFD nao gerado." % b["nsr"])
        campos = (num(b["nsr"], 9) + "7" + dh(b["data_hora"]) + num(cpf, 12) + dh(b["criado_em"])
                  + COLETOR.get(b.get("origem"), "05") + "0")
        h = hashlib.sha256((campos + hash_ant).encode("latin-1")).hexdigest()
        hash_ant = h
        linhas.append((b["nsr"], campos + h))
        cont[7] += 1

    linhas.sort(key=lambda x: int(x[0]))

    ultimo = max([int(n) for n, _ in linhas] or [0])
    ident = emp.get("tipo_ident", "1")
    cab = ("000000000" + "1" + ident + cnpj + num(emp.get("cno"), 14) + alfa(emp["razao"], 150)
           + num(inpi, 17) + ini + fim + dh(gerado_em) + "004" + "1" + num(emp.get("dev_cnpj") or cnpj, 14)
           + alfa("", 30))
    saidas = [com_crc(cab)] + [t for _, t in linhas]
    trailer = ("999999999" + "".join(num(cont[k], 9) for k in (2, 3, 4, 5, 6, 7)) + "9")
    saidas.append(trailer)
    saidas.append(alfa("ASSINATURA_DIGITAL_EM_ARQUIVO_P7S", 100))
    return "\r\n".join(saidas) + "\r\n", cont, ultimo


# ---------------------------------------------------------------- AEJ (Anexo VI / gov.br, versao 002)
def _lat(s, n):
    return str(s or "").encode("latin-1", "replace").decode("latin-1")[:n]


def montar_aej(emp, batidas, perfis, ini, fim, gerado_em, inpi, dev):
    """Registros 01, 02, 03, 05, 08 e 99 (campos separados por '|', sem '|' no fim).
    PENDENTE: registro 04 (horario contratual) e 07 (ausencias/banco) — ver avisos."""
    avisos = ["registro 04 (horario contratual) nao gerado: marcacoes sem codHorContratual",
              "registro 07 (ausencias/banco de horas) nao gerado"]
    cnpj = num(emp["cnpj"], 14)
    L = ["|".join(["01", "1", cnpj, "", "", _lat(emp["razao"], 150), ini, fim, dh(gerado_em), "002"]),
         "|".join(["02", "1", "3", num(inpi, 17)])]
    cont = {k: 0 for k in range(1, 9)}
    cont[1], cont[2] = 1, 1

    por_cpf = {}
    for b in batidas:
        cpf = perfis.get(b["colaborador_id"], {}).get("cpf")
        if not cpf:
            raise SystemExit("batida NSR %s sem CPF do colaborador — AEJ nao gerado." % b["nsr"])
        por_cpf.setdefault(cpf, []).append(b)
    vinc = {}
    for i, cpf in enumerate(sorted(por_cpf), 1):
        vinc[cpf] = i
        nome = next((perfis[x]["nome"] for x in perfis if perfis[x]["cpf"] == cpf), "")
        L.append("|".join(["03", str(i), num(cpf, 11), _lat(nome, 150)]))
        cont[3] += 1

    for cpf, lst in sorted(por_cpf.items(), key=lambda kv: vinc[kv[0]]):
        lst.sort(key=lambda x: int(x["nsr"]))
        ultimo_tipo, ultimo_ts, seq = None, None, 0
        for b in lst:
            ts = parse_ts(b["data_hora"])
            nova = ultimo_tipo is None or ultimo_tipo == "saida" or (ts - ultimo_ts) > dt.timedelta(hours=14)
            if nova:
                seq, aberto = 0, False
            t = b["tipo"]
            if t in ("entrada", "volta_refeicao"):
                tp = "E"
            elif t in ("ida_refeicao", "saida"):
                tp = "S"
            else:  # batida extra: alterna com a anterior
                tp = "S" if aberto else "E"
            if tp == "E":
                seq += 1
                aberto = True
            else:
                aberto = False
            L.append("|".join(["05", str(vinc[cpf]), dh(b["data_hora"]), "1", tp, str(max(seq, 1)).rjust(3, "0"), "O", "", ""]))
            cont[5] += 1
            ultimo_tipo, ultimo_ts = t, ts

    if not dev.get("email"):
        avisos.append("registro 08 sem e-mail do desenvolvedor (defina DEV_EMAIL)")
    L.append("|".join(["08", _lat(dev["nome"], 150), _lat(dev["versao"], 8), "1", num(dev["cnpj"], 14),
                       _lat(dev["razao"], 150), _lat(dev.get("email"), 50)]))
    cont[8] = 1
    L.append("|".join(["99"] + [str(cont[k]) for k in range(1, 9)]))
    L.append(alfa("ASSINATURA_DIGITAL_EM_ARQUIVO_P7S", 100))
    return "\r\n".join(L) + "\r\n", cont, avisos


# ---------------------------------------------------------------- Supabase (REST)
class Supa:
    def __init__(self, url, key):
        self.url, self.key = url.rstrip("/"), key

    def _req(self, method, path, body=None, headers=None):
        h = {"apikey": self.key, "Authorization": "Bearer " + self.key}
        h.update(headers or {})
        r = urllib.request.Request(self.url + path, data=body, method=method, headers=h)
        try:
            with urllib.request.urlopen(r, timeout=120) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            raise SystemExit("Supabase %s %s -> HTTP %s" % (method, path.split("?")[0], e.code))

    def select(self, tabela, query):
        saida, passo, ini = [], 1000, 0
        while True:
            p = "/rest/v1/%s?%s" % (tabela, query)
            dados = json.loads(self._req("GET", p, headers={"Range-Unit": "items", "Range": "%d-%d" % (ini, ini + passo - 1)}))
            saida += dados
            if len(dados) < passo:
                return saida
            ini += passo

    def insert(self, tabela, linhas):
        self._req("POST", "/rest/v1/" + tabela, json.dumps(linhas).encode(),
                  {"Content-Type": "application/json", "Prefer": "return=minimal"})

    def upload(self, caminho, conteudo, mime):
        self._req("POST", "/storage/v1/object/ponto-fiscal/" + urllib.parse.quote(caminho), conteudo,
                  {"Content-Type": mime, "x-upsert": "true"})


def carregar_perfis(sb, ids):
    perfis = {}
    ids = sorted(set(ids))
    for i in range(0, len(ids), 50):
        lote = ",".join(ids[i:i + 50])
        for p in sb.select("perfis", "select=id,nome,dados_admissao&id=in.(%s)" % lote):
            da = p.get("dados_admissao") or {}
            if isinstance(da, str):
                try:
                    da = json.loads(da)
                except Exception:
                    da = {}
            perfis[p["id"]] = {"nome": p.get("nome"), "cpf": "".join(c for c in str(da.get("cpf") or "") if c.isdigit())}
    return perfis


def sincronizar(sb, emp, perfis_ids):
    """Cria (uma vez) o registro tipo 2 do empregador e o tipo 5 'I' de cada colaborador que
    ainda nao tem. So INSERE em ponto_eventos (tabela nova, imutavel). Rode ANTES da producao."""
    if not emp.get("cpf_resp"):
        raise SystemExit("--sincronizar exige o CPF do responsavel (CPF_RESPONSAVEL).")
    existentes = sb.select("ponto_eventos", "select=tipo_afd,dados&tipo_afd=in.(2,5)")
    tem2 = any(e["tipo_afd"] == 2 for e in existentes)
    cpfs5 = {(e["dados"] or {}).get("cpf") for e in existentes if e["tipo_afd"] == 5}
    novos = []
    if not tem2:
        novos.append({"tipo_afd": 2, "dados": {"cpf_resp": emp["cpf_resp"], "cnpj": emp["cnpj"],
                                               "razao": emp["razao"], "local": emp.get("local", "")}})
    perfis = carregar_perfis(sb, perfis_ids)
    for pid, p in perfis.items():
        if p["cpf"] and p["cpf"] not in cpfs5:
            novos.append({"tipo_afd": 5, "dados": {"operacao": "I", "cpf": p["cpf"], "nome": p["nome"],
                                                   "cpf_resp": emp["cpf_resp"]}})
            cpfs5.add(p["cpf"])
    for n in novos:  # um a um: o NSR sai na ordem
        sb.insert("ponto_eventos", [n])
    print("sincronizar: %d evento(s) criado(s)." % len(novos))


def assinar_p7s(caminho_txt, pfx_b64, senha):
    with tempfile.TemporaryDirectory() as td:
        pfx, sen, key, crt, ca = [os.path.join(td, n) for n in ("c.pfx", "s", "k.pem", "c.pem", "ca.pem")]
        open(pfx, "wb").write(base64.b64decode(pfx_b64))
        open(sen, "w").write(senha)
        run = lambda a: subprocess.run(a, check=True, capture_output=True)
        run(["openssl", "pkcs12", "-in", pfx, "-legacy", "-passin", "file:" + sen, "-nocerts", "-nodes", "-out", key])
        run(["openssl", "pkcs12", "-in", pfx, "-legacy", "-passin", "file:" + sen, "-clcerts", "-nokeys", "-out", crt])
        cmd = ["openssl", "cms", "-sign", "-binary", "-in", caminho_txt, "-signer", crt, "-inkey", key,
               "-md", "sha256", "-outform", "DER", "-out", caminho_txt + ".p7s"]
        if subprocess.run(["openssl", "pkcs12", "-in", pfx, "-legacy", "-passin", "file:" + sen, "-cacerts", "-nokeys",
                           "-out", ca], capture_output=True).returncode == 0 and os.path.getsize(ca) > 0:
            cmd += ["-certfile", ca]
        run(cmd)  # sem -nodetach = assinatura destacada (.p7s separado)
    return caminho_txt + ".p7s"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ini", required=True, help="AAAA-MM-DD")
    ap.add_argument("--fim", required=True, help="AAAA-MM-DD")
    ap.add_argument("--inpi", default="")
    ap.add_argument("--empresa", default="", help="filtra ponto_batidas.empresa (vazio = todas)")
    ap.add_argument("--sincronizar", action="store_true")
    ap.add_argument("--sem-assinar", action="store_true")
    ap.add_argument("--sem-upload", action="store_true")
    a = ap.parse_args()

    emp = {"cnpj": os.environ["EMP_CNPJ"], "razao": os.environ.get("EMP_RAZAO", ""),
           "local": os.environ.get("EMP_LOCAL", ""), "cpf_resp": os.environ.get("CPF_RESPONSAVEL", "")}
    sb = Supa(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    ini_ts, fim_ts = a.ini + "T00:00:00-03:00", a.fim + "T23:59:59-03:00"
    q = "select=*&data_hora=gte.%s&data_hora=lte.%s&order=nsr.asc" % (urllib.parse.quote(ini_ts), urllib.parse.quote(fim_ts))
    if a.empresa:
        q += "&empresa=eq." + urllib.parse.quote(a.empresa)
    batidas = sb.select("ponto_batidas", q)
    print("batidas no periodo:", len(batidas), "| empresas:", sorted({b.get("empresa") or "" for b in batidas}))

    if a.sincronizar:
        sincronizar(sb, emp, [b["colaborador_id"] for b in batidas])

    eventos = sb.select("ponto_eventos", "select=*&order=nsr.asc")
    perfis = carregar_perfis(sb, [b["colaborador_id"] for b in batidas])
    gerado = dt.datetime.now(FUSO)
    texto, cont, _ = montar_afd(emp, eventos, batidas, perfis, a.ini, a.fim, gerado, a.inpi)
    print("registros por tipo:", cont)
    if not a.inpi:
        print("AVISO: sem numero de registro no INPI — arquivo e um RASCUNHO, nao serve para fiscalizacao.")

    nome = "AFD%s%sREP_P%s.txt" % (num(a.inpi, 17), num(emp["cnpj"], 14), "" if a.inpi else "_RASCUNHO")
    pasta = os.path.join(tempfile.gettempdir(), "afd_out")
    os.makedirs(pasta, exist_ok=True)
    caminho = os.path.join(pasta, nome)
    open(caminho, "wb").write(texto.encode("latin-1"))
    dev = {"nome": "Soul Gestao - Ponto", "versao": os.environ.get("PTRP_VERSAO", "1.0"), "cnpj": emp["cnpj"],
           "razao": emp["razao"], "email": os.environ.get("DEV_EMAIL", "")}
    aej, cont_aej, avisos = montar_aej(emp, batidas, perfis, a.ini, a.fim, gerado, a.inpi, dev)
    print("AEJ registros:", cont_aej)
    for av in avisos:
        print("AVISO AEJ:", av)
    caminho_aej = os.path.join(pasta, "AEJ%s%s%s.txt" % (num(emp["cnpj"], 14), a.ini.replace("-", ""), "" if a.inpi else "_RASCUNHO"))
    open(caminho_aej, "wb").write(aej.encode("latin-1"))
    arquivos = [caminho, caminho_aej]
    if not a.sem_assinar:
        for f in list(arquivos):
            arquivos.append(assinar_p7s(f, os.environ["SEFAZ_CERT_PFX_BASE64"], os.environ["SEFAZ_CERT_SENHA"]))
        print("assinados (.p7s).")
    if not a.sem_upload:
        for f in arquivos:
            sb.upload("%s/%s/%s" % ("aej" if os.path.basename(f).startswith("AEJ") else "afd", a.ini[:7], os.path.basename(f)), open(f, "rb").read(), "application/octet-stream")
        print("enviados para o bucket privado ponto-fiscal (afd/ e aej/ em %s)." % a.ini[:7])


if __name__ == "__main__":
    main()
