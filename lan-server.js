"use strict";

// =====================================================================
// SERVIDOR DE TORNEO LAN
// -----------------------------------------------------------------
// Lo corre UNA sola persona (el anfitrión / admin del torneo) en su
// compu, conectada a la misma red Wi-Fi/LAN que el resto de los
// jugadores. No necesita internet ni cuenta de Firebase.
//
// Hace dos cosas:
//   1) Sirve los archivos de la app (index.html, app.js, etc.) por
//      HTTP, para que cualquiera en la red los abra desde su
//      celular/compu con el navegador, apuntando a la IP del
//      anfitrión.
//   2) Expone un WebSocket que actúa como una base de datos
//      compartida en tiempo real, imitando el subconjunto de la API
//      de Firestore que usa app.js (doc/collection, get/set/update/
//      delete/add, onSnapshot, where(campo,"==",valor), batch,
//      runTransaction). Así, del lado del navegador, el modo LAN usa
//      exactamente el mismo código de torneo que el modo Online: lo
//      único que cambia es a dónde se conectan los datos.
//
// Cómo correrlo:
//   1) Instalá Node.js (https://nodejs.org) si no lo tenés.
//   2) Abrí una terminal en esta carpeta y ejecutá:
//        npm install ws
//        node lan-server.js
//   3) La terminal te va a mostrar una dirección tipo
//      "http://192.168.0.15:8080" — esa es la que tenés que compartir
//      con los demás jugadores (todos conectados a la misma red).
//   4) Vos, como anfitrión, abrí esa misma dirección en tu navegador
//      y elegí "Soy el anfitrión" dentro de Torneo → modo LAN.
// =====================================================================

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

