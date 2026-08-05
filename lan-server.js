/**
 * Servidor LAN para torneo de ajedrez escolar.
 * Reemplaza Firebase Firestore en entornos sin internet.
 *
 * Uso:
 *   npm install ws
 *   node lan-server.js [puerto]
 *
 * El servidor usa WebSocket para sincronizar estado en memoria entre
 * navegadores conectados a la misma red local.
 */

const http = require("http");
const path = require("path");
const fs = require("fs");

let WebSocketServer;
try {
  WebSocketServer = require("ws").Server;
} catch (e) {
  console.error("Falta el paquete 'ws'. Ejecutá: npm install ws");
  process.exit(1);
}

const PORT = parseInt(process.argv[2], 10) || 8080;

/* ========================================================================
   Persistencia opcional en disco (JSON)
   ======================================================================== */
const DATA_DIR = path.join(__dirname, ".lan-data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function roomFile(room) {
  return path.join(DATA_DIR, `${room.replace(/[^a-z0-9_-]/gi, "_")}.json`);
}

function loadRoom(room) {
  const f = roomFile(room);
  if (fs.existsSync(f)) {
    try {
      return JSON.parse(fs.readFileSync(f, "utf8"));
    } catch (e) {
      console.error("Error cargando sala", room, e.message);
    }
  }
  return { collections: {} };
}

function saveRoom(room, state) {
  try {
    fs.writeFileSync(roomFile(room), JSON.stringify(state, null, 2));
  } catch (e) {
    console.error("Error guardando sala", room, e.message);
  }
}

/* ========================================================================
   Estado en memoria
   ======================================================================== */
const rooms = new Map(); // roomName → { collections, conns, txLocks }

function getRoom(name) {
  if (!rooms.has(name)) {
    const data = loadRoom(name);
    rooms.set(name, {
      collections: data.collections || {},
      conns: new Set(),
      txLocks: new Map(), // path → txId
      nextTxId: 1,
      nextDocId: 1,
      docVersions: new Map(), // path → version number
    });
  }
  return rooms.get(name);
}

function docPath(room, colPath, docId) {
  return `${colPath}/${docId}`;
}

function getDoc(roomState, colPath, docId) {
  const col = roomState.collections[colPath] || {};
  return col[docId] !== undefined ? col[docId] : undefined;
}

function setDoc(roomState, colPath, docId, data, merge = false) {
  if (!roomState.collections[colPath]) roomState.collections[colPath] = {};
  const existing = roomState.collections[colPath][docId];
  const newData = merge && existing ? { ...existing, ...data } : data;
  roomState.collections[colPath][docId] = newData;
  const dpath = docPath(roomState, colPath, docId);
  roomState.docVersions.set(dpath, (roomState.docVersions.get(dpath) || 0) + 1);
  return newData;
}

function deleteDoc(roomState, colPath, docId) {
  if (roomState.collections[colPath]) {
    delete roomState.collections[colPath][docId];
  }
  const dpath = docPath(roomState, colPath, docId);
  roomState.docVersions.set(dpath, (roomState.docVersions.get(dpath) || 0) + 1);
}

function notifyDoc(roomState, colPath, docId, data, exists) {
  const msg = JSON.stringify({
    type: "docChange",
    path: docPath(roomState, colPath, docId),
    colPath,
    docId,
    data,
    exists,
  });
  roomState.conns.forEach((c) => {
    if (c.readyState === 1) c.send(msg);
  });
}

function notifyQuery(roomState, colPath) {
  // Notificamos a todos los clientes que tienen query activa en esta colección.
  // El cliente re-evaluará localmente; esto es suficiente para esta app.
  const msg = JSON.stringify({
    type: "queryChange",
    colPath,
  });
  roomState.conns.forEach((c) => {
    if (c.readyState === 1) c.send(msg);
  });
}

function broadcastDocsInCol(roomState, colPath) {
  notifyQuery(roomState, colPath);
}

/* ========================================================================
   Queries con where, orderBy, limit y limitToLast
   ======================================================================== */
function getField(data, field) {
  if (!data || typeof data !== "object") return undefined;
  if (field in data) return data[field];
  return undefined;
}

function compareValues(a, b, dir) {
  if (a == null && b == null) return 0;
  if (a == null) return dir === "asc" ? -1 : 1;
  if (b == null) return dir === "asc" ? 1 : -1;
  if (typeof a === "string" && typeof b === "string") return dir === "asc" ? a.localeCompare(b) : b.localeCompare(a);
  if (typeof a === "number" && typeof b === "number") return dir === "asc" ? a - b : b - a;
  const sa = String(a);
  const sb = String(b);
  return dir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
}

