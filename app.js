/* Core UI, state, alerts, avatars, and sound. Generated from the verified legacy bundle. */
"use strict";
let state,
  matchChatPanelOpen,
  gameStarted,
  tournamentMatchActive,
  opponentMoveHighlight,
  explainMode,
  lastTournamentState,
  currentUser;
"serviceWorker" in navigator &&
  location.hostname.endsWith(".github.io") &&
  window.addEventListener("load", async () => {
    const e = "20260806-11";
    if (localStorage.getItem("chessServiceWorkerCleanup") === e) return;
    try {
      const t = await navigator.serviceWorker.getRegistrations();
      if (
        (await Promise.all(t.map((e) => e.unregister())), "caches" in window)
      ) {
        const e = await caches.keys();
        await Promise.all(e.map((e) => caches.delete(e)));
      }
      localStorage.setItem("chessServiceWorkerCleanup", e);
    } catch (e) {
      console.warn("No se pudo limpiar la cache anterior de GitHub Pages:", e);
    }
  });
let internetClockOffsetMs = 0,
  internetClockAnchorUtcMs_ = 0,
  internetClockAnchorPerfMs_ = 0,
  internetClockIsSynced_ = !1,
  internetClockSyncPromise_ = null;
const TOURNAMENT_ADMIN_EMAIL = "ipem146centenario@gmail.com";
!(function () {
  const e = document.createElement("style");
  ((e.textContent =
    '\n          html, *, *::before, *::after {\n            -webkit-tap-highlight-color: transparent;\n          }\n          button, .btn, a, [role="button"], .avatar-bubble, .avatar-option {\n            touch-action: manipulation;\n          }\n          button:active,\n          .btn:active,\n          .avatar-option:active,\n          .avatar-bubble:active {\n            transform: scale(0.96);\n            opacity: 0.85;\n            transition: transform 0.08s ease-out, opacity 0.08s ease-out;\n          }\n        '),
    document.head.appendChild(e));
})();
const PIECES = {
    wK: "♔",
    wQ: "♕",
    wR: "♖",
    wB: "♗",
    wN: "♘",
    wP: "♙",
    bK: "♚",
    bQ: "♛",
    bR: "♜",
    bB: "♝",
    bN: "♞",
    bP: "♟",
  },
  FILES = ["a", "b", "c", "d", "e", "f", "g", "h"],
  AVATAR_MASCOTS = {
    knight: {
      emoji: "♞",
      label: "Caballo saltarín",
      anim: "avatar-bounce",
      color1: "#7c3aed",
      color2: "#a78bfa",
    },
    pawn: {
      emoji: "♟",
      label: "Peón valiente",
      anim: "avatar-wiggle",
      color1: "#2563eb",
      color2: "#60a5fa",
    },
    rook: {
      emoji: "♜",
      label: "Torre firme",
      anim: "avatar-pulse",
      color1: "#059669",
      color2: "#34d399",
    },
    bishop: {
      emoji: "♝",
      label: "Alfil astuto",
      anim: "avatar-tilt",
      color1: "#d97706",
      color2: "#fbbf24",
    },
    queen: {
      emoji: "♛",
      label: "Dama veloz",
      anim: "avatar-spin",
      color1: "#db2777",
      color2: "#f472b6",
    },
    king: {
      emoji: "♚",
      label: "Rey sabio",
      anim: "avatar-nod",
      color1: "#dc2626",
      color2: "#f87171",
    },
  };
let avatarStylesInjected = !1;
function injectAvatarStyles_() {
  if (avatarStylesInjected) return;
  avatarStylesInjected = !0;
  const e = document.createElement("style");
  ((e.textContent =
    '\n          .avatar-bubble {\n            display: inline-flex; align-items: center; justify-content: center;\n            width: 34px; height: 34px; border-radius: 50%;\n            font-size: 18px; line-height: 1; cursor: pointer;\n            box-shadow: 0 2px 6px rgba(0,0,0,.25);\n            border: 2px solid rgba(255,255,255,.6);\n            vertical-align: middle; margin-right: 8px;\n            user-select: none; flex-shrink: 0;\n            transition: transform 0.15s ease-out;\n          }\n          .avatar-bubble.large { width: 54px; height: 54px; font-size: 28px; }\n          .avatar-bubble.static { animation: none !important; }\n          .avatar-bubble:hover { transform: scale(1.08); }\n          @keyframes avatar-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }\n          @keyframes avatar-wiggle { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(8deg)} }\n          @keyframes avatar-pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }\n          @keyframes avatar-tilt   { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(14deg)} }\n          @keyframes avatar-spin   { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }\n          @keyframes avatar-nod    { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(2px) rotate(-4deg)} }\n          .avatar-bounce { animation: avatar-bounce 1.1s ease-in-out infinite; }\n          .avatar-wiggle { animation: avatar-wiggle 1.4s ease-in-out infinite; }\n          .avatar-pulse  { animation: avatar-pulse 1.3s ease-in-out infinite; }\n          .avatar-tilt   { animation: avatar-tilt 1.6s ease-in-out infinite; }\n          .avatar-spin   { animation: avatar-spin 3.2s linear infinite; }\n          .avatar-nod    { animation: avatar-nod 1.2s ease-in-out infinite; }\n          /* Quien tenga activado "reducir movimiento" en su sistema no\n             tiene por qué ver 6 mascotas dando vueltas sin parar en cada\n             pantalla; se les congela la pose (sin perder el color/forma\n             que identifica a cada una). */\n          @media (prefers-reduced-motion: reduce) {\n            .avatar-bounce, .avatar-wiggle, .avatar-pulse,\n            .avatar-tilt, .avatar-spin, .avatar-nod { animation: none; }\n            .avatar-bubble:hover { transform: none; }\n          }\n          #avatar-picker-backdrop {\n            position: fixed; inset: 0; background: rgba(0,0,0,.55);\n            display: flex; align-items: center; justify-content: center;\n            z-index: 9999;\n          }\n          /* Antes en colores fijos (#1e1e2e / #fff), lo que dejaba el\n             modal desentonando si la app tiene o suma un tema claro. Usa\n             las mismas variables que ya define el resto de la app\n             (--surface/--text), con el valor anterior como fallback por\n             si este archivo se usa suelto sin ese tema. */\n          #avatar-picker-box {\n            background: var(--surface, #1e1e2e); color: var(--text, #fff);\n            padding: 20px; border-radius: 14px;\n            max-width: 320px; width: 90%; text-align: center;\n            box-shadow: 0 10px 30px rgba(0,0,0,.4);\n          }\n          #avatar-picker-box h3 { margin: 0 0 12px; font-size: 16px; }\n          #avatar-picker-grid {\n            display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;\n            margin-bottom: 14px;\n          }\n          .avatar-option {\n            display: flex; flex-direction: column; align-items: center; gap: 6px;\n            padding: 8px 4px; border-radius: 10px; cursor: pointer;\n            border: 2px solid transparent;\n            transition: background-color 0.15s ease-out, border-color 0.15s ease-out;\n          }\n          .avatar-option:hover { background: var(--surface2, rgba(255,255,255,.08)); }\n          .avatar-option.selected { border-color: var(--accent, #fff); background: var(--surface2, rgba(255,255,255,.08)); }\n          /* Las opciones ahora llevan tabindex/role="button" (ver\n             openAvatarPicker), así que necesitan un foco visible propio\n             para quien navega con teclado; antes no había forma de saber\n             cuál estaba seleccionada sin mouse. */\n          .avatar-option:focus-visible {\n            outline: 2px solid var(--accent, #fff);\n            outline-offset: 2px;\n          }\n          .avatar-option span.opt-label { font-size: 11px; opacity: .85; }\n          #avatar-picker-close {\n            background: var(--surface2, #444); color: var(--text, #fff); border: none; border-radius: 8px;\n            padding: 8px 16px; cursor: pointer; font-size: 13px;\n            transition: filter 0.15s ease-out;\n          }\n          #avatar-picker-close:hover { filter: brightness(1.15); }\n          #avatar-picker-close:focus-visible {\n            outline: 2px solid var(--accent, #fff);\n            outline-offset: 2px;\n          }\n        '),
    document.head.appendChild(e));
}
function avatarBubbleHTML_(e, t = {}) {
  const a = AVATAR_MASCOTS[e] || AVATAR_MASCOTS.knight,
    n = t.large ? " large" : "",
    o = t.static ? " static" : "",
    r = `linear-gradient(135deg, ${a.color1}, ${a.color2})`;
  return `<span class="avatar-bubble${n}${o} ${a.anim}" style="background:${r}" title="${escapeHtml_(a.label)}">${a.emoji}</span>`;
}
function renderMiniAvatar() {
  injectAvatarStyles_();
  const e = document.getElementById("mini-name");
  if (!e) return;
  let t = document.getElementById("mini-avatar");
  (t ||
    ((t = document.createElement("span")),
    (t.id = "mini-avatar"),
    e.parentNode.insertBefore(t, e)),
    (t.innerHTML = avatarBubbleHTML_(state.avatar || "knight")),
    (t.onclick = openAvatarPicker),
    (t.querySelector(".avatar-bubble").onclick = openAvatarPicker));
}
function renderBoardAvatars_() {
  (injectAvatarStyles_(),
    [
      document.getElementById("clock-w"),
      document.getElementById("clock-b"),
    ].forEach((e) => {
      e &&
        (e.querySelector(".avatar-bubble") ||
          e.insertAdjacentHTML(
            "afterbegin",
            avatarBubbleHTML_(state.avatar || "knight"),
          ));
    }));
}
function openAvatarPicker() {
  (injectAvatarStyles_(), closeAvatarPicker_());
  const e = document.createElement("div");
  e.id = "avatar-picker-backdrop";
  const t = state.avatar || "knight",
    a = Object.keys(AVATAR_MASCOTS)
      .map(
        (e) =>
          `\n            <div class="avatar-option${e === t ? " selected" : ""}" data-avatar="${e}" tabindex="0" role="button" aria-pressed="${e === t}" aria-label="${escapeHtml_(AVATAR_MASCOTS[e].label)}">\n              ${avatarBubbleHTML_(e, { large: !0 })}\n              <span class="opt-label">${escapeHtml_(AVATAR_MASCOTS[e].label)}</span>\n            </div>`,
      )
      .join("");
  ((e.innerHTML = `\n          <div id="avatar-picker-box">\n            <h3>🐴 Elegí tu mascota</h3>\n            <div id="avatar-picker-grid">${a}</div>\n            <button id="avatar-picker-close">Cerrar</button>\n          </div>`),
    document.body.appendChild(e),
    e.addEventListener("click", (t) => {
      t.target === e && closeAvatarPicker_();
    }),
    document.addEventListener("keydown", handleAvatarPickerEscape_));
  const n = (e) => {
    ((state.avatar = e.dataset.avatar),
      save(),
      renderMiniAvatar(),
      renderBoardAvatars_(),
      closeAvatarPicker_(),
      toast("✓ Mascota actualizada"));
  };
  (e.querySelectorAll(".avatar-option").forEach((e) => {
    (e.addEventListener("click", () => n(e)),
      e.addEventListener("keydown", (t) => {
        ("Enter" !== t.key && " " !== t.key) || (t.preventDefault(), n(e));
      }));
  }),
    document
      .getElementById("avatar-picker-close")
      .addEventListener("click", closeAvatarPicker_));
}
function handleAvatarPickerEscape_(e) {
  "Escape" === e.key && closeAvatarPicker_();
}
function closeAvatarPicker_() {
  const e = document.getElementById("avatar-picker-backdrop");
  (e && e.remove(),
    document.removeEventListener("keydown", handleAvatarPickerEscape_));
}
const DEFAULT_STATE = {
  name: "Alumno",
  course: "",
  xp: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  games: 0,
  puzzles: 0,
  history: [],
  savedGames: [],
  avatar: "knight",
};
state = loadState();
let toastTimer = null,
  alertOnClose_ = null;
function escapeHtml_(e) {
  return String(null == e ? "" : e).replace(
    /[&<>"']/g,
    (e) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        e
      ],
  );
}
function loadState() {
  try {
    const e = JSON.parse(localStorage.getItem("chessSchoolData"));
    return { ...DEFAULT_STATE, ...(e || {}) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}
function save() {
  try {
    localStorage.setItem("chessSchoolData", JSON.stringify(state));
  } catch (e) {
    (console.error("No se pudo guardar el progreso en localStorage:", e),
      save._warned ||
        ((save._warned = !0),
        toast("⚠️ No se pudo guardar tu progreso en este navegador")));
  }
}
function showError(e, t) {
  (console.error(e),
    toast(
      "❌ " + (e && e.message ? e.message : t || "Ocurrió un error inesperado"),
    ));
}
function toast(e, t) {
  const a = document.getElementById("toast");
  ((a.textContent = e),
    a.classList.add("show"),
    clearTimeout(toastTimer),
    (toastTimer = setTimeout(() => a.classList.remove("show"), t || 2200)));
}
function showAlert(e, t) {
  const a = document.getElementById("alert-box");
  (a.classList.remove("result-win", "result-loss", "result-draw"),
    t && a.classList.add("result-" + t),
    (document.getElementById("alert-box-text").textContent = e),
    (document.getElementById("alert-analyze-btn").style.display = "none"));
  const n = document.getElementById("alert-back-to-tournament-btn");
  n && (n.style.display = "none");
  const o = document.getElementById("alert-chat-btn");
  const r = document.getElementById("alert-tournament-round-actions");
  (o && (o.style.display = "none"),
    r && r.remove(),
    (alertOnClose_ = null),
    document.getElementById("alert").classList.add("show"));
}
function closeAlert_() {
  document.getElementById("alert").classList.remove("show");
  const e = alertOnClose_;
  ((alertOnClose_ = null), e && e());
}
function offerAnalysis(e) {
  const t = document.getElementById("alert-analyze-btn");
  ((t.style.display = "inline-flex"),
    (t.onclick = () => {
      (closeAlert_(), openAnalysisModal(e));
    }));
}
function showAlertBackToTournamentButton_() {
  let e = document.getElementById("alert-back-to-tournament-btn");
  if (!e) {
    ((e = document.createElement("button")),
      (e.id = "alert-back-to-tournament-btn"),
      (e.className = "btn primary"),
      (e.style.marginTop = "10px"));
    const t = document.getElementById("alert-analyze-btn");
    t && t.parentNode
      ? t.parentNode.insertBefore(e, t.nextSibling)
      : document.getElementById("alert-box").appendChild(e);
  }
  ((e.textContent = "🏆 Volver al torneo"),
    (e.style.display = "inline-flex"),
    (e.onclick = () => closeAlert_()));
}
function showChatMessagePopup(e, t) {
  showAlert("💬 " + e + ": " + (t.length > 140 ? t.slice(0, 140) + "…" : t));
  const a = document.getElementById("alert-chat-btn");
  a &&
    ((a.style.display = "inline-flex"),
    (a.onclick = () => {
      (closeAlert_(), matchChatPanelOpen || toggleMatchChatPanel());
    }));
}
document.getElementById("alert").onclick = (e) => {
  "alert" === e.target.id && closeAlert_();
};
const game = new Chess();
let selected = null,
  validMoves = [],
  showLegalMoves = "off" !== localStorage.getItem("chessShowLegalMoves"),
  showThreats = "off" !== localStorage.getItem("chessShowThreats"),
  dragCtx = null,
  justDraggedUntil = 0;
const DRAG_THRESHOLD = 6,
  SoundFX = (() => {
    let e = null,
      t = !0,
      a = null;
    function n() {
      if (!e) {
        const t = window.AudioContext || window.webkitAudioContext;
        if (!t) return null;
        e = new t();
      }
      return ("suspended" === e.state && e.resume().catch(() => {}), e);
    }
    function o(
      e,
      t,
      a,
      { type: o = "sine", gain: r = 0.16, glideTo: s = null } = {},
    ) {
      const l = n();
      if (!l) return;
      const i = l.createOscillator(),
        c = l.createGain();
      ((i.type = o),
        i.frequency.setValueAtTime(e, l.currentTime + t),
        s && i.frequency.exponentialRampToValueAtTime(s, l.currentTime + t + a),
        c.gain.setValueAtTime(1e-4, l.currentTime + t),
        c.gain.exponentialRampToValueAtTime(r, l.currentTime + t + 0.012),
        c.gain.exponentialRampToValueAtTime(1e-4, l.currentTime + t + a),
        i.connect(c),
        c.connect(l.destination),
        i.start(l.currentTime + t),
        i.stop(l.currentTime + t + a + 0.02));
    }
    return {
      setEnabled(e) {
        t = e;
      },
      isEnabled: () => t,
      unlock() {
        n();
      },
      move() {
        t && o(520, 0, 0.09, { type: "triangle", gain: 0.14 });
      },
      capture() {
        t &&
          ((function (e, t, a = 0.18) {
            const o = n();
            if (!o) return;
            const r = Math.floor(o.sampleRate * t),
              s = o.createBuffer(1, r, o.sampleRate),
              l = s.getChannelData(0);
            for (let e = 0; e < r; e++)
              l[e] = (2 * Math.random() - 1) * (1 - e / r);
            const i = o.createBufferSource();
            i.buffer = s;
            const c = o.createBiquadFilter();
            ((c.type = "bandpass"), (c.frequency.value = 900));
            const d = o.createGain();
            (d.gain.setValueAtTime(a, o.currentTime + e),
              d.gain.exponentialRampToValueAtTime(1e-4, o.currentTime + e + t),
              i.connect(c),
              c.connect(d),
              d.connect(o.destination),
              i.start(o.currentTime + e));
          })(0, 0.11, 0.22),
          o(220, 0.01, 0.1, { type: "square", gain: 0.1 }));
      },
      castle() {
        t &&
          (o(440, 0, 0.08, { type: "triangle", gain: 0.13 }),
          o(560, 0.08, 0.1, { type: "triangle", gain: 0.13 }));
      },
      check() {
        t &&
          (o(740, 0, 0.09, { type: "sawtooth", gain: 0.12 }),
          o(880, 0.09, 0.12, { type: "sawtooth", gain: 0.12 }));
      },
      checkmate() {
        t &&
          (o(660, 0, 0.14, { type: "sawtooth", gain: 0.15 }),
          o(523, 0.14, 0.14, { type: "sawtooth", gain: 0.15 }),
          o(392, 0.28, 0.32, { type: "sawtooth", gain: 0.16 }));
      },
      draw() {
        t &&
          (o(440, 0, 0.16, { type: "sine", gain: 0.13 }),
          o(440, 0.18, 0.16, { type: "sine", gain: 0.13 }));
      },
      select() {
        t && o(880, 0, 0.045, { type: "sine", gain: 0.06 });
      },
      chatMessage() {
        t &&
          (o(700, 0, 0.06, { type: "sine", gain: 0.09 }),
          o(920, 0.07, 0.08, { type: "sine", gain: 0.09 }));
      },
      announcement() {
        t &&
          (o(660, 0, 0.1, { type: "sine", gain: 0.15 }),
          o(880, 0.12, 0.1, { type: "sine", gain: 0.15 }),
          o(1040, 0.24, 0.16, { type: "sine", gain: 0.16 }));
      },
      invalid() {
        t && o(160, 0, 0.13, { type: "square", gain: 0.09 });
      },
      gameStart() {
        t &&
          (o(392, 0, 0.09, { type: "triangle", gain: 0.12 }),
          o(494, 0.09, 0.09, { type: "triangle", gain: 0.12 }),
          o(659, 0.18, 0.16, { type: "triangle", gain: 0.14 }));
      },
      promote() {
        t &&
          (o(523, 0, 0.08, { type: "triangle", gain: 0.13 }),
          o(659, 0.08, 0.08, { type: "triangle", gain: 0.13 }),
          o(784, 0.16, 0.14, { type: "triangle", gain: 0.15 }));
      },
      levelUp() {
        t &&
          (o(523, 0, 0.1, { type: "triangle", gain: 0.14 }),
          o(659, 0.1, 0.1, { type: "triangle", gain: 0.14 }),
          o(784, 0.2, 0.1, { type: "triangle", gain: 0.14 }),
          o(1047, 0.3, 0.28, { type: "triangle", gain: 0.17 }));
      },
      startRing() {
        if (a) return;
        const e = () => {
          t &&
            (o(1e3, 0, 0.35, { type: "sine", gain: 0.15 }),
            o(1e3, 0.45, 0.35, { type: "sine", gain: 0.15 }));
        };
        (e(), (a = setInterval(e, 2e3)));
      },
      stopRing() {
        a && (clearInterval(a), (a = null));
      },
    };
  })();
function playSoundForMove(e, t) {
  e &&
    (t && t.in_checkmate()
      ? SoundFX.checkmate()
      : t && t.in_check()
        ? SoundFX.check()
        : e.flags && (e.flags.includes("k") || e.flags.includes("q"))
          ? SoundFX.castle()
          : e.flags && e.flags.includes("p")
            ? SoundFX.promote()
            : e.flags && (e.flags.includes("c") || e.flags.includes("e"))
              ? SoundFX.capture()
              : SoundFX.move());
}
let justMovedAnim = null;
function markMoveForAnimation(e) {
  if (!e) return;
  const t = !(!e.flags || !e.flags.includes("e")),
    a = !(!e.flags || (!e.flags.includes("c") && !t));
  justMovedAnim = {
    from: e.from,
    to: e.to,
    captured: a,
    capturedType: e.captured || null,
    capturedColor: "w" === e.color ? "b" : "w",
    capturedSquare: t ? e.to[0] + e.from[1] : e.to,
    promoted: !(!e.flags || !e.flags.includes("p")),
  };
}


/* Board, gameplay, clocks, profile, and preferences. Generated from the verified legacy bundle. */
let botEnabled = !1,
  botColor = "b",
  botDifficulty = "medio",
  botThinking = !1,
  sfWorker = null;
function initStockfishWorker() {
  try {
    sfWorker = new Worker(
      "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js",
    );
  } catch (e) {
    try {
      fetch(
        "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js",
      )
        .then((e) => e.text())
        .then((e) => {
          const t = new Blob([e], { type: "application/javascript" });
          sfWorker = new Worker(URL.createObjectURL(t));
        });
    } catch (e) {
      console.error("No se pudo iniciar Stockfish", e);
    }
  }
}
function ensureStockfishWorker() {
  sfWorker || initStockfishWorker();
}
function getStockfishSkill(e) {
  switch (e) {
    case "facil":
      return 2;
    case "medio":
    default:
      return 8;
    case "dificil":
      return 15;
    case "experto":
      return 20;
  }
}
function getStockfishDepth(e) {
  switch (e) {
    case "facil":
      return 2;
    case "medio":
    default:
      return 5;
    case "dificil":
      return 10;
    case "experto":
      return 14;
  }
}
function getStockfishMoveTime(e) {
  switch (e) {
    case "facil":
      return 150;
    case "medio":
    default:
      return 350;
    case "dificil":
      return 700;
    case "experto":
      return 1100;
  }
}
function maybeTriggerBotMove() {
  if (tournamentMatchActive)
    return (
      opponentMoveHighlight && (clearOpponentMoveHighlight(), render()),
      void syncTournamentMove()
    );
  if (
    !botEnabled ||
    !gameStarted ||
    game.game_over() ||
    game.turn() !== botColor
  )
    return;
  if ((ensureStockfishWorker(), (botThinking = !0), render(), !sfWorker))
    return void setTimeout(() => {
      const e = game.ugly_moves({ verbose: !0 });
      if (e.length > 0) {
        const t = e[Math.floor(Math.random() * e.length)],
          a = game.fen(),
          n = game.move({
            from: t.from,
            to: t.to,
            promotion: t.promotion || "q",
          });
        (addIncrement(),
          markMoveForAnimation(n),
          playSoundForMove(n, game),
          showMoveExplanation(a, n),
          (botThinking = !1),
          render(),
          checkGameOver());
      }
    }, 120);
  const e = getStockfishSkill(botDifficulty),
    t = getStockfishDepth(botDifficulty),
    a = getStockfishMoveTime(botDifficulty);
  ((sfWorker.onmessage = function (e) {
    const t = e.data;
    if ("string" == typeof t && t.startsWith("bestmove")) {
      const e = t.split(" ")[1];
      if (e && e.length >= 4) {
        const t = e.substring(0, 2),
          a = e.substring(2, 4),
          n = e.length > 4 ? e[4] : void 0,
          o = game.fen(),
          r = game.move({ from: t, to: a, promotion: n || "q" });
        (addIncrement(),
          markMoveForAnimation(r),
          playSoundForMove(r, game),
          showMoveExplanation(o, r));
      }
      ((botThinking = !1), render(), checkGameOver());
    }
  }),
    sfWorker.postMessage("uci"),
    sfWorker.postMessage(`setoption name Skill Level value ${e}`),
    sfWorker.postMessage(`position fen ${game.fen()}`),
    sfWorker.postMessage(`go depth ${t} movetime ${a}`));
}
function updateModeUI() {
  const e = document.getElementById("mode");
  if (!e) return;
  const t = "bot" === e.value,
    a = document.getElementById("bot-difficulty-label"),
    n = document.getElementById("bot-color-label");
  (a && (a.style.display = t ? "" : "none"),
    n && (n.style.display = t ? "" : "none"));
  const o = document.getElementById("pvp-flip-label");
  o && (o.style.display = t ? "none" : "");
}
((gameStarted = !1), (tournamentMatchActive = !1));
let tournamentMatchCtx = null,
  tournamentMatchBusy = !1,
  tournamentResultShown = !1,
  tournamentClockTimer = null,
  tournamentCurrentGameRow = null,
  opponentSelectedSquare = null,
  tournamentSelectionLastSent_ = null,
  tournamentSelectionSyncTimer_ = null,
  tournamentSelectionWriteChain_ = Promise.resolve(),
  matchChatUnsub = null,
  matchChatMessages = [];
matchChatPanelOpen = !1;
let matchChatUnreadCount = 0,
  matchChatFirstSnapshot = !0,
  matchChatMuted = "on" === localStorage.getItem("chessMatchChatMuted");
const RTC_ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
let callPc = null,
  callLocalStream = null,
  callDocUnsub = null,
  callCandidatesUnsub = [],
  callState = "idle",
  callIsMuted = !1,
  callPendingOffer = null,
  tournamentTimeoutClaimBusy = !1;
function animateMoveTransition(e, t, a, n) {
  const o = t.from ? e.querySelector(`[data-square="${t.from}"]`) : null,
    r = t.to ? e.querySelector(`[data-square="${t.to}"]`) : null;
  if (a && o && r && t.from !== t.to) {
    const e = o.getBoundingClientRect(),
      n = r.getBoundingClientRect(),
      s = e.left - n.left,
      l = e.top - n.top;
    ((a.style.transition = "none"),
      (a.style.transform = `translate(${s}px, ${l}px)`),
      a.offsetWidth,
      (a.style.transition = "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)"),
      (a.style.transform = "translate(0, 0)"),
      a.addEventListener(
        "transitionend",
        () => {
          ((a.style.transition = ""),
            (a.style.transform = ""),
            t.promoted &&
              (a.classList.add("piece-promoted"),
              a.addEventListener(
                "animationend",
                () => {
                  a.classList.remove("piece-promoted");
                },
                { once: !0 },
              )));
        },
        { once: !0 },
      ));
  } else a && t.promoted && a.classList.add("piece-promoted");
  if (t.captured && n && t.capturedType && t.capturedColor) {
    const e = document.createElement("div");
    ((e.className =
      "piece piece-captured-ghost " +
      ("w" === t.capturedColor ? "white-piece" : "black-piece")),
      (e.textContent = PIECES[t.capturedColor + t.capturedType.toUpperCase()]),
      (e.dataset.piece = t.capturedType.toUpperCase()),
      n.appendChild(e),
      setTimeout(() => e.remove(), 280));
  }
}
function squareDisplayPercent(e, t, a, n) {
  const o = n.indexOf(e[0]),
    r = 8 - parseInt(e[1], 10),
    s = t.indexOf(r),
    l = a.indexOf(o);
  return -1 === s || -1 === l
    ? null
    : { x: 12.5 * (l + 0.5), y: 12.5 * (s + 0.5) };
}
function buildOpponentMoveArrow(e, t, a, n, o) {
  const r = squareDisplayPercent(e, a, n, o),
    s = squareDisplayPercent(t, a, n, o);
  if (!r || !s) return null;
  const l = "http://www.w3.org/2000/svg",
    i = document.createElementNS(l, "svg");
  (i.setAttribute("viewBox", "0 0 100 100"),
    i.classList.add("opp-move-arrow-overlay"));
  const c = document.createElementNS(l, "defs"),
    d = document.createElementNS(l, "marker");
  (d.setAttribute("id", "oppMoveArrowHead"),
    d.setAttribute("viewBox", "0 0 10 10"),
    d.setAttribute("refX", "7"),
    d.setAttribute("refY", "5"),
    d.setAttribute("markerWidth", "4.2"),
    d.setAttribute("markerHeight", "4.2"),
    d.setAttribute("orient", "auto-start-reverse"));
  const u = document.createElementNS(l, "path");
  (u.setAttribute("d", "M0,0 L10,5 L0,10 z"),
    u.setAttribute("fill", "rgba(70, 160, 255, 0.9)"),
    d.appendChild(u),
    c.appendChild(d),
    i.appendChild(c));
  const m = s.x - r.x,
    p = s.y - r.y,
    g = Math.sqrt(m * m + p * p) || 1,
    f = s.x - (m / g) * 4,
    h = s.y - (p / g) * 4,
    y = document.createElementNS(l, "line");
  return (
    y.setAttribute("x1", r.x),
    y.setAttribute("y1", r.y),
    y.setAttribute("x2", f),
    y.setAttribute("y2", h),
    y.setAttribute("stroke", "rgba(70, 160, 255, 0.9)"),
    y.setAttribute("stroke-width", "2.4"),
    y.setAttribute("stroke-linecap", "round"),
    y.setAttribute("marker-end", "url(#oppMoveArrowHead)"),
    i.appendChild(y),
    i
  );
}
function computeReachableSquares(e, t) {
  const a = e.split(" ");
  ((a[1] = t), (a[3] = "-"));
  try {
    const e = new Chess(a.join(" ")).moves({ verbose: !0 }),
      t = new Set();
    for (const a of e) t.add(a.to);
    return t;
  } catch (e) {
    return new Set();
  }
}
let threatenedSquaresCache = { fen: null, result: null };
function getThreatenedSquares(e) {
  if (threatenedSquaresCache.fen === e) return threatenedSquaresCache.result;
  const t = computeReachableSquares(e, "w"),
    a = computeReachableSquares(e, "b"),
    n = new Chess(e),
    o = new Set(),
    r = ["a", "b", "c", "d", "e", "f", "g", "h"];
  for (const e of r)
    for (let r = 1; r <= 8; r++) {
      const s = e + r,
        l = n.get(s);
      l &&
        ("w" === l.color && a.has(s) && o.add(s),
        "b" === l.color && t.has(s) && o.add(s));
    }
  return ((threatenedSquaresCache = { fen: e, result: o }), o);
}
opponentMoveHighlight = null;
let opponentMoveHighlightTimer = null;
function clearOpponentMoveHighlight() {
  (clearTimeout(opponentMoveHighlightTimer),
    (opponentMoveHighlightTimer = null),
    (opponentMoveHighlight = null));
}
let boardSquareEls_ = null,
  boardFlipState_ = null;
function render() {
  const e = document.getElementById("board"),
    t = e.closest(".board-frame");
  t && t.classList.toggle("thinking", !!botThinking);
  const a = game.in_check(),
    n = game.turn(),
    o =
      !tournamentMatchActive &&
      (document.getElementById("toggle-threats")
        ? document.getElementById("toggle-threats").checked
        : showThreats)
        ? getThreatenedSquares(game.fen())
        : null,
    r = document.getElementById("pvp-flip"),
    s = !(!r || !r.checked),
    l = tournamentMatchActive
      ? "b" === tournamentMyColor()
      : botEnabled
        ? "w" === botColor
        : s && "b" === n,
    i = l ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7],
    c = l ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7],
    d = ["a", "b", "c", "d", "e", "f", "g", "h"];
  let u = null,
    m = null;
  const p = game.history({ verbose: !0 }),
    g = p.length > 0 ? p[p.length - 1] : null,
    f = e.querySelector(".opp-move-arrow-overlay");
  if (
    (f && f.remove(),
    !boardSquareEls_ || boardFlipState_ !== l || 64 !== e.children.length)
  ) {
    ((e.innerHTML = ""), (boardSquareEls_ = new Map()));
    for (const t of i)
      for (const a of c) {
        const n = d[a] + (8 - t),
          o = document.createElement("div");
        if (
          ((o.className = "square " + ((t + a) % 2 ? "dark" : "light")),
          (o.dataset.square = n),
          (o.style.touchAction = "manipulation"),
          a === (l ? 7 : 0))
        ) {
          const e = document.createElement("span");
          ((e.className = "coord rank"),
            (e.textContent = 8 - t),
            o.appendChild(e));
        }
        if (t === (l ? 0 : 7)) {
          const e = document.createElement("span");
          ((e.className = "coord file"),
            (e.textContent = d[a]),
            o.appendChild(e));
        }
        ((o.onclick = () => clickSquare(n)),
          e.appendChild(o),
          boardSquareEls_.set(n, o));
      }
    boardFlipState_ = l;
  }
  for (const [e, t] of boardSquareEls_) {
    t.classList.remove(
      "selected",
      "opponent-selected",
      "last",
      "opp-move",
      "check",
      "hint",
      "threat",
      "capture-flash",
    );
    const r = t.querySelector(".piece:not(.piece-captured-ghost)");
    (r && r.remove(),
      selected === e && t.classList.add("selected"),
      opponentSelectedSquare === e && t.classList.add("opponent-selected"),
      !g || (g.from !== e && g.to !== e) || t.classList.add("last"),
      !opponentMoveHighlight ||
        (opponentMoveHighlight.from !== e && opponentMoveHighlight.to !== e) ||
        t.classList.add("opp-move"));
    const s = game.get(e);
    if (
      (a && s && "k" === s.type && s.color === n && t.classList.add("check"),
      validMoves.includes(e) && showLegalMoves && t.classList.add("hint"),
      s)
    ) {
      o && o.has(e) && t.classList.add("threat");
      const a = document.createElement("div");
      ((a.className =
        "piece " + ("w" === s.color ? "white-piece" : "black-piece")),
        (a.textContent = PIECES[s.color + s.type.toUpperCase()]),
        (a.dataset.piece = s.type.toUpperCase()),
        (a.style.touchAction = "manipulation"),
        t.appendChild(a),
        attachPieceDrag(a, e),
        justMovedAnim && justMovedAnim.to === e && (u = a));
    }
    (justMovedAnim &&
      justMovedAnim.captured &&
      justMovedAnim.capturedSquare === e &&
      (m = t),
      justMovedAnim &&
        justMovedAnim.to === e &&
        justMovedAnim.captured &&
        t.classList.add("capture-flash"));
  }
  if (
    opponentMoveHighlight &&
    opponentMoveHighlight.from &&
    opponentMoveHighlight.to
  ) {
    const t = buildOpponentMoveArrow(
      opponentMoveHighlight.from,
      opponentMoveHighlight.to,
      i,
      c,
      d,
    );
    t && e.appendChild(t);
  }
  (justMovedAnim && animateMoveTransition(e, justMovedAnim, u, m),
    (justMovedAnim = null),
    renderMoves(),
    renderCapturedMaterial(),
    updateEvalBar());
  const h = gameStarted
    ? botThinking
      ? "🤖 La IA está pensando…"
      : game.game_over()
        ? "Partida terminada"
        : `Turno de las ${"w" === n ? "Blancas" : "Negras"}${a ? " · ¡Jaque!" : ""}`
    : "Pulsa 'Iniciar partida' para comenzar";
  ((document.getElementById("status").textContent = h),
    syncPracticeAIControls_(),
    updateClockDisplay());
}
function renderCapturedMaterial() {
  const e = document.getElementById("captured-w"),
    t = document.getElementById("captured-b"),
    a = document.getElementById("captured-w-float"),
    n = document.getElementById("captured-b-float");
  if (!(e || t || a || n)) return;
  const o = { p: 1, n: 3, b: 3, r: 5, q: 9 },
    r = ["q", "r", "b", "n", "p"],
    s = { p: 8, n: 2, b: 2, r: 2, q: 1 },
    l = game.board(),
    i = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    };
  let c = 0,
    d = 0;
  for (let e = 0; e < 8; e++)
    for (let t = 0; t < 8; t++) {
      const a = l[e][t];
      a &&
        "k" !== a.type &&
        (i[a.color][a.type]++,
        "w" === a.color ? (c += o[a.type]) : (d += o[a.type]));
    }
  function u(e) {
    const t = Math.max(0, i[e].q - s.q),
      a = {};
    for (const t of r) a[t] = Math.max(0, s[t] - i[e][t]);
    return ((a.p = Math.max(0, a.p - t)), a);
  }
  const m = u("w"),
    p = c - d;
  function g(e, t) {
    let a = "";
    for (const n of r)
      for (let o = 0; o < e[n]; o++)
        a += `<span style="font-size:16px; line-height:1; color:var(--text); opacity:0.85;">${PIECES[t + n.toUpperCase()]}</span>`;
    return a;
  }
  function f(e) {
    return e > 0
      ? `<span style="font-size:12px; font-weight:600; color:var(--text); margin-left:4px;">+${e}</span>`
      : "";
  }
  const h = g(u("b"), "b") + f(p > 0 ? p : 0),
    y = g(m, "w") + f(p < 0 ? -p : 0);
  (e && (e.innerHTML = h),
    t && (t.innerHTML = y),
    a && (a.innerHTML = h),
    n && (n.innerHTML = y));
}
function updateEvalBar() {
  const e = game.board();
  let t = 0;
  const a = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  for (let n = 0; n < 8; n++)
    for (let o = 0; o < 8; o++) {
      const r = e[n][o];
      if (r) {
        const e = a[r.type];
        t += "w" === r.color ? e : -e;
      }
    }
  const n = Math.max(5, Math.min(95, 50 + 5 * t));
  document.getElementById("eval-bar").style.width = n + "%";
}
let renderedMoveCount = 0;
function renderMoves() {
  const e = document.getElementById("moves"),
    t = document.getElementById("moves-empty"),
    a = document.getElementById("moves-count"),
    n = game.history({ verbose: !0 });
  if ((a && (a.textContent = n.length), !n.length))
    return (
      e.querySelectorAll(".move-row").forEach((e) => e.remove()),
      (renderedMoveCount = 0),
      void (t && (t.style.display = ""))
    );
  t && (t.style.display = "none");
  const o = (e) => {
    const t = document.createElement("span");
    ((t.className = "move"),
      e.captured && t.classList.add("move-capture"),
      (e.san.includes("+") || e.san.includes("#")) &&
        t.classList.add("move-check"));
    const a = document.createElement("span");
    ((a.className = "move-icon"),
      (a.textContent = PIECES[e.color + e.piece.toUpperCase()] || ""));
    const n = document.createElement("span");
    return ((n.textContent = e.san), t.append(a, n), t);
  };
  n.length < renderedMoveCount &&
    (e.querySelectorAll(".move-row").forEach((e) => e.remove()),
    (renderedMoveCount = 0));
  const r = e.querySelector(".move-row.current-move");
  r && r.classList.remove("current-move");
  let s = renderedMoveCount;
  if (s % 2 == 1 && s < n.length) {
    const t = e.querySelectorAll(".move-row"),
      a = t[t.length - 1];
    a && (a.replaceChild(o(n[s]), a.children[2]), s++);
  }
  for (let t = s; t < n.length; t += 2) {
    const a = document.createElement("div");
    a.className = "move-row";
    const r = document.createElement("span");
    ((r.className = "move-num"),
      (r.textContent = Math.floor(t / 2) + 1 + "."),
      a.appendChild(r),
      a.appendChild(o(n[t])),
      a.appendChild(n[t + 1] ? o(n[t + 1]) : document.createElement("span")),
      e.appendChild(a));
  }
  renderedMoveCount = n.length;
  const l = e.querySelectorAll(".move-row");
  (l.length && l[l.length - 1].classList.add("current-move"),
    (e.scrollTop = e.scrollHeight));
}
function attachPieceDrag(e, t) {
  e.addEventListener("pointerdown", (a) => {
    if (void 0 !== a.button && 0 !== a.button) return;
    if (!gameStarted || game.game_over() || botThinking) return;
    if (botEnabled && game.turn() === botColor) return;
    if (tournamentMatchActive && tournamentMatchBusy)
      return void toast("Esperá a que termine de sincronizar la jugada anterior.");
    if (tournamentMatchActive && game.turn() !== tournamentMyColor()) return;
    if (tournamentMatchActive && tournamentActiveClockExpired_())
      return void toast("El tiempo de esta partida ya se agotó.");
    if (tournamentMatchActive && tournamentClockWaitingForBothPlayers())
      return void toast("⏳ Esperando a que el rival entre a la partida.");
    if (
      tournamentMatchActive &&
      tournamentCurrentGameRow &&
      "suspended" === tournamentCurrentGameRow.status
    )
      return void toast("⏸️ El árbitro suspendió esta partida.");
    const n = game.get(t);
    if (!n || n.color !== game.turn()) return;
    const o = e.getBoundingClientRect();
    ((dragCtx = {
      from: t,
      pieceEl: e,
      startX: a.clientX,
      startY: a.clientY,
      offsetX: a.clientX - o.left,
      offsetY: a.clientY - o.top,
      width: o.width,
      height: o.height,
      moved: !1,
      currentDropEl: null,
    }),
      window.addEventListener("pointermove", onPieceDragMove),
      window.addEventListener("pointerup", onPieceDragUp, { once: !0 }));
  });
}
function updateSelectionHighlights() {
  const e = document.getElementById("board");
  if (e) {
    if (
      (e
        .querySelectorAll(".square.selected")
        .forEach((e) => e.classList.remove("selected")),
      e
        .querySelectorAll(".square.hint")
        .forEach((e) => e.classList.remove("hint")),
      e
        .querySelectorAll(".square.opponent-selected")
        .forEach((e) => e.classList.remove("opponent-selected")),
      selected)
    ) {
      const t = e.querySelector(`.square[data-square="${selected}"]`);
      t && t.classList.add("selected");
    }
    if (showLegalMoves)
      for (const t of validMoves) {
        const a = e.querySelector(`.square[data-square="${t}"]`);
        a && a.classList.add("hint");
      }
    if (opponentSelectedSquare) {
      const t = e.querySelector(
        `.square[data-square="${opponentSelectedSquare}"]`,
      );
      t && t.classList.add("opponent-selected");
    }
  }
}
function tournamentOpponentSelectionFromRow_(e) {
  const t = tournamentMyColor(),
    a = e && /^[a-h][1-8]$/.test(e.selectedSquare || "") ? e.selectedSquare : "";
  return a && e.selectedColor && e.selectedColor !== t ? a : null;
}
function applyTournamentOpponentSelection_(e) {
  const t = tournamentOpponentSelectionFromRow_(e);
  return t === opponentSelectedSquare
    ? !1
    : ((opponentSelectedSquare = t), !0);
}
function clearTournamentSelectionForMove_() {
  const e = tournamentCurrentGameRow;
  (clearTimeout(tournamentSelectionSyncTimer_),
    (tournamentSelectionSyncTimer_ = null),
    (tournamentSelectionLastSent_ = ""),
    e &&
      (tournamentCurrentGameRow = {
        ...e,
        selectedSquare: "",
        selectedColor: "",
        selectedAt: null,
      }));
}
function syncTournamentSelection_(e) {
  if (!tournamentMatchActive || !tournamentMatchCtx) return;
  const t = tournamentMyColor();
  if (!t) return;
  const a = /^[a-h][1-8]$/.test(e || "") ? e : "",
    n = tournamentCurrentGameRow;
  if (
    !a &&
    !tournamentSelectionLastSent_ &&
    (!n || !n.selectedSquare || (n.selectedColor && n.selectedColor !== t))
  )
    return void (tournamentSelectionLastSent_ = "");
  if (a === tournamentSelectionLastSent_) return;
  const o = tournamentMatchCtx.round,
    r = tournamentMatchCtx.board;
  (clearTimeout(tournamentSelectionSyncTimer_),
    (tournamentSelectionLastSent_ = a),
    n &&
      (tournamentCurrentGameRow = {
        ...n,
        selectedSquare: a,
        selectedColor: a ? t : "",
        selectedAt: a ? syncedNow_() : null,
      }),
    (tournamentSelectionSyncTimer_ = setTimeout(() => {
      ((tournamentSelectionSyncTimer_ = null),
        (tournamentSelectionWriteChain_ = tournamentSelectionWriteChain_
          .catch(() => {})
          .then(() => fbSetSelectedSquare(o, r, a, t))
          .catch(() => {
            tournamentSelectionLastSent_ === a &&
              (tournamentSelectionLastSent_ = null);
          })));
    }, 120)));
}
function onPieceDragMove(e) {
  if (!dragCtx) return;
  const t = e.clientX - dragCtx.startX,
    a = e.clientY - dragCtx.startY;
  if (!dragCtx.moved) {
    if (Math.hypot(t, a) < 6) return;
    ((dragCtx.moved = !0), (selected = dragCtx.from));
    const e = game.moves({ square: dragCtx.from, verbose: !0 });
    ((validMoves = e.map((e) => e.to)),
      SoundFX.select(),
      updateSelectionHighlights(),
      syncTournamentSelection_(selected));
    const n = dragCtx.pieceEl.closest(".square");
    (dragCtx.pieceEl.classList.add("dragging"),
      (dragCtx.pieceEl.style.width = dragCtx.width + "px"),
      (dragCtx.pieceEl.style.height = dragCtx.height + "px"),
      n && n.classList.add("drag-origin"));
  }
  if (!dragCtx.pieceEl) return;
  ((dragCtx.pieceEl.style.left = e.clientX - dragCtx.offsetX + "px"),
    (dragCtx.pieceEl.style.top = e.clientY - dragCtx.offsetY + "px"),
    (dragCtx.pieceEl.style.pointerEvents = "none"));
  const n = document.elementFromPoint(e.clientX, e.clientY);
  dragCtx.pieceEl.style.pointerEvents = "";
  const o = n ? n.closest(".square") : null;
  (dragCtx.currentDropEl &&
    dragCtx.currentDropEl !== o &&
    dragCtx.currentDropEl.classList.remove("drop-target"),
    o && validMoves.includes(o.dataset.square)
      ? (o.classList.add("drop-target"), (dragCtx.currentDropEl = o))
      : (dragCtx.currentDropEl = null));
}
function isPromotionMove(e, t, a) {
  const n = e.get(t);
  if (!n || "p" !== n.type) return !1;
  if (!/^[a-h][1-8]$/.test(String(a || ""))) return !1;
  const o = "w" === n.color ? "8" : "1";
  if (a[1] !== o) return !1;
  try {
    return e
      .moves({ square: t, verbose: !0 })
      .some(
        (e) =>
          e.to === a &&
          (!!e.promotion || (e.flags && e.flags.includes("p"))),
      );
  } catch (e) {
    return !1;
  }
}
let promotionPickerResolve_ = null,
  promotionOverlayHome_ = null;
