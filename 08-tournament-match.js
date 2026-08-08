/* Live tournament match lifecycle and event bindings. Generated from the verified legacy bundle. */
let roundCountdownActionBusy_ = !1;
function setRoundCountdownActionBusy_(e) {
  roundCountdownActionBusy_ = e;
  const t = document.getElementById("tournament-round-countdown-composer"),
    a = document.getElementById("tournament-round-countdown-control-status");
  (t &&
    t.querySelectorAll("button, input").forEach((t) => {
      t.disabled = e;
    }),
    a && e && (a.textContent = "Sincronizando con Firebase…"));
}
async function runRoundCountdownAction_(e, t) {
  if (roundCountdownActionBusy_) return;
  setRoundCountdownActionBusy_(!0);
  const a = document.getElementById(
    "tournament-round-countdown-control-status",
  );
  try {
    (await e(), a && (a.textContent = t), toast(t));
    return !0;
  } catch (e) {
    (a && (a.textContent = "No se pudo actualizar el countdown."), showError(e));
    return !1;
  } finally {
    setRoundCountdownActionBusy_(!1);
  }
}
function confirmRoundCountdownReplacement_() {
  return (
    !lastTournamentState ||
    !hasRoundCountdown_(lastTournamentState) ||
    confirm("Ya hay un countdown configurado. ¿Querés reemplazarlo?")
  );
}
function setupRoundCountdownControls_() {
  const e = document.getElementById("tournament-round-countdown-composer"),
    t = document.getElementById("tournament-round-countdown-custom-minutes"),
    a = document.getElementById("tournament-round-countdown-start-btn"),
    n = document.getElementById("tournament-round-countdown-cancel-btn");
  if (!e || !t || !a || !n) return;
  const o = async (e) =>
    confirmRoundCountdownReplacement_()
      ? runRoundCountdownAction_(
          () => fbSetRoundCountdown(e),
          "⏳ Countdown iniciado y sincronizado",
        )
      : !1;
  (e.querySelectorAll("[data-countdown-minutes]").forEach((e) => {
    e.addEventListener("click", () => o(Number(e.dataset.countdownMinutes)));
  }),
    a.addEventListener("click", async () => {
      const e = Number(t.value);
      (await o(e)) && (t.value = "");
    }),
    t.addEventListener("keydown", (e) => {
      "Enter" === e.key && (e.preventDefault(), a.click());
    }),
    e.querySelectorAll("[data-countdown-adjust-ms]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = Number(e.dataset.countdownAdjustMs),
          a = t > 0 ? "⏳ Se añadió 1 minuto" : "⏳ Se restó 1 minuto";
        runRoundCountdownAction_(() => fbAdjustRoundCountdown(t), a);
      });
    }),
    n.addEventListener("click", () => {
      confirm("¿Cancelar el countdown para todos los participantes?") &&
        runRoundCountdownAction_(
          fbCancelRoundCountdown,
          "⏳ Countdown cancelado",
        );
    }));
}
let tournamentMovesCardHome_ = null,
  tournamentMovesAutoCollapsed_ = !1;
let tournamentSyncState_ = "online",
  tournamentLastLatencyMs_ = null,
  tournamentSyncSlowTimer_ = null;
function renderTournamentSyncIndicator_() {
  const e = document.getElementById("tournament-sync-indicator"),
    t = document.getElementById("tournament-sync-text");
  if (!e || !t) return;
  let a = navigator.onLine ? tournamentSyncState_ : "offline",
    n = "",
    o = "";
  if ("syncing" === a)
    ((n = "Sincronizando"), (o = "Enviando cambios a Firebase"));
  else if ("delayed" === a)
    ((n = "Demora…"),
      (o = "La confirmación de Firebase está tardando más de lo habitual"));
  else if ("error" === a)
    ((n = "Error de red"), (o = "La última sincronización no se completó"));
  else if ("offline" === a)
    ((n = "Sin conexión"), (o = "El navegador no tiene conexión a Internet"));
  else if (Number.isFinite(tournamentLastLatencyMs_)) {
    const e = Math.max(0, Math.round(tournamentLastLatencyMs_));
    ((a = e > 900 ? "slow" : e > 350 ? "normal" : "fast"),
      (n = `${e} ms`),
      (o = `Última confirmación de Firebase: ${e} milisegundos`));
  } else ((a = "online"), (n = "En línea"), (o = "Conectado a Firebase"));
  ((e.dataset.state = a),
    (t.textContent = n),
    (e.title = o),
    e.setAttribute("aria-label", o));
}
function setTournamentSyncState_(e, t) {
  (clearTimeout(tournamentSyncSlowTimer_),
    (tournamentSyncSlowTimer_ = null),
    Number.isFinite(t) && (tournamentLastLatencyMs_ = t),
    (tournamentSyncState_ = e),
    renderTournamentSyncIndicator_());
  "syncing" === e &&
    (tournamentSyncSlowTimer_ = setTimeout(() => {
      "syncing" === tournamentSyncState_ &&
        ((tournamentSyncState_ = "delayed"),
        renderTournamentSyncIndicator_());
    }, 1200));
}
function beginTournamentSync_() {
  return (setTournamentSyncState_("syncing"), performance.now());
}
function finishTournamentSync_(e) {
  setTournamentSyncState_("online", performance.now() - e);
}
function failTournamentSync_() {
  setTournamentSyncState_(navigator.onLine ? "error" : "offline");
}
function markTournamentConnectionAlive_() {
  tournamentMatchBusy ||
    ("error" !== tournamentSyncState_ && "delayed" !== tournamentSyncState_
      ? renderTournamentSyncIndicator_()
      : setTournamentSyncState_("online"));
}
(window.addEventListener("online", () => {
  setTournamentSyncState_("online");
}),
  window.addEventListener("offline", () => {
    setTournamentSyncState_("offline");
  }));
