/**
 * lan-shim.js
 * Cliente/shim para conectar la app del torneo al servidor LAN.
 * Expone window.LAN con una API compatible con Firebase Firestore.
 *
 * Incluir en index.html ANTES de app.js:
 *   <script src="lan-shim.js"></script>
 */

(function () {
  "use strict";

  const MSG_SERVER_TIMESTAMP = { __serverTimestamp: true };

  function isServerTimestamp(v) {
    return v && typeof v === "object" && v.__serverTimestamp === true;
  }

  function replaceServerTimestamps(obj, ts) {
    if (obj == null) return obj;
    if (isServerTimestamp(obj)) {
      return {
        toMillis: () => ts,
        seconds: Math.floor(ts / 1000),
        nanoseconds: (ts % 1000) * 1e6,
        isEqual: (other) => other && typeof other.toMillis === "function" && other.toMillis() === ts,
      };
    }
    if (Array.isArray(obj)) return obj.map((v) => replaceServerTimestamps(v, ts));
    if (typeof obj === "object") {
      const out = {};
      for (const k of Object.keys(obj)) out[k] = replaceServerTimestamps(obj[k], ts);
      return out;
    }
    return obj;
  }

  // Los objetos Timestamp de Firestore se serializan por WebSocket como
  // { seconds, nanoseconds } perdiendo los métodos (toMillis, isEqual).
  // Esta función reconstruye esos objetos al recibirlos del servidor.
  function reviveTimestamps(obj) {
    if (obj == null) return obj;
    if (typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(reviveTimestamps);
    if (
      typeof obj.seconds === "number" &&
      typeof obj.nanoseconds === "number" &&
      typeof obj.toMillis !== "function"
    ) {
      const ms = obj.seconds * 1000 + Math.round(obj.nanoseconds / 1e6);
      return {
        toMillis: () => ms,
        seconds: obj.seconds,
        nanoseconds: obj.nanoseconds,
        isEqual: (other) => other && typeof other.toMillis === "function" && other.toMillis() === ms,
      };
    }
    const out = {};
    for (const k of Object.keys(obj)) out[k] = reviveTimestamps(obj[k]);
    return out;
  }

  let ws;
  let reqId = 0;
  const pending = new Map(); // id → { resolve, reject }
  const docSubs = new Map(); // "colPath/docId" → Set<callback>
  const querySubs = new Map(); // subId → { colPath, conditions, callback }
  let subIdCounter = 0;

  function send(msg) {
    return new Promise((resolve, reject) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error("No conectado al servidor LAN"));
        return;
      }
      const id = ++reqId;
      msg.id = id;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify(msg));
    });
  }

  function connect_(url, room, displayName) {
    return new Promise((resolve, reject) => {
      const fullUrl = `${url}?room=${encodeURIComponent(room)}&name=${encodeURIComponent(displayName)}`;
      ws = new WebSocket(fullUrl);

      ws.onopen = () => {
        // Devolvemos la API pública
        const client = {
          close() {
            if (ws) {
              ws.close();
              ws = null;
            }
            pending.forEach((p) => p.reject(new Error("Desconectado")));
            pending.clear();
          },
        };
        resolve({ client, db: new LanDatabase() });
      };

      ws.onerror = (err) => {
        reject(new Error("No se pudo conectar al servidor LAN"));
      };

      ws.onmessage = (evt) => {
        let msg;
        try {
          msg = JSON.parse(evt.data);
        } catch (e) {
          return;
        }

        if (msg.type === "docChange") {
          const key = `${msg.colPath}/${msg.docId}`;
          const cbs = docSubs.get(key);
          if (cbs) {
            const snap = new LanDocumentSnapshot(msg.docId, reviveTimestamps(msg.data), msg.exists, null);
            cbs.forEach((cb) => {
              try { cb(snap); } catch (e) {}
            });
          }
          // También notificamos queries que escuchen esta colección
          querySubs.forEach((sub) => {
            if (sub.colPath === msg.colPath) {
              // Re-evaluamos la query y notificamos
              send({ op: "query", colPath: sub.colPath, conditions: sub.conditions }).then((res) => {
                const snap = buildQuerySnapshot(reviveTimestamps(res.docs), sub.colPath);
                try { sub.callback(snap); } catch (e) {}
              });
            }
          });
          return;
        }

        if (msg.type === "queryChange") {
          // Re-evaluar todas las queries de esta colección
          querySubs.forEach((sub) => {
            if (sub.colPath === msg.colPath) {
              send({ op: "query", colPath: sub.colPath, conditions: sub.conditions }).then((res) => {
                const snap = buildQuerySnapshot(reviveTimestamps(res.docs), sub.colPath);
                try { sub.callback(snap); } catch (e) {}
              });
            }
          });
          return;
        }

        if (msg.id != null && pending.has(msg.id)) {
          const p = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.ok) p.resolve(msg);
          else p.reject(new Error(msg.error || "Error del servidor LAN"));
        }
      };

      ws.onclose = () => {
        pending.forEach((p) => p.reject(new Error("Conexión cerrada")));
        pending.clear();
      };
    });
  }

  /* ======================================================================
     DocumentSnapshot
     ====================================================================== */
  class LanDocumentSnapshot {
    constructor(id, data, exists, ref) {
      this._id = id;
      this._data = data;
      this._exists = exists;
      this._ref = ref;
      this.metadata = { hasPendingWrites: false, fromCache: false };
    }
    get exists() { return this._exists; }
    get id() { return this._id; }
    get ref() { return this._ref; }
    data() { return this._exists ? deepCopy(this._data) : undefined; }
    toMillis() {
      // Si el documento tiene un campo timestamp numérico, lo usamos;
      // de lo contrario 0.
      return typeof this._data === "object" && this._data != null && typeof this._data._ts === "number"
        ? this._data._ts
        : 0;
    }
  }

  /* ======================================================================
     QuerySnapshot
     ====================================================================== */
  function buildQuerySnapshot(docs, colPath) {
    const docSnaps = (docs || []).map((d) => {
      const ref = new LanDocumentReference(colPath, d.id);
      return new LanDocumentSnapshot(d.id, d.data, true, ref);
    });
    return {
      docs: docSnaps,
      get empty() { return docSnaps.length === 0; },
      get size() { return docSnaps.length; },
      forEach(fn) { docSnaps.forEach(fn); },
      docChanges() {
        return docSnaps.map((snap) => ({ type: "added", doc: snap }));
      },
    };
  }

  /* ======================================================================
     DocumentReference
     ====================================================================== */
  class LanDocumentReference {
    constructor(colPath, docId) {
      this._colPath = colPath;
      this._docId = docId;
    }
    get id() { return this._docId; }
    get parent() { return new LanCollectionReference(this._colPath); }
    collection(name) {
      return new LanCollectionReference(`${this._colPath}/${this._docId}/${name}`);
    }
    set(data, options) {
      const clean = replaceServerTimestamps(deepCopy(data), Date.now());
      return send({ op: "set", colPath: this._colPath, docId: this._docId, data: clean, merge: !!(options && options.merge) });
    }
    update(data) {
      const clean = replaceServerTimestamps(deepCopy(data), Date.now());
      return send({ op: "update", colPath: this._colPath, docId: this._docId, data: clean });
    }
    get() {
      return send({ op: "get", colPath: this._colPath, docId: this._docId }).then((res) => {
        return new LanDocumentSnapshot(res.docId, reviveTimestamps(res.data), res.exists, this);
      });
    }
    onSnapshot(callback) {
      const key = `${this._colPath}/${this._docId}`;
      if (!docSubs.has(key)) docSubs.set(key, new Set());
      docSubs.get(key).add(callback);
      // Pedimos suscripción al servidor y notificamos estado inicial
      send({ op: "subscribeDoc", colPath: this._colPath, docId: this._docId, subId: key }).then((res) => {
        const snap = new LanDocumentSnapshot(res.docId, reviveTimestamps(res.data), res.exists, this);
        try { callback(snap); } catch (e) {}
      });
      return () => {
        const cbs = docSubs.get(key);
        if (cbs) {
          cbs.delete(callback);
          if (cbs.size === 0) docSubs.delete(key);
        }
      };
    }
    delete() {
      return send({ op: "delete", colPath: this._colPath, docId: this._docId });
    }
  }

  /* ======================================================================
     Query
     ====================================================================== */
  class LanQuery {
    constructor(colPath, conditions, orderBys, limitN) {
      this._colPath = colPath;
      this._conditions = conditions ? [...conditions] : [];
      this._orderBys = orderBys ? [...orderBys] : [];
      this._limit = limitN || null;
      this._limitToLast = null;
    }
    where(field, op, value) {
      const q = new LanQuery(this._colPath, this._conditions, this._orderBys, this._limit);
      q._limitToLast = this._limitToLast;
      q._conditions.push({ field, op, value });
      return q;
    }
    orderBy(field, direction) {
      const q = new LanQuery(this._colPath, this._conditions, this._orderBys, this._limit);
      q._limitToLast = this._limitToLast;
      q._orderBys.push({ field, dir: direction === "desc" ? "desc" : "asc" });
      return q;
    }
    limit(n) {
      const q = new LanQuery(this._colPath, this._conditions, this._orderBys, n);
      q._limitToLast = this._limitToLast;
      return q;
    }
    limitToLast(n) {
      const q = new LanQuery(this._colPath, this._conditions, this._orderBys, this._limit);
      q._limitToLast = n;
      return q;
    }
    get() {
      return send({ op: "query", colPath: this._colPath, conditions: this._conditions, orderBys: this._orderBys, limit: this._limit, limitToLast: this._limitToLast }).then((res) => {
        return buildQuerySnapshot(reviveTimestamps(res.docs), this._colPath);
      });
    }
    onSnapshot(callback) {
      const subId = `q_${++subIdCounter}`;
      querySubs.set(subId, { colPath: this._colPath, conditions: this._conditions, orderBys: this._orderBys, limit: this._limit, limitToLast: this._limitToLast, callback });
      send({ op: "subscribeQuery", colPath: this._colPath, conditions: this._conditions, orderBys: this._orderBys, limit: this._limit, limitToLast: this._limitToLast, subId }).then((res) => {
        const snap = buildQuerySnapshot(reviveTimestamps(res.docs), this._colPath);
        try { callback(snap); } catch (e) {}
      });
      return () => {
        querySubs.delete(subId);
        send({ op: "unsubscribe", subId }).catch(() => {});
      };
    }
  }

  /* ======================================================================
     CollectionReference
     ====================================================================== */
  class LanCollectionReference extends LanQuery {
    constructor(colPath) {
      super(colPath, [], [], null);
    }
    doc(docId) {
      return new LanDocumentReference(this._colPath, docId);
    }
    add(data) {
      const clean = replaceServerTimestamps(deepCopy(data), Date.now());
      return send({ op: "add", colPath: this._colPath, data: clean }).then((res) => {
        return new LanDocumentReference(this._colPath, res.docId);
      });
    }
  }

  /* ======================================================================
     WriteBatch
     ====================================================================== */
  class LanWriteBatch {
    constructor() {
      this._writes = [];
    }
    set(docRef, data, options) {
      this._writes.push({
        op: "set",
        colPath: docRef._colPath,
        docId: docRef._docId,
        data: replaceServerTimestamps(deepCopy(data), Date.now()),
        merge: !!(options && options.merge),
      });
      return this;
    }
    update(docRef, data) {
      this._writes.push({
        op: "update",
        colPath: docRef._colPath,
        docId: docRef._docId,
        data: replaceServerTimestamps(deepCopy(data), Date.now()),
      });
      return this;
    }
    delete(docRef) {
      this._writes.push({ op: "delete", colPath: docRef._colPath, docId: docRef._docId });
      return this;
    }
    commit() {
      return send({ op: "batch", writes: this._writes });
    }
  }

  /* ======================================================================
     Transaction shim
     ====================================================================== */
  class LanTransaction {
    constructor() {
      this._reads = []; // { colPath, docId, version }
      this._writes = []; // { op, colPath, docId, data, merge? }
    }
    async get(docRef) {
      const res = await send({ op: "get", colPath: docRef._colPath, docId: docRef._docId });
      const snap = new LanDocumentSnapshot(res.docId, reviveTimestamps(res.data), res.exists, docRef);
      this._reads.push({ colPath: docRef._colPath, docId: docRef._docId, version: res.version || 0 });
      return snap;
    }
    set(docRef, data) {
      this._writes.push({
        op: "set",
        colPath: docRef._colPath,
        docId: docRef._docId,
        data: replaceServerTimestamps(deepCopy(data), Date.now()),
      });
    }
    update(docRef, data) {
      this._writes.push({
        op: "update",
        colPath: docRef._colPath,
        docId: docRef._docId,
        data: replaceServerTimestamps(deepCopy(data), Date.now()),
      });
    }
    delete(docRef) {
      this._writes.push({ op: "delete", colPath: docRef._colPath, docId: docRef._docId });
    }
  }

  /* ======================================================================
     Database
     ====================================================================== */
  class LanDatabase {
    collection(name) {
      return new LanCollectionReference(name);
    }
    async runTransaction(updateFn) {
      const MAX_RETRIES = 5;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const tx = new LanTransaction();
        try {
          await updateFn(tx);
        } catch (e) {
          throw e; // Error lógico de la app
        }
        try {
          await send({ op: "transaction", reads: tx._reads, writes: tx._writes });
          return; // Éxito
        } catch (e) {
          if (e.message === "conflict" && attempt < MAX_RETRIES - 1) {
            await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
            continue;
          }
          throw e;
        }
      }
    }
    batch() {
      return new LanWriteBatch();
    }
  }

  /* ======================================================================
     Helpers
     ====================================================================== */
  function deepCopy(obj) {
    if (obj == null) return obj;
    if (typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(deepCopy);
    const out = {};
    for (const k of Object.keys(obj)) out[k] = deepCopy(obj[k]);
    return out;
  }

  /* ======================================================================
     API pública
     ====================================================================== */
  window.LAN = {
    connect: connect_,
    serverTimestamp() {
      return MSG_SERVER_TIMESTAMP;
    },
  };
})();