function closePromotionPicker_(e) {
  if (promotionPickerResolve_) return void promotionPickerResolve_(e || null);
  const t = document.getElementById("promo");
  (t && (t.classList.remove("show"), t.setAttribute("aria-hidden", "true")),
    document.body.classList.remove("promotion-open"));
}
function askPromotion(e) {
  closePromotionPicker_(null);
  return new Promise((t) => {
    const a = document.getElementById("promo"),
      n = document.getElementById("promo-box");
    if (!a || !n) return void t("q");
    const o = document.fullscreenElement;
    if (o && !o.contains(a)) {
      const e = a.parentNode;
      ((promotionOverlayHome_ = { parent: e, next: a.nextSibling }),
        o.appendChild(a));
    }
    let r = !1;
    const s = (e) => {
        if (r) return;
        ((r = !0),
          (promotionPickerResolve_ = null),
          document.removeEventListener("keydown", l, !0),
          a.removeEventListener("click", i),
          a.classList.remove("show"),
          a.setAttribute("aria-hidden", "true"),
          document.body.classList.remove("promotion-open"));
        if (promotionOverlayHome_) {
          const e = promotionOverlayHome_;
          (e.next && e.next.parentNode === e.parent
            ? e.parent.insertBefore(a, e.next)
            : e.parent.appendChild(a),
            (promotionOverlayHome_ = null));
        }
        t(e || null);
      },
      l = (e) => {
        const t = String(e.key || "").toLowerCase(),
          a = {
            q: "q",
            d: "q",
            r: "r",
            t: "r",
            b: "b",
            a: "b",
            n: "n",
            c: "n",
          }[t];
        if (a) return (e.preventDefault(), void s(a));
        "escape" === t && (e.preventDefault(), s(null));
      },
      i = (e) => {
        e.target === a && s(null);
      };
    promotionPickerResolve_ = s;
    n.innerHTML = "";
    const c = document.createElement("div");
    ((c.className = "promo-title"),
      (c.textContent = "Coronación de peón"),
      n.appendChild(c));
    const d = document.createElement("div");
    ((d.className = "promo-subtitle"),
      (d.textContent = "Elegí la pieza nueva"),
      n.appendChild(d),
      [
        { code: "q", label: "Dama", key: "D" },
        { code: "r", label: "Torre", key: "T" },
        { code: "b", label: "Alfil", key: "A" },
        { code: "n", label: "Caballo", key: "C" },
      ].forEach((t) => {
        const a = document.createElement("button"),
          o = document.createElement("span"),
          r = document.createElement("span");
        ((a.type = "button"),
          (a.className = "promo-choice"),
          a.setAttribute("aria-label", `${t.label}. Tecla ${t.key}`),
          (a.title = `${t.label} (${t.key})`),
          (o.className = "promo-piece"),
          (o.textContent = PIECES[e + t.code.toUpperCase()]),
          (r.className = "promo-label"),
          (r.textContent = t.label),
          a.append(o, r),
          a.addEventListener(
            "click",
            () => {
              s(t.code);
            },
            { once: !0 },
          ),
          n.appendChild(a));
      }),
      (() => {
        const e = document.createElement("button");
        return (
          (e.type = "button"),
          (e.className = "promo-cancel"),
          (e.textContent = "Cancelar jugada"),
          e.addEventListener("click", () => s(null), { once: !0 }),
          n.appendChild(e),
          e
        );
      })(),
      a.setAttribute("role", "dialog"),
      a.setAttribute("aria-modal", "true"),
      a.setAttribute("aria-label", "Elegir pieza para coronación"),
      a.setAttribute("aria-hidden", "false"),
      a.addEventListener("click", i),
      document.addEventListener("keydown", l, !0),
      document.body.classList.add("promotion-open"),
      a.classList.add("show"),
      requestAnimationFrame(() => {
        const e = n.querySelector(".promo-choice");
        e && e.focus();
      }));
  });
}
async function onPieceDragUp(e) {
  if ((window.removeEventListener("pointermove", onPieceDragMove), !dragCtx))
    return;
  const t = dragCtx;
  if (((dragCtx = null), !t.moved)) return;
  justDraggedUntil = Date.now() + 300;
  const a = document.elementFromPoint(e.clientX, e.clientY),
    n = a ? a.closest(".square") : null,
    o = n ? n.dataset.square : null;
  if (
    tournamentMatchActive &&
    (tournamentMatchBusy || tournamentActiveClockExpired_())
  )
    return (
      (selected = null),
      (validMoves = []),
      syncTournamentSelection_(null),
      void render()
    );
  if (
    (document
      .querySelectorAll(".square.drop-target")
      .forEach((e) => e.classList.remove("drop-target")),
    document
      .querySelectorAll(".square.drag-origin")
      .forEach((e) => e.classList.remove("drag-origin")),
    o && validMoves.includes(o))
  ) {
    let e = "q";
    if (isPromotionMove(game, t.from, o)) {
      (render(), (e = await askPromotion(game.turn())));
      if (!e)
        return (
          (selected = null),
          (validMoves = []),
          syncTournamentSelection_(null),
          void render()
        );
    }
    const a = game.fen(),
      n = game.move({ from: t.from, to: o, promotion: e });
    if (n) {
      if (
        (addIncrement(),
        (selected = null),
        (validMoves = []),
        clearTournamentSelectionForMove_(),
        markMoveForAnimation(n),
        playSoundForMove(n, game),
        showMoveExplanation(a, n),
        navigator.vibrate)
      ) {
        const e = n.flags && (n.flags.includes("c") || n.flags.includes("e"));
        navigator.vibrate(e ? [14, 30, 14] : 12);
      }
      return (render(), checkGameOver(), void maybeTriggerBotMove());
    }
  }
  ((selected = null),
    (validMoves = []),
    syncTournamentSelection_(null),
    o && o !== t.from && SoundFX.invalid(),
    render());
}
async function clickSquare(e) {
  if (Date.now() < justDraggedUntil) return;
  if (!gameStarted || game.game_over() || botThinking) return;
  if (botEnabled && game.turn() === botColor) return;
  if (tournamentMatchActive && tournamentMatchBusy)
    return void toast("Esperá a que termine de sincronizar la jugada anterior.");
  if (tournamentMatchActive && game.turn() !== tournamentMyColor()) return;
  if (tournamentMatchActive && tournamentActiveClockExpired_())
    return void toast("El tiempo de esta partida ya se agotó.");
  if (tournamentMatchActive && tournamentClockWaitingForBothPlayers())
    return void toast("⏳ Esperando a que el rival entre a la partida.");
  if (
    tournamentMatchActive &&
    tournamentCurrentGameRow &&
    "suspended" === tournamentCurrentGameRow.status
  )
    return void toast("⏸️ El árbitro suspendió esta partida.");
  if (selected === e)
    return (
      (selected = null),
      (validMoves = []),
      syncTournamentSelection_(null),
      void updateSelectionHighlights()
    );
  if (selected) {
    const t = selected;
    let a = "q";
    if (isPromotionMove(game, t, e)) {
      a = await askPromotion(game.turn());
      if (!a)
        return (
          (selected = null),
          (validMoves = []),
          syncTournamentSelection_(null),
          void render()
        );
    }
    const n = game.fen(),
      o = game.move({ from: t, to: e, promotion: a });
    if (o)
      return (
        addIncrement(),
        (selected = null),
        (validMoves = []),
        clearTournamentSelectionForMove_(),
        markMoveForAnimation(o),
        playSoundForMove(o, game),
        showMoveExplanation(n, o),
        render(),
        checkGameOver(),
        void maybeTriggerBotMove()
      );
  }
  const t = game.get(e);
  if (t && t.color === game.turn()) {
    selected = e;
    const t = game.moves({ square: e, verbose: !0 });
    ((validMoves = t.map((e) => e.to)), SoundFX.select());
  } else (selected && SoundFX.invalid(), (selected = null), (validMoves = []));
  (updateSelectionHighlights(), syncTournamentSelection_(selected));
}
function checkGameOver() {
  if (!tournamentMatchActive && game.game_over()) {
    let e = "Partida terminada";
    if (game.in_checkmate()) {
      const t = "w" === game.turn() ? "b" : "w",
        a = "w" === t ? "Blancas" : "Negras";
      ((e = `Jaque mate · Ganaron las ${a}`),
        state.games++,
        botEnabled && t === botColor
          ? (state.losses++,
            showAlert(
              `♚ Jaque mate. Ganó la IA jugando con ${a.toLowerCase()}.`,
            ),
            addXP(15, "Partida perdida", e))
          : (state.wins++,
            showAlert(`♚ ¡JAQUE MATE! Ganaron las ${a}.`),
            addXP(60, "Partida ganada", e)));
    } else
      (state.games++,
        state.draws++,
        (e = "Tablas"),
        SoundFX.draw(),
        showAlert("🤝 Partida tablas"),
        addXP(20, "Partida empatada", e));
    const t = saveFinishedGame(e);
    (save(), updateProfile(), t && offerAnalysis(t.id));
  }
}
function saveFinishedGame(e) {
  const t = game.history();
  if (!t.length) return null;
  const a = new Chess(),
    n = [clonePosition(a)];
  t.forEach((e) => {
    (a.move(e), n.push(clonePosition(a)));
  });
  const o = {
    id: "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    date: new Date().toLocaleDateString("es-AR"),
    time: new Date().toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    result: e,
    mode: botEnabled ? "bot" : "pvp",
    difficulty: botEnabled ? botDifficulty : null,
    humanColor: botEnabled ? ("w" === botColor ? "b" : "w") : null,
    moves: t,
    positions: n,
    analysis: null,
  };
  return (
    (state.savedGames = state.savedGames || []),
    state.savedGames.unshift(o),
    (state.savedGames = state.savedGames.slice(0, 30)),
    save(),
    renderSavedGamesList(),
    o
  );
}
function clonePosition(e) {
  return { fen: e.fen() };
}
function renderSavedGamesList() {
  const e = document.getElementById("saved-games-list"),
    t = document.getElementById("saved-games-empty");
  if (!e || !t) return;
  e.querySelectorAll(".saved-game-item").forEach((e) => e.remove());
  const a = state.savedGames || [];
  a.length
    ? ((t.style.display = "none"),
      a.forEach((t) => {
        const a = document.createElement("div");
        ((a.className = "saved-game-item"),
          (a.innerHTML = `\n            <div class="saved-game-info">\n              <b>${t.result}</b>\n              <small>${t.date} · ${t.time} · ${t.moves.length} jugadas</small>\n            </div>\n            <div class="saved-game-actions">\n              <button class="btn secondary" data-analyze="${t.id}">🔎 Analizar</button>\n              <button class="btn danger" data-delete="${t.id}">🗑</button>\n            </div>\n          `),
          e.appendChild(a));
      }),
      e.querySelectorAll("[data-analyze]").forEach((e) => {
        e.onclick = () => openAnalysisModal(e.dataset.analyze);
      }),
      e.querySelectorAll("[data-delete]").forEach((e) => {
        e.onclick = () => {
          ((state.savedGames = (state.savedGames || []).filter(
            (t) => t.id !== e.dataset.delete,
          )),
            save(),
            renderSavedGamesList());
        };
      }))
    : (t.style.display = "block");
}
let clockTimer = null,
  clock = { w: 300, b: 300 },
  clockEnabled = !1,
  turnStartAt = null,
  clockFlagged = !1;
function getRawMinutesFromSelect(e, t) {
  const a = document.getElementById(e);
  if (!a) return 0;
  const n = a.value;
  if ("none" === n) return 0;
  if ("custom" === n) {
    const e = document.getElementById(t);
    return Math.max(1, Number(e && e.value) || 5);
  }
  return Number(n);
}
function getMinutesFromSelect(e, t) {
  return 60 * getRawMinutesFromSelect(e, t);
}
function setSelectFromValue(e, t, a, n, o) {
  const r = document.getElementById(e);
  if (!r) return;
  const s = String(n || 0);
  if (n || "none" !== o[0])
    if (-1 !== o.indexOf(s)) r.value = s;
    else {
      r.value = "custom";
      const e = document.getElementById(a);
      e && (e.value = n);
    }
  else r.value = "none";
  const l = document.getElementById(t);
  l && (l.style.display = "custom" === r.value ? "" : "none");
}
function getIncrementFromSelect(e, t) {
  const a = document.getElementById(e);
  if (!a) return 0;
  const n = a.value;
  if ("custom" === n) {
    const e = document.getElementById(t);
    return Math.max(0, Number(e && e.value) || 0);
  }
  return Number(n);
}
function wireCustomToggle(e, t) {
  const a = document.getElementById(e),
    n = document.getElementById(t);
  if (!a || !n) return;
  const o = () => {
    n.style.display = "custom" === a.value ? "" : "none";
  };
  (a.addEventListener("change", o), o());
}
function getInitialTime() {
  return getMinutesFromSelect("time-mode", "custom-minutes");
}
function getIncrement() {
  return getIncrementFromSelect("increment", "custom-increment");
}
function addIncrement() {
  if (tournamentMatchActive) return;
  const e = "w" === game.turn() ? "b" : "w";
  if (clockEnabled && turnStartAt) {
    const t = Math.max(0, Math.floor((syncedNow_() - turnStartAt) / 1e3));
    clock[e] = Math.max(0, clock[e] - t);
  }
  const t = getIncrement();
  (t && clockEnabled && !game.game_over() && (clock[e] += t),
    (turnStartAt = clockEnabled ? syncedNow_() : null),
    updateClockDisplay());
}
function initClock(e = !1) {
  clearInterval(clockTimer);
  const t = getInitialTime();
  ((clockEnabled = t > 0),
    (clock = { w: t, b: t }),
    (clockFlagged = !1),
    (turnStartAt = e && t > 0 ? syncedNow_() : null),
    e &&
      t > 0 &&
      (clockTimer = setInterval(() => {
        tournamentMatchActive || game.game_over() || updateClockDisplay();
      }, 1e3)),
    updateClockDisplay());
}
function getClockRemaining_(e) {
  if (!clockEnabled) return clock[e];
  if (game.turn() === e && turnStartAt && !game.game_over()) {
    const t = Math.max(0, Math.floor((syncedNow_() - turnStartAt) / 1e3));
    return Math.max(0, clock[e] - t);
  }
  return clock[e];
}
function updateClockDisplay() {
  if (tournamentMatchActive) return;
  const e = document.getElementById("clock-w"),
    t = document.getElementById("clock-b");
  renderBoardAvatars_();
  const a = e.querySelector(".clock-time"),
    n = t.querySelector(".clock-time"),
    o = getClockRemaining_("w"),
    r = getClockRemaining_("b");
  if (
    (((a || e).textContent = formatTime(o)),
    ((n || t).textContent = formatTime(r)),
    e.classList.toggle("active", "w" === game.turn() && !game.game_over()),
    t.classList.toggle("active", "b" === game.turn() && !game.game_over()),
    clockEnabled && !clockFlagged && !game.game_over())
  ) {
    const e = game.turn();
    if (("w" === e ? o : r) <= 0) {
      ((clockFlagged = !0), (clock[e] = 0), clearInterval(clockTimer));
      const t = "w" === e ? "Negras" : "Blancas";
      state.games++;
      const a = saveFinishedGame(`Tiempo agotado · Ganaron las ${t}`);
      (save(),
        showAlert(`⏱️ Tiempo agotado. Ganaron las ${t}.`),
        a && offerAnalysis(a.id));
    }
  }
}
(wireCustomToggle("time-mode", "custom-time-label"),
  wireCustomToggle("increment", "custom-increment-label"),
  wireCustomToggle("tournament-time-mode", "tournament-custom-time-label"),
  wireCustomToggle("tournament-increment", "tournament-custom-increment-label"),
  wireCustomToggle(
    "tournament-settings-time-mode",
    "tournament-settings-custom-time-label",
  ),
  wireCustomToggle(
    "tournament-settings-increment",
    "tournament-settings-custom-increment-label",
  ));
let lastKnownLevel = null;
function updateProfile() {
  const e = Math.floor(state.xp / 1e3) + 1,
    t = state.xp % 1e3;
  ((document.getElementById("mini-name").textContent = state.name || "Alumno"),
    renderMiniAvatar(),
    (document.getElementById("mini-level").textContent =
      `Nivel ${e} · ${levelLabel(e)}`),
    (document.getElementById("mini-xp").style.width = t / 10 + "%"),
    (document.getElementById("mini-xp-text").textContent = `${t} / 1000 XP`),
    (document.getElementById("stat-xp").textContent = state.xp),
    (document.getElementById("stat-wins").textContent = state.wins),
    (document.getElementById("stat-puzzles").textContent = state.puzzles),
    updateDashboardStats(e, t),
    null === lastKnownLevel
      ? (lastKnownLevel = e)
      : e > lastKnownLevel && (celebrateLevelUp(e), (lastKnownLevel = e)));
}
function computeOverallAccuracy() {
  const e = state.savedGames || [],
    t = [];
  for (const a of e) {
    if (!a.analysis || !a.analysis.accuracy) continue;
    const e = a.humanColor || "w",
      n = a.analysis.accuracy[e];
    "number" == typeof n && t.push(n);
  }
  return t.length ? t.reduce((e, t) => e + t, 0) / t.length : null;
}
function updateDashboardStats(e, t) {
  const a = document.getElementById("progress-title"),
    n = document.getElementById("main-progress");
  (a && (a.textContent = `Nivel ${e} · ${levelLabel(e)}`),
    n && (n.style.width = t / 10 + "%"));
  const o = document.getElementById("stat-accuracy");
  if (o) {
    const e = computeOverallAccuracy();
    o.textContent = null === e ? "—" : Math.round(e) + "%";
  }
  const r = document.getElementById("games-total"),
    s = document.getElementById("games-wins"),
    l = document.getElementById("games-losses"),
    i = document.getElementById("games-draws");
  (r && (r.textContent = state.games),
    s && (s.textContent = state.wins),
    l && (l.textContent = state.losses),
    i && (i.textContent = state.draws));
  const c = document.getElementById("history-table");
  if (c) {
    c.innerHTML = "";
    const e = (state.history || []).slice().reverse();
    if (e.length)
      for (const t of e) {
        const e = document.createElement("tr");
        ((e.innerHTML = `\n                <td>${t.activity}</td>\n                <td>${t.result}</td>\n                <td>+${t.xp} XP</td>\n                <td>${t.date}</td>\n              `),
          c.appendChild(e));
      }
    else {
      const e = document.createElement("tr");
      ((e.innerHTML =
        '<td colspan="4" style="color: var(--muted)">Todavía no hay actividad registrada.</td>'),
        c.appendChild(e));
    }
  }
}
function celebrateLevelUp(e) {
  (SoundFX.levelUp(),
    navigator.vibrate && navigator.vibrate([20, 40, 20, 40, 60]));
  const t = document.createElement("div");
  ((t.className = "level-up-banner"),
    (t.innerHTML = `🎉 ¡Subiste a Nivel ${e}!`),
    document.body.appendChild(t),
    requestAnimationFrame(() => t.classList.add("show")),
    setTimeout(() => {
      (t.classList.remove("show"), setTimeout(() => t.remove(), 300));
    }, 2200));
  const a = document.createElement("div");
  ((a.className = "level-up-particles"), document.body.appendChild(a));
  const n = ["var(--accent)", "var(--accent2)", "#ffffff", "var(--success)"],
    o = window.innerWidth / 2,
    r = 0.22 * window.innerHeight;
  for (let e = 0; e < 28; e++) {
    const e = document.createElement("span");
    e.className = "level-up-particle";
    const t = Math.random() * Math.PI * 2,
      s = 60 + 140 * Math.random(),
      l = 4 + 7 * Math.random();
    (e.style.setProperty("--dx", Math.cos(t) * s + "px"),
      e.style.setProperty("--dy", Math.sin(t) * s - 40 + "px"),
      e.style.setProperty("--dur", 1.1 + 0.9 * Math.random() + "s"),
      e.style.setProperty("--delay", 0.25 * Math.random() + "s"),
      (e.style.left = o + (40 * Math.random() - 20) + "px"),
      (e.style.top = r + "px"),
      (e.style.width = l + "px"),
      (e.style.height = l + "px"),
      (e.style.background = n[Math.floor(Math.random() * n.length)]),
      a.appendChild(e));
  }
  setTimeout(() => a.remove(), 2400);
}
function addXP(e, t, a = "Completado") {
  ((state.xp += e),
    state.history.push({
      activity: t,
      result: a,
      xp: e,
      date: new Date().toLocaleDateString("es-AR"),
    }),
    save(),
    toast(`🎉 +${e} XP`),
    updateProfile());
}
function showPage(e) {
  (document.querySelectorAll(".page").forEach((t) => {
    t.classList.toggle("active", t.id === "page-" + e);
  }),
    document.querySelectorAll("[data-page]").forEach((t) => {
      t.classList.toggle("active", t.dataset.page === e);
    }),
    "jugar" === e && render(),
    "torneo" === e &&
      "function" == typeof refreshTournament &&
      refreshTournament(),
    "pantalla-publica" === e &&
      "function" == typeof renderPublicScreen &&
      renderPublicScreen(lastTournamentState));
}
(document.querySelectorAll("[data-page]").forEach((e) => {
  e.onclick = () => showPage(e.dataset.page);
}),
  document.querySelectorAll("[data-page-action]").forEach((e) => {
    e.onclick = () => showPage(e.dataset.pageAction);
  }),
  document.getElementById("mode").addEventListener("change", updateModeUI),
  updateModeUI());
const pvpFlipToggle = document.getElementById("pvp-flip");
pvpFlipToggle &&
  pvpFlipToggle.addEventListener("change", () => {
    gameStarted && render();
  });
let soundEnabled = "off" !== localStorage.getItem("chessSoundEnabled");
const soundToggle = document.getElementById("toggle-sound"),
  soundToggleCfg = document.getElementById("toggle-sound-cfg");
function syncSoundUI() {
  (soundToggle && (soundToggle.checked = soundEnabled),
    soundToggleCfg && (soundToggleCfg.checked = soundEnabled));
}
function setSoundEnabled(e) {
  ((soundEnabled = e),
    localStorage.setItem("chessSoundEnabled", soundEnabled ? "on" : "off"),
    SoundFX.setEnabled(soundEnabled),
    syncSoundUI(),
    soundEnabled && (SoundFX.unlock(), SoundFX.select()));
}
(SoundFX.setEnabled(soundEnabled),
  syncSoundUI(),
  soundToggle &&
    soundToggle.addEventListener("change", () =>
      setSoundEnabled(soundToggle.checked),
    ),
  soundToggleCfg &&
    soundToggleCfg.addEventListener("change", () =>
      setSoundEnabled(soundToggleCfg.checked),
    ),
  document.body.addEventListener("pointerdown", () => SoundFX.unlock(), {
    once: !0,
  }));
const legalMovesCheckbox = document.getElementById("toggle-legal"),
  legalMovesCheckboxCfg = document.getElementById("toggle-legal-cfg"),
  legalMovesBtn = document.getElementById("toggle-legal-btn");
function syncLegalMovesUI() {
  (legalMovesCheckbox && (legalMovesCheckbox.checked = showLegalMoves),
    legalMovesCheckboxCfg && (legalMovesCheckboxCfg.checked = showLegalMoves),
    legalMovesBtn &&
      ((legalMovesBtn.textContent = showLegalMoves
        ? "🎯 Jugadas: ON"
        : "🎯 Jugadas: OFF"),
      legalMovesBtn.classList.toggle("off", !showLegalMoves),
      legalMovesBtn.setAttribute("aria-pressed", String(showLegalMoves))));
}
function setShowLegalMoves(e) {
  ((showLegalMoves = e),
    localStorage.setItem("chessShowLegalMoves", e ? "on" : "off"),
    syncLegalMovesUI(),
    render(),
    toast(
      showLegalMoves
        ? "🎯 Jugadas posibles activadas"
        : "🎯 Jugadas posibles desactivadas",
    ));
}
(legalMovesCheckbox &&
  legalMovesCheckbox.addEventListener("change", () =>
    setShowLegalMoves(legalMovesCheckbox.checked),
  ),
  legalMovesCheckboxCfg &&
    legalMovesCheckboxCfg.addEventListener("change", () =>
      setShowLegalMoves(legalMovesCheckboxCfg.checked),
    ),
  legalMovesBtn &&
    legalMovesBtn.addEventListener("click", () =>
      setShowLegalMoves(!showLegalMoves),
    ),
  syncLegalMovesUI());
const threatsCheckbox = document.getElementById("toggle-threats"),
  threatsCheckboxCfg = document.getElementById("toggle-threats-cfg");
function syncThreatsUI() {
  (threatsCheckbox && (threatsCheckbox.checked = showThreats),
    threatsCheckboxCfg && (threatsCheckboxCfg.checked = showThreats));
}
function setShowThreats(e) {
  ((showThreats = e),
    localStorage.setItem("chessShowThreats", showThreats ? "on" : "off"),
    syncThreatsUI(),
    gameStarted && render(),
    toast(showThreats ? "⚔️ Amenazas activadas" : "⚔️ Amenazas desactivadas"));
}
(threatsCheckbox &&
  threatsCheckbox.addEventListener("change", () =>
    setShowThreats(threatsCheckbox.checked),
  ),
  threatsCheckboxCfg &&
    threatsCheckboxCfg.addEventListener("change", () =>
      setShowThreats(threatsCheckboxCfg.checked),
    ),
  syncThreatsUI());
const chatNotifCheckboxCfg = document.getElementById("toggle-chatnotif-cfg");
function syncChatNotifCfgUI_() {
  chatNotifCheckboxCfg && (chatNotifCheckboxCfg.checked = !matchChatMuted);
}
chatNotifCheckboxCfg &&
  ((chatNotifCheckboxCfg.checked = !matchChatMuted),
  chatNotifCheckboxCfg.addEventListener("change", () => {
    (setMatchChatMuted(!chatNotifCheckboxCfg.checked),
      toast(
        matchChatMuted ? "🔕 Chat silenciado" : "🔔 Chat con notificaciones",
      ));
  }));
const avatarBtnCfg = document.getElementById("config-avatar-btn");
avatarBtnCfg && avatarBtnCfg.addEventListener("click", openAvatarPicker);
const studentNameInput = document.getElementById("student-name"),
  studentCourseInput = document.getElementById("student-course");
(studentNameInput &&
  (studentNameInput.value = "Alumno" === state.name ? "" : state.name),
  studentCourseInput && (studentCourseInput.value = state.course || ""));
const saveProfileBtn = document.getElementById("save-profile");
saveProfileBtn &&
  saveProfileBtn.addEventListener("click", () => {
    const e = studentNameInput ? studentNameInput.value.trim() : "",
      t = studentCourseInput ? studentCourseInput.value.trim() : "";
    ((state.name = e || "Alumno"),
      (state.course = t),
      save(),
      updateProfile(),
      toast("💾 Perfil guardado"));
  });
const resetPreferencesBtn = document.getElementById("reset-preferences");
resetPreferencesBtn &&
  resetPreferencesBtn.addEventListener("click", () => {
    confirm(
      "¿Restaurar tema, fichas y las 4 ayudas de juego a los valores de fábrica? No afecta tu progreso ni tu perfil.",
    ) &&
      (applyTheme("blue"),
      applyPieceStyle("classic"),
      (showLegalMoves = !0),
      localStorage.setItem("chessShowLegalMoves", "on"),
      syncLegalMovesUI(),
      (showThreats = !0),
      localStorage.setItem("chessShowThreats", "on"),
      syncThreatsUI(),
      (explainMode = !0),
      localStorage.setItem("chessExplainMode", "on"),
      syncExplainUI(),
      setSoundEnabled(!0),
      setMatchChatMuted(!1),
      gameStarted && render(),
      toast("↺ Preferencias restauradas a los valores de fábrica"));
  });
const BACKUP_KEYS = [
    "chessSchoolData",
    "chessTheme",
    "chessPieceStyle",
    "chessShowLegalMoves",
    "chessShowThreats",
    "chessExplainMode",
    "chessSoundEnabled",
    "chessMatchChatMuted",
  ],
  exportJsonBtn = document.getElementById("export-json");
exportJsonBtn &&
  exportJsonBtn.addEventListener("click", () => {
    const e = {
      app: "escuela-de-ajedrez",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {},
    };
    BACKUP_KEYS.forEach((t) => {
      const a = localStorage.getItem(t);
      null !== a && (e.data[t] = a);
    });
    const t = new Blob([JSON.stringify(e, null, 2)], {
        type: "application/json",
      }),
      a = URL.createObjectURL(t),
      n =
        (state.name || "alumno")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-+|-+$)/g, "") || "alumno",
      o = new Date().toISOString().slice(0, 10),
      r = document.createElement("a");
    ((r.href = a),
      (r.download = `ajedrez-${n}-${o}.json`),
      document.body.appendChild(r),
      r.click(),
      r.remove(),
      URL.revokeObjectURL(a),
      toast("📤 Datos exportados"));
  });
const importJsonInput = document.getElementById("import-json");
importJsonInput &&
  importJsonInput.addEventListener("change", (e) => {
    const t = e.target.files && e.target.files[0];
    if (!t) return;
    const a = new FileReader();
    ((a.onload = () => {
      let e;
      try {
        e = JSON.parse(a.result);
      } catch (e) {
        return (
          toast("❌ Ese archivo no es un JSON válido"),
          void (importJsonInput.value = "")
        );
      }
      const t = e && e.data && "object" == typeof e.data ? e.data : null;
      if (!t || !t.chessSchoolData)
        return (
          toast("❌ Ese archivo no parece un respaldo de esta app"),
          void (importJsonInput.value = "")
        );
      confirm(
        "¿Importar este respaldo? Se reemplaza tu progreso, perfil y preferencias actuales por los del archivo. No se puede deshacer.",
      )
        ? (BACKUP_KEYS.forEach((e) => {
            "string" == typeof t[e] && localStorage.setItem(e, t[e]);
          }),
          (importJsonInput.value = ""),
          toast("📥 Datos importados. Recargando…"),
          setTimeout(() => location.reload(), 700))
        : (importJsonInput.value = "");
    }),
      (a.onerror = () => toast("❌ No se pudo leer el archivo")),
      a.readAsText(t));
  });