let WebSocketServer;
try {
  WebSocketServer = require("ws").WebSocketServer;
} catch (err) {
  console.error(
    "\nFalta el paquete 'ws'. Instalalo primero con:\n\n    npm install ws\n"
  );
  process.exit(1);
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const ROOT_DIR = __dirname;

// ---------------------------------------------------------------------
// 1) SERVIDOR HTTP ESTÁTICO
// ---------------------------------------------------------------------

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const httpServer = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  // Evita salir de la carpeta del proyecto (path traversal).
  const safePath = path.normalize(path.join(ROOT_DIR, urlPath));
  if (!safePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(safePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("No encontrado: " + urlPath);
      return;
    }
    const ext = path.extname(safePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

// ---------------------------------------------------------------------
// 2) MINI "FIRESTORE" EN MEMORIA
// ---------------------------------------------------------------------
// store: Map de "torneos/main/games/1_1" -> objeto plano con los campos
//        del documento.
// index: Map de "torneos/main/games" -> Set de ids de documentos que
//        viven en esa colección (para poder resolver queries/onSnapshot
//        de colección sin recorrer todo el store).
// ---------------------------------------------------------------------

const store = new Map();
const index = new Map();

function keyOf(pathArr) {
  return pathArr.join("/");
}

function collectionKeyOf(pathArr) {
  return pathArr.slice(0, -1).join("/");
}

function addToIndex(pathArr) {
  const ck = collectionKeyOf(pathArr);
  if (!index.has(ck)) index.set(ck, new Set());
  index.get(ck).add(pathArr[pathArr.length - 1]);
}

function removeFromIndex(pathArr) {
  const ck = collectionKeyOf(pathArr);
  const set = index.get(ck);
  if (set) set.delete(pathArr[pathArr.length - 1]);
}

function isPlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

// Reemplaza recursivamente los "marcadores" {__serverTimestamp:true}
// (equivalentes a firebase.firestore.FieldValue.serverTimestamp()) por
// un valor de tiempo resuelto en el servidor, para que todos los
// clientes vean el mismo instante sin depender del reloj de cada uno.
function resolveServerTimestamps(value, nowMs) {
  if (Array.isArray(value)) return value.map((v) => resolveServerTimestamps(v, nowMs));
  if (isPlainObject(value)) {
    if (value.__serverTimestamp) return { __ts: true, ms: nowMs };
    const out = {};
    for (const k of Object.keys(value)) out[k] = resolveServerTimestamps(value[k], nowMs);
    return out;
  }
  return value;
}

// merge superficial (alcanza y sobra: la app nunca usa paths con
// puntos tipo "meta.round", siempre reemplaza el campo completo).
function shallowMerge(base, patch) {
  return Object.assign({}, base || {}, patch);
}

function getDocRaw(pathArr) {
  return store.get(keyOf(pathArr));
}

function docExists(pathArr) {
  return store.has(keyOf(pathArr));
}

function writeDoc(pathArr, data, merge, nowMs) {
  const k = keyOf(pathArr);
  const resolved = resolveServerTimestamps(data, nowMs);
  if (merge && store.has(k)) {
    store.set(k, shallowMerge(store.get(k), resolved));
  } else {
    store.set(k, resolved);
  }
  addToIndex(pathArr);
}

function updateDoc(pathArr, data, nowMs) {
  const k = keyOf(pathArr);
  if (!store.has(k)) {
    const e = new Error("No existe el documento: " + k);
    e.code = "not-found";
    throw e;
  }
  const resolved = resolveServerTimestamps(data, nowMs);
  store.set(k, shallowMerge(store.get(k), resolved));
}

function deleteDoc(pathArr) {
  store.delete(keyOf(pathArr));
  removeFromIndex(pathArr);
}

function listCollection(collPathArr, where) {
  const ck = keyOf(collPathArr);
  const ids = index.get(ck) || new Set();
  const out = [];
  for (const id of ids) {
    const full = [...collPathArr, id];
    const data = store.get(keyOf(full));
    if (!data) continue;
    if (where && data[where.field] !== where.value) continue;
    out.push({ id, data });
  }
  return out;
}

function newDocId() {
  return "auto_" + crypto.randomBytes(9).toString("hex");
}

// ---------------------------------------------------------------------
// 3) SUSCRIPCIONES EN VIVO (equivalente a onSnapshot)
// ---------------------------------------------------------------------
// Cada conexión de WebSocket puede tener varias suscripciones activas
// (una por cada .onSnapshot() que arme el cliente). Guardamos, por
// cada suscripción, si es de documento o de colección, y qué último
// estado se mandó, para poder calcular docChanges() en las queries.
// ---------------------------------------------------------------------

const subscriptions = new Map(); // subId -> { ws, kind, path, where, lastDocs }

function broadcastDocChange(pathArr) {
  const k = keyOf(pathArr);
  for (const [subId, sub] of subscriptions) {
    if (sub.kind === "doc" && keyOf(sub.path) === k) {
      sendDocSnapshot(sub.ws, subId, sub.path);
    }
  }
  const ck = collectionKeyOf(pathArr);
  for (const [subId, sub] of subscriptions) {
    if (sub.kind === "query" && keyOf(sub.path) === ck) {
      sendQuerySnapshot(subId, sub);
    }
  }
}

function sendDocSnapshot(ws, subId, pathArr) {
  if (ws.readyState !== ws.OPEN) return;
  const data = getDocRaw(pathArr);
  ws.send(
    JSON.stringify({
      ev: "snapshot",
      subId,
      exists: !!data,
      data: data || null,
    })
  );
}

function sendQuerySnapshot(subId, sub) {
  if (sub.ws.readyState !== sub.ws.OPEN) return;
  const rows = listCollection(sub.path, sub.where);
  const prevIds = sub.lastDocs || new Map();
  const nextIds = new Map();
  const changes = [];
  for (const row of rows) {
    nextIds.set(row.id, row.data);
    if (!prevIds.has(row.id)) changes.push({ type: "added", id: row.id, data: row.data });
    else if (JSON.stringify(prevIds.get(row.id)) !== JSON.stringify(row.data))
      changes.push({ type: "modified", id: row.id, data: row.data });
  }
  for (const [id] of prevIds) {
    if (!nextIds.has(id)) changes.push({ type: "removed", id, data: null });
  }
  sub.lastDocs = nextIds;
  sub.ws.send(
    JSON.stringify({
      ev: "querySnapshot",
      subId,
      docs: rows.map((r) => ({ id: r.id, data: r.data })),
      changes,
    })
  );
}

// ---------------------------------------------------------------------
// 4) TRANSACCIONES (equivalente a runTransaction)
// ---------------------------------------------------------------------
// Como el servidor es un único proceso Node (de un solo hilo), alcanza
// con una cola global: mientras una transacción está abierta, las
// demás esperan su turno. Nada de reintentos por conflicto de
// versiones (no hace falta con este volumen de uso: un torneo
// escolar, no miles de escrituras por segundo).
// ---------------------------------------------------------------------

let txQueue = Promise.resolve();
const openTx = new Map(); // txId -> { release }

function txBegin(txId) {
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  const prev = txQueue;
  txQueue = txQueue.then(() => gate);
  return prev.then(() => {
    openTx.set(txId, { release });
  });
}

function txEnd(txId) {
  const tx = openTx.get(txId);
  if (tx) {
    openTx.delete(txId);
    tx.release();
  }
}

// ---------------------------------------------------------------------
// 5) WEBSOCKET: protocolo de mensajes
// ---------------------------------------------------------------------

const wss = new WebSocketServer({ server: httpServer });
let nextClientId = 1;

wss.on("connection", (ws) => {
  const clientId = nextClientId++;
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (err) {
      return;
    }
    const reply = (ok, result, error) => {
      if (msg.id == null) return;
      ws.send(JSON.stringify({ re: msg.op, id: msg.id, ok, result, error }));
    };

    try {
      switch (msg.op) {
        case "join": {
          const isFirst = store.size === 0 || !docExists(["torneos", msg.room || "main"]);
          reply(true, { clientId, isFirst });
          break;
        }
        case "get": {
          const data = getDocRaw(msg.path);
          reply(true, { exists: !!data, data: data || null });
          break;
        }
        case "getQuery": {
          const rows = listCollection(msg.path, msg.where);
          reply(true, { docs: rows.map((r) => ({ id: r.id, data: r.data })) });
          break;
        }
        case "set": {
          writeDoc(msg.path, msg.data, !!msg.merge, Date.now());
          reply(true, {});
          broadcastDocChange(msg.path);
          break;
        }
        case "update": {
          updateDoc(msg.path, msg.data, Date.now());
          reply(true, {});
          broadcastDocChange(msg.path);
          break;
        }
        case "delete": {
          deleteDoc(msg.path);
          reply(true, {});
          broadcastDocChange(msg.path);
          break;
        }
        case "add": {
          const id = newDocId();
          writeDoc([...msg.path, id], msg.data, false, Date.now());
          reply(true, { id });
          broadcastDocChange([...msg.path, id]);
          break;
        }
        case "batch": {
          const now = Date.now();
          const touched = [];
          for (const op of msg.ops) {
            if (op.type === "set") writeDoc(op.path, op.data, !!op.merge, now);
            else if (op.type === "update") updateDoc(op.path, op.data, now);
            else if (op.type === "delete") deleteDoc(op.path);
            touched.push(op.path);
          }
          reply(true, {});
          touched.forEach(broadcastDocChange);
          break;
        }
        case "subDoc": {
          subscriptions.set(msg.subId, { ws, kind: "doc", path: msg.path });
          sendDocSnapshot(ws, msg.subId, msg.path);
          reply(true, {});
          break;
        }
        case "subQuery": {
          const sub = { ws, kind: "query", path: msg.path, where: msg.where, lastDocs: new Map() };
          subscriptions.set(msg.subId, sub);
          sendQuerySnapshot(msg.subId, sub);
          reply(true, {});
          break;
        }
        case "unsub": {
          subscriptions.delete(msg.subId);
          reply(true, {});
          break;
        }
        case "txBegin": {
          await txBegin(msg.txId);
          reply(true, {});
          break;
        }
        case "txGet": {
          const data = getDocRaw(msg.path);
          reply(true, { exists: !!data, data: data || null });
          break;
        }
        case "txCommit": {
          const now = Date.now();
          const touched = [];
          for (const w of msg.writes) {
            if (w.type === "set") writeDoc(w.path, w.data, !!w.merge, now);
            else if (w.type === "update") updateDoc(w.path, w.data, now);
            else if (w.type === "delete") deleteDoc(w.path);
            touched.push(w.path);
          }
          txEnd(msg.txId);
          reply(true, {});
          touched.forEach(broadcastDocChange);
          break;
        }
        case "txAbort": {
          txEnd(msg.txId);
          reply(true, {});
          break;
        }
        default:
          reply(false, null, "Operación desconocida: " + msg.op);
      }
    } catch (err) {
      reply(false, null, err.message || String(err));
    }
  });

  ws.on("close", () => {
    for (const [subId, sub] of subscriptions) {
      if (sub.ws === ws) subscriptions.delete(subId);
    }
  });
});

// Ping periódico para detectar y limpiar conexiones caídas (celulares
// que se van de la red, se apaga la pantalla, etc.) sin dejar
// suscripciones fantasma acumulándose.
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// ---------------------------------------------------------------------
// 6) ARRANQUE
// ---------------------------------------------------------------------

function localIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

httpServer.listen(PORT, () => {
  const ips = localIPs();
  console.log("\n♟️  Servidor de torneo LAN corriendo.\n");
  console.log(`   En esta compu:   http://localhost:${PORT}`);
  if (ips.length) {
    ips.forEach((ip) => console.log(`   Para compartir:  http://${ip}:${PORT}`));
  } else {
    console.log("   (No se detectó una IP de red local — revisá que estés conectado a Wi-Fi/LAN.)");
  }
  console.log("\n   Compartí la dirección \"Para compartir\" con los demás jugadores");
  console.log("   (deben estar conectados a la misma red). Vos, como anfitrión, podés");
  console.log("   usar cualquiera de las dos direcciones.\n");
});
