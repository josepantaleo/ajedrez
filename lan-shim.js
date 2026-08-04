"use strict";

// =====================================================================
// LAN SHIM
// -----------------------------------------------------------------
// Reproduce el subconjunto de la API de Firestore (SDK "compat") que
// usa app.js: collection/doc, get/set/update/delete/add, onSnapshot,
// where(campo,"==",valor), batch(), runTransaction(). Por debajo habla
// con lan-server.js por WebSocket en vez de ir a Firebase.
//
// Se expone como window.LAN = { connect(url), serverTimestamp() },
// pensado para usarse desde app.js así:
//
//   const { db } = await LAN.connect("ws://192.168.0.15:8080");
//   fbDb = db;  // mismo objeto que firebase.firestore(), para el
//               // resto del código de la app.
// =====================================================================

(function (global) {
  function isPlainObject(v) {
    return v && typeof v === "object" && !Array.isArray(v);
  }

  // Convierte los {__ts:true, ms:...} planos que manda el servidor en
  // objetos con .toMillis()/.toDate(), igual que un Timestamp real de
  // Firestore.
  function reviveTimestamps(value) {
    if (Array.isArray(value)) return value.map(reviveTimestamps);
    if (isPlainObject(value)) {
      if (value.__ts) {
        const ms = value.ms;
        return {
          __ts: true,
          ms,
          toMillis: function () {
            return ms;
          },
          toDate: function () {
            return new Date(ms);
          },
        };
      }
      const out = {};
      for (const k of Object.keys(value)) out[k] = reviveTimestamps(value[k]);
      return out;
    }
    return value;
  }

  const SERVER_TIMESTAMP_MARKER = { __serverTimestamp: true };

  function isServerTimestampMarker(v) {
    return isPlainObject(v) && v.__serverTimestamp === true;
  }

  class LanClient {
    constructor(url) {
      this.url = url;
      this.ws = null;
      this._nextMsgId = 1;
      this._pending = new Map();
      this._subs = new Map();
      this._nextSubId = 1;
    }

    connect() {
      return new Promise((resolve, reject) => {
        let settled = false;
        let ws;
        try {
          ws = new WebSocket(this.url);
        } catch (err) {
          reject(new Error("Dirección de servidor LAN inválida: " + this.url));
          return;
        }
        this.ws = ws;
        ws.addEventListener("open", () => {
          settled = true;
          resolve();
        });
        ws.addEventListener("error", () => {
          if (!settled) {
            settled = true;
            reject(new Error("No se pudo conectar a " + this.url + ". Revisá que el servidor LAN esté corriendo y que estés en la misma red."));
          }
        });
        ws.addEventListener("close", () => {
          const err = new Error("Se perdió la conexión con el servidor LAN.");
          this._pending.forEach((p) => p.reject(err));
          this._pending.clear();
          if (!settled) {
            settled = true;
            reject(err);
          }
        });
        ws.addEventListener("message", (ev) => this._onMessage(ev));
      });
    }

    close() {
      try {
        if (this.ws) this.ws.close();
      } catch (err) {
        /* noop */
      }
    }

    _onMessage(ev) {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch (err) {
        return;
      }
      if (msg.re) {
        const pending = this._pending.get(msg.id);
        if (!pending) return;
        this._pending.delete(msg.id);
        if (msg.ok) pending.resolve(msg.result);
        else pending.reject(new Error(msg.error || "Error del servidor LAN"));
        return;
      }
      if (msg.ev === "snapshot" || msg.ev === "querySnapshot") {
        const sub = this._subs.get(msg.subId);
        if (sub) sub(msg);
      }
    }

    send(payload) {
      return new Promise((resolve, reject) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          reject(new Error("No hay conexión con el servidor LAN"));
          return;
        }
        const id = this._nextMsgId++;
        this._pending.set(id, { resolve, reject });
        try {
          this.ws.send(JSON.stringify(Object.assign({}, payload, { id })));
        } catch (err) {
          this._pending.delete(id);
          reject(err);
        }
      });
    }

    subscribe(kind, path, where, cb) {
      const subId = this._nextSubId++;
      this._subs.set(subId, cb);
      const op = kind === "doc" ? "subDoc" : "subQuery";
      this.send({ op, subId, path, where }).catch(() => {
        /* si falla la suscripción inicial, el callback de error del
           .onSnapshot() del caller ya se encarga por su lado */
      });
      return () => {
        this._subs.delete(subId);
        this.send({ op: "unsub", subId }).catch(() => {});
      };
    }
  }

  function encodeSentinels(data) {
    // Los marcadores de serverTimestamp ya son JSON-seguros tal cual
    // (son objetos planos {__serverTimestamp:true}); esta función
    // existe como punto único por si en el futuro hace falta codificar
    // algo más antes de mandarlo por la red.
    return data;
  }

  function docSnapFromGet(client, pathArr, raw) {
    const data = raw.exists ? reviveTimestamps(raw.data) : undefined;
    return {
      exists: !!raw.exists,
      id: pathArr[pathArr.length - 1],
      data: () => data,
      ref: new LanDocRef(client, pathArr),
      metadata: { hasPendingWrites: false },
    };
  }

  class LanDocRef {
    constructor(client, pathArr) {
      this.client = client;
      this.path = pathArr;
      this.id = pathArr[pathArr.length - 1];
    }
    collection(name) {
      return new LanCollectionRef(this.client, this.path.concat([name]));
    }
    get() {
      return this.client.send({ op: "get", path: this.path }).then((r) => docSnapFromGet(this.client, this.path, r));
    }
    set(data, opts) {
      return this.client
        .send({ op: "set", path: this.path, data: encodeSentinels(data), merge: !!(opts && opts.merge) })
        .then(() => undefined);
    }
    update(data) {
      return this.client.send({ op: "update", path: this.path, data: encodeSentinels(data) }).then(() => undefined);
    }
    delete() {
      return this.client.send({ op: "delete", path: this.path }).then(() => undefined);
    }
    onSnapshot(onNext, onError) {
      return this.client.subscribe("doc", this.path, null, (msg) => {
        const data = msg.exists ? reviveTimestamps(msg.data) : undefined;
        onNext({
          exists: !!msg.exists,
          id: this.id,
          data: () => data,
          ref: this,
          metadata: { hasPendingWrites: false },
        });
      });
    }
  }

  class LanQuery {
    constructor(client, pathArr, where) {
      this.client = client;
      this.path = pathArr;
      this.where = where || null;
    }
    get() {
      return this.client.send({ op: "getQuery", path: this.path, where: this.where }).then((r) => {
        const docs = r.docs.map((d) => docFromRow(this.client, this.path, d));
        return { docs, docChanges: () => [] };
      });
    }
    onSnapshot(onNext, onError) {
      return this.client.subscribe("query", this.path, this.where, (msg) => {
        const docs = msg.docs.map((d) => docFromRow(this.client, this.path, d));
        const byId = new Map(docs.map((d) => [d.id, d]));
        const changes = msg.changes.map((c) => ({
          type: c.type,
          doc: byId.get(c.id) || {
            id: c.id,
            exists: false,
            data: () => undefined,
            ref: new LanDocRef(this.client, this.path.concat([c.id])),
          },
        }));
        onNext({ docs, docChanges: () => changes });
      });
    }
  }

  function docFromRow(client, collPathArr, row) {
    const data = reviveTimestamps(row.data);
    return {
      exists: true,
      id: row.id,
      data: () => data,
      ref: new LanDocRef(client, collPathArr.concat([row.id])),
      metadata: { hasPendingWrites: false },
    };
  }

  class LanCollectionRef extends LanQuery {
    constructor(client, pathArr) {
      super(client, pathArr, null);
    }
    doc(id) {
      const docId = id || genId();
      return new LanDocRef(this.client, this.path.concat([docId]));
    }
    where(field, op, value) {
      if (op !== "==") {
        throw new Error('El modo LAN solo soporta consultas con "==" (alcanza para esta app).');
      }
      return new LanQuery(this.client, this.path, { field, value });
    }
    add(data) {
      return this.client.send({ op: "add", path: this.path, data: encodeSentinels(data) }).then((r) => this.doc(r.id));
    }
  }

  function genId() {
    return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  class LanBatch {
    constructor(client) {
      this.client = client;
      this.ops = [];
    }
    set(ref, data, opts) {
      this.ops.push({ type: "set", path: ref.path, data: encodeSentinels(data), merge: !!(opts && opts.merge) });
      return this;
    }
    update(ref, data) {
      this.ops.push({ type: "update", path: ref.path, data: encodeSentinels(data) });
      return this;
    }
    delete(ref) {
      this.ops.push({ type: "delete", path: ref.path });
      return this;
    }
    commit() {
      return this.client.send({ op: "batch", ops: this.ops }).then(() => undefined);
    }
  }

  class LanFirestore {
    constructor(client) {
      this.client = client;
    }
    collection(name) {
      return new LanCollectionRef(this.client, [name]);
    }
    batch() {
      return new LanBatch(this.client);
    }
    runTransaction(updateFn) {
      const client = this.client;
      const txId = "tx_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      const writes = [];
      const tx = {
        get(ref) {
          return client.send({ op: "txGet", txId, path: ref.path }).then((r) => docSnapFromGet(client, ref.path, r));
        },
        set(ref, data, opts) {
          writes.push({ type: "set", path: ref.path, data: encodeSentinels(data), merge: !!(opts && opts.merge) });
          return tx;
        },
        update(ref, data) {
          writes.push({ type: "update", path: ref.path, data: encodeSentinels(data) });
          return tx;
        },
        delete(ref) {
          writes.push({ type: "delete", path: ref.path });
          return tx;
        },
      };
      return client
        .send({ op: "txBegin", txId })
        .then(() => Promise.resolve().then(() => updateFn(tx)))
        .then(
          (result) => client.send({ op: "txCommit", txId, writes }).then(() => result),
          (err) => client.send({ op: "txAbort", txId }).catch(() => {}).then(() => Promise.reject(err))
        );
    }
  }

  global.LAN = {
    serverTimestamp: function () {
      return SERVER_TIMESTAMP_MARKER;
    },
    isServerTimestampMarker,
    connect: function (url, room, displayName) {
      const client = new LanClient(url);
      return client.connect().then(
        () =>
          client.send({ op: "join", room: room || "main", displayName: displayName || "" }).then((joinInfo) => ({
            client,
            db: new LanFirestore(client),
            isFirst: !!(joinInfo && joinInfo.isFirst),
          })),
        (err) => {
          throw err;
        }
      );
    },
  };
})(window);
