// Servidor de encontro do Sinuca/Truco GoScripts.
// Faz só três coisas: fila para achar oponente, lista de amigos (quem está online) e
// repassar as mensagens da partida entre os dois celulares. As regras rodam no celular.
// Sem dependências: WebSocket implementado direto sobre o módulo http do Node.
"use strict";
const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 10000;
const clients = new Map(); // code -> client
const queues = { sinuca: [], truco: [] };
let nextRoom = 1;

// ------------------------------------------------------------ WebSocket mínimo
function accept(req, socket) {
  const key = req.headers["sec-websocket-key"];
  if (!key) return socket.destroy();
  const acc = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
  socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + acc + "\r\n\r\n");
  socket.setNoDelay(true);
  const c = { socket, buf: Buffer.alloc(0), code: null, name: "", status: "online", room: null, peer: 0, alive: true, frag: null, fragOp: 0 };
  socket.on("data", (d) => onData(c, d));
  socket.on("close", () => drop(c));
  socket.on("error", () => drop(c));
}

function frame(op, payload) {
  const len = payload.length;
  let head;
  if (len < 126) { head = Buffer.alloc(2); head[1] = len; }
  else if (len < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  head[0] = 0x80 | op;
  return Buffer.concat([head, payload]);
}

function sendRaw(c, op, payload) {
  if (!c.socket.destroyed) c.socket.write(frame(op, payload));
}
function sendJ(c, obj) { sendRaw(c, 1, Buffer.from(JSON.stringify(obj))); }

function onData(c, d) {
  c.buf = Buffer.concat([c.buf, d]);
  while (c.buf.length >= 2) {
    const b0 = c.buf[0], b1 = c.buf[1];
    const fin = (b0 & 0x80) !== 0, op = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f, off = 2;
    if (len === 126) { if (c.buf.length < 4) return; len = c.buf.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (c.buf.length < 10) return; len = Number(c.buf.readBigUInt64BE(2)); off = 10; }
    if (len > 1 << 20) return c.socket.destroy();
    const need = off + (masked ? 4 : 0) + len;
    if (c.buf.length < need) return;
    let payload = c.buf.subarray(off + (masked ? 4 : 0), need);
    if (masked) {
      const m = c.buf.subarray(off, off + 4);
      payload = Buffer.from(payload);
      for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3];
    }
    c.buf = c.buf.subarray(need);
    c.alive = true;
    if (op === 8) { sendRaw(c, 8, Buffer.alloc(0)); c.socket.end(); return; }
    if (op === 9) { sendRaw(c, 10, payload); continue; }
    if (op === 10) continue;
    if (op === 0) { // continuação
      if (!c.frag) continue;
      c.frag = Buffer.concat([c.frag, payload]);
      if (fin) { const f = c.frag, fo = c.fragOp; c.frag = null; onMsg(c, fo, f); }
      continue;
    }
    if (!fin) { c.frag = Buffer.from(payload); c.fragOp = op; continue; }
    onMsg(c, op, payload);
  }
}

