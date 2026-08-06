/* Live tournament match lifecycle and event bindings. Generated from the verified legacy bundle. */
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
      clearOpponentMoveHighlight(),
      clearInterval(clockTimer),
      (clockTimer = null),
      (botEnabled = !1),
      (gameStarted = !0),
      game.load(s.fen),
      (selected = null),
      (validMoves = []),
      (tournamentResultShown = !1),
      showPage("jugar"),
      document.body.classList.add("tournament-board-max"),
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
      m = document.getElementById("tournament-match-spectator-note"),
      p = document.getElementById("tournament-match-controls");
    if (u) {
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
    } else ((m.style.display = ""), (p.style.display = "none"));
    (subscribeMatchChat(e, t),
      tournamentMyColor() && subscribeCallSignaling(e, t),
      renderCallUI(),
      render(),
      updateTournamentMatchBar(tournamentCurrentGameRow || s),
      requestAnimationFrame(sizeFullscreenBoard));
  } catch (e) {
    toast("❌ No se pudo abrir la partida: " + e.message);
  }
}
function exitTournamentMatch() {
  ((tournamentMatchActive = !1),
    (tournamentMatchCtx = null),
    (tournamentResultShown = !1),
    clearOpponentMoveHighlight(),
    clearInterval(tournamentClockTimer),
    (tournamentClockTimer = null),
    (tournamentCurrentGameRow = null),
    unsubscribeMatchChat(),
    unsubscribeCallSignaling(),
    (document.getElementById("tournament-match-bar").style.display = "none"),
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
  tournamentMatchBusy = !0;
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
      ),
      o = n.gameRow;
    (o && (tournamentCurrentGameRow = o),
      t &&
        !tournamentResultShown &&
        ((tournamentResultShown = !0), showTournamentResult(t)),
      t &&
        "pending_approval" === n.meta.roundStatus &&
        toast(
          "✅ Ya están todos los resultados de esta ronda, falta que el administrador la apruebe.",
        ),
      updateTournamentMatchBar(o));
  } catch (e) {
    (a &&
      ((tournamentCurrentGameRow = a),
      game.load(a.fen),
      (selected = null),
      (validMoves = []),
      render(),
      updateTournamentClockDisplay()),
      toast("❌ No se pudo sincronizar la jugada: " + e.message));
  } finally {
    tournamentMatchBusy = !1;
  }
}
(document
  .getElementById("tournament-match-back-btn")
  .addEventListener("click", exitTournamentMatch),
  document
    .getElementById("tournament-match-resign-btn")
    .addEventListener("click", async () => {
      const e = tournamentMyColor();
      if (e && confirm("¿Seguro que te querés rendir en esta partida?")) {
        tournamentMatchBusy = !0;
        try {
          const t = await fbMakeMove(
              tournamentMatchCtx.round,
              tournamentMatchCtx.board,
              game.fen(),
              game.history().slice(-1)[0] || "",
              "w" === e ? "0-1" : "1-0",
            ),
            a = t.gameRow;
          (tournamentResultShown ||
            ((tournamentResultShown = !0),
            showTournamentResult("w" === e ? "0-1" : "1-0")),
            updateTournamentMatchBar(a),
            toast(
              "pending_approval" === t.meta.roundStatus
                ? "🏳️ Te rendiste. Resultado cargado. Falta que el administrador apruebe la ronda."
                : "🏳️ Te rendiste. Resultado cargado.",
            ));
        } catch (e) {
          showError(e);
        } finally {
          tournamentMatchBusy = !1;
        }
      }
    }),
  document
    .getElementById("tournament-match-draw-btn")
    .addEventListener("click", async () => {
      if (
        tournamentMyColor() &&
        confirm("¿Las dos partes están de acuerdo en tablas?")
      ) {
        tournamentMatchBusy = !0;
        try {
          const e = await fbMakeMove(
              tournamentMatchCtx.round,
              tournamentMatchCtx.board,
              game.fen(),
              game.history().slice(-1)[0] || "",
              "1/2-1/2",
            ),
            t = e.gameRow;
          (tournamentResultShown ||
            ((tournamentResultShown = !0), showTournamentResult("1/2-1/2")),
            updateTournamentMatchBar(t),
            toast(
              "pending_approval" === e.meta.roundStatus
                ? "🤝 Tablas cargadas. Falta que el administrador apruebe la ronda."
                : "🤝 Tablas cargadas.",
            ));
        } catch (e) {
          showError(e);
        } finally {
          tournamentMatchBusy = !1;
        }
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
      if (
        confirm(
          "¿Cerrar el torneo ahora y declarar campeón según la tabla actual?",
        )
      )
        try {
          await fbFinishTournament();
        } catch (e) {
          showError(e);
        }
    }),
  document
    .getElementById("tournament-reopen-btn")
    .addEventListener("click", async () => {
      try {
        await fbReopenTournament();
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
  document
    .querySelectorAll(
      "#tournament-round-countdown-composer [data-countdown-minutes]",
    )
    .forEach((e) => {
      e.addEventListener("click", async () => {
        try {
          (await fbSetRoundCountdown(Number(e.dataset.countdownMinutes)),
            toast("⏳ Countdown iniciado"));
        } catch (e) {
          showError(e);
        }
      });
    }),
  document
    .getElementById("tournament-round-countdown-start-btn")
    .addEventListener("click", async () => {
      const e = document.getElementById(
        "tournament-round-countdown-custom-minutes",
      );
      try {
        (await fbSetRoundCountdown(Number(e.value)),
          (e.value = ""),
          toast("⏳ Countdown iniciado"));
      } catch (e) {
        showError(e);
      }
    }),
  document
    .getElementById("tournament-round-countdown-cancel-btn")
    .addEventListener("click", async () => {
      try {
        (await fbCancelRoundCountdown(), toast("⏳ Countdown cancelado"));
      } catch (e) {
        showError(e);
      }
    }),
  document
    .getElementById("tournament-settings-btn")
    .addEventListener("click", () => {
      const e = lastTournamentState;
      e &&
        ((document.getElementById("tournament-settings-name-input").value =
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
        (await fbUpdateSettings(e, a, [TOURNAMENT_ADMIN_EMAIL], n, o, r),
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
        (assertAdmin(),
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
        (assertAdmin(),
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
