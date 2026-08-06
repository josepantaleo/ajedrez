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
  (o && (o.style.display = "none"),
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