function setTournamentMatchBusy_(e) {
  tournamentMatchBusy = !!e;
  tournamentMatchActive &&
    updateTournamentMatchBar(tournamentCurrentGameRow);
}
function loadTournamentGame_(e) {
  const t = e && Array.isArray(e.moves) ? e.moves.filter(Boolean) : [];
  if (t.length) {
    game.reset();
    let a = 0;
    for (const e of t) {
      if (!game.move(e)) break;
      a++;
    }
    if (a === t.length && (!e.fen || game.fen() === e.fen)) return !0;
  }
  return e && e.fen ? game.load(e.fen) : (game.reset(), !1);
}
function setTournamentMovesPopup_(e) {
  const t = floatingMovesCard || document.querySelector(".floating-moves-card"),
    a = document.getElementById("game-card");
  if (!t || !a) return;
  if (e) {
    (tournamentMovesCardHome_ ||
      (tournamentMovesCardHome_ = {
        parent: t.parentNode,
        next: t.nextSibling,
      }),
      a.appendChild(t),
      t.classList.add("tournament-moves-popup"));
    if (
      window.matchMedia(
        "((orientation: landscape) and (max-height: 600px) and (max-width: 1000px)), ((orientation: portrait) and (max-width: 700px))",
      ).matches &&
      !t.classList.contains("collapsed")
    )
      ((tournamentMovesAutoCollapsed_ = !0), t.classList.add("collapsed"));
  } else if (tournamentMovesCardHome_) {
    const e = tournamentMovesCardHome_;
    (e.next && e.next.parentNode === e.parent
      ? e.parent.insertBefore(t, e.next)
      : e.parent.appendChild(t),
      t.classList.remove("tournament-moves-popup"),
      tournamentMovesAutoCollapsed_ &&
        (t.classList.remove("collapsed"), (tournamentMovesAutoCollapsed_ = !1)),
      (tournamentMovesCardHome_ = null));
  }
}
async function enterTournamentMatch(e, t, a, n, o, r) {
  document.body.classList.add("fullscreen-game");
  const s = document.getElementById("game-fullscreen");
  (s && (s.textContent = s.dataset.exitText || "❎ Salir"),
    document.documentElement.requestFullscreen().catch(() => {}));
  try {
    let s = lastRoundGames.find((a) => a.round === e && a.board === t) || null;
    if (!s) {
      const a = await gamesCollectionRef.doc(gameDocId_(e, t)).get();
      s = a.exists ? a.data() : null;
    }
    if (!s) return void toast("❌ No se encontró esa partida");
    const l = await syncInternetClock_();
    (!s.clock ||
      l ||
      internetClockIsSynced_ ||
      toast(
        "No se pudo consultar la hora de Internet. Revisa la conexion.",
        5e3,
      ),
      (tournamentMatchCtx = {
        round: e,
        board: t,
        whiteName: a,
        blackName: n,
        whiteEmail: o || "",
        blackEmail: r || "",
      }),
      (tournamentMatchActive = !0),
      (tournamentLastLatencyMs_ = null),
      setTournamentSyncState_(navigator.onLine ? "online" : "offline"),
      setTournamentMatchBusy_(!1),
      (tournamentSelectionLastSent_ = null),
      (opponentSelectedSquare = tournamentOpponentSelectionFromRow_(s)),
      clearOpponentMoveHighlight(),
      clearInterval(clockTimer),
      (clockTimer = null),
      (botEnabled = !1),
      (gameStarted = !0),
      loadTournamentGame_(s),
      (selected = null),
      (validMoves = []),
      (tournamentResultShown = !1),
      showPage("jugar"),
      document.body.classList.add("tournament-board-max"),
      setTournamentMovesPopup_(!0),
      (document.getElementById("tournament-match-bar").style.display = ""),
      (document.getElementById("tournament-match-title").textContent =
        `🏆 Torneo · Ronda ${e}, tablero #${t}: ${a} vs ${n}`));
    const i = document.getElementById("clock-w-name"),
      c = document.getElementById("clock-b-name");
    (i && (i.textContent = a || ""),
      c && (c.textContent = n || ""),
      ["new-game", "undo", "resign", "copy-game"].forEach((e) => {
        const t = document.getElementById(e);
        t && (t.style.display = "none");
      }),
      (tournamentCurrentGameRow = s),
      syncTournamentSelection_(null),
      clearInterval(tournamentClockTimer));
    const d = document.querySelector("#page-jugar .clock");
    (s.clock
      ? (d && (d.style.display = ""),
        updateTournamentClockDisplay(),
        (tournamentClockTimer = setInterval(updateTournamentClockDisplay, 500)))
      : d && (d.style.display = "none"),
      ["modo-educativo-panel", "ayuda-educativa-panel", "tutor-card"].forEach(
        (e) => {
          const t = document.getElementById(e);
          t && (t.style.display = "none");
        },
      ));
    const u = tournamentMyColor(),
      h =
        lastTournamentState &&
        "finished" === lastTournamentState.meta.status,
      m = document.getElementById("tournament-match-spectator-note"),
      p = document.getElementById("tournament-match-controls");
    if (u && !h) {
      if (((m.style.display = "none"), (p.style.display = "flex"), s.clock)) {
        const a = { ...(s.joined || { w: !1, b: !1 }), [u]: !0 },
          n = a.w && a.b;
        ((tournamentCurrentGameRow = {
          ...s,
          joined: a,
          turnStartAt: s.turnStartAt || (n ? syncedNow_() : null),
        }),
          updateTournamentClockDisplay(),
          fbMarkJoined(e, t, u).catch((e) => {
            showError(e, "No se pudo registrar tu entrada a la partida");
          }));
      }
    } else
      ((m.style.display = ""),
        (m.textContent = h
          ? "Torneo finalizado: esta partida está disponible solo para consulta."
          : "Estás viendo la partida como espectador."),
        (p.style.display = "none"));
    (subscribeMatchChat(e, t),
      tournamentMyColor() && !h && subscribeCallSignaling(e, t),
      renderCallUI(),
      render(),
      updateTournamentMatchBar(tournamentCurrentGameRow || s),
      requestAnimationFrame(sizeFullscreenBoard));
  } catch (e) {
    toast("❌ No se pudo abrir la partida: " + e.message);
  }
}
function exitTournamentMatch() {
  (closePromotionPicker_(null),
    syncTournamentSelection_(null),
    clearTimeout(tournamentSyncSlowTimer_),
    (tournamentSyncSlowTimer_ = null),
    (tournamentSyncState_ = "online"),
    (tournamentLastLatencyMs_ = null),
    setTournamentMatchBusy_(!1),
    (tournamentMatchActive = !1),
    (tournamentMatchCtx = null),
    (tournamentResultShown = !1),
    (opponentSelectedSquare = null),
    (tournamentSelectionLastSent_ = null),
    clearOpponentMoveHighlight(),
    clearInterval(tournamentClockTimer),
    (tournamentClockTimer = null),
    (tournamentCurrentGameRow = null),
    unsubscribeMatchChat(),
    unsubscribeCallSignaling(),
    (document.getElementById("tournament-match-bar").style.display = "none"),
    setTournamentMovesPopup_(!1),
    document.body.classList.remove("tournament-board-max"),
    resetBoardFrameSize(),
    document.fullscreenElement && document.exitFullscreen().catch(() => {}),
    lastTournamentState &&
      (renderTournamentState(lastTournamentState),
      "function" == typeof renderPublicScreen &&
        renderPublicScreen(lastTournamentState)),
    ["new-game", "undo", "resign", "copy-game"].forEach((e) => {
      const t = document.getElementById(e);
      t && (t.style.display = "");
    }));
  const e = document.querySelector("#page-jugar .clock");
  e && (e.style.display = "");
  const t = document.getElementById("clock-w-name"),
    a = document.getElementById("clock-b-name");
  (t && (t.textContent = ""),
    a && (a.textContent = ""),
    ["modo-educativo-panel", "ayuda-educativa-panel", "tutor-card"].forEach(
      (e) => {
        const t = document.getElementById(e);
        t && (t.style.display = "");
      },
    ),
    game.reset(),
    (gameStarted = !1),
    (selected = null),
    (validMoves = []),
    render(),
    showPage("torneo"));
}
async function syncTournamentMove() {
  if (!tournamentMatchActive || !tournamentMatchCtx) return;
  if (!tournamentMyColor()) return;
  const e = syncedNow_(),
    t = e,
    a = tournamentCurrentGameRow;
  if (a && a.clock) {
    const e = "w" === game.turn() ? "b" : "w",
      n = getTimestampMs(a.turnStartAt),
      o = n ? Math.max(0, Math.floor((t - n) / 1e3)) : 0,
      r = { ...a.clock, [e]: Math.max(0, a.clock[e] - o) };
    (!game.game_over() && a.increment && (r[e] += a.increment),
      (tournamentCurrentGameRow = {
        ...a,
        fen: game.fen(),
        clock: r,
        turnStartAt: t,
      }),
      updateTournamentClockDisplay());
  }
  const syncStarted = beginTournamentSync_();
  setTournamentMatchBusy_(!0);
  try {
    let t = null;
    game.in_checkmate()
      ? (t = "w" === game.turn() ? "0-1" : "1-0")
      : (game.in_draw() ||
          game.in_stalemate() ||
          game.insufficient_material() ||
          game.in_threefold_repetition()) &&
        (t = "1/2-1/2");
    const a = game.history({ verbose: !0 }).slice(-1)[0],
      n = await fbMakeMove(
        tournamentMatchCtx.round,
        tournamentMatchCtx.board,
        game.fen(),
        game.history().slice(-1)[0] || "",
        t,
        a ? a.from : "",
        a ? a.to : "",
        e,
        void 0,
        "move",
      ),
      o = n.gameRow;
    (finishTournamentSync_(syncStarted),
      o && (tournamentCurrentGameRow = o),
      t &&
        !tournamentResultShown &&
        ((tournamentResultShown = !0), showTournamentResult(t)),
      t &&
        n.resultPendingReferee &&
        toast(
          "Resultado registrado en la partida. Un árbitro debe confirmarlo en la tabla del torneo.",
        ),
      t &&
        !n.resultPendingReferee &&
        "pending_approval" === n.meta.roundStatus &&
        toast(
          "✅ Ya están todos los resultados de esta ronda; falta que el administrador o el árbitro la aprueben.",
        ),
      updateTournamentMatchBar(o));
  } catch (e) {
    failTournamentSync_();
    const syncMessage =
      e &&
      ("permission-denied" === e.code ||
        String(e.message || "").toLowerCase().includes("permission"))
        ? "Firestore rechazo el permiso de esta partida. Un administrador debe abrir el torneo una vez para actualizar las partidas antiguas y verificar que las reglas publicadas sean las nuevas."
        : e.message;
    (a &&
      ((tournamentCurrentGameRow = a),
      loadTournamentGame_(a),
      (selected = null),
      (validMoves = []),
      render(),
      updateTournamentClockDisplay()),
      toast("❌ No se pudo sincronizar la jugada: " + syncMessage));
  } finally {
    setTournamentMatchBusy_(!1);
  }
}
(document
  .getElementById("tournament-match-back-btn")
  .addEventListener("click", exitTournamentMatch),
  document
    .getElementById("tournament-match-resign-btn")
    .addEventListener("click", async () => {
      if (tournamentMatchBusy || tournamentActiveClockExpired_()) return;
      const e = tournamentMyColor();
      if (e && confirm("¿Seguro que te querés rendir en esta partida?")) {
        const syncStarted = beginTournamentSync_();
        setTournamentMatchBusy_(!0);
        try {
          const t = await fbMakeMove(
              tournamentMatchCtx.round,
              tournamentMatchCtx.board,
              game.fen(),
              game.history().slice(-1)[0] || "",
              "w" === e ? "0-1" : "1-0",
              void 0,
              void 0,
              void 0,
              !1,
              "resign",
            ),
            a = t.gameRow;
          (finishTournamentSync_(syncStarted),
            tournamentResultShown ||
            ((tournamentResultShown = !0),
            showTournamentResult("w" === e ? "0-1" : "1-0")),
            updateTournamentMatchBar(a),
            toast(
              t.resultPendingReferee
                ? "Te rendiste. Un árbitro debe confirmar el resultado en la tabla."
                : "pending_approval" === t.meta.roundStatus
                ? "🏳️ Te rendiste. Resultado cargado. Falta que el administrador o el árbitro aprueben la ronda."
                : "🏳️ Te rendiste. Resultado cargado.",
            ));
        } catch (e) {
          (failTournamentSync_(), showError(e));
        } finally {
          setTournamentMatchBusy_(!1);
        }
      }
    }),
  document
    .getElementById("tournament-match-draw-btn")
    .addEventListener("click", async () => {
      if (
        !tournamentMyColor() ||
        tournamentMatchBusy ||
        tournamentActiveClockExpired_()
      )
        return;
      let syncStarted = beginTournamentSync_();
      setTournamentMatchBusy_(!0);
      try {
        const e = await fbToggleDrawOffer(
          tournamentMatchCtx.round,
          tournamentMatchCtx.board,
        );
        finishTournamentSync_(syncStarted);
        if ("offered" === e.action) {
          ((tournamentCurrentGameRow = e.gameRow),
            updateTournamentMatchBar(e.gameRow),
            toast("🤝 Oferta de tablas enviada."));
          return;
        }
        if ("cancelled" === e.action) {
          ((tournamentCurrentGameRow = e.gameRow),
            updateTournamentMatchBar(e.gameRow),
            toast("Oferta de tablas cancelada."));
          return;
        }
        if (
          "accept" === e.action &&
          confirm("Tu rival ofreció tablas. ¿Querés aceptar?")
        ) {
          syncStarted = beginTournamentSync_();
          const t = await fbMakeMove(
              tournamentMatchCtx.round,
              tournamentMatchCtx.board,
              game.fen(),
              game.history().slice(-1)[0] || "",
              "1/2-1/2",
              void 0,
              void 0,
              void 0,
              !1,
              "draw",
            ),
            a = t.gameRow;
          (finishTournamentSync_(syncStarted),
            tournamentResultShown ||
            ((tournamentResultShown = !0), showTournamentResult("1/2-1/2")),
            updateTournamentMatchBar(a),
            toast(
              t.resultPendingReferee
                ? "Tablas acordadas. Un árbitro debe confirmar el resultado en la tabla."
                : "pending_approval" === t.meta.roundStatus
                ? "🤝 Tablas acordadas. Falta que el administrador o el árbitro aprueben la ronda."
                : "🤝 Tablas acordadas.",
            ));
        }
      } catch (e) {
        (failTournamentSync_(), showError(e));
      } finally {
        setTournamentMatchBusy_(!1);
      }
    }),
  document
    .getElementById("tournament-match-call-btn")
    .addEventListener("click", startAudioCall),
  document
    .getElementById("tournament-match-call-accept-btn")
    .addEventListener("click", () => {
      callPendingOffer && acceptIncomingCall_(callPendingOffer);
    }),
  document
    .getElementById("tournament-match-call-decline-btn")
    .addEventListener("click", declineIncomingCall_),
  document
    .getElementById("tournament-match-call-cancel-btn")
    .addEventListener("click", hangUpCall),
  document
    .getElementById("tournament-match-call-hangup-btn")
    .addEventListener("click", hangUpCall),
  document
    .getElementById("tournament-match-call-mute-btn")
    .addEventListener("click", toggleCallMute),
  document
    .getElementById("tournament-match-chat-toggle-btn")
    .addEventListener("click", toggleMatchChatPanel),
  document
    .getElementById("tournament-match-chat-mute-btn")
    .addEventListener("click", toggleMatchChatMute),
  renderMatchChatMuteBtn_(),
  document
    .getElementById("tournament-match-chat-send-btn")
    .addEventListener("click", sendMatchChatMessage),
  document
    .getElementById("tournament-match-chat-clear-btn")
    .addEventListener("click", clearMatchChat),
  document
    .getElementById("tournament-match-chat-input")
    .addEventListener("keydown", (e) => {
      "Enter" === e.key && (e.preventDefault(), sendMatchChatMessage());
    }),
  document
    .getElementById("tournament-match-chat-input")
    .addEventListener("input", (e) => {
      const t = e.target.value.length,
        a = document.getElementById("tournament-match-chat-counter");
      a && (a.textContent = t > 0 ? `${t}/300` : "");
      const n = document.getElementById("tournament-match-chat-send-btn");
      n && (n.disabled = !e.target.value.trim());
    }),
  document
    .getElementById("tournament-connect-btn")
    .addEventListener("click", async () => {
      const e = document.getElementById("tournament-config-input").value,
        t =
          document.getElementById("tournament-room-input").value.trim() ||
          "main",
        a = document.getElementById("tournament-connect-status");
      try {
        const a = parseFirebaseConfigInput(e);
        (setFirebaseConfig(a), setTournamentRoom(t), connectFirebase(a, t));
      } catch (e) {
        ((a.textContent = "❌ " + e.message), a.classList.remove("correct"));
      }
    }),
  document
    .getElementById("tournament-google-signin-btn")
    .addEventListener("click", async () => {
      try {
        const e = new firebase.auth.GoogleAuthProvider();
        if (
          (e.setCustomParameters({ prompt: "select_account" }),
          shouldUseAuthRedirect_())
        )
          return void (await firebase.auth().signInWithRedirect(e));
        try {
          await firebase.auth().signInWithPopup(e);
        } catch (t) {
          if (
            t &&
            "auth/popup-blocked" === t.code &&
            !location.hostname.endsWith(".github.io")
          )
            return void (await firebase.auth().signInWithRedirect(e));
          throw t;
        }
      } catch (e) {
        toast(
          "No se pudo iniciar sesion: " + firebaseAuthErrorMessage_(e),
          7e3,
        );
      }
    }),
  document
    .getElementById("tournament-signout-btn")
    .addEventListener("click", async () => {
      try {
        await firebase.auth().signOut();
      } catch (e) {
        showError(e);
      }
    }));