// ------------------------------------------------------------ lógica
function onMsg(c, op, payload) {
  if (op === 2) return relay(c, payload);
  let m;
  try { m = JSON.parse(payload.toString("utf8")); } catch (e) { return; }
  switch (m.t) {
    case "hello": {
      const code = String(m.code || "").toUpperCase().slice(0, 8);
      if (!/^[A-Z0-9]{4,8}$/.test(code)) return sendJ(c, { t: "error", msg: "código inválido" });
      const old = clients.get(code);
      if (old && old !== c) drop(old);
      c.code = code;
      c.name = String(m.name || "Jogador").slice(0, 16);
      clients.set(code, c);
      sendJ(c, { t: "welcome", code, online: clients.size });
      break;
    }
    case "queue": {
      if (!c.code || c.room) return;
      const g = m.game === "truco" ? "truco" : "sinuca";
      unqueue(c);
      c.status = "procurando";
      const q = queues[g];
      const other = q.find((o) => o !== c && !o.room && clients.get(o.code) === o);
      if (other) {
        queues[g] = q.filter((o) => o !== other);
        match(other, c, g);
      } else q.push(c);
      break;
    }
    case "unqueue": unqueue(c); c.status = "online"; break;
    case "friends": {
      const list = (m.codes || []).slice(0, 100).map((code) => {
        const f = clients.get(String(code).toUpperCase());
        return f ? { code: f.code, name: f.name, online: true, status: f.room ? "jogando" : f.status } : { code: String(code).toUpperCase(), online: false };
      });
      sendJ(c, { t: "presence", list });
      break;
    }
    case "search": {
      const q = norm(String(m.q || "")).slice(0, 16);
      if (q.length < 2) return sendJ(c, { t: "search", q: m.q, list: [] });
      const list = [];
      for (const f of clients.values()) {
        if (f === c) continue;
        if (norm(f.name).includes(q)) list.push({ code: f.code, name: f.name, online: true, status: f.room ? "jogando" : f.status });
        if (list.length >= 20) break;
      }
      sendJ(c, { t: "search", q: m.q, list });
      break;
    }
    case "invite": {
      const f = clients.get(String(m.code || "").toUpperCase());
      if (!f || f === c) return sendJ(c, { t: "invite_fail", msg: "Amigo offline" });
      if (f.room) return sendJ(c, { t: "invite_fail", msg: "Amigo está jogando" });
      sendJ(f, { t: "invited", from: c.code, name: c.name, game: m.game === "truco" ? "truco" : "sinuca" });
      break;
    }
    case "accept": {
      const f = clients.get(String(m.from || "").toUpperCase());
      if (!f || f.room || c.room) return sendJ(c, { t: "invite_fail", msg: "Convite expirou" });
      unqueue(f); unqueue(c);
      match(f, c, m.game === "truco" ? "truco" : "sinuca");
      break;
    }
    case "decline": {
      const f = clients.get(String(m.from || "").toUpperCase());
      if (f) sendJ(f, { t: "invite_fail", msg: c.name + " recusou o convite" });
      break;
    }
    case "leave": leaveRoom(c); break;
    case "ping": sendJ(c, { t: "pong" }); break;
  }
}

function norm(t) {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function match(host, guest, game) {
  const room = { id: nextRoom++, host, guest, game };
  host.room = room; host.peer = 1; host.status = "jogando";
  guest.room = room; guest.peer = 2; guest.status = "jogando";
  sendJ(host, { t: "match", role: "host", peer: 1, game, opp: { name: guest.name, code: guest.code } });
  sendJ(guest, { t: "match", role: "guest", peer: 2, game, opp: { name: host.name, code: host.code } });
}

// pacote da partida: [1 byte destino/origem][dados...]; o servidor troca o destino pela origem
function relay(c, payload) {
  const r = c.room;
  if (!r || payload.length < 1) return;
  const other = r.host === c ? r.guest : r.host;
  const out = Buffer.from(payload);
  out[0] = c.peer;
  sendRaw(other, 2, out);
}

function leaveRoom(c) {
  const r = c.room;
  if (!r) return;
  const other = r.host === c ? r.guest : r.host;
  for (const p of [r.host, r.guest]) { p.room = null; p.peer = 0; p.status = "online"; }
  if (other && !other.socket.destroyed) sendJ(other, { t: "peer_left" });
}

function unqueue(c) {
  for (const g of Object.keys(queues)) queues[g] = queues[g].filter((o) => o !== c);
}

function drop(c) {
  if (c.dropped) return;
  c.dropped = true;
  unqueue(c);
  leaveRoom(c);
  if (c.code && clients.get(c.code) === c) clients.delete(c.code);
  try { c.socket.destroy(); } catch (e) {}
}

// derruba conexões mortas
setInterval(() => {
  for (const c of clients.values()) {
    if (!c.alive) { drop(c); continue; }
    c.alive = false;
    sendRaw(c, 9, Buffer.alloc(0));
  }
}, 30000);

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Servidor Sinuca/Truco GoScripts no ar. Jogadores online: " + clients.size + "\n");
});
server.on("upgrade", (req, socket) => accept(req, socket));
server.listen(PORT, () => console.log("ouvindo na porta " + PORT));
