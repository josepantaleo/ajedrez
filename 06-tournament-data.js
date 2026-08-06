/* Tournament subscriptions, persistence, pairing, ranking, and exports. Generated from the verified legacy bundle. */
function subscribeRoundGames(e) {
  (subscribedRound_ !== e || (!gamesRoundUnsub && null != e)) &&
    (gamesRoundUnsub && (gamesRoundUnsub(), (gamesRoundUnsub = null)),
    (subscribedRound_ = e),
    gamesCollectionRef && null != e
      ? (gamesRoundUnsub = gamesCollectionRef
          .where("round", "==", e)
          .onSnapshot(
            (e) => {
              try {
                const t = new Map(
                  lastRoundGames.map((e) => [gameDocId_(e.round, e.board), e]),
                );
                ((lastRoundGames = e.docs.map((e) => {
                  const a = !(!e.metadata || !e.metadata.hasPendingWrites),
                    n = e.data({ serverTimestamps: a ? "none" : "estimate" }),
                    o =
                      (tournamentMatchCtx &&
                        gameDocId_(
                          tournamentMatchCtx.round,
                          tournamentMatchCtx.board,
                        )) === e.id && tournamentCurrentGameRow
                        ? tournamentCurrentGameRow
                        : t.get(e.id),
                    r = o && o.fen === n.fen && o.status === n.status;
                  if (
                    (r &&
                      !n.turnStartAt &&
                      o.turnStartAt &&
                      (n.turnStartAt = o.turnStartAt),
                    r && o.joined)
                  ) {
                    const e = n.joined || { w: !1, b: !1 };
                    n.joined = {
                      w: !(!e.w && !o.joined.w),
                      b: !(!e.b && !o.joined.b),
                    };
                  }
                  return n;
                })),
                  tournamentMatchActive ||
                    renderTournamentState(lastTournamentState),
                  refreshPublicScreenActiveMiniBoard_(),
                  renderPublicScreenZoomBoard_(),
                  handleLiveMatchUpdate(lastTournamentState));
              } catch (e) {
                console.error(
                  "[subscribeRoundGames] error procesando snapshot:",
                  e,
                );
              }
            },
            () => {},
          ))
      : (lastRoundGames = []));
}
function closeActiveMatchOnTournamentChange_(e) {
  tournamentMatchActive && (closeAlert_(), toast(e), exitTournamentMatch());
}
function subscribeTournament() {
  tournamentUnsub && (tournamentUnsub(), (tournamentUnsub = null));
  const e = document.getElementById("tournament-connect-status");
  tournamentUnsub = fbRoomRef.onSnapshot(
    (t) => {
      ((e.textContent = "✓ Conectado."), e.classList.add("correct"));
      const a = normalizeTournamentState(
          t.exists ? t.data({ serverTimestamps: "estimate" }) : null,
        ),
        n = lastKnownTournamentStatus_;
      ((lastKnownTournamentStatus_ = a.meta.status),
        (lastTournamentState = a),
        subscribeRoundGames(
          "active" === a.meta.status || "finished" === a.meta.status
            ? a.meta.round
            : null,
        ),
        tournamentMatchActive ||
          (renderTournamentState(a),
          "function" == typeof renderPublicScreen && renderPublicScreen(a)),
        handleLiveMatchUpdate(a),
        null !== n &&
          n !== a.meta.status &&
          ("finished" === a.meta.status
            ? closeActiveMatchOnTournamentChange_(
                "🏁 El administrador finalizó el torneo.",
              )
            : "setup" === a.meta.status &&
              closeActiveMatchOnTournamentChange_(
                "🔄 El administrador reinició el torneo.",
              )));
    },
    (t) => {
      ((e.textContent = "❌ No se pudo conectar: " + t.message),
        e.classList.remove("correct"));
    },
  );
}
async function getTournamentStateOnce() {
  const e = await fbRoomRef.get();
  return normalizeTournamentState(e.exists ? e.data() : null);
}
function parsePlayersInput(e) {
  return e
    .split("\n")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e) => {
      const t = e.split(",");
      return {
        name: (t[0] || "").trim(),
        email: (t.slice(1).join(",") || "").trim().toLowerCase(),
      };
    })
    .filter((e) => e.name);
}
function applyResultToPlayers_(e, t, a, n) {
  e &&
    t &&
    a &&
    ("1-0" === a || "wo-black" === a
      ? (e.points += 1 * n)
      : "0-1" === a || "wo-white" === a
        ? (t.points += 1 * n)
        : "1/2-1/2" === a && ((e.points += 0.5 * n), (t.points += 0.5 * n)));
}
async function fbCreateTournament(e, t, a, n, o, r, s) {
  isBootstrapping(lastTournamentState) || assertAdmin();
  const l = new Set();
  for (const e of t) {
    if (!e.name) continue;
    const t = (e.email || "").toLowerCase().trim();
    if (t && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t))
      throw new Error(`El email "${e.email}" de ${e.name} no parece válido`);
    if (t) {
      if (l.has(t))
        throw new Error(`El email ${t} está repetido entre los jugadores`);
      l.add(t);
    }
  }
  const i = t
      .filter((e) => e.name)
      .map((e, t) => ({
        id: "p" + (t + 1),
        name: e.name,
        email: (e.email || "").toLowerCase(),
        points: 0,
        played: [],
        byes: 0,
        colorBalance: 0,
        status: "active",
      })),
    c = Number(a),
    d = o || { minutes: 0, increment: 0 };
  return (
    await fbRoomRef.set({
      meta: {
        name: e || "Torneo",
        round: 0,
        status: "active",
        roundStatus: "playing",
        roundApprovalMode: "auto" === r ? "auto" : "manual",
        pendingApprovalAt: null,
        autoApprovalCancelled: !1,
        totalRounds: c > 0 ? c : null,
        adminEmails: [TOURNAMENT_ADMIN_EMAIL],
        timeControlMinutes: d.minutes > 0 ? d.minutes : 0,
        timeControlIncrement: d.increment > 0 ? d.increment : 0,
        woGraceMinutes: Number(s) > 0 ? Number(s) : 0,
      },
      players: i,
      pairings: [],
    }),
    getTournamentStateOnce()
  );
}
function validatePlayerNameEmail_(e, t) {
  if (((e = (e || "").trim()), (t = (t || "").trim().toLowerCase()), !e))
    throw new Error("El nombre no puede estar vacío");
  if (t && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t))
    throw new Error(`El email "${t}" no parece válido`);
  return { name: e, email: t };
}
async function fbAddPlayer(e, t) {
  assertAdmin();
  const { name: a, email: n } = validatePlayerNameEmail_(e, t);
  return (
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) throw new Error("Todavía no creaste un torneo");
      const o = t.data().players || [];
      if (n && o.some((e) => (e.email || "").toLowerCase() === n))
        throw new Error(`Ya hay un jugador con el email ${n}`);
      let r = o.length + 1;
      const s = new Set(o.map((e) => e.id));
      for (; s.has("p" + r); ) r++;
      const l = {
        id: "p" + r,
        name: a,
        email: n,
        points: 0,
        played: [],
        byes: 0,
        colorBalance: 0,
        status: "active",
      };
      e.update(fbRoomRef, { players: o.concat([l]) });
    }),
    getTournamentStateOnce()
  );
}
async function fbSelfRegister(e) {
  if (!currentUser) throw new Error("Iniciá sesión con Google primero");
  const t = (e || "").trim() || currentUser.displayName;
  if (!t) throw new Error("Ingresá tu nombre");
  const a = currentUser.email;
  return (
    await fbDb.runTransaction(async (e) => {
      const n = await e.get(fbRoomRef);
      if (!n.exists) throw new Error("Todavía no se creó el torneo");
      const o = n.data();
      if (o.meta && "finished" === o.meta.status)
        throw new Error("El torneo ya finalizó, no se puede inscribir");
      const r = o.players || [];
      if (r.some((e) => (e.email || "").toLowerCase() === a))
        throw new Error("Ya estás inscripto en este torneo");
      let s = r.length + 1;
      const l = new Set(r.map((e) => e.id));
      for (; l.has("p" + s); ) s++;
      const i = {
        id: "p" + s,
        name: t,
        email: a,
        points: 0,
        played: [],
        byes: 0,
        colorBalance: 0,
        status: "pending",
      };
      e.update(fbRoomRef, { players: r.concat([i]) });
    }),
    getTournamentStateOnce()
  );
}
async function fbApproveRegistration(e) {
  return (
    assertAdmin(),
    await fbDb.runTransaction(async (t) => {
      const a = await t.get(fbRoomRef);
      if (!a.exists) throw new Error("Todavía no creaste un torneo");
      const n = a.data().players || [],
        o = n.findIndex((t) => t.id === e);
      if (-1 === o) throw new Error("No se encontró esa inscripción");
      if ("pending" !== n[o].status)
        throw new Error("Esta inscripción ya fue procesada");
      const r = n.slice();
      ((r[o] = { ...r[o], status: "active" }),
        t.update(fbRoomRef, { players: r }));
    }),
    getTournamentStateOnce()
  );
}
async function fbRejectRegistration(e) {
  return (
    assertAdmin(),
    await fbDb.runTransaction(async (t) => {
      const a = await t.get(fbRoomRef);
      if (!a.exists) throw new Error("Todavía no creaste un torneo");
      const n = a.data().players || [],
        o = n.findIndex((t) => t.id === e);
      if (-1 === o) throw new Error("No se encontró esa inscripción");
      if ("pending" !== n[o].status)
        throw new Error("Esta inscripción ya fue procesada");
      t.update(fbRoomRef, { players: n.filter((t) => t.id !== e) });
    }),
    getTournamentStateOnce()
  );
}
async function fbApproveAllRegistrations() {
  return (
    assertAdmin(),
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) throw new Error("Todavía no creaste un torneo");
      const a = t.data().players || [];
      if (0 === a.filter((e) => "pending" === e.status).length)
        throw new Error("No hay inscripciones pendientes");
      const n = a.map((e) =>
        "pending" === e.status ? { ...e, status: "active" } : e,
      );
      e.update(fbRoomRef, { players: n });
    }),
    getTournamentStateOnce()
  );
}
async function fbRejectAllRegistrations() {
  return (
    assertAdmin(),
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) throw new Error("Todavía no creaste un torneo");
      const a = t.data().players || [];
      if (0 === a.filter((e) => "pending" === e.status).length)
        throw new Error("No hay inscripciones pendientes");
      e.update(fbRoomRef, { players: a.filter((e) => "pending" !== e.status) });
    }),
    getTournamentStateOnce()
  );
}
async function fbEditPlayer(e, t, a) {
  assertAdmin();
  const { name: n, email: o } = validatePlayerNameEmail_(t, a);
  return (
    await fbDb.runTransaction(async (t) => {
      const a = await t.get(fbRoomRef);
      if (!a.exists) throw new Error("Todavía no creaste un torneo");
      const r = a.data(),
        s = r.players || [],
        l = s.findIndex((t) => t.id === e);
      if (-1 === l) throw new Error("No se encontró ese jugador");
      if (o && s.some((e, t) => t !== l && (e.email || "").toLowerCase() === o))
        throw new Error(`Ya hay otro jugador con el email ${o}`);
      const i = s.slice();
      i[l] = { ...i[l], name: n, email: o };
      const c = (r.pairings || []).map((t) => {
        const a = { ...t };
        return (
          a.whiteId === e && ((a.whiteName = n), (a.whiteEmail = o)),
          a.blackId === e && ((a.blackName = n), (a.blackEmail = o)),
          a
        );
      });
      t.update(fbRoomRef, { players: i, pairings: c });
    }),
    getTournamentStateOnce()
  );
}
async function fbDeletePlayer(e) {
  return (
    assertAdmin(),
    await fbDb.runTransaction(async (t) => {
      const a = await t.get(fbRoomRef);
      if (!a.exists) throw new Error("Todavía no creaste un torneo");
      const n = a.data(),
        o = n.players || [];
      if (!o.find((t) => t.id === e))
        throw new Error("No se encontró ese jugador");
      if ((n.pairings || []).some((t) => t.whiteId === e || t.blackId === e))
        throw new Error(
          "Este jugador ya tiene partidas emparejadas: para sacarlo sin perder el historial usá 'Retirar jugador' en vez de eliminarlo.",
        );
      t.update(fbRoomRef, { players: o.filter((t) => t.id !== e) });
    }),
    getTournamentStateOnce()
  );
}
async function fbWithdrawPlayer(e) {
  return (
    assertReferee(),
    await fbDb.runTransaction(async (t) => {
      const a = await t.get(fbRoomRef);
      if (!a.exists) throw new Error("Todavía no creaste un torneo");
      const n = a.data().players || [],
        o = n.findIndex((t) => t.id === e);
      if (-1 === o) throw new Error("No se encontró ese jugador");
      if ("disqualified" === n[o].status)
        throw new Error("Este jugador está descalificado, no se puede retirar");
      const r = n.slice();
      ((r[o] = { ...r[o], status: "withdrawn" }),
        t.update(fbRoomRef, { players: r }));
    }),
    getTournamentStateOnce()
  );
}
async function fbReactivatePlayer(e) {
  return (
    assertReferee(),
    await fbDb.runTransaction(async (t) => {
      const a = await t.get(fbRoomRef);
      if (!a.exists) throw new Error("Todavía no creaste un torneo");
      const n = a.data().players || [],
        o = n.findIndex((t) => t.id === e);
      if (-1 === o) throw new Error("No se encontró ese jugador");
      if ("disqualified" === n[o].status)
        throw new Error("Un jugador descalificado no puede reincorporarse");
      const r = n.slice();
      ((r[o] = { ...r[o], status: "active" }),
        t.update(fbRoomRef, { players: r }));
    }),
    getTournamentStateOnce()
  );
}
async function fbDisqualifyPlayer(e) {
  return (
    assertReferee(),
    await fbDb.runTransaction(async (t) => {
      const a = await t.get(fbRoomRef);
      if (!a.exists) throw new Error("Todavía no creaste un torneo");
      const n = a.data().players || [],
        o = n.findIndex((t) => t.id === e);
      if (-1 === o) throw new Error("No se encontró ese jugador");
      const r = n.slice();
      ((r[o] = { ...r[o], status: "disqualified" }),
        t.update(fbRoomRef, { players: r }));
    }),
    getTournamentStateOnce()
  );
}
function buildNextRoundPairings_(e, t, a, n, o) {
  const r = t + 1,
    s = e.filter((e) => "active" === (e.status || "active"));
  let l = n ? rankPlayers_(s, n) : s.slice();
  l = l
    .slice()
    .sort((e, t) =>
      t.points !== e.points
        ? t.points - e.points
        : n && (t._buchholz || 0) !== (e._buchholz || 0)
          ? (t._buchholz || 0) - (e._buchholz || 0)
          : n
            ? e.name.localeCompare(t.name)
            : e.id < t.id
              ? -1
              : 1,
    );
  let i = null;
  if (l.length % 2 == 1) {
    if ((o && (i = l.find((e) => e.id === o) || null), !i)) {
      for (let e = l.length - 1; e >= 0; e--)
        if (0 === l[e].byes) {
          i = l[e];
          break;
        }
      i || (i = l[l.length - 1]);
    }
    l = l.filter((e) => e.id !== i.id);
  }
  let c = l.slice();
  const d = [],
    u = {};
  e.forEach((e) => (u[e.id] = e.colorBalance || 0));
  let m = 1;
  for (; c.length > 0; ) {
    const e = c.shift();
    let t = c.findIndex((t) => -1 === e.played.indexOf(t.id));
    -1 === t && (t = 0);
    const a = c.splice(t, 1)[0],
      n = (u[e.id] || 0) <= (u[a.id] || 0),
      o = n ? e : a,
      s = n ? a : e;
    ((u[o.id] = (u[o.id] || 0) + 1),
      (u[s.id] = (u[s.id] || 0) - 1),
      d.push({
        round: r,
        board: m++,
        whiteId: o.id,
        whiteName: o.name,
        whiteEmail: o.email || "",
        blackId: s.id,
        blackName: s.name,
        blackEmail: s.email || "",
        result: "",
      }));
  }
  i &&
    (d.push({
      round: r,
      board: m++,
      whiteId: i.id,
      whiteName: i.name,
      whiteEmail: i.email || "",
      blackId: "",
      blackName: "BYE",
      blackEmail: "",
      result: "1-0",
    }),
    (i.points += 1),
    (i.byes += 1));
  const p = e.map((e) =>
      i && e.id === i.id
        ? { ...e, points: i.points, byes: i.byes, colorBalance: u[e.id] || 0 }
        : { ...e, colorBalance: u[e.id] || 0 },
    ),
    g = (a && a.minutes) || 0,
    f = (a && a.increment) || 0,
    h = d
      .filter((e) => "" !== e.blackId)
      .map((e) => ({
        round: e.round,
        board: e.board,
        fen: START_FEN_TOURNEY,
        lastMoveSan: "",
        status: "ongoing",
        clock: g > 0 ? { w: 60 * g, b: 60 * g } : null,
        turnStartAt: null,
        increment: f,
        moves: [],
        joined: { w: !1, b: !1 },
        startedAt: syncedNow_(),
      }));
  return { nextRound: r, newPairings: d, updatedPlayers: p, newGames: h };
}
async function fbGenerateRound() {
  return (
    assertAdmin(),
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) throw new Error("Todavía no creaste un torneo");
      const a = t.data(),
        n = (a.players || []).map((e) => ({
          ...e,
          played: (e.played || []).slice(),
        }));
      if (n.length < 2) throw new Error("Hacen falta al menos 2 jugadores");
      const o = (a.pairings || []).map((e) => ({ ...e })),
        r = (a.meta && a.meta.round) || 0,
        s = a.meta && a.meta.totalRounds;
      if (a.meta && "finished" === a.meta.status)
        throw new Error(
          "El torneo ya está finalizado. Reabrilo si querés jugar otra ronda.",
        );
      if (s && r >= s)
        throw new Error("El torneo ya jugó las " + s + " rondas configuradas.");
      const l = o.filter((e) => e.round === r && !e.result);
      if (r > 0 && l.length > 0)
        throw new Error(
          "Todavía hay partidas de la ronda " + r + " sin resultado cargado",
        );
      if (r > 0)
        throw new Error(
          'A partir de la ronda 1, usá el botón "Aprobar ronda" para generar la próxima.',
        );
      const i = {
          minutes: (a.meta && a.meta.timeControlMinutes) || 0,
          increment: (a.meta && a.meta.timeControlIncrement) || 0,
        },
        {
          nextRound: c,
          newPairings: d,
          updatedPlayers: u,
          newGames: m,
        } = buildNextRoundPairings_(n, r, i, o);
      (e.set(fbRoomRef, {
        meta: {
          name: a.meta.name,
          round: c,
          status: "active",
          roundStatus: "playing",
          roundApprovalMode:
            "auto" === a.meta.roundApprovalMode ? "auto" : "manual",
          pendingApprovalAt: null,
          autoApprovalCancelled: !1,
          totalRounds: s || null,
          adminEmails: a.meta.adminEmails || [],
          timeControlMinutes: i.minutes,
          timeControlIncrement: i.increment,
          woGraceMinutes: (a.meta && a.meta.woGraceMinutes) || 0,
        },
        players: u,
        pairings: o.concat(d),
      }),
        m.forEach((t) =>
          e.set(gamesCollectionRef.doc(gameDocId_(t.round, t.board)), t),
        ));
    }),
    getTournamentStateOnce()
  );
}
async function fbApproveRound() {
  return (
    assertAdmin(),
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) throw new Error("Todavía no creaste un torneo");
      const a = t.data(),
        n = { ...a.meta };
      if ("active" !== n.status || "pending_approval" !== n.roundStatus)
        throw new Error(
          "No hay ninguna ronda pendiente de aprobación en este momento",
        );
      const o = (a.players || []).map((e) => ({
          ...e,
          played: (e.played || []).slice(),
        })),
        r = (a.pairings || []).map((e) => ({ ...e }));
      if (
        r.filter((e) => e.round === n.round).filter((e) => !e.result).length > 0
      )
        throw new Error(
          "Todavía hay partidas de esta ronda sin resultado cargado",
        );
      const s = {
          minutes: n.timeControlMinutes || 0,
          increment: n.timeControlIncrement || 0,
        },
        {
          nextRound: l,
          newPairings: i,
          updatedPlayers: c,
          newGames: d,
        } = buildNextRoundPairings_(o, n.round, s, r);
      ((n.round = l),
        (n.roundStatus = "playing"),
        (n.pendingApprovalAt = null),
        (n.autoApprovalCancelled = !1),
        e.update(fbRoomRef, { meta: n, players: c, pairings: r.concat(i) }),
        d.forEach((t) =>
          e.set(gamesCollectionRef.doc(gameDocId_(t.round, t.board)), t),
        ));
    }),
    getTournamentStateOnce()
  );
}
async function fbCancelAutoApproval() {
  return (
    assertAdmin(),
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) throw new Error("Todavía no creaste un torneo");
      const a = t.data();
      "pending_approval" === a.meta.roundStatus &&
        e.update(fbRoomRef, { meta: { ...a.meta, autoApprovalCancelled: !0 } });
    }),
    getTournamentStateOnce()
  );
}
async function fbCloseRound() {
  return (
    assertReferee(),
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) throw new Error("Todavía no creaste un torneo");
      const a = t.data(),
        n = { ...a.meta };
      if ("active" !== n.status || "pending_approval" !== n.roundStatus)
        throw new Error(
          "Solo se puede cerrar una ronda que ya tiene todos los resultados cargados",
        );
      const o = (a.pairings || []).map((e) =>
        e.round === n.round ? { ...e, locked: !0 } : e,
      );
      ((n.roundStatus = "closed"),
        e.update(fbRoomRef, { meta: n, pairings: o }));
    }),
    getTournamentStateOnce()
  );
}
async function fbGenerateRoundFromClosed(e) {
  return (
    assertReferee(),
    await fbDb.runTransaction(async (t) => {
      const a = await t.get(fbRoomRef);
      if (!a.exists) throw new Error("Todavía no creaste un torneo");
      const n = a.data(),
        o = { ...n.meta };
      if ("active" !== o.status || "closed" !== o.roundStatus)
        throw new Error(
          'Primero hay que "Cerrar ronda" antes de generar la próxima',
        );
      const r = (n.players || []).map((e) => ({
          ...e,
          played: (e.played || []).slice(),
        })),
        s = (n.pairings || []).map((e) => ({ ...e }));
      if (e) {
        if (
          r.filter((e) => "active" === (e.status || "active")).length % 2 ==
          0
        )
          throw new Error(
            "No hace falta asignar BYE: la cantidad de jugadores activos es par",
          );
        if (!r.find((t) => t.id === e && "active" === (t.status || "active")))
          throw new Error(
            "El jugador elegido para el BYE no está activo en el torneo",
          );
      }
      const l = {
          minutes: o.timeControlMinutes || 0,
          increment: o.timeControlIncrement || 0,
        },
        {
          nextRound: i,
          newPairings: c,
          updatedPlayers: d,
          newGames: u,
        } = buildNextRoundPairings_(r, o.round, l, s, e || void 0);
      ((o.round = i),
        (o.roundStatus = "playing"),
        (o.pendingApprovalAt = null),
        (o.autoApprovalCancelled = !1),
        t.update(fbRoomRef, { meta: o, players: d, pairings: s.concat(c) }),
        u.forEach((e) =>
          t.set(gamesCollectionRef.doc(gameDocId_(e.round, e.board)), e),
        ));
    }),
    getTournamentStateOnce()
  );
}
async function fbSetGameSuspended(e, t, a) {
  (assertReferee(), (e = Number(e)), (t = Number(t)));
  const n = gamesCollectionRef.doc(gameDocId_(e, t));
  return (
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(n);
      if (!t.exists) throw new Error("No se encontró esa partida");
      const o = { ...t.data() };
      if ("finished" === o.status)
        throw new Error("Esa partida ya terminó, no se puede suspender");
      if (a && o.clock && o.turnStartAt) {
        const e = new Chess(o.fen).turn(),
          t = Math.max(
            0,
            Math.floor((syncedNow_() - getTimestampMs(o.turnStartAt)) / 1e3),
          );
        ((o.clock = { ...o.clock, [e]: Math.max(0, o.clock[e] - t) }),
          (o.turnStartAt = null));
      } else if (!a && o.clock) {
        const e = o.joined || { w: !1, b: !1 };
        o.turnStartAt = e.w && e.b ? syncedNow_() : null;
      }
      ((o.status = a ? "suspended" : "ongoing"), e.update(n, o));
    }),
    getTournamentStateOnce()
  );
}
async function fbAutoDeclareForfeits() {
  assertReferee();
  const e = lastTournamentState && lastTournamentState.meta;
  if (!e) return [];
  const t = Number(e.woGraceMinutes) || 0;
  if (!t || "active" !== e.status || "playing" !== e.roundStatus) return [];
  const a = 6e4 * t,
    n = syncedNow_(),
    o = (await gamesCollectionRef.where("round", "==", e.round).get()).docs
      .map((e) => ({ ref: e.ref, data: e.data() }))
      .filter(({ data: e }) => {
        if ("ongoing" !== e.status || !e.startedAt) return !1;
        if (n - e.startedAt < a) return !1;
        const t = e.joined || { w: !1, b: !1 };
        return t.w !== t.b;
      });
  if (0 === o.length) return [];
  const r = [];
  for (const { ref: e } of o)
    try {
      await fbDb.runTransaction(async (t) => {
        const o = await t.get(e);
        if (!o.exists) return;
        const s = { ...o.data() };
        if ("ongoing" !== s.status || !s.startedAt || n - s.startedAt < a)
          return;
        const l = s.joined || { w: !1, b: !1 };
        l.w !== l.b &&
          ((s.status = "finished"),
          (s.resultReason = "wo-auto"),
          (s._woWinnerIsWhite = l.w),
          t.update(e, { status: s.status, resultReason: s.resultReason }),
          r.push({ round: s.round, board: s.board, whiteJoined: l.w }));
      });
    } catch (e) {}
  if (0 === r.length) return [];
  const s = [];
  return (
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) return;
      const a = t.data(),
        n = { ...a.meta },
        o = (a.players || []).map((e) => ({
          ...e,
          played: (e.played || []).slice(),
        })),
        l = {};
      o.forEach((e) => (l[e.id] = e));
      const i = (a.pairings || []).map((e) => ({ ...e }));
      if (
        (r.forEach((e) => {
          const t = i.find((t) => t.round === e.round && t.board === e.board);
          if (!t || t.result) return;
          const a = l[t.whiteId],
            n = l[t.blackId];
          if (!a || !n) return;
          const o = e.whiteJoined ? "wo-black" : "wo-white";
          (applyResultToPlayers_(a, n, o, 1),
            (t.result = o),
            -1 === a.played.indexOf(n.id) && a.played.push(n.id),
            -1 === n.played.indexOf(a.id) && n.played.push(a.id),
            s.push({
              board: t.board,
              winner: e.whiteJoined ? a.name : n.name,
              absent: e.whiteJoined ? n.name : a.name,
            }));
        }),
        0 !== s.length)
      ) {
        if (i.filter((e) => e.round === n.round).every((e) => e.result)) {
          const e = n.totalRounds;
          e && n.round >= e
            ? ((n.status = "finished"), (n.roundStatus = "playing"))
            : ((n.roundStatus = "pending_approval"),
              (n.pendingApprovalAt = syncedNow_()),
              (n.autoApprovalCancelled = !1));
        }
        e.update(fbRoomRef, { players: o, pairings: i, meta: n });
      }
    }),
    s
  );
}
async function fbSubmitResult(e, t, a) {
  return (
    (e = Number(e)),
    (t = Number(t)),
    await fbDb.runTransaction(async (n) => {
      const o = await n.get(fbRoomRef);
      if (!o.exists) throw new Error("Todavía no creaste un torneo");
      const r = o.data(),
        s = (r.players || []).map((e) => ({
          ...e,
          played: (e.played || []).slice(),
        })),
        l = {};
      s.forEach((e) => (l[e.id] = e));
      const i = (r.pairings || []).map((e) => ({ ...e })),
        c = i.find((a) => a.round === e && a.board === t);
      if (!c) throw new Error("No se encontró esa partida");
      if ("" === c.blackId)
        throw new Error("Esa fila es un BYE, no se puede cambiar");
      const d =
          currentUser && currentUser.email
            ? currentUser.email.toLowerCase()
            : "",
        u =
          d &&
          ((c.whiteEmail || "").toLowerCase() === d ||
            (c.blackEmail || "").toLowerCase() === d);
      if (
        !isCurrentUserAdmin(lastTournamentState) &&
        !isCurrentUserReferee() &&
        !u
      )
        throw new Error(
          "No tenés permiso para cargar el resultado de esta partida",
        );
      if (c.locked && !isCurrentUserReferee())
        throw new Error(
          "Esta ronda ya fue cerrada por el árbitro; solo el árbitro puede corregir resultados de una ronda cerrada",
        );
      (applyResultToPlayers_(l[c.whiteId], l[c.blackId], c.result, -1),
        (c.result = a),
        applyResultToPlayers_(l[c.whiteId], l[c.blackId], a, 1),
        -1 === l[c.whiteId].played.indexOf(c.blackId) &&
          l[c.whiteId].played.push(c.blackId),
        -1 === l[c.blackId].played.indexOf(c.whiteId) &&
          l[c.blackId].played.push(c.whiteId));
      let m = null,
        p = null;
      ("wo-white" !== a && "wo-black" !== a) ||
        ((m = gamesCollectionRef.doc(gameDocId_(e, t))),
        (await n.get(m)).exists &&
          (p = { status: "finished", resultReason: "wo" }));
      const g = { ...r.meta },
        f = g.totalRounds;
      ("active" === g.status &&
        "pending_approval" !== g.roundStatus &&
        "closed" !== g.roundStatus &&
        i.filter((e) => e.round === g.round).every((e) => e.result) &&
        (f && g.round >= f
          ? ((g.status = "finished"), (g.roundStatus = "playing"))
          : ((g.roundStatus = "pending_approval"),
            (g.pendingApprovalAt = syncedNow_()),
            (g.autoApprovalCancelled = !1))),
        n.update(fbRoomRef, { players: s, pairings: i, meta: g }),
        m && p && n.update(m, p));
    }),
    getTournamentStateOnce()
  );
}
async function fbFinishTournament() {
  return (
    assertAdmin(),
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) throw new Error("Todavía no creaste un torneo");
      const a = t.data();
      e.update(fbRoomRef, { meta: { ...a.meta, status: "finished" } });
    }),
    getTournamentStateOnce()
  );
}
async function fbReopenTournament() {
  return (
    assertAdmin(),
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) throw new Error("Todavía no creaste un torneo");
      const a = t.data();
      e.update(fbRoomRef, { meta: { ...a.meta, status: "active" } });
    }),
    getTournamentStateOnce()
  );
}
async function fbUpdateSettings(e, t, a, n, o, r) {
  return (
    assertAdmin(),
    await fbDb.runTransaction(async (a) => {
      const s = await a.get(fbRoomRef);
      if (!s.exists) throw new Error("Todavía no creaste un torneo");
      const l = s.data(),
        i = n || {
          minutes: l.meta.timeControlMinutes || 0,
          increment: l.meta.timeControlIncrement || 0,
        };
      a.update(fbRoomRef, {
        meta: {
          ...l.meta,
          name: e || l.meta.name,
          totalRounds: t || null,
          adminEmails: [TOURNAMENT_ADMIN_EMAIL],
          timeControlMinutes: i.minutes > 0 ? i.minutes : 0,
          timeControlIncrement: i.increment > 0 ? i.increment : 0,
          roundApprovalMode: "auto" === o ? "auto" : "manual",
          woGraceMinutes:
            void 0 === r
              ? l.meta.woGraceMinutes || 0
              : Number(r) > 0
                ? Number(r)
                : 0,
        },
      });
    }),
    getTournamentStateOnce()
  );
}
async function fbMakeMove(e, t, a, n, o, r, s, l, i) {
  ((e = Number(e)), (t = Number(t)));
  const c = syncedNow_(),
    d = Math.min(l || c, c),
    u = gamesCollectionRef.doc(gameDocId_(e, t)),
    m =
      lastRoundGames.find((a) => a.round === e && a.board === t) ||
      (tournamentCurrentGameRow &&
      tournamentCurrentGameRow.round === e &&
      tournamentCurrentGameRow.board === t
        ? tournamentCurrentGameRow
        : null);
  if (m && !i) {
    if ("finished" === m.status) throw new Error("Esa partida ya terminó");
    if ("suspended" === m.status)
      throw new Error("Esta partida está suspendida por el árbitro");
    const l = m.clock && a !== m.fen;
    if (l) {
      const e = m.joined || { w: !1, b: !1 };
      if (!e.w || !e.b)
        throw new Error("Todavía no entraron los dos jugadores a la partida");
    }
    const i = { fen: a, lastMoveSan: n || "" };
    l && n && (i.moves = (m.moves || []).concat(n));
    if ((r && (i.lastFrom = r), s && (i.lastTo = s), l)) {
      const e = new Chess(m.fen).turn(),
        t = m.turnStartAt
          ? Math.max(0, Math.floor((d - getTimestampMs(m.turnStartAt)) / 1e3))
          : 0,
        a = { ...m.clock, [e]: Math.max(0, m.clock[e] - t) };
      (!o && m.increment && (a[e] += m.increment),
        (i.clock = a),
        (i.turnStartAt = d));
    }
    (o && ((i.status = "finished"), (i.result = o)), await u.update(i));
    const c = { ...m, ...i };
    if ((l && (c.turnStartAt = d), !o)) return { gameRow: c };
    const p = await fbSubmitResult(e, t, o);
    return ((p.gameRow = c), p);
  }
  let p = null;
  if (
    (await fbDb.runTransaction(async (e) => {
      const t = await e.get(u),
        l = t.exists && !(!t.data().clock || a === t.data().fen);
      if (!t.exists) throw new Error("No se encontró esa partida");
      const i = { ...t.data() };
      if ("finished" === i.status) throw new Error("Esa partida ya terminó");
      if ("suspended" === i.status)
        throw new Error("Esta partida está suspendida por el árbitro");
      if (l) {
        const e = i.joined || { w: !1, b: !1 };
        if (!e.w || !e.b)
          throw new Error("Todavía no entraron los dos jugadores a la partida");
      }
      if (l) {
        const e = new Chess(i.fen).turn(),
          t = i.turnStartAt
            ? Math.max(0, Math.floor((d - getTimestampMs(i.turnStartAt)) / 1e3))
            : 0;
        ((i.clock = { ...i.clock, [e]: Math.max(0, i.clock[e] - t) }),
          !o &&
            i.increment &&
            (i.clock = { ...i.clock, [e]: i.clock[e] + i.increment }),
          (i.turnStartAt = d));
      }
      ((i.fen = a),
        (i.lastMoveSan = n || ""),
        l && n && (i.moves = (i.moves || []).concat(n)),
        r && (i.lastFrom = r),
        s && (i.lastTo = s),
        o && ((i.status = "finished"), (i.result = o)),
        e.update(u, i),
        (p = i),
        l && (p.turnStartAt = d));
    }),
    !o)
  )
    return { gameRow: p };
  const g = await fbSubmitResult(e, t, o);
  return ((g.gameRow = p), g);
}
async function fbMarkJoined(e, t, a) {
  ((e = Number(e)), (t = Number(t)));
  const n = gamesCollectionRef.doc(gameDocId_(e, t));
  await fbDb.runTransaction(async (e) => {
    const t = await e.get(n);
    if (!t.exists) return;
    const o = t.data(),
      r = o.joined || { w: !1, b: !1 },
      s = { ...r, [a]: !0 },
      l = r.w && r.b,
      i = s.w && s.b;
    if (r[a])
      return void (
        o.clock &&
        "ongoing" === o.status &&
        i &&
        !o.turnStartAt &&
        e.update(n, { turnStartAt: syncedNow_() })
      );
    const c = { joined: s };
    (o.clock &&
      "ongoing" === o.status &&
      i &&
      (!l || !o.turnStartAt) &&
      (c.turnStartAt = syncedNow_()),
      e.update(n, c));
  });
}
async function fbResetAll() {
  assertAdmin();
  const e = (await gamesCollectionRef.get()).docs;
  for (let t = 0; t < e.length; t += 400) {
    const a = fbDb.batch();
    (e.slice(t, t + 400).forEach((e) => a.delete(e.ref)), await a.commit());
  }
  if (announcementsCollectionRef) {
    const e = (await announcementsCollectionRef.get()).docs;
    for (let t = 0; t < e.length; t += 400) {
      const a = fbDb.batch();
      (e.slice(t, t + 400).forEach((e) => a.delete(e.ref)), await a.commit());
    }
  }
  return (
    await fbRoomRef.set({
      meta: {
        name: "",
        round: 0,
        status: "setup",
        adminEmails: [],
        totalRounds: null,
      },
      players: [],
      pairings: [],
    }),
    getTournamentStateOnce()
  );
}
function playerStatusLabel_(e) {
  return "pending" === e
    ? "⏳ Pendiente de autorización"
    : "withdrawn" === e
      ? "🚪 Retirado"
      : "disqualified" === e
        ? "⛔ Descalificado"
        : "✅ Activo";
}
function resultLabel(e) {
  return "1-0" === e
    ? "1 - 0"
    : "0-1" === e
      ? "0 - 1"
      : "1/2-1/2" === e
        ? "½ - ½"
        : "wo-black" === e
          ? "WO Blancas (1-0)"
          : "wo-white" === e
            ? "WO Negras (0-1)"
            : "";
}
let _rankPlayersCache_ = { players: null, pairings: null, result: null };
function rankPlayers_(e, t) {
  if (_rankPlayersCache_.players === e && _rankPlayersCache_.pairings === t)
    return _rankPlayersCache_.result;
  const a = rankPlayersCompute_(e, t);
  return ((_rankPlayersCache_ = { players: e, pairings: t, result: a }), a);
}
function rankPlayersCompute_(e, t) {
  const a = {};
  e.forEach((e) => (a[e.id] = e));
  const n = {};
  return (
    e.forEach((e) => (n[e.id] = { w: 0, d: 0, l: 0 })),
    (t || []).forEach((e) => {
      e.result &&
        n[e.whiteId] &&
        ("" !== e.blackId
          ? n[e.blackId] &&
            ("1-0" === e.result || "wo-black" === e.result
              ? ((n[e.whiteId].w += 1), (n[e.blackId].l += 1))
              : "0-1" === e.result || "wo-white" === e.result
                ? ((n[e.whiteId].l += 1), (n[e.blackId].w += 1))
                : "1/2-1/2" === e.result &&
                  ((n[e.whiteId].d += 1), (n[e.blackId].d += 1)))
          : (n[e.whiteId].w += 1));
    }),
    e
      .map((e) => {
        const t = (e.played || []).reduce(
          (e, t) => e + (a[t] ? a[t].points : 0),
          0,
        );
        return {
          ...e,
          _buchholz: Math.round(100 * t) / 100,
          _record: n[e.id] || { w: 0, d: 0, l: 0 },
        };
      })
      .sort((e, t) =>
        t.points !== e.points
          ? t.points - e.points
          : t._buchholz !== e._buchholz
            ? t._buchholz - e._buchholz
            : e.name.localeCompare(t.name),
      )
  );
}
async function fbRecalculatePositions() {
  return (
    assertReferee(),
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) throw new Error("Todavía no creaste un torneo");
      const a = t.data(),
        n = (a.players || []).map((e) => ({
          ...e,
          points: 0,
          byes: 0,
          played: [],
          colorBalance: 0,
        })),
        o = {};
      (n.forEach((e) => (o[e.id] = e)),
        (a.pairings || [])
          .slice()
          .sort((e, t) => e.round - t.round || e.board - t.board)
          .forEach((e) => {
            const t = o[e.whiteId];
            if (!t) return;
            if ("" === e.blackId)
              return void (e.result && ((t.byes += 1), (t.points += 1)));
            const a = o[e.blackId];
            a &&
              (-1 === t.played.indexOf(a.id) && t.played.push(a.id),
              -1 === a.played.indexOf(t.id) && a.played.push(t.id),
              (t.colorBalance += 1),
              (a.colorBalance -= 1),
              applyResultToPlayers_(t, a, e.result, 1));
          }),
        e.update(fbRoomRef, { players: n }));
    }),
    getTournamentStateOnce()
  );
}
function printCurrentRoundPairings(e) {
  const t = e.pairings
      .filter((t) => t.round === e.meta.round)
      .slice()
      .sort((e, t) => e.board - t.board)
      .map(
        (e) =>
          `\n              <tr>\n                <td>${e.board}</td>\n                <td>${escapeHtml_(e.whiteName)}</td>\n                <td>${"" === e.blackId ? "— (BYE)" : escapeHtml_(e.blackName)}</td>\n                <td>${"" === e.blackId ? "1 - 0" : ""}</td>\n              </tr>`,
      )
      .join(""),
    a = `<!DOCTYPE html>\n<html lang="es"><head><meta charset="utf-8">\n<title>Emparejamientos — ${escapeHtml_(e.meta.name)} — Ronda ${e.meta.round}</title>\n<style>\n  body { font-family: Arial, sans-serif; padding: 24px; color: #111; }\n  h1 { font-size: 20px; margin: 0 0 4px; }\n  h2 { font-size: 15px; margin: 0 0 18px; font-weight: normal; color: #444; }\n  table { width: 100%; border-collapse: collapse; }\n  th, td { border: 1px solid #999; padding: 8px 10px; text-align: left; font-size: 14px; }\n  th { background: #eee; }\n  td:first-child, th:first-child { width: 60px; text-align: center; }\n  td:last-child, th:last-child { width: 110px; text-align: center; }\n</style>\n</head><body>\n  <h1>${escapeHtml_(e.meta.name)}</h1>\n  <h2>Emparejamientos — Ronda ${e.meta.round}</h2>\n  <table>\n    <thead><tr><th>Mesa</th><th>Blancas</th><th>Negras</th><th>Resultado</th></tr></thead>\n    <tbody>${t}</tbody>\n  </table>\n</body></html>`,
    n = window.open("", "_blank");
  n
    ? (n.document.open(),
      n.document.write(a),
      n.document.close(),
      n.focus(),
      (n.onload = () => n.print()),
      setTimeout(() => {
        try {
          n.print();
        } catch (e) {}
      }, 300))
    : toast(
        "❌ El navegador bloqueó la ventana de impresión. Habilitá pop-ups para este sitio.",
      );
}
function pdfEnsureSpace_(e, t, a) {
  return t > 280 ? (e.addPage(), a) : t;
}
function pdfDrawStandingsTable_(e, t, a, n, o) {
  const r = [
    { label: "#", w: 10 },
    { label: "Jugador", w: o ? 58 : 70 },
    { label: "Puntos", w: 20 },
    { label: "Buchholz", w: 22 },
    { label: "V-E-D", w: 24 },
    { label: "Partidas", w: 20 },
  ];
  (o && r.push({ label: "Estado", w: 30 }),
    e.setFontSize(10),
    e.setFont(void 0, "bold"));
  let s = t;
  return (
    r.forEach((t) => {
      (e.text(t.label, s, a), (s += t.w));
    }),
    e.setFont(void 0, "normal"),
    (a += 4),
    e.line(t, a, s, a),
    (a += 6),
    n.forEach((n, l) => {
      a = pdfEnsureSpace_(e, a, 18);
      const i = [
        String(l + 1),
        n.name,
        String(n.points),
        String(n._buchholz),
        `${n._record.w}-${n._record.d}-${n._record.l}`,
        String(n.played.length),
      ];
      (o && i.push(playerStatusLabel_(n.status).replace(/^[^\s]+\s/, "")),
        (s = t),
        i.forEach((t, n) => {
          (e.text(String(t), s, a), (s += r[n].w));
        }),
        (a += 7));
    }),
    a
  );
}
function explainTopThree_(e) {
  const t = ["1° puesto", "2° puesto", "3° puesto"],
    a = [];
  return (
    e.slice(0, 3).forEach((n, o) => {
      const r = e[o + 1];
      let s;
      ((s = r
        ? n.points !== r.points
          ? `Se ubica por encima de ${r.name} por haber sumado más puntos en el torneo (${n.points} vs ${r.points}).`
          : n._buchholz !== r._buchholz
            ? `Empató en puntos con ${r.name} (${n.points} c/u), pero lo superó por desempate Buchholz (${n._buchholz} vs ${r._buchholz}). El Buchholz suma los puntos totales que obtuvieron los rivales a los que se enfrentó cada jugador: enfrentar rivales que a su vez sumaron más puntos favorece este desempate.`
            : `Empató en puntos y en Buchholz con ${r.name} (${n.points} pts, Buchholz ${n._buchholz}). Al no haber diferencia en ningún desempate calculado, el orden entre ambos se definió de forma nominal (orden alfabético), por lo que en la práctica comparten esta posición.`
        : "Único jugador en esta posición."),
        a.push({
          title: `${t[o]}: ${n.name} — ${n.points} puntos, Buchholz ${n._buchholz} (${n._record.w}V ${n._record.d}E ${n._record.l}D)`,
          body: s,
        }));
    }),
    a
  );
}
function pdfDrawTopThreeExplanation_(e, t, a, n) {
  if (!n.length) return a;
  ((a = pdfEnsureSpace_(e, a, 18)),
    e.setFontSize(13),
    e.text("Cómo se determinó el podio (1°, 2° y 3° puesto)", t, a),
    (a += 8));
  const o = explainTopThree_(n);
  return (
    e.setFontSize(10),
    o.forEach((n) => {
      ((a = pdfEnsureSpace_(e, a, 18)),
        e.setFont(void 0, "bold"),
        e.splitTextToSize(n.title, 180).forEach((n) => {
          ((a = pdfEnsureSpace_(e, a, 18)), e.text(n, t, a), (a += 5));
        }),
        e.setFont(void 0, "normal"),
        e.splitTextToSize(n.body, 180).forEach((n) => {
          ((a = pdfEnsureSpace_(e, a, 18)), e.text(n, t, a), (a += 5));
        }),
        (a += 3));
    }),
    a
  );
}
function pdfDrawPairingsTable_(e, t, a, n) {
  const o = [
    { label: "Mesa", w: 16 },
    { label: "Blancas", w: 60 },
    { label: "Negras", w: 60 },
    { label: "Resultado", w: 30 },
  ];
  (e.setFontSize(10), e.setFont(void 0, "bold"));
  let r = t;
  return (
    o.forEach((t) => {
      (e.text(t.label, r, a), (r += t.w));
    }),
    e.setFont(void 0, "normal"),
    (a += 4),
    e.line(t, a, r, a),
    (a += 6),
    n
      .slice()
      .sort((e, t) => e.board - t.board)
      .forEach((n) => {
        a = pdfEnsureSpace_(e, a, 18);
        const s = [
          String(n.board),
          n.whiteName,
          "" === n.blackId ? "— (BYE)" : n.blackName,
          n.result ? resultLabel(n.result) : "—",
        ];
        ((r = t),
          s.forEach((t, n) => {
            (e.text(t, r, a), (r += o[n].w));
          }),
          (a += 7));
      }),
    a
  );
}
let jsPdfLoadPromise_ = null;
function ensureJsPdfLoaded_() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(!0);
  if (jsPdfLoadPromise_) return jsPdfLoadPromise_;
  return (
    (jsPdfLoadPromise_ = new Promise((e, t) => {
      const a = document.createElement("script");
      ((a.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
        (a.async = !0),
        (a.onload = () => e(!0)),
        (a.onerror = () => t(new Error("No se pudo cargar jsPDF."))),
        document.head.appendChild(a));
    }).catch((e) => {
      throw ((jsPdfLoadPromise_ = null), e);
    })),
    jsPdfLoadPromise_
  );
}
async function exportStandingsPDF(e) {
  try {
    await ensureJsPdfLoaded_();
  } catch (e) {
    return void toast(
      "❌ No se pudo cargar la librería de PDF. Revisá tu conexión e intentá de nuevo.",
    );
  }
  const t = rankPlayers_(e.players, e.pairings),
    a = new window.jspdf.jsPDF();
  let n = 18;
  (a.setFontSize(16),
    a.text(e.meta.name || "Torneo", 14, n),
    (n += 7),
    a.setFontSize(11),
    a.text(`Tabla de posiciones — Ronda ${e.meta.round}`, 14, n),
    (n += 10),
    pdfDrawStandingsTable_(a, 14, n, t, !1));
  const o = (e.meta.name || "torneo")
    .replace(/[^a-z0-9]+/gi, "_")
    .toLowerCase();
  a.save(`posiciones_${o}_ronda${e.meta.round}.pdf`);
}
async function exportFullTournamentPDF(e) {
  try {
    await ensureJsPdfLoaded_();
  } catch (e) {
    return void toast(
      "❌ No se pudo cargar la librería de PDF. Revisá tu conexión e intentá de nuevo.",
    );
  }
  const t = new window.jspdf.jsPDF(),
    a = 14;
  let n = 18;
  (t.setFontSize(18),
    t.text(e.meta.name || "Torneo", a, n),
    (n += 9),
    t.setFontSize(11));
  const o = new Date().toLocaleString("es-AR"),
    r = "finished" === e.meta.status ? "Finalizado" : "En curso",
    s = e.meta.totalRounds ? ` de ${e.meta.totalRounds}` : "",
    l =
      e.meta.timeControlMinutes > 0
        ? `${e.meta.timeControlMinutes} min` +
          (e.meta.timeControlIncrement > 0
            ? ` + ${e.meta.timeControlIncrement}s`
            : "")
        : "Sin reloj";
  if (
    ([
      `Estado: ${r}`,
      `Ronda actual: ${e.meta.round}${s}`,
      `Jugadores: ${e.players.length}`,
      `Control de tiempo: ${l}`,
      `Reporte generado: ${o}`,
    ].forEach((e) => {
      (t.text(e, a, n), (n += 6));
    }),
    (n += 4),
    "finished" === e.meta.status)
  ) {
    const o = rankPlayers_(e.players, e.pairings),
      r = o.length ? o[0].points : 0,
      s = o.length ? o[0]._buchholz : 0,
      l = o.filter((e) => e.points === r && e._buchholz === s);
    (t.setFont(void 0, "bold"),
      t.text(
        "Campeón: " +
          (l.length > 1
            ? l.map((e) => e.name).join(", ") + " (empate)"
            : l[0]
              ? l[0].name
              : "—"),
        a,
        n,
      ),
      t.setFont(void 0, "normal"),
      (n += 10));
  }
  ((n = pdfEnsureSpace_(t, n, 18)),
    t.setFontSize(13),
    t.text("Tabla de posiciones", a, n),
    (n += 8));
  const i = rankPlayers_(e.players, e.pairings);
  ((n = pdfDrawStandingsTable_(t, a, n, i, !0)),
    (n += 6),
    (n = pdfEnsureSpace_(t, n + 4, 18)),
    (n = pdfDrawTopThreeExplanation_(t, a, n, i)),
    (n += 4));
  const c = e.pairings.reduce((e, t) => Math.max(e, t.round), 0);
  for (let o = 1; o <= c; o++) {
    const r = e.pairings.filter((e) => e.round === o);
    0 !== r.length &&
      ((n = pdfEnsureSpace_(t, n + 4, 18)),
      t.setFontSize(13),
      t.text(`Ronda ${o}`, a, n),
      (n += 8),
      (n = pdfDrawPairingsTable_(t, a, n, r)),
      (n += 6));
  }
  ((n = pdfEnsureSpace_(t, n + 4, 18)),
    t.setFontSize(13),
    t.text("Jugadores inscriptos", a, n),
    (n += 8),
    t.setFontSize(10),
    t.setFont(void 0, "bold"),
    ["Jugador", "Email", "Estado"].forEach((e, o) => {
      t.text(e, a + [0, 80, 150][o], n);
    }),
    t.setFont(void 0, "normal"),
    (n += 4),
    t.line(a, n, 194, n),
    (n += 6),
    e.players.forEach((e) => {
      ((n = pdfEnsureSpace_(t, n, 18)),
        t.text(e.name, a, n),
        t.text(e.email || "—", 94, n),
        t.text(playerStatusLabel_(e.status).replace(/^[^\s]+\s/, ""), 164, n),
        (n += 7));
    }));
  const d = (e.meta.name || "torneo")
    .replace(/[^a-z0-9]+/gi, "_")
    .toLowerCase();
  t.save(`torneo_completo_${d}_ronda${e.meta.round}.pdf`);
}