const resetDataBtn = document.getElementById("reset-data");
(resetDataBtn &&
  resetDataBtn.addEventListener("click", () => {
    confirm(
      "¿Borrar todo tu progreso (XP, historial de partidas y estadísticas)? Esto no se puede deshacer.",
    ) &&
      ((state = {
        ...DEFAULT_STATE,
        name: state.name,
        course: state.course,
        avatar: state.avatar,
      }),
      save(),
      updateProfile(),
      toast("🗑️ Progreso borrado"));
  }),
  (document.getElementById("new-game").onclick = () => {
    const e = document.getElementById("mode").value;
    ((botEnabled = "bot" === e),
      botEnabled && ensureStockfishWorker(),
      (botDifficulty = document.getElementById("bot-difficulty").value));
    const t = document.getElementById("bot-color").value;
    ((botColor = "w" === t ? "b" : "w"),
      (botThinking = !1),
      game.reset(),
      (selected = null),
      (validMoves = []),
      (gameStarted = !0),
      resetEduPanel(),
      initClock(!0),
      render(),
      (document.getElementById("new-game").textContent = "🔄 Nueva partida"),
      toast(botEnabled ? "▶️ Partida iniciada · IA" : "▶️ Partida iniciada"),
      SoundFX.gameStart(),
      maybeTriggerBotMove());
  }),
  (document.getElementById("undo").onclick = () => {
    botThinking ||
      (game.undo(),
      botEnabled &&
        !game.game_over() &&
        game.turn() === botColor &&
        game.undo(),
      (selected = null),
      (validMoves = []),
      render(),
      toast("↩️ Jugada deshecha"));
  }),
  (document.getElementById("resign").onclick = () => {
    if (game.game_over()) return;
    (state.games++, state.losses++);
    const e = saveFinishedGame("Rendición");
    (showAlert("🏳️ Te rendiste."),
      save(),
      updateProfile(),
      e && offerAnalysis(e.id));
  }),
  (document.getElementById("copy-game").onclick = () => {
    navigator.clipboard
      ?.writeText(game.history().join(" "))
      .then(() => toast("📋 Partida copiada"));
  }));
const movesToggleBtn = document.getElementById("moves-toggle"),
  floatingMovesCard = document.querySelector(".floating-moves-card");
function setupFullscreenToggle(e) {
  const t = document.getElementById(e);
  function a() {
    const e = document.body.classList.contains("fullscreen-game");
    t.textContent = e
      ? t.dataset.exitText || "❎ Salir"
      : t.dataset.enterText || "📺 Pantalla completa";
  }
  t &&
    ((t.onclick = async () => {
      document.body.classList.contains("fullscreen-game")
        ? (document.body.classList.remove("fullscreen-game"),
          a(),
          resetBoardFrameSize(),
          document.fullscreenElement &&
            (await document.exitFullscreen().catch(() => {})))
        : (document.body.classList.add("fullscreen-game"),
          a(),
          await document.documentElement.requestFullscreen().catch(() => {}),
          requestAnimationFrame(sizeFullscreenBoard));
    }),
    document.addEventListener("fullscreenchange", () => {
      !document.fullscreenElement &&
        document.body.classList.contains("fullscreen-game") &&
        (document.body.classList.remove("fullscreen-game"),
        a(),
        resetBoardFrameSize());
    }),
    a());
}
function sizeFullscreenBoard() {
  const e = document.body.classList;
  if (!e.contains("fullscreen-game") && !e.contains("tournament-board-max"))
    return;
  const t = document.querySelector(".board-frame"),
    a = document.getElementById("game-card");
  if (!t || !a) return;
  const n = a.querySelector(".clock"),
    o = a.querySelector(".controls-panel"),
    r = document.getElementById("tournament-match-bar"),
    v = a.querySelector(".tournament-moves-popup"),
    s = getComputedStyle(a),
    l = parseFloat(s.rowGap || s.gap || "12") || 12,
    i = (parseFloat(s.paddingTop) || 0) + (parseFloat(s.paddingBottom) || 0),
    c = (parseFloat(s.paddingLeft) || 0) + (parseFloat(s.paddingRight) || 0),
    d = window.visualViewport ? window.visualViewport.width : window.innerWidth,
    u = window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight,
    m = a.getBoundingClientRect();
  if (
    e.contains("tournament-board-max") &&
    window.matchMedia(
      "(orientation: landscape) and (max-height: 600px) and (max-width: 1000px)",
    ).matches
  ) {
    const e = Math.min(290, Math.max(190, Math.floor(0.34 * d))),
      n = Math.max(180, Math.floor(Math.min((m.width || d) - c - e - l, (m.height || u) - i)));
    return ((t.style.width = n + "px"), void (t.style.height = n + "px"));
  }
  const p = n ? n.getBoundingClientRect().height : 0,
    g = o ? o.getBoundingClientRect().height : 0,
    f = r && null !== r.offsetParent ? r.getBoundingClientRect().height : 0,
    k =
      v &&
      null !== v.offsetParent &&
      "static" === getComputedStyle(v).position
        ? v.getBoundingClientRect().height
        : 0,
    x = [p, g, f, k].filter((e) => e > 0).length,
    h = (m.height || u) - p - g - f - k - x * l - i,
    y = (m.width || d) - c,
    b = Math.max(140, Math.floor(Math.min(y, h)));
  ((t.style.width = b + "px"), (t.style.height = b + "px"));
}
function resetBoardFrameSize() {
  const e = document.querySelector(".board-frame");
  e && ((e.style.width = ""), (e.style.height = ""));
}
(movesToggleBtn &&
  floatingMovesCard &&
  movesToggleBtn.addEventListener("click", () => {
    (floatingMovesCard.classList.toggle("collapsed"),
      setTimeout(sizeFullscreenBoard, 30));
  }),
  setupFullscreenToggle("game-fullscreen"),
  (function () {
    let e = null;
    const t = () => {
      (clearTimeout(e), (e = setTimeout(sizeFullscreenBoard, 60)));
    };
    (window.addEventListener("resize", t),
      window.addEventListener("orientationchange", () =>
        setTimeout(sizeFullscreenBoard, 200),
      ),
      window.visualViewport &&
        window.visualViewport.addEventListener("resize", t));
    const a = document.getElementById("game-card");
    if (a && "ResizeObserver" in window) {
      const e = new ResizeObserver(t);
      e.observe(a);
      const n = a.querySelector(".clock"),
        o = a.querySelector(".controls-panel"),
        r = document.getElementById("tournament-match-bar"),
        s = document.querySelector(".floating-moves-card");
      (n && e.observe(n),
        o && e.observe(o),
        r && e.observe(r),
        s && e.observe(s));
    }
  })());
const THEMES = {
  blue: "Azul moderno",
  wood: "Madera clásica",
  green: "Verde torneo",
  purple: "Violeta",
  red: "Rojo intenso",
  ocean: "Océano",
  midnight: "Medianoche",
  light: "Claro elegante",
};
function applyTheme(e) {
  const t = THEMES[e] ? e : "blue";
  ((document.body.dataset.theme = t),
    localStorage.setItem("chessTheme", t),
    (document.getElementById("current-theme-name").textContent = THEMES[t]),
    document.querySelectorAll("[data-theme-card]").forEach((e) => {
      e.classList.toggle("active", e.dataset.themeCard === t);
    }));
}
(document.querySelectorAll(".theme-btn").forEach((e) => {
  e.onclick = () => applyTheme(e.dataset.theme);
}),
  (document.getElementById("reset-theme").onclick = () => applyTheme("blue")),
  applyTheme(localStorage.getItem("chessTheme") || "blue"));
const PIECE_STYLES = {
  classic: "Clásico",
  bold: "Sólido",
  outline: "Contorno",
  neon: "Neón",
  minimal: "Minimalista",
  gold: "Dorado",
  glass: "Cristal",
  retro: "Retro",
  wood: "Madera",
  fire: "Fuego",
  ice: "Hielo",
  pastel: "Pastel",
  rainbow: "Arcoíris",
  longshadow: "Sombra larga",
};
function applyPieceStyle(e) {
  const t = PIECE_STYLES[e] ? e : "classic";
  (document.body.classList.remove(
    ...Object.keys(PIECE_STYLES).map((e) => "pstyle-" + e),
  ),
    document.body.classList.add("pstyle-" + t),
    localStorage.setItem("chessPieceStyle", t),
    (document.getElementById("current-piece-style-name").textContent =
      PIECE_STYLES[t]),
    document.querySelectorAll("[data-piece-style-card]").forEach((e) => {
      e.classList.toggle("active", e.dataset.pieceStyleCard === t);
    }));
}
function savedGamesList() {
  renderSavedGamesList();
}
(document.querySelectorAll(".piece-style-btn").forEach((e) => {
  e.onclick = () => applyPieceStyle(e.dataset.pieceStyle);
}),
  (document.getElementById("reset-piece-style").onclick = () =>
    applyPieceStyle("classic")),
  applyPieceStyle(localStorage.getItem("chessPieceStyle") || "classic"),
  updateProfile(),
  initClock(!1),
  render(),
  savedGamesList());


/* Game analysis, Stockfish evaluation, and practice tutor. Generated from the verified legacy bundle. */
let analysisCurrentRecord = null,
  analysisPly = 0,
  analysisRunToken = 0,
  sfAnalysisWorker = null,
  analysisWorkerLoadPromise_ = null;
const ANALYSIS_DEPTH = 12,
  MATE_SCORE = 1e5,
  TAG_INFO = {
    best: { icon: "✅", label: "Mejor jugada", cls: "tag-best" },
    good: { icon: "👍", label: "Buena", cls: "tag-good" },
    inaccuracy: { icon: "⚠️", label: "Imprecisión", cls: "tag-inaccuracy" },
    mistake: { icon: "❌", label: "Error", cls: "tag-mistake" },
    blunder: { icon: "‼️", label: "Blunder", cls: "tag-blunder" },
  };
async function initAnalysisWorker() {
  const e =
    "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js";
  try {
    ((sfAnalysisWorker = new Worker(
      e,
    )),
      sfAnalysisWorker.postMessage("uci"),
      sfAnalysisWorker.postMessage("setoption name Skill Level value 20"));
  } catch (t) {
    const a = await fetch(e, { cache: "force-cache" });
    if (!a.ok) throw new Error(`No se pudo cargar Stockfish (HTTP ${a.status}).`);
    const n = new Blob([await a.text()], { type: "application/javascript" }),
      o = URL.createObjectURL(n);
    try {
      ((sfAnalysisWorker = new Worker(o)),
        sfAnalysisWorker.postMessage("uci"),
        sfAnalysisWorker.postMessage("setoption name Skill Level value 20"));
    } finally {
      URL.revokeObjectURL(o);
    }
  }
  return sfAnalysisWorker;
}
function ensureAnalysisWorker_() {
  return sfAnalysisWorker
    ? Promise.resolve(sfAnalysisWorker)
    : analysisWorkerLoadPromise_ ||
        (analysisWorkerLoadPromise_ = initAnalysisWorker().catch((e) => {
          return (
            console.error("No se pudo iniciar el motor de análisis", e),
            (analysisWorkerLoadPromise_ = null),
            null
          );
        }));
}
function heuristicEval(e) {
  try {
    const t = new Chess(e),
      a = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
    let n = 0;
    return (
      t.board().forEach((e) =>
        e.forEach((e) => {
          e && (n += ("w" === e.color ? 1 : -1) * a[e.type]);
        }),
      ),
      "w" === t.turn() ? n : -n
    );
  } catch (e) {
    return 0;
  }
}
function sfEvalFen(e, t) {
  return new Promise((a) => {
    if (!sfAnalysisWorker)
      return void a({ score: heuristicEval(e), bestMove: null, engine: !1 });
    let n = 0,
      o = [],
      r = !1;
    const s = setTimeout(() => {
      r ||
        ((r = !0),
        sfAnalysisWorker.removeEventListener("message", l),
        a({ score: heuristicEval(e), bestMove: null, engine: !1, pv: [] }));
    }, 8e3);
    function l(e) {
      const t = "string" == typeof e.data ? e.data : "";
      if (t.startsWith("info") && -1 !== t.indexOf(" score ")) {
        const e = t.match(/score (cp|mate) (-?\d+)/);
        if (e)
          if ("cp" === e[1]) n = parseInt(e[2], 10);
          else {
            const t = parseInt(e[2], 10);
            n = t > 0 ? 1e5 - t : -1e5 - t;
          }
        const a = t.match(/ pv (.+)$/);
        a && (o = a[1].trim().split(/\s+/));
      }
      if (t.startsWith("bestmove")) {
        if (r) return;
        ((r = !0),
          clearTimeout(s),
          sfAnalysisWorker.removeEventListener("message", l));
        const e = t.split(" "),
          i = e[1] && "(none)" !== e[1] ? e[1] : null;
        a({ score: n, bestMove: i, engine: !0, pv: o });
      }
    }
    (sfAnalysisWorker.addEventListener("message", l),
      sfAnalysisWorker.postMessage("position fen " + e),
      sfAnalysisWorker.postMessage("go depth " + t));
  });
}
async function evalPosition(e, t) {
  const a = new Chess(e);
  if (a.in_checkmate()) return { score: -1e5, bestMove: null, pv: [] };
  if (a.game_over()) return { score: 0, bestMove: null, pv: [] };
  return (await ensureAnalysisWorker_(), sfEvalFen(e, t));
}
function uciToSan(e, t) {
  if (!t || t.length < 4) return null;
  try {
    const a = new Chess(e),
      n = t.substring(0, 2),
      o = t.substring(2, 4),
      r = t.length > 4 ? t[4] : void 0,
      s = a.move({ from: n, to: o, promotion: r || "q" });
    return s ? s.san : null;
  } catch (e) {
    return null;
  }
}
function commentFor(e, t, a, n) {
  const o = "w" === n ? "Blancas" : "Negras";
  switch (e) {
    case "best":
      return `✅ ${o} jugó ${t}, la mejor jugada según el motor.`;
    case "good":
      return `👍 ${o} jugó ${t}, una buena jugada que mantiene una posición sólida.`;
    case "inaccuracy":
      return (
        `⚠️ Imprecisión de ${o.toLowerCase()} con ${t}.` +
        (a ? ` El motor prefería ${a}.` : "")
      );
    case "mistake":
      return (
        `❌ Error de ${o.toLowerCase()} con ${t}, cede ventaja al rival.` +
        (a ? ` Mejor era ${a}.` : "")
      );
    case "blunder":
      return (
        `‼️ ¡Blunder! ${o} jugó ${t} y perdió mucha ventaja (o la partida).` +
        (a ? ` La jugada correcta era ${a}.` : "")
      );
    default:
      return t || "";
  }
}
async function openAnalysisModal(e) {
  const t = (state.savedGames || []).find((t) => t.id === e);
  if (!t) return;
  ((analysisCurrentRecord = t),
    (document.getElementById("analysis-modal").style.display = "flex"),
    (document.getElementById("analysis-meta").textContent =
      `${t.date} · ${t.time} · ${t.moves.length} jugadas · ${t.result}`));
  const a = document.getElementById("analysis-progress"),
    n = document.getElementById("analysis-body");
  if (t.analysis)
    return (
      (a.style.display = "none"),
      (n.style.display = "block"),
      (analysisPly = t.positions.length - 1),
      void renderAnalysisResults(t)
    );
  ((a.style.display = "block"),
    (n.style.display = "none"),
    await runFullAnalysis(t));
}
function updateAnalysisProgress(e, t) {
  const a = document.getElementById("analysis-progress-text"),
    n = document.getElementById("analysis-progress-fill");
  ((a.textContent = `Analizando jugada ${e}/${t}…`),
    (n.style.width = t ? Math.round((e / t) * 100) + "%" : "0%"));
}
async function runFullAnalysis(e) {
  const t = ++analysisRunToken,
    a = e.positions,
    n = a.length;
  updateAnalysisProgress(0, n - 1);
  const o = [];
  for (let e = 0; e < n; e++) {
    if (t !== analysisRunToken) return;
    const r = await evalPosition(a[e].fen, 12);
    (o.push(r), updateAnalysisProgress(e, n - 1));
  }
  if (t !== analysisRunToken) return;
  const r = o.map((e) => e.score),
    s = [],
    l = {
      w: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
      b: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
    },
    i = { w: [], b: [] };
  for (let t = 0; t < e.moves.length; t++) {
    const n = a[t].fen.split(" ")[1],
      c = r[t],
      d = r[t + 1],
      u = Math.max(0, c + d),
      m = classifyLoss(u);
    l[n][m]++;
    const p = cpToWin(c),
      g = cpToWin(-d),
      f = Math.max(
        0,
        Math.min(100, 103.1668 * Math.exp(-0.04354 * (p - g)) - 3.1668),
      );
    i[n].push(f);
    const h = o[t].bestMove,
      y = "best" === m ? null : uciToSan(a[t].fen, h),
      b = e.moves[t];
    s.push({ tag: m, loss: u, color: n, playedSan: b, bestSan: y });
  }
  const c = (e) => (e.length ? e.reduce((e, t) => e + t, 0) / e.length : 100),
    d = { w: c(i.w), b: c(i.b) },
    u = o.some((e) => e.engine);
  ((e.analysis = {
    scores: r,
    perMove: s,
    counts: l,
    accuracy: d,
    usedEngine: u,
  }),
    save(),
    (document.getElementById("analysis-progress").style.display = "none"),
    (document.getElementById("analysis-body").style.display = "block"),
    (analysisPly = a.length - 1),
    renderAnalysisResults(e));
}
function closeAnalysisModal() {
  ((document.getElementById("analysis-modal").style.display = "none"),
    analysisRunToken++);
}
function renderAnalysisResults(e) {
  (renderAnalysisSummary(e),
    renderEvalGraph(e),
    renderAnalysisBoard(),
    renderAnalysisMoveList(),
    renderAnalysisComment());
}
function renderAnalysisSummary(e) {
  const t = e.analysis,
    a = document.getElementById("analysis-summary");
  if (((a.innerHTML = ""), t)) {
    if (!1 === t.usedEngine) {
      const e = document.createElement("div");
      ((e.style.gridColumn = "1 / -1"),
        (e.style.color = "var(--muted)"),
        (e.style.fontSize = "0.8rem"),
        (e.textContent =
          "⚠️ El motor no respondió a tiempo: se usó una evaluación básica por material."),
        a.appendChild(e));
    }
    ["w", "b"].forEach((e) => {
      const n = "w" === e ? "♔ Blancas" : "♚ Negras",
        o = t.counts[e],
        r = document.createElement("div");
      ((r.className = "analysis-side-card"),
        (r.innerHTML = `\n            <h4>${n}</h4>\n            <div class="analysis-accuracy">${t.accuracy[e].toFixed(1)}%</div>\n            <div style="color: var(--muted); font-size: 0.8rem">Precisión estimada</div>\n            <div class="analysis-tag-row">\n              <span>✅ ${o.best}</span>\n              <span>👍 ${o.good}</span>\n              <span>⚠️ ${o.inaccuracy}</span>\n              <span>❌ ${o.mistake}</span>\n              <span>‼️ ${o.blunder}</span>\n            </div>\n          `),
        a.appendChild(r));
    });
  }
}
function renderEvalGraph(e) {
  const t = document.getElementById("analysis-eval-graph");
  t.innerHTML = "";
  const a = e.analysis;
  a &&
    a.scores.forEach((a, n) => {
      const o = "w" === e.positions[n].fen.split(" ")[1] ? a : -a,
        r = 50 + (Math.max(-600, Math.min(600, o)) / 600) * 50,
        s = document.createElement("div");
      ((s.className =
        "bar" +
        (o < 0 ? " black-adv" : "") +
        (n === analysisPly ? " current" : "")),
        (s.style.height = Math.max(4, 2 * Math.abs(r - 50)) + "%"),
        (s.title = 0 === n ? "Posición inicial" : `Tras ${e.moves[n - 1]}`),
        (s.onclick = () => {
          ((analysisPly = n), renderAnalysisResults(e));
        }),
        t.appendChild(s));
    });
}
function renderAnalysisBoard() {
  const e = analysisCurrentRecord,
    t = document.getElementById("analysis-board");
  t.innerHTML = "";
  const a = e.positions[analysisPly];
  if (!a || !a.fen) return;
  const n = new Chess(a.fen).board();
  for (let e = 0; e < 8; e++)
    for (let a = 0; a < 8; a++) {
      const o = document.createElement("div");
      o.className = "square " + ((e + a) % 2 ? "dark" : "light");
      const r = n[e][a];
      if (r) {
        const e = document.createElement("div");
        ((e.className =
          "piece " + ("w" === r.color ? "white-piece" : "black-piece")),
          (e.textContent = PIECES[r.color + r.type.toUpperCase()]),
          (e.dataset.piece = r.type.toUpperCase()),
          o.appendChild(e));
      }
      t.appendChild(o);
    }
  const o = document.getElementById("analysis-eval-current"),
    r = e.analysis;
  if (r && o) {
    const e = r.scores[analysisPly],
      t = "w" === a.fen.split(" ")[1] ? e : -e;
    let n;
    ((n =
      Math.abs(t) >= 99700
        ? `Mate en ${1e5 - Math.abs(t)} para ${t > 0 ? "blancas" : "negras"}`
        : (t > 0 ? "+" : "") +
          (t / 100).toFixed(2) +
          (t >= 0 ? " (ventaja blancas)" : " (ventaja negras)")),
      (o.textContent = n));
  }
}
function renderAnalysisComment() {
  const e = analysisCurrentRecord,
    t = document.getElementById("analysis-comment");
  if (!t || !e || !e.analysis) return;
  if (0 === analysisPly)
    return void (t.textContent =
      "Posición inicial. Navegá las jugadas para ver el análisis de cada una.");
  const a = e.analysis.perMove[analysisPly - 1];
  t.textContent = a ? commentFor(a.tag, a.playedSan, a.bestSan, a.color) : "";
}
function renderAnalysisMoveList() {
  const e = analysisCurrentRecord,
    t = document.getElementById("analysis-move-list");
  t.innerHTML = "";
  const a = e.analysis ? e.analysis.perMove : [];
  function n(t) {
    const n = e.moves[t];
    if (void 0 === n) return document.createElement("span");
    const o = document.createElement("button"),
      r = a[t],
      s = r ? TAG_INFO[r.tag] : null;
    return (
      (o.className =
        "analysis-move-btn" +
        (s ? " " + s.cls : "") +
        (t + 1 === analysisPly ? " active" : "")),
      (o.innerHTML =
        `<span>${n}</span>` +
        (s ? `<span class="mv-icon">${s.icon}</span>` : "")),
      s && (o.title = s.label),
      (o.onclick = () => {
        ((analysisPly = t + 1), renderAnalysisResults(e));
      }),
      o
    );
  }
  for (let a = 0; a < e.moves.length; a += 2) {
    const e = document.createElement("div");
    e.className = "analysis-move-row";
    const o = document.createElement("span");
    ((o.className = "analysis-move-num"),
      (o.textContent = a / 2 + 1 + "."),
      e.appendChild(o),
      e.appendChild(n(a)),
      e.appendChild(n(a + 1)),
      t.appendChild(e));
  }
}
((document.getElementById("analysis-close").onclick = closeAnalysisModal),
  (document.getElementById("analysis-first").onclick = () => {
    ((analysisPly = 0), renderAnalysisResults(analysisCurrentRecord));
  }),
  (document.getElementById("analysis-prev").onclick = () => {
    ((analysisPly = Math.max(0, analysisPly - 1)),
      renderAnalysisResults(analysisCurrentRecord));
  }),
  (document.getElementById("analysis-next").onclick = () => {
    ((analysisPly = Math.min(
      analysisCurrentRecord.positions.length - 1,
      analysisPly + 1,
    )),
      renderAnalysisResults(analysisCurrentRecord));
  }),
  (document.getElementById("analysis-last").onclick = () => {
    ((analysisPly = analysisCurrentRecord.positions.length - 1),
      renderAnalysisResults(analysisCurrentRecord));
  }));
const TUTOR_DEPTH = 14,
  TUTOR_TIPS_APERTURA = [
    "En la apertura, priorizá desarrollar tus piezas menores (caballos y alfiles) antes de sacar la dama.",
    "Tratá de enrocar pronto: pone a tu rey a salvo y conecta las torres.",
    "Controlá el centro (casillas d4, d5, e4, e5): te da más espacio y opciones.",
    "Evitá mover la misma pieza dos veces en la apertura sin una buena razón.",
    "No saques la dama demasiado pronto: puede convertirse en blanco de ataques con pérdida de tiempo.",
  ],
  TUTOR_TIPS_MEDIO_JUEGO = [
    "Antes de mover, preguntate siempre: ¿qué amenaza mi rival con su última jugada?",
    "Buscá las piezas rivales mal defendidas: suelen ser un buen objetivo táctico.",
    "Una torre en columna abierta o un caballo bien plantado en el centro valen mucho.",
    "Si tenés ventaja de material, buscá cambiar piezas para simplificar la posición.",
    "Cuidá la seguridad de tu rey: no debilites innecesariamente los peones que lo protegen.",
    "Pensá en tu plan antes de cada jugada, no solo en la jugada en sí.",
  ],
  TUTOR_TIPS_FINAL = [
    "En el final, activá a tu rey: se convierte en una pieza de ataque muy importante.",
    "Los peones pasados son muy valiosos en el final: intentá coronarlos o bloquearlos.",
    "Contá bien los tiempos: en los finales, un tempo de más puede decidir la partida.",
    "Con torres en el tablero, la actividad de las piezas suele valer más que el material.",
  ],
  DAILY_TIPS = [
    {
      title: "Desarrollá tus piezas primero",
      text: "En la apertura, priorizá desarrollar tus piezas menores (caballos y alfiles) antes de sacar la dama.",
    },
    {
      title: "Enrocá pronto",
      text: "Tratá de enrocar pronto: pone a tu rey a salvo y conecta las torres.",
    },
    {
      title: "Controlá el centro",
      text: "Las casillas centrales (d4, d5, e4, e5) permiten que tus piezas tengan mayor movilidad.",
    },
    {
      title: "No repitas piezas sin razón",
      text: "Evitá mover la misma pieza dos veces en la apertura sin una buena razón.",
    },
    {
      title: "Cuidado con sacar la dama temprano",
      text: "No saques la dama demasiado pronto: puede convertirse en blanco de ataques con pérdida de tiempo.",
    },
    {
      title: "Preguntate qué amenaza el rival",
      text: "Antes de mover, preguntate siempre: ¿qué amenaza mi rival con su última jugada?",
    },
    {
      title: "Buscá piezas mal defendidas",
      text: "Las piezas rivales mal defendidas suelen ser un buen objetivo táctico.",
    },
    {
      title: "Ocupá columnas abiertas",
      text: "Una torre en columna abierta o un caballo bien plantado en el centro valen mucho.",
    },
    {
      title: "Simplificá con ventaja de material",
      text: "Si tenés ventaja de material, buscá cambiar piezas para simplificar la posición.",
    },
    {
      title: "Protegé a tu rey",
      text: "Cuidá la seguridad de tu rey: no debilites innecesariamente los peones que lo protegen.",
    },
    {
      title: "Jugá siempre con un plan",
      text: "Pensá en tu plan antes de cada jugada, no solo en la jugada en sí.",
    },
    {
      title: "Activá tu rey en el final",
      text: "En el final, activá a tu rey: se convierte en una pieza de ataque muy importante.",
    },
    {
      title: "Valorá los peones pasados",
      text: "Los peones pasados son muy valiosos en el final: intentá coronarlos o bloquearlos.",
    },
    {
      title: "Contá bien los tiempos",
      text: "En los finales, un tempo de más puede decidir la partida.",
    },
    {
      title: "Priorizá la actividad de tus piezas",
      text: "Con torres en el tablero, la actividad de las piezas suele valer más que el material.",
    },
  ];
function renderDailyTip() {
  const e = document.getElementById("daily-tip-title"),
    t = document.getElementById("daily-tip-text");
  if (!e || !t) return;
  const a = dayOfYear(new Date()) % DAILY_TIPS.length,
    n = DAILY_TIPS[a];
  ((e.textContent = n.title), (t.textContent = n.text));
}
renderDailyTip();
const PIECE_NAMES = {
    p: "peón",
    n: "caballo",
    b: "alfil",
    r: "torre",
    q: "dama",
    k: "rey",
  },
  TUTOR_START_SQUARES = {
    n: ["b1", "g1", "b8", "g8"],
    b: ["c1", "f1", "c8", "f8"],
  },
  TUTOR_CENTER_SQUARES = ["d4", "d5", "e4", "e5"];
var tutorRunToken = 0,
  lastTutorFen = null,
  lastTutorMove = null,
  practiceAIBusy = !1,
  tutorRequestBusy = !1;
function tutorGamePhase(e) {
  const t = new Chess(e),
    a = t.history().length,
    n = t.board().flat().filter(Boolean).length;
  return a < 16 ? "apertura" : n <= 12 ? "final" : "medio";
}
function pickTutorTip(e) {
  const t = tutorGamePhase(e),
    a =
      "apertura" === t
        ? TUTOR_TIPS_APERTURA
        : "final" === t
          ? TUTOR_TIPS_FINAL
          : TUTOR_TIPS_MEDIO_JUEGO;
  return a[Math.floor(Math.random() * a.length)];
}
function getMoveReasons(e) {
  const t = [];
  return (
    (e.flags.includes("k") || e.flags.includes("q")) &&
      t.push("enroca, poniendo al rey a resguardo y activando la torre"),
    e.san.includes("#")
      ? t.push("¡es jaque mate, termina la partida!")
      : e.san.includes("+") &&
        t.push("da jaque, obligando a responder de inmediato"),
    (e.flags.includes("c") || e.flags.includes("e")) &&
      t.push(
        "captura una pieza rival" +
          (e.captured ? " (" + PIECE_NAMES[e.captured] + ")" : "") +
          ", ganando material",
      ),
    e.flags.includes("p") &&
      t.push("corona un peón, convirtiéndolo en una pieza mucho más poderosa"),
    TUTOR_START_SQUARES[e.piece] &&
      TUTOR_START_SQUARES[e.piece].includes(e.from) &&
      t.push("desarrolla una pieza que todavía no había entrado en juego"),
    TUTOR_CENTER_SQUARES.includes(e.to) &&
      "k" !== e.piece &&
      t.push("ocupa una casilla central, ganando espacio e influencia"),
    "k" !== e.piece ||
      e.flags.includes("k") ||
      e.flags.includes("q") ||
      t.push(
        "mueve al rey; hay que vigilar que quede seguro después de esta jugada",
      ),
    t
  );
}
function pvToSanLine(e, t) {
  if (!t || !t.length) return "";
  const a = new Chess(e),
    n = e.split(" ");
  let o = "b" === n[1] ? "b" : "w",
    r = parseInt(n[5], 10) || 1;
  const s = [];
  for (let e = 0; e < t.length; e++) {
    const n = t[e];
    if (!n || n.length < 4) break;
    const l = n.substring(0, 2),
      i = n.substring(2, 4),
      c = n.length > 4 ? n[4] : void 0,
      d = a.move({ from: l, to: i, promotion: c || "q" });
    if (!d) break;
    ("w" === o
      ? s.push(r + ". " + d.san)
      : (0 === e ? s.push(r + "... " + d.san) : s.push(d.san), r++),
      (o = "w" === o ? "b" : "w"));
  }
  return s.join(" ");
}
function explainTutorMove(e, t, a, n) {
  const o = new Chess(e),
    r = o.turn(),
    s = "w" === r ? "las Blancas" : "las Negras",
    l = "w" === r ? "las Negras" : "las Blancas",
    i = t.substring(0, 2),
    c = t.substring(2, 4),
    d = t.length > 4 ? t[4] : void 0,
    u = o.move({ from: i, to: c, promotion: d || "q" });
  if (!u)
    return {
      san: t,
      text: "El motor recomienda esta jugada en la posición actual.",
      evalText: "",
    };
  const m = getMoveReasons(u);
  let p, g;
  return (
    (p = m.length
      ? capitalizeFirst(u.san) +
        ": " +
        capitalizeFirst(m.slice(0, 2).join(", y además ")) +
        "."
      : u.san + " es la jugada mejor valorada por el motor en esta posición."),
    (g =
      Math.abs(a) >= 99700
        ? "Mate en " + (1e5 - Math.abs(a)) + " para " + (a > 0 ? s : l)
        : Math.abs(a) < 40
          ? "Posición aproximadamente equilibrada"
          : (a > 0 ? "+" : "") + (a / 100).toFixed(2) + " a favor de " + s),
    n || (g += " (estimado por material)"),
    { san: u.san, text: p, evalText: g }
  );
}
explainMode = "off" !== localStorage.getItem("chessExplainMode");
const explainToggleEl = document.getElementById("toggle-explain"),
  explainToggleElCfg = document.getElementById("toggle-explain-cfg"),
  EDU_DEFAULT_TITLE = "Pensá antes de mover",
  EDU_DEFAULT_TEXT = "Antes de jugar, preguntate: ¿qué amenaza mi rival?";
function resetEduPanel() {
  const e = document.getElementById("edu-title"),
    t = document.getElementById("edu-text");
  (e && (e.textContent = EDU_DEFAULT_TITLE),
    t && (t.textContent = EDU_DEFAULT_TEXT));
}
function syncExplainUI() {
  (explainToggleEl && (explainToggleEl.checked = explainMode),
    explainToggleElCfg && (explainToggleElCfg.checked = explainMode));
}
function setExplainMode(e) {
  ((explainMode = e),
    localStorage.setItem("chessExplainMode", explainMode ? "on" : "off"),
    syncExplainUI(),
    explainMode || resetEduPanel(),
    toast(
      explainMode
        ? "📚 Explicaciones activadas"
        : "📚 Explicaciones desactivadas",
    ));
}
function shouldExplainMover(e) {
  return !botEnabled || e === botColor;
}
function showMoveExplanation(e, t) {
  if (tournamentMatchActive) return;
  if (!explainMode || !t) return;
  if (!shouldExplainMover(t.color)) return;
  const a = "w" === t.color ? "Las Blancas jugaron" : "Las Negras jugaron",
    n = getMoveReasons(t);
  let o;
  o = n.length
    ? capitalizeFirst(n.slice(0, 2).join(", y además ")) + "."
    : "Es una jugada de desarrollo o mejora posicional, sin un motivo táctico inmediato evidente.";
  const r = pickTutorTip(e),
    s = document.getElementById("edu-title"),
    l = document.getElementById("edu-text");
  s &&
    l &&
    ((s.textContent = t.san + " · " + a),
    (l.textContent = capitalizeFirst(o) + " 💡 " + r));
}
function canUsePracticeAI_() {
  return (
    !tournamentMatchActive &&
    gameStarted &&
    !game.game_over() &&
    !botThinking &&
    (!botEnabled || game.turn() !== botColor)
  );
}
function syncPracticeAIControls_() {
  const e = document.getElementById("quick-ai-help-btn");
  if (!e) return;
  const t = tournamentMatchActive;
  ((e.disabled =
    t ||
    practiceAIBusy ||
    tutorRequestBusy ||
    !gameStarted ||
    game.game_over() ||
    botThinking ||
    (botEnabled && game.turn() === botColor)),
    (e.textContent = t ? "🔒 Ayuda IA bloqueada" : "💡 Ayuda IA"),
    e.setAttribute(
      "data-tooltip",
      t
        ? "La ayuda con IA no está disponible durante partidas de torneo"
        : "Muestra la mejor jugada sin moverla",
    ));
}
async function requestVisiblePracticeHelp_() {
  if (tournamentMatchActive)
    return void toast("🔒 La ayuda con IA está bloqueada durante el torneo.");
  if (!canUsePracticeAI_())
    return void toast("Iniciá una partida de práctica y esperá tu turno.");
  const e = document.getElementById("tutor-card");
  (e &&
    ((e.style.display = ""),
    e.scrollIntoView({ behavior: "smooth", block: "nearest" })),
    await requestTutorSuggestion());
}
async function playBestPracticeMove_() {
  if (tournamentMatchActive)
    return void toast("🔒 La IA no puede jugar durante el torneo.");
  if (practiceAIBusy) return;
  if (!canUsePracticeAI_())
    return void toast("Iniciá una partida de práctica y esperá tu turno.");
  ((practiceAIBusy = !0), syncPracticeAIControls_());
  const e = game.fen();
  try {
    (toast("🧠 La IA está buscando la mejor jugada…"),
      await requestTutorSuggestion(),
      game.fen() === e && lastTutorMove
        ? (playTutorMove(),
          toast("🤖 La IA jugó la mejor jugada en modo práctica."))
        : game.fen() === e && toast("No se pudo obtener una jugada de la IA."));
  } finally {
    ((practiceAIBusy = !1), syncPracticeAIControls_());
  }
}
async function requestTutorSuggestion() {
  if (tournamentMatchActive)
    return void toast("🔒 La ayuda con IA está bloqueada durante el torneo.");
  if (!gameStarted || game.game_over())
    return void toast("Iniciá una partida para pedirle ayuda al tutor.");
  if (botEnabled && game.turn() === botColor)
    return void toast("Esperá a que termine el turno de la IA.");
  if (tutorRequestBusy)
    return void toast("🧠 El tutor ya está analizando esta posición.");
  const e = ++tutorRunToken,
    t = document.getElementById("tutor-suggest-btn"),
    a = document.getElementById("tutor-output"),
    n = document.getElementById("tutor-loading"),
    o = game.fen();
  ((tutorRequestBusy = !0),
    (lastTutorFen = null),
    (lastTutorMove = null),
    (t.disabled = !0),
    (a.style.display = "none"),
    (n.style.display = "block"),
    syncPracticeAIControls_());
  try {
    const r = await evalPosition(o, 14);
    if (e !== tutorRunToken) return;
    if (game.fen() !== o)
      return void toast(
        "La posición cambió mientras el tutor analizaba. Pedí una nueva sugerencia.",
      );
    if (!r.bestMove)
      return (
        (a.style.display = "block"),
        (document.getElementById("tutor-move-san").textContent = "—"),
        (document.getElementById("tutor-eval").textContent = ""),
        (document.getElementById("tutor-explanation").textContent =
          "No hay jugadas para sugerir en esta posición."),
        (document.getElementById("tutor-pv").style.display = "none"),
        (document.getElementById("tutor-tip").textContent = ""),
        void (document.getElementById("tutor-play-btn").style.display = "none")
      );
    const {
        san: s,
        text: l,
        evalText: i,
      } = explainTutorMove(o, r.bestMove, r.score, r.engine),
      c = pickTutorTip(o),
      d = pvToSanLine(o, r.pv);
    ((lastTutorFen = o),
      (lastTutorMove = r.bestMove),
      (document.getElementById("tutor-move-san").textContent = s),
      (document.getElementById("tutor-eval").textContent = i),
      (document.getElementById("tutor-explanation").textContent = l));
    const u = document.getElementById("tutor-pv");
    (d && d.split(" ").length > 1
      ? ((document.getElementById("tutor-pv-text").textContent = d),
        (u.style.display = "block"))
      : (u.style.display = "none"),
      (document.getElementById("tutor-tip").textContent = "💡 " + c),
      (document.getElementById("tutor-play-btn").style.display = "block"),
      (a.style.display = "block"));
  } catch (e) {
    (console.error("No se pudo obtener la sugerencia del tutor:", e),
      toast("❌ No se pudo completar el análisis de la IA."));
  } finally {
    ((tutorRequestBusy = !1),
      (n.style.display = "none"),
      (t.disabled = !1),
      syncPracticeAIControls_());
  }
}
function playTutorMove() {
  if (tournamentMatchActive)
    return void toast("🔒 La IA no puede jugar durante el torneo.");
  if (!lastTutorMove || game.fen() !== lastTutorFen)
    return void toast(
      "La posición cambió: pedile una nueva sugerencia al tutor.",
    );
  if (!gameStarted || game.game_over() || botThinking) return;
  if (botEnabled && game.turn() === botColor) return;
  const e = lastTutorMove.substring(0, 2),
    t = lastTutorMove.substring(2, 4),
    a = lastTutorMove.length > 4 ? lastTutorMove[4] : void 0,
    n = game.move({ from: e, to: t, promotion: a || "q" });
  n &&
    (addIncrement(),
    (selected = null),
    (validMoves = []),
    markMoveForAnimation(n),
    playSoundForMove(n, game),
    (document.getElementById("tutor-output").style.display = "none"),
    (lastTutorMove = null),
    (lastTutorFen = null),
    render(),
    checkGameOver(),
    maybeTriggerBotMove());
}
(syncExplainUI(),
  explainToggleEl &&
    (explainToggleEl.onchange = () => setExplainMode(explainToggleEl.checked)),
  explainToggleElCfg &&
    (explainToggleElCfg.onchange = () =>
      setExplainMode(explainToggleElCfg.checked)),
  (document.getElementById("tutor-suggest-btn").onclick =
    requestTutorSuggestion),
  (document.getElementById("tutor-play-btn").onclick = playTutorMove));