const configSignoutBtn = document.getElementById("config-signout-btn");
configSignoutBtn &&
  configSignoutBtn.addEventListener("click", async () => {
    try {
      (await firebase.auth().signOut(), toast("🚪 Sesión cerrada"));
    } catch (e) {
      toast("❌ No se pudo cerrar sesión: " + e.message);
    }
  });
(document
  .getElementById("tournament-create-btn")
  .addEventListener("click", async () => {
    const e =
        document.getElementById("tournament-name-input").value.trim() ||
        "Torneo",
      t = parsePlayersInput(
        document.getElementById("tournament-players-input").value,
      ),
      a = document.getElementById("tournament-rounds-input").value.trim();
    if (1 === t.length)
      return void toast(
        "❌ Cargá al menos 2 jugadores, o dejá la lista vacía para que se inscriban ellos mismos",
      );
    if (t.some((e) => !e.email))
      return void toast(
        "❌ Cada jugador necesita su email de Gmail (formato: Nombre, email)",
      );
    if (a && (!/^\d+$/.test(a) || Number(a) < 1))
      return void toast(
        "❌ La cantidad de rondas tiene que ser un número entero mayor a 0 (o dejalo vacío)",
      );
    if (!fbRoomRef)
      return void toast("❌ Primero conectate a tu proyecto de Firebase");
    if (!currentUser) return void toast("❌ Iniciá sesión con Google primero");
    const n = {
        minutes: getRawMinutesFromSelect(
          "tournament-time-mode",
          "tournament-custom-minutes",
        ),
        increment: getIncrementFromSelect(
          "tournament-increment",
          "tournament-custom-increment",
        ),
      },
      o =
        "auto" === document.getElementById("tournament-round-mode").value
          ? "auto"
          : "manual",
      r = document.getElementById("tournament-wo-grace-input").value.trim();
    try {
      (await fbCreateTournament(e, t, a, void 0, n, o, r),
        t.length >= 2
          ? (await fbGenerateRound(),
            toast("✓ Torneo creado y ronda 1 generada"))
          : toast(
              "✓ Torneo creado. Esperá a que se inscriban jugadores y generá la ronda 1 cuando quieras.",
            ));
    } catch (e) {
      toast("❌ No se pudo crear el torneo: " + e.message);
    }
  }),
  document
    .getElementById("tournament-next-round-btn")
    .addEventListener("click", async () => {
      try {
        await fbGenerateRound();
      } catch (e) {
        showError(e);
      }
    }),
  document
    .getElementById("tournament-finish-btn")
    .addEventListener("click", async () => {
      const e = lastTournamentState,
        t =
          e && e.meta
            ? e.pairings.filter(
                (t) => t.round === e.meta.round && "" !== t.blackId && !t.result,
              ).length
            : 0,
        a = t
          ? ` Hay ${t} partida${1 === t ? "" : "s"} sin resultado; la tabla actual será definitiva.`
          : "";
      if (
        confirm(
          "¿Finalizar el torneo y declarar campeón según la tabla actual?" +
            a +
            " Las partidas y resultados quedarán bloqueados hasta que se reabra.",
        )
      )
        try {
          (await fbFinishTournament(), toast("🏁 Torneo finalizado correctamente."));
        } catch (e) {
          showError(e);
        }
    }),
  document
    .getElementById("tournament-reopen-btn")
    .addEventListener("click", async () => {
      if (
        confirm(
          "¿Reabrir el torneo? Volverán a habilitarse las acciones correspondientes al estado anterior.",
        )
      )
        try {
          (await fbReopenTournament(), toast("↩️ Torneo reabierto."));
        } catch (e) {
          showError(e);
        }
    }),
  document
    .getElementById("tournament-announcement-send-btn")
    .addEventListener("click", async () => {
      const e = document.getElementById("tournament-announcement-input");
      try {
        (await sendTournamentAnnouncement(e.value),
          (e.value = ""),
          toast("📢 Anuncio enviado"));
      } catch (e) {
        showError(e);
      }
    }),
  document
    .getElementById("tournament-announcement-history-toggle")
    .addEventListener("click", () => {
      const e = document.getElementById("tournament-announcement-history-list");
      e.style.display = "none" === e.style.display ? "" : "none";
    }),
  setupRoundCountdownControls_(),
  document
    .getElementById("tournament-settings-btn")
    .addEventListener("click", () => {
      const e = lastTournamentState;
      e &&
        ((document.getElementById("tournament-roles-panel").style.display =
          "none"),
        (document.getElementById("tournament-settings-name-input").value =
          e.meta.name || ""),
        (document.getElementById("tournament-settings-rounds-input").value =
          e.meta.totalRounds || ""),
        setSelectFromValue(
          "tournament-settings-time-mode",
          "tournament-settings-custom-time-label",
          "tournament-settings-custom-minutes",
          e.meta.timeControlMinutes || 0,
          ["none", "1", "3", "5", "10", "15", "30"],
        ),
        setSelectFromValue(
          "tournament-settings-increment",
          "tournament-settings-custom-increment-label",
          "tournament-settings-custom-increment",
          e.meta.timeControlIncrement || 0,
          ["0", "2", "5", "10", "30"],
        ),
        (document.getElementById("tournament-settings-round-mode").value =
          "auto" === e.meta.roundApprovalMode ? "auto" : "manual"),
        (document.getElementById("tournament-settings-wo-grace-input").value =
          e.meta.woGraceMinutes || ""),
        (document.getElementById("tournament-settings-panel").style.display =
          ""));
    }),
  document
    .getElementById("tournament-roles-btn")
    .addEventListener("click", () => {
      try {
        (assertAdmin(),
          (document.getElementById("tournament-settings-panel").style.display =
            "none"));
        const e = lastTournamentState,
          t = tournamentRoleEmails_(
            e,
            "adminEmails",
            TOURNAMENT_ADMIN_EMAIL,
          ),
          a = tournamentRoleEmails_(
            e,
            "refereeEmails",
            TOURNAMENT_REFEREE_EMAIL,
          );
        ((document.getElementById("tournament-admin-emails-input").value =
          t.join("\n")),
          (document.getElementById("tournament-referee-emails-input").value =
            a.join("\n")),
          (document.getElementById("tournament-roles-panel").style.display =
            ""),
          renderTournamentRoleSummary_(e));
      } catch (e) {
        showError(e);
      }
    }),
  document
    .getElementById("tournament-roles-cancel-btn")
    .addEventListener("click", () => {
      document.getElementById("tournament-roles-panel").style.display = "none";
    }),
  document
    .getElementById("tournament-roles-save-btn")
    .addEventListener("click", async () => {
      const e = document.getElementById("tournament-admin-emails-input").value,
        t = document.getElementById("tournament-referee-emails-input").value;
      try {
        const a = parseRoleEmails_(e),
          n = normalizeRoleEmail_(currentUser && currentUser.email);
        if (
          n &&
          !a.includes(n) &&
          !confirm(
            "Tu correo no está en la nueva lista de administradores. Si guardás, perderás acceso a este panel. ¿Continuar?",
          )
        )
          return;
        (await fbUpdateTournamentRoles(e, t),
          (document.getElementById("tournament-roles-panel").style.display =
            "none"),
          toast("🔐 Roles del torneo actualizados."));
      } catch (e) {
        showError(e);
      }
    }),
  document
    .getElementById("tournament-settings-cancel-btn")
    .addEventListener("click", () => {
      document.getElementById("tournament-settings-panel").style.display =
        "none";
    }),
  document
    .getElementById("tournament-settings-save-btn")
    .addEventListener("click", async () => {
      try {
        assertAdmin();
        const e =
            document
              .getElementById("tournament-settings-name-input")
              .value.trim() || "Torneo",
          t = document
            .getElementById("tournament-settings-rounds-input")
            .value.trim();
        if (t && (!/^\d+$/.test(t) || Number(t) < 1))
          return void toast(
            "❌ La cantidad de rondas tiene que ser un número entero mayor a 0 (o dejalo vacío)",
          );
        const a = t ? Number(t) : null,
          n = {
            minutes: getRawMinutesFromSelect(
              "tournament-settings-time-mode",
              "tournament-settings-custom-minutes",
            ),
            increment: getIncrementFromSelect(
              "tournament-settings-increment",
              "tournament-settings-custom-increment",
            ),
          },
          o =
            "auto" ===
            document.getElementById("tournament-settings-round-mode").value
              ? "auto"
              : "manual",
          r = document
            .getElementById("tournament-settings-wo-grace-input")
            .value.trim();
        if (r && (!/^\d+$/.test(r) || Number(r) < 0))
          return void toast(
            "❌ El tiempo de espera tiene que ser un número entero de minutos (o dejalo vacío)",
          );
        (await fbUpdateSettings(e, a, n, o, r),
          (document.getElementById("tournament-settings-panel").style.display =
            "none"),
          toast("✓ Configuración guardada"));
      } catch (e) {
        showError(e);
      }
    }),
  document
    .getElementById("tournament-approve-round-btn")
    .addEventListener("click", async () => {
      try {
        (assertAdminOrReferee(),
          await fbApproveRound(),
          toast("✅ Ronda aprobada: se generó y publicó la ronda siguiente."));
      } catch (e) {
        showError(e);
      }
    }),
  document
    .getElementById("tournament-cancel-auto-approve-btn")
    .addEventListener("click", async () => {
      try {
        (assertAdminOrReferee(),
          await fbCancelAutoApproval(),
          toast(
            "✖️ Aprobación automática cancelada. Aprobá la ronda a mano cuando quieras.",
          ));
      } catch (e) {
        showError(e);
      }
    }),
  document
    .getElementById("tournament-close-round-btn")
    .addEventListener("click", async () => {
      try {
        (await fbCloseRound(),
          toast(
            "🔒 Ronda cerrada: los resultados quedaron bloqueados salvo para vos.",
          ));
      } catch (e) {
        showError(e);
      }
    }),
  document
    .getElementById("tournament-generate-round-btn")
    .addEventListener("click", async () => {
      try {
        const e = document.getElementById("tournament-manual-bye-box"),
          t = document.getElementById("tournament-manual-bye-select"),
          a = e && t && "none" !== e.style.display ? t.value : "";
        (await fbGenerateRoundFromClosed(a || void 0),
          toast(
            a
              ? "▶️ Se generó la ronda siguiente con el BYE elegido a mano."
              : "▶️ Se generó y publicó la ronda siguiente.",
          ));
      } catch (e) {
        showError(e);
      }
    }),
  document
    .getElementById("tournament-recalc-positions-btn")
    .addEventListener("click", async () => {
      if (
        confirm(
          "¿Recalcular las posiciones desde el historial de partidas? Esto corrige cualquier desincronización.",
        )
      )
        try {
          (await fbRecalculatePositions(),
            toast(
              "🔄 Posiciones recalculadas desde el historial de partidas.",
            ));
        } catch (e) {
          showError(e);
        }
    }),
  document
    .getElementById("tournament-print-pairings-btn")
    .addEventListener("click", () => {
      lastTournamentState && printCurrentRoundPairings(lastTournamentState);
    }),
  document
    .getElementById("tournament-export-standings-pdf-btn")
    .addEventListener("click", () => {
      lastTournamentState && exportStandingsPDF(lastTournamentState);
    }),
  document
    .getElementById("tournament-export-full-pdf-btn")
    .addEventListener("click", () => {
      try {
        if ((assertAdmin(), !lastTournamentState)) return;
        exportFullTournamentPDF(lastTournamentState);
      } catch (e) {
        showError(e);
      }
    }),
  document
    .getElementById("tournament-reset-btn")
    .addEventListener("click", async () => {
      if (
        confirm(
          "¿Seguro que querés borrar todo el torneo actual? No se puede deshacer.",
        )
      )
        try {
          await fbResetAll();
        } catch (e) {
          showError(e);
        }
    }),
  document
    .getElementById("tournament-add-player-btn")
    .addEventListener("click", async () => {
      const e = document.getElementById("tournament-add-player-name"),
        t = document.getElementById("tournament-add-player-email");
      try {
        (await fbAddPlayer(e.value, t.value),
          (e.value = ""),
          (t.value = ""),
          toast("✓ Jugador agregado"));
      } catch (e) {
        showError(e);
      }
    }),
  document
    .getElementById("tournament-self-register-btn")
    .addEventListener("click", async () => {
      const e = document.getElementById("tournament-self-register-name");
      try {
        (await fbSelfRegister(e.value), toast("✅ ¡Te inscribiste al torneo!"));
      } catch (e) {
        showError(e);
      }
    }),
  document
    .getElementById("tournament-refresh-btn")
    .addEventListener("click", refreshTournament));
const pendingBadgeBtn = document.getElementById("tournament-pending-badge");
(pendingBadgeBtn &&
  pendingBadgeBtn.addEventListener("click", () => {
    const e = document.getElementById("tournament-players-card");
    e && e.scrollIntoView({ behavior: "smooth", block: "start" });
  }),
  (function () {
    const e = getFirebaseConfig(),
      t = getTournamentRoom();
    if (((document.getElementById("tournament-room-input").value = t), e)) {
      document.getElementById("tournament-config-input").value = JSON.stringify(
        e,
        null,
        2,
      );
      try {
        connectFirebase(e, t);
      } catch (e) {
        document.getElementById("tournament-connect-status").textContent =
          "❌ " + e.message;
      }
    }
  })(),
  document.addEventListener("visibilitychange", () => {
    "visible" === document.visibilityState &&
      (tournamentMatchActive
        ? updateTournamentClockDisplay()
        : updateClockDisplay(),
      lastTournamentState &&
        lastTournamentState.meta &&
        renderRoundCountdown_(lastTournamentState));
  }));
document.documentElement.dataset.appReady = "1";
