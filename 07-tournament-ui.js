/* Tournament timers, rendering, public screen, and result UI. Generated from the verified legacy bundle. */
let tournamentAutoApproveTimer = null;
function stopAutoApproveTimer() {
  (clearInterval(tournamentAutoApproveTimer),
    (tournamentAutoApproveTimer = null));
}
let tournamentWOGraceTimer = null,
  alertedDoubleNoShowBoards_ = new Set();
function checkDoubleNoShowBoards_(e) {
  const t = Number(e.meta.woGraceMinutes) || 0;
  if (!t) return;
  const a = 6e4 * t,
    n = syncedNow_(),
    o = e.meta.round,
    r = new Map();
  (lastRoundGames.forEach((e) => r.set(e.board, e)),
    e.pairings
      .filter((e) => e.round === o && "" !== e.blackId && !e.result)
      .forEach((e) => {
        const t = r.get(e.board),
          s = (t && t.joined) || { w: !1, b: !1 },
          l = o + "_" + e.board;
        t &&
        "ongoing" === t.status &&
        t.startedAt &&
        !s.w &&
        !s.b &&
        n - t.startedAt >= a
          ? alertedDoubleNoShowBoards_.has(l) ||
            (alertedDoubleNoShowBoards_.add(l),
            toast(
              `🔴 Mesa #${e.board}: ni ${e.whiteName} ni ${e.blackName} se presentaron. No se declaró WO automático — revisalo a mano.`,
            ))
          : alertedDoubleNoShowBoards_.delete(l);
      }));
}
function stopWOGraceTimer() {
  (clearInterval(tournamentWOGraceTimer), (tournamentWOGraceTimer = null));
}
function startWOGraceTimerIfNeeded(e) {
  const t = Number(e.meta.woGraceMinutes) || 0;
  if (
    !(
      isCurrentUserReferee() &&
      t > 0 &&
      "active" === e.meta.status &&
      "playing" === e.meta.roundStatus
    )
  )
    return void stopWOGraceTimer();
  if (tournamentWOGraceTimer) return;
  const a = async () => {
    try {
      const e = await fbAutoDeclareForfeits();
      e &&
        e.length > 0 &&
        e.forEach((e) => {
          toast(
            `⏱️ WO automático — mesa #${e.board}: gana ${e.winner} (${e.absent} no se presentó a tiempo)`,
          );
        });
    } catch (e) {}
    try {
      lastTournamentState && checkDoubleNoShowBoards_(lastTournamentState);
    } catch (e) {}
  };
  (a(), (tournamentWOGraceTimer = setInterval(a, 15e3)));
}
function renderApprovalPanel(e, t, a) {
  const n = document.getElementById("tournament-approval-panel"),
    o = document.getElementById("tournament-approval-status"),
    r = document.getElementById("tournament-approval-admin-controls"),
    s = document.getElementById("tournament-auto-approve-box"),
    l = isCurrentUserReferee(),
    i = "closed" === e.meta.roundStatus;
  if (!a) {
    ((n.style.display = "none"), stopAutoApproveTimer());
    const e = document.getElementById("tournament-referee-round-controls");
    return void (e && (e.style.display = "none"));
  }
  ((n.style.display = ""),
    (r.style.display = t && !i ? "" : "none"),
    (o.textContent = i
      ? "El árbitro ya cerró esta ronda: los resultados quedaron bloqueados y solo él puede corregirlos. Falta generar la ronda siguiente."
      : t
        ? "Ya están cargados todos los resultados de esta ronda. Revisá la tabla de posiciones y los resultados abajo; podés corregir cualquier resultado antes de aprobar."
        : "Ya terminaron todas las partidas de esta ronda. Falta que el administrador la revise y apruebe para que se genere la ronda siguiente."));
  const c = document.getElementById("tournament-referee-round-controls");
  if (c) {
    c.style.display = l ? "" : "none";
    const t = document.getElementById("tournament-close-round-btn"),
      a = document.getElementById("tournament-generate-round-btn");
    (t && (t.style.display = i ? "none" : ""),
      a && (a.style.display = i ? "" : "none"));
    const n = document.getElementById("tournament-manual-bye-box"),
      o = document.getElementById("tournament-manual-bye-select");
    if (n && o) {
      const t = e.players.filter((e) => "active" === (e.status || "active")),
        a = i && l && t.length % 2 == 1;
      if (((n.style.display = a ? "" : "none"), a)) {
        const a = rankPlayers_(t, e.pairings),
          n = o.value;
        ((o.innerHTML =
          '<option value="">Automático (por defecto)</option>' +
          a
            .map(
              (e) =>
                `<option value="${e.id}">${escapeHtml_(e.name)} — ${e.points} pts${e.byes ? " · ya tuvo BYE" : ""}</option>`,
            )
            .join("")),
          a.some((e) => e.id === n) && (o.value = n));
      }
    }
  }
  const d =
    "auto" === e.meta.roundApprovalMode && !e.meta.autoApprovalCancelled;
  if (!t || !d || i)
    return ((s.style.display = "none"), void stopAutoApproveTimer());
  if (((s.style.display = ""), tournamentAutoApproveTimer)) return;
  const u = document.getElementById("tournament-auto-approve-countdown"),
    m = async () => {
      const e = lastTournamentState;
      if (!e) return;
      const t = e.meta;
      if (
        "active" !== t.status ||
        "pending_approval" !== t.roundStatus ||
        "auto" !== t.roundApprovalMode ||
        t.autoApprovalCancelled
      )
        return (stopAutoApproveTimer(), void renderTournamentState(e));
      const a = (t.pendingApprovalAt || syncedNow_()) + 3e4,
        n = Math.max(0, Math.ceil((a - syncedNow_()) / 1e3));
      if (((u.textContent = `⏱️ Se va a aprobar sola en ${n}s...`), n <= 0)) {
        stopAutoApproveTimer();
        try {
          (await fbApproveRound(),
            toast(
              "✅ Ronda aprobada automáticamente: se generó la ronda siguiente.",
            ));
        } catch (e) {
          /pendiente de aprobación/.test(e.message) ||
            toast(
              "❌ No se pudo aprobar la ronda automáticamente: " + e.message,
            );
        }
      }
    };
  (m(), (tournamentAutoApproveTimer = setInterval(m, 500)));
}
function renderSelfRegisterCard(e, t) {
  const a = document.getElementById("tournament-self-register-card");
  if (!a) return;
  if (!currentUser || t) return void (a.style.display = "none");
  a.style.display = "";
  const n = document.getElementById("tournament-self-register-form"),
    o = document.getElementById("tournament-self-register-status"),
    r = e.players.find(
      (e) => (e.email || "").toLowerCase() === currentUser.email,
    );
  if (r)
    ((n.style.display = "none"),
      (o.style.display = ""),
      (o.textContent = `✓ Ya estás inscripto como "${r.name}" (${playerStatusLabel_(r.status)}).`));
  else {
    ((n.style.display = "flex"), (o.style.display = "none"));
    const e = document.getElementById("tournament-self-register-name");
    e.value || (e.value = currentUser.displayName || "");
  }
}
let pairingsDelegationSetup_ = !1;
function setupPairingsListDelegation_(e) {
  pairingsDelegationSetup_ ||
    ((pairingsDelegationSetup_ = !0),
    e.addEventListener("click", (t) => {
      const a = t.target.closest("button[data-play-round]");
      if (a)
        return void enterTournamentMatch(
          Number(a.dataset.playRound),
          Number(a.dataset.playBoard),
          a.dataset.white,
          a.dataset.black,
          a.dataset.whiteEmail,
          a.dataset.blackEmail,
        );
      const n = t.target.closest("button[data-result]");
      if (n)
        return void (async () => {
          if (!tournamentBusy) {
            tournamentBusy = !0;
            try {
              if ("1" !== e.dataset.isAdmin && !isCurrentUserReferee())
                throw new Error("No tenés permiso para cargar resultados");
              const t = n.dataset.result;
              if (
                ("wo-black" === t || "wo-white" === t) &&
                !confirm(
                  "¿Confirmás declarar esta partida como W.O. (incomparecencia)?",
                )
              )
                return void (tournamentBusy = !1);
              const a =
                  lastTournamentState &&
                  "pending_approval" === lastTournamentState.meta.roundStatus,
                o = await fbSubmitResult(n.dataset.round, n.dataset.board, t);
              a || "pending_approval" !== o.meta.roundStatus
                ? a ||
                  "finished" !== o.meta.status ||
                  toast("🏁 Se jugaron todas las rondas: el torneo terminó.")
                : toast(
                    "✅ Ya están todos los resultados de la ronda. Revisá y aprobá la siguiente ronda.",
                  );
            } catch (e) {
              toast("❌ No se pudo cargar el resultado: " + e.message);
            } finally {
              tournamentBusy = !1;
            }
          }
        })();
      const o = t.target.closest("button[data-suspend-round]");
      o &&
        (async () => {
          if (!tournamentBusy) {
            tournamentBusy = !0;
            try {
              const e = "suspend" === o.dataset.suspendAction;
              (await fbSetGameSuspended(
                o.dataset.suspendRound,
                o.dataset.suspendBoard,
                e,
              ),
                toast(e ? "⏸️ Partida suspendida" : "▶️ Partida reanudada"));
            } catch (e) {
              showError(e);
            } finally {
              tournamentBusy = !1;
            }
          }
        })();
    }));
}
function renderTournamentState(e) {
  const t = document.getElementById("tournament-setup-box"),
    a = document.getElementById("tournament-active-box");
  if ((updateModeBadge(), !currentUser))
    return (
      (t.style.display = "none"),
      (a.style.display = "none"),
      void stopWOGraceTimer()
    );
  if (!e || ("active" !== e.meta.status && "finished" !== e.meta.status))
    return (
      (t.style.display = isCurrentUserAdmin(e) ? "" : "none"),
      (a.style.display = "none"),
      void stopWOGraceTimer()
    );
  ((t.style.display = "none"),
    (a.style.display = ""),
    startWOGraceTimerIfNeeded(e));
  const n = isCurrentUserAdmin(e),
    o = "finished" === e.meta.status,
    r =
      !o &&
      ("pending_approval" === e.meta.roundStatus ||
        "closed" === e.meta.roundStatus),
    s = e.meta.totalRounds ? ` de ${e.meta.totalRounds}` : "";
  ((document.getElementById("tournament-title-display").textContent =
    "🏆 " + e.meta.name),
    (document.getElementById("tournament-round-display").textContent = o
      ? `Torneo finalizado — ronda ${e.meta.round}${s} — ${e.players.length} jugadores`
      : r
        ? `Ronda ${e.meta.round}${s} — ${"closed" === e.meta.roundStatus ? "🔒 Cerrada, falta generar la siguiente" : "⏳ Pendiente de aprobación"} — ${e.players.length} jugadores`
        : `Ronda ${e.meta.round}${s} — ${e.players.length} jugadores`));
  const l = document.getElementById("tournament-pending-badge"),
    i = e.players.filter((e) => "pending" === (e.status || "active")).length;
  l &&
    ((n || isCurrentUserReferee()) && i > 0
      ? ((l.textContent = `🔔 ${i} inscripción${1 === i ? "" : "es"} pendiente${1 === i ? "" : "s"}`),
        (l.style.display = ""),
        (l.style.cursor = "pointer"),
        (l.title = "Ir a las inscripciones pendientes"))
      : (l.style.display = "none"));
  const c = document.getElementById("tournament-announcement-composer");
  c && (c.style.display = n || isCurrentUserReferee() ? "" : "none");
  const d = document.getElementById("tournament-round-countdown-composer");
  (d && (d.style.display = n || isCurrentUserReferee() ? "" : "none"),
    renderRoundCountdown_(e),
    (document.getElementById("tournament-admin-panel").style.display = n
      ? ""
      : "none"),
    (document.getElementById("tournament-next-round-btn").style.display =
      o || 0 !== e.meta.round ? "none" : ""),
    (document.getElementById("tournament-finish-btn").style.display = o
      ? "none"
      : ""),
    (document.getElementById("tournament-reopen-btn").style.display = o
      ? ""
      : "none"),
    n ||
      (document.getElementById("tournament-settings-panel").style.display =
        "none"),
    renderSelfRegisterCard(e, o),
    renderApprovalPanel(e, n, r));
  const u = document.getElementById("tournament-champion-banner");
  if (o) {
    const t = rankPlayers_(e.players, e.pairings),
      a = t.length ? t[0].points : 0,
      n = t.length ? t[0]._buchholz : 0,
      o = t.filter((e) => e.points === a && e._buchholz === n);
    ((document.getElementById("tournament-champion-text").textContent =
      o.length > 1
        ? "Empate en el primer puesto: " + o.map((e) => e.name).join(", ")
        : "Campeón: " + (o[0] ? o[0].name : "—")),
      (u.style.display = ""));
  } else u.style.display = "none";
  const m =
      currentUser && currentUser.email ? currentUser.email.toLowerCase() : "",
    p = isCurrentUserReferee(),
    g = e.pairings.filter((t) => t.round === e.meta.round),
    f = document.getElementById("tournament-pairings-list"),
    h = lastRoundGames;
  (setupPairingsListDelegation_(f),
    (f.dataset.isAdmin = n ? "1" : "0"),
    (f.dataset.isReferee = p ? "1" : "0"));
  const y = g.slice().sort((e, t) => e.board - t.board),
    b = new Set(),
    v = new Map();
  h.forEach((e) => v.set(e.round + "_" + e.board, e));
  const E = new Map();
  (Array.from(f.children).forEach((e) => {
    e.dataset && null != e.dataset.boardKey && E.set(e.dataset.boardKey, e);
  }),
    y.forEach((t) => {
      b.add(String(t.board));
      const a = "" === t.blackId,
        o = a ? null : v.get(t.round + "_" + t.board) || null,
        r = JSON.stringify([t, o, n, p, m]);
      let s = E.get(String(t.board));
      if (s && s.dataset.sig === r) return;
      if (
        (s ||
          ((s = document.createElement("div")),
          (s.className = "pairing-card"),
          (s.dataset.boardKey = t.board),
          E.set(String(t.board), s),
          f.appendChild(s)),
        (s.dataset.sig = r),
        a)
      )
        return void (s.innerHTML = `\n              <div class="pairing-card-header">\n                <div class="pairing-card-board">Mesa ${t.board}</div>\n                <span class="pairing-status pairing-status-bye">⭐ Punto automático</span>\n              </div>\n              <div class="pairing-card-names">\n                <span class="pairing-side pairing-side-white">⚪ ${escapeHtml_(t.whiteName)}</span>\n                <span class="vs">—</span>\n                <span class="pairing-side-empty">Libre</span>\n              </div>\n              <div class="pairing-card-detail">Descansa esta ronda (bye, +1 punto)</div>\n            `);
      const l = !o || !o.clock || ((o.joined || {}).w && (o.joined || {}).b),
        i = Number(e.meta.woGraceMinutes) || 0,
        c = (o && o.joined) || { w: !1, b: !1 },
        d = o && "ongoing" === o.status && c.w !== c.b,
        u =
          i > 0 && d && o.startedAt
            ? (() => {
                const e = o.startedAt + 6e4 * i - syncedNow_(),
                  a = escapeHtml_(c.w ? t.blackName : t.whiteName);
                return e > 0
                  ? `⏱️ Esperando a ${a} — WO automático en ${Math.ceil(e / 6e4)} min`
                  : `⏱️ Tiempo de espera reglamentario cumplido para ${a}`;
              })()
            : "",
        g =
          o && "finished" !== o.status && "suspended" !== o.status && u
            ? u
            : o &&
                "finished" !== o.status &&
                "suspended" !== o.status &&
                o.lastMoveSan
              ? "Última jugada: " + o.lastMoveSan
              : "";
      let h, y;
      t.result
        ? ("pending_approval" !== e.meta.roundStatus || t.locked
            ? "wo-black" === t.result || "wo-white" === t.result
              ? ((h = "wo"), (y = "⚫ Incomparecencia"))
              : "1/2-1/2" === t.result
                ? ((h = "draw"), (y = "🔵 Tablas acordadas"))
                : ((h = "finished"), (y = "⚪ Finalizada"))
            : ((h = "pending"), (y = "🟣 Resultado pendiente de confirmar")),
          t.locked && (y += " 🔒"))
        : o && "suspended" === o.status
          ? ((h = "suspended"), (y = "⏸️ Suspendida"))
          : i > 0 &&
              o &&
              "ongoing" === o.status &&
              o.startedAt &&
              !c.w &&
              !c.b &&
              syncedNow_() - o.startedAt >= 6e4 * i
            ? ((h = "no-show"), (y = "🔴 Nadie se presentó"))
            : o && o.clock && !l
              ? ((h = "waiting"), (y = "🟡 Esperando jugadores"))
              : ((h = "playing"), (y = "🟢 En juego"));
      const w =
          o && o.clock
            ? `<div class="pairing-card-clock">⏱️ ${formatTime(o.clock.w)} — ${formatTime(o.clock.b)}</div>`
            : "",
        C =
          (t.whiteEmail && t.whiteEmail.toLowerCase() === m) ||
          (t.blackEmail && t.blackEmail.toLowerCase() === m),
        S = n || C,
        x = [
          ["1-0", "1-0"],
          ["1/2-1/2", "½-½"],
          ["0-1", "0-1"],
        ];
      p &&
        (x.push(["wo-black", "WO Blancas"]), x.push(["wo-white", "WO Negras"]));
      const I =
          (!n && !p) || (t.locked && !p)
            ? t.result
              ? `<span class="muted">${resultLabel(t.result)}${t.locked ? " 🔒" : ""}</span>`
              : ""
            : x
                .map(
                  ([e, a]) =>
                    `<button data-round="${t.round}" data-board="${t.board}" data-result="${e}" class="${t.result === e ? "selected" : ""}">${a}</button>`,
                )
                .join(""),
        T = `<button class="btn" data-play-round="${t.round}" data-play-board="${t.board}" data-white="${escapeHtml_(t.whiteName)}" data-black="${escapeHtml_(t.blackName)}" data-white-email="${escapeHtml_(t.whiteEmail || "")}" data-black-email="${escapeHtml_(t.blackEmail || "")}">${S ? "▶️ Jugar" : "👁️ Ver"}</button>`,
        k =
          p && o && "finished" !== o.status
            ? `<button class="btn" data-suspend-round="${t.round}" data-suspend-board="${t.board}" data-suspend-action="${"suspended" === o.status ? "resume" : "suspend"}">${"suspended" === o.status ? "▶️ Reanudar" : "⏸️ Suspender"}</button>`
            : "";
      s.innerHTML = `\n            <div class="pairing-card-header">\n              <div class="pairing-card-board">Mesa ${t.board}</div>\n              <span class="pairing-status pairing-status-${h}">${y}</span>\n            </div>\n            <div class="pairing-card-names">\n              <span class="pairing-side pairing-side-white">⚪ ${escapeHtml_(t.whiteName)}</span>\n              <span class="vs">vs</span>\n              <span class="pairing-side pairing-side-black">${escapeHtml_(t.blackName)} ⚫</span>\n            </div>\n            ${w}\n            ${g ? `<div class="pairing-card-detail">${g}</div>` : ""}\n            <div class="pairing-card-actions">\n              ${T}\n              ${k}\n              <div class="pairing-result-btns">${I}</div>\n            </div>\n          `;
    }),
    Array.from(f.children).forEach((e) => {
      e.dataset &&
        null != e.dataset.boardKey &&
        !b.has(e.dataset.boardKey) &&
        e.remove();
    }),
    y.forEach((e, t) => {
      const a = E.get(String(e.board));
      a && f.children[t] !== a && f.insertBefore(a, f.children[t] || null);
    }),
    renderStandingsAndPlayers_(e, n, p));
}
let standingsSignature_ = null;
function renderStandingsAndPlayers_(e, t, a) {
  const n = document.getElementById("tournament-standings-list"),
    o = rankPlayers_(e.players, e.pairings),
    r = JSON.stringify([o, a]);
  if (standingsSignature_ !== r) {
    standingsSignature_ = r;
    let e = o
      .map(
        (e, t) =>
          `\n              <tr>\n                <td>${t + 1}</td>\n                <td>${escapeHtml_(e.name)}</td>\n                <td>${e.points}</td>\n                <td>${e._buchholz}</td>\n                <td>${e._record.w}-${e._record.d}-${e._record.l}</td>\n                <td>${e.played.length}</td>\n                <td>${playerStatusLabel_(e.status)}</td>\n              </tr>`,
      )
      .join("");
    n.innerHTML = `\n            <table class="standings-table">\n              <thead><tr><th>#</th><th>Jugador</th><th>Puntos</th><th>Buchholz</th><th>V-E-D</th><th>Partidas</th><th>Estado</th></tr></thead>\n              <tbody>${e}</tbody>\n            </table>\n            <p class="muted" style="font-size: 12px; margin-top: 8px">\n              Buchholz = suma de puntos de los rivales que enfrentó cada jugador (desempate). V-E-D = victorias-empates-derrotas (el bye cuenta como victoria).\n            </p>\n          `;
  }
  const s = document.getElementById("tournament-referee-panel");
  s && (s.style.display = a ? "" : "none");
  const l = document.getElementById("tournament-referee-tools");
  (l && (l.style.display = a ? "flex" : "none"), renderPlayersPanel(e, t));
}
function escapePublicScreenHtml_(e) {
  return escapeHtml_(e);
}
function resultLabelForPairing_(e) {
  if (!e.result) return "";
  if ("" === e.blackId) return "BYE";
  switch (e.result) {
    case "1-0":
      return "1 - 0";
    case "0-1":
      return "0 - 1";
    case "1/2-1/2":
      return "½ - ½";
    case "wo-black":
      return "1 - 0 (WO)";
    case "wo-white":
      return "0 - 1 (WO)";
    default:
      return e.result;
  }
}
function publicScreenGameKey_(e) {
  return e.round + "-" + e.board;
}
function publicScreenLiveGameFor_(e) {
  return (
    lastRoundGames.find((t) => t.round === e.round && t.board === e.board) ||
    null
  );
}
const PUBLIC_SCREEN_START_FEN_ =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
function renderPublicScreenBoardInto_(e, t) {
  const a = fenBoardToMatrix(t);
  e.innerHTML = "";
  for (let t = 0; t < 8; t++)
    for (let n = 0; n < 8; n++) {
      const o = FILES[n] + (8 - t),
        r = document.createElement("div");
      ((r.className = "square " + ((t + n) % 2 ? "dark" : "light")),
        (r.dataset.square = o));
      const s = a[t][n];
      if (s) {
        const e = document.createElement("div");
        ((e.className =
          "piece " + ("w" === s.color ? "white-piece" : "black-piece")),
          (e.textContent = PIECES[s.color + s.type.toUpperCase()]),
          (e.dataset.piece = s.type.toUpperCase()),
          r.appendChild(e));
      }
      e.appendChild(r);
    }
}
function stopPublicScreenCycle_() {
  publicScreenCycleTimer_ &&
    (clearInterval(publicScreenCycleTimer_), (publicScreenCycleTimer_ = null));
}
function startPublicScreenCycleIfNeeded_() {
  publicScreenCycleTimer_ ||
    (publicScreenCycleTimer_ = setInterval(advancePublicScreenCycle_, 1e4));
}
function advancePublicScreenCycle_() {
  publicScreenActiveGames_.length <= 1 ||
    ((publicScreenCycleIndex_ =
      (publicScreenCycleIndex_ + 1) % publicScreenActiveGames_.length),
    renderPublicScreenActiveCard_());
}
function renderPublicScreenActiveCard_() {
  const e = document.getElementById("public-screen-active-tables");
  if (!e) return;
  const t = publicScreenActiveGames_;
  if (!t.length)
    return void (e.innerHTML =
      '<p class="public-screen-empty-note">No hay mesas en juego en este momento.</p>');
  publicScreenCycleIndex_ >= t.length && (publicScreenCycleIndex_ = 0);
  const a = t[publicScreenCycleIndex_],
    n =
      t.length > 1
        ? ` <span class="public-screen-cycle-counter">(${publicScreenCycleIndex_ + 1}/${t.length})</span>`
        : "";
  e.innerHTML = `\n          <div class="public-screen-active-row public-screen-active-row-cycle">\n            <span class="public-screen-board-badge">Mesa ${a.board}${n}</span>\n            <span class="public-screen-vs">${escapePublicScreenHtml_(a.whiteName)} vs ${escapePublicScreenHtml_(a.blackName)}</span>\n          </div>\n          <div class="public-screen-mini-board-wrap" id="public-screen-mini-board-wrap" title="Tocá para ver esta mesa en grande">\n            <div class="board public-screen-mini-board" id="public-screen-mini-board"></div>\n          </div>\n          <p class="public-screen-zoom-hint">🔍 Tocá el tablero para verlo en grande</p>\n          ${t.length > 1 ? '<div class="public-screen-cycle-progress"><div class="public-screen-cycle-progress-bar"></div></div>' : ""}\n        `;
  const o = publicScreenLiveGameFor_(a),
    r = (o && o.fen) || PUBLIC_SCREEN_START_FEN_,
    s = document.getElementById("public-screen-mini-board");
  s && renderPublicScreenBoardInto_(s, r);
  const l = document.getElementById("public-screen-mini-board-wrap");
  l && l.addEventListener("click", () => openPublicScreenZoom_(a));
}
function refreshPublicScreenActiveMiniBoard_() {
  const e = publicScreenActiveGames_;
  if (!e.length || publicScreenCycleIndex_ >= e.length) return;
  const t = e[publicScreenCycleIndex_],
    a = document.getElementById("public-screen-mini-board");
  if (!a) return;
  const n = publicScreenLiveGameFor_(t);
  renderPublicScreenBoardInto_(a, (n && n.fen) || PUBLIC_SCREEN_START_FEN_);
}
function openPublicScreenZoom_(e) {
  ((publicScreenZoomKey_ = publicScreenGameKey_(e)), stopPublicScreenCycle_());
  let t = document.getElementById("public-screen-zoom-backdrop");
  (t ||
    ((t = document.createElement("div")),
    (t.id = "public-screen-zoom-backdrop"),
    (t.innerHTML =
      '\n            <div id="public-screen-zoom-box">\n              <p class="public-screen-zoom-vs" id="public-screen-zoom-vs"></p>\n              <div class="public-screen-zoom-board-wrap">\n                <div class="board public-screen-zoom-board" id="public-screen-zoom-board"></div>\n              </div>\n              <div class="public-screen-zoom-actions">\n                <button class="btn" id="public-screen-zoom-fullscreen-btn">⛶ Pantalla completa</button>\n                <button class="btn" id="public-screen-zoom-close">Cerrar</button>\n              </div>\n            </div>'),
    document.body.appendChild(t),
    t.addEventListener("click", (e) => {
      e.target === t && closePublicScreenZoom_();
    }),
    document
      .getElementById("public-screen-zoom-close")
      .addEventListener("click", closePublicScreenZoom_),
    document
      .getElementById("public-screen-zoom-fullscreen-btn")
      .addEventListener("click", () => {
        document.fullscreenElement
          ? document.exitFullscreen()
          : t.requestFullscreen && t.requestFullscreen();
      })),
    (t.style.display = "flex"),
    renderPublicScreenZoomBoard_());
}
function closePublicScreenZoom_() {
  publicScreenZoomKey_ = null;
  const e = document.getElementById("public-screen-zoom-backdrop");
  (e &&
    (document.fullscreenElement === e &&
      document.exitFullscreen().catch(() => {}),
    (e.style.display = "none")),
    publicScreenActiveGames_.length > 1 && startPublicScreenCycleIfNeeded_());
}
function renderPublicScreenZoomBoard_() {
  if (!publicScreenZoomKey_) return;
  const e = document.getElementById("public-screen-zoom-backdrop"),
    t = publicScreenActiveGames_.find(
      (e) => publicScreenGameKey_(e) === publicScreenZoomKey_,
    );
  if (!t || !e) return void closePublicScreenZoom_();
  const a = document.getElementById("public-screen-zoom-vs");
  a && (a.textContent = `Mesa ${t.board} — ${t.whiteName} vs ${t.blackName}`);
  const n = publicScreenLiveGameFor_(t),
    o = (n && n.fen) || PUBLIC_SCREEN_START_FEN_,
    r = document.getElementById("public-screen-zoom-board");
  r && renderPublicScreenBoardInto_(r, o);
}
function renderPublicScreen(e) {
  const t = document.getElementById("public-screen-empty"),
    a = document.getElementById("public-screen-content");
  if (!t || !a) return;
  const n = !(
    !e ||
    ("active" !== e.meta.status && "finished" !== e.meta.status)
  );
  if (
    ((t.style.display = n ? "none" : ""),
    (a.style.display = n ? "" : "none"),
    !n)
  ) {
    (stopPublicScreenCycle_(), (publicScreenZoomKey_ = null));
    const e = document.getElementById("public-screen-zoom-backdrop");
    return (
      e && (e.style.display = "none"),
      void (publicScreenActiveGames_ = [])
    );
  }
  const o = "finished" === e.meta.status,
    r = e.meta.totalRounds ? ` de ${e.meta.totalRounds}` : "",
    s = JSON.stringify([e.players, e.pairings, e.meta]);
  if (a.dataset.sig === s) return;
  ((a.dataset.sig = s),
    (document.getElementById("public-screen-name").textContent =
      e.meta.name || "Torneo"),
    (document.getElementById("public-screen-round").textContent = o
      ? `🏁 Torneo finalizado — Ronda ${e.meta.round}${r}`
      : `Ronda ${e.meta.round}${r}`));
  const l = rankPlayers_(e.players, e.pairings),
    i = document.getElementById("public-screen-standings");
  if (l.length) {
    const e = l
      .map((e, t) => {
        const a = e._record || { w: 0, d: 0, l: 0 };
        return `\n                <tr>\n                  <td class="public-screen-rank">${t + 1}</td>\n                  <td>${escapePublicScreenHtml_(e.name)}</td>\n                  <td>${e.points}</td>\n                  <td>${e._buchholz}</td>\n                  <td>${a.w}/${a.d}/${a.l}</td>\n                </tr>`;
      })
      .join("");
    i.innerHTML = `\n            <table class="public-screen-table">\n              <thead>\n                <tr><th>#</th><th>Jugador</th><th>Pts</th><th>BH</th><th>V/E/D</th></tr>\n              </thead>\n              <tbody>${e}</tbody>\n            </table>`;
  } else
    i.innerHTML =
      '<p class="public-screen-empty-note">Todavía no hay jugadores.</p>';
  const c = e.pairings.filter((t) => t.round === e.meta.round),
    d = c
      .filter((e) => "" !== e.blackId && !e.result)
      .sort((e, t) => e.board - t.board),
    u = publicScreenActiveGames_[publicScreenCycleIndex_],
    m = u ? publicScreenGameKey_(u) : null;
  publicScreenActiveGames_ = d;
  const p = m ? d.findIndex((e) => publicScreenGameKey_(e) === m) : -1;
  ((publicScreenCycleIndex_ = -1 !== p ? p : 0),
    renderPublicScreenActiveCard_(),
    renderPublicScreenZoomBoard_(),
    d.length > 1 && !publicScreenZoomKey_
      ? startPublicScreenCycleIfNeeded_()
      : publicScreenZoomKey_ || stopPublicScreenCycle_());
  const g = document.getElementById("public-screen-recent-results");
  let f = c
    .filter((e) => e.result)
    .sort((e, t) => e.board - t.board)
    .slice();
  if (f.length < 8 && e.meta.round > 1) {
    const t = e.pairings
      .filter((t) => t.round === e.meta.round - 1 && t.result)
      .sort((e, t) => e.board - t.board);
    f = f.concat(t);
  }
  ((f = f.slice(0, 12)),
    f.length
      ? (g.innerHTML = f
          .map((e) => {
            const t =
              "" === e.blackId
                ? "— (BYE)"
                : escapePublicScreenHtml_(e.blackName);
            return `\n                <div class="public-screen-result-row">\n                  <span class="public-screen-board-badge">R${e.round}·M${e.board}</span>\n                  <span class="public-screen-vs">${escapePublicScreenHtml_(e.whiteName)} vs ${t}</span>\n                  <span class="public-screen-result-badge">${resultLabelForPairing_(e)}</span>\n                </div>`;
          })
          .join(""))
      : (g.innerHTML =
          '<p class="public-screen-empty-note">Todavía no hay resultados cargados.</p>'));
  const h = document.getElementById("public-screen-next-round");
  if (o) {
    const e = l.length ? l[0].points : 0,
      t = l.length ? l[0]._buchholz : 0,
      a = l.filter((a) => a.points === e && a._buchholz === t);
    h.textContent =
      a.length > 1
        ? "🏆 Empate en el primer puesto: " + a.map((e) => e.name).join(", ")
        : "🏆 Campeón: " + (a[0] ? a[0].name : "—");
  } else
    "pending_approval" === e.meta.roundStatus
      ? (h.textContent = `Ronda ${e.meta.round} terminada — esperando aprobación para pasar a la ronda ${e.meta.round + 1}`)
      : "closed" === e.meta.roundStatus
        ? (h.textContent = `Ronda ${e.meta.round} cerrada — generando la ronda ${e.meta.round + 1}`)
        : e.meta.totalRounds && e.meta.round >= e.meta.totalRounds
          ? (h.textContent = "Última ronda en curso")
          : (h.textContent = `Próxima ronda: ${e.meta.round + 1}${r}`);
}
const publicScreenFullscreenBtn = document.getElementById(
  "public-screen-fullscreen-btn",
);
publicScreenFullscreenBtn &&
  publicScreenFullscreenBtn.addEventListener("click", () => {
    const e = document.getElementById("public-screen");
    document.fullscreenElement
      ? document.exitFullscreen()
      : e && e.requestFullscreen && e.requestFullscreen();
  });