const quickAIHelpBtn = document.getElementById("quick-ai-help-btn"),
  practiceAITrigger = document.getElementById("status");
(quickAIHelpBtn && (quickAIHelpBtn.onclick = requestVisiblePracticeHelp_),
  practiceAITrigger &&
    practiceAITrigger.addEventListener("dblclick", playBestPracticeMove_),
  syncPracticeAIControls_());


/* Lessons, exercises, and puzzle boards. Generated from the verified legacy bundle. */
const LESSONS = {
    1: {
      category: "fundamentos",
      xp: 25,
      content:
        '\n            <h4>¿Cómo se mueve cada pieza?</h4>\n            <p>El <b>peón</b> avanza una casilla (dos en su primer movimiento) y captura en diagonal. El <b>caballo</b> se mueve en "L" y es la única pieza que salta por encima de otras. El <b>alfil</b> se mueve en diagonal y siempre queda en casillas del mismo color. La <b>torre</b> se mueve en línea recta, por filas y columnas. La <b>dama</b> combina los movimientos de torre y alfil. El <b>rey</b> se mueve una casilla en cualquier dirección.</p>\n            <h4>Valor aproximado</h4>\n            <p>Peón = 1, Caballo = 3, Alfil = 3, Torre = 5, Dama = 9. El rey no tiene valor material: si lo pierden, pierden la partida.</p>\n            <div class="mini-diagram" data-fen="8/8/8/3N4/8/8/8/8" data-highlight="b3,b5,c2,c6,e2,e6,f3,f5"></div>\n            <p class="mini-diagram-caption">El caballo en d4 puede saltar a cualquiera de las 8 casillas marcadas.</p>\n            <div class="lesson-tip">💡 Los caballos son mejores cerca del centro; en el borde del tablero controlan muy pocas casillas.</div>\n          ',
      puzzle: {
        fen: "2b1k3/pppppppp/8/8/8/8/PPPPPPPP/1N2KB2 w - - 0 1",
        solution: ["b1c3"],
        prompt: "Es tu turno. Desarrollá el caballo hacia una casilla central.",
        success:
          "¡Muy bien! Cc3 lleva al caballo cerca del centro, donde controla más casillas.",
        fail: "Probá otra casilla: buscá acercar el caballo al centro del tablero.",
        hint: "El caballo se mueve en forma de L. Desde b1, una buena casilla central es c3.",
      },
    },
    2: {
      category: "fundamentos",
      xp: 30,
      content:
        '\n            <h4>¿Cuándo conviene capturar?</h4>\n            <p>No todas las capturas son buenas. Antes de capturar, comparen el valor de la pieza que capturan con el valor de la pieza que arriesgan. Capturar una pieza de mayor valor que la propia siempre es una ganancia de material.</p>\n            <h4>Piezas "colgadas"</h4>\n            <p>Una pieza está colgada cuando no tiene ninguna defensa y puede ser capturada gratis. Antes de cada jugada, revisen si el rival dejó alguna pieza sin proteger.</p>\n            <div class="mini-diagram" data-fen="8/8/8/3n4/8/8/8/8" data-highlight="d5"></div>\n            <p class="mini-diagram-caption">Este caballo no tiene ninguna pieza que lo defienda: está "colgado".</p>\n            <div class="lesson-tip">💡 Contá siempre: ¿qué gano y qué puedo llegar a perder con esta captura?</div>\n          ',
      puzzle: {
        fen: "1nb1k3/ppp1pppp/8/3n4/8/8/PPP1PPPP/1N1QK3 w - - 0 1",
        solution: ["d1d5"],
        prompt: "El caballo negro en d5 no tiene ninguna defensa. Capturalo.",
        success: "¡Correcto! Dxd5 gana una pieza completamente gratis.",
        fail: "Todavía se puede ganar material gratis. Fijate qué pieza negra no tiene ninguna defensa.",
        hint: "La dama en d1 y el caballo en d5 están en la misma columna.",
      },
    },
    3: {
      category: "fundamentos",
      xp: 35,
      content:
        '\n            <h4>Jaque</h4>\n            <p>Hay jaque cuando el rey está siendo atacado. Deben responder de inmediato: mover el rey, bloquear el ataque o capturar la pieza que da jaque.</p>\n            <h4>Jaque mate</h4>\n            <p>Si están en jaque y no hay ninguna manera de solucionarlo, es <b>jaque mate</b> y la partida termina.</p>\n            <h4>Tablas</h4>\n            <p>La partida puede terminar en tablas por ahogado (el jugador en turno no está en jaque pero no tiene jugadas legales), por acuerdo mutuo, o por repetición de posición.</p>\n            <div class="mini-diagram" data-fen="k7/2K5/1Q6/8/8/8/8/8" data-highlight="a8"></div>\n            <p class="mini-diagram-caption">Ejemplo de ahogado: el rey negro no está en jaque, pero no tiene ninguna casilla legal. Tablas.</p>\n            <div class="lesson-tip">💡 Un patrón clásico: si el rey rival quedó encerrado detrás de sus propios peones, una torre o dama en la última fila puede dar jaque mate.</div>\n          ',
      puzzle: {
        fen: "6k1/1ppppppp/8/8/8/8/1PPPP3/R5K1 w - - 0 1",
        solution: ["a1a8"],
        checkmate: !0,
        prompt:
          "El rey negro está encerrado por sus propios peones. Encontrá el jaque mate en una jugada.",
        success:
          "¡Jaque mate! La torre controla toda la octava fila y el rey no tiene escapatoria.",
        fail: "Esa jugada no es mate. Pensá en llevar la torre a la última fila.",
        hint: "Mové la torre a lo largo de la columna 'a' hasta la última fila.",
      },
    },
    4: {
      category: "estrategia",
      xp: 40,
      content:
        '\n            <h4>¿Por qué importa el centro?</h4>\n            <p>Las casillas centrales (d4, d5, e4, e5) son las más valiosas del tablero: desde ahí, las piezas controlan más casillas y se pueden trasladar rápido a cualquier sector.</p>\n            <h4>Cómo ocuparlo</h4>\n            <p>En la apertura, lo habitual es avanzar los peones centrales (e4/d4 o e5/d5) para ganar espacio y abrir líneas para el desarrollo de las piezas menores.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/8/8/8/8" data-highlight="d4,d5,e4,e5"></div>\n            <p class="mini-diagram-caption">Las 4 casillas centrales: d4, d5, e4 y e5.</p>\n            <div class="lesson-tip">💡 "Quien domina el centro, domina el tablero." Evitá mover peones de torre o de alfil temprano sin una buena razón.</div>\n          ',
      puzzle: {
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        solution: ["e2e4", "d2d4"],
        prompt:
          "Es la posición inicial. Jugá un movimiento que luche por el centro.",
        success:
          "¡Excelente! Ese avance central abre líneas para el alfil y la dama.",
        fail: "Esa jugada no pelea por el centro. Pensá en los peones de reina o de rey.",
        hint: "Los peones 'e' y 'd' son los que controlan las casillas centrales.",
      },
    },
    5: {
      category: "estrategia",
      xp: 45,
      content:
        '\n            <h4>Desarrollo antes que ataques prematuros</h4>\n            <p>Antes de buscar amenazas, saquen sus piezas menores (caballos y alfiles) de la fila inicial. Un desarrollo rápido permite enrocar antes y evita perder tiempos.</p>\n            <h4>La regla de "una pieza por jugada"</h4>\n            <p>En la apertura, eviten mover dos veces la misma pieza o sacar la dama demasiado pronto: le da tiempo al rival para desarrollarse mientras la atacan.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/4k3/8/8/8" data-highlight="e4"></div>\n            <p class="mini-diagram-caption">Un rey en el centro, sin enrocar, es un blanco fácil para las piezas rivales.</p>\n            <div class="lesson-tip">💡 Un buen orden típico: peón central, caballo, alfil, enroque.</div>\n          ',
      puzzle: {
        fen: "1nb1k3/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/4KBNR w - - 0 1",
        solution: ["g1f3"],
        prompt:
          "Elegí la jugada que mejor combina desarrollo y preparación para enrocar.",
        success:
          "¡Muy bien! Cf3 desarrolla una pieza y deja el camino libre para el enroque corto.",
        fail: "Esa jugada no desarrolla una pieza nueva. Buscá sacar el caballo.",
        hint: "El caballo en g1 puede saltar a una casilla útil sin bloquear el enroque.",
      },
    },
    6: {
      category: "estrategia",
      xp: 45,
      content:
        '\n            <h4>¿Qué es el enroque?</h4>\n            <p>El enroque es la única jugada donde se mueven dos piezas a la vez: el rey se desplaza dos casillas hacia una torre, y esa torre salta al otro lado del rey. Sirve para poner al rey a resguardo y conectar las torres.</p>\n            <h4>Condiciones</h4>\n            <p>No pueden haber piezas entre el rey y la torre, ninguno de los dos se movió antes, el rey no puede estar en jaque, y no puede pasar ni terminar en una casilla atacada.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/8/8/8/5RK1" data-highlight="f1,g1"></div>\n            <p class="mini-diagram-caption">Así queda el rey y la torre después del enroque corto (O-O).</p>\n            <div class="lesson-tip">💡 Como regla general, enrocá lo antes posible: un rey en el centro es un blanco fácil.</div>\n          ',
      puzzle: {
        fen: "1nb1k3/pppppppp/8/8/8/8/PPPPPPPP/1NB1K2R w K - 0 1",
        solution: ["e1g1"],
        prompt:
          "El camino está despejado. Enrocá corto para poner a resguardo al rey.",
        success:
          "¡Perfecto! El enroque corto pone al rey a salvo y activa la torre.",
        fail: "Esa no es la jugada de enroque. El rey se mueve dos casillas hacia la torre.",
        hint: "Mové el rey de e1 a g1 (enroque corto).",
      },
    },
    7: {
      category: "tactica",
      xp: 50,
      content:
        '\n            <h4>El ataque doble (horquilla)</h4>\n            <p>Un ataque doble ocurre cuando una sola pieza amenaza a dos objetivos al mismo tiempo. El rival solo puede salvar uno de ellos, así que ustedes ganan material.</p>\n            <h4>El caballo, especialista en horquillas</h4>\n            <p>Por su movimiento en "L", el caballo es ideal para dar horquillas: puede atacar dos piezas que están lejos entre sí y que no se defienden mutuamente.</p>\n            <div class="mini-diagram" data-fen="8/8/8/4N3/8/8/8/8" data-highlight="c4,c6,d3,d7,f3,f7,g4,g6"></div>\n            <p class="mini-diagram-caption">Desde e5, el caballo controla estas 8 casillas a la vez: cualquier par de piezas rivales ahí puede caer en una horquilla.</p>\n            <div class="lesson-tip">💡 Antes de saltar con el caballo, revisen si la casilla de destino ataca al rey y a otra pieza valiosa a la vez.</div>\n          ',
      puzzle: {
        fen: "2r1k3/pppppppp/8/1N6/8/8/PPPPPPPP/1NB3K1 w - - 0 1",
        sequence: ["b5d6", "e8d8", "d6c8"],
        midMessage:
          "¡Cd6+ es jaque! El rey se aparta del jaque. Ahora terminá la horquilla.",
        prompt:
          "Encontrá la jugada de caballo que ataca al rey y a la torre al mismo tiempo, y después ganá la torre.",
        success:
          "¡Horquilla completa! Diste jaque con el caballo y después te comiste la torre.",
        fail: "Esa jugada no ataca dos piezas a la vez. Buscá una casilla de caballo que dé jaque.",
        hint: "Desde d6, el caballo controla e8 y c8 al mismo tiempo. Después de que el rey se mueva, comé la torre en c8.",
      },
    },
    8: {
      category: "tactica",
      xp: 50,
      content:
        '\n            <h4>¿Qué es una clavada?</h4>\n            <p>Una pieza está clavada cuando no se puede (o no conviene) mover porque detrás de ella hay una pieza más valiosa, generalmente el rey. Las clavadas absolutas (contra el rey) son ilegales de romper.</p>\n            <h4>Cómo aprovecharla</h4>\n            <p>Una vez clavada una pieza, suele ser un buen objetivo: pueden sumar más atacantes sobre ella, ya que no se puede escapar sin exponer al rey.</p>\n            <div class="mini-diagram" data-fen="8/6k1/8/8/3n4/8/8/B7" data-highlight="d4"></div>\n            <p class="mini-diagram-caption">El caballo está clavado: si se mueve, expone al rey al ataque del alfil.</p>\n            <div class="lesson-tip">💡 Los alfiles y torres son las piezas que suelen clavar; siempre a lo largo de una línea recta o diagonal.</div>\n          ',
      puzzle: {
        fen: "r5k1/pppppppp/4n3/8/8/8/BPPPPPPP/1N4K1 w - - 0 1",
        solution: ["a2c4"],
        prompt:
          "Colocá el alfil en la diagonal para clavar el caballo negro contra el rey.",
        success:
          "¡Bien visto! Ac4 clava el caballo: si se mueve, queda expuesto el rey.",
        fail: "Esa jugada no clava ninguna pieza. Buscá la diagonal que une al alfil con el rey rival.",
        hint: "El alfil debe quedar en la misma diagonal que el caballo y el rey negro.",
      },
    },
    9: {
      category: "tactica",
      xp: 55,
      content:
        '\n            <h4>El ataque descubierto</h4>\n            <p>Ocurre cuando mueven una pieza que estaba bloqueando el ataque de otra pieja propia (torre, alfil o dama), y al apartarse, esa pieza de atrás queda atacando algo. La pieza que se mueve también puede capturar o amenazar algo por su cuenta: es un "dos por uno".</p>\n            <h4>El jaque descubierto</h4>\n            <p>Es el más peligroso: al descubrir jaque, la pieza que se movió queda libre para capturar cualquier cosa, porque el rival está obligado a resolver el jaque primero.</p>\n            <div class="mini-diagram" data-fen="3k4/8/8/8/3B4/8/8/3R4" data-highlight="d1,d4,d8"></div>\n            <p class="mini-diagram-caption">El alfil tapa a la torre. Si se aparta (capturando algo de paso), la torre queda dando jaque.</p>\n            <div class="lesson-tip">💡 Busquen piezas propias alineadas con el rey rival, con solo una pieza propia en el medio.</div>\n          ',
      puzzle: {
        fen: "rn1k4/p1p1pppp/8/3B4/8/8/PPP1PPPP/1N1R2K1 w - - 0 1",
        solution: ["d5a8"],
        prompt:
          "El alfil bloquea a tu propia torre. Movelo para ganar material con jaque descubierto.",
        success:
          "¡Excelente! Al capturar la torre en a8, además descubrís el jaque de tu torre en d1 sobre el rey.",
        fail: "Esa jugada no aprovecha el ataque descubierto. Fijate qué pieza tuya bloquea a la torre en d1.",
        hint: "El alfil está sobre la misma columna que tu torre y el rey rival. Movelo capturando algo.",
      },
    },
    10: {
      category: "tactica",
      xp: 60,
      content:
        '\n            <h4>La desviación</h4>\n            <p>La desviación consiste en eliminar u obligar a moverse a la pieza que defiende algo importante (una casilla de mate, una pieza valiosa). Sin su defensor, ese punto débil queda a merced del ataque.</p>\n            <h4>Cómo identificarla</h4>\n            <p>Busquen qué pieza rival cumple una tarea defensiva clave, y pregúntense: "¿puedo capturarla, atacarla o forzarla a moverse?"</p>\n            <div class="mini-diagram" data-fen="8/8/5n2/8/8/8/8/8" data-highlight="f6"></div>\n            <p class="mini-diagram-caption">Este caballo es el único defensor de casillas clave cerca del rey. Sin él, esas casillas quedan débiles.</p>\n            <div class="lesson-tip">💡 Si una sola pieza defiende dos cosas importantes, suele ser el blanco ideal para una desviación.</div>\n          ',
      puzzle: {
        fen: "r5k1/pppppp1p/5n2/8/8/2B5/PPPPPPPP/1N4K1 w - - 0 1",
        solution: ["c3f6"],
        prompt:
          "El caballo negro es el único defensor de casillas clave cerca del rey. Eliminalo.",
        success:
          "¡Muy bien! Al capturar el caballo, eliminás al defensor y dejás al rey negro mucho más débil.",
        fail: "Esa jugada no elimina al defensor. Buscá una captura con el alfil.",
        hint: "El alfil en c3 y el caballo en f6 están en la misma diagonal.",
      },
    },
    11: {
      category: "tactica",
      xp: 60,
      content:
        '\n            <h4>La sobrecarga</h4>\n            <p>Una pieza está sobrecargada cuando tiene que defender dos cosas a la vez. Si la atacan con una tercera amenaza, no va a poder cumplir con las dos tareas: al resolver una, dejará la otra sin protección.</p>\n            <h4>Ejemplo típico</h4>\n            <p>Una torre que defiende simultáneamente la última fila (contra el mate) y una pieza propia está sobrecargada: pueden ganar esa pieza sabiendo que, si recaptura, se abre una debilidad mayor.</p>\n            <div class="mini-diagram" data-fen="3r2k1/8/8/3n4/8/8/8/8" data-highlight="d5,d8"></div>\n            <p class="mini-diagram-caption">La torre en d8 cumple dos tareas a la vez: defiende al caballo y controla la última fila.</p>\n            <div class="lesson-tip">💡 Contá cuántas tareas defensivas tiene cada pieza rival antes de decidir un plan táctico.</div>\n          ',
      puzzle: {
        fen: "1n1r2k1/ppp2ppp/8/3n4/8/1B6/PPPP4/4R1K1 w - - 0 1",
        sequence: ["b3d5", "d8d5", "e1e8"],
        checkmate: !0,
        midMessage:
          "La torre recaptura en d5... pero eso le quita el control de la última fila.",
        prompt:
          "La torre negra defiende al caballo y, a la vez, la última fila. Aprovechá la sobrecarga para terminar la partida.",
        success:
          "¡Sobrecarga perfecta! Al capturar el caballo, la torre negra tuvo que elegir: y al recapturar, abandonó la última fila. Jaque mate.",
        fail: "Esa jugada no explota la sobrecarga. Buscá una captura con el alfil sobre el caballo.",
        hint: "El alfil puede capturar el caballo en d5. Si la torre recaptura, la última fila queda libre para tu torre.",
      },
    },
    12: {
      category: "estrategia",
      xp: 100,
      content:
        '\n            <h4>Pensar antes de mover</h4>\n            <p>Un buen método de pensamiento ajedrecístico combina varias preguntas: ¿tengo jaques, capturas o amenazas disponibles? ¿qué pieza rival está peor colocada? ¿cuál es mi pieza menos activa y cómo la mejoro?</p>\n            <h4>El plan general</h4>\n            <p>El ajedrez no se juega jugada por jugada sin rumbo: conviene tener siempre una idea de fondo (ganar espacio, atacar al rey, mejorar la peor pieza) y elegir jugadas que se acerquen a ese objetivo.</p>\n            <div class="mini-diagram" data-fen="6k1/8/8/8/8/8/8/2B3K1" data-highlight="c1"></div>\n            <p class="mini-diagram-caption">¿Cuál es tu pieza peor colocada ahora mismo? Este alfil todavía sigue en su casilla inicial.</p>\n            <div class="lesson-tip">💡 Si no ven ninguna jugada táctica forzada, la mejor jugada suele ser la que mejora su pieza peor colocada.</div>\n          ',
      puzzle: {
        fen: "2b3k1/pppppppp/8/8/8/N7/PPPPPPPP/5BK1 w - - 0 1",
        solution: ["a3c4"],
        prompt:
          "El caballo está mal ubicado en el borde. Centralizalo para mejorar tu peor pieza.",
        success:
          "¡Excelente aplicación del método! Un caballo centralizado vale mucho más que uno en el borde.",
        fail: "Esa jugada no mejora la posición del caballo. Buscá acercarlo al centro.",
        hint: "Desde a3, el caballo tiene una buena casilla central disponible.",
      },
    },
    13: {
      category: "fundamentos",
      xp: 40,
      content:
        '\n            <h4>¿Cómo se lee una jugada?</h4>\n            <p>Cada casilla se nombra con una letra (columna, de "a" a "h") y un número (fila, de 1 a 8). Las piezas se abrevian: R=Rey (K en inglés), D=Dama (Q), T=Torre (R), A=Alfil (B), C=Caballo (N). Los peones no llevan letra.</p>\n            <h4>Ejemplos</h4>\n            <p>"e4" significa que un peón avanza a e4. "Cf3" significa que un caballo se mueve a f3. "Cxf3" indica que esa jugada captura una pieza. "O-O" es el enroque corto.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/8/5N2/8/8" data-highlight="f3"></div>\n            <p class="mini-diagram-caption">La casilla "f3": columna f, fila 3.</p>\n            <div class="lesson-tip">💡 Practicar la notación les permite seguir partidas de otros jugadores y analizar las suyas.</div>\n          ',
      puzzle: {
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        solution: ["g1f3"],
        prompt: "Jugá el movimiento que en notación se escribe 'Cf3'.",
        success:
          "¡Correcto! Esa es exactamente la jugada Cf3: el caballo de rey se desarrolla.",
        fail: "Esa no es la jugada Cf3. Recordá: C = caballo, y f3 es la casilla de destino.",
        hint: "Buscá el caballo que puede llegar a la casilla f3 en una jugada.",
      },
    },
    14: {
      category: "fundamentos",
      xp: 45,
      content:
        '\n            <h4>¿Cuándo conviene cambiar piezas?</h4>\n            <p>Cambiar piezas (intercambiarlas por otras de valor similar) suele convenir cuando están mejor posicionados, cuando tienen ventaja material (simplificar ayuda a concretar la ventaja) o cuando eliminan la pieza más activa del rival.</p>\n            <h4>Cuándo evitarlo</h4>\n            <p>Si están peor o necesitan complicar la partida, evitar cambios suele dar más chances, ya que mantiene piezas en el tablero para generar contrajuego.</p>\n            <div class="mini-diagram" data-fen="4k3/8/8/8/8/1P6/8/4K3" data-highlight="b3"></div>\n            <p class="mini-diagram-caption">Con una ventaja de material (como este peón de más), cambiar piezas ayuda a simplificar hacia la victoria.</p>\n            <div class="lesson-tip">💡 Regla práctica: si están mejor, cambien piezas (no peones); si están peor, evítenlo.</div>\n          ',
      puzzle: {
        fen: "1n2k3/pppppppp/8/3q4/3Q4/1P6/P1PPPPPP/1N2K3 w - - 0 1",
        solution: ["d4d5"],
        prompt:
          "Tenés una ventaja de material (un peón de más). Cambiá las damas para simplificar la posición.",
        success:
          "¡Bien pensado! Al cambiar damas estando mejor, se acercan a ganar la partida con menos riesgo.",
        fail: "Esa jugada no cambia las damas. Buscá la captura de dama por dama.",
        hint: "Las dos damas están en la misma columna.",
      },
    },
    15: {
      category: "estrategia",
      xp: 55,
      content:
        '\n            <h4>¿Qué es una columna abierta?</h4>\n            <p>Es una columna sin peones de ningún color. Las torres son mucho más fuertes ahí porque pueden moverse libremente de un extremo al otro del tablero e infiltrarse en el campo rival.</p>\n            <h4>Cómo usarla</h4>\n            <p>Coloquen sus torres en columnas abiertas (o semiabiertas, sin peones propios) apenas puedan. Suele ser más importante que mover un peón más en el flanco.</p>\n            <div class="mini-diagram" data-fen="6k1/ppp1pppp/8/8/8/8/PPP1PPPP/R5K1" data-highlight="d1,d2,d3,d4,d5,d6,d7,d8"></div>\n            <p class="mini-diagram-caption">La columna "d" no tiene peones de ningún color: está abierta.</p>\n            <div class="lesson-tip">💡 "Torre en columna abierta" es uno de los principios estratégicos más útiles para el medio juego.</div>\n          ',
      puzzle: {
        fen: "1n3bk1/ppp1pppp/8/8/8/8/PPP1PPPP/R4BK1 w - - 0 1",
        solution: ["a1d1"],
        prompt:
          "La columna 'd' está completamente abierta. Llevá tu torre ahí.",
        success: "¡Perfecto! Td1 ocupa la única columna abierta del tablero.",
        fail: "Esa jugada no coloca la torre en la columna abierta. Fijate qué columna no tiene peones.",
        hint: "Ninguna de las dos partes tiene peones en la columna 'd'.",
      },
    },
    16: {
      category: "estrategia",
      xp: 55,
      content:
        '\n            <h4>Caballo bueno vs. caballo malo</h4>\n            <p>Un caballo en el borde del tablero (columnas \'a\' u \'h\') controla muy pocas casillas y suele estar "malo". Un caballo en el centro, apoyado por un peón y sin poder ser atacado por peones rivales, es una pieza excelente: se llama <b>outpost</b> o "casilla fuerte".</p>\n            <h4>Cómo mejorarlo</h4>\n            <p>Si su caballo está mal ubicado, busquen la ruta más corta para llevarlo a una casilla central protegida.</p>\n            <div class="mini-diagram" data-fen="8/8/8/3N4/8/8/8/N7" data-highlight="d5"></div>\n            <p class="mini-diagram-caption">El caballo en a1 apenas controla 2 casillas; el mismo caballo en d5 controla hasta 8.</p>\n            <div class="lesson-tip">💡 Antes de mover otra pieza, revisen si su caballo peor colocado tiene una ruta de mejora disponible.</div>\n          ',
      puzzle: {
        fen: "2b3k1/pppppppp/8/8/N7/8/PPPPPPPP/5BK1 w - - 0 1",
        solution: ["a4c5"],
        prompt:
          "El caballo está en el borde, sin controlar casi nada. Llevalo a una casilla central.",
        success:
          "¡Bien! Esa casilla central es mucho más fuerte que el borde del tablero.",
        fail: "Esa jugada no mejora al caballo. Buscá una casilla más central.",
        hint: "Desde a4, el caballo tiene una casilla central disponible en la columna 'c'.",
      },
    },
    17: {
      category: "tactica",
      xp: 60,
      content:
        '\n            <h4>El doble ataque con la dama</h4>\n            <p>La dama, al combinar los movimientos de torre y alfil, es ideal para atacar dos piezas a la vez desde una sola casilla, incluso en direcciones distintas (una por columna o fila, otra por diagonal).</p>\n            <h4>Cómo buscarlo</h4>\n            <p>Fíjense si hay dos piezas rivales sin defensa que compartan una fila, columna o diagonal con una misma casilla disponible para su dama.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/3Q4/8/8/8" data-highlight="d1,d8,a4,h4,a1,g7"></div>\n            <p class="mini-diagram-caption">Desde d4, la dama controla toda la columna, la fila y las dos diagonales a la vez.</p>\n            <div class="lesson-tip">💡 Un doble ataque de dama suele ganar material aunque el rival tenga jaque o amenazas propias, siempre que puedan calcular bien el orden de jugadas.</div>\n          ',
      puzzle: {
        fen: "4k3/pppnpppp/8/r7/8/8/PP1PPPPP/3Q2K1 w - - 0 1",
        sequence: ["d1a4", "a5a6", "a4d7"],
        midMessage:
          "La torre se salva corriendo por la columna 'a'. El caballo quedó solo: andá por él.",
        prompt:
          "Encontrá la jugada de dama que ataca la torre y el caballo negros al mismo tiempo, y quedate con la pieza que no pueda salvar.",
        success:
          "¡Doble ataque perfecto! Dxa4 amenazó las dos piezas; al salvar la torre, te quedaste con el caballo.",
        fail: "Esa jugada no ataca las dos piezas a la vez. Buscá una casilla que una la columna de la torre con la diagonal del caballo.",
        hint: "Buscá una casilla en la misma columna que la torre y en la misma diagonal que el caballo. Si salvan la torre, comé el caballo.",
      },
    },
    18: {
      category: "tactica",
      xp: 70,
      content:
        '\n            <h4>La jugada intermedia (zwischenzug)</h4>\n            <p>A veces, antes de resolver el intercambio o la jugada "obvia", conviene intercalar una jugada más fuerte (un jaque o una amenaza mayor) que cambie la evaluación de la posición. El rival debe responder a esa jugada primero.</p>\n            <h4>Cómo detectarla</h4>\n            <p>Antes de recapturar automáticamente, pregúntense: "¿tengo un jaque o una amenaza más fuerte disponible ahora mismo?"</p>\n            <div class="mini-diagram" data-fen="4k3/8/8/1B6/8/8/8/8" data-highlight="b5,c6,d7,e8"></div>\n            <p class="mini-diagram-caption">Antes de resolver lo obvio, revisen si hay un jaque disponible como este.</p>\n            <div class="lesson-tip">💡 No siempre la jugada más obvia es la mejor: revisen si hay una jugada intermedia antes de continuar la secuencia esperada.</div>\n          ',
      puzzle: {
        fen: "1n2k3/pppp1ppp/8/8/3r4/3B4/PPP1PPPP/3Q2K1 w - - 0 1",
        sequence: ["d3b5", "e8e7", "d1d4"],
        midMessage:
          "Ab5+ obliga al rey a moverse antes de ocuparte de cualquier otra cosa.",
        prompt:
          "Podrías capturar la torre directamente, pero hay una jugada intermedia mejor. Encontrala, y después capturá la torre.",
        success:
          "¡Excelente! Ab5+ es la jugada intermedia: ganás un tiempo con jaque y después te quedás con la torre igual.",
        fail: "Esa jugada no es la intermedia más fuerte. Pensá en un jaque con el alfil antes de capturar la torre.",
        hint: "El alfil puede dar jaque en lugar de capturar directamente. Después de que el rey se mueva, capturá la torre con la dama.",
      },
    },
    19: {
      category: "tactica",
      xp: 80,
      content:
        '\n            <h4>¿Qué es un sacrificio?</h4>\n            <p>Sacrificar es entregar material a cambio de una compensación mayor: un ataque decisivo, jaque mate, o una ventaja posicional muy grande. No todo sacrificio es correcto: hay que calcular bien lo que se obtiene a cambio.</p>\n            <h4>El "sacrificio griego" (Axh7+)</h4>\n            <p>Un patrón clásico: si el rey rival enrocó corto y su alfil apunta a h7 (o h2), a veces se puede sacrificar el alfil ahí para exponer al rey y lanzar un ataque decisivo con las piezas restantes.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/8/8/2B5/8" data-highlight="c2,d3,e4,f5,g6,h7"></div>\n            <p class="mini-diagram-caption">La diagonal larga hacia h7: la ruta clásica del sacrificio griego.</p>\n            <div class="lesson-tip">💡 Antes de sacrificar, calculen al menos 2 o 3 jugadas del ataque resultante: un sacrificio sin seguimiento concreto suele ser solo pérdida de material.</div>\n          ',
      puzzle: {
        fen: "r5k1/pppppppp/8/8/8/3B1N2/PPPPPPPP/R5K1 w - - 0 1",
        sequence: ["d3h7", "g8h7", "f3g5"],
        midMessage:
          "El rey captura el alfil... y camina directo hacia el resto del ataque.",
        prompt:
          "El rey negro enrocó corto y tu alfil apunta directo a h7. Jugá el sacrificio clásico y continuá el ataque.",
        success:
          "¡Sacrificio griego completo! Axh7+ Rxh7 Cg5+ expone al rey negro por completo: el ataque recién empieza.",
        fail: "Esa jugada no es el sacrificio en h7. Fijate en qué diagonal está tu alfil.",
        hint: "El alfil en d3 apunta directo a la casilla h7. Después de que el rey capture, seguí el ataque con el caballo.",
      },
    },
    20: {
      category: "estrategia",
      xp: 120,
      content:
        '\n            <h4>Cómo armar un plan</h4>\n            <p>Después de la apertura, cada posición pide un plan concreto: puede ser ganar espacio, atacar al rey, mejorar la peor pieza o crear una debilidad en el bando rival. Un plan da sentido a cada jugada individual.</p>\n            <h4>Señales para elegir un plan</h4>\n            <p>Miren la estructura de peones, la seguridad de ambos reyes y qué piezas están mejor o peor colocadas. Eso les va a indicar de qué lado del tablero conviene jugar.</p>\n            <div class="mini-diagram" data-fen="6k1/5ppp/8/8/8/8/5PPP/6K1" data-highlight="f2,g2,h2"></div>\n            <p class="mini-diagram-caption">Un plan concreto: avanzar estos tres peones para atacar al rey enrocado.</p>\n            <div class="lesson-tip">💡 Un plan simple y consistente vence a una sucesión de jugadas sueltas sin conexión entre sí.</div>\n          ',
      puzzle: {
        fen: "2b3k1/ppppp1pp/5n2/8/4P3/8/PPPP1PPP/2B3K1 w - - 0 1",
        solution: ["e4e5"],
        prompt:
          "Elegí la jugada que ejecuta un plan claro: ganar espacio y ganar tiempo atacando al caballo.",
        success:
          "¡Gran plan! e5 gana espacio y obliga al caballo negro a retroceder, perdiendo tiempo.",
        fail: "Esa jugada no sigue el plan de ganar espacio con tempo. Pensá en avanzar el peón central.",
        hint: "El peón central puede avanzar una casilla y atacar al caballo negro.",
      },
    },
  },
  EXERCISES = {
    1: {
      category: "principiante",
      xp: 20,
      fen: "3nkb2/1pp2ppp/8/8/r2Q4/8/1PP2PPP/1N4K1 w - - 0 1",
      solution: ["d4a4"],
      prompt:
        "Tu dama puede capturar la torre o el caballo negros. Elegí la captura que gana más material.",
      success:
        "¡Correcto! La torre vale más que el caballo: Dxa4 es la mejor captura.",
      fail: "Esa captura suma menos material. Compará el valor de la torre y del caballo, y elegí la pieza más valiosa.",
      hint: "Compará: torre = 5 puntos, caballo = 3 puntos.",
    },
    2: {
      category: "principiante",
      xp: 20,
      fen: "2b1k3/pp3ppp/8/8/6n1/8/PP3PPP/1N2K2R w K - 0 1",
      solution: ["e1g1"],
      prompt:
        "Es tu turno. Poné a resguardo al rey con la mejor jugada de seguridad.",
      success:
        "¡Bien! El enroque corto es la jugada más segura para tu rey en esta posición.",
      fail: "Esa jugada no mejora la seguridad del rey. Pensá en enrocar.",
      hint: "El rey puede enrocar corto: se mueve dos casillas hacia la torre.",
    },
    3: {
      category: "estrategia",
      xp: 30,
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      solution: ["e2e4", "d2d4", "g1f3", "c2c4"],
      prompt:
        "Elegí una jugada de apertura sólida que luche por el centro o desarrolle una pieza.",
      success:
        "¡Buena elección! Es una de las jugadas de apertura más sólidas y más jugadas a nivel mundial.",
      fail: "Esa jugada no es la más recomendable para empezar. Pensá en los peones centrales o en desarrollar un caballo.",
      hint: "e4, d4, Cf3 y c4 son las jugadas de apertura más comunes y sólidas.",
    },
    4: {
      category: "tactica",
      xp: 35,
      fen: "r1q3k1/pp3ppp/2N5/8/8/8/PP3PPP/2B3K1 w - - 0 1",
      sequence: ["c6e7", "g8f8", "e7c8"],
      midMessage:
        "Ce7+ es jaque: el rey se aparta. Ahora completá la horquilla.",
      prompt:
        "Encontrá el salto de caballo que ataca al rey y a la dama negros a la vez, y después ganá la dama.",
      success:
        "¡Horquilla real completa! Diste jaque con el caballo y después ganaste la dama.",
      fail: "Esa jugada no genera un ataque doble. Buscá una casilla de caballo que dé jaque.",
      hint: "Desde e7, el caballo controla tanto c8 como g8. Después del jaque, comé la dama en c8.",
    },
    5: {
      category: "tactica",
      xp: 35,
      fen: "2b3k1/p1p2ppp/8/4n2q/8/8/P1P2PPP/1RB3K1 w - - 0 1",
      solution: ["b1b5"],
      prompt:
        "Clavá el caballo negro contra la dama llevando tu torre a la quinta fila.",
      success:
        "¡Bien visto! Tb5 clava el caballo: si se mueve, pierde la dama.",
      fail: "Esa jugada no clava ninguna pieza. Buscá la fila que comparten el caballo y la dama negros.",
      hint: "El caballo y la dama negros están en la misma fila (la 5).",
    },
    6: {
      category: "tactica",
      xp: 50,
      fen: "rn4kb/1ppppp1p/8/8/8/8/2PPPPPP/QN4K1 w - - 0 1",
      solution: ["a1a8"],
      prompt:
        "Tenés dos capturas con jaque disponibles. Elegí la que gana más material.",
      success:
        "¡Correcto! Dxa8+ gana la torre (más valiosa que el alfil) y además da jaque.",
      fail: "Esa captura suma menos material. Compará el valor de la torre y el del alfil antes de elegir.",
      hint: "Torre = 5 puntos, alfil = 3 puntos. Elegí capturar la pieza más valiosa.",
    },
    7: {
      category: "estrategia",
      xp: 50,
      fen: "r5k1/ppp1p1pp/5n2/8/8/8/PPP2PPP/1NB3K1 w - - 0 1",
      solution: ["c1g5"],
      prompt:
        "Tu alfil sigue en la fila inicial. Activalo presionando al caballo negro.",
      success:
        "¡Buena mejora de pieza! Ag5 activa tu peor pieza y presiona al caballo.",
      fail: "Esa jugada no activa al alfil de la mejor manera. Buscá la diagonal larga hacia el caballo.",
      hint: "El alfil puede salir por la diagonal hasta la casilla g5.",
    },
    8: {
      category: "tactica",
      xp: 75,
      fen: "7k/2pp2pp/8/8/8/8/2PPP3/1Q4K1 w - - 0 1",
      solution: ["b1b8"],
      checkmate: !0,
      prompt:
        "El rey negro está atrapado en la esquina por sus propios peones. Encontrá el mate en una jugada.",
      success:
        "¡Jaque mate! La dama controla toda la última fila y el rey no tiene ninguna escapatoria.",
      fail: "Esa jugada no es mate. Pensá en llevar la dama a la última fila.",
      hint: "Llevá la dama por la columna 'b' hasta la última fila.",
    },
    9: {
      category: "principiante",
      xp: 25,
      fen: "1n2k3/pppppppp/8/8/2B5/8/PP1PPPPP/1N4K1 w - - 0 1",
      solution: ["c4f7"],
      prompt:
        "Leé bien la posición: hay un peón negro totalmente indefenso. Capturalo.",
      success:
        "¡Bien leído! El peón en f7 no tenía ninguna defensa, y de paso das jaque.",
      fail: "Todavía hay una captura gratis disponible. Revisá qué peón negro no tiene ninguna pieza que lo proteja.",
      hint: "El alfil y el peón negro comparten la misma diagonal.",
    },
    10: {
      category: "principiante",
      xp: 25,
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      solution: ["e2e4"],
      prompt: "Jugá exactamente el movimiento que en notación se escribe 'e4'.",
      success:
        "¡Correcto! Esa jugada es exactamente 'e4': el peón de rey avanza dos casillas.",
      fail: "Esa no es la jugada 'e4'. Fijate bien qué peón y qué casilla indica la notación.",
      hint: "Buscá el peón que puede llegar a la casilla e4 en una sola jugada.",
    },
    11: {
      category: "estrategia",
      xp: 35,
      fen: "6k1/pppp1ppp/8/8/8/8/PPPP1PPP/5RK1 w - - 0 1",
      solution: ["f1e1"],
      prompt: "Encontrá la única columna sin peones y colocá tu torre ahí.",
      success:
        "¡Perfecto! La columna 'e' está completamente abierta: tu torre queda mucho más activa ahí.",
      fail: "Esa jugada no coloca la torre en la columna abierta. Fijate cuál es la única columna sin peones.",
      hint: "Ninguna de las dos partes tiene peones en la columna 'e'.",
    },
    12: {
      category: "estrategia",
      xp: 40,
      fen: "2b1k3/pppppppp/8/8/8/8/PPPP1PPP/4KB1N w - - 0 1",
      solution: ["h1g3"],
      prompt:
        "Tu caballo está totalmente aislado en el borde. Mejoralo llevándolo hacia el centro.",
      success:
        "¡Bien! Cg3 saca al caballo del borde y lo acerca a casillas mucho más útiles.",
      fail: "Esa jugada no mejora al caballo. Buscá una casilla más cercana al centro.",
      hint: "Desde h1, el caballo tiene una única casilla razonable de desarrollo.",
    },
    13: {
      category: "estrategia",
      xp: 50,
      fen: "1nb3k1/1ppppppp/8/8/8/8/PPPPPPPP/1N4K1 w - - 0 1",
      solution: ["a2a4"],
      prompt:
        "Elegí la jugada que empieza un plan de expansión en el flanco de dama.",
      success:
        "¡Buen plan! Avanzar el peón dos casillas gana espacio de inmediato en ese flanco.",
      fail: "Esa jugada no es la más ambiciosa para empezar el plan. Pensá en avanzar el peón dos casillas.",
      hint: "El peón todavía no se movió: puede avanzar una o dos casillas.",
    },
    14: {
      category: "tactica",
      xp: 40,
      fen: "6k1/pppppppp/8/2n1b3/8/3P4/PPP1PPPP/6K1 w - - 0 1",
      sequence: ["d3d4", "e5f6", "d4c5"],
      midMessage:
        "Salvaron el alfil, que valía más. El caballo quedó indefenso: comelo.",
      prompt:
        "Encontrá el avance de peón que ataca al caballo y al alfil negros a la vez, y quedate con la pieza que no puedan salvar.",
      success:
        "¡Horquilla de peón completa! d4 atacó las dos piezas; al salvar el alfil, ganaste el caballo igual.",
      fail: "Esa jugada no genera la horquilla. Pensá en avanzar el peón una casilla.",
      hint: "Un peón blanco ataca en diagonal hacia adelante. Buscá la casilla que ataque dos piezas a la vez, y después comé la que quedó sin defensa.",
    },
    15: {
      category: "tactica",
      xp: 50,
      fen: "r1b1k3/pp1p1ppp/8/1N6/8/8/PPPP1PPP/2B3K1 w - - 0 1",
      sequence: ["b5c7", "e8e7", "c7a8"],
      midMessage:
        "Cc7+ es jaque: el rey se aparta. Ahora terminá de ganar la torre.",
      prompt:
        "En vez de una jugada tranquila, encontrá la jugada intermedia que da jaque, y después ganá la torre.",
      success:
        "¡Excelente intermedia! Cc7+ ganó tiempo con jaque y después te llevaste la torre en a8.",
      fail: "Esa jugada no es la intermedia más fuerte. Buscá un salto de caballo que dé jaque.",
      hint: "Desde c7, el caballo ataca tanto al rey como a la torre. Después del jaque, comé la torre en a8.",
    },
    16: {
      category: "tactica",
      xp: 55,
      fen: "r5k1/pppppppp/8/8/8/4N3/PBPPPPPP/R5K1 w - - 0 1",
      sequence: ["b2g7", "g8g7", "e3f5"],
      midMessage:
        "El rey recaptura el alfil... y queda mucho más expuesto de lo que parece.",
      prompt:
        "Evaluá si conviene sacrificar el alfil para exponer al rey negro. Jugalo y seguí el ataque.",
      success:
        "¡Sacrificio correcto! Axg7 destruyó el refugio del rey negro, y el caballo llegó con jaque para continuar el ataque.",
      fail: "Esa jugada no es el sacrificio que expone al rey. Fijate en qué diagonal larga está tu alfil.",
      hint: "El alfil en b2 apunta directo a la casilla g7 por la diagonal larga. Después de la recaptura, seguí con el caballo.",
    },
    17: {
      category: "tactica",
      xp: 60,
      fen: "k7/pp2pp2/8/8/8/8/4PPP1/1NQ3K1 w - - 0 1",
      solution: ["c1c8"],
      checkmate: !0,
      prompt:
        "El rey negro está atrapado por sus propios peones. Encontrá el mate en una jugada.",
      success:
        "¡Jaque mate! El rey no puede capturar la dama ni escapar: sus propios peones se lo impiden.",
      fail: "Esa jugada no es mate. Pensá en llevar la dama a la última fila, lejos del alcance del rey.",
      hint: "La dama puede llegar a la última fila por la columna 'c'.",
    },
    18: {
      category: "tactica",
      xp: 65,
      fen: "3rk3/pppp1ppp/8/4N3/8/8/PPPP1PPP/4R1K1 w - - 0 1",
      sequence: ["e5c6", "e8e7", "c6d8"],
      midMessage:
        "El jaque descubierto obliga al rey a moverse. Ahora calculá la segunda jugada y quedate con la torre.",
      prompt:
        "Calculá dos jugadas: encontrá el salto de caballo que descubre jaque, y después ganá la torre negra.",
      success:
        "¡Cálculo perfecto! Cc6+ descubrió el jaque de tu torre y, dos jugadas después, ganaste la torre.",
      fail: "Esa jugada no descubre el jaque. Pensá en apartar el caballo de la columna 'e'.",
      hint: "Tu torre en e1 y el rey negro están en la misma columna: el caballo la está tapando. Después del jaque, comé la torre en d8.",
    },
    19: {
      category: "estrategia",
      xp: 70,
      fen: "2k5/8/8/8/8/8/2P5/2K5 w - - 0 1",
      solution: ["c1b2", "c1d2", "c1b1", "c1d1"],
      prompt:
        "Todavía no conviene avanzar el peón. Mejorá primero la posición de tu rey.",
      success:
        "¡Buena decisión! En los finales de peones, conviene activar el rey antes de avanzar el peón.",
      fail: "Avanzar el peón ahora no es la mejor decisión. Activá primero tu rey.",
      hint: "Mové el rey hacia el centro o hacia el peón, en lugar de avanzar el peón.",
    },
    20: {
      category: "tactica",
      xp: 100,
      fen: "1n4k1/ppp1pppp/8/8/8/8/PPP1PPPP/1N1Q2K1 w - - 0 1",
      solution: ["d1d8"],
      checkmate: !0,
      prompt:
        "Combiná todo lo aprendido y encontrá el jaque mate en una jugada.",
      success:
        "¡Jaque mate! Dd8 controla toda la última fila y los propios peones negros sellan la suerte del rey.",
      fail: "Esa jugada no es mate. Pensá en llevar la dama a la última fila por una columna despejada.",
      hint: "La columna 'd' está completamente libre hasta la última fila.",
    },
    21: {
      category: "tactica",
      level: "facil",
      xp: 25,
      fen: "4k3/8/8/3r4/2B5/8/8/4K3 w - - 0 1",
      solution: ["c4d5"],
      prompt:
        "La torre negra quedó sin defensa. Encontrá la captura directa que gana material.",
      success:
        "¡Correcto! Axd5 gana una torre limpia. Antes de calcular variantes largas, revisá siempre las piezas indefensas.",
      fail: "Hay una pieza negra de mucho valor que puede capturarse inmediatamente.",
      hint: "Seguí la diagonal del alfil desde c4 hasta la torre en d5.",
    },
    22: {
      category: "tactica",
      level: "facil",
      xp: 30,
      fen: "6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1",
      solution: ["d1d8"],
      checkmate: !0,
      prompt:
        "El rey negro está encerrado por sus peones. Encontrá el mate de última fila.",
      success:
        "¡Jaque mate! Td8 controla toda la octava fila y los peones negros bloquean las casillas de escape.",
      fail: "Buscá un jaque de torre que controle toda la última fila.",
      hint: "La columna d está libre: llevá la torre hasta d8.",
    },
    23: {
      category: "estrategia",
      level: "facil",
      xp: 30,
      fen: "8/4k3/8/3K4/4P3/8/8/8 w - - 0 1",
      sequence: ["e4e5", "e7d7", "e5e6"],
      midMessage:
        "El rey negro se aparta. Ahora ganá espacio y acercá el peón a la promoción.",
      prompt:
        "Final básico: aprovechá la oposición de los reyes y avanzá el peón en el momento correcto.",
      success:
        "¡Bien jugado! Con los reyes enfrentados, avanzar el peón conserva el progreso y obliga al rey rival a ceder terreno.",
      fail: "No abandones la estructura: el avance del peón es la jugada que aprovecha la oposición.",
      hint: "Primero avanzá el peón de e4 a e5 y continuá empujándolo cuando el rey rival se aparte.",
    },
    24: {
      category: "tactica",
      level: "medio",
      xp: 45,
      fen: "8/4k1q1/8/8/3N4/8/8/7K w - - 0 1",
      sequence: ["d4f5", "e7f8", "f5g7"],
      midMessage:
        "Cf5+ obliga al rey a moverse. La segunda punta de la horquilla sigue atacada.",
      prompt:
        "Encontrá la horquilla de caballo que da jaque y, después, capturá la dama.",
      success:
        "¡Horquilla completa! El jaque ganó un tiempo y permitió capturar la dama en la jugada siguiente.",
      fail: "Buscá un salto de caballo que ataque simultáneamente al rey y a la dama.",
      hint: "Desde f5, el caballo ataca e7 y g7 al mismo tiempo.",
    },
    25: {
      category: "estrategia",
      level: "medio",
      xp: 45,
      fen: "8/3k4/8/2PK4/8/8/8/8 w - - 0 1",
      sequence: ["c5c6", "d7c7", "d5c5"],
      midMessage:
        "El jaque de peón desplazó al rey. Ahora colocá tu rey delante del peón.",
      prompt:
        "Usá un jaque de peón para ganar un tiempo y mejorar la posición de tu rey.",
      success:
        "¡Técnica correcta! El peón ganó un tiempo con jaque y el rey quedó preparado para escoltarlo.",
      fail: "Necesitás obligar primero al rey negro a cambiar de casilla.",
      hint: "El peón en c5 puede avanzar dando jaque al rey de d7.",
    },
    26: {
      category: "estrategia",
      level: "medio",
      xp: 45,
      fen: "8/6k1/4P3/8/8/8/8/R5K1 w - - 0 1",
      solution: ["a1e1"],
      prompt:
        "Tu peón pasado necesita apoyo. Colocá la torre detrás del peón para acompañar su avance.",
      success:
        "¡Correcto! Te1 aplica una regla fundamental: la torre trabaja mejor detrás del peón pasado.",
      fail: "La torre debe quedar alineada detrás del peón, no a un costado.",
      hint: "El peón está en la columna e. Llevá la torre a esa misma columna.",
    },
    27: {
      category: "tactica",
      level: "dificil",
      xp: 60,
      fen: "4k3/4q3/8/8/1B6/8/8/4R1K1 w - - 0 1",
      solution: ["e1e7"],
      prompt:
        "La dama negra está delante de su rey. Aprovechá la alineación y la protección de tu alfil.",
      success:
        "¡Excelente! Txe7+ gana la dama con jaque, y el rey no puede capturar la torre porque el alfil protege e7.",
      fail: "Buscá una captura de torre sobre la columna e que llegue con jaque.",
      hint: "La torre puede capturar en e7; el alfil de b4 protege esa casilla.",
    },
    28: {
      category: "estrategia",
      level: "dificil",
      xp: 65,
      fen: "8/8/1PK1k3/8/8/8/8/8 w - - 0 1",
      sequence: ["b6b7", "e6e7", "b7b8"],
      midMessage:
        "El rey negro se acerca, pero llega tarde. Completá la carrera.",
      prompt:
        "Calculá la carrera de peones y llevá el peón hasta la coronación.",
      success:
        "¡Cálculo correcto! El peón coronó antes de que el rey negro pudiera detenerlo.",
      fail: "No pierdas tiempos con el rey: el peón ya tiene vía libre hacia la última fila.",
      hint: "Avanzá el peón de b6 a b7 y prepará la coronación en b8.",
    },
    29: {
      category: "tactica",
      level: "dificil",
      xp: 70,
      fen: "3r2k1/5ppp/8/3n4/8/1B6/8/4R1K1 w - - 0 1",
      sequence: ["b3d5", "d8d5", "e1e8"],
      checkmate: !0,
      midMessage:
        "La torre recapturó y abandonó la última fila. Terminá la combinación.",
      prompt:
        "La torre negra está sobrecargada: defiende al caballo y evita el mate. Explotá las dos tareas.",
      success:
        "¡Sobrecarga resuelta! Axd5 desvió la torre y Te8 terminó la partida con mate.",
      fail: "Buscá capturar el caballo para obligar a la torre a abandonar la última fila.",
      hint: "El alfil de b3 puede capturar en d5. Si la torre recaptura, la octava fila queda libre.",
    },
    30: {
      category: "estrategia",
      level: "experto",
      xp: 75,
      fen: "8/8/7k/7p/4K3/8/8/R7 w - - 0 1",
      solution: ["a1a6"],
      prompt:
        "En este final de torre, cortá al rey rival para que no pueda acompañar su peón.",
      success:
        "¡Muy bien! Ta6+ obliga al rey a retroceder y lo separa del peón: la actividad de la torre decide el final.",
      fail: "Necesitás un jaque lateral que, además, corte el avance del rey.",
      hint: "La sexta fila permite dar jaque desde lejos y limitar al rey negro.",
    },
    31: {
      category: "tactica",
      level: "experto",
      xp: 80,
      fen: "7k/6pp/5Q2/8/3B4/8/8/6K1 w - - 0 1",
      solution: ["f6g7"],
      checkmate: !0,
      prompt:
        "Coordiná dama y alfil para dar mate junto al rey negro.",
      success:
        "¡Jaque mate! Dxg7 está protegida por el alfil y controla todas las casillas de escape.",
      fail: "Buscá una captura con la dama que quede protegida por el alfil de d4.",
      hint: "La diagonal del alfil termina en g7. La dama puede capturar allí con jaque.",
    },
    32: {
      category: "estrategia",
      level: "maestro",
      xp: 100,
      fen: "8/5KPk/8/8/8/8/8/8 w - - 0 1",
      solution: ["g7g8"],
      prompt:
        "Coroná sin perder la nueva pieza: comprobá primero que el rey protege la casilla de promoción.",
      success:
        "¡Final resuelto! El peón corona con jaque y el rey blanco protege g8, por lo que la nueva pieza no puede ser capturada.",
      fail: "La promoción es inmediata y la casilla g8 está protegida por tu rey.",
      hint: "Avanzá el peón de g7 a g8 y elegí la pieza con la que querés coronar.",
    },
  },
  LESSON_CATEGORY_LABEL = {
    fundamentos: "Fundamentos",
    estrategia: "Estrategia",
    tactica: "Táctica",
  },
  EXERCISE_CATEGORY_LABEL = {
    principiante: "Principiante",
    estrategia: "Estrategia",
    tactica: "Táctica",
  };