function runQuery(roomState, colPath, conditions, orderBys, limitN, limitToLast) {
  const col = roomState.collections[colPath] || {};
  const docs = [];
  for (const [docId, data] of Object.entries(col)) {
    let ok = true;
    for (const cond of conditions || []) {
      const val = getField(data, cond.field);
      if (cond.op === "==" && val !== cond.value) ok = false;
      if (cond.op === ">=" && !(val >= cond.value)) ok = false;
      if (cond.op === "<=" && !(val <= cond.value)) ok = false;
      if (cond.op === ">" && !(val > cond.value)) ok = false;
      if (cond.op === "<" && !(val < cond.value)) ok = false;
    }
    if (ok) docs.push({ id: docId, data });
  }
  // Ordenar
  for (const ob of (orderBys || []).slice().reverse()) {
    docs.sort((a, b) => compareValues(getField(a.data, ob.field), getField(b.data, ob.field), ob.dir || "asc"));
  }
  // Aplicar limit / limitToLast
  let finalDocs = docs;
  if (limitToLast != null && limitToLast > 0) {
    finalDocs = docs.slice(-limitToLast);
  } else if (limitN != null && limitN > 0) {
    finalDocs = docs.slice(0, limitN);
  }
  return finalDocs;
}

/* ========================================================================
   HTTP para health-check y archivos estáticos (opcional)
   ======================================================================== */
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: Array.from(rooms.keys()) }));
    return;
  }
  res.writeHead(200);
  res.end("Servidor LAN de torneo activo. Conectá tu app por WebSocket.\n");
});

