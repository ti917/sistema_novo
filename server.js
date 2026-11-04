// Servidor de encontro do Sinuca/Truco GoScripts.
// Faz só três coisas: fila para achar oponente, lista de amigos (quem está online) e
// repassar as mensagens da partida entre os dois celulares. As regras rodam no celular.
// Sem dependências: WebSocket implementado direto sobre o módulo http do Node.
"use strict";
const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 10000;
const clients = new Map(); // code -> client
const queues = { sinuca: [], truco: [], sinuca4: [], truco4: [] };
const GAMES = ["sinuca", "truco", "sinuca4", "truco4"];
const FILL_AFTER = 25000; // 2x2: depois de 25 s completa a mesa com a IA
let nextRoom = 1;
// mensagens de amizade para quem está offline (em memória; os celulares também reenviam ao conectar)
const mailbox = new Map(); // code -> [{kind, from, name}]

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
      const box = mailbox.get(code);
      if (box) {
        mailbox.delete(code);
        for (const x of box) sendJ(c, { t: "fmsg", kind: x.kind, from: x.from, name: x.name });
      }
      break;
    }
    case "queue": {
      if (!c.code || c.room) return;
      const g = GAMES.includes(m.game) ? m.game : "sinuca";
      unqueue(c);
      c.status = "procurando";
      c.qsince = Date.now();
      queues[g] = queues[g].filter((o) => !o.room && clients.get(o.code) === o);
      queues[g].push(c);
      const need = g.endsWith("4") ? 4 : 2;
      if (queues[g].length >= need) {
        const grp = queues[g].splice(0, need);
        matchN(grp, g);
      } else if (need === 4) {
        for (const o of queues[g]) sendJ(o, { t: "waiting", have: queues[g].length, need });
      }
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
    case "fsend": {
      // pedidos de amizade: req (pedido), acc (aceitou), dec (recusou), rem (desfez)
      const kind = String(m.kind || "");
      if (!["req", "acc", "dec", "rem"].includes(kind) || !c.code) return;
      const f = clients.get(String(m.to || "").toUpperCase());
      const to = String(m.to || "").toUpperCase();
      if (f && f !== c) sendJ(f, { t: "fmsg", kind, from: c.code, name: c.name });
      else if (/^[A-Z0-9]{4,8}$/.test(to) && to !== c.code) {
        const box = (mailbox.get(to) || []).filter((x) => x.from !== c.code);
        box.push({ kind, from: c.code, name: c.name });
        if (box.length > 50) box.shift();
        mailbox.set(to, box);
      }
      sendJ(c, { t: "fsent", kind, to: String(m.to || "").toUpperCase(), delivered: !!(f && f !== c) });
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
      matchN([f, c], m.game === "truco" ? "truco" : "sinuca");
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

// sala com 2 a 4 jogadores; o primeiro é o anfitrião (peer 1), os outros são 2, 3, 4
function matchN(list, game) {
  const room = { id: nextRoom++, members: list.slice(), game, seats: game.endsWith("4") ? 4 : 2 };
  const players = list.map((p, i) => ({ peer: i + 1, name: p.name, code: p.code }));
  list.forEach((p, i) => {
    p.room = room; p.peer = i + 1; p.status = "jogando";
  });
  list.forEach((p, i) => {
    const opp = list[i === 0 ? 1 : 0];
    sendJ(p, { t: "match", role: i === 0 ? "host" : "guest", peer: i + 1, game, seats: room.seats, players, opp: { name: opp.name, code: opp.code } });
  });
}

// pacote da partida: [1 byte destino][dados]; destino 0 = todos. O servidor troca o destino pela origem
function relay(c, payload) {
  const r = c.room;
  if (!r || payload.length < 1) return;
  const dest = payload[0];
  const out = Buffer.from(payload);
  out[0] = c.peer;
  for (const p of r.members) {
    if (p !== c && (dest === 0 || p.peer === dest)) sendRaw(p, 2, out);
  }
}

function leaveRoom(c) {
  const r = c.room;
  if (!r) return;
  const wasHost = c.peer === 1;
  r.members = r.members.filter((p) => p !== c);
  const left = c.peer;
  c.room = null; c.peer = 0; c.status = "online";
  if (wasHost || r.members.length < 2 && r.seats === 2 || r.members.length < 1) {
    // sem anfitrião (ou 1x1 sem adversário): a partida acaba para todos
    for (const p of r.members) {
      p.room = null; p.peer = 0; p.status = "online";
      if (!p.socket.destroyed) sendJ(p, { t: "peer_left", peer: left, end: true });
    }
    r.members = [];
    return;
  }
  // 2x2: os outros continuam (o anfitrião coloca a IA no lugar)
  for (const p of r.members) if (!p.socket.destroyed) sendJ(p, { t: "peer_left", peer: left, end: false });
}

// 2x2 com pouca gente: depois de um tempo, completa a mesa com a IA
setInterval(() => {
  const now = Date.now();
  for (const g of ["sinuca4", "truco4"]) {
    queues[g] = queues[g].filter((o) => !o.room && clients.get(o.code) === o);
    const q = queues[g];
    if (q.length >= 2 && now - q[0].qsince >= FILL_AFTER) {
      matchN(q.splice(0, 4), g);
    }
  }
}, 2000);

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