let playersDelegationSetup_ = !1;
function setupPlayersListDelegation_(e) {
  playersDelegationSetup_ ||
    ((playersDelegationSetup_ = !0),
    e.addEventListener("click", (t) => {
      const a = t.target.closest("button[data-edit-player]");
      if (a)
        return (
          (tournamentEditingPlayerId = a.dataset.editPlayer),
          void renderPlayersPanel(lastTournamentState, !0)
        );
      if (t.target.closest("button[data-cancel-edit-player]"))
        return (
          (tournamentEditingPlayerId = null),
          void renderPlayersPanel(lastTournamentState, !0)
        );
      const n = t.target.closest("button[data-save-player]");
      if (n)
        return void (async () => {
          const t = n.dataset.savePlayer,
            a = e.querySelector(`[data-player-row="${t}"]`),
            o = a.querySelector(".player-edit-name").value,
            r = a.querySelector(".player-edit-email").value;
          try {
            (await fbEditPlayer(t, o, r),
              (tournamentEditingPlayerId = null),
              toast("✓ Jugador actualizado"));
          } catch (e) {
            showError(e);
          }
        })();
      const o = t.target.closest("button[data-delete-player]");
      if (o)
        return void (async () => {
          const e = o.dataset.deletePlayer,
            t = (lastTournamentState ? lastTournamentState.players : []).find(
              (t) => t.id === e,
            );
          if (
            confirm(
              `¿Eliminar a ${t ? t.name : "este jugador"}? Se recalculará el torneo.`,
            )
          )
            try {
              (await fbDeletePlayer(e), toast("✓ Jugador eliminado"));
            } catch (e) {
              showError(e);
            }
        })();
      const r = t.target.closest("button[data-approve-registration]");
      if (r)
        return void (async () => {
          const e = r.dataset.approveRegistration;
          try {
            (await fbApproveRegistration(e),
              toast("✅ Inscripción autorizada"));
          } catch (e) {
            showError(e);
          }
        })();
      const s = t.target.closest("button[data-reject-registration]");
      if (s)
        return void (async () => {
          const e = s.dataset.rejectRegistration,
            t = (lastTournamentState ? lastTournamentState.players : []).find(
              (t) => t.id === e,
            );
          if (
            confirm(
              `¿Rechazar la inscripción de ${t ? t.name : "esta persona"}?`,
            )
          )
            try {
              (await fbRejectRegistration(e),
                toast("🚫 Inscripción rechazada"));
            } catch (e) {
              showError(e);
            }
        })();
      const l = t.target.closest("button[data-withdraw-player]");
      if (l)
        return void (async () => {
          const e = l.dataset.withdrawPlayer,
            t = (lastTournamentState ? lastTournamentState.players : []).find(
              (t) => t.id === e,
            );
          if (
            confirm(
              `¿Retirar a ${t ? t.name : "este jugador"} del torneo? Conserva su historial, pero no se lo volverá a emparejar.`,
            )
          )
            try {
              (await fbWithdrawPlayer(e), toast("🚪 Jugador retirado"));
            } catch (e) {
              showError(e);
            }
        })();
      const i = t.target.closest("button[data-reactivate-player]");
      if (i)
        return void (async () => {
          const e = i.dataset.reactivatePlayer;
          try {
            (await fbReactivatePlayer(e), toast("↩️ Jugador reincorporado"));
          } catch (e) {
            showError(e);
          }
        })();
      const c = t.target.closest("button[data-disqualify-player]");
      c &&
        (async () => {
          const e = c.dataset.disqualifyPlayer,
            t = (lastTournamentState ? lastTournamentState.players : []).find(
              (t) => t.id === e,
            );
          if (
            confirm(
              `¿Descalificar a ${t ? t.name : "este jugador"}? Esta acción no tiene vuelta atrás.`,
            )
          )
            try {
              (await fbDisqualifyPlayer(e), toast("⛔ Jugador descalificado"));
            } catch (e) {
              showError(e);
            }
        })();
    }));
}
function renderPlayersPanel(e, t) {
  const a = document.getElementById("tournament-players-card");
  if (!a) return;
  const n = isCurrentUserReferee();
  if (!n && !t) return void (a.style.display = "none");
  a.style.display = "";
  const o = document.getElementById("tournament-players-list");
  (setupPlayersListDelegation_(o),
    tournamentEditingPlayerId &&
      !e.players.some((e) => e.id === tournamentEditingPlayerId) &&
      (tournamentEditingPlayerId = null));
  const r = JSON.stringify([e.players, tournamentEditingPlayerId]);
  if (o.dataset.sig === r) return;
  o.dataset.sig = r;
  const s = e.players
    .filter((e) => "pending" === (e.status || "active"))
    .map((e) => e.id);
  let l = document.getElementById("tournament-pending-bulk-actions");
  if (
    (l ||
      ((l = document.createElement("div")),
      (l.id = "tournament-pending-bulk-actions"),
      (l.style.cssText =
        "display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap;"),
      o.parentNode.insertBefore(l, o)),
    t && s.length > 0)
  ) {
    ((l.style.display = "flex"),
      (l.innerHTML = `\n            <button class="btn primary" id="tournament-approve-all-btn">✅ Autorizar todos (${s.length})</button>\n            <button class="btn danger" id="tournament-reject-all-btn">🚫 Rechazar todos (${s.length})</button>\n          `));
    const e = document.getElementById("tournament-approve-all-btn");
    e &&
      e.addEventListener("click", async () => {
        if (confirm(`¿Autorizar las ${s.length} inscripciones pendientes?`))
          try {
            (await fbApproveAllRegistrations(),
              toast("✅ Todas las inscripciones fueron autorizadas"));
          } catch (e) {
            showError(e);
          }
      });
    const t = document.getElementById("tournament-reject-all-btn");
    t &&
      t.addEventListener("click", async () => {
        if (
          confirm(
            `¿Rechazar las ${s.length} inscripciones pendientes? Esta acción no se puede deshacer.`,
          )
        )
          try {
            (await fbRejectAllRegistrations(),
              toast("🚫 Todas las inscripciones pendientes fueron rechazadas"));
          } catch (e) {
            showError(e);
          }
      });
  } else ((l.style.display = "none"), (l.innerHTML = ""));
  o.innerHTML = e.players
    .map((e) => {
      if (e.id === tournamentEditingPlayerId)
        return `\n                <div class="pairing-row" data-player-row="${e.id}">\n                  <input type="text" class="player-edit-name" value="${e.name.replace(/"/g, "&quot;")}" style="flex:1; min-width:120px; padding:6px 8px; border-radius:8px; border:1px solid var(--surface2); background:var(--surface); color:var(--text)" />\n                  <input type="email" class="player-edit-email" value="${(e.email || "").replace(/"/g, "&quot;")}" placeholder="Email" style="flex:1; min-width:160px; padding:6px 8px; border-radius:8px; border:1px solid var(--surface2); background:var(--surface); color:var(--text)" />\n                  <button class="btn primary" data-save-player="${e.id}">Guardar</button>\n                  <button class="btn" data-cancel-edit-player="1">Cancelar</button>\n                </div>`;
      const a = e.status || "active";
      if ("pending" === a) {
        const a = t
          ? `\n                  <button class="btn primary" data-approve-registration="${e.id}">✅ Autorizar</button>\n                  <button class="btn danger" data-reject-registration="${e.id}">🚫 Rechazar</button>\n                `
          : '<span class="muted" style="font-size:12px">Esperando autorización del administrador</span>';
        return `\n                <div class="pairing-row" data-player-row="${e.id}">\n                  <div class="pairing-names">${escapeHtml_(e.name)}${e.email ? ` <span class="muted" style="font-size:12px">(${escapeHtml_(e.email)})</span>` : ""}\n                    <div class="mini-diagram-caption" style="margin:2px 0 0;text-align:left">${playerStatusLabel_(e.status)}</div>\n                  </div>\n                  ${a}\n                </div>`;
      }
      const o = n
          ? `\n                ${"active" === a ? `<button class="btn" data-withdraw-player="${e.id}">🚪 Retirar</button>` : ""}\n                ${"withdrawn" === a ? `<button class="btn" data-reactivate-player="${e.id}">↩️ Reincorporar</button>` : ""}\n                ${"disqualified" !== a ? `<button class="btn danger" data-disqualify-player="${e.id}">⛔ Descalificar</button>` : ""}\n              `
          : "",
        r = t
          ? `\n                <button class="btn" data-edit-player="${e.id}">✏️ Editar</button>\n                <button class="btn danger" data-delete-player="${e.id}">🗑️ Eliminar</button>\n              `
          : "";
      return `\n              <div class="pairing-row" data-player-row="${e.id}">\n                <div class="pairing-names">${escapeHtml_(e.name)}${e.email ? ` <span class="muted" style="font-size:12px">(${escapeHtml_(e.email)})</span>` : ""}\n                  <div class="mini-diagram-caption" style="margin:2px 0 0;text-align:left">${playerStatusLabel_(e.status)} · ${e.points} pts</div>\n                </div>\n                ${o}\n                ${r}\n              </div>`;
    })
    .join("");
}
async function refreshTournament() {
  if (fbRoomRef)
    try {
      const e = await getTournamentStateOnce();
      ((lastTournamentState = e),
        subscribeRoundGames(
          "active" === e.meta.status || "finished" === e.meta.status
            ? e.meta.round
            : null,
        ),
        renderTournamentState(e));
    } catch (e) {
      ((document.getElementById("tournament-connect-status").textContent =
        "❌ No se pudo conectar: " + e.message),
        document
          .getElementById("tournament-connect-status")
          .classList.remove("correct"));
    }
}
function tournamentResultMessage(e, t) {
  const a = tournamentMatchCtx,
    n = a ? a.whiteName : "Blancas",
    o = a ? a.blackName : "Negras",
    r = t ? ` (${t})` : "",
    s = tournamentMyColor();
  let l, i, c;
  if ("1-0" === e)
    ((l = "🏆 ¡Ganaron las Blancas!"),
      (i = `${n} le ganó a ${o}${r}.`),
      (c = "w" === s ? "win" : "b" === s ? "loss" : null),
      "w" === s && (i += "\n¡Ganaste vos! 🎉"),
      "b" === s && (i += "\nPerdiste esta partida."));
  else if ("0-1" === e)
    ((l = "🏆 ¡Ganaron las Negras!"),
      (i = `${o} le ganó a ${n}${r}.`),
      (c = "b" === s ? "win" : "w" === s ? "loss" : null),
      "b" === s && (i += "\n¡Ganaste vos! 🎉"),
      "w" === s && (i += "\nPerdiste esta partida."));
  else if ("1/2-1/2" === e)
    ((l = "🤝 ¡Tablas!"),
      (i = `${n} y ${o} empataron la partida${r}.`),
      (c = s ? "draw" : null));
  else if ("wo-black" === e)
    ((l = "🏆 ¡Ganaron las Blancas!"),
      (i = `${o} no se presentó: ${n} ganó por incomparecencia (W.O.)${r}.`),
      (c = "w" === s ? "win" : "b" === s ? "loss" : null),
      "w" === s && (i += "\n¡Ganaste vos! 🎉"),
      "b" === s && (i += "\nPerdiste esta partida."));
  else {
    if ("wo-white" !== e)
      return { text: "🏁 Partida de torneo terminada.", variant: null };
    ((l = "🏆 ¡Ganaron las Negras!"),
      (i = `${n} no se presentó: ${o} ganó por incomparecencia (W.O.)${r}.`),
      (c = "b" === s ? "win" : "w" === s ? "loss" : null),
      "b" === s && (i += "\n¡Ganaste vos! 🎉"),
      "w" === s && (i += "\nPerdiste esta partida."));
  }
  return { text: l + "\n\n" + i, variant: c };
}
function saveTournamentGameForAnalysis_(e, t) {
  const a = tournamentCurrentGameRow,
    n = tournamentMatchCtx;
  if (!a || !n) return null;
  const o = (a.moves || []).filter(Boolean);
  if (!o.length) return null;
  state.savedGames = state.savedGames || [];
  const r = `tournament:${getTournamentRoom()}:${n.round}:${n.board}:${getTimestampMs(a.startedAt) || 0}`;
  let s = state.savedGames.find((e) => e.sourceKey === r);
  if (s) return s;
  const l = new Chess(),
    i = [clonePosition(l)],
    c = [];
  for (const e of o) {
    const t = l.move(e);
    if (!t) break;
    (c.push(t.san), i.push(clonePosition(l)));
  }
  if (!c.length) return null;
  const d = tournamentResultMessage(e, t);
  return (
    (s = {
      id:
        "tg" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      sourceKey: r,
      date: new Date().toLocaleDateString("es-AR"),
      time: new Date().toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      result: "Torneo · " + d.text.split("\n")[0],
      mode: "tournament",
      difficulty: null,
      humanColor: tournamentMyColor() || null,
      moves: c,
      positions: i,
      analysis: null,
    }),
    state.savedGames.unshift(s),
    (state.savedGames = state.savedGames.slice(0, 30)),
    save(),
    renderSavedGamesList(),
    s
  );
}
function showTournamentResult(e, t) {
  const a = tournamentResultMessage(e, t);
  showAlert(a.text, a.variant);
  const n = saveTournamentGameForAnalysis_(e, t);
  (n && offerAnalysis(n.id),
    showAlertBackToTournamentButton_(),
    (alertOnClose_ = () => exitTournamentMatch()));
}
function tournamentMyColor() {
  if (!tournamentMatchCtx || !currentUser || !currentUser.email) return "";
  const e = currentUser.email.toLowerCase();
  return tournamentMatchCtx.whiteEmail &&
    tournamentMatchCtx.whiteEmail.toLowerCase() === e
    ? "w"
    : tournamentMatchCtx.blackEmail &&
        tournamentMatchCtx.blackEmail.toLowerCase() === e
      ? "b"
      : "";
}
function tournamentClockWaitingForBothPlayers() {
  const e = tournamentCurrentGameRow;
  if (!e || !e.clock) return !1;
  const t = e.joined || { w: !1, b: !1 };
  return !(t.w && t.b);
}
function updateTournamentMatchBar(e) {
  if (!tournamentMatchActive || !tournamentMatchCtx) return;
  const t = document.getElementById("tournament-match-status"),
    a = tournamentMyColor();
  if (e && "finished" === e.status) {
    if (
      ((t.textContent = "🏁 Partida terminada."),
      (document.getElementById("tournament-match-controls").style.display =
        "none"),
      (document.getElementById(
        "tournament-match-spectator-note",
      ).style.display = "none"),
      clearInterval(tournamentClockTimer),
      !tournamentResultShown)
    ) {
      tournamentResultShown = !0;
      let t = e.result;
      if (!t) {
        const a = (
          (lastTournamentState && lastTournamentState.pairings) ||
          []
        ).find((t) => t.round === e.round && t.board === e.board);
        t = a ? a.result : "";
      }
      showTournamentResult(t);
    }
    return;
  }
  if (e && "suspended" === e.status)
    return (
      (t.textContent =
        "⏸️ El árbitro suspendió esta partida. Esperá novedades antes de seguir jugando."),
      void (document.getElementById("tournament-match-controls").style.display =
        "none")
    );
  const n = game.turn(),
    o = "w" === n ? tournamentMatchCtx.whiteName : tournamentMatchCtx.blackName;
  if (tournamentClockWaitingForBothPlayers()) {
    const a = ((e && e.joined) || { w: !1, b: !1 }).w
      ? tournamentMatchCtx.blackName
      : tournamentMatchCtx.whiteName;
    t.textContent = `Esperando a que entre ${a}. El reloj comenzará cuando estén ambos jugadores.`;
  } else
    t.textContent = a
      ? a === n
        ? `¡Tu turno! Jugás con ${"w" === a ? "blancas" : "negras"}.`
        : `Turno de ${o}. Esperando la jugada...`
      : `Turno de ${o}.`;
}
function handleLiveMatchUpdate(e) {
  if (!tournamentMatchActive || !tournamentMatchCtx) return;
  const t = lastRoundGames.find(
    (e) =>
      e.round === tournamentMatchCtx.round &&
      e.board === tournamentMatchCtx.board,
  );
  t &&
    ((tournamentCurrentGameRow = t),
    t.fen !== game.fen() &&
      (game.load(t.fen),
      (selected = null),
      (validMoves = []),
      t.lastFrom &&
        t.lastTo &&
        (clearTimeout(opponentMoveHighlightTimer),
        (opponentMoveHighlight = { from: t.lastFrom, to: t.lastTo })),
      render()),
    updateTournamentMatchBar(t),
    updateTournamentClockDisplay());
}
function updateTournamentClockDisplay() {
  const e = tournamentCurrentGameRow,
    t = document.getElementById("clock-w"),
    a = document.getElementById("clock-b");
  if (!(e && e.clock && t && a)) return;
  const n = game.turn(),
    o = "finished" === e.status,
    r = "suspended" === e.status,
    s = getTimestampMs(e.turnStartAt),
    l = o || r || tournamentClockWaitingForBothPlayers() || !s,
    i = (() => {
      if (l) return 0;
      const e = syncedNow_();
      let t = e;
      return (
        e < s && (syncInternetClock_(), (t = s)),
        Math.max(0, Math.floor((t - s) / 1e3))
      );
    })(),
    c = {
      w: e.clock.w - ("w" !== n || l ? 0 : i),
      b: e.clock.b - ("b" !== n || l ? 0 : i),
    },
    d = Math.max(0, c.w),
    u = Math.max(0, c.b),
    m = t.querySelector(".clock-time"),
    p = a.querySelector(".clock-time");
  (((m || t).textContent = formatTime(d)),
    ((p || a).textContent = formatTime(u)),
    t.classList.toggle("active", "w" === n && !l),
    a.classList.toggle("active", "b" === n && !l),
    !l &&
      (("w" === n && c.w <= 0) || ("b" === n && c.b <= 0)) &&
      claimTournamentTimeout(n));
}
async function claimTournamentTimeout(e) {
  if (
    tournamentMatchActive &&
    tournamentMatchCtx &&
    !tournamentResultShown &&
    !tournamentTimeoutClaimBusy
  ) {
    tournamentTimeoutClaimBusy = !0;
    try {
      const t = "w" === e ? "0-1" : "1-0",
        a = (
          await fbMakeMove(
            tournamentMatchCtx.round,
            tournamentMatchCtx.board,
            game.fen(),
            game.history().slice(-1)[0] || "",
            t,
            void 0,
            void 0,
            void 0,
            !0,
          )
        ).gameRow;
      (tournamentResultShown ||
        ((tournamentResultShown = !0),
        showTournamentResult(t, "tiempo agotado")),
        updateTournamentMatchBar(a));
    } catch (e) {
    } finally {
      tournamentTimeoutClaimBusy = !1;
    }
  }
}