/* ========================================================================
   WebSocket
   ======================================================================== */
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomName = url.searchParams.get("room") || "main";
  const displayName = url.searchParams.get("name") || "Jugador";

  const room = getRoom(roomName);
  room.conns.add(ws);
  ws._room = room;
  ws._roomName = roomName;
  ws._subscriptions = new Set(); // paths
  ws._querySubs = new Map(); // subId → { colPath, conditions }
  ws._tx = null; // transacción activa

  console.log(`[${roomName}] Conectado: ${displayName} (${room.conns.size} en sala)`);

  ws.send(JSON.stringify({ type: "connected", room: roomName }));

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      ws.send(JSON.stringify({ id: msg && msg.id, ok: false, error: "JSON inválido" }));
      return;
    }

    const { id, op } = msg;
    try {
      switch (op) {
        case "ping": {
          ws.send(JSON.stringify({ id, ok: true, type: "pong", ts: Date.now() }));
          break;
        }

        case "serverTimestamp": {
          ws.send(JSON.stringify({ id, ok: true, ts: Date.now() }));
          break;
        }

        case "get": {
          const { colPath, docId } = msg;
          const data = getDoc(room, colPath, docId);
          const dpath = docPath(room, colPath, docId);
          ws.send(JSON.stringify({
            id,
            ok: true,
            exists: data !== undefined,
            data: data !== undefined ? data : null,
            docId,
            colPath,
            version: room.docVersions.get(dpath) || 0,
          }));
          break;
        }

        case "set": {
          const { colPath, docId, data, merge } = msg;
          setDoc(room, colPath, docId, data, merge);
          saveRoom(roomName, { collections: room.collections });
          notifyDoc(room, colPath, docId, data, true);
          broadcastDocsInCol(room, colPath);
          ws.send(JSON.stringify({ id, ok: true }));
          break;
        }

        case "update": {
          const { colPath, docId, data } = msg;
          const existing = getDoc(room, colPath, docId);
          if (existing === undefined) {
            ws.send(JSON.stringify({ id, ok: false, error: "Documento no existe" }));
            break;
          }
          setDoc(room, colPath, docId, { ...existing, ...data }, false);
          saveRoom(roomName, { collections: room.collections });
          const updated = getDoc(room, colPath, docId);
          notifyDoc(room, colPath, docId, updated, true);
          broadcastDocsInCol(room, colPath);
          ws.send(JSON.stringify({ id, ok: true }));
          break;
        }

        case "delete": {
          const { colPath, docId } = msg;
          deleteDoc(room, colPath, docId);
          saveRoom(roomName, { collections: room.collections });
          notifyDoc(room, colPath, docId, null, false);
          broadcastDocsInCol(room, colPath);
          ws.send(JSON.stringify({ id, ok: true }));
          break;
        }

        case "add": {
          const { colPath, data } = msg;
          const docId = msg.docId || `doc_${Date.now()}_${room.nextDocId++}`;
          setDoc(room, colPath, docId, data);
          saveRoom(roomName, { collections: room.collections });
          notifyDoc(room, colPath, docId, data, true);
          broadcastDocsInCol(room, colPath);
          ws.send(JSON.stringify({ id, ok: true, docId }));
          break;
        }

        case "query": {
          const { colPath, conditions, orderBys, limit: limitN, limitToLast } = msg;
          const docs = runQuery(room, colPath, conditions || [], orderBys || [], limitN, limitToLast);
          ws.send(JSON.stringify({
            id,
            ok: true,
            docs: docs.map((d) => ({ id: d.id, data: d.data })),
          }));
          break;
        }

        case "subscribeDoc": {
          const { colPath, docId, subId } = msg;
          const key = `${colPath}/${docId}`;
          ws._subscriptions.add(key);
          const data = getDoc(room, colPath, docId);
          const dpath = docPath(room, colPath, docId);
          ws.send(JSON.stringify({
            id,
            ok: true,
            subId,
            exists: data !== undefined,
            data: data !== undefined ? data : null,
            docId,
            colPath,
            version: room.docVersions.get(dpath) || 0,
          }));
          break;
        }

        case "subscribeQuery": {
          const { colPath, conditions, orderBys, limit: limitN, limitToLast, subId } = msg;
          ws._querySubs.set(subId, { colPath, conditions: conditions || [], orderBys: orderBys || [], limit: limitN, limitToLast });
          const docs = runQuery(room, colPath, conditions || [], orderBys || [], limitN, limitToLast);
          ws.send(JSON.stringify({
            id,
            ok: true,
            subId,
            docs: docs.map((d) => ({ id: d.id, data: d.data })),
          }));
          break;
        }

        case "unsubscribe": {
          const { subId } = msg;
          if (ws._querySubs.has(subId)) ws._querySubs.delete(subId);
          ws.send(JSON.stringify({ id, ok: true }));
          break;
        }

        case "transaction": {
          // Esperamos: reads [{colPath, docId, version}], writes [{op, colPath, docId, data, merge?}]
          const { reads, writes } = msg;
          let conflict = false;
          // Verificar versiones de lectura
          for (const r of reads || []) {
            const dpath = docPath(room, r.colPath, r.docId);
            const currentVer = room.docVersions.get(dpath) || 0;
            if (currentVer !== r.version) {
              conflict = true;
              break;
            }
          }
          if (conflict) {
            ws.send(JSON.stringify({ id, ok: false, error: "conflict" }));
            break;
          }
          // Aplicar escrituras
          for (const w of writes || []) {
            if (w.op === "set") {
              setDoc(room, w.colPath, w.docId, w.data, w.merge || false);
            } else if (w.op === "update") {
              const existing = getDoc(room, w.colPath, w.docId);
              setDoc(room, w.colPath, w.docId, { ...(existing || {}), ...w.data }, false);
            } else if (w.op === "delete") {
              deleteDoc(room, w.colPath, w.docId);
            }
            notifyDoc(room, w.colPath, w.docId, getDoc(room, w.colPath, w.docId), w.op !== "delete");
            broadcastDocsInCol(room, w.colPath);
          }
          saveRoom(roomName, { collections: room.collections });
          ws.send(JSON.stringify({ id, ok: true }));
          break;
        }

        case "batch": {
          const { writes } = msg;
          for (const w of writes || []) {
            if (w.op === "set") {
              setDoc(room, w.colPath, w.docId, w.data, w.merge || false);
            } else if (w.op === "update") {
              const existing = getDoc(room, w.colPath, w.docId);
              setDoc(room, w.colPath, w.docId, { ...(existing || {}), ...w.data }, false);
            } else if (w.op === "delete") {
              deleteDoc(room, w.colPath, w.docId);
            }
            notifyDoc(room, w.colPath, w.docId, getDoc(room, w.colPath, w.docId), w.op !== "delete");
            broadcastDocsInCol(room, w.colPath);
          }
          saveRoom(roomName, { collections: room.collections });
          ws.send(JSON.stringify({ id, ok: true }));
          break;
        }

        default:
          ws.send(JSON.stringify({ id, ok: false, error: "Operación desconocida: " + op }));
      }
    } catch (err) {
      console.error("Error procesando mensaje:", err);
      ws.send(JSON.stringify({ id, ok: false, error: err.message }));
    }
  });

  ws.on("close", () => {
    room.conns.delete(ws);
    console.log(`[${roomName}] Desconectado. Quedan ${room.conns.size}`);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor LAN de torneo escuchando en ws://0.0.0.0:${PORT}`);
  console.log(`HTTP health-check en http://0.0.0.0:${PORT}/health`);
});