const learningView = {
    category: "all",
    status: "all",
    search: "",
  },
  exerciseView = {
    category: "all",
    status: "all",
    level: "all",
    search: "",
  };
function normalizeStudyText(e) {
  return String(e || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
function setActiveStudyButton(e, t) {
  document.querySelectorAll(e).forEach((e) => {
    e.classList.toggle("active", e === t);
  });
}
function getCardTitle(e) {
  const t = e && e.querySelector("h3");
  return t ? t.textContent.trim() : "";
}
function getExerciseCardLevel(e) {
  if (e.dataset.level) return e.dataset.level;
  const t = normalizeStudyText(e.textContent);
  if (t.includes("maestro")) return "maestro";
  if (t.includes("experto") || t.includes("desafio")) return "experto";
  if (t.includes("dificil")) return "dificil";
  if (t.includes("medio")) return "medio";
  return "facil";
}
function getRecommendedLessonId() {
  const e = state.lessonsCompleted || [],
    t = Object.keys(LESSONS);
  return t.find((t) => !e.includes(String(t))) || t[0] || null;
}
function getRecommendedExerciseId(e = null) {
  const t = (state.exerciseStats && state.exerciseStats.solved) || [],
    a = Object.keys(EXERCISES),
    n = null == e ? -1 : a.indexOf(String(e));
  for (let e = 1; e <= a.length; e++) {
    const o = a[(Math.max(-1, n) + e) % a.length];
    if (!t.includes(String(o))) return o;
  }
  return a[(Math.max(-1, n) + 1) % a.length] || null;
}
function updateLearningRecommendation() {
  const e = getRecommendedLessonId(),
    t = e && document.querySelector(`[data-lesson-card][data-lesson-id="${e}"]`),
    a = document.getElementById("learning-recommendation-title"),
    n = document.getElementById("learning-recommendation-text"),
    o = document.getElementById("learning-recommendation-action"),
    r = (state.lessonsCompleted || []).length === Object.keys(LESSONS).length;
  if (!e || !t) return;
  (a && (a.textContent = r ? "Curso completado: repasá una lección" : getCardTitle(t)),
    n &&
      (n.textContent = r
        ? "Mantené frescos los conceptos volviendo a la primera lección."
        : `Siguiente paso recomendado: ${LESSON_CATEGORY_LABEL[LESSONS[e].category]}.`),
    o &&
      ((o.textContent = r ? "Repasar" : "Continuar"),
      (o.onclick = () => openLessonModal(e))));
}
function updateExerciseRecommendation() {
  const e = getRecommendedExerciseId(currentExerciseId),
    t = e &&
      document.querySelector(`[data-exercise-card][data-exercise-id="${e}"]`),
    a = document.getElementById("exercise-recommendation-title"),
    n = document.getElementById("exercise-recommendation-text"),
    o = document.getElementById("exercise-recommendation-action"),
    r =
      ((state.exerciseStats && state.exerciseStats.solved) || []).length ===
      Object.keys(EXERCISES).length;
  if (!e || !t) return;
  (a && (a.textContent = r ? "Repaso recomendado" : getCardTitle(t)),
    n &&
      (n.textContent = r
        ? "Ya resolviste todos los desafíos. Seguimos con práctica de repaso."
        : `Próximo desafío pendiente: ${EXERCISE_CATEGORY_LABEL[EXERCISES[e].category]}.`),
    o &&
      ((o.textContent = r ? "Repasar" : "Entrenar ahora"),
      (o.onclick = () => openExerciseModal(e))));
}
function applyLearningFilters() {
  const e = state.lessonsCompleted || [],
    t = normalizeStudyText(learningView.search);
  let a = 0;
  document.querySelectorAll("[data-lesson-card]").forEach((n) => {
    const o = e.includes(String(n.dataset.lessonId)),
      r =
        "all" === learningView.category ||
        n.dataset.category === learningView.category,
      s =
        "all" === learningView.status ||
        ("completed" === learningView.status ? o : !o),
      l = !t || normalizeStudyText(n.textContent).includes(t),
      i = r && s && l;
    ((n.style.display = i ? "" : "none"), i && a++);
  });
  const n = document.getElementById("learning-empty"),
    o = document.getElementById("learning-results-count");
  (n && (n.style.display = a ? "none" : ""),
    o && (o.textContent = `${a} ${1 === a ? "lección" : "lecciones"}`));
}
function applyExerciseFilters() {
  const e = (state.exerciseStats && state.exerciseStats.solved) || [],
    t = normalizeStudyText(exerciseView.search);
  let a = 0;
  document.querySelectorAll("[data-exercise-card]").forEach((n) => {
    const o = e.includes(String(n.dataset.exerciseId)),
      r =
        "all" === exerciseView.category ||
        n.dataset.category === exerciseView.category,
      s =
        "all" === exerciseView.status ||
        ("completed" === exerciseView.status ? o : !o),
      l =
        "all" === exerciseView.level ||
        getExerciseCardLevel(n) === exerciseView.level,
      i = !t || normalizeStudyText(n.textContent).includes(t),
      c = r && s && l && i;
    ((n.style.display = c ? "" : "none"), c && a++);
  });
  const n = document.getElementById("exercise-empty"),
    o = document.getElementById("exercise-results-count");
  (n && (n.style.display = a ? "none" : ""),
    o && (o.textContent = `${a} ${1 === a ? "ejercicio" : "ejercicios"}`));
}
function wireLearningControls() {
  document.querySelectorAll("[data-learning-filter]").forEach((e) => {
    e.addEventListener("click", () => {
      ((learningView.category = e.dataset.learningFilter),
        setActiveStudyButton("[data-learning-filter]", e),
        applyLearningFilters());
    });
  });
  document.querySelectorAll("[data-learning-status]").forEach((e) => {
    e.addEventListener("click", () => {
      ((learningView.status = e.dataset.learningStatus),
        setActiveStudyButton("[data-learning-status]", e),
        applyLearningFilters());
    });
  });
  const e = document.getElementById("learning-search");
  e &&
    e.addEventListener("input", () => {
      ((learningView.search = e.value), applyLearningFilters());
    });
}
function wireExerciseControls() {
  document.querySelectorAll("[data-exercise-filter]").forEach((e) => {
    e.addEventListener("click", () => {
      ((exerciseView.category = e.dataset.exerciseFilter),
        setActiveStudyButton("[data-exercise-filter]", e),
        applyExerciseFilters());
    });
  });
  document.querySelectorAll("[data-exercise-status]").forEach((e) => {
    e.addEventListener("click", () => {
      ((exerciseView.status = e.dataset.exerciseStatus),
        setActiveStudyButton("[data-exercise-status]", e),
        applyExerciseFilters());
    });
  });
  const e = document.getElementById("exercise-search");
  e &&
    e.addEventListener("input", () => {
      ((exerciseView.search = e.value), applyExerciseFilters());
    });
  const t = document.getElementById("exercise-level");
  t &&
    t.addEventListener("change", () => {
      ((exerciseView.level = t.value), applyExerciseFilters());
    });
}
function updateLearningProgress() {
  const e = state.lessonsCompleted || [],
    t = Object.keys(LESSONS).length,
    a = Math.round((e.length / t) * 100),
    n = document.getElementById("learning-progress-text"),
    o = document.getElementById("learning-progress-bar"),
    r = document.getElementById("learning-progress-detail"),
    s = document.getElementById("learning-completed-stat"),
    l = document.getElementById("learning-pending-stat"),
    i = document.getElementById("learning-xp-stat"),
    c = e.reduce((e, t) => e + ((LESSONS[t] && LESSONS[t].xp) || 0), 0);
  (n && (n.textContent = a + "%"),
    o && (o.style.width = a + "%"),
    r && (r.textContent = `${e.length} de ${t} lecciones completadas`),
    s && (s.textContent = e.length),
    l && (l.textContent = Math.max(0, t - e.length)),
    i && (i.textContent = c + " XP"),
    document.querySelectorAll("[data-lesson-card]").forEach((t) => {
      const a = t.dataset.lessonId,
        n = e.includes(a),
        o = t.querySelector(".lesson-btn"),
        r = t.querySelector(".lesson-meta");
      let s = r && r.querySelector(".activity-state-badge");
      (t.classList.toggle("completed", n),
        o && (o.textContent = n ? "✓ Repasar" : "Comenzar"),
        r &&
          !s &&
          ((s = document.createElement("span")),
          (s.className = "badge activity-state-badge"),
          r.appendChild(s)),
        s &&
          ((s.textContent = n ? "Completada" : "Pendiente"),
          s.classList.toggle("is-complete", n)));
    }),
    updateLearningRecommendation(),
    applyLearningFilters());
}
function updateExerciseDashboard() {
  const e = state.exerciseStats || {
      solved: [],
      firstTry: 0,
      attempts: 0,
      streak: 0,
      bestStreak: 0,
    },
    t = document.getElementById("exercise-total-stat"),
    a = document.getElementById("exercise-correct-stat"),
    n = document.getElementById("exercise-streak-stat"),
    o = document.getElementById("exercise-best-stat");
  if (
    (t &&
      (t.textContent =
        (e.solved || []).length + "/" + Object.keys(EXERCISES).length),
    a)
  ) {
    const t = e.attempts ? Math.round((e.firstTry / e.attempts) * 100) : 0;
    a.textContent = t + "%";
  }
  (n && (n.textContent = (e.streak || 0) + " 🔥"),
    o && (o.textContent = e.bestStreak || 0),
    document.querySelectorAll("[data-exercise-card]").forEach((t) => {
      const a = t.dataset.exerciseId,
        n = (e.solved || []).includes(a),
        o = t.querySelector(".exercise-start"),
        r = t.querySelector(".exercise-meta");
      let s = r && r.querySelector(".activity-state-badge");
      (t.classList.toggle("completed", n),
        o && (o.textContent = n ? "Repasar" : "Resolver"),
        r &&
          !s &&
          ((s = document.createElement("span")),
          (s.className = "badge activity-state-badge"),
          r.appendChild(s)),
        s &&
          ((s.textContent = n ? "Resuelto" : "Pendiente"),
          s.classList.toggle("is-complete", n)));
    }),
    updateExerciseRecommendation(),
    applyExerciseFilters());
}
function ensureLearningState() {
  (Array.isArray(state.lessonsCompleted) ||
    (state.lessonsCompleted = []),
    state.exerciseStats && "object" == typeof state.exerciseStats ||
      (state.exerciseStats = {}),
    Array.isArray(state.exerciseStats.solved) ||
      (state.exerciseStats.solved = []),
    Number.isFinite(state.exerciseStats.firstTry) ||
      (state.exerciseStats.firstTry = 0),
    Number.isFinite(state.exerciseStats.attempts) ||
      (state.exerciseStats.attempts = 0),
    Number.isFinite(state.exerciseStats.streak) ||
      (state.exerciseStats.streak = 0),
    Number.isFinite(state.exerciseStats.bestStreak) ||
      (state.exerciseStats.bestStreak = 0),
    state.exerciseStats.timedBest &&
      "object" == typeof state.exerciseStats.timedBest ||
      (state.exerciseStats.timedBest = {}),
    [30, 45, 60, 90].includes(state.exerciseStats.timerSeconds) ||
      (state.exerciseStats.timerSeconds = 45));
}
function renderBoardGrid(e, t, a = {}) {
  e.innerHTML = "";
  for (let n = 0; n < 8; n++)
    for (let o = 0; o < 8; o++) {
      const r = FILES[o] + (8 - n),
        s = document.createElement("div");
      ((s.className = "square " + ((n + o) % 2 ? "dark" : "light")),
        (s.dataset.square = r),
        a.selected === r && s.classList.add("selected"),
        a.highlight &&
          a.highlight.includes(r) &&
          s.classList.add("diagram-highlight"));
      const l = t[n][o];
      if (l) {
        const e = document.createElement("div");
        ((e.className =
          "piece " + ("w" === l.color ? "piece-white" : "piece-black")),
          (e.textContent = PIECES[l.color + l.type.toUpperCase()]),
          s.appendChild(e));
      }
      (a.onClick && s.addEventListener("click", () => a.onClick(r)),
        e.appendChild(s));
    }
}
function fenBoardToMatrix(e) {
  const t = e.split(" ")[0].split("/"),
    a = [];
  for (let e = 0; e < 8; e++) {
    const n = [];
    for (const a of t[e])
      if (/\d/.test(a)) for (let e = 0; e < parseInt(a, 10); e++) n.push(null);
      else
        n.push({
          color: a === a.toUpperCase() ? "w" : "b",
          type: a.toLowerCase(),
        });
    a.push(n);
  }
  return a;
}
function createPuzzleBoard(e) {
  const t = { chess: null, selected: null, solvedOrFailed: !1, onResult: null };
  function a() {
    renderBoardGrid(e, t.chess.board(), { selected: t.selected, onClick: n });
  }
  async function n(e) {
    if (t.solvedOrFailed) return;
    const n = t.chess.get(e);
    if (t.selected === e) return ((t.selected = null), void a());
    if (t.selected) {
      const n = t.selected;
      let o = "q";
      if (isPromotionMove(t.chess, n, e)) {
        const e = t.chess.turn();
        ((t.selected = null), a(), (o = await askPromotion(e)));
      }
      const r = { from: n, to: e, promotion: o },
        s = n + e;
      return (
        (t.selected = null),
        void (function (e, a) {
          t.onAttempt && t.onAttempt(e, a);
        })(s, r)
      );
    }
    n && n.color === t.chess.turn() && ((t.selected = e), a());
  }
  return (
    (t.load = function (e) {
      ((t.chess = new Chess(e)),
        (t.selected = null),
        (t.solvedOrFailed = !1),
        a());
    }),
    (t.draw = a),
    (t.flash = function (t, a) {
      const n = e.querySelector(`[data-square="${t}"]`);
      n && (n.classList.add(a), setTimeout(() => n.classList.remove(a), 500));
    }),
    t
  );
}
(ensureLearningState(), wireLearningControls(), wireExerciseControls());
const lessonBoardCtx = createPuzzleBoard(
    document.getElementById("lesson-puzzle-board"),
  ),
  exerciseBoardCtx = createPuzzleBoard(
    document.getElementById("exercise-puzzle-board"),
  );
function makeSequenceRunner(e, t, a) {
  const n = {
    stepIndex: 0,
    resolved: !1,
    failedOnce: !1,
    puzzle: null,
    start: function (o) {
      ((n.puzzle = o),
        (n.stepIndex = 0),
        (n.resolved = !1),
        (n.failedOnce = !1),
        e.load(o.fen),
        (e.solvedOrFailed = !1),
        (t.textContent = ""),
        (t.className = "puzzle-feedback"),
        a && (a.style.display = "none"));
    },
    isLastPlayerStep: function () {
      const e = n.puzzle.sequence;
      return !e || n.stepIndex === e.length - 1;
    },
    attempt: function (o, r, s) {
      const { onSolved: l, onWrong: i } = s || {};
      if (n.resolved || e.solvedOrFailed) return;
      const c = new Chess(e.chess.fen());
      if (!c.move(r)) return void e.draw();
      const d = n.puzzle,
        u = n.isLastPlayerStep();
      let m;
      if (d.sequence) {
        const e = d.sequence[n.stepIndex];
        m = u && d.checkmate ? c.in_checkmate() : o === e;
      } else m = d.checkmate ? c.in_checkmate() : d.solution.includes(o);
      if (!m) {
        (e.draw(),
          e.flash(r.to, "wrong-flash"),
          (t.textContent = "❌ " + d.fail),
          (t.className = "puzzle-feedback wrong"),
          a && (a.style.display = ""));
        const o = !n.failedOnce;
        return ((n.failedOnce = !0), void (i && i(o)));
      }
      if (((e.chess = c), e.draw(), e.flash(r.to, "solved-flash"), u))
        return (
          (n.resolved = !0),
          (e.solvedOrFailed = !0),
          (t.textContent = "✅ " + d.success),
          (t.className = "puzzle-feedback correct"),
          void (l && l())
        );
      ((t.textContent =
        "✅ " +
        (d.midMessage || "¡Bien! El rival responde. Seguí calculando.")),
        (t.className = "puzzle-feedback correct"),
        (e.solvedOrFailed = !0));
      const p = d.sequence[n.stepIndex + 1],
        g = p.slice(0, 2),
        f = p.slice(2, 4);
      setTimeout(() => {
        const t = new Chess(e.chess.fen());
        (t.move({ from: g, to: f, promotion: "q" }),
          (e.chess = t),
          e.draw(),
          e.flash(f, "opponent-flash"),
          (e.solvedOrFailed = !1),
          (n.stepIndex += 2));
      }, 700);
    },
  };
  return n;
}
let currentLessonId = null,
  lessonPuzzleSolved = !1;
const lessonRunner = makeSequenceRunner(
  lessonBoardCtx,
  document.getElementById("lesson-puzzle-feedback"),
  document.getElementById("lesson-puzzle-retry"),
);
function checklistAllChecked() {
  const e = document.querySelectorAll("#lesson-modal .lesson-check");
  return Array.from(e).every((e) => e.checked);
}
function refreshLessonCompleteButton() {
  const e = document.getElementById("lesson-complete");
  if (e)
    return (state.lessonsCompleted || []).includes(String(currentLessonId))
      ? ((e.disabled = !0), void (e.textContent = "✓ Lección completada"))
      : ((e.textContent = "✓ Marcar como completada"),
        void (e.disabled = !(lessonPuzzleSolved && checklistAllChecked())));
}
function renderMiniDiagrams(e) {
  e.querySelectorAll(".mini-diagram[data-fen]").forEach((e) => {
    const t = (e.dataset.highlight || "").split(",").filter(Boolean),
      a = document.createElement("div");
    ((a.className = "board mini-diagram-board"),
      renderBoardGrid(a, fenBoardToMatrix(e.dataset.fen), { highlight: t }),
      (e.innerHTML = ""),
      e.appendChild(a));
  });
}
function openLessonModal(e) {
  const t = LESSONS[e];
  if (!t) return;
  ((currentLessonId = e),
    (lessonPuzzleSolved = (state.lessonsCompleted || []).includes(String(e))));
  const a = document.querySelector(`[data-lesson-card][data-lesson-id="${e}"]`),
    n = a ? a.querySelector("h3").textContent : "Lección";
  ((document.getElementById("lesson-modal-category").textContent =
    "📚 " + (LESSON_CATEGORY_LABEL[t.category] || "Lección")),
    (document.getElementById("lesson-title").textContent = n));
  const lessonIds = Object.keys(LESSONS),
    lessonIndex = lessonIds.indexOf(String(e)),
    lessonPosition = document.getElementById("lesson-modal-position"),
    previousButton = document.getElementById("lesson-previous"),
    nextButton = document.getElementById("lesson-next");
  (lessonPosition &&
      (lessonPosition.textContent = `Lección ${lessonIndex + 1} de ${lessonIds.length}`),
    previousButton && (previousButton.disabled = lessonIndex <= 0),
    nextButton && (nextButton.disabled = lessonIndex >= lessonIds.length - 1));
  const o = document.getElementById("lesson-content");
  ((o.innerHTML = t.content),
    renderMiniDiagrams(o),
    document.querySelectorAll("#lesson-modal .lesson-check").forEach((e) => {
      ((e.checked = lessonPuzzleSolved),
        (e.onchange = refreshLessonCompleteButton));
    }),
    (document.getElementById("lesson-puzzle-prompt").textContent =
      t.puzzle.prompt),
    lessonRunner.start(t.puzzle));
  const r = document.getElementById("lesson-puzzle-feedback");
  (lessonPuzzleSolved &&
    ((lessonBoardCtx.solvedOrFailed = !0),
    (r.textContent = "✓ Ya resolviste esta posición."),
    r.classList.add("correct")),
    (lessonBoardCtx.onAttempt = function (e, t) {
      lessonPuzzleSolved ||
        (lessonRunner.attempt(e, t, {
          onSolved: () => {
            ((lessonPuzzleSolved = !0), refreshLessonCompleteButton());
          },
        }),
        refreshLessonCompleteButton());
    }),
    refreshLessonCompleteButton(),
    (document.getElementById("lesson-modal").style.display = "flex"));
}
function closeLessonModal() {
  ((document.getElementById("lesson-modal").style.display = "none"),
    (currentLessonId = null));
}
(document.querySelectorAll(".lesson-btn").forEach((e) => {
  e.addEventListener("click", () => openLessonModal(e.dataset.lesson));
}),
  document
    .getElementById("lesson-close")
    .addEventListener("click", closeLessonModal),
  document
    .getElementById("lesson-previous")
    .addEventListener("click", () => {
      const e = Object.keys(LESSONS),
        t = e.indexOf(String(currentLessonId));
      t > 0 && openLessonModal(e[t - 1]);
    }),
  document.getElementById("lesson-next").addEventListener("click", () => {
    const e = Object.keys(LESSONS),
      t = e.indexOf(String(currentLessonId));
    t >= 0 && t < e.length - 1 && openLessonModal(e[t + 1]);
  }),
  document.getElementById("lesson-modal").addEventListener("click", (e) => {
    "lesson-modal" === e.target.id && closeLessonModal();
  }),
  document
    .getElementById("lesson-puzzle-hint")
    .addEventListener("click", () => {
      const e = LESSONS[currentLessonId];
      e && toast("💡 " + e.puzzle.hint);
    }),
  document
    .getElementById("lesson-puzzle-retry")
    .addEventListener("click", () => {
      const e = LESSONS[currentLessonId];
      e && lessonRunner.start(e.puzzle);
    }),
  document.getElementById("lesson-complete").addEventListener("click", () => {
    if (!currentLessonId) return;
    const e = LESSONS[currentLessonId],
      t = String(currentLessonId);
    (state.lessonsCompleted || []).includes(t) ||
      (state.lessonsCompleted.push(t),
      save(),
      addXP(e.xp, "Lección completada", "Completada"),
      updateLearningProgress(),
      refreshLessonCompleteButton());
  }));
let currentExerciseId = null,
  exerciseAttemptCounted = !1;
const exerciseRunner = makeSequenceRunner(
  exerciseBoardCtx,
  document.getElementById("puzzle-feedback"),
  document.getElementById("exercise-puzzle-retry"),
);
const exerciseTimedMode = {
  enabled: !1,
  applies: !1,
  duration: 45,
  remaining: 0,
  intervalId: null,
};
function getNextTacticalExerciseId(e = null) {
  const t = Object.keys(EXERCISES).filter(
      (e) => "tactica" === EXERCISES[e].category,
    ),
    a = (state.exerciseStats && state.exerciseStats.solved) || [],
    n = null == e ? -1 : t.indexOf(String(e));
  for (let e = 1; e <= t.length; e++) {
    const o = t[(Math.max(-1, n) + e) % t.length];
    if (!a.includes(String(o))) return o;
  }
  return t[(Math.max(-1, n) + 1) % t.length] || null;
}
function formatExerciseTime(e) {
  const t = Math.max(0, Math.ceil(e));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
function updateTimedModeControls() {
  const e = document.getElementById("exercise-timed-panel"),
    t = document.getElementById("exercise-timed-status"),
    a = document.getElementById("exercise-timer-start"),
    n = document.getElementById("exercise-timer-stop"),
    o = document.getElementById("exercise-timer-seconds");
  (e && e.classList.toggle("active", exerciseTimedMode.enabled),
    t &&
      (t.textContent = exerciseTimedMode.enabled
        ? `Activo · ${exerciseTimedMode.duration} segundos por táctica`
        : "Inactivo"),
    a && (a.style.display = exerciseTimedMode.enabled ? "none" : ""),
    n && (n.style.display = exerciseTimedMode.enabled ? "" : "none"),
    o && (o.disabled = exerciseTimedMode.enabled));
}
function stopExerciseCountdown(e = !1) {
  (exerciseTimedMode.intervalId &&
    clearInterval(exerciseTimedMode.intervalId),
    (exerciseTimedMode.intervalId = null),
    (exerciseTimedMode.applies = !1));
  const t = document.getElementById("exercise-timer");
  e && t && (t.style.display = "none");
}
function renderExerciseCountdown() {
  const e = document.getElementById("exercise-timer"),
    t = document.getElementById("exercise-timer-text"),
    a = document.getElementById("exercise-timer-bar"),
    n = exerciseTimedMode.duration
      ? (exerciseTimedMode.remaining / exerciseTimedMode.duration) * 100
      : 0;
  (t && (t.textContent = formatExerciseTime(exerciseTimedMode.remaining)),
    a && (a.style.width = Math.max(0, n) + "%"),
    e &&
      (e.classList.toggle("warning", n <= 40 && n > 18),
      e.classList.toggle("danger", n <= 18)));
}
function countExerciseFailure(e) {
  ensureLearningState();
  const t = state.exerciseStats,
    a = String(e);
  (t.solved || []).includes(a) ||
    exerciseAttemptCounted ||
    ((t.attempts = (t.attempts || 0) + 1),
    (exerciseAttemptCounted = !0),
    (t.streak = 0),
    save(),
    (document.getElementById("exercise-modal-streak").textContent =
      "🔥 Racha: 0"),
    updateExerciseDashboard());
}
function expireTimedExercise() {
  if (!exerciseTimedMode.applies || !currentExerciseId) return;
  (stopExerciseCountdown(),
    (exerciseTimedMode.remaining = 0),
    renderExerciseCountdown(),
    (exerciseBoardCtx.solvedOrFailed = !0),
    (exerciseRunner.resolved = !0));
  const e = document.getElementById("puzzle-feedback"),
    t = document.getElementById("exercise-result-text");
  (e &&
    ((e.textContent = "⏱ Tiempo agotado. Revisá la posición y volvé a intentarlo."),
    (e.className = "puzzle-feedback wrong")),
    (document.getElementById("exercise-puzzle-retry").style.display = ""),
    (document.getElementById("exercise-result-score").textContent = "0/1"),
    t &&
      (t.textContent =
        "El tiempo terminó. Podés reintentar o pasar a la siguiente táctica."),
    (document.getElementById("exercise-result").style.display = ""),
    (document.getElementById("exercise-next").style.display = ""),
    countExerciseFailure(currentExerciseId));
}
function startExerciseCountdown(e) {
  stopExerciseCountdown(!0);
  const t = EXERCISES[e],
    a = document.getElementById("exercise-timer"),
    n = document.getElementById("exercise-timer-best");
  if (!exerciseTimedMode.enabled || !t || "tactica" !== t.category) return;
  (ensureLearningState(),
    (exerciseTimedMode.applies = !0),
    (exerciseTimedMode.remaining = exerciseTimedMode.duration),
    a && (a.style.display = ""));
  const o = state.exerciseStats.timedBest[String(e)];
  (n &&
    (n.textContent = o
      ? `Mejor marca: ${o} s`
      : "Sin marca anterior"),
    renderExerciseCountdown(),
    (exerciseTimedMode.intervalId = setInterval(() => {
      (exerciseTimedMode.remaining--,
        renderExerciseCountdown(),
        exerciseTimedMode.remaining <= 0 && expireTimedExercise());
    }, 1e3)));
}
function finishExerciseCountdown(e) {
  if (!exerciseTimedMode.applies) return null;
  const t = Math.max(
      1,
      exerciseTimedMode.duration - exerciseTimedMode.remaining,
    ),
    a = state.exerciseStats.timedBest[String(e)],
    n = !a || t < a;
  return (
    exerciseTimedMode.intervalId &&
      clearInterval(exerciseTimedMode.intervalId),
    (exerciseTimedMode.intervalId = null),
    (exerciseTimedMode.applies = !1),
    n && (state.exerciseStats.timedBest[String(e)] = t),
    save(),
    { seconds: t, isBest: n, previousBest: a || null }
  );
}
function enableTimedTraining() {
  ensureLearningState();
  const e = document.getElementById("exercise-timer-seconds"),
    t = Number(e && e.value);
  ((exerciseTimedMode.duration = [30, 45, 60, 90].includes(t) ? t : 45),
    (exerciseTimedMode.enabled = !0),
    (state.exerciseStats.timerSeconds = exerciseTimedMode.duration),
    save(),
    updateTimedModeControls());
  const a = document.querySelector('[data-exercise-filter="tactica"]');
  (a && a.click(), openExerciseModal(getNextTacticalExerciseId()));
}
function disableTimedTraining() {
  (stopExerciseCountdown(!0),
    (exerciseTimedMode.enabled = !1),
    updateTimedModeControls());
}
function openExerciseModal(e) {
  const t = EXERCISES[e];
  if (!t) return;
  ((currentExerciseId = e), (exerciseAttemptCounted = !1));
  const a = document.querySelector(
      `[data-exercise-card][data-exercise-id="${e}"]`,
    ),
    n = a ? a.querySelector("h3").textContent : "Ejercicio";
  ((document.getElementById("exercise-modal-category").textContent =
    "⚡ " + (EXERCISE_CATEGORY_LABEL[t.category] || "Ejercicio")),
    (document.getElementById("exercise-modal-title").textContent = n),
    (document.getElementById("exercise-modal-position").textContent =
      `Ejercicio ${Object.keys(EXERCISES).indexOf(String(e)) + 1} de ${Object.keys(EXERCISES).length}`),
    (document.getElementById("exercise-modal-streak").textContent =
      "🔥 Racha: " +
      ((state.exerciseStats && state.exerciseStats.streak) || 0)),
    (document.getElementById("exercise-question").textContent = t.prompt),
    (document.getElementById("exercise-result").style.display = "none"),
    (document.getElementById("exercise-next").style.display = "none"),
    exerciseRunner.start(t),
    startExerciseCountdown(e),
    (exerciseBoardCtx.onAttempt = function (a, n) {
      exerciseRunner.attempt(a, n, {
        onSolved: () => {
          ensureLearningState();
          const a = state.exerciseStats,
            n = String(e),
            o = (a.solved || []).includes(n),
            r = finishExerciseCountdown(e);
          (o ||
            (exerciseAttemptCounted ||
              ((a.attempts = (a.attempts || 0) + 1),
              (exerciseAttemptCounted = !0)),
            exerciseRunner.failedOnce
              ? (a.streak = 0)
              : ((a.firstTry = (a.firstTry || 0) + 1),
                (a.streak = (a.streak || 0) + 1),
                (a.bestStreak = Math.max(a.bestStreak || 0, a.streak))),
            (a.solved = a.solved || []),
            a.solved.push(n),
            save(),
            addXP(t.xp, "Ejercicio resuelto", "Correcto")),
            (document.getElementById("exercise-modal-streak").textContent =
              "🔥 Racha: " + a.streak),
            (document.getElementById("exercise-result-score").textContent =
              "1/1"),
            (document.getElementById("exercise-result-text").textContent = o
              ? "Ya habías resuelto este ejercicio antes. ¡Repaso completado!"
              : `¡Resuelto! Ganaste ${t.xp} XP.`),
            r &&
              (document.getElementById("exercise-result-text").textContent +=
                ` Tiempo: ${r.seconds} s${r.isBest ? " · nueva mejor marca." : "."}`),
            (document.getElementById("exercise-result").style.display = ""),
            (document.getElementById("exercise-next").style.display = ""),
            updateExerciseDashboard());
        },
        onWrong: (t) => {
          t && countExerciseFailure(e);
        },
      });
    }),
    (document.getElementById("exercise-modal").style.display = "flex"));
}
function closeExerciseModal() {
  (stopExerciseCountdown(!0),
    (document.getElementById("exercise-modal").style.display = "none"),
    (currentExerciseId = null));
}
(document.querySelectorAll(".exercise-start").forEach((e) => {
  e.addEventListener("click", () => openExerciseModal(e.dataset.exercise));
}),
  document
    .getElementById("exercise-close")
    .addEventListener("click", closeExerciseModal),
  document.getElementById("exercise-next").addEventListener("click", () => {
    const e = exerciseTimedMode.enabled
      ? getNextTacticalExerciseId(currentExerciseId)
      : getRecommendedExerciseId(currentExerciseId);
    e && openExerciseModal(e);
  }),
  document.getElementById("exercise-modal").addEventListener("click", (e) => {
    "exercise-modal" === e.target.id && closeExerciseModal();
  }),
  document
    .getElementById("exercise-puzzle-hint")
    .addEventListener("click", () => {
      const e = EXERCISES[currentExerciseId];
      e && toast("💡 " + e.hint);
    }),
  document
    .getElementById("exercise-puzzle-retry")
    .addEventListener("click", () => {
      const e = EXERCISES[currentExerciseId];
      e &&
        ((document.getElementById("exercise-result").style.display = "none"),
        (document.getElementById("exercise-next").style.display = "none"),
        exerciseRunner.start(e),
        startExerciseCountdown(currentExerciseId));
    }),
  document
    .getElementById("exercise-timer-start")
    .addEventListener("click", enableTimedTraining),
  document
    .getElementById("exercise-timer-stop")
    .addEventListener("click", disableTimedTraining),
  (exerciseTimedMode.duration = state.exerciseStats.timerSeconds || 45),
  (document.getElementById("exercise-timer-seconds").value =
    String(exerciseTimedMode.duration)),
  updateTimedModeControls(),
  updateLearningProgress(),
  updateExerciseDashboard());


/* Firebase setup, announcements, chat, calls, and authentication. Generated from the verified legacy bundle. */
const FB_CONFIG_KEY = "chessSchoolFirebaseConfig",
  FB_ROOM_KEY = "chessSchoolFirebaseRoom",
  START_FEN_TOURNEY =
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyBdZDmedsEcht9kc3hSGOTEsbzr7D9t-wk",
    authDomain: "torneo-ajedrez-escuelaipem146.firebaseapp.com",
    projectId: "torneo-ajedrez-escuelaipem146",
    storageBucket: "torneo-ajedrez-escuelaipem146.firebasestorage.app",
    messagingSenderId: "220659996001",
    appId: "1:220659996001:web:8c7f82674634f026eea120",
    measurementId: "G-BXEGXS25VQ",
  };
let fbDb = null,
  fbRoomRef = null,
  gamesCollectionRef = null;
function gameDocId_(e, t) {
  return e + "_" + t;
}
function matchChatCollectionRef_(e, t) {
  return gamesCollectionRef.doc(gameDocId_(e, t)).collection("chat");
}
let announcementsCollectionRef = null,
  announcementsUnsub = null,
  lastAnnouncementId_ = null,
  announcementHistory_ = [],
  publicScreenActiveGames_ = [],
  publicScreenCycleIndex_ = 0,
  publicScreenCycleTimer_ = null,
  publicScreenZoomKey_ = null,
  roundCountdownTimer_ = null;
function assertAdminOrReferee() {
  if (!isCurrentUserAdmin(lastTournamentState) && !isCurrentUserReferee())
    throw new Error(
      "Esta acción es exclusiva del administrador o del árbitro del torneo",
    );
}
function subscribeAnnouncements() {
  (announcementsUnsub && (announcementsUnsub(), (announcementsUnsub = null)),
    (lastAnnouncementId_ = null),
    (announcementHistory_ = []));
  let e = !0;
  announcementsUnsub = announcementsCollectionRef
    .orderBy("ts", "desc")
    .limit(10)
    .onSnapshot(
      (t) => {
        ((announcementHistory_ = t.docs.map((e) => ({
          id: e.id,
          ...e.data(),
        }))),
          renderAnnouncementHistory_());
        const a = announcementHistory_[0] || null;
        (renderAnnouncementBanner_(a),
          !e &&
            a &&
            a.id !== lastAnnouncementId_ &&
            (toast("📢 " + (a.text || ""), 6e3), SoundFX.announcement()),
          (lastAnnouncementId_ = a ? a.id : null),
          (e = !1));
      },
      () => {},
    );
}
let announcementBannerTimer_ = null;
function renderAnnouncementBanner_(e) {
  const t = document.getElementById("tournament-announcement-banner"),
    a = document.getElementById("tournament-announcement-text");
  t &&
    a &&
    (clearTimeout(announcementBannerTimer_),
    e && e.text
      ? ((a.textContent = e.text),
        (t.style.display = ""),
        (announcementBannerTimer_ = setTimeout(() => {
          t.style.display = "none";
        }, 6e3)))
      : (t.style.display = "none"));
}
function formatAnnouncementTime_(e) {
  return e && "function" == typeof e.toDate
    ? e
        .toDate()
        .toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
    : "";
}
function stopRoundCountdownTimer_() {
  roundCountdownTimer_ &&
    (clearInterval(roundCountdownTimer_), (roundCountdownTimer_ = null));
}
function getRoundCountdownEndMs_(e) {
  const t = Number(e && e.roundCountdownEndsAtMs);
  if (Number.isFinite(t) && t > 0) return t;
  const a = getTimestampMs(e && e.roundCountdownSetAt),
    n = Number(e && e.roundCountdownMs);
  return a && Number.isFinite(n) && n > 0 ? a + n : 0;
}
function getRoundCountdownTargetRound_(e) {
  const t = Number(e && e.roundCountdownRound);
  return Number.isInteger(t) && t > 0
    ? t
    : Math.max(1, Number(e && e.round) || 0);
}
function hasRoundCountdown_(e) {
  return !!getRoundCountdownEndMs_(e && e.meta ? e.meta : e);
}
function renderRoundCountdown_(e) {
  const t = document.getElementById("tournament-round-countdown-banner"),
    a = document.getElementById("tournament-round-countdown-label"),
    n = document.getElementById("tournament-round-countdown-time"),
    o = document.getElementById("tournament-round-countdown-cancel-btn"),
    r = document.getElementById("tournament-round-countdown-detail"),
    s = document.getElementById("tournament-round-countdown-progress"),
    l = document.querySelectorAll(
      "#tournament-round-countdown-composer [data-countdown-adjust-ms]",
    );
  if (!t || !a || !n) return;
  stopRoundCountdownTimer_();
  const i = getRoundCountdownEndMs_(e.meta),
    c = getRoundCountdownTargetRound_(e.meta),
    d = Number(e.meta.roundCountdownDurationMs) || Number(e.meta.roundCountdownMs);
  if (
    (o && (o.style.display = i ? "" : "none"),
    l.forEach((e) => {
      e.style.display = i ? "" : "none";
    }),
    !i)
  )
    return (
      (t.style.display = "none"),
      void t.classList.remove(
        "round-countdown-urgent",
        "round-countdown-critical",
        "round-countdown-finished",
      )
    );
  t.style.display = "";
  const u = new Date(i).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    m = () => {
      const e = i - syncedNow_(),
        o = Math.max(0, Math.ceil(e / 1e3)),
        l = Number.isFinite(d) && d > 0 ? d : Math.max(1e3, i - syncedNow_()),
        m = Math.max(0, Math.min(100, (e / l) * 100));
      if (
        (s && (s.style.width = `${m}%`),
        r &&
          (r.textContent =
            e > 0
              ? `Hora prevista: ${u}`
              : `La hora prevista era ${u}`),
        e <= 0)
      ) {
        ((a.textContent = `Ronda ${c} lista para comenzar`),
          (n.textContent = "¡Ahora!"),
          t.classList.remove(
            "round-countdown-urgent",
            "round-countdown-critical",
          ),
          t.classList.add("round-countdown-finished"));
        if (e <= -12e4)
          return ((t.style.display = "none"), void stopRoundCountdownTimer_());
        return;
      }
      ((a.textContent = `Ronda ${c} comienza en`),
        (n.textContent = formatTime(o)),
        n.setAttribute(
          "aria-label",
          `${Math.floor(o / 60)} minutos y ${o % 60} segundos`,
        ),
        t.classList.remove("round-countdown-finished"),
        t.classList.toggle("round-countdown-urgent", o <= 60),
        t.classList.toggle("round-countdown-critical", o <= 10));
    };
  (m(), (roundCountdownTimer_ = setInterval(m, 1e3)));
}
function roundCountdownTargetRoundForState_(e) {
  const t = Number(e.meta.round) || 0;
  return "playing" === e.meta.roundStatus && t > 0 ? t : Math.max(1, t + 1);
}
async function syncCountdownClock_() {
  try {
    await syncInternetClock_();
  } catch (e) {}
}
async function fbAdjustRoundCountdown(e) {
  assertAdminOrReferee();
  const t = Number(e);
  if (!Number.isFinite(t) || 0 === t)
    throw new Error("El ajuste del countdown no es válido");
  await syncCountdownClock_();
  const a = syncedNow_();
  await fbDb.runTransaction(async (e) => {
    const n = await e.get(fbRoomRef);
    if (!n.exists) throw new Error("Todavía no creaste un torneo");
    const o = n.data(),
      r = getRoundCountdownEndMs_(o.meta);
    (assertAdminOrRefereeForState_(o), assertTournamentNotFinished_(o));
    if (!r) throw new Error("No hay un countdown activo para ajustar");
    const s = t > 0 && r <= a ? a + t : Math.max(a, r + t),
      l = Math.max(0, s - a);
    e.update(fbRoomRef, {
      meta: {
        ...o.meta,
        roundCountdownSetAt: srvTimestamp(),
        roundCountdownEndsAtMs: s,
        roundCountdownMs: l,
        roundCountdownDurationMs: Math.max(1e3, l),
        roundCountdownAdjustedBy: currentUser ? currentUser.email : null,
      },
    });
  });
}
function escapeAnnouncementHtml_(e) {
  return String(e || "").replace(
    /[&<>"']/g,
    (e) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        e
      ],
  );
}
function renderAnnouncementHistory_() {
  const e = document.getElementById("tournament-announcement-history-toggle"),
    t = document.getElementById("tournament-announcement-history-list");
  if (e && t) {
    if (!announcementHistory_.length)
      return ((e.style.display = "none"), void (t.style.display = "none"));
    ((e.style.display = ""),
      (e.textContent = `📋 Ver anuncios (${announcementHistory_.length})`),
      (t.innerHTML = announcementHistory_
        .map((e) => {
          const t = formatAnnouncementTime_(e.ts);
          return (
            `<div class="announcement-history-item"><span class="announcement-history-text">${escapeAnnouncementHtml_(e.text)}</span>` +
            (t ? `<span class="announcement-history-time">${t}</span>` : "") +
            "</div>"
          );
        })
        .join("")));
  }
}
async function sendTournamentAnnouncement(e) {
  const t = (e || "").trim();
  if (!t) throw new Error("Escribí un mensaje para anunciar");
  if (t.length > 500)
    throw new Error("El anuncio no puede superar los 500 caracteres");
  const a = await getTournamentStateOnce();
  (assertAdminOrRefereeForState_(a), assertTournamentNotFinished_(a));
  await announcementsCollectionRef.add({
    text: t,
    ts: srvTimestamp(),
    byEmail: currentUser ? currentUser.email : null,
  });
}
async function fbSetRoundCountdown(e) {
  assertAdminOrReferee();
  const t = Number(e);
  if (!Number.isFinite(t) || t < 0.5 || t > 180)
    throw new Error("Elegí una duración entre 30 segundos y 180 minutos");
  await syncCountdownClock_();
  const a = syncedNow_(),
    n = Math.round(6e4 * t),
    o = a + n;
  await fbDb.runTransaction(async (e) => {
    const t = await e.get(fbRoomRef);
    if (!t.exists) throw new Error("Todavía no creaste un torneo");
    const r = t.data();
    (assertAdminOrRefereeForState_(r), assertTournamentNotFinished_(r));
    e.update(fbRoomRef, {
      meta: {
        ...r.meta,
        roundCountdownSetAt: srvTimestamp(),
        roundCountdownEndsAtMs: o,
        roundCountdownMs: n,
        roundCountdownDurationMs: n,
        roundCountdownRound: roundCountdownTargetRoundForState_(r),
        roundCountdownStartedBy: currentUser ? currentUser.email : null,
        roundCountdownAdjustedBy: null,
      },
    });
  });
}
async function fbCancelRoundCountdown() {
  (assertAdminOrReferee(),
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) return;
      const a = t.data();
      (assertAdminOrRefereeForState_(a), assertTournamentNotFinished_(a));
      e.update(fbRoomRef, {
        meta: {
          ...a.meta,
          roundCountdownSetAt: null,
          roundCountdownEndsAtMs: null,
          roundCountdownMs: null,
          roundCountdownDurationMs: null,
          roundCountdownRound: null,
          roundCountdownStartedBy: null,
          roundCountdownAdjustedBy: null,
        },
      });
    }));
}
function subscribeMatchChat(e, t) {
  (unsubscribeMatchChat(),
    (matchChatMessages = []),
    (matchChatUnreadCount = 0),
    (matchChatPanelOpen = !1),
    (matchChatFirstSnapshot = !0),
    renderMatchChat(),
    tournamentMyColor() &&
      (matchChatUnsub = matchChatCollectionRef_(e, t)
        .orderBy("at", "asc")
        .limitToLast(200)
        .onSnapshot(
          (e) => {
            const t = matchChatMessages.length;
            matchChatMessages = e.docs.map((e) => e.data());
            const a = matchChatMessages.slice(t),
              n = a.length;
            (n > 0 && !matchChatPanelOpen && (matchChatUnreadCount += n),
              renderMatchChat(),
              notifyNewMatchChatMessages_(a, matchChatFirstSnapshot),
              (matchChatFirstSnapshot = !1));
          },
          () => {},
        )));
}
function notifyNewMatchChatMessages_(e, t) {
  if (t || !e.length || matchChatMuted) return;
  const a = currentUser ? currentUser.email.toLowerCase() : "",
    n = e.filter((e) => (e.senderEmail || "").toLowerCase() !== a);
  if (!n.length) return;
  if ((SoundFX.chatMessage(), matchChatPanelOpen)) return;
  const o = n[n.length - 1];
  if (0 === game.history().length)
    showChatMessagePopup(o.senderName || "Tu rival", o.text || "");
  else {
    const e =
      (o.text || "").length > 60 ? o.text.slice(0, 60) + "…" : o.text || "";
    toast("💬 " + (o.senderName || "Tu rival") + ": " + e);
  }
}
function unsubscribeMatchChat() {
  (matchChatUnsub && (matchChatUnsub(), (matchChatUnsub = null)),
    (matchChatMessages = []),
    (matchChatUnreadCount = 0),
    (matchChatPanelOpen = !1));
  const e = document.getElementById("tournament-match-chat-panel");
  e && (e.style.display = "none");
  const t = document.getElementById("tournament-match-chat-input");
  (t && (t.value = ""), resetMatchChatComposer_());
}
function tournamentMatchCommunicationAllowed_() {
  return !!(
    tournamentMatchActive &&
    tournamentMyColor() &&
    tournamentCurrentGameRow &&
    "ongoing" === tournamentCurrentGameRow.status &&
    (!lastTournamentState ||
      !lastTournamentState.meta ||
      "finished" !== lastTournamentState.meta.status)
  );
}
async function assertLiveTournamentGame_(e, t) {
  const a = await gamesCollectionRef.doc(gameDocId_(e, t)).get();
  if (!a.exists) throw new Error("No se encontró esa partida");
  if ("ongoing" !== a.data().status)
    throw new Error("La partida ya no está habilitada para comunicarse");
}
function renderMatchChat() {
  const e = document.getElementById("tournament-match-chat"),
    t = document.getElementById("tournament-match-chat-messages"),
    a = document.getElementById("tournament-match-chat-note"),
    n = document.getElementById("tournament-match-chat-unread"),
    o = document.querySelector("#tournament-match-chat-panel .chat-input-row"),
    r = document.getElementById("tournament-match-chat-clear-btn"),
    s = document.getElementById("tournament-match-chat-toggle-btn");
  if (!e || !t) return;
  const l = !!tournamentMyColor(),
    i = tournamentMatchCommunicationAllowed_();
  if (((e.style.display = tournamentMatchActive && l ? "" : "none"), l))
    if (
      (o && (o.style.display = i ? "" : "none"),
      a &&
        (a.textContent = i
          ? ""
          : "El chat quedó en modo lectura porque la partida no está activa."),
      r && (r.style.display = matchChatMessages.length ? "" : "none"),
      renderMatchChatMuteBtn_(),
      n &&
        (matchChatUnreadCount > 0
          ? ((n.textContent = String(matchChatUnreadCount)),
            (n.style.display = ""))
          : (n.style.display = "none")),
      s &&
        s.classList.toggle(
          "chat-toggle-pulse",
          matchChatUnreadCount > 0 && !matchChatPanelOpen,
        ),
      matchChatMessages.length)
    ) {
      const e = currentUser ? currentUser.email : "";
      ((t.innerHTML = matchChatMessages
        .map((t) => {
          const a = e && (t.senderEmail || "").toLowerCase() === e,
            n = escapeHtml_(t.senderName || "Jugador"),
            o = escapeHtml_(t.text || ""),
            r = t.at
              ? new Date(t.at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
          return `<div class="chat-message${a ? " mine" : ""}"><span class="chat-message-meta">${n}${r ? ` <span class="chat-message-time">· ${r}</span>` : ""}</span>${o}</div>`;
        })
        .join("")),
        (t.scrollTop = t.scrollHeight));
    } else
      t.innerHTML =
        '<p class="chat-message-empty">Todavía no hay mensajes. ¡Saludá a tu rival!</p>';
}
function toggleMatchChatPanel() {
  matchChatPanelOpen = !matchChatPanelOpen;
  const e = document.getElementById("tournament-match-chat-panel");
  if (
    (e && (e.style.display = matchChatPanelOpen ? "" : "none"),
    matchChatPanelOpen)
  ) {
    ((matchChatUnreadCount = 0), renderMatchChat());
    const e = document.getElementById("tournament-match-chat-messages");
    e && (e.scrollTop = e.scrollHeight);
    const t = document.getElementById("tournament-match-chat-input");
    t && t.focus();
  }
}
async function sendMatchChatMessage() {
  const e = document.getElementById("tournament-match-chat-input");
  if (!e) return;
  const t = e.value.trim();
  if (!t) return;
  if (
    !tournamentMatchCtx ||
    !currentUser ||
    !tournamentMatchCommunicationAllowed_()
  )
    return;
  const a = tournamentMyColor();
  if (a) {
    ((e.value = ""), resetMatchChatComposer_());
    try {
      const n = await getTournamentStateOnce();
      (assertTournamentNotFinished_(n),
        assertGameParticipantForState_(
          n,
          tournamentMatchCtx.round,
          tournamentMatchCtx.board,
        ));
      await assertLiveTournamentGame_(
        tournamentMatchCtx.round,
        tournamentMatchCtx.board,
      );
      await matchChatCollectionRef_(
        tournamentMatchCtx.round,
        tournamentMatchCtx.board,
      ).add({
        text: t.slice(0, 300),
        senderEmail: currentUser.email,
        senderName: currentUser.displayName || currentUser.email,
        senderColor: a,
        at: Date.now(),
      });
    } catch (a) {
      ((e.value = t), toast("❌ No se pudo enviar el mensaje: " + a.message));
    }
  }
}
function setMatchChatMuted(e) {
  ((matchChatMuted = e),
    localStorage.setItem("chessMatchChatMuted", matchChatMuted ? "on" : "off"),
    renderMatchChatMuteBtn_(),
    syncChatNotifCfgUI_());
}
function toggleMatchChatMute() {
  (setMatchChatMuted(!matchChatMuted),
    toast(
      matchChatMuted ? "🔕 Chat silenciado" : "🔔 Chat con notificaciones",
    ));
}
function renderMatchChatMuteBtn_() {
  const e = document.getElementById("tournament-match-chat-mute-btn");
  e &&
    ((e.textContent = matchChatMuted ? "🔕" : "🔔"),
    (e.title = matchChatMuted
      ? "Activar notificaciones de este chat"
      : "Silenciar notificaciones de este chat"),
    e.classList.toggle("muted", matchChatMuted));
}
function resetMatchChatComposer_() {
  const e = document.getElementById("tournament-match-chat-counter");
  e && (e.textContent = "");
  const t = document.getElementById("tournament-match-chat-send-btn");
  t && (t.disabled = !0);
}
async function clearMatchChat() {
  if (!tournamentMatchCtx || !tournamentMyColor()) return;
  if (!matchChatMessages.length) return;
  if (
    !confirm(
      "¿Vaciar el chat de esta mesa? Se borran los mensajes para los dos jugadores y no se puede deshacer.",
    )
  )
    return;
  const e = tournamentMatchCtx.round,
    t = tournamentMatchCtx.board;
  try {
    const o = await getTournamentStateOnce();
    (assertTournamentNotFinished_(o),
      assertGameParticipantForState_(o, e, t));
    const a = await matchChatCollectionRef_(e, t).get();
    if (a.empty) return;
    const n = fbDb.batch();
    (a.docs.forEach((e) => n.delete(e.ref)),
      await n.commit(),
      toast("🗑️ Chat vaciado"));
  } catch (e) {
    toast("❌ No se pudo vaciar el chat: " + e.message);
  }
}
function callDocRef_(e, t) {
  return gamesCollectionRef
    .doc(gameDocId_(e, t))
    .collection("call")
    .doc("session");
}
function callCandidatesRef_(e, t, a) {
  return callDocRef_(e, t).collection(a);
}
function renderCallUI() {
  const e = document.getElementById("tournament-match-call"),
    t = document.getElementById("tournament-match-call-idle"),
    a = document.getElementById("tournament-match-call-incoming"),
    n = document.getElementById("tournament-match-call-outgoing"),
    o = document.getElementById("tournament-match-call-active"),
    r = document.getElementById("tournament-match-call-note"),
    s = document.getElementById("tournament-match-call-mute-btn");
  if (!e) return;
  const l = tournamentMyColor(),
    i = tournamentMatchCommunicationAllowed_();
  ((e.style.display = i ? "" : "none"),
    l &&
      ((t.style.display = "idle" === callState ? "" : "none"),
      (a.style.display = "incoming" === callState ? "flex" : "none"),
      (n.style.display = "outgoing" === callState ? "flex" : "none"),
      (o.style.display = "active" === callState ? "flex" : "none"),
      s &&
        ((s.textContent = callIsMuted
          ? "🔈 Reactivar micrófono"
          : "🔇 Silenciar"),
        s.classList.toggle("muted", callIsMuted)),
      r &&
        (r.textContent =
          "idle" === callState
            ? "Llamada de audio opcional entre vos y tu rival, no queda grabada."
            : "")));
}
function teardownCallLocal_() {
  (SoundFX.stopRing(),
    callPc &&
      ((callPc.onicecandidate = null),
      (callPc.ontrack = null),
      callPc.close(),
      (callPc = null)),
    callLocalStream &&
      (callLocalStream.getTracks().forEach((e) => e.stop()),
      (callLocalStream = null)),
    callCandidatesUnsub.forEach((e) => e()),
    (callCandidatesUnsub = []));
  const e = document.getElementById("tournament-match-call-remote-audio");
  (e && (e.srcObject = null),
    (callIsMuted = !1),
    (callState = "idle"),
    (callPendingOffer = null),
    renderCallUI());
}
function listenRemoteCandidates_(e, t, a) {
  const n = callCandidatesRef_(e, t, a).onSnapshot((e) => {
    e.docChanges().forEach((e) => {
      "added" === e.type &&
        callPc &&
        callPc
          .addIceCandidate(new RTCIceCandidate(e.doc.data()))
          .catch(() => {});
    });
  });
  callCandidatesUnsub.push(n);
}
function newCallPeerConnection_() {
  const e = new RTCPeerConnection(RTC_ICE_SERVERS);
  return (
    (e.ontrack = (e) => {
      const t = document.getElementById("tournament-match-call-remote-audio");
      t && (t.srcObject = e.streams[0]);
    }),
    e
  );
}
async function startAudioCall() {
  if (
    !tournamentMatchCtx ||
    "idle" !== callState ||
    !tournamentMatchCommunicationAllowed_()
  )
    return;
  const e = tournamentMatchCtx.round,
    t = tournamentMatchCtx.board;
  try {
    const a = await getTournamentStateOnce();
    (assertTournamentNotFinished_(a),
      assertGameParticipantForState_(a, e, t));
    await assertLiveTournamentGame_(e, t);
    callLocalStream = await navigator.mediaDevices.getUserMedia({
      audio: !0,
      video: !1,
    });
  } catch (e) {
    return void toast("❌ No se pudo acceder al micrófono: " + e.message);
  }
  ((callState = "outgoing"),
    renderCallUI(),
    SoundFX.startRing(),
    (callPc = newCallPeerConnection_()),
    callLocalStream
      .getTracks()
      .forEach((e) => callPc.addTrack(e, callLocalStream)));
  const a = callCandidatesRef_(e, t, "offerCandidates");
  callPc.onicecandidate = (e) => {
    e.candidate && a.add(e.candidate.toJSON());
  };
  try {
    const a = await callPc.createOffer();
    (await callPc.setLocalDescription(a),
      await callDocRef_(e, t).set({
        offer: { type: a.type, sdp: a.sdp },
        answer: null,
        status: "calling",
        callerEmail: currentUser ? currentUser.email : "",
        at: Date.now(),
      }));
  } catch (e) {
    return (
      toast("❌ No se pudo iniciar la llamada: " + e.message),
      void teardownCallLocal_()
    );
  }
  listenRemoteCandidates_(e, t, "answerCandidates");
}
async function acceptIncomingCall_(e) {
  if (!tournamentMatchCtx || !tournamentMatchCommunicationAllowed_()) return;
  const t = tournamentMatchCtx.round,
    a = tournamentMatchCtx.board;
  try {
    const n = await getTournamentStateOnce();
    (assertTournamentNotFinished_(n),
      assertGameParticipantForState_(n, t, a));
    await assertLiveTournamentGame_(t, a);
    callLocalStream = await navigator.mediaDevices.getUserMedia({
      audio: !0,
      video: !1,
    });
  } catch (e) {
    return void toast("❌ No se pudo acceder al micrófono: " + e.message);
  }
  ((callPc = newCallPeerConnection_()),
    callLocalStream
      .getTracks()
      .forEach((e) => callPc.addTrack(e, callLocalStream)));
  const n = callCandidatesRef_(t, a, "answerCandidates");
  callPc.onicecandidate = (e) => {
    e.candidate && n.add(e.candidate.toJSON());
  };
  try {
    await callPc.setRemoteDescription(new RTCSessionDescription(e));
    const n = await callPc.createAnswer();
    (await callPc.setLocalDescription(n),
      await callDocRef_(t, a).update({
        answer: { type: n.type, sdp: n.sdp },
        status: "active",
      }));
  } catch (e) {
    return (
      toast("❌ No se pudo atender la llamada: " + e.message),
      void teardownCallLocal_()
    );
  }
  (listenRemoteCandidates_(t, a, "offerCandidates"),
    (callState = "active"),
    renderCallUI(),
    SoundFX.stopRing());
}
async function declineIncomingCall_() {
  if (tournamentMatchCtx) {
    try {
      await callDocRef_(
        tournamentMatchCtx.round,
        tournamentMatchCtx.board,
      ).update({ status: "declined" });
    } catch (e) {}
    teardownCallLocal_();
  }
}
async function hangUpCall() {
  if (!tournamentMatchCtx) return void teardownCallLocal_();
  const e = tournamentMatchCtx.round,
    t = tournamentMatchCtx.board;
  teardownCallLocal_();
  try {
    await callDocRef_(e, t).set(
      { status: "ended", at: Date.now() },
      { merge: !0 },
    );
    const [a, n] = await Promise.all([
        callCandidatesRef_(e, t, "offerCandidates").get(),
        callCandidatesRef_(e, t, "answerCandidates").get(),
      ]),
      o = fbDb.batch();
    (a.docs.forEach((e) => o.delete(e.ref)),
      n.docs.forEach((e) => o.delete(e.ref)),
      o.set(
        callDocRef_(e, t),
        { status: "idle", offer: null, answer: null },
        { merge: !0 },
      ),
      await o.commit());
  } catch (e) {}
}
function toggleCallMute() {
  callLocalStream &&
    ((callIsMuted = !callIsMuted),
    callLocalStream.getAudioTracks().forEach((e) => (e.enabled = !callIsMuted)),
    renderCallUI());
}
function subscribeCallSignaling(e, t) {
  (unsubscribeCallSignaling(),
    (callDocUnsub = callDocRef_(e, t).onSnapshot(
      (e) => {
        const t = e.exists ? e.data() : null;
        if (
          !t ||
          "idle" === t.status ||
          "ended" === t.status ||
          "declined" === t.status
        )
          return void ("idle" !== callState && teardownCallLocal_());
        const a = tournamentMyColor(),
          n = currentUser ? currentUser.email : "",
          o = t.callerEmail && t.callerEmail.toLowerCase() === n;
        "calling" === t.status && !o && "idle" === callState && a
          ? ((callState = "incoming"),
            (callPendingOffer = t.offer),
            renderCallUI(),
            SoundFX.startRing())
          : "active" === t.status &&
            o &&
            t.answer &&
            callPc &&
            !callPc.currentRemoteDescription &&
            (callPc
              .setRemoteDescription(new RTCSessionDescription(t.answer))
              .catch(() => {}),
            (callState = "active"),
            renderCallUI(),
            SoundFX.stopRing());
      },
      () => {},
    )));
}
function unsubscribeCallSignaling() {
  (callDocUnsub && (callDocUnsub(), (callDocUnsub = null)),
    teardownCallLocal_());
}
let subscribedRound_,
  lastRoundGames = [],
  gamesRoundUnsub = null,
  tournamentUnsub = null,
  tournamentBusy = !1;
lastTournamentState = null;
let lastKnownTournamentStatus_ = null,
  tournamentEditingPlayerId = null;
currentUser = null;
function srvTimestamp() {
  return firebase.firestore.FieldValue.serverTimestamp();
}
function getTimestampMs(e) {
  if (e && "function" == typeof e.toMillis) return e.toMillis();
  if ("number" == typeof e) return e;
  if (e instanceof Date) return e.getTime();
  if (e && "number" == typeof e.seconds)
    return 1e3 * e.seconds + Math.floor((e.nanoseconds || 0) / 1e6);
  if (e && "number" == typeof e._seconds)
    return 1e3 * e._seconds + Math.floor((e._nanoseconds || 0) / 1e6);
  if ("string" == typeof e) {
    const t = Date.parse(e);
    if (Number.isFinite(t)) return t;
  }
  return 0;
}
function setInternetClockAnchor_(e, t, a) {
  if (!Number.isFinite(e) || !Number.isFinite(t)) return !1;
  const n = internetClockIsSynced_ ? syncedNow_() : 0;
  return (
    (internetClockAnchorUtcMs_ = n > 0 ? Math.max(n, e) : e),
    (internetClockAnchorPerfMs_ = t),
    (internetClockOffsetMs = internetClockAnchorUtcMs_ - a),
    (internetClockIsSynced_ = !0),
    !0
  );
}
async function syncInternetClock_() {
  if (internetClockSyncPromise_) return internetClockSyncPromise_;
  internetClockSyncPromise_ = (async () => {
    const e = [
      {
        url: "https://timeapi.io/api/Time/current/zone?timeZone=UTC",
        parse: (e) =>
          Date.parse(
            /[zZ]|[+-]\d\d:\d\d$/.test(e.dateTime || "")
              ? e.dateTime
              : e.dateTime + "Z",
          ),
      },
      {
        url: "https://gateway.timeapi.world/timezone/Etc/UTC",
        parse: (e) =>
          e.utc_datetime
            ? Date.parse(e.utc_datetime)
            : 1e3 * Number(e.unixtime),
      },
    ];
    for (const { url: t, parse: a } of e)
      try {
        const e = new AbortController(),
          n = setTimeout(() => e.abort(), 4e3),
          o = Date.now(),
          r = performance.now(),
          s = t.includes("?") ? "&" : "?",
          l = await fetch(t + s + "_=" + o, {
            cache: "no-store",
            signal: e.signal,
          }),
          i = Date.now(),
          c = performance.now();
        if ((clearTimeout(n), !l.ok)) continue;
        const d = a(await l.json());
        if (!Number.isFinite(d)) continue;
        return (setInternetClockAnchor_(d + Math.max(0, c - r) / 2, c, i), !0);
      } catch (e) {}
    return !1;
  })();
  try {
    return await internetClockSyncPromise_;
  } finally {
    internetClockSyncPromise_ = null;
  }
}
function syncedNow_() {
  return internetClockIsSynced_
    ? internetClockAnchorUtcMs_ +
        (performance.now() - internetClockAnchorPerfMs_)
    : Date.now() + internetClockOffsetMs;
}
(syncInternetClock_(), setInterval(syncInternetClock_, 3e5));
let authListenerAttached = !1,
  authRedirectChecked_ = !1;
const TOURNAMENT_REFEREE_EMAIL = "josepantaleo@gmail.com";
function normalizeRoleEmail_(e) {
  return (e || "").trim().toLowerCase();
}
function tournamentRoleEmails_(e, t, a) {
  const n = e && e.meta;
  const o =
    n && Object.prototype.hasOwnProperty.call(n, t) && Array.isArray(n[t])
      ? n[t].map(normalizeRoleEmail_).filter(Boolean)
      : [];
  const r = normalizeRoleEmail_(a);
  return Array.from(new Set(r ? o.concat(r) : o));
}
function isCurrentUserReferee(e) {
  if (!currentUser || !currentUser.email) return !1;
  const t = normalizeRoleEmail_(currentUser.email);
  return tournamentRoleEmails_(
    e || lastTournamentState,
    "refereeEmails",
    TOURNAMENT_REFEREE_EMAIL,
  ).includes(t);
}
function assertReferee() {
  if (!isCurrentUserReferee())
    throw new Error("Esta acción es exclusiva del árbitro del torneo");
}
function assertAdminForState_(e) {
  if (!isCurrentUserAdmin(normalizeTournamentState(e)))
    throw new Error(
      "Tu cuenta ya no tiene permisos de administrador en este torneo",
    );
}
function assertRefereeForState_(e) {
  if (!isCurrentUserReferee(normalizeTournamentState(e)))
    throw new Error("Tu cuenta ya no tiene permisos de árbitro en este torneo");
}
function assertAdminOrRefereeForState_(e) {
  const t = normalizeTournamentState(e);
  if (!isCurrentUserAdmin(t) && !isCurrentUserReferee(t))
    throw new Error(
      "Tu cuenta ya no tiene permisos de administrador ni de árbitro",
    );
}
function assertTournamentNotFinished_(e, t) {
  if (e && e.meta && "finished" === e.meta.status)
    throw new Error(
      t || "El torneo está finalizado. Reabrilo antes de realizar esta acción",
    );
}
function parseRoleEmails_(e) {
  const t = Array.from(
    new Set(
      String(e || "")
        .split(/[\s,;]+/)
        .map(normalizeRoleEmail_)
        .filter(Boolean),
    ),
  );
  for (const e of t)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      throw new Error(`El correo "${e}" no es válido`);
  return t;
}
function getFirebaseConfig() {
  const e = localStorage.getItem(FB_CONFIG_KEY) || "";
  if (!e) return DEFAULT_FIREBASE_CONFIG;
  try {
    return JSON.parse(e) || DEFAULT_FIREBASE_CONFIG;
  } catch (e) {
    return DEFAULT_FIREBASE_CONFIG;
  }
}
function setFirebaseConfig(e) {
  localStorage.setItem(FB_CONFIG_KEY, JSON.stringify(e));
}
function getTournamentRoom() {
  return localStorage.getItem(FB_ROOM_KEY) || "main";
}
function setTournamentRoom(e) {
  localStorage.setItem(FB_ROOM_KEY, e || "main");
}
function parseFirebaseConfigInput(e) {
  const t = e.trim();
  if (!t) throw new Error("Pegá la configuración de Firebase");
  const a = t.match(/\{[\s\S]*\}/);
  let n = a ? a[0] : t;
  try {
    return JSON.parse(n);
  } catch (e) {
    ((n = n.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)/g, '$1"$2"$3')),
      (n = n.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (e, t) =>
        JSON.stringify(t),
      )),
      (n = n.replace(/,(\s*[}\]])/g, "$1")));
    try {
      return JSON.parse(n);
    } catch (e) {
      throw new Error(
        "No se pudo interpretar la configuración de Firebase. Pegala en formato JSON (con comillas en las claves).",
      );
    }
  }
}
function normalizeTournamentState(e) {
  const t = {
    name: "",
    round: 0,
    status: "setup",
    totalRounds: null,
    roundStatus: "playing",
    roundApprovalMode: "manual",
    pendingApprovalAt: null,
    autoApprovalCancelled: !1,
    woGraceMinutes: 0,
    roundCountdownSetAt: null,
    roundCountdownEndsAtMs: null,
    roundCountdownMs: null,
    roundCountdownDurationMs: null,
    roundCountdownRound: null,
    roundCountdownStartedBy: null,
    roundCountdownAdjustedBy: null,
  };
  return e
    ? {
        meta: Object.assign({ ...t }, e.meta || {}),
        players: e.players || [],
        pairings: e.pairings || [],
      }
    : { meta: { ...t }, players: [], pairings: [] };
}
function firebaseAuthErrorMessage_(e) {
  const t = e && e.code ? e.code : "";
  return "auth/unauthorized-domain" === t
    ? `Dominio no autorizado. Agrega ${location.hostname} en Firebase Authentication > Settings > Authorized domains.`
    : "auth/popup-blocked" === t
      ? "El navegador bloqueo la ventana de Google. Se intentara iniciar mediante redireccion."
      : e && e.message
        ? e.message
        : "No se pudo iniciar sesion con Google";
}
function shouldUseAuthRedirect_() {
  return (
    !location.hostname.endsWith(".github.io") &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}
function connectFirebase(e, t) {
  try {
    (firebase.apps.length || firebase.initializeApp(e),
      (fbDb = firebase.firestore()),
      authRedirectChecked_ ||
        ((authRedirectChecked_ = !0),
        firebase
          .auth()
          .getRedirectResult()
          .catch((e) => {
            toast(
              "No se pudo completar el acceso: " + firebaseAuthErrorMessage_(e),
              7e3,
            );
          })));
  } catch (e) {
    throw new Error("Configuración de Firebase inválida: " + e.message);
  }
  ((fbRoomRef = fbDb.collection("torneos").doc(t || "main")),
    (gamesCollectionRef = fbRoomRef.collection("games")),
    (announcementsCollectionRef = fbRoomRef.collection("announcements")),
    (subscribedRound_ = void 0),
    (lastRoundGames = []),
    (document.getElementById("tournament-auth-box").style.display = ""),
    authListenerAttached ||
      ((authListenerAttached = !0),
      firebase.auth().onAuthStateChanged((e) => {
        ((currentUser = e
          ? {
              uid: e.uid,
              email: (e.email || "").toLowerCase(),
              displayName: e.displayName || e.email,
            }
          : null),
          updateAuthUI(),
          currentUser
            ? (subscribeTournament(), subscribeAnnouncements())
            : (tournamentUnsub &&
                (tournamentUnsub(), (tournamentUnsub = null)),
              gamesRoundUnsub &&
                (gamesRoundUnsub(), (gamesRoundUnsub = null)),
              announcementsUnsub &&
                (announcementsUnsub(), (announcementsUnsub = null)),
              tournamentMatchActive && exitTournamentMatch(),
              unsubscribeMatchChat(),
              unsubscribeCallSignaling(),
              (announcementHistory_ = []),
              renderAnnouncementHistory_(),
              renderAnnouncementBanner_(null),
              (lastTournamentState = null),
              (lastRoundGames = []),
              renderTournamentState(null)));
      })));
}
function updateAuthUI() {
  const e = document.getElementById("tournament-auth-status"),
    t = document.getElementById("tournament-google-signin-btn"),
    a = document.getElementById("tournament-signout-btn"),
    n = document.getElementById("tournament-admin-entry-btn");
  (currentUser
    ? ((e.textContent = `Conectado como ${currentUser.displayName} (${currentUser.email})`),
      (t.style.display = "none"),
      (a.style.display = ""))
    : ((e.textContent =
        "Iniciá sesión con tu cuenta de Gmail para jugar o administrar el torneo."),
      (t.style.display = ""),
      (a.style.display = "none")),
    n &&
      (n.style.display =
        currentUser && isCurrentUserAdmin(lastTournamentState) ? "" : "none"),
    updateModeBadge(),
    updateConfigAccountUI_());
}
function updateConfigAccountUI_() {
  const e = document.getElementById("config-account-status"),
    t = document.getElementById("config-signout-btn");
  e &&
    t &&
    (currentUser
      ? ((e.textContent = `Conectado como ${currentUser.displayName} (${currentUser.email})`),
        (t.style.display = ""))
      : ((e.textContent =
          'Todavía no iniciaste sesión con Gmail. Entrá a "Torneo" para hacerlo.'),
        (t.style.display = "none")));
}
function isCurrentUserAdmin(e) {
  if (!currentUser || !currentUser.email) return !1;
  const t = normalizeRoleEmail_(currentUser.email);
  if (t === normalizeRoleEmail_(TOURNAMENT_ADMIN_EMAIL)) return !0;
  return tournamentRoleEmails_(
    e || lastTournamentState,
    "adminEmails",
    TOURNAMENT_ADMIN_EMAIL,
  ).includes(t);
}
function isBootstrapping(e) {
  return !1;
}
function assertAdmin() {
  if (!isCurrentUserAdmin(lastTournamentState))
    throw new Error(
      "Necesitás ser administrador de este torneo para hacer esto",
    );
}
function updateModeBadge() {
  const e = [
    document.getElementById("tournament-mode-badge"),
    document.getElementById("tournament-mode-badge-active"),
  ];
  if (!currentUser)
    return void e.forEach((e) => e && (e.style.display = "none"));
  const t = isCurrentUserAdmin(lastTournamentState),
    n = isCurrentUserReferee(),
    a = t && n
      ? "🔐 Modo Administrador y Árbitro"
      : n
        ? "🧑‍⚖️ Modo Árbitro"
      : t
        ? "🛠️ Modo Administrador"
        : "👤 Modo Jugador";
  e.forEach((e) => {
    e && ((e.textContent = a), (e.style.display = ""));
  });
}


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
                  (a &&
                    o &&
                    !n.presenceWAt &&
                    o.presenceWAt &&
                    (n.presenceWAt = o.presenceWAt),
                    a &&
                      o &&
                      !n.presenceBAt &&
                      o.presenceBAt &&
                      (n.presenceBAt = o.presenceBAt));
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
        currentUser &&
          isCurrentUserAdmin(a) &&
          fbBackfillGameAccessFields_(a).catch((e) =>
            console.warn(
              "No se pudieron completar los participantes de partidas antiguas:",
              e,
            ),
          ),
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
  const adminEmails = tournamentRoleEmails_(
      lastTournamentState,
      "adminEmails",
      TOURNAMENT_ADMIN_EMAIL,
    ),
    refereeEmails = tournamentRoleEmails_(
      lastTournamentState,
      "refereeEmails",
      TOURNAMENT_REFEREE_EMAIL,
    );
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
        adminEmails,
        refereeEmails,
        timeControlMinutes: d.minutes > 0 ? d.minutes : 0,
        timeControlIncrement: d.increment > 0 ? d.increment : 0,
        woGraceMinutes: Number(s) > 0 ? Number(s) : 0,
      },
      players: i,
      pairings: [],
      registeredUids: {},
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
function gameParticipantColorForState_(e, t, a) {
  const n = normalizeRoleEmail_(currentUser && currentUser.email),
    o = (e.pairings || []).find(
      (e) => Number(e.round) === Number(t) && Number(e.board) === Number(a),
    ),
    r = new Map(
      (e.players || []).map((e) => [e.id, normalizeRoleEmail_(e.email)]),
    );
  if (!n || !o) return "";
  return normalizeRoleEmail_(o.whiteEmail || r.get(o.whiteId)) === n
    ? "w"
    : normalizeRoleEmail_(o.blackEmail || r.get(o.blackId)) === n
      ? "b"
      : "";
}
function gameParticipantColorForGameRow_(e) {
  const t = normalizeRoleEmail_(currentUser && currentUser.email);
  if (!t || !e) return "";
  return normalizeRoleEmail_(e.whiteEmail) === t
    ? "w"
    : normalizeRoleEmail_(e.blackEmail) === t
      ? "b"
      : "";
}
function assertGameParticipantForState_(e, t, a) {
  const n = gameParticipantColorForState_(e, t, a);
  if (!n)
    throw new Error("Solo los jugadores asignados pueden modificar esta partida");
  return n;
}
let gameAccessBackfillSignature_ = "";
async function fbBackfillGameAccessFields_(e) {
  if (!gamesCollectionRef || !e || !isCurrentUserAdmin(e)) return;
  const defaultIncrement = Math.max(
      0,
      Number((e.meta && e.meta.timeControlIncrement) || 0),
    ),
    playerEmails = new Map(
      (e.players || []).map((e) => [e.id, normalizeRoleEmail_(e.email)]),
    );
  const t = new Map(
      (e.pairings || [])
        .filter((e) => "" !== e.blackId)
        .map((e) => [
          gameDocId_(e.round, e.board),
          {
            whiteEmail: normalizeRoleEmail_(
              e.whiteEmail || playerEmails.get(e.whiteId),
            ),
            blackEmail: normalizeRoleEmail_(
              e.blackEmail || playerEmails.get(e.blackId),
            ),
          },
        ]),
    ),
    a =
      getTournamentRoom() +
      "|" +
      Array.from(t.entries())
        .map(([e, t]) => `${e}:${t.whiteEmail}:${t.blackEmail}`)
        .join("|");
  if (a === gameAccessBackfillSignature_) return;
  gameAccessBackfillSignature_ = a;
  try {
    const e = await gamesCollectionRef.get(),
      n = e.docs
        .map((e) => {
          const a = t.get(e.id),
            n = e.data(),
            o = {};
          if (!a) return null;
          (normalizeRoleEmail_(n.whiteEmail) !== a.whiteEmail ||
            normalizeRoleEmail_(n.blackEmail) !== a.blackEmail) &&
            Object.assign(o, a);
          (Object.prototype.hasOwnProperty.call(n, "increment") ||
            (o.increment = defaultIncrement),
            Object.prototype.hasOwnProperty.call(n, "startedAt") ||
              (o.startedAt = syncedNow_()),
            Array.isArray(n.moves) || (o.moves = []),
            n.joined &&
              "boolean" == typeof n.joined.w &&
              "boolean" == typeof n.joined.b) ||
            (o.joined = { w: !1, b: !1 });
          return Object.keys(o).length ? { ref: e.ref, data: o } : null;
        })
        .filter(Boolean);
    for (let e = 0; e < n.length; e += 400) {
      const t = fbDb.batch();
      (n.slice(e, e + 400).forEach((e) => t.update(e.ref, e.data)),
        await t.commit());
    }
  } catch (e) {
    gameAccessBackfillSignature_ = "";
    throw e;
  }
}
async function fbUpdateTournamentRoles(e, t) {
  const a = parseRoleEmails_(e),
    n = parseRoleEmails_(t);
  if (!a.length) throw new Error("El torneo necesita al menos un administrador");
  return (
    assertAdmin(),
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) throw new Error("Todavía no creaste un torneo");
      const o = t.data();
      (assertAdminForState_(o),
        e.update(fbRoomRef, {
          meta: {
            ...o.meta,
            adminEmails: a,
            refereeEmails: n,
            rolesUpdatedAt: syncedNow_(),
            rolesUpdatedBy: currentUser ? currentUser.email : null,
          },
        }));
    }),
    getTournamentStateOnce()
  );
}
async function fbAddPlayer(e, t) {
  assertAdmin();
  const { name: a, email: n } = validatePlayerNameEmail_(e, t);
  return (
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) throw new Error("Todavía no creaste un torneo");
      const i = t.data();
      (assertAdminForState_(i), assertTournamentNotFinished_(i));
      const o = i.players || [];
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
      if (!currentUser.uid)
        throw new Error("La sesión no tiene un identificador de usuario válido");
      const i = {
        id: "u_" + currentUser.uid,
        name: t,
        email: a,
        points: 0,
        played: [],
        byes: 0,
        colorBalance: 0,
        status: "pending",
      };
      e.update(fbRoomRef, {
        players: r.concat([i]),
        registeredUids: {
          ...(o.registeredUids || {}),
          [currentUser.uid]: a,
        },
      });
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
      const i = a.data();
      (assertAdminForState_(i), assertTournamentNotFinished_(i));
      const n = i.players || [],
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
      const i = a.data();
      (assertAdminForState_(i), assertTournamentNotFinished_(i));
      const n = i.players || [],
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
      const r = t.data();
      (assertAdminForState_(r), assertTournamentNotFinished_(r));
      const a = r.players || [];
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
      const r = t.data();
      (assertAdminForState_(r), assertTournamentNotFinished_(r));
      const a = r.players || [];
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
      (assertAdminForState_(r), assertTournamentNotFinished_(r));
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
      (assertAdminForState_(n), assertTournamentNotFinished_(n));
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
      const i = a.data();
      (assertRefereeForState_(i), assertTournamentNotFinished_(i));
      const n = i.players || [],
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
      const i = a.data();
      (assertRefereeForState_(i), assertTournamentNotFinished_(i));
      const n = i.players || [],
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
      const i = a.data();
      (assertRefereeForState_(i), assertTournamentNotFinished_(i));
      const n = i.players || [],
        o = n.findIndex((t) => t.id === e);
      if (-1 === o) throw new Error("No se encontró ese jugador");
      const r = n.slice();
      ((r[o] = { ...r[o], status: "disqualified" }),
        t.update(fbRoomRef, { players: r }));
    }),
    getTournamentStateOnce()
  );
}
function findNonRepeatingPairingPlan_(e) {
  let t = 0;
  const a = 5e4,
    n = (e) => {
      if (0 === e.length) return [];
      if (++t > a) return null;
      const o = e[0],
        r = [];
      for (let t = 1; t < e.length; t++)
        -1 === (o.played || []).indexOf(e[t].id) &&
          -1 === (e[t].played || []).indexOf(o.id) &&
          r.push(t);
      for (const t of r) {
        const a = e[t],
          r = e.filter((e, a) => 0 !== a && a !== t),
          s = n(r);
        if (s) return [[o, a]].concat(s);
      }
      return null;
    };
  return n(e);
}
function buildFallbackPairingPlan_(e) {
  const t = e.slice(),
    a = [];
  for (; t.length > 0; ) {
    const e = t.shift();
    let n = t.findIndex(
      (t) =>
        -1 === (e.played || []).indexOf(t.id) &&
        -1 === (t.played || []).indexOf(e.id),
    );
    (-1 === n && (n = 0), a.push([e, t.splice(n, 1)[0]]));
  }
  return a;
}
function buildNextRoundPairings_(e, t, a, n, o) {
  const r = t + 1,
    s = e.filter((e) => "active" === (e.status || "active"));
  if (s.length < 2)
    throw new Error("Hacen falta al menos 2 jugadores activos para generar una ronda");
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
  const c =
      findNonRepeatingPairingPlan_(l) || buildFallbackPairingPlan_(l),
    d = [],
    u = {};
  e.forEach((e) => (u[e.id] = e.colorBalance || 0));
  let m = 1;
  for (const [e, a] of c) {
    const n =
        Math.abs((u[e.id] || 0) + 1) + Math.abs((u[a.id] || 0) - 1),
      o = Math.abs((u[e.id] || 0) - 1) + Math.abs((u[a.id] || 0) + 1),
      s = n < o || (n === o && (r + m) % 2 == 0),
      l = s ? e : a,
      i = s ? a : e;
    ((u[l.id] = (u[l.id] || 0) + 1),
      (u[i.id] = (u[i.id] || 0) - 1),
      d.push({
        round: r,
        board: m++,
        whiteId: l.id,
        whiteName: l.name,
        whiteEmail: l.email || "",
        blackId: i.id,
        blackName: i.name,
        blackEmail: i.email || "",
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
        whiteEmail: (e.whiteEmail || "").toLowerCase(),
        blackEmail: (e.blackEmail || "").toLowerCase(),
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
      assertAdminForState_(a);
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
          ...a.meta,
          round: c,
          status: "active",
          roundStatus: "playing",
          roundApprovalMode:
            "auto" === a.meta.roundApprovalMode ? "auto" : "manual",
          pendingApprovalAt: null,
          autoApprovalCancelled: !1,
          totalRounds: s || null,
          timeControlMinutes: i.minutes,
          timeControlIncrement: i.increment,
        },
        players: u,
        pairings: o.concat(d),
        registeredUids: a.registeredUids || {},
      }),
        m.forEach((t) =>
          e.set(gamesCollectionRef.doc(gameDocId_(t.round, t.board)), t),
        ));
    }),
    getTournamentStateOnce()
  );
}
async function notifyPublishedRound_(e, t) {
  const a = e && e.meta,
    n = Number(a && a.round) || 0;
  if (
    !a ||
    "active" !== a.status ||
    "playing" !== a.roundStatus ||
    !n ||
    n <= t
  )
    return e;
  try {
    await sendTournamentAnnouncement(
      `Ronda ${n} publicada. Revisa tus emparejamientos.`,
    );
  } catch (e) {
    console.warn("No se pudo publicar el anuncio de la nueva ronda:", e);
  }
  return e;
}
async function fbApproveRound() {
  const e =
    (lastTournamentState &&
      lastTournamentState.meta &&
      Number(lastTournamentState.meta.round)) ||
    0;
  return (
    assertAdminOrReferee(),
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) throw new Error("Todavía no creaste un torneo");
      const a = t.data(),
        n = { ...a.meta };
      assertAdminOrRefereeForState_(a);
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
      if (n.totalRounds && n.round >= n.totalRounds) {
        ((n.statusBeforeFinish = "pending_approval"),
          (n.status = "finished"),
          (n.roundStatus = "closed"),
          (n.pendingApprovalAt = null),
          (n.autoApprovalCancelled = !0),
          (n.finishedAt = syncedNow_()),
          (n.finishedBy = currentUser ? currentUser.email : null),
          r.forEach((e) => {
            e.round === n.round && (e.locked = !0);
          }),
          e.update(fbRoomRef, { meta: n, pairings: r }));
        return;
      }
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
    getTournamentStateOnce().then((t) => notifyPublishedRound_(t, e))
  );
}
async function fbCancelAutoApproval() {
  return (
    assertAdminOrReferee(),
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) throw new Error("Todavía no creaste un torneo");
      const a = t.data();
      (assertAdminOrRefereeForState_(a), assertTournamentNotFinished_(a));
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
      assertRefereeForState_(a);
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
  const t =
    (lastTournamentState &&
      lastTournamentState.meta &&
      Number(lastTournamentState.meta.round)) ||
    0;
  return (
    assertReferee(),
    await fbDb.runTransaction(async (t) => {
      const a = await t.get(fbRoomRef);
      if (!a.exists) throw new Error("Todavía no creaste un torneo");
      const n = a.data(),
        o = { ...n.meta };
      assertRefereeForState_(n);
      if ("active" !== o.status || "closed" !== o.roundStatus)
        throw new Error(
          'Primero hay que "Cerrar ronda" antes de generar la próxima',
        );
      if (o.totalRounds && o.round >= o.totalRounds) {
        ((o.statusBeforeFinish = "closed"),
          (o.status = "finished"),
          (o.pendingApprovalAt = null),
          (o.autoApprovalCancelled = !0),
          (o.finishedAt = syncedNow_()),
          (o.finishedBy = currentUser ? currentUser.email : null),
          t.update(fbRoomRef, { meta: o }));
        return;
      }
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
    getTournamentStateOnce().then((e) => notifyPublishedRound_(e, t))
  );
}
async function fbSetGameSuspended(e, t, a) {
  (assertReferee(), (e = Number(e)), (t = Number(t)));
  if (
    lastTournamentState &&
    "finished" === lastTournamentState.meta.status
  )
    throw new Error("El torneo está finalizado. Reabrilo antes de modificar partidas");
  const n = gamesCollectionRef.doc(gameDocId_(e, t));
  return (
    await fbDb.runTransaction(async (e) => {
      const t = await e.get(fbRoomRef);
      if (!t.exists) throw new Error("Todavía no creaste un torneo");
      const o = t.data();
      (assertRefereeForState_(o), assertTournamentNotFinished_(o));
      const r = await e.get(n);
      if (!r.exists) throw new Error("No se encontró esa partida");
      const s = { ...r.data() };
      if ("finished" === s.status)
        throw new Error("Esa partida ya terminó, no se puede suspender");
      if (a && s.clock && s.turnStartAt) {
        const e = new Chess(s.fen).turn(),
          t = Math.max(
            0,
            Math.floor((syncedNow_() - getTimestampMs(s.turnStartAt)) / 1e3),
          );
        ((s.clock = { ...s.clock, [e]: Math.max(0, s.clock[e] - t) }),
          (s.turnStartAt = null));
      } else if (!a && s.clock) {
        const e = s.joined || { w: !1, b: !1 };
        s.turnStartAt = e.w && e.b ? syncedNow_() : null;
      }
      (a &&
        ((s.selectedSquare = ""),
        (s.selectedColor = ""),
        (s.selectedAt = null)),
        (s.status = a ? "suspended" : "ongoing"),
        e.update(n, s));
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
        const a = await t.get(fbRoomRef);
        if (!a.exists) return;
        const n = a.data();
        (assertRefereeForState_(n), assertTournamentNotFinished_(n));
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
      (assertRefereeForState_(a), assertTournamentNotFinished_(a));
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
            ? ((n.statusBeforeFinish = "playing"),
              (n.status = "finished"),
              (n.roundStatus = "closed"),
              (n.finishedAt = syncedNow_()),
              (n.finishedBy = currentUser ? currentUser.email : null),
              i.forEach((e) => {
                e.round === n.round && (e.locked = !0);
              }))
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
      if (r.meta && "finished" === r.meta.status)
        throw new Error(
          "El torneo está finalizado. Reabrilo antes de modificar resultados",
        );
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
      const m = normalizeTournamentState(r);
      const v = ["1-0", "0-1", "1/2-1/2"],
        E = ["wo-black", "wo-white"];
      if (!v.includes(a) && !E.includes(a))
        throw new Error("El resultado indicado no es válido");
      if (E.includes(a) && !isCurrentUserReferee(m))
        throw new Error("Solo el árbitro puede declarar un resultado por W.O.");
      if (
        !isCurrentUserAdmin(m) &&
        !isCurrentUserReferee(m) &&
        !u
      )
        throw new Error(
          "No tenés permiso para cargar el resultado de esta partida",
        );
      if (c.locked && !isCurrentUserReferee(m))
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
      const p = gamesCollectionRef.doc(gameDocId_(e, t)),
        gameSnap = await n.get(p),
        g = gameSnap.exists
          ? {
              status: "finished",
              result: a,
              resultReason:
                "wo-white" === a || "wo-black" === a ? "wo" : "official",
              drawOfferBy: "",
              drawOfferAt: null,
              selectedSquare: "",
              selectedColor: "",
              selectedAt: null,
            }
          : null;
      const f = { ...r.meta },
        h = f.totalRounds;
      ("active" === f.status &&
        "pending_approval" !== f.roundStatus &&
        "closed" !== f.roundStatus &&
        i.filter((e) => e.round === f.round).every((e) => e.result) &&
        (h && f.round >= h
          ? ((f.statusBeforeFinish = "playing"),
            (f.status = "finished"),
            (f.roundStatus = "closed"),
            (f.finishedAt = syncedNow_()),
            (f.finishedBy = currentUser ? currentUser.email : null),
            i.forEach((e) => {
              e.round === f.round && (e.locked = !0);
            }))
          : ((f.roundStatus = "pending_approval"),
            (f.pendingApprovalAt = syncedNow_()),
            (f.autoApprovalCancelled = !1))),
        n.update(fbRoomRef, { players: s, pairings: i, meta: f }),
        g && n.update(p, g));
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
      const a = t.data(),
        n = { ...a.meta };
      assertAdminForState_(a);
      if ("finished" === n.status)
        throw new Error("El torneo ya está finalizado");
      const o = (a.pairings || []).map((e) =>
        e.round === n.round ? { ...e, locked: !0 } : e,
      );
      ((n.statusBeforeFinish = n.roundStatus || "playing"),
        (n.status = "finished"),
        (n.roundStatus = "closed"),
        (n.pendingApprovalAt = null),
        (n.autoApprovalCancelled = !0),
        (n.finishedAt = syncedNow_()),
        (n.finishedBy = currentUser ? currentUser.email : null),
        e.update(fbRoomRef, { meta: n, pairings: o }));
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
      const a = t.data(),
        n = { ...a.meta },
        o = n.statusBeforeFinish || "playing",
        r = (a.pairings || []).map((e) =>
          e.round === n.round && "closed" !== o ? { ...e, locked: !1 } : e,
        );
      assertAdminForState_(a);
      if ("finished" !== n.status)
        throw new Error("El torneo no está finalizado");
      (delete n.statusBeforeFinish,
        delete n.finishedAt,
        delete n.finishedBy,
        (n.status = "active"),
        (n.roundStatus = o),
        (n.autoApprovalCancelled = !1),
        e.update(fbRoomRef, { meta: n, pairings: r }));
    }),
    getTournamentStateOnce()
  );
}
async function fbUpdateSettings(e, t, n, o, r) {
  return (
    assertAdmin(),
    await fbDb.runTransaction(async (a) => {
      const s = await a.get(fbRoomRef);
      if (!s.exists) throw new Error("Todavía no creaste un torneo");
      const l = s.data(),
        i = n || {
          minutes: l.meta.timeControlMinutes || 0,
          increment: l.meta.timeControlIncrement || 0,
        },
        c = null == t || "" === t ? null : Number(t),
        d = Number(i.minutes) || 0,
        u = Number(i.increment) || 0,
        m = null == r || "" === r ? 0 : Number(r);
      (assertAdminForState_(l), assertTournamentNotFinished_(l));
      if (null !== c && (!Number.isInteger(c) || c < 1))
        throw new Error("La cantidad de rondas debe ser un entero mayor a 0");
      if (null !== c && c < Number(l.meta.round || 0))
        throw new Error(
          "La cantidad total de rondas no puede ser menor que la ronda actual",
        );
      if (!Number.isFinite(d) || d < 0 || d > 180)
        throw new Error("El tiempo por jugador debe estar entre 0 y 180 minutos");
      if (!Number.isFinite(u) || u < 0 || u > 60)
        throw new Error("El incremento debe estar entre 0 y 60 segundos");
      if (!Number.isFinite(m) || m < 0 || m > 1440)
        throw new Error("El tiempo de espera debe estar entre 0 y 1440 minutos");
      a.update(fbRoomRef, {
        meta: {
          ...l.meta,
          name: e || l.meta.name,
          totalRounds: c,
          timeControlMinutes: d,
          timeControlIncrement: u,
          roundApprovalMode: "auto" === o ? "auto" : "manual",
          woGraceMinutes: m,
        },
      });
    }),
    getTournamentStateOnce()
  );
}
async function fbToggleDrawOffer(e, t) {
  ((e = Number(e)), (t = Number(t)));
  const a = gamesCollectionRef.doc(gameDocId_(e, t));
  let n = null;
  await fbDb.runTransaction(async (o) => {
    const r = await o.get(fbRoomRef);
    if (!r.exists) throw new Error("No se encontró el torneo");
    const s = r.data();
    (assertTournamentNotFinished_(s),
      (n = assertGameParticipantForState_(s, e, t)));
    const l = await o.get(a);
    if (!l.exists) throw new Error("No se encontró esa partida");
    const i = { ...l.data() };
    if ("finished" === i.status) throw new Error("Esa partida ya terminó");
    if ("suspended" === i.status)
      throw new Error("Esta partida está suspendida por el árbitro");
    if (i.clock && i.turnStartAt) {
      const activeColor = new Chess(i.fen).turn(),
        elapsed = Math.max(
          0,
          Math.floor((syncedNow_() - getTimestampMs(i.turnStartAt)) / 1e3),
        );
      if (Number(i.clock[activeColor]) - elapsed <= 0)
        throw new Error("El tiempo de la partida ya se agotó");
    }
    const c = "w" === i.drawOfferBy || "b" === i.drawOfferBy ? i.drawOfferBy : "";
    if (c && c !== n)
      return void (n = { action: "accept", gameRow: i });
    const d = c === n ? "" : n,
      u = {
        drawOfferBy: d,
        drawOfferAt: d ? syncedNow_() : null,
      };
    (o.update(a, u),
      (n = {
        action: d ? "offered" : "cancelled",
        gameRow: { ...i, ...u },
      }));
  });
  return n;
}
function expectedResultForPosition_(e, t) {
  let a = null;
  if (Array.isArray(t) && t.length) {
    const n = new Chess();
    let o = !0;
    for (const e of t)
      if (!n.move(e)) {
        o = !1;
        break;
      }
    o && n.fen() === e && (a = n);
  }
  a || (a = new Chess(e));
  return a.in_checkmate()
    ? "w" === a.turn()
      ? "0-1"
      : "1-0"
    : a.in_draw() ||
        a.in_stalemate() ||
        a.insufficient_material() ||
        a.in_threefold_repetition()
      ? "1/2-1/2"
      : "";
}
async function fbRegisterGameResult_(e, t, a, n) {
  const o = await getTournamentStateOnce();
  if (isCurrentUserAdmin(o) || isCurrentUserReferee(o)) {
    const r = await fbSubmitResult(e, t, a);
    return ((r.gameRow = n), r);
  }
  return {
    gameRow: n,
    meta: o.meta,
    resultPendingReferee: !0,
  };
}
async function fbMakeMove(e, t, a, n, o, r, s, l, isTimeout, action) {
  ((e = Number(e)), (t = Number(t)));
  if (
    lastTournamentState &&
    "finished" === lastTournamentState.meta.status
  )
    throw new Error("El torneo está finalizado. Reabrilo antes de jugar");
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
  if (m && !isTimeout) {
    if ("finished" === m.status) throw new Error("Esa partida ya terminó");
    if ("suspended" === m.status)
      throw new Error("Esta partida está suspendida por el árbitro");
    const l = a !== m.fen,
      h = Boolean(m.clock && l);
    if (h) {
      const e = m.joined || { w: !1, b: !1 };
      if (!e.w || !e.b)
        throw new Error("Todavía no entraron los dos jugadores a la partida");
    }
    const i = {
      fen: a,
      lastMoveSan: n || "",
      selectedSquare: "",
      selectedColor: "",
      selectedAt: null,
    };
    (l &&
      ((i.drawOfferBy = ""),
      (i.drawOfferAt = null),
      n && (i.moves = (m.moves || []).concat(n))),
      o && ((i.drawOfferBy = ""), (i.drawOfferAt = null)));
    if ((r && (i.lastFrom = r), s && (i.lastTo = s), h)) {
      const e = new Chess(m.fen).turn(),
        t = m.turnStartAt
          ? Math.max(0, Math.floor((d - getTimestampMs(m.turnStartAt)) / 1e3))
          : 0,
        a = { ...m.clock, [e]: Math.max(0, m.clock[e] - t) };
      (!o && m.increment && (a[e] += m.increment),
        (i.clock = a),
        (i.turnStartAt = d));
    }
    (o && ((i.status = "finished"), (i.result = o)),
      await fbDb.runTransaction(async (e) => {
        const currentGameSnap = await e.get(u);
        if (!currentGameSnap.exists) throw new Error("No se encontró esa partida");
        const currentGame = currentGameSnap.data();
        let participantColor = gameParticipantColorForGameRow_(currentGame);
        if (!participantColor) {
          const t = await e.get(fbRoomRef);
          if (!t.exists) throw new Error("No se encontró el torneo");
          const roomState = t.data();
          (assertTournamentNotFinished_(roomState),
            (participantColor = assertGameParticipantForState_(
              roomState,
              m.round,
              m.board,
            )));
        }
        if ("finished" === currentGame.status)
          throw new Error("Esa partida ya terminó");
        if ("suspended" === currentGame.status)
          throw new Error("Esta partida está suspendida por el árbitro");
        if (currentGame.fen !== m.fen)
          throw new Error(
            "La partida cambió en otro dispositivo. Actualizá antes de mover",
          );
        if (l) {
          const currentPosition = new Chess(currentGame.fen);
          if (currentPosition.turn() !== participantColor)
            throw new Error("No es tu turno");
          const promotionMatch = String(n || "").match(/=([qrbn])/i),
            legalMove =
              r && s
                ? currentPosition.move({
                    from: r,
                    to: s,
                    promotion: promotionMatch
                      ? promotionMatch[1].toLowerCase()
                      : "q",
                  })
                : currentPosition.move(n);
          if (!legalMove)
            throw new Error(
              `La jugada ${r || n}-${s || ""} no es legal en la posición sincronizada`,
            );
          ((a = currentPosition.fen()),
            (n = legalMove.san || n),
            (i.fen = a),
            (i.lastMoveSan = n),
            (i.moves = (currentGame.moves || []).concat(n)));
          if (currentGame.clock) {
            const joined = currentGame.joined || { w: !1, b: !1 };
            if (!joined.w || !joined.b)
              throw new Error("Todavía no entraron los dos jugadores a la partida");
            const elapsed = currentGame.turnStartAt
                ? Math.max(
                    0,
                    Math.floor(
                      (d - getTimestampMs(currentGame.turnStartAt)) / 1e3,
                    ),
                  )
                : 0,
              activeColor = new Chess(currentGame.fen).turn(),
              remaining = Math.max(
                0,
                Number(currentGame.clock[activeColor]) - elapsed,
              );
            if (remaining <= 0)
              throw new Error(
                "El tiempo se agotó antes de que la jugada se registrara",
              );
            i.clock = {
              ...currentGame.clock,
              [activeColor]:
                remaining +
                (!i.result && currentGame.increment
                  ? currentGame.increment
                  : 0),
            };
            i.turnStartAt = d;
          }
        }
        if (i.status === "finished") {
          if ("draw" === action) {
            if (
              "1/2-1/2" !== i.result ||
              !currentGame.drawOfferBy ||
              currentGame.drawOfferBy === participantColor
            )
              throw new Error("La oferta de tablas ya no está disponible");
            if (currentGame.clock && currentGame.turnStartAt) {
              const activeColor = new Chess(currentGame.fen).turn(),
                elapsed = Math.max(
                  0,
                  Math.floor(
                    (d - getTimestampMs(currentGame.turnStartAt)) / 1e3,
                  ),
                );
              if (Number(currentGame.clock[activeColor]) - elapsed <= 0)
                throw new Error("La oferta no puede aceptarse con el tiempo agotado");
            }
          } else if ("resign" === action) {
            const expected = "w" === participantColor ? "0-1" : "1-0";
            if (i.result !== expected)
              throw new Error("El resultado de abandono no es válido");
          } else if (expectedResultForPosition_(i.fen, i.moves) !== i.result)
            throw new Error("La posición no corresponde al resultado indicado");
        }
        e.update(u, i);
      }));
    const c = { ...m, ...i };
    if ((h && (c.turnStartAt = d), !o)) return { gameRow: c };
    return fbRegisterGameResult_(e, t, o, c);
  }
  let p = null;
  if (
    (await fbDb.runTransaction(async (tx) => {
      const gameSnap = await tx.get(u);
      if (!gameSnap.exists) throw new Error("No se encontró esa partida");
      const i = { ...gameSnap.data() };
      let participantColor = gameParticipantColorForGameRow_(i);
      if (!participantColor) {
        const roomSnap = await tx.get(fbRoomRef);
        if (!roomSnap.exists) throw new Error("No se encontró el torneo");
        const roomData = roomSnap.data();
        (assertTournamentNotFinished_(roomData),
          (participantColor = assertGameParticipantForState_(roomData, e, t)));
      }
      const l = a !== i.fen,
        h = Boolean(i.clock && l);
      if ("finished" === i.status) throw new Error("Esa partida ya terminó");
      if ("suspended" === i.status)
        throw new Error("Esta partida está suspendida por el árbitro");
      if (isTimeout) {
        if (!i.clock || !i.turnStartAt)
          throw new Error("No hay un reloj activo para reclamar tiempo");
        const activeColor = new Chess(i.fen).turn(),
          joined = i.joined || { w: !1, b: !1 };
        if (!joined.w || !joined.b)
          throw new Error("El reloj todavía no comenzó");
        const elapsed = Math.max(
            0,
            Math.floor((d - getTimestampMs(i.turnStartAt)) / 1e3),
          ),
          remaining = Number(i.clock[activeColor]) - elapsed,
          expected = "w" === activeColor ? "0-1" : "1-0";
        if (remaining > 0) throw new Error("El tiempo todavía no se agotó");
        if ("timeout" !== action || o !== expected)
          throw new Error("El resultado por tiempo no es válido");
      } else if (o) {
        if ("draw" === action) {
          if (
            "1/2-1/2" !== o ||
            !i.drawOfferBy ||
            i.drawOfferBy === participantColor
          )
            throw new Error("La oferta de tablas ya no está disponible");
        } else if ("resign" === action) {
          const expected = "w" === participantColor ? "0-1" : "1-0";
          if (o !== expected)
            throw new Error("El resultado de abandono no es válido");
        } else if (
          expectedResultForPosition_(
            a,
            l && n ? (i.moves || []).concat(n) : i.moves,
          ) !== o
        )
          throw new Error("La posición no corresponde al resultado indicado");
      }
      if (h) {
        const e = i.joined || { w: !1, b: !1 };
        if (!e.w || !e.b)
          throw new Error("Todavía no entraron los dos jugadores a la partida");
      }
      if (l) {
        const currentPosition = new Chess(i.fen);
        if (currentPosition.turn() !== participantColor)
          throw new Error("No es tu turno");
        const promotionMatch = String(n || "").match(/=([qrbn])/i),
          legalMove =
            r && s
              ? currentPosition.move({
                  from: r,
                  to: s,
                  promotion: promotionMatch
                    ? promotionMatch[1].toLowerCase()
                    : "q",
                })
              : currentPosition.move(n);
        if (!legalMove)
          throw new Error(
            `La jugada ${r || n}-${s || ""} no es legal en la posición sincronizada`,
          );
        ((a = currentPosition.fen()), (n = legalMove.san || n));
      }
      if (h) {
        const e = new Chess(i.fen).turn(),
          t = i.turnStartAt
            ? Math.max(0, Math.floor((d - getTimestampMs(i.turnStartAt)) / 1e3))
            : 0;
        ((i.clock = { ...i.clock, [e]: Math.max(0, i.clock[e] - t) }),
          i.clock[e] <= 0 &&
            (() => {
              throw new Error(
                "El tiempo se agotó antes de que la jugada se registrara",
              );
            })(),
          !o &&
            i.increment &&
            (i.clock = { ...i.clock, [e]: i.clock[e] + i.increment }),
          (i.turnStartAt = d));
      }
      ((i.fen = a),
        (i.lastMoveSan = n || ""),
        (i.selectedSquare = ""),
        (i.selectedColor = ""),
        (i.selectedAt = null),
        l &&
          ((i.drawOfferBy = ""),
          (i.drawOfferAt = null),
          n && (i.moves = (i.moves || []).concat(n))),
        r && (i.lastFrom = r),
        s && (i.lastTo = s),
        o &&
          ((i.status = "finished"),
          (i.result = o),
          (i.drawOfferBy = ""),
          (i.drawOfferAt = null)),
        tx.update(u, i),
        (p = i),
        h && (p.turnStartAt = d));
    }),
    !o)
  )
    return { gameRow: p };
  return fbRegisterGameResult_(e, t, o, p);
}
async function fbSetSelectedSquare(e, t, a, n) {
  if (!gamesCollectionRef) return;
  if (
    lastTournamentState &&
    "finished" === lastTournamentState.meta.status
  )
    return;
  ((e = Number(e)), (t = Number(t)));
  const o = /^[a-h][1-8]$/.test(a || "") ? a : "",
    r = "w" === n || "b" === n ? n : "",
    s = gamesCollectionRef.doc(gameDocId_(e, t));
  if (!r) return;
  const l =
    lastRoundGames.find((a) => a.round === e && a.board === t) ||
    (tournamentCurrentGameRow &&
    tournamentCurrentGameRow.round === e &&
    tournamentCurrentGameRow.board === t
      ? tournamentCurrentGameRow
      : null);
  if (!l || "ongoing" !== l.status) return;
  if (o && new Chess(l.fen).turn() !== r) return;
  if (!o && l.selectedColor && l.selectedColor !== r) return;
  await s.update({
    selectedSquare: o,
    selectedColor: o ? r : "",
    selectedAt: o ? syncedNow_() : null,
  });
}
async function fbMarkJoined(e, t, a) {
  if (
    lastTournamentState &&
    "finished" === lastTournamentState.meta.status
  )
    return;
  ((e = Number(e)), (t = Number(t)));
  const n = gamesCollectionRef.doc(gameDocId_(e, t));
  return await fbDb.runTransaction(async (i) => {
    const c = await i.get(fbRoomRef);
    if (!c.exists) return;
    const d = c.data();
    (assertTournamentNotFinished_(d), assertGameParticipantForState_(d, e, t));
    const u = await i.get(n);
    if (!u.exists) return;
    const o = u.data(),
      r = o.joined || { w: !1, b: !1 },
      s = { ...r, [a]: !0 },
      l = r.w && r.b,
      m = s.w && s.b;
    if (r[a]) {
      const e = {};
      (o.clock &&
        "ongoing" === o.status &&
        m &&
        !o.turnStartAt &&
        (e.turnStartAt = syncedNow_()),
        Object.keys(e).length && i.update(n, e));
      return { ...o, ...e };
    }
    const p = { joined: s };
    (o.clock &&
      "ongoing" === o.status &&
      m &&
      (!l || !o.turnStartAt) &&
      (p.turnStartAt = syncedNow_()),
      i.update(n, p));
    return { ...o, ...p };
  });
}
async function fbTouchGamePresence_(e, t, a) {
  if (!gamesCollectionRef || ("w" !== a && "b" !== a)) return;
  if (
    lastTournamentState &&
    lastTournamentState.meta &&
    "active" !== lastTournamentState.meta.status
  )
    return;
  const n = gamesCollectionRef.doc(gameDocId_(Number(e), Number(t))),
    o = "w" === a ? "presenceWAt" : "presenceBAt";
  await n.update({ [o]: srvTimestamp() });
}
async function fbResetAll() {
  assertAdmin();
  const t = await getTournamentStateOnce();
  assertAdminForState_(t);
  const a = tournamentRoleEmails_(
      t,
      "adminEmails",
      TOURNAMENT_ADMIN_EMAIL,
    ),
    n = tournamentRoleEmails_(
      t,
      "refereeEmails",
      TOURNAMENT_REFEREE_EMAIL,
    );
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
        adminEmails: a,
        refereeEmails: n,
        totalRounds: null,
      },
      players: [],
      pairings: [],
      registeredUids: {},
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
      (assertRefereeForState_(a), assertTournamentNotFinished_(a));
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


/* Tournament timers, rendering, public screen, and result UI. Generated from the verified legacy bundle. */
let tournamentAutoApproveTimer = null;
function stopAutoApproveTimer() {
  (clearInterval(tournamentAutoApproveTimer),
    (tournamentAutoApproveTimer = null));
}
let tournamentWOGraceTimer = null,
  alertedDoubleNoShowBoards_ = new Set();
let tournamentJoinReminderTimer_ = null,
  tournamentJoinReminderSent_ = new Set();
function stopTournamentJoinReminder_() {
  (clearInterval(tournamentJoinReminderTimer),
    (tournamentJoinReminderTimer_ = null));
}
function checkTournamentJoinReminder_(e) {
  if (
    !e ||
    !e.meta ||
    "active" !== e.meta.status ||
    "playing" !== e.meta.roundStatus ||
    !currentUser ||
    !currentUser.email ||
    tournamentMatchActive
  )
    return;
  const t = currentUser.email.toLowerCase(),
    a = (e.pairings || []).find(
      (a) =>
        a.round === e.meta.round &&
        "" !== a.blackId &&
        !a.result &&
        ((a.whiteEmail || "").toLowerCase() === t ||
          (a.blackEmail || "").toLowerCase() === t),
    );
  if (!a) return;
  const n = lastRoundGames.find(
    (e) => e.round === a.round && e.board === a.board,
  );
  if (!n || "ongoing" !== n.status) return;
  const o =
      (a.whiteEmail || "").toLowerCase() === t ? "w" : "b",
    r = (n.joined || { w: !1, b: !1 })[o],
    s = getTimestampMs(n.startedAt);
  if (r || !s || syncedNow_() - s < 6e4) return;
  const l = `${a.round}:${a.board}:${s}:${o}`;
  if (tournamentJoinReminderSent_.has(l)) return;
  tournamentJoinReminderSent_.add(l);
  const i = "w" === o ? a.blackName : a.whiteName;
  (toast(
    `Recordatorio: ronda ${a.round}, mesa #${a.board}. Todavia no ingresaste a tu partida con ${i}.`,
    7e3,
  ),
    SoundFX.announcement());
}
function startTournamentJoinReminder_(e) {
  if (
    !e ||
    !e.meta ||
    "active" !== e.meta.status ||
    "playing" !== e.meta.roundStatus ||
    !currentUser
  )
    return void stopTournamentJoinReminder_();
  (checkTournamentJoinReminder_(e),
    tournamentJoinReminderTimer_ ||
      (tournamentJoinReminderTimer_ = setInterval(
        () => checkTournamentJoinReminder_(lastTournamentState),
        15e3,
      )));
}
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
        ? "Ya están cargados todos los resultados de esta ronda. Revisá la tabla de posiciones y los resultados abajo; el administrador o el árbitro pueden aprobarla."
        : "Ya terminaron todas las partidas de esta ronda. Falta que el administrador o el árbitro la revisen y aprueben para generar la ronda siguiente."));
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
function renderTournamentRoleSummary_(e) {
  const t = document.getElementById("tournament-roles-summary");
  if (!t) return;
  const a = tournamentRoleEmails_(
      e,
      "adminEmails",
      TOURNAMENT_ADMIN_EMAIL,
    ),
    n = tournamentRoleEmails_(
      e,
      "refereeEmails",
      TOURNAMENT_REFEREE_EMAIL,
    );
  t.textContent = `${a.length} administrador${1 === a.length ? "" : "es"} · ${n.length} árbitro${1 === n.length ? "" : "s"}`;
}
function renderTournamentState(e) {
  const t = document.getElementById("tournament-setup-box"),
    a = document.getElementById("tournament-active-box");
  if ((updateModeBadge(), !currentUser))
    return (
      (t.style.display = "none"),
      (a.style.display = "none"),
      stopWOGraceTimer(),
      void stopTournamentJoinReminder_()
    );
  if (!e || ("active" !== e.meta.status && "finished" !== e.meta.status))
    return (
      (t.style.display = isCurrentUserAdmin(e) ? "" : "none"),
      (a.style.display = "none"),
      stopWOGraceTimer(),
      void stopTournamentJoinReminder_()
    );
  ((t.style.display = "none"),
    (a.style.display = ""),
    startWOGraceTimerIfNeeded(e),
    startTournamentJoinReminder_(e));
  const n = isCurrentUserAdmin(e),
    p = isCurrentUserReferee(e),
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
  c && (c.style.display = !o && (n || isCurrentUserReferee(e)) ? "" : "none");
  const d = document.getElementById("tournament-round-countdown-composer");
  (d &&
      (d.style.display = !o && (n || isCurrentUserReferee(e)) ? "" : "none"),
    renderRoundCountdown_(e),
    (document.getElementById("tournament-admin-panel").style.display = n
      ? ""
      : "none"),
    (document.getElementById("tournament-open-admin-btn").style.display = n
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
    (document.getElementById("tournament-settings-btn").style.display = o
      ? "none"
      : ""),
    n ||
      ((document.getElementById("tournament-settings-panel").style.display =
        "none"),
      (document.getElementById("tournament-roles-panel").style.display =
        "none")),
    renderTournamentRoleSummary_(e),
    renderSelfRegisterCard(e, o),
    renderApprovalPanel(e, n || p, r));
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
          !t.result && o && "finished" === o.status && o.result
            ? `Resultado declarado desde el tablero: ${resultLabel(o.result)}. Requiere confirmación del árbitro.`
            : o && "finished" !== o.status && "suspended" !== o.status && u
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
        : o && "finished" === o.status && o.result
          ? ((h = "pending"), (y = "🟣 Resultado pendiente del árbitro"))
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
        S = "finished" !== e.meta.status && C,
        x = [
          ["1-0", "1-0"],
          ["1/2-1/2", "½-½"],
          ["0-1", "0-1"],
        ];
      p &&
        (x.push(["wo-black", "WO Blancas"]), x.push(["wo-white", "WO Negras"]));
      const I =
          "finished" === e.meta.status || (!n && !p) || (t.locked && !p)
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
          "finished" !== e.meta.status &&
          p &&
          o &&
          "finished" !== o.status
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
  l && (l.style.display = a ? "flex" : "none");
  const i = document.getElementById("tournament-recalc-positions-btn");
  (i && (i.style.display = "finished" === e.meta.status ? "none" : ""),
    renderPlayersPanel(e, t));
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
  const i = "finished" === e.meta.status,
    c = document.getElementById("tournament-add-player-controls"),
    d = document.getElementById("tournament-add-player-note");
  (c && (c.style.display = t && !i ? "flex" : "none"),
    d && (d.style.display = t || n ? "" : "none"));
  const o = document.getElementById("tournament-players-list");
  (setupPlayersListDelegation_(o),
    tournamentEditingPlayerId &&
      !e.players.some((e) => e.id === tournamentEditingPlayerId) &&
      (tournamentEditingPlayerId = null));
  const r = JSON.stringify([e.players, tournamentEditingPlayerId, t, n, i]);
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
    t && !i && s.length > 0)
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
        const a = t && !i
          ? `\n                  <button class="btn primary" data-approve-registration="${e.id}">✅ Autorizar</button>\n                  <button class="btn danger" data-reject-registration="${e.id}">🚫 Rechazar</button>\n                `
          : '<span class="muted" style="font-size:12px">Esperando autorización del administrador</span>';
        return `\n                <div class="pairing-row" data-player-row="${e.id}">\n                  <div class="pairing-names">${escapeHtml_(e.name)}${e.email ? ` <span class="muted" style="font-size:12px">(${escapeHtml_(e.email)})</span>` : ""}\n                    <div class="mini-diagram-caption" style="margin:2px 0 0;text-align:left">${playerStatusLabel_(e.status)}</div>\n                  </div>\n                  ${a}\n                </div>`;
      }
      const o = n && !i
          ? `\n                ${"active" === a ? `<button class="btn" data-withdraw-player="${e.id}">🚪 Retirar</button>` : ""}\n                ${"withdrawn" === a ? `<button class="btn" data-reactivate-player="${e.id}">↩️ Reincorporar</button>` : ""}\n                ${"disqualified" !== a ? `<button class="btn danger" data-disqualify-player="${e.id}">⛔ Descalificar</button>` : ""}\n              `
          : "",
        r = t && !i
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
function showTournamentRoundApprovalPopup_(e, t) {
  const a = document.getElementById("alert-box");
  if (!a) return;
  const n = document.createElement("div");
  n.id = "alert-tournament-round-actions";
  n.className = "alert-tournament-round-actions";
  const o = e && "active" === e.status && "pending_approval" === e.roundStatus,
    r = isCurrentUserAdmin({ meta: e }) || isCurrentUserReferee({ meta: e });
  if (t)
    n.innerHTML =
      "<strong>Resultado pendiente de validacion</strong><span>Un arbitro debe confirmar el resultado antes de revisar la aprobacion de la ronda.</span>";
  else if (o) {
    n.innerHTML = r
      ? "<strong>Ronda lista para aprobar</strong><span>Todos los resultados fueron cargados. Podes aprobarla ahora y publicar la siguiente ronda.</span>"
      : "<strong>Ronda pendiente de aprobacion</strong><span>Todos los resultados fueron cargados. Espera a que el administrador o arbitro apruebe la ronda.</span>";
    if (r) {
      const e = document.createElement("button");
      ((e.className = "btn primary"),
        (e.type = "button"),
        (e.textContent = "Aprobar ronda y generar la siguiente"),
        e.addEventListener("click", async () => {
          if (e.disabled) return;
          ((e.disabled = !0), (e.textContent = "Aprobando ronda..."));
          try {
            (await fbApproveRound(),
              toast("Ronda aprobada y siguiente ronda publicada."),
              closeAlert_());
          } catch (t) {
            ((e.disabled = !1),
              (e.textContent = "Aprobar ronda y generar la siguiente"),
              showError(t));
          }
        }),
        n.appendChild(e));
    }
  } else if (e && "finished" === e.status)
    n.innerHTML =
      "<strong>Torneo finalizado</strong><span>La ultima ronda ya quedo cerrada. No hay una ronda nueva para aprobar.</span>";
  else
    n.innerHTML =
      "<strong>Estado de la ronda</strong><span>El resultado fue registrado. La ronda seguira abierta hasta que finalicen las demas mesas.</span>";
  a.appendChild(n);
}
function showTournamentResult(e, t, n, o) {
  const a = tournamentResultMessage(e, t);
  showAlert(a.text, a.variant);
  const s = saveTournamentGameForAnalysis_(e, t),
    r = n || (lastTournamentState && lastTournamentState.meta);
  (showTournamentRoundApprovalPopup_(r, o),
    s && offerAnalysis(s.id),
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
function tournamentActiveClockExpired_() {
  const e = tournamentCurrentGameRow;
  if (
    !e ||
    !e.clock ||
    "ongoing" !== e.status ||
    tournamentClockWaitingForBothPlayers() ||
    !e.turnStartAt
  )
    return !1;
  const t = game.turn(),
    a = Math.max(
      0,
      Math.floor((syncedNow_() - getTimestampMs(e.turnStartAt)) / 1e3),
    );
  return Number(e.clock[t]) - a <= 0;
}
function updateTournamentMatchBar(e) {
  if (!tournamentMatchActive || !tournamentMatchCtx) return;
  const t = document.getElementById("tournament-match-status"),
    a = tournamentMyColor(),
    n = document.getElementById("tournament-match-controls"),
    o = document.getElementById("tournament-match-spectator-note"),
    r = document.getElementById("tournament-match-draw-btn"),
    s = document.getElementById("tournament-match-resign-btn"),
    l =
      lastTournamentState &&
      lastTournamentState.meta &&
      "finished" === lastTournamentState.meta.status;
  if (e && "finished" === e.status) {
    if (
      ((t.textContent = "🏁 Partida terminada."),
      (n.style.display = "none"),
      (o.style.display = "none"),
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
      showTournamentResult(
        t,
        void 0,
        lastTournamentState && lastTournamentState.meta,
      );
    }
    return;
  }
  if (e && "suspended" === e.status)
    return (
      (t.textContent =
        "⏸️ El árbitro suspendió esta partida. Esperá novedades antes de seguir jugando."),
      (n.style.display = "none"),
      void (o.style.display = "none")
    );
  if (!a || l) {
    (n.style.display = "none"), (o.style.display = "");
    o.textContent = l
      ? "Torneo finalizado: esta partida está disponible solo para consulta."
      : "Estás viendo la partida como espectador.";
  } else {
    (n.style.display = "flex"), (o.style.display = "none");
    const t = e && ("w" === e.drawOfferBy || "b" === e.drawOfferBy)
      ? e.drawOfferBy
      : "";
    r.textContent = !t
      ? "🤝 Ofrecer tablas"
      : t === a
        ? "✖ Cancelar oferta de tablas"
        : "🤝 Aceptar tablas";
    (r.disabled = tournamentMatchBusy || tournamentActiveClockExpired_(),
      (s.disabled = tournamentMatchBusy || tournamentActiveClockExpired_()));
  }
  const i = game.turn(),
    c = "w" === i ? tournamentMatchCtx.whiteName : tournamentMatchCtx.blackName,
    d = e && ("w" === e.drawOfferBy || "b" === e.drawOfferBy) ? e.drawOfferBy : "";
  if (tournamentClockWaitingForBothPlayers()) {
    const a = ((e && e.joined) || { w: !1, b: !1 }).w
      ? tournamentMatchCtx.blackName
      : tournamentMatchCtx.whiteName;
    t.textContent = `Esperando a que entre ${a}. El reloj comenzará cuando estén ambos jugadores.`;
  } else if (a && d && d !== a)
    t.textContent = "Tu rival ofreció tablas. Podés aceptar o continuar jugando.";
  else if (a && d === a)
    t.textContent = "Oferta de tablas enviada. Podés cancelarla mientras el rival decide.";
  else
    t.textContent = a
      ? a === i
        ? `¡Tu turno! Jugás con ${"w" === a ? "blancas" : "negras"}.`
        : `Turno de ${c}. Esperando la jugada...`
      : `Turno de ${c}.`;
}
function handleLiveMatchUpdate(e) {
  if (!tournamentMatchActive || !tournamentMatchCtx) return;
  const t = lastRoundGames.find(
    (e) =>
      e.round === tournamentMatchCtx.round &&
      e.board === tournamentMatchCtx.board,
  );
  if (!t) return;
  const previous = tournamentCurrentGameRow;
  "function" == typeof markTournamentConnectionAlive_ &&
    markTournamentConnectionAlive_();
  tournamentCurrentGameRow = t;
  "function" == typeof renderTournamentOpponentPresence_ &&
    renderTournamentOpponentPresence_(t);
  const n = applyTournamentOpponentSelection_(t),
    a =
      t.fen !== game.fen() ||
      (Array.isArray(t.moves) && t.moves.length !== game.history().length);
  (a
    ? (loadTournamentGame_(t),
      (selected = null),
      (validMoves = []),
      (tournamentSelectionLastSent_ = null),
      t.lastFrom &&
        t.lastTo &&
        (clearTimeout(opponentMoveHighlightTimer),
        (opponentMoveHighlight = { from: t.lastFrom, to: t.lastTo })),
      render())
    : n && updateSelectionHighlights(),
    updateTournamentMatchBar(t),
    renderMatchChat(),
    renderCallUI(),
    ("ongoing" !== t.status && "idle" !== callState) && teardownCallLocal_(),
    updateTournamentClockDisplay(),
    previous &&
      !getTimestampMs(previous.turnStartAt) &&
      "function" == typeof announceTournamentClockStart_ &&
      announceTournamentClockStart_(t));
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
        n = await fbMakeMove(
            tournamentMatchCtx.round,
            tournamentMatchCtx.board,
            game.fen(),
            game.history().slice(-1)[0] || "",
            t,
            void 0,
            void 0,
            void 0,
            !0,
            "timeout",
          ),
        a = n.gameRow;
      (tournamentResultShown ||
        ((tournamentResultShown = !0),
        showTournamentResult(t, "tiempo agotado", n.meta, n.resultPendingReferee)),
        n.resultPendingReferee &&
          toast(
            "Tiempo agotado registrado. Un árbitro debe confirmar el resultado.",
          ),
        updateTournamentMatchBar(a));
    } catch (e) {
    } finally {
      tournamentTimeoutClaimBusy = !1;
    }
  }
}


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
  tournamentSyncSlowTimer_ = null,
  tournamentClockStartNoticeKey_ = "",
  tournamentClockStartNoticeTimer_ = null,
  tournamentPresenceHeartbeatTimer_ = null,
  tournamentPresenceDisplayTimer_ = null,
  tournamentPresenceLastSentAt_ = 0,
  tournamentLastConfirmedSnapshotAt_ = 0,
  tournamentRecoveryBusy_ = !1,
  tournamentWasOffline_ = !1;
function announceTournamentClockStart_(e) {
  if (
    !tournamentMatchActive ||
    !tournamentMyColor() ||
    !e ||
    "ongoing" !== e.status ||
    !e.clock ||
    !getTimestampMs(e.turnStartAt)
  )
    return;
  const t = (e.joined || { w: !1, b: !1 }).w && (e.joined || { w: !1, b: !1 }).b;
  if (!t) return;
  const a = `${e.round}:${e.board}:${getTimestampMs(e.turnStartAt)}`;
  if (tournamentClockStartNoticeKey_ === a) return;
  tournamentClockStartNoticeKey_ = a;
  const n = document.getElementById("tournament-clock-start-notice");
  (n &&
    ((n.hidden = !1),
    n.classList.remove("show"),
    void n.offsetWidth,
    n.classList.add("show"),
    clearTimeout(tournamentClockStartNoticeTimer_),
    (tournamentClockStartNoticeTimer_ = setTimeout(() => {
      n.classList.remove("show");
      n.hidden = !0;
    }, 5e3))),
    SoundFX.unlock(),
    SoundFX.gameStart(),
    toast("Reloj iniciado: juegan blancas.", 2600));
}
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
  ((tournamentLastConfirmedSnapshotAt_ = Date.now()),
    tournamentMatchBusy ||
    ("error" !== tournamentSyncState_ && "delayed" !== tournamentSyncState_
      ? renderTournamentSyncIndicator_()
      : setTournamentSyncState_("online")));
}
function renderTournamentOpponentPresence_(e) {
  const t = document.getElementById("tournament-opponent-indicator"),
    a = document.getElementById("tournament-opponent-text"),
    n = tournamentMyColor();
  if (
    !t ||
    !a ||
    !tournamentMatchActive ||
    !n ||
    !e ||
    "ongoing" !== e.status
  )
    return void (t && (t.style.display = "none"));
  t.style.display = "";
  const o = "w" === n ? "b" : "w",
    r = "w" === o ? "presenceWAt" : "presenceBAt",
    s = getTimestampMs(e[r]),
    l = ((e && e.joined) || { w: !1, b: !1 })[o];
  let i = "unknown",
    c = "Rival: sin verificar",
    d = "Todavía no se pudo verificar la conexión del rival";
  if (!navigator.onLine)
    d = "Tu conexión está interrumpida; no se puede verificar al rival";
  else if (!s)
    l
      ? ((i = "reconnecting"),
        (c = "Rival reconectando"),
        (d = "El rival entró a la partida, pero todavía no confirmó presencia"))
      : ((i = "away"),
        (c = "Rival ausente"),
        (d = "El rival todavía no entró o no confirmó conexión"));
  else {
    const e = Math.max(0, syncedNow_() - s);
    e <= 35e3
      ? ((i = "connected"),
        (c = "Rival conectado"),
        (d = "El rival confirmó conexión recientemente"))
      : e <= 65e3
        ? ((i = "reconnecting"),
          (c = "Rival reconectando"),
          (d = "Se perdió el pulso reciente del rival; puede ser un microcorte"))
        : ((i = "away"),
          (c = "Rival ausente"),
          (d = "El rival no confirma conexión desde hace más de un minuto"));
  }
  ((t.dataset.state = i),
    (a.textContent = c),
    (t.title = d),
    t.setAttribute("aria-label", d));
}
async function touchTournamentPresence_(e) {
  const t = tournamentMyColor();
  if (
    !tournamentMatchActive ||
    !tournamentMatchCtx ||
    !t ||
    !navigator.onLine ||
    !tournamentCurrentGameRow ||
    "ongoing" !== tournamentCurrentGameRow.status
  )
    return !1;
  const a = Date.now();
  if (!e && a - tournamentPresenceLastSentAt_ < 15e3) return !1;
  tournamentPresenceLastSentAt_ = a;
  try {
    return (
      await fbTouchGamePresence_(
        tournamentMatchCtx.round,
        tournamentMatchCtx.board,
        t,
      ),
      !0
    );
  } catch (e) {
    return (
      navigator.onLine &&
        console.warn("No se pudo actualizar la presencia de la partida:", e),
      !1
    );
  }
}
function stopTournamentPresence_() {
  (clearInterval(tournamentPresenceHeartbeatTimer_),
    clearInterval(tournamentPresenceDisplayTimer_),
    (tournamentPresenceHeartbeatTimer_ = null),
    (tournamentPresenceDisplayTimer_ = null),
    (tournamentPresenceLastSentAt_ = 0));
  const e = document.getElementById("tournament-opponent-indicator");
  e && (e.style.display = "none");
}
function startTournamentPresence_() {
  (stopTournamentPresence_(),
    touchTournamentPresence_(!0),
    renderTournamentOpponentPresence_(tournamentCurrentGameRow),
    (tournamentPresenceHeartbeatTimer_ = setInterval(
      () => touchTournamentPresence_(!1),
      2e4,
    )),
    (tournamentPresenceDisplayTimer_ = setInterval(
      () => renderTournamentOpponentPresence_(tournamentCurrentGameRow),
      5e3,
    )));
}
async function recoverTournamentMatch_() {
  if (
    !tournamentMatchActive ||
    !tournamentMatchCtx ||
    !gamesCollectionRef ||
    tournamentRecoveryBusy_ ||
    tournamentMatchBusy
  )
    return !1;
  if (!navigator.onLine)
    return (
      setTournamentSyncState_("offline"),
      renderTournamentOpponentPresence_(tournamentCurrentGameRow),
      !1
    );
  const e = {
      round: tournamentMatchCtx.round,
      board: tournamentMatchCtx.board,
    },
    t = tournamentWasOffline_,
    a = beginTournamentSync_();
  ((tournamentRecoveryBusy_ = !0), setTournamentMatchBusy_(!0));
  try {
    const t = await gamesCollectionRef
      .doc(gameDocId_(e.round, e.board))
      .get({ source: "server" });
    if (!t.exists) throw new Error("La partida ya no está disponible");
    if (
      !tournamentMatchActive ||
      !tournamentMatchCtx ||
      tournamentMatchCtx.round !== e.round ||
      tournamentMatchCtx.board !== e.board
    )
      return !1;
    let n = t.data({ serverTimestamps: "estimate" });
    const o = tournamentMyColor();
    if (o && "ongoing" === n.status) {
      const t = await fbMarkJoined(e.round, e.board, o);
      n =
        t ||
        {
          ...n,
          joined: { ...(n.joined || { w: !1, b: !1 }), [o]: !0 },
        };
    }
    const r = lastRoundGames.findIndex(
      (t) => t.round === e.round && t.board === e.board,
    );
    (r >= 0 ? (lastRoundGames[r] = n) : lastRoundGames.push(n),
      (tournamentCurrentGameRow = n),
      handleLiveMatchUpdate(lastTournamentState),
      (tournamentLastConfirmedSnapshotAt_ = Date.now()),
      finishTournamentSync_(a),
      (tournamentWasOffline_ = !1),
      touchTournamentPresence_(!0),
      t && toast("✓ Conexión restablecida. Partida sincronizada."));
    return !0;
  } catch (e) {
    return (
      failTournamentSync_(),
      renderTournamentOpponentPresence_(tournamentCurrentGameRow),
      console.warn("No se pudo recuperar la partida desde Firebase:", e),
      !1
    );
  } finally {
    ((tournamentRecoveryBusy_ = !1), setTournamentMatchBusy_(!1));
  }
}
(window.addEventListener("online", () => {
  tournamentMatchActive
    ? recoverTournamentMatch_()
    : setTournamentSyncState_("online");
}),
  window.addEventListener("offline", () => {
    ((tournamentWasOffline_ = tournamentMatchActive || tournamentWasOffline_),
      setTournamentSyncState_("offline"),
      renderTournamentOpponentPresence_(tournamentCurrentGameRow));
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
      (tournamentLastConfirmedSnapshotAt_ = 0),
      (tournamentRecoveryBusy_ = !1),
      (tournamentWasOffline_ = !navigator.onLine),
      (tournamentClockStartNoticeKey_ = ""),
      clearTimeout(tournamentClockStartNoticeTimer_),
      (tournamentClockStartNoticeTimer_ = null),
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
        try {
          const a = await fbMarkJoined(e, t, u);
          if (a) {
            const n = lastRoundGames.findIndex(
              (a) => a.round === e && a.board === t,
            );
            ((s = a),
              n >= 0 ? (lastRoundGames[n] = a) : lastRoundGames.push(a),
              (tournamentCurrentGameRow = a),
              updateTournamentClockDisplay(),
              announceTournamentClockStart_(a));
          }
        } catch (e) {
          showError(e, "No se pudo registrar tu entrada a la partida");
        }
      }
    } else
      ((m.style.display = ""),
        (m.textContent = h
          ? "Torneo finalizado: esta partida está disponible solo para consulta."
          : "Estás viendo la partida como espectador."),
        (p.style.display = "none"));
    (subscribeMatchChat(e, t),
      tournamentMyColor() && !h && subscribeCallSignaling(e, t),
      tournamentMyColor() && !h && startTournamentPresence_(),
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
    clearTimeout(tournamentClockStartNoticeTimer_),
    (tournamentClockStartNoticeTimer_ = null),
    (tournamentClockStartNoticeKey_ = ""),
    stopTournamentPresence_(),
    (tournamentSyncState_ = "online"),
    (tournamentLastLatencyMs_ = null),
    (tournamentLastConfirmedSnapshotAt_ = 0),
    (tournamentRecoveryBusy_ = !1),
    (tournamentWasOffline_ = !1),
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
        ((tournamentResultShown = !0),
        showTournamentResult(t, void 0, n.meta, n.resultPendingReferee)),
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
            showTournamentResult(
              "w" === e ? "0-1" : "1-0",
              void 0,
              t.meta,
              t.resultPendingReferee,
            )),
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
            ((tournamentResultShown = !0),
            showTournamentResult(
              "1/2-1/2",
              void 0,
              t.meta,
              t.resultPendingReferee,
            )),
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
const tournamentOpenAdminBtn = document.getElementById(
  "tournament-open-admin-btn",
);
function openTournamentAdministration_() {
  const e = document.getElementById("tournament-admin-panel"),
    t = document.getElementById("tournament-setup-box"),
    a = e && "none" !== e.style.display ? e : t;
  a && a.scrollIntoView({ behavior: "smooth", block: "start" });
}
tournamentOpenAdminBtn &&
  tournamentOpenAdminBtn.addEventListener(
    "click",
    openTournamentAdministration_,
  );
const tournamentAdminEntryBtn = document.getElementById(
  "tournament-admin-entry-btn",
);
tournamentAdminEntryBtn &&
  tournamentAdminEntryBtn.addEventListener(
    "click",
    openTournamentAdministration_,
  );
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
        ? (updateTournamentClockDisplay(),
          renderTournamentOpponentPresence_(tournamentCurrentGameRow),
          navigator.onLine &&
            (tournamentWasOffline_ ||
            Date.now() - tournamentLastConfirmedSnapshotAt_ > 45e3
              ? recoverTournamentMatch_()
              : touchTournamentPresence_(!1)))
        : updateClockDisplay(),
      lastTournamentState &&
        lastTournamentState.meta &&
        renderRoundCountdown_(lastTournamentState));
  }));
document.documentElement.dataset.appReady = "1";
