      "use strict";

      import {
        formatTime,
        capitalizeFirst,
        dayOfYear,
        cpToWin,
        classifyLoss,
        levelLabel,
      } from "./utils.js";

      // PWA: registra el service worker que cachea el "app shell" (ver
      // sw.js) para que la app se pueda instalar y las lecciones/
      // ejercicios funcionen sin conexión. Los "if" de abajo evitan
      // romper en navegadores viejos sin soporte, o si se abre el
      // archivo directo desde disco (file://) en vez de servido por http.
      if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
        window.addEventListener("load", () => {
          navigator.serviceWorker.register("./sw.js").catch(() => {
            // Silencioso: si falla el registro (por ejemplo, servidor sin
            // HTTPS en un dominio que no sea localhost), la app sigue
            // funcionando normal, solo sin instalación/offline.
          });
        });
      }

      // Instrumentación temporal de rendimiento (mediciones con
      // performance.now/JSON.stringify y sus console.log asociados), usada
      // en su momento para diagnosticar cuellos de botella en el torneo.
      // Queda apagada por defecto para no gastar CPU en la ruta crítica en
      // producción; para reactivarla al depurar, poner esto en true.
      const PERF_DEBUG = false;

      // Forward declarations para variables globales usadas en
      // funciones definidas antes de su inicialización.
      let state;
      let matchChatPanelOpen;
      let gameStarted;
      let tournamentMatchActive;
      let opponentMoveHighlight;
      let explainMode;
      let lastTournamentState;
      let currentUser;
      let tournamentClockOffsetMs = 0;
      let lastTurnStartAtMs = 0;
      const TOURNAMENT_ADMIN_EMAIL = "ipem146centenario@gmail.com";

      // =========================
      // FEEDBACK TÁCTIL (sin el flash gris de Android/Chrome)
      // =========================
      // Android/Chrome pinta un "tap highlight" gris por defecto sobre
      // cualquier elemento tocable. Lo apagamos globalmente y lo
      // reemplazamos por un feedback propio (un breve "hundido": escala +
      // opacidad) para que el toque se siga sintiendo, en vez de
      // desaparecer sin más. Se inyecta una sola vez, al cargar el script.
      (function injectTapFeedbackStyles_() {
        const style = document.createElement("style");
        style.textContent = `
          html, *, *::before, *::after {
            -webkit-tap-highlight-color: transparent;
          }
          button, .btn, a, [role="button"], .avatar-bubble, .avatar-option {
            touch-action: manipulation;
          }
          button:active,
          .btn:active,
          .avatar-option:active,
          .avatar-bubble:active {
            transform: scale(0.96);
            opacity: 0.85;
            transition: transform 0.08s ease-out, opacity 0.08s ease-out;
          }
        `;
        document.head.appendChild(style);
      })();

      const PIECES = {
        wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
        bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟"
      };

      const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

      // =========================
      // AVATARES ANIMADOS (mascotes)
      // =========================
      // Cada mascota es una pieza de ajedrez "con vida": emoji + una
      // animación CSS distinta + un color propio. No dependen de imágenes
      // externas, así que funcionan offline y no pesan nada.
      const AVATAR_MASCOTS = {
        knight:  { emoji: "♞", label: "Caballo saltarín", anim: "avatar-bounce",  color1: "#7c3aed", color2: "#a78bfa" },
        pawn:    { emoji: "♟", label: "Peón valiente",    anim: "avatar-wiggle",  color1: "#2563eb", color2: "#60a5fa" },
        rook:    { emoji: "♜", label: "Torre firme",      anim: "avatar-pulse",   color1: "#059669", color2: "#34d399" },
        bishop:  { emoji: "♝", label: "Alfil astuto",     anim: "avatar-tilt",    color1: "#d97706", color2: "#fbbf24" },
        queen:   { emoji: "♛", label: "Dama veloz",       anim: "avatar-spin",    color1: "#db2777", color2: "#f472b6" },
        king:    { emoji: "♚", label: "Rey sabio",        anim: "avatar-nod",     color1: "#dc2626", color2: "#f87171" },
      };

      let avatarStylesInjected = false;
      function injectAvatarStyles_() {
        if (avatarStylesInjected) return;
        avatarStylesInjected = true;
        const style = document.createElement("style");
        style.textContent = `
          .avatar-bubble {
            display: inline-flex; align-items: center; justify-content: center;
            width: 34px; height: 34px; border-radius: 50%;
            font-size: 18px; line-height: 1; cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,.25);
            border: 2px solid rgba(255,255,255,.6);
            vertical-align: middle; margin-right: 8px;
            user-select: none; flex-shrink: 0;
            transition: transform 0.15s ease-out;
          }
          .avatar-bubble.large { width: 54px; height: 54px; font-size: 28px; }
          .avatar-bubble.static { animation: none !important; }
          .avatar-bubble:hover { transform: scale(1.08); }
          @keyframes avatar-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
          @keyframes avatar-wiggle { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(8deg)} }
          @keyframes avatar-pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
          @keyframes avatar-tilt   { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(14deg)} }
          @keyframes avatar-spin   { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
          @keyframes avatar-nod    { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(2px) rotate(-4deg)} }
          .avatar-bounce { animation: avatar-bounce 1.1s ease-in-out infinite; }
          .avatar-wiggle { animation: avatar-wiggle 1.4s ease-in-out infinite; }
          .avatar-pulse  { animation: avatar-pulse 1.3s ease-in-out infinite; }
          .avatar-tilt   { animation: avatar-tilt 1.6s ease-in-out infinite; }
          .avatar-spin   { animation: avatar-spin 3.2s linear infinite; }
          .avatar-nod    { animation: avatar-nod 1.2s ease-in-out infinite; }
          /* Quien tenga activado "reducir movimiento" en su sistema no
             tiene por qué ver 6 mascotas dando vueltas sin parar en cada
             pantalla; se les congela la pose (sin perder el color/forma
             que identifica a cada una). */
          @media (prefers-reduced-motion: reduce) {
            .avatar-bounce, .avatar-wiggle, .avatar-pulse,
            .avatar-tilt, .avatar-spin, .avatar-nod { animation: none; }
            .avatar-bubble:hover { transform: none; }
          }
          #avatar-picker-backdrop {
            position: fixed; inset: 0; background: rgba(0,0,0,.55);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999;
          }
          /* Antes en colores fijos (#1e1e2e / #fff), lo que dejaba el
             modal desentonando si la app tiene o suma un tema claro. Usa
             las mismas variables que ya define el resto de la app
             (--surface/--text), con el valor anterior como fallback por
             si este archivo se usa suelto sin ese tema. */
          #avatar-picker-box {
            background: var(--surface, #1e1e2e); color: var(--text, #fff);
            padding: 20px; border-radius: 14px;
            max-width: 320px; width: 90%; text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,.4);
          }
          #avatar-picker-box h3 { margin: 0 0 12px; font-size: 16px; }
          #avatar-picker-grid {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
            margin-bottom: 14px;
          }
          .avatar-option {
            display: flex; flex-direction: column; align-items: center; gap: 6px;
            padding: 8px 4px; border-radius: 10px; cursor: pointer;
            border: 2px solid transparent;
            transition: background-color 0.15s ease-out, border-color 0.15s ease-out;
          }
          .avatar-option:hover { background: var(--surface2, rgba(255,255,255,.08)); }
          .avatar-option.selected { border-color: var(--accent, #fff); background: var(--surface2, rgba(255,255,255,.08)); }
          /* Las opciones ahora llevan tabindex/role="button" (ver
             openAvatarPicker), así que necesitan un foco visible propio
             para quien navega con teclado; antes no había forma de saber
             cuál estaba seleccionada sin mouse. */
          .avatar-option:focus-visible {
            outline: 2px solid var(--accent, #fff);
            outline-offset: 2px;
          }
          .avatar-option span.opt-label { font-size: 11px; opacity: .85; }
          #avatar-picker-close {
            background: var(--surface2, #444); color: var(--text, #fff); border: none; border-radius: 8px;
            padding: 8px 16px; cursor: pointer; font-size: 13px;
            transition: filter 0.15s ease-out;
          }
          #avatar-picker-close:hover { filter: brightness(1.15); }
          #avatar-picker-close:focus-visible {
            outline: 2px solid var(--accent, #fff);
            outline-offset: 2px;
          }
        `;
        document.head.appendChild(style);
      }

      function avatarBubbleHTML_(id, opts = {}) {
        const m = AVATAR_MASCOTS[id] || AVATAR_MASCOTS.knight;
        const size = opts.large ? " large" : "";
        const still = opts.static ? " static" : "";
        const grad = `linear-gradient(135deg, ${m.color1}, ${m.color2})`;
        return `<span class="avatar-bubble${size}${still} ${m.anim}" style="background:${grad}" title="${escapeHtml_(m.label)}">${m.emoji}</span>`;
      }

      // Dibuja/actualiza el avatar del perfil (junto al nombre) y lo hace
      // clickeable para abrir el selector de mascotas.
      function renderMiniAvatar() {
        injectAvatarStyles_();
        const nameEl = document.getElementById("mini-name");
        if (!nameEl) return;
        let holder = document.getElementById("mini-avatar");
        if (!holder) {
          holder = document.createElement("span");
          holder.id = "mini-avatar";
          nameEl.parentNode.insertBefore(holder, nameEl);
        }
        holder.innerHTML = avatarBubbleHTML_(state.avatar || "knight");
        holder.onclick = openAvatarPicker;
        holder.querySelector(".avatar-bubble").onclick = openAvatarPicker;
      }

      // Dibuja el mismo mascote del jugador junto a su reloj en el
      // tablero (partida local o de torneo), para que se vea "vivo"
      // mientras juega. El rival muestra una mascota fija en gris.
      function renderBoardAvatars_() {
        injectAvatarStyles_();
        const wEl = document.getElementById("clock-w");
        const bEl = document.getElementById("clock-b");
        [wEl, bEl].forEach((el) => {
          if (!el) return;
          let av = el.querySelector(".avatar-bubble");
          if (!av) {
            el.insertAdjacentHTML("afterbegin", avatarBubbleHTML_(state.avatar || "knight"));
          }
        });
      }

      function openAvatarPicker() {
        injectAvatarStyles_();
        closeAvatarPicker_();
        const backdrop = document.createElement("div");
        backdrop.id = "avatar-picker-backdrop";
        const current = state.avatar || "knight";
        const options = Object.keys(AVATAR_MASCOTS).map((id) => {
          const sel = id === current ? " selected" : "";
          return `
            <div class="avatar-option${sel}" data-avatar="${id}" tabindex="0" role="button" aria-pressed="${id === current}" aria-label="${escapeHtml_(AVATAR_MASCOTS[id].label)}">
              ${avatarBubbleHTML_(id, { large: true })}
              <span class="opt-label">${escapeHtml_(AVATAR_MASCOTS[id].label)}</span>
            </div>`;
        }).join("");
        backdrop.innerHTML = `
          <div id="avatar-picker-box">
            <h3>🐴 Elegí tu mascota</h3>
            <div id="avatar-picker-grid">${options}</div>
            <button id="avatar-picker-close">Cerrar</button>
          </div>`;
        document.body.appendChild(backdrop);
        backdrop.addEventListener("click", (e) => {
          if (e.target === backdrop) closeAvatarPicker_();
        });
        document.addEventListener("keydown", handleAvatarPickerEscape_);
        const chooseAvatar = (opt) => {
          state.avatar = opt.dataset.avatar;
          save();
          renderMiniAvatar();
          renderBoardAvatars_();
          closeAvatarPicker_();
          toast("✓ Mascota actualizada");
        };
        backdrop.querySelectorAll(".avatar-option").forEach((opt) => {
          opt.addEventListener("click", () => chooseAvatar(opt));
          // Con tabindex/role="button" recién agregados, el div responde
          // a Enter/Espacio como cualquier botón nativo (antes ni
          // siquiera se podía llegar acá con el teclado).
          opt.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              chooseAvatar(opt);
            }
          });
        });
        document.getElementById("avatar-picker-close").addEventListener("click", closeAvatarPicker_);
      }

      function handleAvatarPickerEscape_(e) {
        if (e.key === "Escape") closeAvatarPicker_();
      }

      function closeAvatarPicker_() {
        const el = document.getElementById("avatar-picker-backdrop");
        if (el) el.remove();
        document.removeEventListener("keydown", handleAvatarPickerEscape_);
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
      let toastTimer = null;
      // Callback opcional que se ejecuta al cerrar el popup de alerta (#alert),
      // sea por el botón de acción o por tocar afuera del cuadro. Se usa para
      // que, al terminar una partida de torneo, cerrar el aviso también
      // vuelva a la pantalla del torneo (ver showTournamentResult).
      let alertOnClose_ = null;

      // Escapa texto antes de insertarlo en innerHTML (o dentro de un
      // atributo entre comillas dobles). Cualquier dato que provenga de un
      // jugador (nombre de inscripción, etc.) tiene que pasar por acá antes
      // de mostrarse: sin esto, alguien podría autoinscribirse con un
      // "nombre" que en realidad sea HTML/JS y ejecutarlo en el navegador
      // de otro usuario (admin, árbitro o quien mire la pantalla pública).
      function escapeHtml_(text) {
        return String(text == null ? "" : text).replace(/[&<>"']/g, (ch) => {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
        });
      }

      function loadState() {
        try {
          const saved = JSON.parse(localStorage.getItem("chessSchoolData"));
          return { ...DEFAULT_STATE, ...(saved || {}) };
        } catch {
          return { ...DEFAULT_STATE };
        }
      }

      function save() {
        // En modo incógnito de Safari, o si localStorage está lleno/deshabilitado,
        // setItem puede tirar una excepción. No queremos que eso rompa el resto
        // de la app (perder una jugada, un guardado, etc.), así que lo contenemos
        // acá y avisamos una sola vez por sesión.
        try {
          localStorage.setItem("chessSchoolData", JSON.stringify(state));
        } catch (err) {
          console.error("No se pudo guardar el progreso en localStorage:", err);
          if (!save._warned) {
            save._warned = true;
            toast("⚠️ No se pudo guardar tu progreso en este navegador");
          }
        }
      }

      // Reemplaza a los `toast("❌ " + err.message)` sueltos que había en cada
      // catch: además de avisarle al usuario, deja el error completo en la
      // consola (con stack) para poder diagnosticar problemas reales en
      // producción, que antes se perdían por completo.
      function showError(err, fallbackMsg) {
        console.error(err);
        const msg = err && err.message ? err.message : fallbackMsg || "Ocurrió un error inesperado";
        toast("❌ " + msg);
      }

      function toast(text, durationMs) {
        const el = document.getElementById("toast");
        el.textContent = text;
        el.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove("show"), durationMs || 2200);
      }

      function showAlert(text, variant) {
        const box = document.getElementById("alert-box");
        box.classList.remove("result-win", "result-loss", "result-draw");
        if (variant) box.classList.add("result-" + variant);
        document.getElementById("alert-box-text").textContent = text;
        document.getElementById("alert-analyze-btn").style.display = "none";
        const backBtn = document.getElementById("alert-back-to-tournament-btn");
        if (backBtn) backBtn.style.display = "none";
        const chatBtn = document.getElementById("alert-chat-btn");
        if (chatBtn) chatBtn.style.display = "none";
        alertOnClose_ = null;
        document.getElementById("alert").classList.add("show");
      }

      // Cierra el popup de alerta y, si hay un callback pendiente (ver
      // alertOnClose_), lo ejecuta. Se usa tanto para el botón de acción
      // (analizar / volver al torneo) como para el cierre tocando afuera del
      // cuadro, así el comportamiento es el mismo sin importar cómo se cierre.
      function closeAlert_() {
        document.getElementById("alert").classList.remove("show");
        const cb = alertOnClose_;
        alertOnClose_ = null;
        if (cb) cb();
      }

      function offerAnalysis(gameId) {
        const btn = document.getElementById("alert-analyze-btn");
        btn.style.display = "inline-flex";
        btn.onclick = () => {
          closeAlert_();
          openAnalysisModal(gameId);
        };
      }

      // Crea (una sola vez) el botón "Volver al torneo" dentro del popup de
      // alerta y lo deja visible. Al tocarlo se cierra el popup y se vuelve a
      // la pantalla del torneo (exitTournamentMatch), igual que si se toca
      // afuera del cuadro (ver alertOnClose_ / closeAlert_).
      function showAlertBackToTournamentButton_() {
        let btn = document.getElementById("alert-back-to-tournament-btn");
        if (!btn) {
          btn = document.createElement("button");
          btn.id = "alert-back-to-tournament-btn";
          btn.className = "btn primary";
          btn.style.marginTop = "10px";
          const analyzeBtn = document.getElementById("alert-analyze-btn");
          if (analyzeBtn && analyzeBtn.parentNode) {
            analyzeBtn.parentNode.insertBefore(btn, analyzeBtn.nextSibling);
          } else {
            document.getElementById("alert-box").appendChild(btn);
          }
        }
        btn.textContent = "🏆 Volver al torneo";
        btn.style.display = "inline-flex";
        btn.onclick = () => closeAlert_();
      }

      // Popup para un mensaje de chat que llega mientras la partida de
      // torneo todavía no arrancó (sin jugadas): en ese momento el jugador
      // probablemente ni está mirando el tablero, así que el badge del
      // botón "Chat" solo no alcanza para que se entere. No se dispara si
      // el chat está silenciado (ver matchChatMuted).
      function showChatMessagePopup(senderName, text) {
        const preview = text.length > 140 ? text.slice(0, 140) + "…" : text;
        showAlert("💬 " + senderName + ": " + preview);
        const btn = document.getElementById("alert-chat-btn");
        if (btn) {
          btn.style.display = "inline-flex";
          btn.onclick = () => {
            closeAlert_();
            if (!matchChatPanelOpen) toggleMatchChatPanel();
          };
        }
      }

      document.getElementById("alert").onclick = (e) => {
        if (e.target.id === "alert") {
          closeAlert_();
        }
      };

      // Instancia de chess.js para el juego activo
      const game = new Chess();
      let selected = null;
      let validMoves = [];
      // Activa o desactiva el resaltado de jugadas posibles al seleccionar una pieza
      let showLegalMoves = localStorage.getItem("chessShowLegalMoves") !== "off";
      // Activa o desactiva el resaltado de piezas atacadas (amenazas) en el tablero
      let showThreats = localStorage.getItem("chessShowThreats") !== "off";
      let dragCtx = null;
      let justDraggedUntil = 0;
      const DRAG_THRESHOLD = 6;

      // =========================
      // MOTOR DE SONIDO (Web Audio API, sin archivos externos)
      // =========================
      const SoundFX = (() => {
        let ctx = null;
        let enabled = true;
        let ringInterval = null; // setInterval activo del ringtone de llamada (entrante/saliente), o null si no está sonando

        function ensureCtx() {
          if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
          }
          if (ctx.state === "suspended") ctx.resume().catch(() => {});
          return ctx;
        }

        function tone(freq, start, duration, { type = "sine", gain = 0.16, glideTo = null } = {}) {
          const c = ensureCtx();
          if (!c) return;
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, c.currentTime + start);
          if (glideTo) {
            osc.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime + start + duration);
          }
          g.gain.setValueAtTime(0.0001, c.currentTime + start);
          g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
          osc.connect(g);
          g.connect(c.destination);
          osc.start(c.currentTime + start);
          osc.stop(c.currentTime + start + duration + 0.02);
        }

        function noiseHit(start, duration, gain = 0.18) {
          const c = ensureCtx();
          if (!c) return;
          const bufferSize = Math.floor(c.sampleRate * duration);
          const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
          }
          const src = c.createBufferSource();
          src.buffer = buffer;
          const filter = c.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = 900;
          const g = c.createGain();
          g.gain.setValueAtTime(gain, c.currentTime + start);
          g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
          src.connect(filter);
          filter.connect(g);
          g.connect(c.destination);
          src.start(c.currentTime + start);
        }

        const fx = {
          setEnabled(v) { enabled = v; },
          isEnabled() { return enabled; },
          unlock() { ensureCtx(); },
          move() {
            if (!enabled) return;
            tone(520, 0, 0.09, { type: "triangle", gain: 0.14 });
          },
          capture() {
            if (!enabled) return;
            noiseHit(0, 0.11, 0.22);
            tone(220, 0.01, 0.1, { type: "square", gain: 0.1 });
          },
          castle() {
            if (!enabled) return;
            tone(440, 0, 0.08, { type: "triangle", gain: 0.13 });
            tone(560, 0.08, 0.1, { type: "triangle", gain: 0.13 });
          },
          check() {
            if (!enabled) return;
            tone(740, 0, 0.09, { type: "sawtooth", gain: 0.12 });
            tone(880, 0.09, 0.12, { type: "sawtooth", gain: 0.12 });
          },
          checkmate() {
            if (!enabled) return;
            tone(660, 0, 0.14, { type: "sawtooth", gain: 0.15 });
            tone(523, 0.14, 0.14, { type: "sawtooth", gain: 0.15 });
            tone(392, 0.28, 0.32, { type: "sawtooth", gain: 0.16 });
          },
          draw() {
            if (!enabled) return;
            tone(440, 0, 0.16, { type: "sine", gain: 0.13 });
            tone(440, 0.18, 0.16, { type: "sine", gain: 0.13 });
          },
          select() {
            if (!enabled) return;
            tone(880, 0, 0.045, { type: "sine", gain: 0.06 });
          },
          chatMessage() {
            if (!enabled) return;
            tone(700, 0, 0.06, { type: "sine", gain: 0.09 });
            tone(920, 0.07, 0.08, { type: "sine", gain: 0.09 });
          },
          announcement() {
            if (!enabled) return;
            tone(660, 0, 0.1, { type: "sine", gain: 0.15 });
            tone(880, 0.12, 0.1, { type: "sine", gain: 0.15 });
            tone(1040, 0.24, 0.16, { type: "sine", gain: 0.16 });
          },
          invalid() {
            if (!enabled) return;
            tone(160, 0, 0.13, { type: "square", gain: 0.09 });
          },
          gameStart() {
            if (!enabled) return;
            tone(392, 0, 0.09, { type: "triangle", gain: 0.12 });
            tone(494, 0.09, 0.09, { type: "triangle", gain: 0.12 });
            tone(659, 0.18, 0.16, { type: "triangle", gain: 0.14 });
          },
          promote() {
            if (!enabled) return;
            tone(523, 0, 0.08, { type: "triangle", gain: 0.13 });
            tone(659, 0.08, 0.08, { type: "triangle", gain: 0.13 });
            tone(784, 0.16, 0.14, { type: "triangle", gain: 0.15 });
          },
          levelUp() {
            if (!enabled) return;
            tone(523, 0, 0.1, { type: "triangle", gain: 0.14 });
            tone(659, 0.1, 0.1, { type: "triangle", gain: 0.14 });
            tone(784, 0.2, 0.1, { type: "triangle", gain: 0.14 });
            tone(1047, 0.3, 0.28, { type: "triangle", gain: 0.17 });
          },
          // Ringtone de llamada de audio (torneo): un patrón de dos tonos tipo
          // "ring-ring" que se repite cada 2s hasta llamar a stopRing(). Sirve
          // tanto para el que llama (esperando que atiendan) como para el que
          // recibe la llamada entrante; se corta en cuanto se atiende, se
          // rechaza o se cuelga.
          startRing() {
            if (ringInterval) return; // ya está sonando, no duplicar
            const ringPattern = () => {
              if (!enabled) return;
              tone(1000, 0, 0.35, { type: "sine", gain: 0.15 });
              tone(1000, 0.45, 0.35, { type: "sine", gain: 0.15 });
            };
            ringPattern();
            ringInterval = setInterval(ringPattern, 2000);
          },
          stopRing() {
            if (ringInterval) {
              clearInterval(ringInterval);
              ringInterval = null;
            }
          },
        };
        return fx;
      })();

      // Reproduce el sonido correcto según el resultado de una jugada de chess.js
      function playSoundForMove(move, gameAfter) {
        if (!move) return;
        if (gameAfter && gameAfter.in_checkmate()) {
          SoundFX.checkmate();
          return;
        }
        if (gameAfter && gameAfter.in_check()) {
          SoundFX.check();
          return;
        }
        if (move.flags && (move.flags.includes("k") || move.flags.includes("q"))) {
          SoundFX.castle();
          return;
        }
        if (move.flags && move.flags.includes("p")) {
          SoundFX.promote();
          return;
        }
        if (move.flags && (move.flags.includes("c") || move.flags.includes("e"))) {
          SoundFX.capture();
          return;
        }
        SoundFX.move();
      }

      // Marca la última jugada para animar la pieza y la casilla al renderizar
      let justMovedAnim = null; // { from, to, captured, capturedType, capturedColor, capturedSquare, promoted }
      function markMoveForAnimation(move) {
        if (!move) return;
        const isEnPassant = !!(move.flags && move.flags.includes("e"));
        const isCapture = !!(move.flags && (move.flags.includes("c") || isEnPassant));
        justMovedAnim = {
          from: move.from,
          to: move.to,
          captured: isCapture,
          capturedType: move.captured || null,
          capturedColor: move.color === "w" ? "b" : "w",
          capturedSquare: isEnPassant ? (move.to[0] + move.from[1]) : move.to,
          promoted: !!(move.flags && move.flags.includes("p")),
        };
      }

      // =========================
      // IA & STOCKFISH
      // =========================
      let botEnabled = false;
      let botColor = "b";
      let botDifficulty = "medio";
      let botThinking = false;
      let sfWorker = null;

      function initStockfishWorker() {
        try {
          sfWorker = new Worker("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js");
        } catch (e) {
          // Fallback usando Blob si hay problemas de CORS con Web Workers externos
          try {
            fetch("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js")
              .then(res => res.text())
              .then(code => {
                const blob = new Blob([code], { type: "application/javascript" });
                sfWorker = new Worker(URL.createObjectURL(blob));
              });
          } catch(err) {
            console.error("No se pudo iniciar Stockfish", err);
          }
        }
      }
      // El worker de Stockfish (motor contra la IA) ya NO se arranca acá al
      // cargar la página: eso descargaba y ponía en marcha el motor
      // (WASM/JS pesado desde CDN) en TODAS las pantallas, incluidas
      // partidas de torneo online o "pasar y jugar" donde nunca se usa. Se
      // inicializa una sola vez, de forma perezosa, la primera vez que
      // realmente hace falta (ver ensureStockfishWorker(), llamada al
      // activar el modo "vs IA" y antes de pedirle una jugada al bot).
      function ensureStockfishWorker() {
        if (!sfWorker) initStockfishWorker();
      }

      function getStockfishSkill(difficulty) {
        switch(difficulty) {
          case 'facil': return 2;
          case 'medio': return 8;
          case 'dificil': return 15;
          case 'experto': return 20;
          default: return 8;
        }
      }

      function getStockfishDepth(difficulty) {
        switch(difficulty) {
          case 'facil': return 2;
          case 'medio': return 5;
          case 'dificil': return 10;
          case 'experto': return 14;
          default: return 5;
        }
      }

      function getStockfishMoveTime(difficulty) {
        switch(difficulty) {
          case 'facil': return 150;
          case 'medio': return 350;
          case 'dificil': return 700;
          case 'experto': return 1100;
          default: return 350;
        }
      }

      function maybeTriggerBotMove() {
        if (tournamentMatchActive) {
          if (opponentMoveHighlight) {
            clearOpponentMoveHighlight();
            render();
          }
          syncTournamentMove();
          return;
        }
        if (!botEnabled || !gameStarted || game.game_over() || game.turn() !== botColor) return;
        ensureStockfishWorker();
        botThinking = true;
        render();

        if (!sfWorker) {
          // Fallback aleatorio si Stockfish no cargó
          setTimeout(() => {
            const moves = game.ugly_moves({ verbose: true });
            if (moves.length > 0) {
              const m = moves[Math.floor(Math.random() * moves.length)];
              const fenBeforeMove = game.fen();
              const rndMove = game.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
              addIncrement();
              markMoveForAnimation(rndMove);
              playSoundForMove(rndMove, game);
              showMoveExplanation(fenBeforeMove, rndMove);
              botThinking = false;
              render();
              checkGameOver();
            }
          }, 120);
          return;
        }

        const skill = getStockfishSkill(botDifficulty);
        const depth = getStockfishDepth(botDifficulty);
        const movetime = getStockfishMoveTime(botDifficulty);

        sfWorker.onmessage = function(e) {
          const line = e.data;
          if (typeof line === 'string' && line.startsWith('bestmove')) {
            const bestMove = line.split(' ')[1];
            if (bestMove && bestMove.length >= 4) {
              const from = bestMove.substring(0, 2);
              const to = bestMove.substring(2, 4);
              const promotion = bestMove.length > 4 ? bestMove[4] : undefined;
              
              const fenBeforeMove = game.fen();
              const sfMove = game.move({ from, to, promotion: promotion || 'q' });
              addIncrement();
              markMoveForAnimation(sfMove);
              playSoundForMove(sfMove, game);
              showMoveExplanation(fenBeforeMove, sfMove);
            }
            botThinking = false;
            render();
            checkGameOver();
          }
        };

        sfWorker.postMessage('uci');
        sfWorker.postMessage(`setoption name Skill Level value ${skill}`);
        sfWorker.postMessage(`position fen ${game.fen()}`);
        sfWorker.postMessage(`go depth ${depth} movetime ${movetime}`);
      }

      function updateModeUI() {
        const modeSelect = document.getElementById("mode");
        if (!modeSelect) return;
        const isBot = modeSelect.value === "bot";
        const difficultyLabel = document.getElementById("bot-difficulty-label");
        const colorLabel = document.getElementById("bot-color-label");
        if (difficultyLabel) difficultyLabel.style.display = isBot ? "" : "none";
        if (colorLabel) colorLabel.style.display = isBot ? "" : "none";
        const pvpFlipLabel = document.getElementById("pvp-flip-label");
        if (pvpFlipLabel) pvpFlipLabel.style.display = isBot ? "none" : "";
      }

      gameStarted = false;

      // -------- Partida de torneo jugada en el tablero grande de "Jugar" --------
      // (declaradas acá arriba, junto con el resto del estado, porque
      // render() ya las usa y se llama mucho antes de llegar a donde
      // estaban originalmente declaradas más abajo en el archivo)
      tournamentMatchActive = false;
      let tournamentMatchCtx = null; // {round, board, whiteName, blackName, whiteEmail, blackEmail}
      let tournamentMatchBusy = false;
      let tournamentResultShown = false; // evita mostrar el popup de fin de partida más de una vez
      let tournamentClockTimer = null; // interval del reloj visual de la partida de torneo abierta
      let tournamentCurrentGameRow = null; // última fila de "games" conocida para la partida abierta

      // --- Chat de partida (mensajes entre los dos jugadores de una mesa) ---
      // Vive en una subcolección del documento de la partida
      // (torneos/{room}/games/{round}_{board}/chat), no en el documento de
      // la partida en sí: así un mensaje de chat no compite con las
      // escrituras de cada jugada (mismo motivo por el que cada mesa ya
      // tiene su propio documento, ver el comentario junto a
      // gamesCollectionRef más arriba).
      let matchChatUnsub = null;
      let matchChatMessages = [];
      matchChatPanelOpen = false;
      let matchChatUnreadCount = 0;
      // true mientras no llegó todavía el primer snapshot de la mesa actual:
      // sirve para no sonar ni mostrar popup por todo el historial que ya
      // existía al abrir/reabrir la mesa, solo por mensajes realmente nuevos.
      let matchChatFirstSnapshot = true;
      // Silencia el sonido y el popup de mensajes nuevos del chat de mesa
      // (el badge de no leídos se sigue viendo igual). Es por dispositivo,
      // no por mesa: una vez silenciado queda así para todas las partidas.
      let matchChatMuted = localStorage.getItem("chessMatchChatMuted") === "on";

      // Llamada de audio 1 a 1 entre los dos jugadores de la mesa (WebRTC).
      // Se señaliza a través de Firestore (torneos/{room}/games/{round}_{board}/call/session),
      // igual que el chat usa su propia subcolección: cada mesa tiene su
      // propia sesión de llamada, así que no se pisa con otras mesas.
      // No hay servidor TURN configurado (solo STUN público de Google), por
      // lo que en redes muy restrictivas la conexión directa puede fallar;
      // para el caso normal (dos alumnos en internet doméstico o en la
      // misma red escolar) alcanza.
      const RTC_ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
      let callPc = null; // RTCPeerConnection activa (llamando, sonando o en curso)
      let callLocalStream = null;
      let callDocUnsub = null;
      let callCandidatesUnsub = [];
      let callState = "idle"; // idle | outgoing | incoming | active
      let callIsMuted = false;
      let callPendingOffer = null; // oferta SDP del rival mientras suena una llamada entrante, hasta que se acepta o rechaza
      let tournamentTimeoutClaimBusy = false; // evita reclamar la bandera caída más de una vez a la vez

      function animateMoveTransition(board, anim, movedPieceEl, capturedSquareEl) {
        const fromEl = anim.from ? board.querySelector(`[data-square="${anim.from}"]`) : null;
        const toEl = anim.to ? board.querySelector(`[data-square="${anim.to}"]`) : null;

        if (movedPieceEl && fromEl && toEl && anim.from !== anim.to) {
          const fromRect = fromEl.getBoundingClientRect();
          const toRect = toEl.getBoundingClientRect();
          const dx = fromRect.left - toRect.left;
          const dy = fromRect.top - toRect.top;

          movedPieceEl.style.transition = "none";
          movedPieceEl.style.transform = `translate(${dx}px, ${dy}px)`;
          // Forzar reflow para aplicar la posición inicial antes de animar el desplazamiento
          void movedPieceEl.offsetWidth;
          movedPieceEl.style.transition = "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)";
          movedPieceEl.style.transform = "translate(0, 0)";

          movedPieceEl.addEventListener("transitionend", () => {
            movedPieceEl.style.transition = "";
            movedPieceEl.style.transform = "";
            if (anim.promoted) {
              movedPieceEl.classList.add("piece-promoted");
              movedPieceEl.addEventListener("animationend", () => {
                movedPieceEl.classList.remove("piece-promoted");
              }, { once: true });
            }
          }, { once: true });
        } else if (movedPieceEl && anim.promoted) {
          movedPieceEl.classList.add("piece-promoted");
        }

        if (anim.captured && capturedSquareEl && anim.capturedType && anim.capturedColor) {
          const ghost = document.createElement("div");
          ghost.className = "piece piece-captured-ghost " + (anim.capturedColor === "w" ? "white-piece" : "black-piece");
          ghost.textContent = PIECES[anim.capturedColor + anim.capturedType.toUpperCase()];
          ghost.dataset.piece = anim.capturedType.toUpperCase();
          capturedSquareEl.appendChild(ghost);
          setTimeout(() => ghost.remove(), 280);
        }
      }

      // Calcula la posición (0-100%) de una casilla dentro de la grilla
      // del tablero tal como quedó dibujada en este render (respeta el
      // flip del tablero, ya que "rows"/"cols" reflejan el orden real de
      // inserción en el DOM).
      function squareDisplayPercent(sqName, rows, cols, squares) {
        const file = squares.indexOf(sqName[0]);
        const rank = parseInt(sqName[1], 10);
        const r = 8 - rank;
        const displayRow = rows.indexOf(r);
        const displayCol = cols.indexOf(file);
        if (displayRow === -1 || displayCol === -1) return null;
        return { x: (displayCol + 0.5) * 12.5, y: (displayRow + 0.5) * 12.5 };
      }

      // Construye una flecha SVG semitransparente que marca la "ruta" de
      // una jugada (de dónde a dónde se movió la pieza). Se usa para que,
      // en una partida de torneo, el rival vea claramente por dónde se
      // movió la pieza cuando llega la jugada por Firebase.
      function buildOpponentMoveArrow(fromSq, toSq, rows, cols, squares) {
        const p1 = squareDisplayPercent(fromSq, rows, cols, squares);
        const p2 = squareDisplayPercent(toSq, rows, cols, squares);
        if (!p1 || !p2) return null;

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.classList.add("opp-move-arrow-overlay");

        const defs = document.createElementNS(svgNS, "defs");
        const marker = document.createElementNS(svgNS, "marker");
        marker.setAttribute("id", "oppMoveArrowHead");
        marker.setAttribute("viewBox", "0 0 10 10");
        marker.setAttribute("refX", "7");
        marker.setAttribute("refY", "5");
        marker.setAttribute("markerWidth", "4.2");
        marker.setAttribute("markerHeight", "4.2");
        marker.setAttribute("orient", "auto-start-reverse");
        const arrowHeadPath = document.createElementNS(svgNS, "path");
        arrowHeadPath.setAttribute("d", "M0,0 L10,5 L0,10 z");
        arrowHeadPath.setAttribute("fill", "rgba(70, 160, 255, 0.9)");
        marker.appendChild(arrowHeadPath);
        defs.appendChild(marker);
        svg.appendChild(defs);

        // Acortamos un poco la línea para que la punta de flecha no quede
        // tapada por la pieza en la casilla de destino.
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const shorten = 4;
        const endX = p2.x - (dx / len) * shorten;
        const endY = p2.y - (dy / len) * shorten;

        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", p1.x);
        line.setAttribute("y1", p1.y);
        line.setAttribute("x2", endX);
        line.setAttribute("y2", endY);
        line.setAttribute("stroke", "rgba(70, 160, 255, 0.9)");
        line.setAttribute("stroke-width", "2.4");
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("marker-end", "url(#oppMoveArrowHead)");
        svg.appendChild(line);

        return svg;
      }

      // Calcula el conjunto de casillas ocupadas por piezas de "colorToMove"
      // que serían alcanzables si le tocara mover a ese color en esta posición.
      // Se usa para deducir qué piezas están bajo ataque (amenazadas).
      function computeReachableSquares(fen, colorToMove) {
        const parts = fen.split(" ");
        parts[1] = colorToMove;
        parts[3] = "-"; // se descarta la captura al paso al invertir el turno
        try {
          const temp = new Chess(parts.join(" "));
          const moves = temp.moves({ verbose: true });
          const set = new Set();
          for (const m of moves) set.add(m.to);
          return set;
        } catch (e) {
          return new Set();
        }
      }

      // Devuelve el conjunto de casillas cuya pieza está atacada por el rival.
      // Cacheado por FEN: calcular esto implica crear 2 instancias nuevas de
      // Chess y generar TODAS las jugadas legales de cada bando, algo caro
      // para hacerlo en cada render si la posición no cambió (por ej. al
      // solo seleccionar una pieza, sin mover todavía).
      let threatenedSquaresCache = { fen: null, result: null };
      function getThreatenedSquares(fen) {
        if (threatenedSquaresCache.fen === fen) return threatenedSquaresCache.result;
        const whiteTargets = computeReachableSquares(fen, "w");
        const blackTargets = computeReachableSquares(fen, "b");
        const temp = new Chess(fen);
        const threatened = new Set();
        const squares = ["a", "b", "c", "d", "e", "f", "g", "h"];
        for (const file of squares) {
          for (let rank = 1; rank <= 8; rank++) {
            const sq = file + rank;
            const p = temp.get(sq);
            if (!p) continue;
            if (p.color === "w" && blackTargets.has(sq)) threatened.add(sq);
            if (p.color === "b" && whiteTargets.has(sq)) threatened.add(sq);
          }
        }
        threatenedSquaresCache = { fen, result: threatened };
        return threatened;
      }

      // Resalta por unos segundos la casilla de origen y destino de la
      // última jugada recibida del rival en una partida de torneo (ver
      // handleLiveMatchUpdate), y dibuja la flecha de la ruta en render().
      // Declarada acá arriba, antes de render(), porque render() se llama
      // muy temprano al cargar la página (antes de que existiera esta
      // variable si se declaraba más abajo, lo que rompía toda la carga).
      opponentMoveHighlight = null; // { from, to }
      let opponentMoveHighlightTimer = null;

      function clearOpponentMoveHighlight() {
        clearTimeout(opponentMoveHighlightTimer);
        opponentMoveHighlightTimer = null;
        opponentMoveHighlight = null;
      }

      // Casillas del tablero persistidas entre renders. Antes CADA jugada
      // (propia o recién llegada del rival por Firebase) destruía las 64
      // casillas (board.innerHTML = "") y las volvía a crear desde cero,
      // con sus etiquetas de coordenadas y su listener de click, aunque lo
      // único que cambiara fuera qué pieza está en qué casilla. Eso es
      // justo lo que más se nota en un torneo online, donde el tablero se
      // refresca en cada snapshot de Firestore. Ahora solo se reconstruye
      // el tablero entero cuando cambia la orientación (flip) o la
      // primera vez; el resto de las jugadas reutiliza las mismas 64
      // casillas y solo actualiza sus clases y la pieza que contienen.
      let boardSquareEls_ = null; // Map<sqName, HTMLElement>
      let boardFlipState_ = null;

      function render() {
        const board = document.getElementById("board");
        const boardFrameEl = board.closest(".board-frame");
        if (boardFrameEl) boardFrameEl.classList.toggle("thinking", !!botThinking);
        const isCheck = game.in_check();
        const turn = game.turn();
        // En una partida de torneo no se resaltan amenazas ni se explican
        // jugadas (esas ayudas son solo para practicar/estudiar), aunque el
        // checkbox haya quedado marcado de una sesión anterior.
        const threatsEnabled =
          !tournamentMatchActive &&
          (document.getElementById("toggle-threats") ? document.getElementById("toggle-threats").checked : showThreats);
        const threatenedSquares = threatsEnabled ? getThreatenedSquares(game.fen()) : null;

        const pvpFlipEl = document.getElementById("pvp-flip");
        const pvpAutoFlip = !!(pvpFlipEl && pvpFlipEl.checked);
        // En partidas de torneo cada jugador está en su propia pantalla,
        // así que el tablero NO debe rotar cuando cambia el turno (eso
        // solo tiene sentido en "pasar y jugar" local). Se fija según el
        // color con el que juega la persona (blancas abajo si juega
        // blancas, negras abajo si juega negras; espectadores ven blancas abajo).
        const isFlipped = tournamentMatchActive
          ? tournamentMyColor() === "b"
          : botEnabled
          ? botColor === "w"
          : (pvpAutoFlip && turn === "b");
        const rows = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
        const cols = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

        const squares = ['a','b','c','d','e','f','g','h'];
        let movedPieceEl = null;
        let capturedSquareEl = null;

        // Antes esto se llamaba adentro del loop (64 veces por render, o sea
        // se reconstruía el historial completo de la partida 64 veces cada
        // vez que se movía una pieza). Se calcula una sola vez acá afuera.
        const fullHistory = game.history({ verbose: true });
        const lastMove = fullHistory.length > 0 ? fullHistory[fullHistory.length - 1] : null;

        // La flecha de jugada del rival es el único hijo de #board que no
        // es una casilla; se saca siempre acá (se vuelve a agregar más
        // abajo si corresponde) para que no estorbe al reutilizar las 64
        // casillas ni quede una flecha vieja pegada.
        const oldArrow = board.querySelector(".opp-move-arrow-overlay");
        if (oldArrow) oldArrow.remove();

        const needsRebuild =
          !boardSquareEls_ || boardFlipState_ !== isFlipped || board.children.length !== 64;

        if (needsRebuild) {
          board.innerHTML = "";
          boardSquareEls_ = new Map();
          for (const r of rows) {
            for (const c of cols) {
              const sqName = squares[c] + (8 - r);
              const square = document.createElement("div");
              square.className = "square " + ((r + c) % 2 ? "dark" : "light");
              square.dataset.square = sqName;
              // Sin esto, el navegador espera ~300ms después de un tap para
              // descartar un posible doble-tap-para-zoom antes de disparar
              // "click" (retraso clásico de touch en mobile). El arrastre de
              // piezas ya es instantáneo porque usa pointerdown/pointermove
              // directamente, pero un simple toque para seleccionar/mover
              // una casilla dependía de ese "click" con delay. Esto lo saca.
              square.style.touchAction = "manipulation";

              if (c === (isFlipped ? 7 : 0)) {
                const rank = document.createElement("span");
                rank.className = "coord rank";
                rank.textContent = 8 - r;
                square.appendChild(rank);
              }
              if (r === (isFlipped ? 0 : 7)) {
                const file = document.createElement("span");
                file.className = "coord file";
                file.textContent = squares[c];
                square.appendChild(file);
              }

              square.onclick = () => clickSquare(sqName);
              board.appendChild(square);
              boardSquareEls_.set(sqName, square);
            }
          }
          boardFlipState_ = isFlipped;
        }

        for (const [sqName, square] of boardSquareEls_) {
          // La casilla se reutiliza de un render al otro, así que primero
          // se limpian todas las clases que dependen de la posición actual
          // (si no, quedarían pegadas las de la jugada anterior).
          square.classList.remove(
            "selected", "last", "opp-move", "check", "hint", "threat", "capture-flash"
          );
          const oldPiece = square.querySelector(".piece:not(.piece-captured-ghost)");
          if (oldPiece) oldPiece.remove();

          if (selected === sqName) square.classList.add("selected");

          if (lastMove && (lastMove.from === sqName || lastMove.to === sqName)) {
            square.classList.add("last");
          }

          // Partidas de torneo: al recibir la jugada del rival se recarga
          // el FEN y se pierde el historial local, así que la casilla
          // "last" de arriba no alcanza a marcarse. Usamos en su lugar
          // este resaltado temporal (se apaga solo a los pocos segundos).
          if (opponentMoveHighlight && (opponentMoveHighlight.from === sqName || opponentMoveHighlight.to === sqName)) {
            square.classList.add("opp-move");
          }

          const pieceObj = game.get(sqName);
          if (isCheck && pieceObj && pieceObj.type === 'k' && pieceObj.color === turn) {
            square.classList.add("check");
          }

          if (validMoves.includes(sqName) && showLegalMoves) {
            square.classList.add("hint");
          }

          if (pieceObj) {
            if (threatenedSquares && threatenedSquares.has(sqName)) {
              square.classList.add("threat");
            }
            const pieceEl = document.createElement("div");
            pieceEl.className = "piece " + (pieceObj.color === "w" ? "white-piece" : "black-piece");
            pieceEl.textContent = PIECES[pieceObj.color + pieceObj.type.toUpperCase()];
            pieceEl.dataset.piece = pieceObj.type.toUpperCase();
            pieceEl.style.touchAction = "manipulation";
            square.appendChild(pieceEl);
            attachPieceDrag(pieceEl, sqName);
            if (justMovedAnim && justMovedAnim.to === sqName) {
              movedPieceEl = pieceEl;
            }
          }

          if (justMovedAnim && justMovedAnim.captured && justMovedAnim.capturedSquare === sqName) {
            capturedSquareEl = square;
          }

          if (justMovedAnim && justMovedAnim.to === sqName && justMovedAnim.captured) {
            square.classList.add("capture-flash");
          }
        }

        // Flecha que traza la ruta (origen → destino) de la última jugada
        // del rival recibida por Firebase, mientras dure el resaltado
        // temporal (ver opponentMoveHighlight / handleLiveMatchUpdate).
        if (opponentMoveHighlight && opponentMoveHighlight.from && opponentMoveHighlight.to) {
          const arrowSvg = buildOpponentMoveArrow(opponentMoveHighlight.from, opponentMoveHighlight.to, rows, cols, squares);
          if (arrowSvg) board.appendChild(arrowSvg);
        }

        if (justMovedAnim) {
          animateMoveTransition(board, justMovedAnim, movedPieceEl, capturedSquareEl);
        }

        justMovedAnim = null;

        renderMoves();
        renderCapturedMaterial();
        updateEvalBar();

        const statusText = !gameStarted
          ? "Pulsa 'Iniciar partida' para comenzar"
          : botThinking
            ? "🤖 La IA está pensando…"
            : game.game_over()
              ? "Partida terminada"
              : `Turno de las ${turn === "w" ? "Blancas" : "Negras"}${isCheck ? " · ¡Jaque!" : ""}`;

        document.getElementById("status").textContent = statusText;
        updateClockDisplay();
      }

      function renderCapturedMaterial() {
        const capturedWEl = document.getElementById("captured-w");
        const capturedBEl = document.getElementById("captured-b");
        const capturedWFloatEl = document.getElementById("captured-w-float");
        const capturedBFloatEl = document.getElementById("captured-b-float");
        if (!capturedWEl && !capturedBEl && !capturedWFloatEl && !capturedBFloatEl) return; // esta pantalla no tiene el panel (ej. análisis)

        // IMPORTANTE: no usamos game.history() para esto. En una partida de
        // torneo, cada actualización llega como un FEN nuevo y se carga con
        // game.load(gameRow.fen) (ver handleLiveMatchUpdate / enterTournamentMatch),
        // y chess.js BORRA el historial de jugadas al hacer .load(). Si esta
        // función dependiera del historial, en modo torneo siempre mostraría
        // 0 capturas. En cambio, calculamos el material comparando la
        // posición actual contra el set inicial de piezas: eso funciona
        // igual sin importar cómo se llegó a esa posición (jugada a jugada
        // o cargando un FEN), o sea, en los tres modos (IA, pasar y jugar,
        // torneo).
        const vals = { p: 1, n: 3, b: 3, r: 5, q: 9 };
        const order = ["q", "r", "b", "n", "p"];
        const STANDARD = { p: 8, n: 2, b: 2, r: 2, q: 1 };

        const board = game.board();
        const counts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
        let whiteValue = 0;
        let blackValue = 0;
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p || p.type === "k") continue;
            counts[p.color][p.type]++;
            if (p.color === "w") whiteValue += vals[p.type];
            else blackValue += vals[p.type];
          }
        }

        function missingFor(color) {
          // Damas "de más" (coronación) no cuentan como pérdida de peón:
          // ese peón no fue capturado, se transformó.
          const extraQueens = Math.max(0, counts[color].q - STANDARD.q);
          const missing = {};
          for (const t of order) missing[t] = Math.max(0, STANDARD[t] - counts[color][t]);
          missing.p = Math.max(0, missing.p - extraQueens);
          return missing;
        }

        const missingWhite = missingFor("w"); // piezas blancas ausentes → las capturaron las negras
        const missingBlack = missingFor("b"); // piezas negras ausentes → las capturaron las blancas
        const diff = whiteValue - blackValue; // ventaja de material actual (+ = ventaja blancas)

        function glyphsHtml(missing, pieceColor) {
          let html = "";
          for (const t of order) {
            for (let i = 0; i < missing[t]; i++) {
              html += `<span style="font-size:16px; line-height:1; color:var(--text); opacity:0.85;">${PIECES[pieceColor + t.toUpperCase()]}</span>`;
            }
          }
          return html;
        }

        function advantageHtml(amount) {
          return amount > 0
            ? `<span style="font-size:12px; font-weight:600; color:var(--text); margin-left:4px;">+${amount}</span>`
            : "";
        }

        // Piezas negras capturadas se muestran del lado de las blancas (lo
        // que ganaron), y viceversa.
        const wHtml = glyphsHtml(missingBlack, "b") + advantageHtml(diff > 0 ? diff : 0);
        const bHtml = glyphsHtml(missingWhite, "w") + advantageHtml(diff < 0 ? -diff : 0);
        if (capturedWEl) capturedWEl.innerHTML = wHtml;
        if (capturedBEl) capturedBEl.innerHTML = bHtml;
        if (capturedWFloatEl) capturedWFloatEl.innerHTML = wHtml;
        if (capturedBFloatEl) capturedBFloatEl.innerHTML = bHtml;
      }

      function updateEvalBar() {
        // Evaluación básica basada en material con chess.js
        const board = game.board();
        let score = 0;
        const vals = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        for (let r=0; r<8; r++) {
          for (let c=0; c<8; c++) {
            const p = board[r][c];
            if (p) {
              const val = vals[p.type];
              score += (p.color === 'w' ? val : -val);
            }
          }
        }
        const percentage = Math.max(5, Math.min(95, 50 + score * 5));
        document.getElementById("eval-bar").style.width = percentage + "%";
      }

      // Cuántas medias-jugadas ya están pintadas en el panel de jugadas.
      // Permite que renderMoves() solo agregue lo nuevo en vez de tirar
      // abajo y reconstruir toda la lista en cada jugada.
      let renderedMoveCount = 0;

      function renderMoves() {
        const container = document.getElementById("moves");
        const emptyMsg = document.getElementById("moves-empty");
        const countEl = document.getElementById("moves-count");

        const verboseHistory = game.history({ verbose: true });
        if (countEl) countEl.textContent = verboseHistory.length;

        if (!verboseHistory.length) {
          container.querySelectorAll(".move-row").forEach((el) => el.remove());
          renderedMoveCount = 0;
          if (emptyMsg) emptyMsg.style.display = "";
          return;
        }
        if (emptyMsg) emptyMsg.style.display = "none";

        const buildMoveSpan = (m) => {
          const span = document.createElement("span");
          span.className = "move";
          if (m.captured) span.classList.add("move-capture");
          if (m.san.includes("+") || m.san.includes("#")) span.classList.add("move-check");
          const icon = document.createElement("span");
          icon.className = "move-icon";
          icon.textContent = PIECES[m.color + m.piece.toUpperCase()] || "";
          const text = document.createElement("span");
          text.textContent = m.san;
          span.append(icon, text);
          return span;
        };

        // Si el historial se achicó (partida nueva, se cargó otro FEN, etc.)
        // no hay forma de "agregar" de forma incremental: reconstruimos todo.
        if (verboseHistory.length < renderedMoveCount) {
          container.querySelectorAll(".move-row").forEach((el) => el.remove());
          renderedMoveCount = 0;
        }

        const prevCurrent = container.querySelector(".move-row.current-move");
        if (prevCurrent) prevCurrent.classList.remove("current-move");

        let startIndex = renderedMoveCount;

        // La última fila pintada puede tener solo la jugada blanca (le falta
        // la negra): completarla en vez de crear una fila nueva.
        if (startIndex % 2 === 1 && startIndex < verboseHistory.length) {
          const rows = container.querySelectorAll(".move-row");
          const lastRow = rows[rows.length - 1];
          if (lastRow) {
            lastRow.replaceChild(buildMoveSpan(verboseHistory[startIndex]), lastRow.children[2]);
            startIndex++;
          }
        }

        for (let i = startIndex; i < verboseHistory.length; i += 2) {
          const row = document.createElement("div");
          row.className = "move-row";
          const num = document.createElement("span");
          num.className = "move-num";
          num.textContent = Math.floor(i / 2) + 1 + ".";
          row.appendChild(num);
          row.appendChild(buildMoveSpan(verboseHistory[i]));
          row.appendChild(verboseHistory[i + 1] ? buildMoveSpan(verboseHistory[i + 1]) : document.createElement("span"));
          container.appendChild(row);
        }

        renderedMoveCount = verboseHistory.length;

        const rows = container.querySelectorAll(".move-row");
        if (rows.length) rows[rows.length - 1].classList.add("current-move");

        container.scrollTop = container.scrollHeight;
      }

      function attachPieceDrag(pieceEl, sqName) {
        pieceEl.addEventListener("pointerdown", (e) => {
          if (e.button !== undefined && e.button !== 0) return;
          if (!gameStarted || game.game_over() || botThinking) return;
          if (botEnabled && game.turn() === botColor) return;
          if (tournamentMatchActive && game.turn() !== tournamentMyColor()) return;
          if (tournamentMatchActive && tournamentClockWaitingForBothPlayers()) {
            toast("⏳ Esperando a que el rival entre a la partida.");
            return;
          }
          if (tournamentMatchActive && tournamentCurrentGameRow && tournamentCurrentGameRow.status === "suspended") {
            toast("⏸️ El árbitro suspendió esta partida.");
            return;
          }
          const piece = game.get(sqName);
          if (!piece || piece.color !== game.turn()) return;

          const rect = pieceEl.getBoundingClientRect();
          dragCtx = {
            from: sqName,
            pieceEl,
            startX: e.clientX,
            startY: e.clientY,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            width: rect.width,
            height: rect.height,
            moved: false,
            currentDropEl: null,
          };
          window.addEventListener("pointermove", onPieceDragMove);
          window.addEventListener("pointerup", onPieceDragUp, { once: true });
        });
      }

      // Actualiza SOLO las clases "selected" y "hint" de las casillas que ya
      // existen en el DOM, sin reconstruir el tablero entero (eso es lo que
      // hace render(), incluyendo recrear las 64 casillas y sus listeners).
      // Se usa en los momentos en que lo único que cambia es qué pieza está
      // seleccionada / qué jugadas se resaltan (arrancar un arrastre, click
      // de selección) — no cuando cambia la posición real. Mucho más
      // rápido, y no destruye la pieza que se esté arrastrando.
      function updateSelectionHighlights() {
        const board = document.getElementById("board");
        if (!board) return;
        board.querySelectorAll(".square.selected").forEach((sq) => sq.classList.remove("selected"));
        board.querySelectorAll(".square.hint").forEach((sq) => sq.classList.remove("hint"));
        if (selected) {
          const originEl = board.querySelector(`.square[data-square="${selected}"]`);
          if (originEl) originEl.classList.add("selected");
        }
        if (showLegalMoves) {
          for (const sq of validMoves) {
            const el = board.querySelector(`.square[data-square="${sq}"]`);
            if (el) el.classList.add("hint");
          }
        }
      }

      function onPieceDragMove(e) {
        if (!dragCtx) return;
        const dx = e.clientX - dragCtx.startX;
        const dy = e.clientY - dragCtx.startY;

        if (!dragCtx.moved) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          dragCtx.moved = true;

          selected = dragCtx.from;
          const moves = game.moves({ square: dragCtx.from, verbose: true });
          validMoves = moves.map((m) => m.to);
          SoundFX.select();
          // Antes acá se llamaba a render() completo (reconstruye las 64
          // casillas y todos sus listeners) solo para pintar el resaltado
          // de jugadas posibles, justo en el instante más sensible a la
          // latencia. Encima destruía la pieza que se estaba arrastrando,
          // obligando a "recuperarla" del DOM reconstruido. Ahora solo
          // tocamos las clases CSS que cambiaron, y seguimos arrastrando la
          // MISMA pieza que ya teníamos agarrada.
          updateSelectionHighlights();
          const sqEl = dragCtx.pieceEl.closest(".square");
          dragCtx.pieceEl.classList.add("dragging");
          dragCtx.pieceEl.style.width = dragCtx.width + "px";
          dragCtx.pieceEl.style.height = dragCtx.height + "px";
          if (sqEl) sqEl.classList.add("drag-origin");
        }

        if (!dragCtx.pieceEl) return;
        dragCtx.pieceEl.style.left = e.clientX - dragCtx.offsetX + "px";
        dragCtx.pieceEl.style.top = e.clientY - dragCtx.offsetY + "px";

        dragCtx.pieceEl.style.pointerEvents = "none";
        const under = document.elementFromPoint(e.clientX, e.clientY);
        dragCtx.pieceEl.style.pointerEvents = "";
        const squareEl = under ? under.closest(".square") : null;

        if (dragCtx.currentDropEl && dragCtx.currentDropEl !== squareEl) {
          dragCtx.currentDropEl.classList.remove("drop-target");
        }
        if (squareEl && validMoves.includes(squareEl.dataset.square)) {
          squareEl.classList.add("drop-target");
          dragCtx.currentDropEl = squareEl;
        } else {
          dragCtx.currentDropEl = null;
        }
      }

      // Determina si un movimiento de humano es una coronación de peón,
      // es decir si hay que preguntarle qué pieza quiere antes de aplicar el move.
      function isPromotionMove(chessInstance, from, to) {
        const piece = chessInstance.get(from);
        if (!piece || piece.type !== "p") return false;
        const rank = to[1];
        return rank === "8" || rank === "1";
      }

      // Muestra el popup de coronación y devuelve una Promise que resuelve
      // con la letra de la pieza elegida ("q", "r", "b" o "n").
      function askPromotion(color) {
        return new Promise((resolve) => {
          const overlay = document.getElementById("promo");
          const box = document.getElementById("promo-box");
          if (!overlay || !box) {
            resolve("q");
            return;
          }
          const options = [
            { code: "q", label: "Dama" },
            { code: "r", label: "Torre" },
            { code: "b", label: "Alfil" },
            { code: "n", label: "Caballo" },
          ];
          box.innerHTML = "";
          const title = document.createElement("div");
          title.className = "promo-title";
          title.textContent = "Elegí la pieza para coronar";
          box.appendChild(title);
          options.forEach((opt) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = PIECES[color + opt.code.toUpperCase()];
            btn.setAttribute("aria-label", opt.label);
            btn.title = opt.label;
            btn.addEventListener(
              "click",
              () => {
                overlay.classList.remove("show");
                resolve(opt.code);
              },
              { once: true }
            );
            box.appendChild(btn);
          });
          overlay.classList.add("show");
        });
      }

      async function onPieceDragUp(e) {
        window.removeEventListener("pointermove", onPieceDragMove);
        if (!dragCtx) return;
        const ctx = dragCtx;
        dragCtx = null;

        if (!ctx.moved) return;

        justDraggedUntil = Date.now() + 300;

        const under = document.elementFromPoint(e.clientX, e.clientY);
        const squareEl = under ? under.closest(".square") : null;
        const to = squareEl ? squareEl.dataset.square : null;

        document.querySelectorAll(".square.drop-target").forEach((sq) => sq.classList.remove("drop-target"));
        document.querySelectorAll(".square.drag-origin").forEach((sq) => sq.classList.remove("drag-origin"));

        if (to && validMoves.includes(to)) {
          let promotion = "q";
          if (isPromotionMove(game, ctx.from, to)) {
            render(); // limpia la pieza que quedó "flotando" del drag mientras se elige
            promotion = await askPromotion(game.turn());
          }
          const fenBeforeMove = game.fen();
          const move = game.move({ from: ctx.from, to, promotion });
          if (move) {
            addIncrement();
            selected = null;
            validMoves = [];
            markMoveForAnimation(move);
            playSoundForMove(move, game);
            showMoveExplanation(fenBeforeMove, move);
            if (navigator.vibrate) {
              const isCapture = move.flags && (move.flags.includes("c") || move.flags.includes("e"));
              navigator.vibrate(isCapture ? [14, 30, 14] : 12);
            }
            render();
            checkGameOver();
            maybeTriggerBotMove();
            return;
          }
        }

        selected = null;
        validMoves = [];
        if (to && to !== ctx.from) SoundFX.invalid();
        render();
      }

      async function clickSquare(sqName) {
        if (Date.now() < justDraggedUntil) return;
        if (!gameStarted || game.game_over() || botThinking) return;
        if (botEnabled && game.turn() === botColor) return;
        if (tournamentMatchActive && game.turn() !== tournamentMyColor()) return;
        if (tournamentMatchActive && tournamentClockWaitingForBothPlayers()) {
          toast("⏳ Esperando a que el rival entre a la partida.");
          return;
        }
        if (tournamentMatchActive && tournamentCurrentGameRow && tournamentCurrentGameRow.status === "suspended") {
          toast("⏸️ El árbitro suspendió esta partida.");
          return;
        }

        if (selected === sqName) {
          selected = null;
          validMoves = [];
          updateSelectionHighlights();
          return;
        }

        if (selected) {
          const from = selected;
          let promotion = "q";
          if (isPromotionMove(game, from, sqName)) {
            promotion = await askPromotion(game.turn());
          }
          const fenBeforeMove = game.fen();
          const move = game.move({ from, to: sqName, promotion });
          if (move) {
            addIncrement();
            selected = null;
            validMoves = [];
            markMoveForAnimation(move);
            playSoundForMove(move, game);
            showMoveExplanation(fenBeforeMove, move);
            render();
            checkGameOver();
            maybeTriggerBotMove();
            return;
          }
        }

        const piece = game.get(sqName);
        if (piece && piece.color === game.turn()) {
          selected = sqName;
          const moves = game.moves({ square: sqName, verbose: true });
          validMoves = moves.map(m => m.to);
          SoundFX.select();
        } else {
          if (selected) SoundFX.invalid();
          selected = null;
          validMoves = [];
        }
        updateSelectionHighlights();
      }

      function checkGameOver() {
        if (tournamentMatchActive) return; // lo maneja syncTournamentMove()
        if (game.game_over()) {
          let resultText = "Partida terminada";
          if (game.in_checkmate()) {
            const winnerColor = game.turn() === 'w' ? 'b' : 'w';
            const winner = winnerColor === 'w' ? 'Blancas' : 'Negras';
            resultText = `Jaque mate · Ganaron las ${winner}`;
            state.games++;
            const humanWon = !botEnabled || winnerColor !== botColor;
            if (humanWon) {
              state.wins++;
              showAlert(`♚ ¡JAQUE MATE! Ganaron las ${winner}.`);
              addXP(60, "Partida ganada", resultText);
            } else {
              state.losses++;
              showAlert(`♚ Jaque mate. Ganó la IA jugando con ${winner.toLowerCase()}.`);
              addXP(15, "Partida perdida", resultText);
            }
          } else {
            state.games++;
            state.draws++;
            resultText = "Tablas";
            SoundFX.draw();
            showAlert("🤝 Partida tablas");
            addXP(20, "Partida empatada", resultText);
          }
          const record = saveFinishedGame(resultText);
          save();
          updateProfile();
          if (record) offerAnalysis(record.id);
        }
      }

      function saveFinishedGame(resultText) {
        const history = game.history();
        if (!history.length) return null;
        
        // Generar lista de FENs históricos para análisis detallado compatible
        const tempGame = new Chess();
        const positions = [clonePosition(tempGame)];
        history.forEach(m => {
          tempGame.move(m);
          positions.push(clonePosition(tempGame));
        });

        const record = {
          id: "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          date: new Date().toLocaleDateString("es-AR"),
          time: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
          result: resultText,
          mode: botEnabled ? "bot" : "pvp",
          difficulty: botEnabled ? botDifficulty : null,
          humanColor: botEnabled ? (botColor === 'w' ? 'b' : 'w') : null,
          moves: history,
          positions: positions,
          analysis: null,
        };
        state.savedGames = state.savedGames || [];
        state.savedGames.unshift(record);
        state.savedGames = state.savedGames.slice(0, 30);
        save();
        renderSavedGamesList();
        return record;
      }

      function clonePosition(g) {
        // Snapshot liviano para el visor de análisis: el FEN ya contiene
        // toda la información de la posición (tablero, turno, enroques,
        // al paso), así que no hace falta guardar también un array 8x8
        // de piezas por cada jugada. Antes esto multiplicaba por ~64 el
        // tamaño de cada posición guardada; con hasta 30 partidas y ~80
        // jugadas cada una, eso se releía y reescribía entero en cada
        // save()/loadState(). El tablero se reconstruye al vuelo (ver
        // renderAnalysisBoard) solo para la jugada que se está mirando.
        return {
          fen: g.fen(),
        };
      }

      function renderSavedGamesList() {
        const container = document.getElementById("saved-games-list");
        const emptyMsg = document.getElementById("saved-games-empty");
        if (!container || !emptyMsg) return;
        container.querySelectorAll(".saved-game-item").forEach((el) => el.remove());

        const games = state.savedGames || [];
        if (!games.length) {
          emptyMsg.style.display = "block";
          return;
        }
        emptyMsg.style.display = "none";

        games.forEach((g) => {
          const item = document.createElement("div");
          item.className = "saved-game-item";
          item.innerHTML = `
            <div class="saved-game-info">
              <b>${g.result}</b>
              <small>${g.date} · ${g.time} · ${g.moves.length} jugadas</small>
            </div>
            <div class="saved-game-actions">
              <button class="btn secondary" data-analyze="${g.id}">🔎 Analizar</button>
              <button class="btn danger" data-delete="${g.id}">🗑</button>
            </div>
          `;
          container.appendChild(item);
        });

        container.querySelectorAll("[data-analyze]").forEach((btn) => {
          btn.onclick = () => openAnalysisModal(btn.dataset.analyze);
        });
        container.querySelectorAll("[data-delete]").forEach((btn) => {
          btn.onclick = () => {
            state.savedGames = (state.savedGames || []).filter(g => g.id !== btn.dataset.delete);
            save();
            renderSavedGamesList();
          };
        });
      }

      // Reloj
      let clockTimer = null;
      let clock = { w: 300, b: 300 };
      let clockEnabled = false;
      // Reloj local ("Jugar"): antes se restaba 1 segundo por cada tick de
      // setInterval(...,1000). En mobile, cuando el navegador pasa a
      // segundo plano (se bloquea la pantalla, se cambia de app), el
      // sistema operativo pausa/frena esos intervalos para ahorrar
      // batería — al volver, el reloj mostraba más tiempo del que
      // realmente había pasado. Ahora, igual que el reloj de torneo
      // (ver updateTournamentClockDisplay), el tiempo restante se calcula
      // contra un timestamp real (turnStartAt) en vez de contar ticks:
      // así da igual cuántos ticks se hayan salteado, el cálculo siempre
      // es correcto en cuanto vuelve a primer plano.
      let turnStartAt = null;
      let clockFlagged = false;

      // Lee minutos/incremento personalizables a partir de un par
      // select+input (se reutiliza para el reloj de "Jugar" y para el
      // reloj configurable del torneo).
      function getRawMinutesFromSelect(selectId, customInputId) {
        const el = document.getElementById(selectId);
        if (!el) return 0;
        const mode = el.value;
        if (mode === "none") return 0;
        if (mode === "custom") {
          const customEl = document.getElementById(customInputId);
          return Math.max(1, Number(customEl && customEl.value) || 5);
        }
        return Number(mode);
      }

      function getMinutesFromSelect(selectId, customInputId) {
        return getRawMinutesFromSelect(selectId, customInputId) * 60;
      }

      // Setea un select de tiempo/incremento (y su input personalizado) a
      // partir de un valor guardado, eligiendo la opción preestablecida que
      // coincida o "Personalizado" si no hay ninguna igual.
      function setSelectFromValue(selectId, customLabelId, customInputId, value, presetValues) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const str = String(value || 0);
        if (!value && presetValues[0] === "none") {
          select.value = "none";
        } else if (presetValues.indexOf(str) !== -1) {
          select.value = str;
        } else {
          select.value = "custom";
          const customEl = document.getElementById(customInputId);
          if (customEl) customEl.value = value;
        }
        const labelEl = document.getElementById(customLabelId);
        if (labelEl) labelEl.style.display = select.value === "custom" ? "" : "none";
      }

      function getIncrementFromSelect(selectId, customInputId) {
        const el = document.getElementById(selectId);
        if (!el) return 0;
        const value = el.value;
        if (value === "custom") {
          const customEl = document.getElementById(customInputId);
          return Math.max(0, Number(customEl && customEl.value) || 0);
        }
        return Number(value);
      }

      // Muestra/oculta el campo "personalizado" de un select de tiempo o
      // incremento apenas se elige la opción "custom".
      function wireCustomToggle(selectId, customLabelId) {
        const selectEl = document.getElementById(selectId);
        const labelEl = document.getElementById(customLabelId);
        if (!selectEl || !labelEl) return;
        const sync = () => {
          labelEl.style.display = selectEl.value === "custom" ? "" : "none";
        };
        selectEl.addEventListener("change", sync);
        sync();
      }

      wireCustomToggle("time-mode", "custom-time-label");
      wireCustomToggle("increment", "custom-increment-label");
      wireCustomToggle("tournament-time-mode", "tournament-custom-time-label");
      wireCustomToggle("tournament-increment", "tournament-custom-increment-label");
      wireCustomToggle("tournament-settings-time-mode", "tournament-settings-custom-time-label");
      wireCustomToggle("tournament-settings-increment", "tournament-settings-custom-increment-label");

      function getInitialTime() {
        return getMinutesFromSelect("time-mode", "custom-minutes");
      }

      function getIncrement() {
        return getIncrementFromSelect("increment", "custom-increment");
      }

      function addIncrement() {
        // En una partida de torneo el incremento ya lo aplica fbMakeMove
        // sobre gameRow.clock (ver TORNEO más abajo); este reloj es el de
        // las partidas normales de "Jugar" y no debe tocarse acá, o
        // termina pisando (y desincronizando entre pantallas) el reloj
        // del torneo, que comparte los mismos elementos #clock-w/#clock-b.
        if (tournamentMatchActive) return;
        const prevTurn = game.turn() === 'w' ? 'b' : 'w';
        // Se "cobra" el tiempo realmente transcurrido en este turno recién
        // terminado contra el timestamp de cuándo empezó a pensar, no
        // contra cuántos ticks de 1s llegaron a correr (que en mobile
        // pueden haberse salteado si la pantalla estuvo bloqueada).
        if (clockEnabled && turnStartAt) {
          const elapsed = Math.max(0, Math.round((Date.now() - turnStartAt) / 1000));
          clock[prevTurn] = Math.max(0, clock[prevTurn] - elapsed);
        }
        const increment = getIncrement();
        if (increment && clockEnabled && !game.game_over()) {
          clock[prevTurn] += increment;
        }
        turnStartAt = clockEnabled ? Date.now() : null;
        updateClockDisplay();
      }

      function initClock(start = false) {
        clearInterval(clockTimer);
        const initial = getInitialTime();
        clockEnabled = initial > 0;
        clock = { w: initial, b: initial };
        clockFlagged = false;
        turnStartAt = start && initial > 0 ? Date.now() : null;

        if (start && initial > 0) {
          // El intervalo ya no resta segundos: solo refresca la pantalla
          // cada 1s. El tiempo real que queda se recalcula siempre contra
          // turnStartAt (ver getClockRemaining_), así que aunque el
          // navegador se salte ticks en segundo plano, en cuanto vuelve a
          // primer plano el próximo tick muestra el valor correcto.
          clockTimer = setInterval(() => {
            if (tournamentMatchActive || game.game_over()) return;
            updateClockDisplay();
          }, 1000);
        }
        updateClockDisplay();
      }

      // Tiempo restante real de un color: si es su turno, se descuenta el
      // tiempo transcurrido desde turnStartAt (cálculo por timestamp, no
      // por conteo de ticks); si no es su turno, el valor guardado no
      // cambia.
      function getClockRemaining_(color) {
        if (!clockEnabled) return clock[color];
        if (game.turn() === color && turnStartAt && !game.game_over()) {
          const elapsed = Math.max(0, Math.round((Date.now() - turnStartAt) / 1000));
          return Math.max(0, clock[color] - elapsed);
        }
        return clock[color];
      }

      function updateClockDisplay() {
        // Durante una partida de torneo el reloj que manda es el de
        // Firestore (ver updateTournamentClockDisplay): si esta función
        // sigue pintando encima de los mismos elementos #clock-w/#clock-b
        // con el reloj local de "Jugar", cada pantalla termina mostrando
        // un tiempo distinto según el estado local de cada navegador.
        if (tournamentMatchActive) return;
        const w = document.getElementById("clock-w");
        const b = document.getElementById("clock-b");
        renderBoardAvatars_();
        const wTime = w.querySelector(".clock-time");
        const bTime = b.querySelector(".clock-time");
        const wSecs = getClockRemaining_("w");
        const bSecs = getClockRemaining_("b");
        (wTime || w).textContent = formatTime(wSecs);
        (bTime || b).textContent = formatTime(bSecs);
        w.classList.toggle("active", game.turn() === "w" && !game.game_over());
        b.classList.toggle("active", game.turn() === "b" && !game.game_over());

        if (clockEnabled && !clockFlagged && !game.game_over()) {
          const turn = game.turn();
          const remaining = turn === "w" ? wSecs : bSecs;
          if (remaining <= 0) {
            clockFlagged = true;
            clock[turn] = 0;
            clearInterval(clockTimer);
            const winner = turn === "w" ? "Negras" : "Blancas";
            state.games++;
            const record = saveFinishedGame(`Tiempo agotado · Ganaron las ${winner}`);
            save();
            showAlert(`⏱️ Tiempo agotado. Ganaron las ${winner}.`);
            if (record) offerAnalysis(record.id);
          }
        }
      }


      let lastKnownLevel = null;

      // Etiqueta de nivel según el XP acumulado (mismos rangos que las
      // insignias de dificultad usadas en Lecciones/Ejercicios)

      function updateProfile() {
        const level = Math.floor(state.xp / 1000) + 1;
        const progress = state.xp % 1000;
        document.getElementById("mini-name").textContent = state.name || "Alumno";
        renderMiniAvatar();
        document.getElementById("mini-level").textContent = `Nivel ${level} · ${levelLabel(level)}`;
        document.getElementById("mini-xp").style.width = (progress / 10) + "%";
        document.getElementById("mini-xp-text").textContent = `${progress} / 1000 XP`;
        document.getElementById("stat-xp").textContent = state.xp;
        document.getElementById("stat-wins").textContent = state.wins;
        document.getElementById("stat-puzzles").textContent = state.puzzles;

        updateDashboardStats(level, progress);

        if (lastKnownLevel === null) {
          lastKnownLevel = level;
        } else if (level > lastKnownLevel) {
          celebrateLevelUp(level);
          lastKnownLevel = level;
        }
      }

      // Calcula la precisión promedio del alumno a partir de las partidas
      // guardadas que ya fueron analizadas por el motor (record.analysis)
      function computeOverallAccuracy() {
        const games = state.savedGames || [];
        const values = [];
        for (const g of games) {
          if (!g.analysis || !g.analysis.accuracy) continue;
          const humanColor = g.humanColor || "w"; // en PvP se toma la perspectiva de Blancas
          const acc = g.analysis.accuracy[humanColor];
          if (typeof acc === "number") values.push(acc);
        }
        if (!values.length) return null;
        return values.reduce((a, b) => a + b, 0) / values.length;
      }

      // Rellena la tarjeta "Tu progreso" del inicio, las tarjetas de
      // Estadísticas y la tabla de Historial con datos reales del alumno
      function updateDashboardStats(level, progress) {
        const progressTitleEl = document.getElementById("progress-title");
        const mainProgressEl = document.getElementById("main-progress");
        if (progressTitleEl) progressTitleEl.textContent = `Nivel ${level} · ${levelLabel(level)}`;
        if (mainProgressEl) mainProgressEl.style.width = (progress / 10) + "%";

        const accuracyEl = document.getElementById("stat-accuracy");
        if (accuracyEl) {
          const acc = computeOverallAccuracy();
          accuracyEl.textContent = acc === null ? "—" : Math.round(acc) + "%";
        }

        const gamesTotalEl = document.getElementById("games-total");
        const gamesWinsEl = document.getElementById("games-wins");
        const gamesLossesEl = document.getElementById("games-losses");
        const gamesDrawsEl = document.getElementById("games-draws");
        if (gamesTotalEl) gamesTotalEl.textContent = state.games;
        if (gamesWinsEl) gamesWinsEl.textContent = state.wins;
        if (gamesLossesEl) gamesLossesEl.textContent = state.losses;
        if (gamesDrawsEl) gamesDrawsEl.textContent = state.draws;

        const historyBody = document.getElementById("history-table");
        if (historyBody) {
          historyBody.innerHTML = "";
          const entries = (state.history || []).slice().reverse();
          if (!entries.length) {
            const row = document.createElement("tr");
            row.innerHTML = `<td colspan="4" style="color: var(--muted)">Todavía no hay actividad registrada.</td>`;
            historyBody.appendChild(row);
          } else {
            for (const entry of entries) {
              const row = document.createElement("tr");
              row.innerHTML = `
                <td>${entry.activity}</td>
                <td>${entry.result}</td>
                <td>+${entry.xp} XP</td>
                <td>${entry.date}</td>
              `;
              historyBody.appendChild(row);
            }
          }
        }
      }

      function celebrateLevelUp(level) {
        SoundFX.levelUp();
        if (navigator.vibrate) navigator.vibrate([20, 40, 20, 40, 60]);

        const banner = document.createElement("div");
        banner.className = "level-up-banner";
        banner.innerHTML = `🎉 ¡Subiste a Nivel ${level}!`;
        document.body.appendChild(banner);
        requestAnimationFrame(() => banner.classList.add("show"));
        setTimeout(() => {
          banner.classList.remove("show");
          setTimeout(() => banner.remove(), 300);
        }, 2200);

        const layer = document.createElement("div");
        layer.className = "level-up-particles";
        document.body.appendChild(layer);

        const colors = ["var(--accent)", "var(--accent2)", "#ffffff", "var(--success)"];
        const originX = window.innerWidth / 2;
        const originY = window.innerHeight * 0.22;

        for (let i = 0; i < 28; i++) {
          const p = document.createElement("span");
          p.className = "level-up-particle";
          const angle = Math.random() * Math.PI * 2;
          const dist = 60 + Math.random() * 140;
          const size = 4 + Math.random() * 7;
          p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
          p.style.setProperty("--dy", Math.sin(angle) * dist - 40 + "px");
          p.style.setProperty("--dur", 1.1 + Math.random() * 0.9 + "s");
          p.style.setProperty("--delay", Math.random() * 0.25 + "s");
          p.style.left = originX + (Math.random() * 40 - 20) + "px";
          p.style.top = originY + "px";
          p.style.width = size + "px";
          p.style.height = size + "px";
          p.style.background = colors[Math.floor(Math.random() * colors.length)];
          layer.appendChild(p);
        }

        setTimeout(() => layer.remove(), 2400);
      }

      function addXP(amount, activity, result = "Completado") {
        state.xp += amount;
        state.history.push({ activity, result, xp: amount, date: new Date().toLocaleDateString("es-AR") });
        save();
        toast(`🎉 +${amount} XP`);
        updateProfile();
      }

      function showPage(name) {
        document.querySelectorAll(".page").forEach((page) => {
          page.classList.toggle("active", page.id === "page-" + name);
        });
        document.querySelectorAll("[data-page]").forEach((button) => {
          button.classList.toggle("active", button.dataset.page === name);
        });
        if (name === "jugar") render();
        if (name === "torneo" && typeof refreshTournament === "function") refreshTournament();
        if (name === "pantalla-publica" && typeof renderPublicScreen === "function") renderPublicScreen(lastTournamentState);
      }

      document.querySelectorAll("[data-page]").forEach((button) => {
        button.onclick = () => showPage(button.dataset.page);
      });

      document.querySelectorAll("[data-page-action]").forEach((button) => {
        button.onclick = () => showPage(button.dataset.pageAction);
      });

      document.getElementById("mode").addEventListener("change", updateModeUI);
      updateModeUI();

      const pvpFlipToggle = document.getElementById("pvp-flip");
      if (pvpFlipToggle) {
        pvpFlipToggle.addEventListener("change", () => {
          if (gameStarted) render();
        });
      }

      // Sonido: checkbox rápido en "Jugar" + espejo centralizado en "Configuración".
      // Antes esta preferencia no se guardaba entre sesiones; ahora persiste
      // igual que el resto (movimientos legales, amenazas, explicaciones).
      let soundEnabled = localStorage.getItem("chessSoundEnabled") !== "off";
      const soundToggle = document.getElementById("toggle-sound");
      const soundToggleCfg = document.getElementById("toggle-sound-cfg");

      function syncSoundUI() {
        if (soundToggle) soundToggle.checked = soundEnabled;
        if (soundToggleCfg) soundToggleCfg.checked = soundEnabled;
      }

      function setSoundEnabled(value) {
        soundEnabled = value;
        localStorage.setItem("chessSoundEnabled", soundEnabled ? "on" : "off");
        SoundFX.setEnabled(soundEnabled);
        syncSoundUI();
        if (soundEnabled) {
          SoundFX.unlock();
          SoundFX.select();
        }
      }

      SoundFX.setEnabled(soundEnabled);
      syncSoundUI();
      if (soundToggle) soundToggle.addEventListener("change", () => setSoundEnabled(soundToggle.checked));
      if (soundToggleCfg) soundToggleCfg.addEventListener("change", () => setSoundEnabled(soundToggleCfg.checked));

      // Los navegadores requieren un gesto del usuario para habilitar audio
      document.body.addEventListener("pointerdown", () => SoundFX.unlock(), { once: true });

      // Activar/desactivar el resaltado de jugadas posibles (checkbox del
      // panel "Modo educativo" + espejo en "Configuración" + botón rápido,
      // disponible también en pantalla completa)
      const legalMovesCheckbox = document.getElementById("toggle-legal");
      const legalMovesCheckboxCfg = document.getElementById("toggle-legal-cfg");
      const legalMovesBtn = document.getElementById("toggle-legal-btn");

      function syncLegalMovesUI() {
        if (legalMovesCheckbox) legalMovesCheckbox.checked = showLegalMoves;
        if (legalMovesCheckboxCfg) legalMovesCheckboxCfg.checked = showLegalMoves;
        if (legalMovesBtn) {
          legalMovesBtn.textContent = showLegalMoves ? "🎯 Jugadas: ON" : "🎯 Jugadas: OFF";
          legalMovesBtn.classList.toggle("off", !showLegalMoves);
          legalMovesBtn.setAttribute("aria-pressed", String(showLegalMoves));
        }
      }

      function setShowLegalMoves(value) {
        showLegalMoves = value;
        localStorage.setItem("chessShowLegalMoves", value ? "on" : "off");
        syncLegalMovesUI();
        render();
        toast(showLegalMoves ? "🎯 Jugadas posibles activadas" : "🎯 Jugadas posibles desactivadas");
      }

      if (legalMovesCheckbox) {
        legalMovesCheckbox.addEventListener("change", () => setShowLegalMoves(legalMovesCheckbox.checked));
      }
      if (legalMovesCheckboxCfg) {
        legalMovesCheckboxCfg.addEventListener("change", () => setShowLegalMoves(legalMovesCheckboxCfg.checked));
      }
      if (legalMovesBtn) {
        legalMovesBtn.addEventListener("click", () => setShowLegalMoves(!showLegalMoves));
      }
      syncLegalMovesUI();

      // Activar/desactivar el resaltado de piezas amenazadas (checkbox del
      // panel "Modo educativo" + espejo en "Configuración")
      const threatsCheckbox = document.getElementById("toggle-threats");
      const threatsCheckboxCfg = document.getElementById("toggle-threats-cfg");

      function syncThreatsUI() {
        if (threatsCheckbox) threatsCheckbox.checked = showThreats;
        if (threatsCheckboxCfg) threatsCheckboxCfg.checked = showThreats;
      }

      function setShowThreats(value) {
        showThreats = value;
        localStorage.setItem("chessShowThreats", showThreats ? "on" : "off");
        syncThreatsUI();
        if (gameStarted) render();
        toast(showThreats ? "⚔️ Amenazas activadas" : "⚔️ Amenazas desactivadas");
      }

      if (threatsCheckbox) threatsCheckbox.addEventListener("change", () => setShowThreats(threatsCheckbox.checked));
      if (threatsCheckboxCfg) threatsCheckboxCfg.addEventListener("change", () => setShowThreats(threatsCheckboxCfg.checked));
      syncThreatsUI();

      // Notificaciones del chat de partidas: espejo en Configuración del
      // botón 🔕/🔔 que ya vive dentro de cada mesa de torneo (ver
      // toggleMatchChatMute / setMatchChatMuted). El checkbox se muestra en
      // positivo ("notificaciones activadas") para ser consistente con el
      // resto de los toggles de esta pantalla, aunque el dato que se guarda
      // (matchChatMuted) esté en negativo.
      const chatNotifCheckboxCfg = document.getElementById("toggle-chatnotif-cfg");
      function syncChatNotifCfgUI_() {
        if (chatNotifCheckboxCfg) chatNotifCheckboxCfg.checked = !matchChatMuted;
      }
      if (chatNotifCheckboxCfg) {
        chatNotifCheckboxCfg.checked = !matchChatMuted;
        chatNotifCheckboxCfg.addEventListener("change", () => {
          setMatchChatMuted(!chatNotifCheckboxCfg.checked);
          toast(matchChatMuted ? "🔕 Chat silenciado" : "🔔 Chat con notificaciones");
        });
      }

      // Avatar: el botón de Perfil abre el mismo selector de mascotas que
      // ya se usa desde la burbuja del sidebar (ver openAvatarPicker).
      const avatarBtnCfg = document.getElementById("config-avatar-btn");
      if (avatarBtnCfg) avatarBtnCfg.addEventListener("click", openAvatarPicker);

      // Perfil: nombre y curso. Antes el formulario no hacía nada al
      // guardar; ahora persiste en el mismo state que ya usa el resto de
      // la app (ver DEFAULT_STATE / save()).
      const studentNameInput = document.getElementById("student-name");
      const studentCourseInput = document.getElementById("student-course");
      if (studentNameInput) studentNameInput.value = state.name === "Alumno" ? "" : state.name;
      if (studentCourseInput) studentCourseInput.value = state.course || "";
      const saveProfileBtn = document.getElementById("save-profile");
      if (saveProfileBtn) {
        saveProfileBtn.addEventListener("click", () => {
          const name = studentNameInput ? studentNameInput.value.trim() : "";
          const course = studentCourseInput ? studentCourseInput.value.trim() : "";
          state.name = name || "Alumno";
          state.course = course;
          save();
          updateProfile();
          toast("💾 Perfil guardado");
        });
      }

      // "Restaurar todas las preferencias": tema + fichas + los 4 toggles
      // de ayudas/sonido a sus valores de fábrica, de una sola vez. Es
      // intencionalmente distinto de "Borrar progreso": no toca XP,
      // historial ni el perfil (nombre/curso/avatar) del alumno.
      const resetPreferencesBtn = document.getElementById("reset-preferences");
      if (resetPreferencesBtn) {
        resetPreferencesBtn.addEventListener("click", () => {
          if (!confirm("¿Restaurar tema, fichas y las 4 ayudas de juego a los valores de fábrica? No afecta tu progreso ni tu perfil.")) {
            return;
          }
          applyTheme("blue");
          applyPieceStyle("classic");
          showLegalMoves = true;
          localStorage.setItem("chessShowLegalMoves", "on");
          syncLegalMovesUI();
          showThreats = true;
          localStorage.setItem("chessShowThreats", "on");
          syncThreatsUI();
          explainMode = true;
          localStorage.setItem("chessExplainMode", "on");
          syncExplainUI();
          setSoundEnabled(true);
          setMatchChatMuted(false);
          if (gameStarted) render();
          toast("↺ Preferencias restauradas a los valores de fábrica");
        });
      }

      // "Exportar datos" / "Importar datos": antes ninguno de los dos
      // botones tenía código detrás (no hacían nada). El respaldo incluye
      // el state completo (perfil, XP, historial, avatar) MÁS las
      // preferencias que se guardan aparte en localStorage (tema, fichas,
      // los 4 toggles de ayudas/sonido y el silenciado de chat), para que
      // "exportar" sea de verdad una copia completa de todo lo que la app
      // recuerda de este alumno en este navegador. Deliberadamente NO
      // incluye la config de Firebase ni la sala del torneo: eso es
      // configuración de la escuela, no datos del alumno.
      const BACKUP_KEYS = [
        "chessSchoolData",
        "chessTheme",
        "chessPieceStyle",
        "chessShowLegalMoves",
        "chessShowThreats",
        "chessExplainMode",
        "chessSoundEnabled",
        "chessMatchChatMuted",
      ];

      const exportJsonBtn = document.getElementById("export-json");
      if (exportJsonBtn) {
        exportJsonBtn.addEventListener("click", () => {
          const backup = { app: "escuela-de-ajedrez", version: 1, exportedAt: new Date().toISOString(), data: {} };
          BACKUP_KEYS.forEach((key) => {
            const value = localStorage.getItem(key);
            if (value !== null) backup.data[key] = value;
          });
          const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const safeName = (state.name || "alumno").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "") || "alumno";
          const dateStr = new Date().toISOString().slice(0, 10);
          const a = document.createElement("a");
          a.href = url;
          a.download = `ajedrez-${safeName}-${dateStr}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          toast("📤 Datos exportados");
        });
      }

      const importJsonInput = document.getElementById("import-json");
      if (importJsonInput) {
        importJsonInput.addEventListener("change", (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            let parsed;
            try {
              parsed = JSON.parse(reader.result);
            } catch (err) {
              toast("❌ Ese archivo no es un JSON válido");
              importJsonInput.value = "";
              return;
            }
            const payload = parsed && parsed.data && typeof parsed.data === "object" ? parsed.data : null;
            if (!payload || !payload.chessSchoolData) {
              toast("❌ Ese archivo no parece un respaldo de esta app");
              importJsonInput.value = "";
              return;
            }
            if (!confirm("¿Importar este respaldo? Se reemplaza tu progreso, perfil y preferencias actuales por los del archivo. No se puede deshacer.")) {
              importJsonInput.value = "";
              return;
            }
            BACKUP_KEYS.forEach((key) => {
              if (typeof payload[key] === "string") localStorage.setItem(key, payload[key]);
            });
            importJsonInput.value = "";
            toast("📥 Datos importados. Recargando…");
            // Recargamos en vez de resincronizar a mano cada variable en
            // memoria (tema, fichas, los 4 toggles, state...): son muchas
            // y están repartidas por todo el archivo, así que recargar es
            // la forma más simple y segura de que todo quede consistente.
            setTimeout(() => location.reload(), 700);
          };
          reader.onerror = () => toast("❌ No se pudo leer el archivo");
          reader.readAsText(file);
        });
      }

      // "Borrar progreso": antes el botón no tenía ningún handler y no
      // borraba nada. Ahora sí resetea XP, historial y estadísticas,
      // conservando nombre/curso/avatar (eso es "perfil", no "progreso").
      const resetDataBtn = document.getElementById("reset-data");
      if (resetDataBtn) {
        resetDataBtn.addEventListener("click", () => {
          if (!confirm("¿Borrar todo tu progreso (XP, historial de partidas y estadísticas)? Esto no se puede deshacer.")) {
            return;
          }
          state = { ...DEFAULT_STATE, name: state.name, course: state.course, avatar: state.avatar };
          save();
          updateProfile();
          toast("🗑️ Progreso borrado");
        });
      }

      document.getElementById("new-game").onclick = () => {
        const modeValue = document.getElementById("mode").value;
        botEnabled = modeValue === "bot";
        if (botEnabled) ensureStockfishWorker();
        botDifficulty = document.getElementById("bot-difficulty").value;
        const humanColor = document.getElementById("bot-color").value;
        botColor = humanColor === 'w' ? 'b' : 'w';
        botThinking = false;

        game.reset();
        selected = null;
        validMoves = [];
        gameStarted = true;
        resetEduPanel();
        initClock(true);
        render();
        document.getElementById("new-game").textContent = "🔄 Nueva partida";
        toast(botEnabled ? `▶️ Partida iniciada · IA` : "▶️ Partida iniciada");
        SoundFX.gameStart();
        maybeTriggerBotMove();
      };

      document.getElementById("undo").onclick = () => {
        if (botThinking) return;
        game.undo();
        if (botEnabled && !game.game_over() && game.turn() === botColor) {
          game.undo();
        }
        selected = null;
        validMoves = [];
        render();
        toast("↩️ Jugada deshecha");
      };

      document.getElementById("resign").onclick = () => {
        if (game.game_over()) return;
        state.games++;
        state.losses++;
        const record = saveFinishedGame("Rendición");
        showAlert("🏳️ Te rendiste.");
        save();
        updateProfile();
        if (record) offerAnalysis(record.id);
      };

      document.getElementById("copy-game").onclick = () => {
        navigator.clipboard?.writeText(game.history().join(" ")).then(() => toast("📋 Partida copiada"));
      };

      const movesToggleBtn = document.getElementById("moves-toggle");
      const floatingMovesCard = document.querySelector(".floating-moves-card");
      if (movesToggleBtn && floatingMovesCard) {
        movesToggleBtn.addEventListener("click", () => {
          floatingMovesCard.classList.toggle("collapsed");
        });
      }

      // Fullscreen utils
      function setupFullscreenToggle(buttonId) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        function updateBtnLabel() {
          const isFs = document.body.classList.contains("fullscreen-game");
          btn.textContent = isFs
            ? (btn.dataset.exitText || "❎ Salir")
            : (btn.dataset.enterText || "📺 Pantalla completa");
        }

        btn.onclick = async () => {
          if (!document.body.classList.contains("fullscreen-game")) {
            // Activamos primero la clase (así el tablero se ve "completo" ya
            // mismo aunque el navegador no soporte o rechace la Fullscreen API,
            // como pasa en iPhone) y luego intentamos la API nativa.
            document.body.classList.add("fullscreen-game");
            updateBtnLabel();
            await document.documentElement.requestFullscreen().catch(() => {});
            requestAnimationFrame(sizeFullscreenBoard);
          } else {
            document.body.classList.remove("fullscreen-game");
            updateBtnLabel();
            resetBoardFrameSize();
            if (document.fullscreenElement) {
              await document.exitFullscreen().catch(() => {});
            }
          }
        };

        // Si el usuario sale con ESC, el botón "atrás" o un gesto del sistema,
        // sincronizamos la clase igual para no quedar en un estado inconsistente
        document.addEventListener("fullscreenchange", () => {
          if (!document.fullscreenElement && document.body.classList.contains("fullscreen-game")) {
            document.body.classList.remove("fullscreen-game");
            updateBtnLabel();
            resetBoardFrameSize();
          }
        });

        updateBtnLabel();
      }
      setupFullscreenToggle("game-fullscreen");

      // Calcula con precisión (en píxeles reales, no medidas fijas adivinadas)
      // el tamaño cuadrado máximo que puede tener el tablero en pantalla
      // completa, dejando el espacio real que ocupan el reloj y los controles
      // en CADA dispositivo (celular, tablet, notebook, con o sin notch).
      function sizeFullscreenBoard() {
        const bc = document.body.classList;
        if (!bc.contains("fullscreen-game") && !bc.contains("tournament-board-max")) return;
        const boardFrame = document.querySelector(".board-frame");
        const gameCard = document.getElementById("game-card");
        if (!boardFrame || !gameCard) return;

        const clockEl = gameCard.querySelector(".clock");
        const controlsEl = gameCard.querySelector(".controls-panel");
        // Barra de torneo (título + estado + botones abandonar/tablas): sigue
        // visible durante una partida de torneo y ocupa espacio real, así
        // que hay que descontarla o el tablero se calcula más grande de lo
        // que cabe y empuja los controles (Pantalla completa incluido)
        // fuera de la vista.
        const tournamentBarEl = document.getElementById("tournament-match-bar");
        const cardStyle = getComputedStyle(gameCard);
        const gap = parseFloat(cardStyle.rowGap || cardStyle.gap || "12") || 12;
        const paddingV =
          (parseFloat(cardStyle.paddingTop) || 0) + (parseFloat(cardStyle.paddingBottom) || 0);
        const paddingH =
          (parseFloat(cardStyle.paddingLeft) || 0) + (parseFloat(cardStyle.paddingRight) || 0);

        const viewportW = window.visualViewport ? window.visualViewport.width : window.innerWidth;
        const viewportH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const cardRect = gameCard.getBoundingClientRect();
        const clockH = clockEl ? clockEl.getBoundingClientRect().height : 0;
        const controlsH = controlsEl ? controlsEl.getBoundingClientRect().height : 0;
        const tournamentBarH =
          tournamentBarEl && tournamentBarEl.offsetParent !== null
            ? tournamentBarEl.getBoundingClientRect().height
            : 0;

        const availableH =
          (cardRect.height || viewportH) - clockH - controlsH - tournamentBarH - gap * 2 - paddingV;
        const availableW = (cardRect.width || viewportW) - paddingH;

        const side = Math.max(140, Math.floor(Math.min(availableW, availableH)));
        boardFrame.style.width = side + "px";
        boardFrame.style.height = side + "px";
      }

      function resetBoardFrameSize() {
        const boardFrame = document.querySelector(".board-frame");
        if (boardFrame) {
          boardFrame.style.width = "";
          boardFrame.style.height = "";
        }
      }

      (function setupFullscreenResize() {
        let resizeTimer = null;
        const scheduleResize = () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(sizeFullscreenBoard, 60);
        };
        window.addEventListener("resize", scheduleResize);
        window.addEventListener("orientationchange", () => setTimeout(sizeFullscreenBoard, 200));
        if (window.visualViewport) {
          window.visualViewport.addEventListener("resize", scheduleResize);
        }
        const gameCard = document.getElementById("game-card");
        if (gameCard && "ResizeObserver" in window) {
          const ro = new ResizeObserver(scheduleResize);
          ro.observe(gameCard);
          const clockEl = gameCard.querySelector(".clock");
          const controlsEl = gameCard.querySelector(".controls-panel");
          const tournamentBarEl = document.getElementById("tournament-match-bar");
          if (clockEl) ro.observe(clockEl);
          if (controlsEl) ro.observe(controlsEl);
          if (tournamentBarEl) ro.observe(tournamentBarEl);
        }
      })();

      // Temas
      const THEMES = { blue: "Azul moderno", wood: "Madera clásica", green: "Verde torneo", purple: "Violeta", red: "Rojo intenso", ocean: "Océano", midnight: "Medianoche", light: "Claro elegante" };

      function applyTheme(theme) {
        const current = THEMES[theme] ? theme : "blue";
        document.body.dataset.theme = current;
        localStorage.setItem("chessTheme", current);
        document.getElementById("current-theme-name").textContent = THEMES[current];
        document.querySelectorAll("[data-theme-card]").forEach(c => {
          c.classList.toggle("active", c.dataset.themeCard === current);
        });
      }

      document.querySelectorAll(".theme-btn").forEach(btn => {
        btn.onclick = () => applyTheme(btn.dataset.theme);
      });
      document.getElementById("reset-theme").onclick = () => applyTheme("blue");

      applyTheme(localStorage.getItem("chessTheme") || "blue");

      // Estilos de fichas
      const PIECE_STYLES = { classic: "Clásico", bold: "Sólido", outline: "Contorno", neon: "Neón", minimal: "Minimalista", gold: "Dorado", glass: "Cristal", retro: "Retro", wood: "Madera", fire: "Fuego", ice: "Hielo", pastel: "Pastel", rainbow: "Arcoíris", longshadow: "Sombra larga" };

      function applyPieceStyle(style) {
        const current = PIECE_STYLES[style] ? style : "classic";
        document.body.classList.remove(
          ...Object.keys(PIECE_STYLES).map((s) => "pstyle-" + s)
        );
        document.body.classList.add("pstyle-" + current);
        localStorage.setItem("chessPieceStyle", current);
        document.getElementById("current-piece-style-name").textContent = PIECE_STYLES[current];
        document.querySelectorAll("[data-piece-style-card]").forEach((c) => {
          c.classList.toggle("active", c.dataset.pieceStyleCard === current);
        });
      }

      document.querySelectorAll(".piece-style-btn").forEach((btn) => {
        btn.onclick = () => applyPieceStyle(btn.dataset.pieceStyle);
      });
      document.getElementById("reset-piece-style").onclick = () => applyPieceStyle("classic");

      applyPieceStyle(localStorage.getItem("chessPieceStyle") || "classic");

      updateProfile();
      initClock(false);
      render();
      savedGamesList();

      function savedGamesList() { renderSavedGamesList(); }

      // =========================================================
      // Módulo de Análisis Completo con Stockfish
      // =========================================================
      let analysisCurrentRecord = null;
      let analysisPly = 0;
      let analysisRunToken = 0; // evita que un análisis viejo pise a uno nuevo
      let sfAnalysisWorker = null;
      const ANALYSIS_DEPTH = 12;
      const MATE_SCORE = 100000;

      const TAG_INFO = {
        best:        { icon: "✅", label: "Mejor jugada", cls: "tag-best" },
        good:        { icon: "👍", label: "Buena",        cls: "tag-good" },
        inaccuracy:  { icon: "⚠️", label: "Imprecisión",  cls: "tag-inaccuracy" },
        mistake:     { icon: "❌", label: "Error",         cls: "tag-mistake" },
        blunder:     { icon: "‼️", label: "Blunder",       cls: "tag-blunder" },
      };

      function initAnalysisWorker() {
        try {
          sfAnalysisWorker = new Worker("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js");
          sfAnalysisWorker.postMessage("uci");
          sfAnalysisWorker.postMessage("setoption name Skill Level value 20");
        } catch (e) {
          try {
            fetch("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js")
              .then(res => res.text())
              .then(code => {
                const blob = new Blob([code], { type: "application/javascript" });
                sfAnalysisWorker = new Worker(URL.createObjectURL(blob));
                sfAnalysisWorker.postMessage("uci");
                sfAnalysisWorker.postMessage("setoption name Skill Level value 20");
              });
          } catch (err) {
            console.error("No se pudo iniciar el motor de análisis", err);
          }
        }
      }
      initAnalysisWorker();

      // Evaluación heurística de respaldo (solo material) si el motor no responde
      function heuristicEval(fen) {
        try {
          const c = new Chess(fen);
          const values = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
          let score = 0;
          c.board().forEach(row => row.forEach(sq => {
            if (sq) score += (sq.color === "w" ? 1 : -1) * values[sq.type];
          }));
          return c.turn() === "w" ? score : -score;
        } catch (e) {
          return 0;
        }
      }

      // Consulta al motor la evaluación (desde la perspectiva de quien mueve) y la mejor jugada
      function sfEvalFen(fen, depth) {
        return new Promise((resolve) => {
          if (!sfAnalysisWorker) {
            resolve({ score: heuristicEval(fen), bestMove: null, engine: false });
            return;
          }
          let lastScore = 0;
          let lastPv = [];
          let settled = false;
          const timeout = setTimeout(() => {
            if (settled) return;
            settled = true;
            sfAnalysisWorker.removeEventListener("message", handler);
            resolve({ score: heuristicEval(fen), bestMove: null, engine: false, pv: [] });
          }, 8000);

          function handler(e) {
            const line = typeof e.data === "string" ? e.data : "";
            if (line.startsWith("info") && line.indexOf(" score ") !== -1) {
              const m = line.match(/score (cp|mate) (-?\d+)/);
              if (m) {
                if (m[1] === "cp") {
                  lastScore = parseInt(m[2], 10);
                } else {
                  const mateIn = parseInt(m[2], 10);
                  lastScore = mateIn > 0 ? (MATE_SCORE - mateIn) : (-MATE_SCORE - mateIn);
                }
              }
              const pvMatch = line.match(/ pv (.+)$/);
              if (pvMatch) {
                lastPv = pvMatch[1].trim().split(/\s+/);
              }
            }
            if (line.startsWith("bestmove")) {
              if (settled) return;
              settled = true;
              clearTimeout(timeout);
              sfAnalysisWorker.removeEventListener("message", handler);
              const parts = line.split(" ");
              const bm = parts[1] && parts[1] !== "(none)" ? parts[1] : null;
              resolve({ score: lastScore, bestMove: bm, engine: true, pv: lastPv });
            }
          }
          sfAnalysisWorker.addEventListener("message", handler);
          sfAnalysisWorker.postMessage("position fen " + fen);
          sfAnalysisWorker.postMessage("go depth " + depth);
        });
      }

      // Evalúa una posición: usa el motor salvo que ya sea jaque mate/ahogado
      async function evalPosition(fen, depth) {
        const temp = new Chess(fen);
        if (temp.in_checkmate()) return { score: -MATE_SCORE, bestMove: null, pv: [] };
        if (temp.game_over()) return { score: 0, bestMove: null, pv: [] };
        return sfEvalFen(fen, depth);
      }

      function uciToSan(fen, uciMove) {
        if (!uciMove || uciMove.length < 4) return null;
        try {
          const temp = new Chess(fen);
          const from = uciMove.substring(0, 2);
          const to = uciMove.substring(2, 4);
          const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
          const mv = temp.move({ from, to, promotion: promotion || "q" });
          return mv ? mv.san : null;
        } catch (e) {
          return null;
        }
      }

      // Conversión centipawns -> % de probabilidad de victoria (fórmula estándar tipo Lichess)


      function commentFor(tag, playedSan, bestSan, color) {
        const quien = color === "w" ? "Blancas" : "Negras";
        switch (tag) {
          case "best":
            return `✅ ${quien} jugó ${playedSan}, la mejor jugada según el motor.`;
          case "good":
            return `👍 ${quien} jugó ${playedSan}, una buena jugada que mantiene una posición sólida.`;
          case "inaccuracy":
            return `⚠️ Imprecisión de ${quien.toLowerCase()} con ${playedSan}.` + (bestSan ? ` El motor prefería ${bestSan}.` : "");
          case "mistake":
            return `❌ Error de ${quien.toLowerCase()} con ${playedSan}, cede ventaja al rival.` + (bestSan ? ` Mejor era ${bestSan}.` : "");
          case "blunder":
            return `‼️ ¡Blunder! ${quien} jugó ${playedSan} y perdió mucha ventaja (o la partida).` + (bestSan ? ` La jugada correcta era ${bestSan}.` : "");
          default:
            return playedSan || "";
        }
      }

      async function openAnalysisModal(gameId) {
        const record = (state.savedGames || []).find(g => g.id === gameId);
        if (!record) return;
        analysisCurrentRecord = record;
        document.getElementById("analysis-modal").style.display = "flex";
        document.getElementById("analysis-meta").textContent =
          `${record.date} · ${record.time} · ${record.moves.length} jugadas · ${record.result}`;

        const progressWrap = document.getElementById("analysis-progress");
        const body = document.getElementById("analysis-body");

        if (record.analysis) {
          progressWrap.style.display = "none";
          body.style.display = "block";
          analysisPly = record.positions.length - 1;
          renderAnalysisResults(record);
          return;
        }

        progressWrap.style.display = "block";
        body.style.display = "none";
        await runFullAnalysis(record);
      }

      function updateAnalysisProgress(done, total) {
        const text = document.getElementById("analysis-progress-text");
        const fill = document.getElementById("analysis-progress-fill");
        text.textContent = `Analizando jugada ${done}/${total}…`;
        fill.style.width = total ? Math.round((done / total) * 100) + "%" : "0%";
      }

      async function runFullAnalysis(record) {
        const myToken = ++analysisRunToken;
        const positions = record.positions;
        const total = positions.length;
        updateAnalysisProgress(0, total - 1);

        const results = [];
        for (let i = 0; i < total; i++) {
          if (myToken !== analysisRunToken) return; // se abrió otra partida mientras tanto
          const r = await evalPosition(positions[i].fen, ANALYSIS_DEPTH);
          results.push(r);
          updateAnalysisProgress(i, total - 1);
        }
        if (myToken !== analysisRunToken) return;

        const scores = results.map(r => r.score);
        const perMove = [];
        const counts = {
          w: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
          b: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
        };
        const accSums = { w: [], b: [] };

        for (let i = 0; i < record.moves.length; i++) {
          const color = positions[i].fen.split(" ")[1]; // quién mueve en esta jugada
          const scoreBefore = scores[i];
          const scoreAfter = scores[i + 1];
          // ambos "scores" están en perspectiva de quien mueve en esa posición;
          // como el turno se invierte, sumarlos da la caída de valor para 'color'
          const loss = Math.max(0, scoreBefore + scoreAfter);
          const tag = classifyLoss(loss);
          counts[color][tag]++;

          const winBefore = cpToWin(scoreBefore);
          const winAfter = cpToWin(-scoreAfter);
          const moveAcc = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * (winBefore - winAfter)) - 3.1668));
          accSums[color].push(moveAcc);

          const bestUci = results[i].bestMove;
          const bestSan = tag === "best" ? null : uciToSan(positions[i].fen, bestUci);
          const playedSan = record.moves[i];

          perMove.push({ tag, loss, color, playedSan, bestSan });
        }

        const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 100;
        const accuracy = { w: avg(accSums.w), b: avg(accSums.b) };
        const usedEngine = results.some(r => r.engine);

        record.analysis = { scores, perMove, counts, accuracy, usedEngine };
        save();

        document.getElementById("analysis-progress").style.display = "none";
        document.getElementById("analysis-body").style.display = "block";
        analysisPly = positions.length - 1;
        renderAnalysisResults(record);
      }

      function closeAnalysisModal() {
        document.getElementById("analysis-modal").style.display = "none";
        analysisRunToken++; // cancela cualquier análisis en curso
      }

      function renderAnalysisResults(record) {
        renderAnalysisSummary(record);
        renderEvalGraph(record);
        renderAnalysisBoard();
        renderAnalysisMoveList();
        renderAnalysisComment();
      }

      function renderAnalysisSummary(record) {
        const a = record.analysis;
        const container = document.getElementById("analysis-summary");
        container.innerHTML = "";
        if (!a) return;

        if (a.usedEngine === false) {
          const notice = document.createElement("div");
          notice.style.gridColumn = "1 / -1";
          notice.style.color = "var(--muted)";
          notice.style.fontSize = "0.8rem";
          notice.textContent = "⚠️ El motor no respondió a tiempo: se usó una evaluación básica por material.";
          container.appendChild(notice);
        }

        ["w", "b"].forEach((color) => {
          const label = color === "w" ? "♔ Blancas" : "♚ Negras";
          const c = a.counts[color];
          const card = document.createElement("div");
          card.className = "analysis-side-card";
          card.innerHTML = `
            <h4>${label}</h4>
            <div class="analysis-accuracy">${a.accuracy[color].toFixed(1)}%</div>
            <div style="color: var(--muted); font-size: 0.8rem">Precisión estimada</div>
            <div class="analysis-tag-row">
              <span>✅ ${c.best}</span>
              <span>👍 ${c.good}</span>
              <span>⚠️ ${c.inaccuracy}</span>
              <span>❌ ${c.mistake}</span>
              <span>‼️ ${c.blunder}</span>
            </div>
          `;
          container.appendChild(card);
        });
      }

      function renderEvalGraph(record) {
        const graph = document.getElementById("analysis-eval-graph");
        graph.innerHTML = "";
        const a = record.analysis;
        if (!a) return;
        const scores = a.scores;

        scores.forEach((rawScore, i) => {
          // convertir a perspectiva de blancas para el gráfico
          const turnAt = record.positions[i].fen.split(" ")[1];
          const whiteScore = turnAt === "w" ? rawScore : -rawScore;
          const clamped = Math.max(-600, Math.min(600, whiteScore));
          const pct = 50 + (clamped / 600) * 50; // 0 (negras dominan) .. 100 (blancas dominan)

          const bar = document.createElement("div");
          bar.className = "bar" + (whiteScore < 0 ? " black-adv" : "") + (i === analysisPly ? " current" : "");
          bar.style.height = Math.max(4, Math.abs(pct - 50) * 2) + "%";
          bar.title = i === 0 ? "Posición inicial" : `Tras ${record.moves[i - 1]}`;
          bar.onclick = () => { analysisPly = i; renderAnalysisResults(record); };
          graph.appendChild(bar);
        });
      }

      function renderAnalysisBoard() {
        const record = analysisCurrentRecord;
        const boardEl = document.getElementById("analysis-board");
        boardEl.innerHTML = "";
        const pos = record.positions[analysisPly];
        if (!pos || !pos.fen) return;
        const board = new Chess(pos.fen).board();

        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const sq = document.createElement("div");
            sq.className = "square " + ((r + c) % 2 ? "dark" : "light");
            const p = board[r][c];
            if (p) {
              const piece = document.createElement("div");
              piece.className = "piece " + (p.color === "w" ? "white-piece" : "black-piece");
              piece.textContent = PIECES[p.color + p.type.toUpperCase()];
              piece.dataset.piece = p.type.toUpperCase();
              sq.appendChild(piece);
            }
            boardEl.appendChild(sq);
          }
        }

        const evalEl = document.getElementById("analysis-eval-current");
        const a = record.analysis;
        if (a && evalEl) {
          const rawScore = a.scores[analysisPly];
          const turnAt = pos.fen.split(" ")[1];
          const whiteScore = turnAt === "w" ? rawScore : -rawScore;
          let text;
          if (Math.abs(whiteScore) >= MATE_SCORE - 300) {
            const movesToMate = MATE_SCORE - Math.abs(whiteScore);
            text = `Mate en ${movesToMate} para ${whiteScore > 0 ? "blancas" : "negras"}`;
          } else {
            const pawns = (whiteScore / 100).toFixed(2);
            text = (whiteScore > 0 ? "+" : "") + pawns + (whiteScore >= 0 ? " (ventaja blancas)" : " (ventaja negras)");
          }
          evalEl.textContent = text;
        }
      }

      function renderAnalysisComment() {
        const record = analysisCurrentRecord;
        const commentEl = document.getElementById("analysis-comment");
        if (!commentEl || !record || !record.analysis) return;
        if (analysisPly === 0) {
          commentEl.textContent = "Posición inicial. Navegá las jugadas para ver el análisis de cada una.";
          return;
        }
        const mv = record.analysis.perMove[analysisPly - 1];
        commentEl.textContent = mv ? commentFor(mv.tag, mv.playedSan, mv.bestSan, mv.color) : "";
      }

      function renderAnalysisMoveList() {
        const record = analysisCurrentRecord;
        const container = document.getElementById("analysis-move-list");
        container.innerHTML = "";
        const perMove = record.analysis ? record.analysis.perMove : [];

        function buildBtn(idx) {
          const san = record.moves[idx];
          if (san === undefined) {
            const span = document.createElement("span");
            return span;
          }
          const btn = document.createElement("button");
          const info = perMove[idx];
          const tagInfo = info ? TAG_INFO[info.tag] : null;
          btn.className = "analysis-move-btn" + (tagInfo ? " " + tagInfo.cls : "") + ((idx + 1) === analysisPly ? " active" : "");
          btn.innerHTML = `<span>${san}</span>` + (tagInfo ? `<span class="mv-icon">${tagInfo.icon}</span>` : "");
          if (tagInfo) btn.title = tagInfo.label;
          btn.onclick = () => { analysisPly = idx + 1; renderAnalysisResults(record); };
          return btn;
        }

        for (let i = 0; i < record.moves.length; i += 2) {
          const row = document.createElement("div");
          row.className = "analysis-move-row";
          const num = document.createElement("span");
          num.className = "analysis-move-num";
          num.textContent = (i / 2 + 1) + ".";
          row.appendChild(num);
          row.appendChild(buildBtn(i));
          row.appendChild(buildBtn(i + 1));
          container.appendChild(row);
        }
      }

      document.getElementById("analysis-close").onclick = closeAnalysisModal;
      document.getElementById("analysis-first").onclick = () => { analysisPly = 0; renderAnalysisResults(analysisCurrentRecord); };
      document.getElementById("analysis-prev").onclick = () => { analysisPly = Math.max(0, analysisPly - 1); renderAnalysisResults(analysisCurrentRecord); };
      document.getElementById("analysis-next").onclick = () => { analysisPly = Math.min(analysisCurrentRecord.positions.length - 1, analysisPly + 1); renderAnalysisResults(analysisCurrentRecord); };
      document.getElementById("analysis-last").onclick = () => { analysisPly = analysisCurrentRecord.positions.length - 1; renderAnalysisResults(analysisCurrentRecord); };

      // =========================
      // TUTOR IA (sugerencias + explicaciones)
      // =========================
      const TUTOR_DEPTH = 14;

      const TUTOR_TIPS_APERTURA = [
        "En la apertura, priorizá desarrollar tus piezas menores (caballos y alfiles) antes de sacar la dama.",
        "Tratá de enrocar pronto: pone a tu rey a salvo y conecta las torres.",
        "Controlá el centro (casillas d4, d5, e4, e5): te da más espacio y opciones.",
        "Evitá mover la misma pieza dos veces en la apertura sin una buena razón.",
        "No saques la dama demasiado pronto: puede convertirse en blanco de ataques con pérdida de tiempo.",
      ];
      const TUTOR_TIPS_MEDIO_JUEGO = [
        "Antes de mover, preguntate siempre: ¿qué amenaza mi rival con su última jugada?",
        "Buscá las piezas rivales mal defendidas: suelen ser un buen objetivo táctico.",
        "Una torre en columna abierta o un caballo bien plantado en el centro valen mucho.",
        "Si tenés ventaja de material, buscá cambiar piezas para simplificar la posición.",
        "Cuidá la seguridad de tu rey: no debilites innecesariamente los peones que lo protegen.",
        "Pensá en tu plan antes de cada jugada, no solo en la jugada en sí.",
      ];
      const TUTOR_TIPS_FINAL = [
        "En el final, activá a tu rey: se convierte en una pieza de ataque muy importante.",
        "Los peones pasados son muy valiosos en el final: intentá coronarlos o bloquearlos.",
        "Contá bien los tiempos: en los finales, un tempo de más puede decidir la partida.",
        "Con torres en el tablero, la actividad de las piezas suele valer más que el material.",
      ];

      // =========================
      // CONSEJO DEL DÍA (tarjeta de inicio): cambia una vez por día, igual
      // para todos los que entren ese día, en vez de quedar fijo siempre.
      // =========================
      const DAILY_TIPS = [
        { title: "Desarrollá tus piezas primero", text: "En la apertura, priorizá desarrollar tus piezas menores (caballos y alfiles) antes de sacar la dama." },
        { title: "Enrocá pronto", text: "Tratá de enrocar pronto: pone a tu rey a salvo y conecta las torres." },
        { title: "Controlá el centro", text: "Las casillas centrales (d4, d5, e4, e5) permiten que tus piezas tengan mayor movilidad." },
        { title: "No repitas piezas sin razón", text: "Evitá mover la misma pieza dos veces en la apertura sin una buena razón." },
        { title: "Cuidado con sacar la dama temprano", text: "No saques la dama demasiado pronto: puede convertirse en blanco de ataques con pérdida de tiempo." },
        { title: "Preguntate qué amenaza el rival", text: "Antes de mover, preguntate siempre: ¿qué amenaza mi rival con su última jugada?" },
        { title: "Buscá piezas mal defendidas", text: "Las piezas rivales mal defendidas suelen ser un buen objetivo táctico." },
        { title: "Ocupá columnas abiertas", text: "Una torre en columna abierta o un caballo bien plantado en el centro valen mucho." },
        { title: "Simplificá con ventaja de material", text: "Si tenés ventaja de material, buscá cambiar piezas para simplificar la posición." },
        { title: "Protegé a tu rey", text: "Cuidá la seguridad de tu rey: no debilites innecesariamente los peones que lo protegen." },
        { title: "Jugá siempre con un plan", text: "Pensá en tu plan antes de cada jugada, no solo en la jugada en sí." },
        { title: "Activá tu rey en el final", text: "En el final, activá a tu rey: se convierte en una pieza de ataque muy importante." },
        { title: "Valorá los peones pasados", text: "Los peones pasados son muy valiosos en el final: intentá coronarlos o bloquearlos." },
        { title: "Contá bien los tiempos", text: "En los finales, un tempo de más puede decidir la partida." },
        { title: "Priorizá la actividad de tus piezas", text: "Con torres en el tablero, la actividad de las piezas suele valer más que el material." },
      ];


      function renderDailyTip() {
        const titleEl = document.getElementById("daily-tip-title");
        const textEl = document.getElementById("daily-tip-text");
        if (!titleEl || !textEl) return;
        const idx = dayOfYear(new Date()) % DAILY_TIPS.length;
        const tip = DAILY_TIPS[idx];
        titleEl.textContent = tip.title;
        textEl.textContent = tip.text;
      }

      renderDailyTip();

      const PIECE_NAMES = { p: "peón", n: "caballo", b: "alfil", r: "torre", q: "dama", k: "rey" };
      const TUTOR_START_SQUARES = { n: ["b1", "g1", "b8", "g8"], b: ["c1", "f1", "c8", "f8"] };
      const TUTOR_CENTER_SQUARES = ["d4", "d5", "e4", "e5"];

      let tutorRunToken = 0;
      let lastTutorFen = null;
      let lastTutorMove = null;


      function tutorGamePhase(fen) {
        const c = new Chess(fen);
        const ply = c.history().length;
        const pieceCount = c.board().flat().filter(Boolean).length;
        if (ply < 16) return "apertura";
        if (pieceCount <= 12) return "final";
        return "medio";
      }

      function pickTutorTip(fen) {
        const phase = tutorGamePhase(fen);
        const pool = phase === "apertura" ? TUTOR_TIPS_APERTURA : phase === "final" ? TUTOR_TIPS_FINAL : TUTOR_TIPS_MEDIO_JUEGO;
        return pool[Math.floor(Math.random() * pool.length)];
      }

      // Genera las razones tácticas/posicionales de una jugada ya aplicada (objeto move de chess.js)
      function getMoveReasons(mv) {
        const reasons = [];
        if (mv.flags.includes("k") || mv.flags.includes("q")) {
          reasons.push("enroca, poniendo al rey a resguardo y activando la torre");
        }
        if (mv.san.includes("#")) {
          reasons.push("¡es jaque mate, termina la partida!");
        } else if (mv.san.includes("+")) {
          reasons.push("da jaque, obligando a responder de inmediato");
        }
        if (mv.flags.includes("c") || mv.flags.includes("e")) {
          reasons.push("captura una pieza rival" + (mv.captured ? " (" + PIECE_NAMES[mv.captured] + ")" : "") + ", ganando material");
        }
        if (mv.flags.includes("p")) {
          reasons.push("corona un peón, convirtiéndolo en una pieza mucho más poderosa");
        }
        if (TUTOR_START_SQUARES[mv.piece] && TUTOR_START_SQUARES[mv.piece].includes(mv.from)) {
          reasons.push("desarrolla una pieza que todavía no había entrado en juego");
        }
        if (TUTOR_CENTER_SQUARES.includes(mv.to) && mv.piece !== "k") {
          reasons.push("ocupa una casilla central, ganando espacio e influencia");
        }
        if (mv.piece === "k" && !mv.flags.includes("k") && !mv.flags.includes("q")) {
          reasons.push("mueve al rey; hay que vigilar que quede seguro después de esta jugada");
        }
        return reasons;
      }

      // Convierte una línea principal (array de jugadas UCI) en notación SAN legible, numerada
      function pvToSanLine(fen, pv) {
        if (!pv || !pv.length) return "";
        const temp = new Chess(fen);
        const fenParts = fen.split(" ");
        let turn = fenParts[1] === "b" ? "b" : "w";
        let moveNumber = parseInt(fenParts[5], 10) || 1;
        const parts = [];
        for (let i = 0; i < pv.length; i++) {
          const uci = pv[i];
          if (!uci || uci.length < 4) break;
          const from = uci.substring(0, 2);
          const to = uci.substring(2, 4);
          const promotion = uci.length > 4 ? uci[4] : undefined;
          const mv = temp.move({ from, to, promotion: promotion || "q" });
          if (!mv) break;
          if (turn === "w") {
            parts.push(moveNumber + ". " + mv.san);
          } else {
            if (i === 0) {
              parts.push(moveNumber + "... " + mv.san);
            } else {
              parts.push(mv.san);
            }
            moveNumber++;
          }
          turn = turn === "w" ? "b" : "w";
        }
        return parts.join(" ");
      }

      // Genera una explicación en español de por qué el motor recomienda esta jugada
      function explainTutorMove(fenBefore, uciMove, scoreCp, engineUsed) {
        const temp = new Chess(fenBefore);
        const mover = temp.turn();
        const moverLabel = mover === "w" ? "las Blancas" : "las Negras";
        const rivalLabel = mover === "w" ? "las Negras" : "las Blancas";
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
        const mv = temp.move({ from, to, promotion: promotion || "q" });

        if (!mv) {
          return { san: uciMove, text: "El motor recomienda esta jugada en la posición actual.", evalText: "" };
        }

        const reasons = getMoveReasons(mv);

        let text;
        if (reasons.length) {
          text = capitalizeFirst(mv.san) + ": " + capitalizeFirst(reasons.slice(0, 2).join(", y además ")) + ".";
        } else {
          text = mv.san + " es la jugada mejor valorada por el motor en esta posición.";
        }

        let evalText;
        if (Math.abs(scoreCp) >= MATE_SCORE - 300) {
          const movesToMate = MATE_SCORE - Math.abs(scoreCp);
          evalText = "Mate en " + movesToMate + " para " + (scoreCp > 0 ? moverLabel : rivalLabel);
        } else if (Math.abs(scoreCp) < 40) {
          evalText = "Posición aproximadamente equilibrada";
        } else {
          const pawns = (scoreCp / 100).toFixed(2);
          evalText = (scoreCp > 0 ? "+" : "") + pawns + " a favor de " + moverLabel;
        }
        if (!engineUsed) evalText += " (estimado por material)";

        return { san: mv.san, text, evalText };
      }

      // =========================
      // EXPLICACIONES (panel "Modo educativo"): explica cada jugada apenas se
      // juega, actualizando en vivo la tarjeta "Ayuda educativa".
      // =========================
      explainMode = localStorage.getItem("chessExplainMode") !== "off";
      const explainToggleEl = document.getElementById("toggle-explain");
      const explainToggleElCfg = document.getElementById("toggle-explain-cfg");
      const EDU_DEFAULT_TITLE = "Pensá antes de mover";
      const EDU_DEFAULT_TEXT = "Antes de jugar, preguntate: ¿qué amenaza mi rival?";

      function resetEduPanel() {
        const titleEl = document.getElementById("edu-title");
        const textEl = document.getElementById("edu-text");
        if (titleEl) titleEl.textContent = EDU_DEFAULT_TITLE;
        if (textEl) textEl.textContent = EDU_DEFAULT_TEXT;
      }

      function syncExplainUI() {
        if (explainToggleEl) explainToggleEl.checked = explainMode;
        if (explainToggleElCfg) explainToggleElCfg.checked = explainMode;
      }

      function setExplainMode(value) {
        explainMode = value;
        localStorage.setItem("chessExplainMode", explainMode ? "on" : "off");
        syncExplainUI();
        if (!explainMode) resetEduPanel();
        toast(explainMode ? "📚 Explicaciones activadas" : "📚 Explicaciones desactivadas");
      }

      syncExplainUI();
      if (explainToggleEl) explainToggleEl.onchange = () => setExplainMode(explainToggleEl.checked);
      if (explainToggleElCfg) explainToggleElCfg.onchange = () => setExplainMode(explainToggleElCfg.checked);

      // Decide si corresponde explicar la jugada de "moverColor" (solo al rival del bot, o a todos en modo local)
      function shouldExplainMover(moverColor) {
        return !botEnabled || moverColor === botColor;
      }

      function showMoveExplanation(fenBefore, mv) {
        if (tournamentMatchActive) return; // sin explicaciones en partidas de torneo
        if (!explainMode || !mv) return;
        if (!shouldExplainMover(mv.color)) return;

        const sideLabel = mv.color === "w" ? "Las Blancas jugaron" : "Las Negras jugaron";
        const reasons = getMoveReasons(mv);
        let text;
        if (reasons.length) {
          text = capitalizeFirst(reasons.slice(0, 2).join(", y además ")) + ".";
        } else {
          text = "Es una jugada de desarrollo o mejora posicional, sin un motivo táctico inmediato evidente.";
        }
        const tip = pickTutorTip(fenBefore);

        const titleEl = document.getElementById("edu-title");
        const textEl = document.getElementById("edu-text");
        if (!titleEl || !textEl) return;
        titleEl.textContent = mv.san + " · " + sideLabel;
        textEl.textContent = capitalizeFirst(text) + " 💡 " + tip;
      }

      async function requestTutorSuggestion() {
        if (!gameStarted || game.game_over()) {
          toast("Iniciá una partida para pedirle ayuda al tutor.");
          return;
        }

        const myToken = ++tutorRunToken;
        const btn = document.getElementById("tutor-suggest-btn");
        const output = document.getElementById("tutor-output");
        const loading = document.getElementById("tutor-loading");
        btn.disabled = true;
        output.style.display = "none";
        loading.style.display = "block";

        const fen = game.fen();
        const result = await evalPosition(fen, TUTOR_DEPTH);
        if (myToken !== tutorRunToken) return; // se pidió otra sugerencia mientras tanto

        loading.style.display = "none";
        btn.disabled = false;

        if (!result.bestMove) {
          output.style.display = "block";
          document.getElementById("tutor-move-san").textContent = "—";
          document.getElementById("tutor-eval").textContent = "";
          document.getElementById("tutor-explanation").textContent = "No hay jugadas para sugerir en esta posición.";
          document.getElementById("tutor-pv").style.display = "none";
          document.getElementById("tutor-tip").textContent = "";
          document.getElementById("tutor-play-btn").style.display = "none";
          return;
        }

        const { san, text, evalText } = explainTutorMove(fen, result.bestMove, result.score, result.engine);
        const tip = pickTutorTip(fen);
        const pvLine = pvToSanLine(fen, result.pv);

        lastTutorFen = fen;
        lastTutorMove = result.bestMove;

        document.getElementById("tutor-move-san").textContent = san;
        document.getElementById("tutor-eval").textContent = evalText;
        document.getElementById("tutor-explanation").textContent = text;
        const pvEl = document.getElementById("tutor-pv");
        if (pvLine && pvLine.split(" ").length > 1) {
          document.getElementById("tutor-pv-text").textContent = pvLine;
          pvEl.style.display = "block";
        } else {
          pvEl.style.display = "none";
        }
        document.getElementById("tutor-tip").textContent = "💡 " + tip;
        document.getElementById("tutor-play-btn").style.display = "block";
        output.style.display = "block";
      }

      function playTutorMove() {
        if (!lastTutorMove || game.fen() !== lastTutorFen) {
          toast("La posición cambió: pedile una nueva sugerencia al tutor.");
          return;
        }
        if (!gameStarted || game.game_over() || botThinking) return;
        if (botEnabled && game.turn() === botColor) return;

        const from = lastTutorMove.substring(0, 2);
        const to = lastTutorMove.substring(2, 4);
        const promotion = lastTutorMove.length > 4 ? lastTutorMove[4] : undefined;
        const move = game.move({ from, to, promotion: promotion || "q" });
        if (!move) return;

        addIncrement();
        selected = null;
        validMoves = [];
        markMoveForAnimation(move);
        playSoundForMove(move, game);
        document.getElementById("tutor-output").style.display = "none";
        lastTutorMove = null;
        lastTutorFen = null;
        render();
        checkGameOver();
        maybeTriggerBotMove();
      }

      document.getElementById("tutor-suggest-btn").onclick = requestTutorSuggestion;
      document.getElementById("tutor-play-btn").onclick = playTutorMove;

      // =========================
      // ESCUELA DE AJEDREZ: LECCIONES Y EJERCICIOS
      // =========================

      // Cada lección tiene contenido teórico y un mini-puzzle de control
      // (una sola jugada) que hay que resolver antes de poder completarla.
      const LESSONS = {
        1: {
          category: "fundamentos",
          xp: 25,
          content: `
            <h4>¿Cómo se mueve cada pieza?</h4>
            <p>El <b>peón</b> avanza una casilla (dos en su primer movimiento) y captura en diagonal. El <b>caballo</b> se mueve en "L" y es la única pieza que salta por encima de otras. El <b>alfil</b> se mueve en diagonal y siempre queda en casillas del mismo color. La <b>torre</b> se mueve en línea recta, por filas y columnas. La <b>dama</b> combina los movimientos de torre y alfil. El <b>rey</b> se mueve una casilla en cualquier dirección.</p>
            <h4>Valor aproximado</h4>
            <p>Peón = 1, Caballo = 3, Alfil = 3, Torre = 5, Dama = 9. El rey no tiene valor material: si lo pierden, pierden la partida.</p>
            <div class="mini-diagram" data-fen="8/8/8/3N4/8/8/8/8" data-highlight="b3,b5,c2,c6,e2,e6,f3,f5"></div>
            <p class="mini-diagram-caption">El caballo en d4 puede saltar a cualquiera de las 8 casillas marcadas.</p>
            <div class="lesson-tip">💡 Los caballos son mejores cerca del centro; en el borde del tablero controlan muy pocas casillas.</div>
          `,
          puzzle: {
            fen: "2b1k3/pppppppp/8/8/8/8/PPPPPPPP/1N2KB2 w - - 0 1",
            solution: ["b1c3"],
            prompt: "Es tu turno. Desarrollá el caballo hacia una casilla central.",
            success: "¡Muy bien! Cc3 lleva al caballo cerca del centro, donde controla más casillas.",
            fail: "Probá otra casilla: buscá acercar el caballo al centro del tablero.",
            hint: "El caballo se mueve en forma de L. Desde b1, una buena casilla central es c3.",
          },
        },
        2: {
          category: "fundamentos",
          xp: 30,
          content: `
            <h4>¿Cuándo conviene capturar?</h4>
            <p>No todas las capturas son buenas. Antes de capturar, comparen el valor de la pieza que capturan con el valor de la pieza que arriesgan. Capturar una pieza de mayor valor que la propia siempre es una ganancia de material.</p>
            <h4>Piezas "colgadas"</h4>
            <p>Una pieza está colgada cuando no tiene ninguna defensa y puede ser capturada gratis. Antes de cada jugada, revisen si el rival dejó alguna pieza sin proteger.</p>
            <div class="mini-diagram" data-fen="8/8/8/3n4/8/8/8/8" data-highlight="d5"></div>
            <p class="mini-diagram-caption">Este caballo no tiene ninguna pieza que lo defienda: está "colgado".</p>
            <div class="lesson-tip">💡 Contá siempre: ¿qué gano y qué puedo llegar a perder con esta captura?</div>
          `,
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
          content: `
            <h4>Jaque</h4>
            <p>Hay jaque cuando el rey está siendo atacado. Deben responder de inmediato: mover el rey, bloquear el ataque o capturar la pieza que da jaque.</p>
            <h4>Jaque mate</h4>
            <p>Si están en jaque y no hay ninguna manera de solucionarlo, es <b>jaque mate</b> y la partida termina.</p>
            <h4>Tablas</h4>
            <p>La partida puede terminar en tablas por ahogado (el jugador en turno no está en jaque pero no tiene jugadas legales), por acuerdo mutuo, o por repetición de posición.</p>
            <div class="mini-diagram" data-fen="k7/2K5/1Q6/8/8/8/8/8" data-highlight="a8"></div>
            <p class="mini-diagram-caption">Ejemplo de ahogado: el rey negro no está en jaque, pero no tiene ninguna casilla legal. Tablas.</p>
            <div class="lesson-tip">💡 Un patrón clásico: si el rey rival quedó encerrado detrás de sus propios peones, una torre o dama en la última fila puede dar jaque mate.</div>
          `,
          puzzle: {
            fen: "6k1/1ppppppp/8/8/8/8/1PPPP3/R5K1 w - - 0 1",
            solution: ["a1a8"],
            checkmate: true,
            prompt: "El rey negro está encerrado por sus propios peones. Encontrá el jaque mate en una jugada.",
            success: "¡Jaque mate! La torre controla toda la octava fila y el rey no tiene escapatoria.",
            fail: "Esa jugada no es mate. Pensá en llevar la torre a la última fila.",
            hint: "Mové la torre a lo largo de la columna 'a' hasta la última fila.",
          },
        },
        4: {
          category: "estrategia",
          xp: 40,
          content: `
            <h4>¿Por qué importa el centro?</h4>
            <p>Las casillas centrales (d4, d5, e4, e5) son las más valiosas del tablero: desde ahí, las piezas controlan más casillas y se pueden trasladar rápido a cualquier sector.</p>
            <h4>Cómo ocuparlo</h4>
            <p>En la apertura, lo habitual es avanzar los peones centrales (e4/d4 o e5/d5) para ganar espacio y abrir líneas para el desarrollo de las piezas menores.</p>
            <div class="mini-diagram" data-fen="8/8/8/8/8/8/8/8" data-highlight="d4,d5,e4,e5"></div>
            <p class="mini-diagram-caption">Las 4 casillas centrales: d4, d5, e4 y e5.</p>
            <div class="lesson-tip">💡 "Quien domina el centro, domina el tablero." Evitá mover peones de torre o de alfil temprano sin una buena razón.</div>
          `,
          puzzle: {
            fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            solution: ["e2e4", "d2d4"],
            prompt: "Es la posición inicial. Jugá un movimiento que luche por el centro.",
            success: "¡Excelente! Ese avance central abre líneas para el alfil y la dama.",
            fail: "Esa jugada no pelea por el centro. Pensá en los peones de reina o de rey.",
            hint: "Los peones 'e' y 'd' son los que controlan las casillas centrales.",
          },
        },
        5: {
          category: "estrategia",
          xp: 45,
          content: `
            <h4>Desarrollo antes que ataques prematuros</h4>
            <p>Antes de buscar amenazas, saquen sus piezas menores (caballos y alfiles) de la fila inicial. Un desarrollo rápido permite enrocar antes y evita perder tiempos.</p>
            <h4>La regla de "una pieza por jugada"</h4>
            <p>En la apertura, eviten mover dos veces la misma pieza o sacar la dama demasiado pronto: le da tiempo al rival para desarrollarse mientras la atacan.</p>
            <div class="mini-diagram" data-fen="8/8/8/8/4k3/8/8/8" data-highlight="e4"></div>
            <p class="mini-diagram-caption">Un rey en el centro, sin enrocar, es un blanco fácil para las piezas rivales.</p>
            <div class="lesson-tip">💡 Un buen orden típico: peón central, caballo, alfil, enroque.</div>
          `,
          puzzle: {
            fen: "1nb1k3/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/4KBNR w - - 0 1",
            solution: ["g1f3"],
            prompt: "Elegí la jugada que mejor combina desarrollo y preparación para enrocar.",
            success: "¡Muy bien! Cf3 desarrolla una pieza y deja el camino libre para el enroque corto.",
            fail: "Esa jugada no desarrolla una pieza nueva. Buscá sacar el caballo.",
            hint: "El caballo en g1 puede saltar a una casilla útil sin bloquear el enroque.",
          },
        },
        6: {
          category: "estrategia",
          xp: 45,
          content: `
            <h4>¿Qué es el enroque?</h4>
            <p>El enroque es la única jugada donde se mueven dos piezas a la vez: el rey se desplaza dos casillas hacia una torre, y esa torre salta al otro lado del rey. Sirve para poner al rey a resguardo y conectar las torres.</p>
            <h4>Condiciones</h4>
            <p>No pueden haber piezas entre el rey y la torre, ninguno de los dos se movió antes, el rey no puede estar en jaque, y no puede pasar ni terminar en una casilla atacada.</p>
            <div class="mini-diagram" data-fen="8/8/8/8/8/8/8/5RK1" data-highlight="f1,g1"></div>
            <p class="mini-diagram-caption">Así queda el rey y la torre después del enroque corto (O-O).</p>
            <div class="lesson-tip">💡 Como regla general, enrocá lo antes posible: un rey en el centro es un blanco fácil.</div>
          `,
          puzzle: {
            fen: "1nb1k3/pppppppp/8/8/8/8/PPPPPPPP/1NB1K2R w K - 0 1",
            solution: ["e1g1"],
            prompt: "El camino está despejado. Enrocá corto para poner a resguardo al rey.",
            success: "¡Perfecto! El enroque corto pone al rey a salvo y activa la torre.",
            fail: "Esa no es la jugada de enroque. El rey se mueve dos casillas hacia la torre.",
            hint: "Mové el rey de e1 a g1 (enroque corto).",
          },
        },
        7: {
          category: "tactica",
          xp: 50,
          content: `
            <h4>El ataque doble (horquilla)</h4>
            <p>Un ataque doble ocurre cuando una sola pieza amenaza a dos objetivos al mismo tiempo. El rival solo puede salvar uno de ellos, así que ustedes ganan material.</p>
            <h4>El caballo, especialista en horquillas</h4>
            <p>Por su movimiento en "L", el caballo es ideal para dar horquillas: puede atacar dos piezas que están lejos entre sí y que no se defienden mutuamente.</p>
            <div class="mini-diagram" data-fen="8/8/8/4N3/8/8/8/8" data-highlight="c4,c6,d3,d7,f3,f7,g4,g6"></div>
            <p class="mini-diagram-caption">Desde e5, el caballo controla estas 8 casillas a la vez: cualquier par de piezas rivales ahí puede caer en una horquilla.</p>
            <div class="lesson-tip">💡 Antes de saltar con el caballo, revisen si la casilla de destino ataca al rey y a otra pieza valiosa a la vez.</div>
          `,
          puzzle: {
            fen: "2r1k3/pppppppp/8/1N6/8/8/PPPPPPPP/1NB3K1 w - - 0 1",
            sequence: ["b5d6", "e8d8", "d6c8"],
            midMessage: "¡Cd6+ es jaque! El rey se aparta del jaque. Ahora terminá la horquilla.",
            prompt: "Encontrá la jugada de caballo que ataca al rey y a la torre al mismo tiempo, y después ganá la torre.",
            success: "¡Horquilla completa! Diste jaque con el caballo y después te comiste la torre.",
            fail: "Esa jugada no ataca dos piezas a la vez. Buscá una casilla de caballo que dé jaque.",
            hint: "Desde d6, el caballo controla e8 y c8 al mismo tiempo. Después de que el rey se mueva, comé la torre en c8.",
          },
        },
        8: {
          category: "tactica",
          xp: 50,
          content: `
            <h4>¿Qué es una clavada?</h4>
            <p>Una pieza está clavada cuando no se puede (o no conviene) mover porque detrás de ella hay una pieza más valiosa, generalmente el rey. Las clavadas absolutas (contra el rey) son ilegales de romper.</p>
            <h4>Cómo aprovecharla</h4>
            <p>Una vez clavada una pieza, suele ser un buen objetivo: pueden sumar más atacantes sobre ella, ya que no se puede escapar sin exponer al rey.</p>
            <div class="mini-diagram" data-fen="8/6k1/8/8/3n4/8/8/B7" data-highlight="d4"></div>
            <p class="mini-diagram-caption">El caballo está clavado: si se mueve, expone al rey al ataque del alfil.</p>
            <div class="lesson-tip">💡 Los alfiles y torres son las piezas que suelen clavar; siempre a lo largo de una línea recta o diagonal.</div>
          `,
          puzzle: {
            fen: "r5k1/pppppppp/4n3/8/8/8/BPPPPPPP/1N4K1 w - - 0 1",
            solution: ["a2c4"],
            prompt: "Colocá el alfil en la diagonal para clavar el caballo negro contra el rey.",
            success: "¡Bien visto! Ac4 clava el caballo: si se mueve, queda expuesto el rey.",
            fail: "Esa jugada no clava ninguna pieza. Buscá la diagonal que une al alfil con el rey rival.",
            hint: "El alfil debe quedar en la misma diagonal que el caballo y el rey negro.",
          },
        },
        9: {
          category: "tactica",
          xp: 55,
          content: `
            <h4>El ataque descubierto</h4>
            <p>Ocurre cuando mueven una pieza que estaba bloqueando el ataque de otra pieja propia (torre, alfil o dama), y al apartarse, esa pieza de atrás queda atacando algo. La pieza que se mueve también puede capturar o amenazar algo por su cuenta: es un "dos por uno".</p>
            <h4>El jaque descubierto</h4>
            <p>Es el más peligroso: al descubrir jaque, la pieza que se movió queda libre para capturar cualquier cosa, porque el rival está obligado a resolver el jaque primero.</p>
            <div class="mini-diagram" data-fen="3k4/8/8/8/3B4/8/8/3R4" data-highlight="d1,d4,d8"></div>
            <p class="mini-diagram-caption">El alfil tapa a la torre. Si se aparta (capturando algo de paso), la torre queda dando jaque.</p>
            <div class="lesson-tip">💡 Busquen piezas propias alineadas con el rey rival, con solo una pieza propia en el medio.</div>
          `,
          puzzle: {
            fen: "rn1k4/p1p1pppp/8/3B4/8/8/PPP1PPPP/1N1R2K1 w - - 0 1",
            solution: ["d5a8"],
            prompt: "El alfil bloquea a tu propia torre. Movelo para ganar material con jaque descubierto.",
            success: "¡Excelente! Al capturar la torre en a8, además descubrís el jaque de tu torre en d1 sobre el rey.",
            fail: "Esa jugada no aprovecha el ataque descubierto. Fijate qué pieza tuya bloquea a la torre en d1.",
            hint: "El alfil está sobre la misma columna que tu torre y el rey rival. Movelo capturando algo.",
          },
        },
        10: {
          category: "tactica",
          xp: 60,
          content: `
            <h4>La desviación</h4>
            <p>La desviación consiste en eliminar u obligar a moverse a la pieza que defiende algo importante (una casilla de mate, una pieza valiosa). Sin su defensor, ese punto débil queda a merced del ataque.</p>
            <h4>Cómo identificarla</h4>
            <p>Busquen qué pieza rival cumple una tarea defensiva clave, y pregúntense: "¿puedo capturarla, atacarla o forzarla a moverse?"</p>
            <div class="mini-diagram" data-fen="8/8/5n2/8/8/8/8/8" data-highlight="f6"></div>
            <p class="mini-diagram-caption">Este caballo es el único defensor de casillas clave cerca del rey. Sin él, esas casillas quedan débiles.</p>
            <div class="lesson-tip">💡 Si una sola pieza defiende dos cosas importantes, suele ser el blanco ideal para una desviación.</div>
          `,
          puzzle: {
            fen: "r5k1/pppppp1p/5n2/8/8/2B5/PPPPPPPP/1N4K1 w - - 0 1",
            solution: ["c3f6"],
            prompt: "El caballo negro es el único defensor de casillas clave cerca del rey. Eliminalo.",
            success: "¡Muy bien! Al capturar el caballo, eliminás al defensor y dejás al rey negro mucho más débil.",
            fail: "Esa jugada no elimina al defensor. Buscá una captura con el alfil.",
            hint: "El alfil en c3 y el caballo en f6 están en la misma diagonal.",
          },
        },
        11: {
          category: "tactica",
          xp: 60,
          content: `
            <h4>La sobrecarga</h4>
            <p>Una pieza está sobrecargada cuando tiene que defender dos cosas a la vez. Si la atacan con una tercera amenaza, no va a poder cumplir con las dos tareas: al resolver una, dejará la otra sin protección.</p>
            <h4>Ejemplo típico</h4>
            <p>Una torre que defiende simultáneamente la última fila (contra el mate) y una pieza propia está sobrecargada: pueden ganar esa pieza sabiendo que, si recaptura, se abre una debilidad mayor.</p>
            <div class="mini-diagram" data-fen="3r2k1/8/8/3n4/8/8/8/8" data-highlight="d5,d8"></div>
            <p class="mini-diagram-caption">La torre en d8 cumple dos tareas a la vez: defiende al caballo y controla la última fila.</p>
            <div class="lesson-tip">💡 Contá cuántas tareas defensivas tiene cada pieza rival antes de decidir un plan táctico.</div>
          `,
          puzzle: {
            fen: "1n1r2k1/ppp2ppp/8/3n4/8/1B6/PPPP4/4R1K1 w - - 0 1",
            sequence: ["b3d5", "d8d5", "e1e8"],
            checkmate: true,
            midMessage: "La torre recaptura en d5... pero eso le quita el control de la última fila.",
            prompt: "La torre negra defiende al caballo y, a la vez, la última fila. Aprovechá la sobrecarga para terminar la partida.",
            success: "¡Sobrecarga perfecta! Al capturar el caballo, la torre negra tuvo que elegir: y al recapturar, abandonó la última fila. Jaque mate.",
            fail: "Esa jugada no explota la sobrecarga. Buscá una captura con el alfil sobre el caballo.",
            hint: "El alfil puede capturar el caballo en d5. Si la torre recaptura, la última fila queda libre para tu torre.",
          },
        },
        12: {
          category: "estrategia",
          xp: 100,
          content: `
            <h4>Pensar antes de mover</h4>
            <p>Un buen método de pensamiento ajedrecístico combina varias preguntas: ¿tengo jaques, capturas o amenazas disponibles? ¿qué pieza rival está peor colocada? ¿cuál es mi pieza menos activa y cómo la mejoro?</p>
            <h4>El plan general</h4>
            <p>El ajedrez no se juega jugada por jugada sin rumbo: conviene tener siempre una idea de fondo (ganar espacio, atacar al rey, mejorar la peor pieza) y elegir jugadas que se acerquen a ese objetivo.</p>
            <div class="mini-diagram" data-fen="6k1/8/8/8/8/8/8/2B3K1" data-highlight="c1"></div>
            <p class="mini-diagram-caption">¿Cuál es tu pieza peor colocada ahora mismo? Este alfil todavía sigue en su casilla inicial.</p>
            <div class="lesson-tip">💡 Si no ven ninguna jugada táctica forzada, la mejor jugada suele ser la que mejora su pieza peor colocada.</div>
          `,
          puzzle: {
            fen: "2b3k1/pppppppp/8/8/8/N7/PPPPPPPP/5BK1 w - - 0 1",
            solution: ["a3c4"],
            prompt: "El caballo está mal ubicado en el borde. Centralizalo para mejorar tu peor pieza.",
            success: "¡Excelente aplicación del método! Un caballo centralizado vale mucho más que uno en el borde.",
            fail: "Esa jugada no mejora la posición del caballo. Buscá acercarlo al centro.",
            hint: "Desde a3, el caballo tiene una buena casilla central disponible.",
          },
        },
        13: {
          category: "fundamentos",
          xp: 40,
          content: `
            <h4>¿Cómo se lee una jugada?</h4>
            <p>Cada casilla se nombra con una letra (columna, de "a" a "h") y un número (fila, de 1 a 8). Las piezas se abrevian: R=Rey (K en inglés), D=Dama (Q), T=Torre (R), A=Alfil (B), C=Caballo (N). Los peones no llevan letra.</p>
            <h4>Ejemplos</h4>
            <p>"e4" significa que un peón avanza a e4. "Cf3" significa que un caballo se mueve a f3. "Cxf3" indica que esa jugada captura una pieza. "O-O" es el enroque corto.</p>
            <div class="mini-diagram" data-fen="8/8/8/8/8/5N2/8/8" data-highlight="f3"></div>
            <p class="mini-diagram-caption">La casilla "f3": columna f, fila 3.</p>
            <div class="lesson-tip">💡 Practicar la notación les permite seguir partidas de otros jugadores y analizar las suyas.</div>
          `,
          puzzle: {
            fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            solution: ["g1f3"],
            prompt: "Jugá el movimiento que en notación se escribe 'Cf3'.",
            success: "¡Correcto! Esa es exactamente la jugada Cf3: el caballo de rey se desarrolla.",
            fail: "Esa no es la jugada Cf3. Recordá: C = caballo, y f3 es la casilla de destino.",
            hint: "Buscá el caballo que puede llegar a la casilla f3 en una jugada.",
          },
        },
        14: {
          category: "fundamentos",
          xp: 45,
          content: `
            <h4>¿Cuándo conviene cambiar piezas?</h4>
            <p>Cambiar piezas (intercambiarlas por otras de valor similar) suele convenir cuando están mejor posicionados, cuando tienen ventaja material (simplificar ayuda a concretar la ventaja) o cuando eliminan la pieza más activa del rival.</p>
            <h4>Cuándo evitarlo</h4>
            <p>Si están peor o necesitan complicar la partida, evitar cambios suele dar más chances, ya que mantiene piezas en el tablero para generar contrajuego.</p>
            <div class="mini-diagram" data-fen="4k3/8/8/8/8/1P6/8/4K3" data-highlight="b3"></div>
            <p class="mini-diagram-caption">Con una ventaja de material (como este peón de más), cambiar piezas ayuda a simplificar hacia la victoria.</p>
            <div class="lesson-tip">💡 Regla práctica: si están mejor, cambien piezas (no peones); si están peor, evítenlo.</div>
          `,
          puzzle: {
            fen: "1n2k3/pppppppp/8/3q4/3Q4/1P6/P1PPPPPP/1N2K3 w - - 0 1",
            solution: ["d4d5"],
            prompt: "Tenés una ventaja de material (un peón de más). Cambiá las damas para simplificar la posición.",
            success: "¡Bien pensado! Al cambiar damas estando mejor, se acercan a ganar la partida con menos riesgo.",
            fail: "Esa jugada no cambia las damas. Buscá la captura de dama por dama.",
            hint: "Las dos damas están en la misma columna.",
          },
        },
        15: {
          category: "estrategia",
          xp: 55,
          content: `
            <h4>¿Qué es una columna abierta?</h4>
            <p>Es una columna sin peones de ningún color. Las torres son mucho más fuertes ahí porque pueden moverse libremente de un extremo al otro del tablero e infiltrarse en el campo rival.</p>
            <h4>Cómo usarla</h4>
            <p>Coloquen sus torres en columnas abiertas (o semiabiertas, sin peones propios) apenas puedan. Suele ser más importante que mover un peón más en el flanco.</p>
            <div class="mini-diagram" data-fen="6k1/ppp1pppp/8/8/8/8/PPP1PPPP/R5K1" data-highlight="d1,d2,d3,d4,d5,d6,d7,d8"></div>
            <p class="mini-diagram-caption">La columna "d" no tiene peones de ningún color: está abierta.</p>
            <div class="lesson-tip">💡 "Torre en columna abierta" es uno de los principios estratégicos más útiles para el medio juego.</div>
          `,
          puzzle: {
            fen: "1n3bk1/ppp1pppp/8/8/8/8/PPP1PPPP/R4BK1 w - - 0 1",
            solution: ["a1d1"],
            prompt: "La columna 'd' está completamente abierta. Llevá tu torre ahí.",
            success: "¡Perfecto! Td1 ocupa la única columna abierta del tablero.",
            fail: "Esa jugada no coloca la torre en la columna abierta. Fijate qué columna no tiene peones.",
            hint: "Ninguna de las dos partes tiene peones en la columna 'd'.",
          },
        },
        16: {
          category: "estrategia",
          xp: 55,
          content: `
            <h4>Caballo bueno vs. caballo malo</h4>
            <p>Un caballo en el borde del tablero (columnas 'a' u 'h') controla muy pocas casillas y suele estar "malo". Un caballo en el centro, apoyado por un peón y sin poder ser atacado por peones rivales, es una pieza excelente: se llama <b>outpost</b> o "casilla fuerte".</p>
            <h4>Cómo mejorarlo</h4>
            <p>Si su caballo está mal ubicado, busquen la ruta más corta para llevarlo a una casilla central protegida.</p>
            <div class="mini-diagram" data-fen="8/8/8/3N4/8/8/8/N7" data-highlight="d5"></div>
            <p class="mini-diagram-caption">El caballo en a1 apenas controla 2 casillas; el mismo caballo en d5 controla hasta 8.</p>
            <div class="lesson-tip">💡 Antes de mover otra pieza, revisen si su caballo peor colocado tiene una ruta de mejora disponible.</div>
          `,
          puzzle: {
            fen: "2b3k1/pppppppp/8/8/N7/8/PPPPPPPP/5BK1 w - - 0 1",
            solution: ["a4c5"],
            prompt: "El caballo está en el borde, sin controlar casi nada. Llevalo a una casilla central.",
            success: "¡Bien! Esa casilla central es mucho más fuerte que el borde del tablero.",
            fail: "Esa jugada no mejora al caballo. Buscá una casilla más central.",
            hint: "Desde a4, el caballo tiene una casilla central disponible en la columna 'c'.",
          },
        },
        17: {
          category: "tactica",
          xp: 60,
          content: `
            <h4>El doble ataque con la dama</h4>
            <p>La dama, al combinar los movimientos de torre y alfil, es ideal para atacar dos piezas a la vez desde una sola casilla, incluso en direcciones distintas (una por columna o fila, otra por diagonal).</p>
            <h4>Cómo buscarlo</h4>
            <p>Fíjense si hay dos piezas rivales sin defensa que compartan una fila, columna o diagonal con una misma casilla disponible para su dama.</p>
            <div class="mini-diagram" data-fen="8/8/8/8/3Q4/8/8/8" data-highlight="d1,d8,a4,h4,a1,g7"></div>
            <p class="mini-diagram-caption">Desde d4, la dama controla toda la columna, la fila y las dos diagonales a la vez.</p>
            <div class="lesson-tip">💡 Un doble ataque de dama suele ganar material aunque el rival tenga jaque o amenazas propias, siempre que puedan calcular bien el orden de jugadas.</div>
          `,
          puzzle: {
            fen: "4k3/pppnpppp/8/r7/8/8/PP1PPPPP/3Q2K1 w - - 0 1",
            sequence: ["d1a4", "a5a6", "a4d7"],
            midMessage: "La torre se salva corriendo por la columna 'a'. El caballo quedó solo: andá por él.",
            prompt: "Encontrá la jugada de dama que ataca la torre y el caballo negros al mismo tiempo, y quedate con la pieza que no pueda salvar.",
            success: "¡Doble ataque perfecto! Dxa4 amenazó las dos piezas; al salvar la torre, te quedaste con el caballo.",
            fail: "Esa jugada no ataca las dos piezas a la vez. Buscá una casilla que una la columna de la torre con la diagonal del caballo.",
            hint: "Buscá una casilla en la misma columna que la torre y en la misma diagonal que el caballo. Si salvan la torre, comé el caballo.",
          },
        },
        18: {
          category: "tactica",
          xp: 70,
          content: `
            <h4>La jugada intermedia (zwischenzug)</h4>
            <p>A veces, antes de resolver el intercambio o la jugada "obvia", conviene intercalar una jugada más fuerte (un jaque o una amenaza mayor) que cambie la evaluación de la posición. El rival debe responder a esa jugada primero.</p>
            <h4>Cómo detectarla</h4>
            <p>Antes de recapturar automáticamente, pregúntense: "¿tengo un jaque o una amenaza más fuerte disponible ahora mismo?"</p>
            <div class="mini-diagram" data-fen="4k3/8/8/1B6/8/8/8/8" data-highlight="b5,c6,d7,e8"></div>
            <p class="mini-diagram-caption">Antes de resolver lo obvio, revisen si hay un jaque disponible como este.</p>
            <div class="lesson-tip">💡 No siempre la jugada más obvia es la mejor: revisen si hay una jugada intermedia antes de continuar la secuencia esperada.</div>
          `,
          puzzle: {
            fen: "1n2k3/pppp1ppp/8/8/3r4/3B4/PPP1PPPP/3Q2K1 w - - 0 1",
            sequence: ["d3b5", "e8e7", "d1d4"],
            midMessage: "Ab5+ obliga al rey a moverse antes de ocuparte de cualquier otra cosa.",
            prompt: "Podrías capturar la torre directamente, pero hay una jugada intermedia mejor. Encontrala, y después capturá la torre.",
            success: "¡Excelente! Ab5+ es la jugada intermedia: ganás un tiempo con jaque y después te quedás con la torre igual.",
            fail: "Esa jugada no es la intermedia más fuerte. Pensá en un jaque con el alfil antes de capturar la torre.",
            hint: "El alfil puede dar jaque en lugar de capturar directamente. Después de que el rey se mueva, capturá la torre con la dama.",
          },
        },
        19: {
          category: "tactica",
          xp: 80,
          content: `
            <h4>¿Qué es un sacrificio?</h4>
            <p>Sacrificar es entregar material a cambio de una compensación mayor: un ataque decisivo, jaque mate, o una ventaja posicional muy grande. No todo sacrificio es correcto: hay que calcular bien lo que se obtiene a cambio.</p>
            <h4>El "sacrificio griego" (Axh7+)</h4>
            <p>Un patrón clásico: si el rey rival enrocó corto y su alfil apunta a h7 (o h2), a veces se puede sacrificar el alfil ahí para exponer al rey y lanzar un ataque decisivo con las piezas restantes.</p>
            <div class="mini-diagram" data-fen="8/8/8/8/8/8/2B5/8" data-highlight="c2,d3,e4,f5,g6,h7"></div>
            <p class="mini-diagram-caption">La diagonal larga hacia h7: la ruta clásica del sacrificio griego.</p>
            <div class="lesson-tip">💡 Antes de sacrificar, calculen al menos 2 o 3 jugadas del ataque resultante: un sacrificio sin seguimiento concreto suele ser solo pérdida de material.</div>
          `,
          puzzle: {
            fen: "r5k1/pppppppp/8/8/8/3B1N2/PPPPPPPP/R5K1 w - - 0 1",
            sequence: ["d3h7", "g8h7", "f3g5"],
            midMessage: "El rey captura el alfil... y camina directo hacia el resto del ataque.",
            prompt: "El rey negro enrocó corto y tu alfil apunta directo a h7. Jugá el sacrificio clásico y continuá el ataque.",
            success: "¡Sacrificio griego completo! Axh7+ Rxh7 Cg5+ expone al rey negro por completo: el ataque recién empieza.",
            fail: "Esa jugada no es el sacrificio en h7. Fijate en qué diagonal está tu alfil.",
            hint: "El alfil en d3 apunta directo a la casilla h7. Después de que el rey capture, seguí el ataque con el caballo.",
          },
        },
        20: {
          category: "estrategia",
          xp: 120,
          content: `
            <h4>Cómo armar un plan</h4>
            <p>Después de la apertura, cada posición pide un plan concreto: puede ser ganar espacio, atacar al rey, mejorar la peor pieza o crear una debilidad en el bando rival. Un plan da sentido a cada jugada individual.</p>
            <h4>Señales para elegir un plan</h4>
            <p>Miren la estructura de peones, la seguridad de ambos reyes y qué piezas están mejor o peor colocadas. Eso les va a indicar de qué lado del tablero conviene jugar.</p>
            <div class="mini-diagram" data-fen="6k1/5ppp/8/8/8/8/5PPP/6K1" data-highlight="f2,g2,h2"></div>
            <p class="mini-diagram-caption">Un plan concreto: avanzar estos tres peones para atacar al rey enrocado.</p>
            <div class="lesson-tip">💡 Un plan simple y consistente vence a una sucesión de jugadas sueltas sin conexión entre sí.</div>
          `,
          puzzle: {
            fen: "2b3k1/ppppp1pp/5n2/8/4P3/8/PPPP1PPP/2B3K1 w - - 0 1",
            solution: ["e4e5"],
            prompt: "Elegí la jugada que ejecuta un plan claro: ganar espacio y ganar tiempo atacando al caballo.",
            success: "¡Gran plan! e5 gana espacio y obliga al caballo negro a retroceder, perdiendo tiempo.",
            fail: "Esa jugada no sigue el plan de ganar espacio con tempo. Pensá en avanzar el peón central.",
            hint: "El peón central puede avanzar una casilla y atacar al caballo negro.",
          },
        },
      };

      // Cada ejercicio es un mini-puzzle de una sola jugada, evaluado
      // contra el tablero real mediante chess.js.
      const EXERCISES = {
        1: {
          category: "principiante",
          xp: 20,
          fen: "3nkb2/1pp2ppp/8/8/r2Q4/8/1PP2PPP/1N4K1 w - - 0 1",
          solution: ["d4a4"],
          prompt: "Tu dama puede capturar la torre o el caballo negros. Elegí la captura que gana más material.",
          success: "¡Correcto! La torre vale más que el caballo: Dxa4 es la mejor captura.",
          fail: "Esa captura suma menos material. Compará el valor de la torre y del caballo, y elegí la pieza más valiosa.",
          hint: "Compará: torre = 5 puntos, caballo = 3 puntos.",
        },
        2: {
          category: "principiante",
          xp: 20,
          fen: "2b1k3/pp3ppp/8/8/6n1/8/PP3PPP/1N2K2R w K - 0 1",
          solution: ["e1g1"],
          prompt: "Es tu turno. Poné a resguardo al rey con la mejor jugada de seguridad.",
          success: "¡Bien! El enroque corto es la jugada más segura para tu rey en esta posición.",
          fail: "Esa jugada no mejora la seguridad del rey. Pensá en enrocar.",
          hint: "El rey puede enrocar corto: se mueve dos casillas hacia la torre.",
        },
        3: {
          category: "estrategia",
          xp: 30,
          fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          solution: ["e2e4", "d2d4", "g1f3", "c2c4"],
          prompt: "Elegí una jugada de apertura sólida que luche por el centro o desarrolle una pieza.",
          success: "¡Buena elección! Es una de las jugadas de apertura más sólidas y más jugadas a nivel mundial.",
          fail: "Esa jugada no es la más recomendable para empezar. Pensá en los peones centrales o en desarrollar un caballo.",
          hint: "e4, d4, Cf3 y c4 son las jugadas de apertura más comunes y sólidas.",
        },
        4: {
          category: "tactica",
          xp: 35,
          fen: "r1q3k1/pp3ppp/2N5/8/8/8/PP3PPP/2B3K1 w - - 0 1",
          sequence: ["c6e7", "g8f8", "e7c8"],
          midMessage: "Ce7+ es jaque: el rey se aparta. Ahora completá la horquilla.",
          prompt: "Encontrá el salto de caballo que ataca al rey y a la dama negros a la vez, y después ganá la dama.",
          success: "¡Horquilla real completa! Diste jaque con el caballo y después ganaste la dama.",
          fail: "Esa jugada no genera un ataque doble. Buscá una casilla de caballo que dé jaque.",
          hint: "Desde e7, el caballo controla tanto c8 como g8. Después del jaque, comé la dama en c8.",
        },
        5: {
          category: "tactica",
          xp: 35,
          fen: "2b3k1/p1p2ppp/8/4n2q/8/8/P1P2PPP/1RB3K1 w - - 0 1",
          solution: ["b1b5"],
          prompt: "Clavá el caballo negro contra la dama llevando tu torre a la quinta fila.",
          success: "¡Bien visto! Tb5 clava el caballo: si se mueve, pierde la dama.",
          fail: "Esa jugada no clava ninguna pieza. Buscá la fila que comparten el caballo y la dama negros.",
          hint: "El caballo y la dama negros están en la misma fila (la 5).",
        },
        6: {
          category: "tactica",
          xp: 50,
          fen: "rn4kb/1ppppp1p/8/8/8/8/2PPPPPP/QN4K1 w - - 0 1",
          solution: ["a1a8"],
          prompt: "Tenés dos capturas con jaque disponibles. Elegí la que gana más material.",
          success: "¡Correcto! Dxa8+ gana la torre (más valiosa que el alfil) y además da jaque.",
          fail: "Esa captura suma menos material. Compará el valor de la torre y el del alfil antes de elegir.",
          hint: "Torre = 5 puntos, alfil = 3 puntos. Elegí capturar la pieza más valiosa.",
        },
        7: {
          category: "estrategia",
          xp: 50,
          fen: "r5k1/ppp1p1pp/5n2/8/8/8/PPP2PPP/1NB3K1 w - - 0 1",
          solution: ["c1g5"],
          prompt: "Tu alfil sigue en la fila inicial. Activalo presionando al caballo negro.",
          success: "¡Buena mejora de pieza! Ag5 activa tu peor pieza y presiona al caballo.",
          fail: "Esa jugada no activa al alfil de la mejor manera. Buscá la diagonal larga hacia el caballo.",
          hint: "El alfil puede salir por la diagonal hasta la casilla g5.",
        },
        8: {
          category: "tactica",
          xp: 75,
          fen: "7k/2pp2pp/8/8/8/8/2PPP3/1Q4K1 w - - 0 1",
          solution: ["b1b8"],
          checkmate: true,
          prompt: "El rey negro está atrapado en la esquina por sus propios peones. Encontrá el mate en una jugada.",
          success: "¡Jaque mate! La dama controla toda la última fila y el rey no tiene ninguna escapatoria.",
          fail: "Esa jugada no es mate. Pensá en llevar la dama a la última fila.",
          hint: "Llevá la dama por la columna 'b' hasta la última fila.",
        },
        9: {
          category: "principiante",
          xp: 25,
          fen: "1n2k3/pppppppp/8/8/2B5/8/PP1PPPPP/1N4K1 w - - 0 1",
          solution: ["c4f7"],
          prompt: "Leé bien la posición: hay un peón negro totalmente indefenso. Capturalo.",
          success: "¡Bien leído! El peón en f7 no tenía ninguna defensa, y de paso das jaque.",
          fail: "Todavía hay una captura gratis disponible. Revisá qué peón negro no tiene ninguna pieza que lo proteja.",
          hint: "El alfil y el peón negro comparten la misma diagonal.",
        },
        10: {
          category: "principiante",
          xp: 25,
          fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          solution: ["e2e4"],
          prompt: "Jugá exactamente el movimiento que en notación se escribe 'e4'.",
          success: "¡Correcto! Esa jugada es exactamente 'e4': el peón de rey avanza dos casillas.",
          fail: "Esa no es la jugada 'e4'. Fijate bien qué peón y qué casilla indica la notación.",
          hint: "Buscá el peón que puede llegar a la casilla e4 en una sola jugada.",
        },
        11: {
          category: "estrategia",
          xp: 35,
          fen: "6k1/pppp1ppp/8/8/8/8/PPPP1PPP/5RK1 w - - 0 1",
          solution: ["f1e1"],
          prompt: "Encontrá la única columna sin peones y colocá tu torre ahí.",
          success: "¡Perfecto! La columna 'e' está completamente abierta: tu torre queda mucho más activa ahí.",
          fail: "Esa jugada no coloca la torre en la columna abierta. Fijate cuál es la única columna sin peones.",
          hint: "Ninguna de las dos partes tiene peones en la columna 'e'.",
        },
        12: {
          category: "estrategia",
          xp: 40,
          fen: "2b1k3/pppppppp/8/8/8/8/PPPP1PPP/4KB1N w - - 0 1",
          solution: ["h1g3"],
          prompt: "Tu caballo está totalmente aislado en el borde. Mejoralo llevándolo hacia el centro.",
          success: "¡Bien! Cg3 saca al caballo del borde y lo acerca a casillas mucho más útiles.",
          fail: "Esa jugada no mejora al caballo. Buscá una casilla más cercana al centro.",
          hint: "Desde h1, el caballo tiene una única casilla razonable de desarrollo.",
        },
        13: {
          category: "estrategia",
          xp: 50,
          fen: "1nb3k1/1ppppppp/8/8/8/8/PPPPPPPP/1N4K1 w - - 0 1",
          solution: ["a2a4"],
          prompt: "Elegí la jugada que empieza un plan de expansión en el flanco de dama.",
          success: "¡Buen plan! Avanzar el peón dos casillas gana espacio de inmediato en ese flanco.",
          fail: "Esa jugada no es la más ambiciosa para empezar el plan. Pensá en avanzar el peón dos casillas.",
          hint: "El peón todavía no se movió: puede avanzar una o dos casillas.",
        },
        14: {
          category: "tactica",
          xp: 40,
          fen: "6k1/pppppppp/8/2n1b3/8/3P4/PPP1PPPP/6K1 w - - 0 1",
          sequence: ["d3d4", "e5f6", "d4c5"],
          midMessage: "Salvaron el alfil, que valía más. El caballo quedó indefenso: comelo.",
          prompt: "Encontrá el avance de peón que ataca al caballo y al alfil negros a la vez, y quedate con la pieza que no puedan salvar.",
          success: "¡Horquilla de peón completa! d4 atacó las dos piezas; al salvar el alfil, ganaste el caballo igual.",
          fail: "Esa jugada no genera la horquilla. Pensá en avanzar el peón una casilla.",
          hint: "Un peón blanco ataca en diagonal hacia adelante. Buscá la casilla que ataque dos piezas a la vez, y después comé la que quedó sin defensa.",
        },
        15: {
          category: "tactica",
          xp: 50,
          fen: "r1b1k3/pp1p1ppp/8/1N6/8/8/PPPP1PPP/2B3K1 w - - 0 1",
          sequence: ["b5c7", "e8e7", "c7a8"],
          midMessage: "Cc7+ es jaque: el rey se aparta. Ahora terminá de ganar la torre.",
          prompt: "En vez de una jugada tranquila, encontrá la jugada intermedia que da jaque, y después ganá la torre.",
          success: "¡Excelente intermedia! Cc7+ ganó tiempo con jaque y después te llevaste la torre en a8.",
          fail: "Esa jugada no es la intermedia más fuerte. Buscá un salto de caballo que dé jaque.",
          hint: "Desde c7, el caballo ataca tanto al rey como a la torre. Después del jaque, comé la torre en a8.",
        },
        16: {
          category: "tactica",
          xp: 55,
          fen: "r5k1/pppppppp/8/8/8/4N3/PBPPPPPP/R5K1 w - - 0 1",
          sequence: ["b2g7", "g8g7", "e3f5"],
          midMessage: "El rey recaptura el alfil... y queda mucho más expuesto de lo que parece.",
          prompt: "Evaluá si conviene sacrificar el alfil para exponer al rey negro. Jugalo y seguí el ataque.",
          success: "¡Sacrificio correcto! Axg7 destruyó el refugio del rey negro, y el caballo llegó con jaque para continuar el ataque.",
          fail: "Esa jugada no es el sacrificio que expone al rey. Fijate en qué diagonal larga está tu alfil.",
          hint: "El alfil en b2 apunta directo a la casilla g7 por la diagonal larga. Después de la recaptura, seguí con el caballo.",
        },
        17: {
          category: "tactica",
          xp: 60,
          fen: "k7/pp2pp2/8/8/8/8/4PPP1/1NQ3K1 w - - 0 1",
          solution: ["c1c8"],
          checkmate: true,
          prompt: "El rey negro está atrapado por sus propios peones. Encontrá el mate en una jugada.",
          success: "¡Jaque mate! El rey no puede capturar la dama ni escapar: sus propios peones se lo impiden.",
          fail: "Esa jugada no es mate. Pensá en llevar la dama a la última fila, lejos del alcance del rey.",
          hint: "La dama puede llegar a la última fila por la columna 'c'.",
        },
        18: {
          category: "tactica",
          xp: 65,
          fen: "3rk3/pppp1ppp/8/4N3/8/8/PPPP1PPP/4R1K1 w - - 0 1",
          sequence: ["e5c6", "e8e7", "c6d8"],
          midMessage: "El jaque descubierto obliga al rey a moverse. Ahora calculá la segunda jugada y quedate con la torre.",
          prompt: "Calculá dos jugadas: encontrá el salto de caballo que descubre jaque, y después ganá la torre negra.",
          success: "¡Cálculo perfecto! Cc6+ descubrió el jaque de tu torre y, dos jugadas después, ganaste la torre.",
          fail: "Esa jugada no descubre el jaque. Pensá en apartar el caballo de la columna 'e'.",
          hint: "Tu torre en e1 y el rey negro están en la misma columna: el caballo la está tapando. Después del jaque, comé la torre en d8.",
        },
        19: {
          category: "estrategia",
          xp: 70,
          fen: "2k5/8/8/8/8/8/2P5/2K5 w - - 0 1",
          solution: ["c1b2", "c1d2", "c1b1", "c1d1"],
          prompt: "Todavía no conviene avanzar el peón. Mejorá primero la posición de tu rey.",
          success: "¡Buena decisión! En los finales de peones, conviene activar el rey antes de avanzar el peón.",
          fail: "Avanzar el peón ahora no es la mejor decisión. Activá primero tu rey.",
          hint: "Mové el rey hacia el centro o hacia el peón, en lugar de avanzar el peón.",
        },
        20: {
          category: "tactica",
          xp: 100,
          fen: "1n4k1/ppp1pppp/8/8/8/8/PPP1PPPP/1N1Q2K1 w - - 0 1",
          solution: ["d1d8"],
          checkmate: true,
          prompt: "Combiná todo lo aprendido y encontrá el jaque mate en una jugada.",
          success: "¡Jaque mate! Dd8 controla toda la última fila y los propios peones negros sellan la suerte del rey.",
          fail: "Esa jugada no es mate. Pensá en llevar la dama a la última fila por una columna despejada.",
          hint: "La columna 'd' está completamente libre hasta la última fila.",
        },
      };

      const LESSON_CATEGORY_LABEL = { fundamentos: "Fundamentos", estrategia: "Estrategia", tactica: "Táctica" };
      const EXERCISE_CATEGORY_LABEL = { principiante: "Principiante", estrategia: "Estrategia", tactica: "Táctica" };

      // -------- Progreso: filtros --------
      function wireFilterButtons(selector, cardSelector, dataAttr, emptyElId) {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach((btn) => {
          btn.addEventListener("click", () => {
            buttons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            const filter = btn.dataset[dataAttr];
            const cards = document.querySelectorAll(cardSelector);
            let visibleCount = 0;
            cards.forEach((card) => {
              const show = filter === "all" || card.dataset.category === filter;
              card.style.display = show ? "" : "none";
              if (show) visibleCount++;
            });
            const emptyEl = document.getElementById(emptyElId);
            if (emptyEl) emptyEl.style.display = visibleCount === 0 ? "" : "none";
          });
        });
      }
      wireFilterButtons("[data-learning-filter]", "[data-lesson-card]", "learningFilter", "learning-empty");
      wireFilterButtons("[data-exercise-filter]", "[data-exercise-card]", "exerciseFilter", null);

      // -------- Progreso de lecciones --------
      function updateLearningProgress() {
        const completed = state.lessonsCompleted || [];
        const total = Object.keys(LESSONS).length;
        const pct = Math.round((completed.length / total) * 100);
        const textEl = document.getElementById("learning-progress-text");
        const barEl = document.getElementById("learning-progress-bar");
        const detailEl = document.getElementById("learning-progress-detail");
        if (textEl) textEl.textContent = pct + "%";
        if (barEl) barEl.style.width = pct + "%";
        if (detailEl) detailEl.textContent = `${completed.length} de ${total} lecciones completadas`;

        document.querySelectorAll("[data-lesson-card]").forEach((card) => {
          const id = card.dataset.lessonId;
          const isDone = completed.includes(id);
          card.classList.toggle("completed", isDone);
          const btn = card.querySelector(".lesson-btn");
          if (btn) btn.textContent = isDone ? "✓ Repasar" : "Comenzar";
        });
      }

      function updateExerciseDashboard() {
        const stats = state.exerciseStats || { solved: [], firstTry: 0, attempts: 0, streak: 0, bestStreak: 0 };
        const totalEl = document.getElementById("exercise-total-stat");
        const correctEl = document.getElementById("exercise-correct-stat");
        const streakEl = document.getElementById("exercise-streak-stat");
        const bestEl = document.getElementById("exercise-best-stat");
        if (totalEl) totalEl.textContent = (stats.solved || []).length;
        if (correctEl) {
          const pct = stats.attempts ? Math.round((stats.firstTry / stats.attempts) * 100) : 0;
          correctEl.textContent = pct + "%";
        }
        if (streakEl) streakEl.textContent = (stats.streak || 0) + " 🔥";
        if (bestEl) bestEl.textContent = stats.bestStreak || 0;

        document.querySelectorAll("[data-exercise-card]").forEach((card) => {
          const id = card.dataset.exerciseId;
          const isDone = (stats.solved || []).includes(id);
          card.classList.toggle("completed", isDone);
        });
      }

      function ensureLearningState() {
        if (!state.lessonsCompleted) state.lessonsCompleted = [];
        if (!state.exerciseStats) {
          state.exerciseStats = { solved: [], firstTry: 0, attempts: 0, streak: 0, bestStreak: 0 };
        }
      }
      ensureLearningState();

      // -------- Mini-tablero interactivo (para lecciones y ejercicios) --------
      // Construye una grilla de 8x8 (casillas + piezas) a partir de una matriz
      // homogénea. La usan tanto el mini-tablero jugable como los diagramas
      // estáticos, para no duplicar la lógica de dibujo en dos lugares.
      function renderBoardGrid(boardEl, matrix, options = {}) {
        boardEl.innerHTML = "";
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const sqName = FILES[c] + (8 - r);
            const sq = document.createElement("div");
            sq.className = "square " + ((r + c) % 2 ? "dark" : "light");
            sq.dataset.square = sqName;
            if (options.selected === sqName) sq.classList.add("selected");
            if (options.highlight && options.highlight.includes(sqName)) sq.classList.add("diagram-highlight");
            const p = matrix[r][c];
            if (p) {
              const piece = document.createElement("div");
              piece.className = "piece " + (p.color === "w" ? "piece-white" : "piece-black");
              piece.textContent = PIECES[p.color + p.type.toUpperCase()];
              sq.appendChild(piece);
            }
            if (options.onClick) sq.addEventListener("click", () => options.onClick(sqName));
            boardEl.appendChild(sq);
          }
        }
      }

      // Convierte la parte de posición de un FEN en la misma matriz 8x8
      // (fila 0 = octava fila) que usa chess.js en .board(), para poder
      // reusar renderBoardGrid con posiciones estáticas (sin new Chess()).
      function fenBoardToMatrix(fen) {
        const rows = fen.split(" ")[0].split("/");
        const matrix = [];
        for (let r = 0; r < 8; r++) {
          const row = [];
          for (const ch of rows[r]) {
            if (/\d/.test(ch)) {
              for (let k = 0; k < parseInt(ch, 10); k++) row.push(null);
            } else {
              row.push({ color: ch === ch.toUpperCase() ? "w" : "b", type: ch.toLowerCase() });
            }
          }
          matrix.push(row);
        }
        return matrix;
      }

      function createPuzzleBoard(boardEl) {
        const ctx = {
          chess: null,
          selected: null,
          solvedOrFailed: false,
          onResult: null,
        };

        function draw() {
          renderBoardGrid(boardEl, ctx.chess.board(), { selected: ctx.selected, onClick: onSquareClick });
        }

        function flash(sqName, className) {
          const sqEl = boardEl.querySelector(`[data-square="${sqName}"]`);
          if (!sqEl) return;
          sqEl.classList.add(className);
          setTimeout(() => sqEl.classList.remove(className), 500);
        }

        async function onSquareClick(sqName) {
          if (ctx.solvedOrFailed) return;
          const piece = ctx.chess.get(sqName);
          if (ctx.selected === sqName) {
            ctx.selected = null;
            draw();
            return;
          }
          if (ctx.selected) {
            const from = ctx.selected;
            let promotion = "q";
            if (isPromotionMove(ctx.chess, from, sqName)) {
              const color = ctx.chess.turn();
              ctx.selected = null;
              draw();
              promotion = await askPromotion(color);
            }
            const attempt = { from, to: sqName, promotion };
            const uci = from + sqName;
            ctx.selected = null;
            attemptMove(uci, attempt);
            return;
          }
          if (piece && piece.color === ctx.chess.turn()) {
            ctx.selected = sqName;
            draw();
          }
        }

        function attemptMove(uci, attempt) {
          if (ctx.onAttempt) ctx.onAttempt(uci, attempt);
        }

        ctx.load = function (fen) {
          ctx.chess = new Chess(fen);
          ctx.selected = null;
          ctx.solvedOrFailed = false;
          draw();
        };
        ctx.draw = draw;
        ctx.flash = flash;
        return ctx;
      }

      const lessonBoardCtx = createPuzzleBoard(document.getElementById("lesson-puzzle-board"));
      const exerciseBoardCtx = createPuzzleBoard(document.getElementById("exercise-puzzle-board"));

      // Motor genérico de puzzles: soporta tanto la jugada única "de siempre"
      // (puzzle.solution / puzzle.checkmate) como secuencias de varias jugadas
      // (puzzle.sequence: ["jugadorUCI", "rivalUCI", "jugadorUCI", ...]) donde
      // las jugadas del rival se reproducen solas.
      function makeSequenceRunner(boardCtx, feedbackEl, retryBtnEl) {
        const rt = { stepIndex: 0, resolved: false, failedOnce: false, puzzle: null };

        rt.start = function (puzzle) {
          rt.puzzle = puzzle;
          rt.stepIndex = 0;
          rt.resolved = false;
          rt.failedOnce = false;
          boardCtx.load(puzzle.fen);
          boardCtx.solvedOrFailed = false;
          feedbackEl.textContent = "";
          feedbackEl.className = "puzzle-feedback";
          if (retryBtnEl) retryBtnEl.style.display = "none";
        };

        rt.isLastPlayerStep = function () {
          const seq = rt.puzzle.sequence;
          if (!seq) return true;
          return rt.stepIndex === seq.length - 1;
        };

        rt.attempt = function (uci, attempt, callbacks) {
          const { onSolved, onWrong } = callbacks || {};
          if (rt.resolved || boardCtx.solvedOrFailed) return;
          const testChess = new Chess(boardCtx.chess.fen());
          const move = testChess.move(attempt);
          if (!move) {
            boardCtx.draw();
            return;
          }

          const puzzle = rt.puzzle;
          const isFinal = rt.isLastPlayerStep();
          let isCorrect;
          if (puzzle.sequence) {
            const expected = puzzle.sequence[rt.stepIndex];
            isCorrect = isFinal && puzzle.checkmate ? testChess.in_checkmate() : uci === expected;
          } else {
            isCorrect = puzzle.checkmate ? testChess.in_checkmate() : puzzle.solution.includes(uci);
          }

          if (!isCorrect) {
            boardCtx.draw();
            boardCtx.flash(attempt.to, "wrong-flash");
            feedbackEl.textContent = "❌ " + puzzle.fail;
            feedbackEl.className = "puzzle-feedback wrong";
            if (retryBtnEl) retryBtnEl.style.display = "";
            const wasFirstFailure = !rt.failedOnce;
            rt.failedOnce = true;
            if (onWrong) onWrong(wasFirstFailure);
            return;
          }

          boardCtx.chess = testChess;
          boardCtx.draw();
          boardCtx.flash(attempt.to, "solved-flash");

          if (isFinal) {
            rt.resolved = true;
            boardCtx.solvedOrFailed = true;
            feedbackEl.textContent = "✅ " + puzzle.success;
            feedbackEl.className = "puzzle-feedback correct";
            if (onSolved) onSolved();
            return;
          }

          // Hay una respuesta del rival programada: la reproducimos sola.
          feedbackEl.textContent = "✅ " + (puzzle.midMessage || "¡Bien! El rival responde. Seguí calculando.");
          feedbackEl.className = "puzzle-feedback correct";
          boardCtx.solvedOrFailed = true;
          const autoUci = puzzle.sequence[rt.stepIndex + 1];
          const from = autoUci.slice(0, 2);
          const to = autoUci.slice(2, 4);
          setTimeout(() => {
            const autoChess = new Chess(boardCtx.chess.fen());
            autoChess.move({ from, to, promotion: "q" });
            boardCtx.chess = autoChess;
            boardCtx.draw();
            boardCtx.flash(to, "opponent-flash");
            boardCtx.solvedOrFailed = false;
            rt.stepIndex += 2;
          }, 700);
        };

        return rt;
      }

      // -------- Modal de lección --------
      let currentLessonId = null;
      let lessonPuzzleSolved = false;
      const lessonRunner = makeSequenceRunner(
        lessonBoardCtx,
        document.getElementById("lesson-puzzle-feedback"),
        document.getElementById("lesson-puzzle-retry")
      );

      function checklistAllChecked() {
        const boxes = document.querySelectorAll("#lesson-modal .lesson-check");
        return Array.from(boxes).every((b) => b.checked);
      }

      function refreshLessonCompleteButton() {
        const btn = document.getElementById("lesson-complete");
        if (!btn) return;
        const alreadyDone = (state.lessonsCompleted || []).includes(String(currentLessonId));
        if (alreadyDone) {
          btn.disabled = true;
          btn.textContent = "✓ Lección completada";
          return;
        }
        btn.textContent = "✓ Marcar como completada";
        btn.disabled = !(lessonPuzzleSolved && checklistAllChecked());
      }

      function renderMiniDiagrams(containerEl) {
        containerEl.querySelectorAll(".mini-diagram[data-fen]").forEach((el) => {
          const highlight = (el.dataset.highlight || "").split(",").filter(Boolean);
          const boardDiv = document.createElement("div");
          boardDiv.className = "board mini-diagram-board";
          renderBoardGrid(boardDiv, fenBoardToMatrix(el.dataset.fen), { highlight });
          el.innerHTML = "";
          el.appendChild(boardDiv);
        });
      }

      function openLessonModal(id) {
        const lesson = LESSONS[id];
        if (!lesson) return;
        currentLessonId = id;
        lessonPuzzleSolved = (state.lessonsCompleted || []).includes(String(id));

        const card = document.querySelector(`[data-lesson-card][data-lesson-id="${id}"]`);
        const titleText = card ? card.querySelector("h3").textContent : "Lección";
        document.getElementById("lesson-modal-category").textContent =
          "📚 " + (LESSON_CATEGORY_LABEL[lesson.category] || "Lección");
        document.getElementById("lesson-title").textContent = titleText;
        const contentEl = document.getElementById("lesson-content");
        contentEl.innerHTML = lesson.content;
        renderMiniDiagrams(contentEl);

        document.querySelectorAll("#lesson-modal .lesson-check").forEach((b) => {
          b.checked = lessonPuzzleSolved;
          b.onchange = refreshLessonCompleteButton;
        });

        document.getElementById("lesson-puzzle-prompt").textContent = lesson.puzzle.prompt;
        lessonRunner.start(lesson.puzzle);
        const feedbackEl = document.getElementById("lesson-puzzle-feedback");
        if (lessonPuzzleSolved) {
          lessonBoardCtx.solvedOrFailed = true;
          feedbackEl.textContent = "✓ Ya resolviste esta posición.";
          feedbackEl.classList.add("correct");
        }

        lessonBoardCtx.onAttempt = function (uci, attempt) {
          if (lessonPuzzleSolved) return;
          lessonRunner.attempt(uci, attempt, {
            onSolved: () => {
              lessonPuzzleSolved = true;
              refreshLessonCompleteButton();
            },
          });
          refreshLessonCompleteButton();
        };

        refreshLessonCompleteButton();
        document.getElementById("lesson-modal").style.display = "flex";
      }

      function closeLessonModal() {
        document.getElementById("lesson-modal").style.display = "none";
        currentLessonId = null;
      }

      document.querySelectorAll(".lesson-btn").forEach((btn) => {
        btn.addEventListener("click", () => openLessonModal(btn.dataset.lesson));
      });
      document.getElementById("lesson-close").addEventListener("click", closeLessonModal);
      document.getElementById("lesson-modal").addEventListener("click", (e) => {
        if (e.target.id === "lesson-modal") closeLessonModal();
      });
      document.getElementById("lesson-puzzle-hint").addEventListener("click", () => {
        const lesson = LESSONS[currentLessonId];
        if (!lesson) return;
        toast("💡 " + lesson.puzzle.hint);
      });
      document.getElementById("lesson-puzzle-retry").addEventListener("click", () => {
        const lesson = LESSONS[currentLessonId];
        if (!lesson) return;
        lessonRunner.start(lesson.puzzle);
      });

      document.getElementById("lesson-complete").addEventListener("click", () => {
        if (!currentLessonId) return;
        const lesson = LESSONS[currentLessonId];
        const idStr = String(currentLessonId);
        if ((state.lessonsCompleted || []).includes(idStr)) return;
        state.lessonsCompleted.push(idStr);
        save();
        addXP(lesson.xp, "Lección completada", "Completada");
        updateLearningProgress();
        refreshLessonCompleteButton();
      });

      // -------- Modal de ejercicios --------
      let currentExerciseId = null;
      let exerciseAttemptCounted = false;
      const exerciseRunner = makeSequenceRunner(
        exerciseBoardCtx,
        document.getElementById("puzzle-feedback"),
        document.getElementById("exercise-puzzle-retry")
      );

      function openExerciseModal(id) {
        const ex = EXERCISES[id];
        if (!ex) return;
        currentExerciseId = id;
        exerciseAttemptCounted = false;

        const card = document.querySelector(`[data-exercise-card][data-exercise-id="${id}"]`);
        const titleText = card ? card.querySelector("h3").textContent : "Ejercicio";
        document.getElementById("exercise-modal-category").textContent =
          "⚡ " + (EXERCISE_CATEGORY_LABEL[ex.category] || "Ejercicio");
        document.getElementById("exercise-modal-title").textContent = titleText;
        document.getElementById("exercise-modal-streak").textContent =
          "🔥 Racha: " + ((state.exerciseStats && state.exerciseStats.streak) || 0);
        document.getElementById("exercise-question").textContent = ex.prompt;
        document.getElementById("exercise-result").style.display = "none";

        exerciseRunner.start(ex);

        exerciseBoardCtx.onAttempt = function (uci, attempt) {
          exerciseRunner.attempt(uci, attempt, {
            onSolved: () => {
              ensureLearningState();
              const stats = state.exerciseStats;
              const idStr = String(id);
              const alreadySolved = (stats.solved || []).includes(idStr);

              if (!alreadySolved) {
                // Solo cuenta como "primer intento" si no falló antes en esta misma sesión.
                if (!exerciseAttemptCounted) {
                  stats.attempts = (stats.attempts || 0) + 1;
                  exerciseAttemptCounted = true;
                }
                if (!exerciseRunner.failedOnce) {
                  stats.firstTry = (stats.firstTry || 0) + 1;
                  stats.streak = (stats.streak || 0) + 1;
                  stats.bestStreak = Math.max(stats.bestStreak || 0, stats.streak);
                } else {
                  stats.streak = 0;
                }
                stats.solved = stats.solved || [];
                stats.solved.push(idStr);
                save();
                addXP(ex.xp, "Ejercicio resuelto", "Correcto");
              }
              document.getElementById("exercise-modal-streak").textContent = "🔥 Racha: " + stats.streak;
              document.getElementById("exercise-result-score").textContent = "1/1";
              document.getElementById("exercise-result-text").textContent = alreadySolved
                ? "Ya habías resuelto este ejercicio antes. ¡Repaso completado!"
                : `¡Resuelto! Ganaste ${ex.xp} XP.`;
              document.getElementById("exercise-result").style.display = "";
              updateExerciseDashboard();
            },
            onWrong: (wasFirstFailure) => {
              if (!wasFirstFailure) return; // ya se contabilizó este intento
              ensureLearningState();
              const stats = state.exerciseStats;
              const idStr = String(id);
              const alreadySolved = (stats.solved || []).includes(idStr);
              if (alreadySolved || exerciseAttemptCounted) return;
              stats.attempts = (stats.attempts || 0) + 1;
              exerciseAttemptCounted = true;
              stats.streak = 0;
              save();
              document.getElementById("exercise-modal-streak").textContent = "🔥 Racha: 0";
              updateExerciseDashboard();
            },
          });
        };

        document.getElementById("exercise-modal").style.display = "flex";
      }

      function closeExerciseModal() {
        document.getElementById("exercise-modal").style.display = "none";
        currentExerciseId = null;
      }

      document.querySelectorAll(".exercise-start").forEach((btn) => {
        btn.addEventListener("click", () => openExerciseModal(btn.dataset.exercise));
      });
      document.getElementById("exercise-close").addEventListener("click", closeExerciseModal);
      document.getElementById("exercise-modal").addEventListener("click", (e) => {
        if (e.target.id === "exercise-modal") closeExerciseModal();
      });
      document.getElementById("exercise-puzzle-hint").addEventListener("click", () => {
        const ex = EXERCISES[currentExerciseId];
        if (!ex) return;
        toast("💡 " + ex.hint);
      });
      document.getElementById("exercise-puzzle-retry").addEventListener("click", () => {
        const ex = EXERCISES[currentExerciseId];
        if (!ex) return;
        document.getElementById("exercise-result").style.display = "none";
        exerciseRunner.start(ex);
      });

      updateLearningProgress();
      updateExerciseDashboard();

      // =========================
      // TORNEO (Firebase / Firestore + Google Sign-In)
      // =========================
      const FB_CONFIG_KEY = "chessSchoolFirebaseConfig";
      const FB_ROOM_KEY = "chessSchoolFirebaseRoom";
      const START_FEN_TOURNEY = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

      // Configuración de Firebase del proyecto de la escuela. Al estar
      // definida acá, todos los alumnos se conectan automáticamente al
      // mismo torneo compartido sin necesidad de pegarla a mano. Si
      // alguien la reemplaza manualmente desde la página (por ejemplo
      // para probar con otro proyecto), esa versión guardada en
      // localStorage tiene prioridad sobre esta.
      const DEFAULT_FIREBASE_CONFIG = {
        apiKey: "AIzaSyBdZDmedsEcht9kc3hSGOTEsbzr7D9t-wk",
        authDomain: "torneo-ajedrez-escuelaipem146.firebaseapp.com",
        projectId: "torneo-ajedrez-escuelaipem146",
        storageBucket: "torneo-ajedrez-escuelaipem146.firebasestorage.app",
        messagingSenderId: "220659996001",
        appId: "1:220659996001:web:8c7f82674634f026eea120",
        measurementId: "G-BXEGXS25VQ",
      };

      let fbDb = null;
      let fbRoomRef = null;
      // Cada partida de torneo vive en su propio documento dentro de esta
      // subcolección (torneos/{room}/games/{round}_{board}), en vez de en
      // un array "games" adentro del documento principal del torneo. Antes,
      // CADA jugada de CUALQUIER mesa reescribía ese array completo dentro
      // de una transacción sobre el documento principal: con muchas mesas
      // jugando a la vez, todas esas transacciones competían por el mismo
      // documento y Firestore terminaba reintentando y serializando las
      // jugadas una detrás de otra (de ahí la lentitud en modo torneo).
      // Con un documento por partida, una jugada en la mesa 3 ya no tiene
      // nada que ver con una jugada en la mesa 7: cada una escribe su
      // propio documento, sin pisarse. El documento principal (fbRoomRef)
      // ahora solo guarda meta/players/pairings, que cambian mucho menos
      // seguido (una vez por resultado cargado, no una vez por jugada).
      let gamesCollectionRef = null;
      function gameDocId_(round, board) {
        return round + "_" + board;
      }

      function matchChatCollectionRef_(round, board) {
        return gamesCollectionRef.doc(gameDocId_(round, board)).collection("chat");
      }

      // --- Anuncios del torneo (mensaje del árbitro/admin para todos los
      // conectados, sin depender de ninguna mesa) ---
      // A diferencia del chat de mesa (privado entre dos rivales), esto vive
      // en una subcolección propia del documento raíz del torneo
      // (torneos/{room}/announcements), separada de "games" para no competir
      // con las escrituras de las partidas. Se escucha una sola vez por
      // conexión al torneo (subscribeAnnouncements, llamada junto con
      // subscribeTournament en connectFirebase), no por mesa: así llega
      // tanto a quien está mirando el torneo como a quien tiene una mesa
      // abierta.
      let announcementsCollectionRef = null;
      let announcementsUnsub = null;
      let lastAnnouncementId_ = null; // último anuncio ya mostrado, para no repetir el toast
      let announcementHistory_ = []; // últimos anuncios (más nuevo primero), para el listado desplegable

      // --- Carrusel de "mesas en juego" de la pantalla pública ---
      // En vez de listar todas las mesas activas apiladas (poco legible en
      // un proyector con muchas mesas), se muestra una a la vez en letra
      // grande y se pasa a la siguiente cada 10s.
      let publicScreenActiveGames_ = []; // mesas activas de la ronda actual, orden fijo por número de mesa
      let publicScreenCycleIndex_ = 0; // índice dentro de publicScreenActiveGames_ que se está mostrando ahora
      let publicScreenCycleTimer_ = null;
      let publicScreenZoomKey_ = null; // "round-board" de la mesa abierta en el modal de zoom, o null si está cerrado

      // --- Countdown de ronda sincronizado con el reloj del servidor ---
      // Firestore no tiene un equivalente al ".info/serverTimeOffset" de
      // Realtime Database, así que lo estimamos nosotros: cada vez que nos
      // llega (sin hasPendingWrites) el Timestamp server-side
      // meta.roundCountdownSetAt, comparamos ese instante "real" contra
      // nuestro Date.now() local en el momento de recibirlo. La diferencia
      // (drift de reloj del dispositivo + latencia de red, en general
      // despreciable) es countdownClockOffsetMs_, y de ahí en más
      // syncedNow_() la usa para que la cuenta regresiva no dependa de que
      // el celular de cada chico tenga bien puesta la hora.
      let countdownClockOffsetMs_ = 0;
      let roundCountdownTimer_ = null;

      function syncedNow_() {
        return Date.now() + countdownClockOffsetMs_;
      }

      function assertAdminOrReferee() {
        if (!isCurrentUserAdmin(lastTournamentState) && !isCurrentUserReferee()) {
          throw new Error("Esta acción es exclusiva del administrador o del árbitro del torneo");
        }
      }

      function subscribeAnnouncements() {
        if (announcementsUnsub) {
          announcementsUnsub();
          announcementsUnsub = null;
        }
        lastAnnouncementId_ = null;
        announcementHistory_ = [];
        let firstSnapshot = true;
        announcementsUnsub = announcementsCollectionRef
          .orderBy("ts", "desc")
          .limit(10)
          .onSnapshot(
            (qsnap) => {
              announcementHistory_ = qsnap.docs.map((d) => ({ id: d.id, ...d.data() }));
              renderAnnouncementHistory_();
              const top = announcementHistory_[0] || null;
              renderAnnouncementBanner_(top);
              // No mostramos el toast del anuncio que ya estaba puesto al
              // conectarnos (firstSnapshot), solo los que llegan después,
              // para no interrumpir a alguien que recién entra al torneo.
              if (!firstSnapshot && top && top.id !== lastAnnouncementId_) {
                toast("📢 " + (top.text || ""), 6000);
                SoundFX.announcement();
              }
              lastAnnouncementId_ = top ? top.id : null;
              firstSnapshot = false;
            },
            () => {
              // Si falla (por ejemplo, torneo viejo sin la subcolección
              // todavía), no rompemos el resto de la app: el anuncio
              // simplemente no se muestra.
            }
          );
      }

      let announcementBannerTimer_ = null;

      function renderAnnouncementBanner_(data) {
        const bannerEl = document.getElementById("tournament-announcement-banner");
        const textEl = document.getElementById("tournament-announcement-text");
        if (!bannerEl || !textEl) return;
        clearTimeout(announcementBannerTimer_);
        if (!data || !data.text) {
          bannerEl.style.display = "none";
          return;
        }
        textEl.textContent = data.text;
        bannerEl.style.display = "";
        announcementBannerTimer_ = setTimeout(() => {
          bannerEl.style.display = "none";
        }, 6000);
      }

      // Formatea la hora de un anuncio para el listado desplegable. ts es un
      // Timestamp de Firestore (o null en el instante entre el add() local y
      // que vuelva el valor real del servidor).
      function formatAnnouncementTime_(ts) {
        if (!ts || typeof ts.toDate !== "function") return "";
        return ts.toDate().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
      }

      function stopRoundCountdownTimer_() {
        if (roundCountdownTimer_) {
          clearInterval(roundCountdownTimer_);
          roundCountdownTimer_ = null;
        }
      }

      // Dibuja (y hace tickear) el banner de countdown de ronda. Se llama
      // desde renderTournamentState en cada snapshot, así que siempre
      // arranca desde los datos más frescos de meta.roundCountdownSetAt /
      // roundCountdownMs; el setInterval interno solo se ocupa de refrescar
      // el texto entre snapshots.
      function renderRoundCountdown_(state) {
        const bannerEl = document.getElementById("tournament-round-countdown-banner");
        const labelEl = document.getElementById("tournament-round-countdown-label");
        const timeEl = document.getElementById("tournament-round-countdown-time");
        const cancelBtn = document.getElementById("tournament-round-countdown-cancel-btn");
        if (!bannerEl || !labelEl || !timeEl) return;

        stopRoundCountdownTimer_();

        const setAt = state.meta.roundCountdownSetAt;
        const durationMs = state.meta.roundCountdownMs;
        const hasTarget = setAt && typeof setAt.toMillis === "function" && durationMs;

        if (cancelBtn) cancelBtn.style.display = hasTarget ? "" : "none";

        if (!hasTarget) {
          bannerEl.style.display = "none";
          bannerEl.classList.remove("round-countdown-urgent");
          return;
        }

        const targetMs = setAt.toMillis() + durationMs;
        labelEl.textContent = `Ronda ${state.meta.round + 1} arranca en`;
        bannerEl.style.display = "";

        const tick = () => {
          const remainingMs = targetMs - syncedNow_();
          if (remainingMs <= 0) {
            timeEl.textContent = "¡ya!";
            bannerEl.classList.remove("round-countdown-urgent");
            stopRoundCountdownTimer_();
            return;
          }
          const remainingSec = Math.ceil(remainingMs / 1000);
          timeEl.textContent = formatTime(remainingSec);
          bannerEl.classList.toggle("round-countdown-urgent", remainingSec <= 60);
        };

        tick();
        roundCountdownTimer_ = setInterval(tick, 250);
      }

      function escapeAnnouncementHtml_(s) {
        return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
      }

      function renderAnnouncementHistory_() {
        const toggleBtn = document.getElementById("tournament-announcement-history-toggle");
        const listEl = document.getElementById("tournament-announcement-history-list");
        if (!toggleBtn || !listEl) return;
        if (!announcementHistory_.length) {
          toggleBtn.style.display = "none";
          listEl.style.display = "none";
          return;
        }
        toggleBtn.style.display = "";
        toggleBtn.textContent = `📋 Ver anuncios (${announcementHistory_.length})`;
        listEl.innerHTML = announcementHistory_
          .map((a) => {
            const time = formatAnnouncementTime_(a.ts);
            return (
              `<div class="announcement-history-item">` +
              `<span class="announcement-history-text">${escapeAnnouncementHtml_(a.text)}</span>` +
              (time ? `<span class="announcement-history-time">${time}</span>` : "") +
              `</div>`
            );
          })
          .join("");
      }

      async function sendTournamentAnnouncement(text) {
        assertAdminOrReferee();
        const clean = (text || "").trim();
        if (!clean) throw new Error("Escribí un mensaje para anunciar");
        await announcementsCollectionRef.add({
          text: clean,
          ts: srvTimestamp(),
          byEmail: currentUser ? currentUser.email : null,
        });
      }

      // Arranca (o reemplaza) el countdown visible de "la próxima ronda
      // arranca en...". Guardamos el instante de arranque como
      // serverTimestamp() (roundCountdownSetAt) más una duración en ms
      // (roundCountdownMs) en vez de guardar directamente un Timestamp
      // "target": así el instante de arranque real queda fijado por el
      // reloj del servidor en el momento en que el admin/árbitro apretó el
      // botón, sin depender de qué hora tenga puesta SU celular tampoco.
      async function fbSetRoundCountdown(minutes) {
        assertAdminOrReferee();
        const m = Number(minutes);
        if (!m || m <= 0) throw new Error("Elegí una cantidad de minutos válida");
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          tx.update(fbRoomRef, {
            meta: {
              ...data.meta,
              roundCountdownSetAt: srvTimestamp(),
              roundCountdownMs: Math.round(m * 60000),
            },
          });
        });
      }

      // Cancela el countdown activo (si lo hay) antes de que llegue a cero.
      async function fbCancelRoundCountdown() {
        assertAdminOrReferee();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) return;
          const data = snap.data();
          tx.update(fbRoomRef, {
            meta: { ...data.meta, roundCountdownSetAt: null, roundCountdownMs: null },
          });
        });
      }

      // Suscribe al chat de la mesa (round, board) actualmente abierta. Es
      // exclusivo de los dos rivales de esa mesa (igual que la llamada de
      // audio, ver renderCallUI): un espectador ni siquiera se suscribe, así
      // no lee ni gasta lecturas de Firestore en una conversación que no le
      // corresponde.
      // Se guardan como mucho los últimos 200 mensajes en memoria (más que
      // suficiente para una partida) para no dejar crecer el DOM sin límite
      // en partidas muy charlatanas.
      function subscribeMatchChat(round, board) {
        unsubscribeMatchChat();
        matchChatMessages = [];
        matchChatUnreadCount = 0;
        matchChatPanelOpen = false;
        matchChatFirstSnapshot = true;
        renderMatchChat();
        if (!tournamentMyColor()) return; // espectador: sin chat
        matchChatUnsub = matchChatCollectionRef_(round, board)
          .orderBy("at", "asc")
          .limitToLast(200)
          .onSnapshot(
            (qsnap) => {
              const previousCount = matchChatMessages.length;
              matchChatMessages = qsnap.docs.map((d) => d.data());
              const newMessages = matchChatMessages.slice(previousCount);
              const newCount = newMessages.length;
              if (newCount > 0 && !matchChatPanelOpen) {
                matchChatUnreadCount += newCount;
              }
              renderMatchChat();
              notifyNewMatchChatMessages_(newMessages, matchChatFirstSnapshot);
              matchChatFirstSnapshot = false;
            },
            () => {
              // Silencioso: si esto falla (por ejemplo, reglas de
              // Firestore que todavía no incluyen la subcolección "chat"),
              // el resto de la partida (tablero, reloj, resultado) sigue
              // funcionando igual; el chat simplemente no carga.
            }
          );
      }

      // Avisa (sonido / toast / popup) por los mensajes nuevos de la mesa
      // que no son propios. Se salta por completo en el primer snapshot
      // (isInitialLoad), que es simplemente la carga del historial ya
      // existente al abrir la mesa, no mensajes "nuevos" de verdad.
      function notifyNewMatchChatMessages_(newMessages, isInitialLoad) {
        if (isInitialLoad || !newMessages.length || matchChatMuted) return;
        const myEmail = currentUser ? currentUser.email.toLowerCase() : "";
        const fromOpponent = newMessages.filter((m) => (m.senderEmail || "").toLowerCase() !== myEmail);
        if (!fromOpponent.length) return;
        SoundFX.chatMessage();
        if (matchChatPanelOpen) return; // ya lo está viendo, no hace falta interrumpir
        const last = fromOpponent[fromOpponent.length - 1];
        const gameNotStarted = game.history().length === 0;
        if (gameNotStarted) {
          // La partida no arrancó: probablemente el jugador ni está mirando
          // el tablero, así que un popup llama más la atención que el badge.
          showChatMessagePopup(last.senderName || "Tu rival", last.text || "");
        } else {
          // Partida en curso: un toast avisa sin interrumpir el juego.
          const preview = (last.text || "").length > 60 ? last.text.slice(0, 60) + "…" : last.text || "";
          toast("💬 " + (last.senderName || "Tu rival") + ": " + preview);
        }
      }

      function unsubscribeMatchChat() {
        if (matchChatUnsub) {
          matchChatUnsub();
          matchChatUnsub = null;
        }
        matchChatMessages = [];
        matchChatUnreadCount = 0;
        matchChatPanelOpen = false;
        const panelEl = document.getElementById("tournament-match-chat-panel");
        if (panelEl) panelEl.style.display = "none";
        const inputEl = document.getElementById("tournament-match-chat-input");
        if (inputEl) inputEl.value = "";
        resetMatchChatComposer_();
      }

      function renderMatchChat() {
        const wrapEl = document.getElementById("tournament-match-chat");
        const listEl = document.getElementById("tournament-match-chat-messages");
        const noteEl = document.getElementById("tournament-match-chat-note");
        const unreadEl = document.getElementById("tournament-match-chat-unread");
        const inputRow = document.querySelector("#tournament-match-chat-panel .chat-input-row");
        const clearBtn = document.getElementById("tournament-match-chat-clear-btn");
        const toggleBtn = document.getElementById("tournament-match-chat-toggle-btn");
        if (!wrapEl || !listEl) return;

        const myColor = tournamentMyColor();
        const canChat = !!myColor;
        // El chat es exclusivo entre los dos rivales de la mesa (igual que
        // la llamada de audio): un espectador no lo ve, ni siquiera en
        // solo-lectura.
        wrapEl.style.display = tournamentMatchActive && canChat ? "" : "none";
        if (!canChat) return;
        if (inputRow) inputRow.style.display = "";
        if (noteEl) noteEl.textContent = "";
        if (clearBtn) {
          clearBtn.style.display = matchChatMessages.length ? "" : "none";
        }
        renderMatchChatMuteBtn_();

        if (unreadEl) {
          if (matchChatUnreadCount > 0) {
            unreadEl.textContent = String(matchChatUnreadCount);
            unreadEl.style.display = "";
          } else {
            unreadEl.style.display = "none";
          }
        }
        // Pulso llamativo en el botón "Chat" mientras haya mensajes sin leer
        // y el panel esté cerrado; se apaga solo al abrir el panel (o al no
        // quedar mensajes sin leer).
        if (toggleBtn) {
          toggleBtn.classList.toggle("chat-toggle-pulse", matchChatUnreadCount > 0 && !matchChatPanelOpen);
        }

        if (!matchChatMessages.length) {
          listEl.innerHTML = '<p class="chat-message-empty">Todavía no hay mensajes. ¡Saludá a tu rival!</p>';
        } else {
          const myEmail = currentUser ? currentUser.email : "";
          listEl.innerHTML = matchChatMessages
            .map((m) => {
              const mine = myEmail && (m.senderEmail || "").toLowerCase() === myEmail;
              const name = escapeHtml_(m.senderName || "Jugador");
              const text = escapeHtml_(m.text || "");
              const time = m.at
                ? new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "";
              return (
                `<div class="chat-message${mine ? " mine" : ""}">` +
                `<span class="chat-message-meta">${name}${
                  time ? ` <span class="chat-message-time">· ${time}</span>` : ""
                }</span>${text}` +
                `</div>`
              );
            })
            .join("");
          listEl.scrollTop = listEl.scrollHeight;
        }
      }

      function toggleMatchChatPanel() {
        matchChatPanelOpen = !matchChatPanelOpen;
        const panelEl = document.getElementById("tournament-match-chat-panel");
        if (panelEl) panelEl.style.display = matchChatPanelOpen ? "" : "none";
        if (matchChatPanelOpen) {
          matchChatUnreadCount = 0;
          renderMatchChat();
          const listEl = document.getElementById("tournament-match-chat-messages");
          if (listEl) listEl.scrollTop = listEl.scrollHeight;
          const inputEl = document.getElementById("tournament-match-chat-input");
          if (inputEl) inputEl.focus();
        }
      }

      async function sendMatchChatMessage() {
        const inputEl = document.getElementById("tournament-match-chat-input");
        if (!inputEl) return;
        const text = inputEl.value.trim();
        if (!text) return;
        if (!tournamentMatchCtx || !currentUser) return;
        const myColor = tournamentMyColor();
        if (!myColor) return; // los espectadores pueden leer, no escribir
        inputEl.value = "";
        resetMatchChatComposer_();
        try {
          await matchChatCollectionRef_(tournamentMatchCtx.round, tournamentMatchCtx.board).add({
            text: text.slice(0, 300),
            senderEmail: currentUser.email,
            senderName: currentUser.displayName || currentUser.email,
            senderColor: myColor,
            at: Date.now(),
          });
        } catch (err) {
          inputEl.value = text; // devolvemos el texto al input para no perder el mensaje
          toast("❌ No se pudo enviar el mensaje: " + err.message);
        }
      }

      // Prende/apaga el aviso (sonido + toast/popup) de mensajes nuevos del
      // chat de mesa. El badge de no leídos y los mensajes en sí siguen
      // funcionando igual estando silenciado; sólo se corta la interrupción.
      function setMatchChatMuted(muted) {
        matchChatMuted = muted;
        localStorage.setItem("chessMatchChatMuted", matchChatMuted ? "on" : "off");
        renderMatchChatMuteBtn_();
        syncChatNotifCfgUI_();
      }

      function toggleMatchChatMute() {
        setMatchChatMuted(!matchChatMuted);
        toast(matchChatMuted ? "🔕 Chat silenciado" : "🔔 Chat con notificaciones");
      }

      function renderMatchChatMuteBtn_() {
        const btn = document.getElementById("tournament-match-chat-mute-btn");
        if (!btn) return;
        btn.textContent = matchChatMuted ? "🔕" : "🔔";
        btn.title = matchChatMuted ? "Activar notificaciones de este chat" : "Silenciar notificaciones de este chat";
        btn.classList.toggle("muted", matchChatMuted);
      }

      // Deja el contador de caracteres y el botón "Enviar" en su estado
      // inicial (vacío / deshabilitado). Se usa después de enviar un
      // mensaje y al cerrar/cambiar de chat.
      function resetMatchChatComposer_() {
        const counterEl = document.getElementById("tournament-match-chat-counter");
        if (counterEl) counterEl.textContent = "";
        const sendBtn = document.getElementById("tournament-match-chat-send-btn");
        if (sendBtn) sendBtn.disabled = true;
      }

      // Vacía el chat de la mesa actualmente abierta: borra todos los
      // mensajes de la subcolección en Firestore (no solo la vista local),
      // para que no reaparezcan al recargar o para el otro jugador.
      // Cualquiera de los dos jugadores puede hacerlo; los espectadores no
      // tienen el botón visible (ver canChat en renderMatchChat).
      async function clearMatchChat() {
        if (!tournamentMatchCtx || !tournamentMyColor()) return;
        if (!matchChatMessages.length) return;
        if (!confirm("¿Vaciar el chat de esta mesa? Se borran los mensajes para los dos jugadores y no se puede deshacer.")) {
          return;
        }
        const round = tournamentMatchCtx.round;
        const board = tournamentMatchCtx.board;
        try {
          const snap = await matchChatCollectionRef_(round, board).get();
          if (snap.empty) return;
          const batch = fbDb.batch();
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          // No hace falta actualizar matchChatMessages a mano: el onSnapshot
          // de subscribeMatchChat detecta el borrado y vuelve a renderizar.
          toast("🗑️ Chat vaciado");
        } catch (err) {
          toast("❌ No se pudo vaciar el chat: " + err.message);
        }
      }

      // =========================
      // LLAMADA DE AUDIO (torneo online, WebRTC + Firestore como señalización)
      // =========================
      function callDocRef_(round, board) {
        return gamesCollectionRef.doc(gameDocId_(round, board)).collection("call").doc("session");
      }

      function callCandidatesRef_(round, board, who) {
        // who: "offerCandidates" (los que genera quien llama) o
        // "answerCandidates" (los que genera quien atiende).
        return callDocRef_(round, board).collection(who);
      }

      function renderCallUI() {
        const wrapEl = document.getElementById("tournament-match-call");
        const idleEl = document.getElementById("tournament-match-call-idle");
        const incomingEl = document.getElementById("tournament-match-call-incoming");
        const outgoingEl = document.getElementById("tournament-match-call-outgoing");
        const activeEl = document.getElementById("tournament-match-call-active");
        const noteEl = document.getElementById("tournament-match-call-note");
        const muteBtn = document.getElementById("tournament-match-call-mute-btn");
        if (!wrapEl) return;

        const myColor = tournamentMyColor();
        wrapEl.style.display = tournamentMatchActive && myColor ? "" : "none";
        if (!myColor) return;

        idleEl.style.display = callState === "idle" ? "" : "none";
        incomingEl.style.display = callState === "incoming" ? "flex" : "none";
        outgoingEl.style.display = callState === "outgoing" ? "flex" : "none";
        activeEl.style.display = callState === "active" ? "flex" : "none";

        if (muteBtn) {
          muteBtn.textContent = callIsMuted ? "🔈 Reactivar micrófono" : "🔇 Silenciar";
          muteBtn.classList.toggle("muted", callIsMuted);
        }
        if (noteEl) {
          noteEl.textContent =
            callState === "idle"
              ? "Llamada de audio opcional entre vos y tu rival, no queda grabada."
              : "";
        }
      }

      // Limpia todo el estado local de WebRTC (peer connection, micrófono,
      // listeners de candidatos) sin tocar el documento de Firestore. Se usa
      // tanto al cortar una llamada propia como al detectar que el rival ya
      // cortó/canceló/rechazó del otro lado.
      function teardownCallLocal_() {
        SoundFX.stopRing();
        if (callPc) {
          callPc.onicecandidate = null;
          callPc.ontrack = null;
          callPc.close();
          callPc = null;
        }
        if (callLocalStream) {
          callLocalStream.getTracks().forEach((t) => t.stop());
          callLocalStream = null;
        }
        callCandidatesUnsub.forEach((unsub) => unsub());
        callCandidatesUnsub = [];
        const audioEl = document.getElementById("tournament-match-call-remote-audio");
        if (audioEl) audioEl.srcObject = null;
        callIsMuted = false;
        callState = "idle";
        callPendingOffer = null;
        renderCallUI();
      }

      function listenRemoteCandidates_(round, board, who) {
        const unsub = callCandidatesRef_(round, board, who).onSnapshot((qsnap) => {
          qsnap.docChanges().forEach((change) => {
            if (change.type === "added" && callPc) {
              callPc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
            }
          });
        });
        callCandidatesUnsub.push(unsub);
      }

      function newCallPeerConnection_() {
        const pc = new RTCPeerConnection(RTC_ICE_SERVERS);
        pc.ontrack = (event) => {
          const audioEl = document.getElementById("tournament-match-call-remote-audio");
          if (audioEl) audioEl.srcObject = event.streams[0];
        };
        return pc;
      }

      // Quien inicia la llamada. Solo los dos rivales de la mesa pueden
      // hacerlo (el botón ya está oculto para espectadores en renderCallUI,
      // pero este chequeo evita que alguien la dispare igual desde la
      // consola del navegador).
      async function startAudioCall() {
        if (!tournamentMatchCtx || callState !== "idle" || !tournamentMyColor()) return;
        const round = tournamentMatchCtx.round;
        const board = tournamentMatchCtx.board;
        try {
          callLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (err) {
          toast("❌ No se pudo acceder al micrófono: " + err.message);
          return;
        }
        callState = "outgoing";
        renderCallUI();
        SoundFX.startRing();

        callPc = newCallPeerConnection_();
        callLocalStream.getTracks().forEach((track) => callPc.addTrack(track, callLocalStream));

        const offerCandidates = callCandidatesRef_(round, board, "offerCandidates");
        callPc.onicecandidate = (event) => {
          if (event.candidate) offerCandidates.add(event.candidate.toJSON());
        };

        try {
          const offerDescription = await callPc.createOffer();
          await callPc.setLocalDescription(offerDescription);

          await callDocRef_(round, board).set({
            offer: { type: offerDescription.type, sdp: offerDescription.sdp },
            answer: null,
            status: "calling",
            callerEmail: currentUser ? currentUser.email : "",
            at: Date.now(),
          });
        } catch (err) {
          toast("❌ No se pudo iniciar la llamada: " + err.message);
          teardownCallLocal_();
          return;
        }

        listenRemoteCandidates_(round, board, "answerCandidates");
      }

      // Quien atiende una llamada entrante. Mismo motivo que en
      // startAudioCall: el chequeo de tournamentMyColor() no depende solo
      // de que el botón esté oculto para espectadores.
      async function acceptIncomingCall_(offer) {
        if (!tournamentMatchCtx || !tournamentMyColor()) return;
        const round = tournamentMatchCtx.round;
        const board = tournamentMatchCtx.board;
        try {
          callLocalStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (err) {
          toast("❌ No se pudo acceder al micrófono: " + err.message);
          return;
        }

        callPc = newCallPeerConnection_();
        callLocalStream.getTracks().forEach((track) => callPc.addTrack(track, callLocalStream));

        const answerCandidates = callCandidatesRef_(round, board, "answerCandidates");
        callPc.onicecandidate = (event) => {
          if (event.candidate) answerCandidates.add(event.candidate.toJSON());
        };

        try {
          await callPc.setRemoteDescription(new RTCSessionDescription(offer));
          const answerDescription = await callPc.createAnswer();
          await callPc.setLocalDescription(answerDescription);

          await callDocRef_(round, board).update({
            answer: { type: answerDescription.type, sdp: answerDescription.sdp },
            status: "active",
          });
        } catch (err) {
          toast("❌ No se pudo atender la llamada: " + err.message);
          teardownCallLocal_();
          return;
        }

        listenRemoteCandidates_(round, board, "offerCandidates");
        callState = "active";
        renderCallUI();
        SoundFX.stopRing();
      }

      async function declineIncomingCall_() {
        if (!tournamentMatchCtx) return;
        try {
          await callDocRef_(tournamentMatchCtx.round, tournamentMatchCtx.board).update({ status: "declined" });
        } catch (err) {
          // Silencioso: si falla igual limpiamos el estado local.
        }
        teardownCallLocal_();
      }

      // Corta la llamada actual (la haya iniciado quien la corta o no) y
      // limpia el documento de señalización para que quede libre para la
      // próxima llamada de esta mesa.
      async function hangUpCall() {
        if (!tournamentMatchCtx) {
          teardownCallLocal_();
          return;
        }
        const round = tournamentMatchCtx.round;
        const board = tournamentMatchCtx.board;
        teardownCallLocal_();
        try {
          await callDocRef_(round, board).set({ status: "ended", at: Date.now() }, { merge: true });
          // Se limpian los candidatos ICE acumulados para no dejar basura
          // creciendo en Firestore de partida en partida.
          const [offerSnap, answerSnap] = await Promise.all([
            callCandidatesRef_(round, board, "offerCandidates").get(),
            callCandidatesRef_(round, board, "answerCandidates").get(),
          ]);
          const batch = fbDb.batch();
          offerSnap.docs.forEach((d) => batch.delete(d.ref));
          answerSnap.docs.forEach((d) => batch.delete(d.ref));
          batch.set(callDocRef_(round, board), { status: "idle", offer: null, answer: null }, { merge: true });
          await batch.commit();
        } catch (err) {
          // Silencioso: la llamada ya se cortó localmente; si esto falla,
          // en el peor caso queda un documento "ended" sin limpiar, que no
          // molesta para la próxima llamada (se sobreescribe igual).
        }
      }

      function toggleCallMute() {
        if (!callLocalStream) return;
        callIsMuted = !callIsMuted;
        callLocalStream.getAudioTracks().forEach((t) => (t.enabled = !callIsMuted));
        renderCallUI();
      }

      // Se suscribe al documento de señalización de la mesa (round, board)
      // para detectar llamadas entrantes y para reaccionar si el rival
      // cuelga/cancela/rechaza del otro lado.
      function subscribeCallSignaling(round, board) {
        unsubscribeCallSignaling();
        callDocUnsub = callDocRef_(round, board).onSnapshot(
          (docSnap) => {
            const data = docSnap.exists ? docSnap.data() : null;
            if (!data || data.status === "idle" || data.status === "ended" || data.status === "declined") {
              // Nadie llamando: si nosotros teníamos algo activo/sonando
              // (por ejemplo, el rival colgó del otro lado), lo limpiamos.
              if (callState !== "idle") teardownCallLocal_();
              return;
            }
            const myColor = tournamentMyColor();
            const myEmail = currentUser ? currentUser.email : "";
            const iAmCaller = data.callerEmail && data.callerEmail.toLowerCase() === myEmail;

            if (data.status === "calling" && !iAmCaller && callState === "idle" && myColor) {
              callState = "incoming";
              callPendingOffer = data.offer;
              renderCallUI();
              SoundFX.startRing();
            } else if (data.status === "active" && iAmCaller && data.answer && callPc && !callPc.currentRemoteDescription) {
              callPc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(() => {});
              callState = "active";
              renderCallUI();
              SoundFX.stopRing(); // el rival atendió: corta el ring-back del que llamaba
            }
          },
          () => {
            // Silencioso, igual que el chat: si esto falla (reglas de
            // Firestore desactualizadas), el resto de la partida sigue
            // funcionando y simplemente no hay llamadas disponibles.
          }
        );
      }

      function unsubscribeCallSignaling() {
        if (callDocUnsub) {
          callDocUnsub();
          callDocUnsub = null;
        }
        teardownCallLocal_();
      }

      // Últimas partidas de la ronda actual (alimentado por
      // subscribeRoundGames), usado en vez de un inexistente "state.games".
      let lastRoundGames = [];
      let gamesRoundUnsub = null;
      let subscribedRound_ = undefined;
      let tournamentUnsub = null;
      let tournamentBusy = false;
      lastTournamentState = null;
      // Último meta.status conocido (antes de procesar el snapshot actual).
      // Sirve para detectar la TRANSICIÓN a "finished" (se finalizó el
      // torneo) o "setup" (se reinició), y en ese momento sacar a cualquier
      // jugador/espectador que tenga una mesa abierta (ver subscribeTournament
      // y closeActiveMatchOnTournamentChange_). Arranca en null a propósito:
      // así, si alguien se conecta y el torneo YA estaba finalizado de antes,
      // no se dispara el cierre forzado (no es una transición, es el estado
      // con el que se encontró al entrar).
      let lastKnownTournamentStatus_ = null;
      let tournamentEditingPlayerId = null; // id del jugador cuya fila está en modo edición en el panel de árbitro
      currentUser = null; // { email, displayName } una vez logueado con Google (o "logueado" localmente en modo LAN)

      // "online" (Firebase/Internet, comportamiento de siempre) o "lan"
      // (servidor local vía lan-server.js + lan-shim.js, sin internet).
      // Ver connectLan() más abajo.
      let connectionMode = "online";
      let lanClient_ = null; // instancia de LanClient (lan-shim.js) mientras estemos en modo LAN

      // Firestore real (modo online) resuelve FieldValue.serverTimestamp()
      // contra el reloj del servidor de Firebase; el shim LAN hace lo mismo
      // contra el reloj de la compu que corre lan-server.js. Este helper
      // evita tener que ramificar cada lugar que lo usa.
      function srvTimestamp() {
        return connectionMode === "lan" ? window.LAN.serverTimestamp() : firebase.firestore.FieldValue.serverTimestamp();
      }

      function getTimestampMs(ts) {
        if (ts && typeof ts.toMillis === "function") return ts.toMillis();
        if (typeof ts === "number") return ts;
        return 0;
      }

      // Genera un "email" sintético a partir del nombre para identificar a
      // cada jugador en modo LAN (todo el resto del código de torneo ya
      // identifica jugadores por currentUser.email, así que no hace falta
      // tocar esa lógica: solo hay que darle un email con el mismo formato).
      function slugifyForLanEmail_(name) {
        const base = (name || "jugador")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, ".")
          .replace(/^\.+|\.+$/g, "");
        return (base || "jugador") + "@lan.local";
      }

      // Conecta el torneo al servidor LAN (lan-server.js) en vez de a
      // Firebase. hostAddr es "ip:puerto" (por ej. "192.168.0.15:8080" o
      // "localhost:8080" si esta misma compu es la que corre el servidor).
      // isHost=true es quien creó/corre el servidor: se le asigna el email
      // de administrador del torneo (TOURNAMENT_ADMIN_EMAIL) para que el
      // resto del código (que ya chequea ese email en todos lados) lo trate
      // como admin sin tener que duplicar esa lógica para el modo LAN.
      async function connectLan(hostAddr, room, displayName, isHost) {
        const statusEl = document.getElementById("lan-connect-status");
        if (statusEl) {
          statusEl.textContent = "Conectando…";
          statusEl.classList.remove("correct");
        }
        try {
          if (!displayName) throw new Error("Ingresá tu nombre primero");
          if (!window.LAN) throw new Error("No se cargó lan-shim.js (revisá el <script> en index.html)");
          const addr = (hostAddr || "").trim().replace(/^wss?:\/\//, "").replace(/\/+$/, "");
          if (!addr) throw new Error("Ingresá la dirección del anfitrión (ej: 192.168.0.15:8080)");
          if (lanClient_) {
            lanClient_.close();
            lanClient_ = null;
          }
          const roomName = room || "main";
          const { client, db } = await window.LAN.connect("ws://" + addr, roomName, displayName);
          lanClient_ = client;
          connectionMode = "lan";
          fbDb = db;
          fbRoomRef = fbDb.collection("torneos").doc(roomName);
          gamesCollectionRef = fbRoomRef.collection("games");
          announcementsCollectionRef = fbRoomRef.collection("announcements");
          subscribedRound_ = undefined;
          lastRoundGames = [];
          currentUser = {
            email: isHost ? TOURNAMENT_ADMIN_EMAIL : slugifyForLanEmail_(displayName),
            displayName: displayName,
          };
          setTournamentRoom(roomName);
          document.getElementById("tournament-auth-box").style.display = "";
          const lanBox = document.getElementById("tournament-lan-box");
          if (lanBox) lanBox.style.display = "none";
          const modeSelect = document.getElementById("tournament-mode-select");
          if (modeSelect) modeSelect.style.display = "none";
          updateAuthUI();
          subscribeTournament();
          subscribeAnnouncements();
          if (statusEl) statusEl.textContent = "";
          toast(isHost ? "🖥️ Conectado como anfitrión (red local)" : "📲 Conectado a la sala LAN");
        } catch (err) {
          if (statusEl) statusEl.textContent = "❌ " + err.message;
        }
      }

      // Única cuenta habilitada para administrar el torneo. Se ignora
      // cualquier lista de administradores guardada en Firestore: sin
      // importar qué diga meta.adminEmails, solo esta cuenta puede crear,
      // configurar o reiniciar el torneo.
      //
      // ⚠️ SEGURIDAD: esta constante y assertAdmin() son SOLO una
      // conveniencia de interfaz (ocultar/mostrar botones). No son una
      // barrera real: cualquiera puede abrir la consola del navegador y
      // llamar a fbUpdateSettings/fbResetAll/etc. directamente, sin pasar
      // por assertAdmin(). La única protección efectiva tiene que estar en
      // las reglas de seguridad de Firestore (request.auth.token.email ==
      // "ipem146centenario@gmail.com" para las escrituras de admin), que
      // viven fuera de este archivo. Si esas reglas no existen o son
      // permisivas ("allow write: if true"), cualquier visitante puede
      // borrar o alterar el torneo aunque esta pantalla no le muestre los
      // botones para hacerlo.
      let authListenerAttached = false;

      // Modo árbitro: una cuenta aparte del admin del torneo, exclusiva para
      // las acciones "de reglamento" (retirar/reincorporar/descalificar
      // jugadores, declarar W.O., cerrar rondas y corregir resultados ya
      // cerrados). Es intencionalmente una cuenta distinta de
      // TOURNAMENT_ADMIN_EMAIL: ni el admin del torneo ni ninguna otra
      // cuenta puede hacer estas acciones, solo esta.
      const TOURNAMENT_REFEREE_EMAIL = "josepantaleo@gmail.com";

      function isCurrentUserReferee() {
        return !!currentUser && currentUser.email === TOURNAMENT_REFEREE_EMAIL;
      }

      function assertReferee() {
        if (!isCurrentUserReferee()) {
          throw new Error("Esta acción es exclusiva del árbitro del torneo");
        }
      }

      function getFirebaseConfig() {
        const raw = localStorage.getItem(FB_CONFIG_KEY) || "";
        if (!raw) return DEFAULT_FIREBASE_CONFIG;
        try {
          return JSON.parse(raw) || DEFAULT_FIREBASE_CONFIG;
        } catch (err) {
          return DEFAULT_FIREBASE_CONFIG;
        }
      }

      function setFirebaseConfig(cfg) {
        localStorage.setItem(FB_CONFIG_KEY, JSON.stringify(cfg));
      }

      function getTournamentRoom() {
        return localStorage.getItem(FB_ROOM_KEY) || "main";
      }

      function setTournamentRoom(room) {
        localStorage.setItem(FB_ROOM_KEY, room || "main");
      }

      // Acepta tanto un objeto JSON válido como el literal de JS que Firebase
      // muestra en su consola (claves sin comillas, strings con comillas
      // simples, coma colgante). Antes esto se resolvía evaluando el texto
      // pegado con Function(...) (equivalente a eval): si en algún momento
      // ese cuadro de texto recibía algo que no fuera tecleado a mano por el
      // propio admin (un link con la config precargada, un valor guardado
      // en otro lado, etc.), esa vía ejecutaba cualquier código JS incluido
      // en el texto. Acá se normaliza el texto a JSON estricto y se parsea
      // con JSON.parse, sin ejecutar nada.
      function parseFirebaseConfigInput(text) {
        const trimmed = text.trim();
        if (!trimmed) throw new Error("Pegá la configuración de Firebase");
        const match = trimmed.match(/\{[\s\S]*\}/);
        let objText = match ? match[0] : trimmed;
        try {
          return JSON.parse(objText);
        } catch (err) {
          // No es JSON estricto: lo normalizamos sin ejecutar código.
          // 1) Le pone comillas dobles a las claves sin comillas (apiKey: → "apiKey":).
          objText = objText.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)/g, '$1"$2"$3');
          // 2) Convierte strings entre comillas simples a comillas dobles.
          objText = objText.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, inner) => JSON.stringify(inner));
          // 3) Quita comas colgantes antes de "}" o "]".
          objText = objText.replace(/,(\s*[}\]])/g, "$1");
          try {
            return JSON.parse(objText);
          } catch (err2) {
            throw new Error("No se pudo interpretar la configuración de Firebase. Pegala en formato JSON (con comillas en las claves).");
          }
        }
      }

      function normalizeTournamentState(data) {
        const defaults = {
          name: "",
          round: 0,
          status: "setup",
          adminEmails: [],
          totalRounds: null,
          roundStatus: "playing",
          roundApprovalMode: "manual",
          pendingApprovalAt: null,
          autoApprovalCancelled: false,
          // Minutos de tolerancia reglamentaria antes de que una
          // incomparecencia se convierta en WO automático (0 = deshabilitado,
          // hay que declararlo a mano como siempre). Ver fbAutoDeclareForfeits.
          woGraceMinutes: 0,
          // Countdown de "la próxima ronda arranca en...", ver
          // fbSetRoundCountdown/renderRoundCountdown_. roundCountdownSetAt es
          // un Timestamp de Firestore (server-side) y roundCountdownMs la
          // duración elegida por el admin/árbitro; el instante real de
          // arranque es roundCountdownSetAt + roundCountdownMs, calculado
          // igual en todos los clientes sin importar el reloj de cada uno.
          roundCountdownSetAt: null,
          roundCountdownMs: null,
        };
        if (!data) {
          return { meta: { ...defaults }, players: [], pairings: [] };
        }
        return {
          meta: Object.assign({ ...defaults }, data.meta || {}),
          players: data.players || [],
          pairings: data.pairings || [],
        };
      }

      function connectFirebase(config, room) {
        try {
          if (!firebase.apps.length) {
            firebase.initializeApp(config);
          }
          fbDb = firebase.firestore();
        } catch (err) {
          throw new Error("Configuración de Firebase inválida: " + err.message);
        }
        fbRoomRef = fbDb.collection("torneos").doc(room || "main");
        gamesCollectionRef = fbRoomRef.collection("games");
        announcementsCollectionRef = fbRoomRef.collection("announcements");
        // Nos reconectamos a un torneo (nuevo o distinto "room"): olvidamos
        // qué ronda teníamos suscripta y limpiamos las partidas ya
        // cargadas, para que subscribeRoundGames() no se quede pensando
        // que ya está al día ni se muestren mesas de otra sala por un
        // instante mientras llega el primer snapshot de la nueva.
        subscribedRound_ = undefined;
        lastRoundGames = [];
        document.getElementById("tournament-auth-box").style.display = "";
        // Igual que en connectLan(): una vez que efectivamente estamos
        // conectados (a Firebase, en este caso), hay que ocultar la
        // pantalla "¿Cómo querés jugar?" — si no, quedaba visible para
        // siempre encima de la de login (bug: nunca se ocultaba en modo
        // online, ni al cargar la página ni al tocar "Torneo Online").
        const modeSelectEl_ = document.getElementById("tournament-mode-select");
        if (modeSelectEl_) modeSelectEl_.style.display = "none";
        const lanBoxEl_ = document.getElementById("tournament-lan-box");
        if (lanBoxEl_) lanBoxEl_.style.display = "none";
        if (!authListenerAttached) {
          authListenerAttached = true;
          firebase.auth().onAuthStateChanged((user) => {
            // Si estamos conectados en modo LAN, currentUser lo maneja
            // connectLan()/disconnectLan_(), no este listener: la
            // resolución de la sesión de Google es asíncrona y, sin este
            // chequeo, podía llegar DESPUÉS de conectarse a la sala LAN y
            // pisar el currentUser recién asignado con el de Firebase
            // (típicamente null), ocultando de golpe toda la pantalla del
            // torneo (botón "Inscribirme", panel de administrador,
            // "Generar próxima ronda", etc.) tanto para jugadores como
            // para el anfitrión.
            if (connectionMode === "lan") return;
            currentUser = user ? { email: (user.email || "").toLowerCase(), displayName: user.displayName || user.email } : null;
            updateAuthUI();
            renderTournamentState(lastTournamentState);
          });
        }
        subscribeTournament();
        subscribeAnnouncements();
      }

      function updateAuthUI() {
        const statusEl = document.getElementById("tournament-auth-status");
        const signinBtn = document.getElementById("tournament-google-signin-btn");
        const signoutBtn = document.getElementById("tournament-signout-btn");
        if (currentUser) {
          statusEl.textContent =
            connectionMode === "lan"
              ? `Conectado como ${currentUser.displayName} — 📶 red local (sin internet)`
              : `Conectado como ${currentUser.displayName} (${currentUser.email})`;
          signinBtn.style.display = "none";
          signoutBtn.style.display = "";
        } else {
          statusEl.textContent = "Iniciá sesión con tu cuenta de Gmail para jugar o administrar el torneo.";
          signinBtn.style.display = connectionMode === "lan" ? "none" : "";
          signoutBtn.style.display = "none";
        }
        updateModeBadge();
        updateConfigAccountUI_();
      }

      // Resumen de cuenta en Configuración: mismo currentUser que ya
      // resuelve onAuthStateChanged en connectFirebase() (se conecta solo
      // al cargar la página, con o sin visitar "Torneo"), así que este
      // card puede quedar al día sin depender de esa pantalla.
      function updateConfigAccountUI_() {
        const statusEl = document.getElementById("config-account-status");
        const signoutBtn = document.getElementById("config-signout-btn");
        if (!statusEl || !signoutBtn) return;
        if (currentUser) {
          statusEl.textContent = `Conectado como ${currentUser.displayName} (${currentUser.email})`;
          signoutBtn.style.display = "";
        } else {
          statusEl.textContent = "Todavía no iniciaste sesión con Gmail. Entrá a \"Torneo\" para hacerlo.";
          signoutBtn.style.display = "none";
        }
      }

      function isCurrentUserAdmin(state) {
        if (!currentUser) return false;
        return currentUser.email === TOURNAMENT_ADMIN_EMAIL;
      }

      // Ya no hay una etapa de "bootstrap" con administrador libre: la
      // única cuenta que puede crear o administrar el torneo, incluso la
      // primera vez, es TOURNAMENT_ADMIN_EMAIL. Se mantiene esta función
      // (siempre false) para no tener que tocar cada lugar que la llama.
      function isBootstrapping(state) {
        return false;
      }

      function assertAdmin() {
        if (!isCurrentUserAdmin(lastTournamentState)) {
          throw new Error("Necesitás ser administrador de este torneo para hacer esto");
        }
      }

      function updateModeBadge() {
        const badges = [document.getElementById("tournament-mode-badge"), document.getElementById("tournament-mode-badge-active")];
        if (!currentUser) {
          badges.forEach((b) => b && (b.style.display = "none"));
          return;
        }
        const admin = isCurrentUserAdmin(lastTournamentState);
        const referee = isCurrentUserReferee();
        const text = referee ? "🧑‍⚖️ Modo Árbitro" : admin ? "🛠️ Modo Administrador" : "👤 Modo Jugador";
        badges.forEach((b) => {
          if (!b) return;
          b.textContent = text;
          b.style.display = "";
        });
      }

      // Se suscribe a las partidas de UNA ronda puntual (torneos/{room}/games,
      // filtrado por round). Se vuelve a llamar cada vez que cambia
      // meta.round, así que en todo momento solo hay un listener activo, y
      // solo trae los documentos de la ronda que está en juego (no el
      // historial completo del torneo). Con esto, una jugada en cualquier
      // mesa sigue actualizando a todos los conectados (necesario para que
      // la lista de mesas y el reloj se vean en vivo), pero la ESCRITURA de
      // esa jugada ya no compite con la de ninguna otra mesa (ver
      // fbMakeMove: cada partida es su propio documento).
      function subscribeRoundGames(round) {
        if (subscribedRound_ === round && (gamesRoundUnsub || round == null)) return;
        if (gamesRoundUnsub) {
          gamesRoundUnsub();
          gamesRoundUnsub = null;
        }
        subscribedRound_ = round;
        if (!gamesCollectionRef || round == null) {
          lastRoundGames = [];
          return;
        }
        gamesRoundUnsub = gamesCollectionRef.where("round", "==", round).onSnapshot(
          (qsnap) => {
            lastRoundGames = qsnap.docs.map((d) => d.data());
            // Mientras hay una mesa abierta (tournamentMatchActive), el panel
            // de emparejamientos/clasificación está oculto detrás del
            // tablero: reconstruirlo en cada jugada de CUALQUIER mesa del
            // torneo (no solo la propia) es trabajo de DOM/CPU tirado a la
            // basura que además compite por el hilo principal justo cuando
            // más importa la respuesta rápida al arrastrar una pieza. Antes
            // esto se notaba más cuanto más avanzada estaba la ronda, porque
            // más jugadas de más mesas significan más disparos de este
            // listener. Se saltea acá y se refresca una sola vez al volver
            // a la pantalla del torneo (ver exitTournamentMatch).
            if (!tournamentMatchActive) {
              renderTournamentState(lastTournamentState);
            }
            // Repintamos el tablerito de la mesa que se está mostrando
            // ahora en el carrusel de la pantalla pública (si hay una),
            // más el modal de zoom si está abierto (ver ambas funciones):
            // así se ve la partida EN VIVO, no una foto congelada del
            // momento en que se abrió la pantalla o del último cambio de
            // carrusel.
            refreshPublicScreenActiveMiniBoard_();
            renderPublicScreenZoomBoard_();
            handleLiveMatchUpdate(lastTournamentState);
          },
          () => {
            // Silencioso: el estado de conexión ya se informa en el
            // listener principal (subscribeTournament) de abajo.
          }
        );
      }

      // Si hay una mesa (partida de torneo) abierta en pantalla cuando el
      // torneo finaliza o se reinicia, la cierra: avisa por qué y vuelve a
      // la pantalla del torneo (exitTournamentMatch), en vez de dejar a
      // alguien mirando/jugando una mesa que ya no tiene sentido. Esto corre
      // en el navegador de cada persona conectada (jugadores, espectadores,
      // admin, árbitro), así que en la práctica "cierra todas las mesas".
      function closeActiveMatchOnTournamentChange_(reason) {
        if (!tournamentMatchActive) return;
        closeAlert_();
        toast(reason);
        exitTournamentMatch();
      }

      function subscribeTournament() {
        if (tournamentUnsub) {
          tournamentUnsub();
          tournamentUnsub = null;
        }
        const statusEl = document.getElementById("tournament-connect-status");
        tournamentUnsub = fbRoomRef.onSnapshot(
          (snap) => {
            statusEl.textContent = "✓ Conectado.";
            statusEl.classList.add("correct");
            // --- INSTRUMENTACIÓN TEMPORAL: tamaño del doc raíz del torneo ---
            // Detrás de PERF_DEBUG: el JSON.stringify sobre el doc completo
            // (que puede ser grande, con cientos de pairings) solo corre si
            // se activa el flag a mano para depurar.
            if (PERF_DEBUG && snap.exists) {
              const __raw = snap.data();
              const __bytes = JSON.stringify(__raw).length;
              console.log(
                `[perf] room snapshot ~${(__bytes / 1024).toFixed(1)}KB | pairings=${(__raw.pairings || []).length} players=${(__raw.players || []).length}`
              );
            }
            const state = normalizeTournamentState(snap.exists ? snap.data() : null);
            // No recalculamos el offset con writes propios todavía pendientes
            // de confirmar (el serverTimestamp() local vale null hasta que
            // el server lo resuelve) para no contaminar la estimación.
            if (!snap.metadata.hasPendingWrites) {
              const setAt = state.meta.roundCountdownSetAt;
              if (setAt && typeof setAt.toMillis === "function") {
                countdownClockOffsetMs_ = setAt.toMillis() - Date.now();
              }
            }
            const previousStatus = lastKnownTournamentStatus_;
            lastKnownTournamentStatus_ = state.meta.status;
            lastTournamentState = state;
            const hasActiveOrFinishedRound = state.meta.status === "active" || state.meta.status === "finished";
            subscribeRoundGames(hasActiveOrFinishedRound ? state.meta.round : null);
            // Mismo criterio que en subscribeRoundGames: con una mesa
            // abierta, el panel de emparejamientos y la pantalla pública
            // están ocultos/no son lo que se está mirando, así que no vale
            // la pena reconstruirlos ahora (se refrescan al volver a la
            // pantalla del torneo, ver exitTournamentMatch).
            if (!tournamentMatchActive) {
              renderTournamentState(state);
              if (typeof renderPublicScreen === "function") renderPublicScreen(state);
            }
            handleLiveMatchUpdate(state);
            if (previousStatus !== null && previousStatus !== state.meta.status) {
              if (state.meta.status === "finished") {
                closeActiveMatchOnTournamentChange_("🏁 El administrador finalizó el torneo.");
              } else if (state.meta.status === "setup") {
                closeActiveMatchOnTournamentChange_("🔄 El administrador reinició el torneo.");
              }
            }
          },
          (err) => {
            statusEl.textContent = "❌ No se pudo conectar: " + err.message;
            statusEl.classList.remove("correct");
          }
        );
      }

      async function getTournamentStateOnce() {
        const snap = await fbRoomRef.get();
        return normalizeTournamentState(snap.exists ? snap.data() : null);
      }

      // "Nombre, email" por línea → [{name, email}]
      function parsePlayersInput(text) {
        return text
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const parts = line.split(",");
            const name = (parts[0] || "").trim();
            const email = (parts.slice(1).join(",") || "").trim().toLowerCase();
            return { name, email };
          })
          .filter((p) => p.name);
      }

      function applyResultToPlayers_(white, black, result, sign) {
        if (!white || !black || !result) return;
        // "wo-black" = ganan blancas por incomparecencia de negras;
        // "wo-white" = ganan negras por incomparecencia de blancas.
        if (result === "1-0" || result === "wo-black") white.points += 1 * sign;
        else if (result === "0-1" || result === "wo-white") black.points += 1 * sign;
        else if (result === "1/2-1/2") {
          white.points += 0.5 * sign;
          black.points += 0.5 * sign;
        }
      }

      async function fbCreateTournament(name, playerEntries, totalRounds, adminEmails, timeControl, roundApprovalMode, woGraceMinutes) {
        if (!isBootstrapping(lastTournamentState)) assertAdmin();
        const seenEmails = new Set();
        for (const p of playerEntries) {
          if (!p.name) continue;
          const email = (p.email || "").toLowerCase().trim();
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error(`El email "${p.email}" de ${p.name} no parece válido`);
          }
          if (email) {
            if (seenEmails.has(email)) throw new Error(`El email ${email} está repetido entre los jugadores`);
            seenEmails.add(email);
          }
        }
        const players = playerEntries
          .filter((p) => p.name)
          .map((p, i) => ({
            id: "p" + (i + 1),
            name: p.name,
            email: (p.email || "").toLowerCase(),
            points: 0,
            played: [],
            byes: 0,
            colorBalance: 0, // >0 jugó más veces con blancas, <0 más veces con negras
            // Estado del jugador dentro del torneo. Por ahora solo "active"
            // se usa para emparejar (ver buildNextRoundPairings_); "withdrawn"
            // (retirado) y "disqualified" (descalificado) quedan reservados
            // para las acciones de árbitro que se agregan más adelante.
            status: "active",
          }));
        const rounds = Number(totalRounds);
        const tc = timeControl || { minutes: 0, increment: 0 };
        await fbRoomRef.set({
          meta: {
            name: name || "Torneo",
            round: 0,
            status: "active",
            roundStatus: "playing",
            roundApprovalMode: roundApprovalMode === "auto" ? "auto" : "manual",
            pendingApprovalAt: null,
            autoApprovalCancelled: false,
            totalRounds: rounds > 0 ? rounds : null,
            adminEmails: [TOURNAMENT_ADMIN_EMAIL],
            timeControlMinutes: tc.minutes > 0 ? tc.minutes : 0,
            timeControlIncrement: tc.increment > 0 ? tc.increment : 0,
            woGraceMinutes: Number(woGraceMinutes) > 0 ? Number(woGraceMinutes) : 0,
          },
          players,
          pairings: [],
        });
        return getTournamentStateOnce();
      }

      // ===== Alta / edición / baja de jugadores (panel de árbitro) =====

      function validatePlayerNameEmail_(name, email) {
        name = (name || "").trim();
        email = (email || "").trim().toLowerCase();
        if (!name) throw new Error("El nombre no puede estar vacío");
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error(`El email "${email}" no parece válido`);
        }
        return { name, email };
      }

      // Agrega un jugador nuevo al torneo ya creado. Arranca en 0 puntos y sin
      // partidas jugadas, así que buildNextRoundPairings_ lo toma solo en la
      // próxima ronda que se genere (no hace falta tocar la ronda actual).
      async function fbAddPlayer(rawName, rawEmail) {
        assertAdmin();
        const { name, email } = validatePlayerNameEmail_(rawName, rawEmail);
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const players = data.players || [];
          if (email && players.some((p) => (p.email || "").toLowerCase() === email)) {
            throw new Error(`Ya hay un jugador con el email ${email}`);
          }
          let n = players.length + 1;
          const usedIds = new Set(players.map((p) => p.id));
          while (usedIds.has("p" + n)) n++;
          const newPlayer = {
            id: "p" + n,
            name,
            email,
            points: 0,
            played: [],
            byes: 0,
            colorBalance: 0,
            status: "active",
          };
          tx.update(fbRoomRef, { players: players.concat([newPlayer]) });
        });
        return getTournamentStateOnce();
      }

      // Autoinscripción: a diferencia de fbAddPlayer, esta función NO exige
      // ser admin — la puede llamar cualquier cuenta de Google que haya
      // iniciado sesión. El email queda fijo al de currentUser (no se puede
      // anotar en nombre de otra persona) para que la app sepa con qué
      // cuenta se juegan sus partidas. Solo se puede usar mientras el
      // torneo no haya finalizado; no depende de la ronda, igual que
      // fbAddPlayer, así que también sirve para sumarse a un torneo que ya
      // arrancó.
      //
      // El jugador entra con status "pending": todavía NO participa del
      // torneo (activePlayers lo filtra por status === "active", así que no
      // se lo empareja ni se lo cuenta en la tabla de posiciones "en juego")
      // hasta que un administrador lo autorice con fbApproveRegistration.
      // Si el admin lo rechaza (fbRejectRegistration) se lo borra por
      // completo, ya que un jugador pendiente todavía no jugó ninguna
      // partida y no deja historial huérfano.
      async function fbSelfRegister(rawName) {
        if (!currentUser) throw new Error("Iniciá sesión con Google primero");
        const name = (rawName || "").trim() || currentUser.displayName;
        if (!name) throw new Error("Ingresá tu nombre");
        const email = currentUser.email;
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no se creó el torneo");
          const data = snap.data();
          if (data.meta && data.meta.status === "finished") {
            throw new Error("El torneo ya finalizó, no se puede inscribir");
          }
          const players = data.players || [];
          if (players.some((p) => (p.email || "").toLowerCase() === email)) {
            throw new Error("Ya estás inscripto en este torneo");
          }
          let n = players.length + 1;
          const usedIds = new Set(players.map((p) => p.id));
          while (usedIds.has("p" + n)) n++;
          const newPlayer = {
            id: "p" + n,
            name,
            email,
            points: 0,
            played: [],
            byes: 0,
            colorBalance: 0,
            status: "pending",
          };
          tx.update(fbRoomRef, { players: players.concat([newPlayer]) });
        });
        return getTournamentStateOnce();
      }

      // ===== Autorización de inscripciones (exclusivo del administrador) =====
      // Toda autoinscripción (fbSelfRegister) queda en status "pending" y no
      // participa del torneo hasta que el administrador la autorice o la
      // rechace explícitamente con una de estas dos funciones.

      // Autoriza la inscripción: pasa a status "active" y desde la próxima
      // ronda que se genere ya se lo empareja con normalidad.
      async function fbApproveRegistration(playerId) {
        assertAdmin();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const players = data.players || [];
          const idx = players.findIndex((p) => p.id === playerId);
          if (idx === -1) throw new Error("No se encontró esa inscripción");
          if (players[idx].status !== "pending") {
            throw new Error("Esta inscripción ya fue procesada");
          }
          const updated = players.slice();
          updated[idx] = { ...updated[idx], status: "active" };
          tx.update(fbRoomRef, { players: updated });
        });
        return getTournamentStateOnce();
      }

      // Rechaza la inscripción: como todavía no jugó ninguna partida, se la
      // borra directamente en vez de dejarla marcada (no hay historial que
      // proteger). Si la persona quiere, puede volver a inscribirse.
      async function fbRejectRegistration(playerId) {
        assertAdmin();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const players = data.players || [];
          const idx = players.findIndex((p) => p.id === playerId);
          if (idx === -1) throw new Error("No se encontró esa inscripción");
          if (players[idx].status !== "pending") {
            throw new Error("Esta inscripción ya fue procesada");
          }
          tx.update(fbRoomRef, { players: players.filter((p) => p.id !== playerId) });
        });
        return getTournamentStateOnce();
      }

      // Autoriza TODAS las inscripciones pendientes de una sola vez (misma
      // transacción), para que el admin no tenga que aprobar una por una.
      async function fbApproveAllRegistrations() {
        assertAdmin();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const players = data.players || [];
          const pending = players.filter((p) => p.status === "pending");
          if (pending.length === 0) throw new Error("No hay inscripciones pendientes");
          const updated = players.map((p) => (p.status === "pending" ? { ...p, status: "active" } : p));
          tx.update(fbRoomRef, { players: updated });
        });
        return getTournamentStateOnce();
      }

      // Rechaza (borra) TODAS las inscripciones pendientes de una sola vez.
      async function fbRejectAllRegistrations() {
        assertAdmin();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const players = data.players || [];
          const pending = players.filter((p) => p.status === "pending");
          if (pending.length === 0) throw new Error("No hay inscripciones pendientes");
          tx.update(fbRoomRef, { players: players.filter((p) => p.status !== "pending") });
        });
        return getTournamentStateOnce();
      }

      // Edita solo los datos personales (nombre/email) de un jugador. No toca
      // puntos, partidas jugadas ("played"), byes ni colorBalance, para no
      // afectar su historial de partidas. También actualiza el nombre/email
      // "congelados" dentro de los emparejamientos ya publicados (para que
      // las rondas ya jugadas se vean con el dato corregido).
      async function fbEditPlayer(playerId, rawName, rawEmail) {
        assertAdmin();
        const { name, email } = validatePlayerNameEmail_(rawName, rawEmail);
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const players = data.players || [];
          const idx = players.findIndex((p) => p.id === playerId);
          if (idx === -1) throw new Error("No se encontró ese jugador");
          if (email && players.some((p, i) => i !== idx && (p.email || "").toLowerCase() === email)) {
            throw new Error(`Ya hay otro jugador con el email ${email}`);
          }
          const updatedPlayers = players.slice();
          updatedPlayers[idx] = { ...updatedPlayers[idx], name, email };
          const pairings = (data.pairings || []).map((pr) => {
            const copy = { ...pr };
            if (copy.whiteId === playerId) {
              copy.whiteName = name;
              copy.whiteEmail = email;
            }
            if (copy.blackId === playerId) {
              copy.blackName = name;
              copy.blackEmail = email;
            }
            return copy;
          });
          tx.update(fbRoomRef, { players: updatedPlayers, pairings });
        });
        return getTournamentStateOnce();
      }

      // Elimina por completo a un jugador del torneo. Solo se permite si
      // todavía no jugó ninguna partida (ni siquiera un bye): si ya tiene
      // historial, borrarlo del arreglo dejaría emparejamientos/partidas
      // "huérfanos" apuntando a un id inexistente. Para sacar del torneo a
      // alguien que ya jugó, corresponde "Retirar jugador" (no elimina el
      // historial, solo evita que lo vuelvan a emparejar) en vez de esto.
      async function fbDeletePlayer(playerId) {
        assertAdmin();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const players = data.players || [];
          const player = players.find((p) => p.id === playerId);
          if (!player) throw new Error("No se encontró ese jugador");
          const pairings = data.pairings || [];
          const hasHistory = pairings.some((pr) => pr.whiteId === playerId || pr.blackId === playerId);
          if (hasHistory) {
            throw new Error(
              "Este jugador ya tiene partidas emparejadas: para sacarlo sin perder el historial usá 'Retirar jugador' en vez de eliminarlo."
            );
          }
          tx.update(fbRoomRef, { players: players.filter((p) => p.id !== playerId) });
        });
        return getTournamentStateOnce();
      }

      // ===== Acciones exclusivas del árbitro sobre el estado de un jugador =====
      // Estas tres funciones nunca borran historial (played/points/byes quedan
      // intactos): solo cambian "status", que es lo que buildNextRoundPairings_
      // usa para decidir a quién emparejar en la próxima ronda.

      // Retira a un jugador: deja de ser emparejado en las próximas rondas,
      // pero conserva todo su historial y sigue en la tabla de posiciones.
      async function fbWithdrawPlayer(playerId) {
        assertReferee();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const players = data.players || [];
          const idx = players.findIndex((p) => p.id === playerId);
          if (idx === -1) throw new Error("No se encontró ese jugador");
          if (players[idx].status === "disqualified") {
            throw new Error("Este jugador está descalificado, no se puede retirar");
          }
          const updated = players.slice();
          updated[idx] = { ...updated[idx], status: "withdrawn" };
          tx.update(fbRoomRef, { players: updated });
        });
        return getTournamentStateOnce();
      }

      // Reincorpora a un jugador retirado (vuelve a "active" y se lo vuelve a
      // emparejar desde la próxima ronda). Un jugador descalificado NO puede
      // reincorporarse por esta vía: la descalificación es definitiva.
      async function fbReactivatePlayer(playerId) {
        assertReferee();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const players = data.players || [];
          const idx = players.findIndex((p) => p.id === playerId);
          if (idx === -1) throw new Error("No se encontró ese jugador");
          if (players[idx].status === "disqualified") {
            throw new Error("Un jugador descalificado no puede reincorporarse");
          }
          const updated = players.slice();
          updated[idx] = { ...updated[idx], status: "active" };
          tx.update(fbRoomRef, { players: updated });
        });
        return getTournamentStateOnce();
      }

      // Descalifica a un jugador: igual que retirar (no vuelve a emparejarse,
      // conserva historial), pero con etiqueta propia y sin vuelta atrás.
      async function fbDisqualifyPlayer(playerId) {
        assertReferee();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const players = data.players || [];
          const idx = players.findIndex((p) => p.id === playerId);
          if (idx === -1) throw new Error("No se encontró ese jugador");
          const updated = players.slice();
          updated[idx] = { ...updated[idx], status: "disqualified" };
          tx.update(fbRoomRef, { players: updated });
        });
        return getTournamentStateOnce();
      }

      // Empareja jugadores estilo suizo: ordena por puntaje y, en caso de
      // empate, por desempate Buchholz (suma de puntos de los rivales ya
      // jugados) reusando rankPlayers_ — y como último criterio, el nombre.
      // Empareja de a pares evitando repetir rivales cuando es posible. Si
      // sobra un jugador, recibe bye (+1 punto). No toca la base de datos:
      // solo calcula los datos de la ronda nueva a partir del estado ya
      // cargado en memoria. La usa fbApproveRound (aprobación manual o
      // automática de la ronda) y fbGenerateRound (para sortear la ronda 1).
      // "pairingsForTiebreak" es el historial completo de emparejamientos
      // del torneo, usado solo para calcular el desempate Buchholz.
      // "forcedByeId" (opcional): permite que el árbitro elija a mano qué
      // jugador descansa esta ronda, en vez de que se elija automáticamente
      // (por defecto: el de menor puntaje que todavía no tuvo bye). Solo
      // tiene efecto si la cantidad de jugadores activos es impar; si es
      // par, se ignora (no hace falta bye). Si el id no corresponde a un
      // jugador activo, se cae de nuevo al criterio automático.
      function buildNextRoundPairings_(players, currentRound, timeControl, pairingsForTiebreak, forcedByeId) {
        const nextRound = currentRound + 1;

        // Jugadores retirados o descalificados no vuelven a ser emparejados,
        // pero se mantienen en el arreglo general (con su historial intacto)
        // para que la tabla de posiciones los siga mostrando.
        const activePlayers = players.filter((p) => (p.status || "active") === "active");

        let pool = pairingsForTiebreak ? rankPlayers_(activePlayers, pairingsForTiebreak) : activePlayers.slice();
        pool = pool.slice().sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (pairingsForTiebreak && (b._buchholz || 0) !== (a._buchholz || 0)) return (b._buchholz || 0) - (a._buchholz || 0);
          if (pairingsForTiebreak) return a.name.localeCompare(b.name);
          return a.id < b.id ? -1 : 1;
        });

        let byePlayer = null;
        if (pool.length % 2 === 1) {
          if (forcedByeId) {
            byePlayer = pool.find((p) => p.id === forcedByeId) || null;
          }
          if (!byePlayer) {
            for (let i = pool.length - 1; i >= 0; i--) {
              if (pool[i].byes === 0) {
                byePlayer = pool[i];
                break;
              }
            }
            if (!byePlayer) byePlayer = pool[pool.length - 1];
          }
          pool = pool.filter((p) => p.id !== byePlayer.id);
        }

        let unpaired = pool.slice();
        const newPairings = [];
        const colorBalanceById = {};
        players.forEach((p) => (colorBalanceById[p.id] = p.colorBalance || 0));
        let board = 1;

        while (unpaired.length > 0) {
          const p1 = unpaired.shift();
          let idx = unpaired.findIndex((p) => p1.played.indexOf(p.id) === -1);
          if (idx === -1) idx = 0;
          const p2 = unpaired.splice(idx, 1)[0];

          // Reparto de color: le damos blancas a quien tenga menor
          // colorBalance (es decir, quien jugó menos veces con blancas
          // hasta ahora). En empate, mantenemos p1 con blancas.
          const bal1 = colorBalanceById[p1.id] || 0;
          const bal2 = colorBalanceById[p2.id] || 0;
          const p1GetsWhite = bal1 <= bal2;
          const white = p1GetsWhite ? p1 : p2;
          const black = p1GetsWhite ? p2 : p1;
          colorBalanceById[white.id] = (colorBalanceById[white.id] || 0) + 1;
          colorBalanceById[black.id] = (colorBalanceById[black.id] || 0) - 1;

          newPairings.push({
            round: nextRound,
            board: board++,
            whiteId: white.id,
            whiteName: white.name,
            whiteEmail: white.email || "",
            blackId: black.id,
            blackName: black.name,
            blackEmail: black.email || "",
            result: "",
          });
        }

        if (byePlayer) {
          newPairings.push({
            round: nextRound,
            board: board++,
            whiteId: byePlayer.id,
            whiteName: byePlayer.name,
            whiteEmail: byePlayer.email || "",
            blackId: "",
            blackName: "BYE",
            blackEmail: "",
            result: "1-0",
          });
          byePlayer.points += 1;
          byePlayer.byes += 1;
        }

        const updatedPlayers = players.map((p) => {
          if (byePlayer && p.id === byePlayer.id) {
            return { ...p, points: byePlayer.points, byes: byePlayer.byes, colorBalance: colorBalanceById[p.id] || 0 };
          }
          return { ...p, colorBalance: colorBalanceById[p.id] || 0 };
        });

        // Reloj de la partida: si el torneo tiene tiempo configurado, cada
        // partida arranca con ese tiempo para las dos partes (se reinicia en
        // cada ronda: cada partida nueva tiene su propio objeto "clock"
        // desde cero). El reloj NO arranca a correr solo — turnStartAt
        // queda en null hasta que se juega la primera jugada (ver
        // fbMakeMove), y mientras tanto "joined" registra si cada jugador ya
        // entró a la partida: hasta que entraron los dos no se deja mover
        // (ver tournamentClockWaitingForBothPlayers), así ninguno pierde
        // tiempo de reloj por ausencia del rival.
        const minutes = (timeControl && timeControl.minutes) || 0;
        const increment = (timeControl && timeControl.increment) || 0;
        const newGames = newPairings
          .filter((p) => p.blackId !== "")
          .map((p) => ({
            round: p.round,
            board: p.board,
            fen: START_FEN_TOURNEY,
            lastMoveSan: "",
            status: "ongoing",
            clock: minutes > 0 ? { w: minutes * 60, b: minutes * 60 } : null,
            turnStartAt: null,
            increment: increment,
            joined: { w: false, b: false },
            // Marca de cuándo arrancó la ronda para esta partida: es la
            // referencia que usa fbAutoDeclareForfeits para saber cuánto
            // tiempo de tolerancia (meta.woGraceMinutes) ya pasó.
            startedAt: Date.now(),
          }));

        return { nextRound, newPairings, updatedPlayers, newGames };
      }

      async function fbGenerateRound() {
        assertAdmin();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const players = (data.players || []).map((p) => ({ ...p, played: (p.played || []).slice() }));
          if (players.length < 2) throw new Error("Hacen falta al menos 2 jugadores");

          const pairingsAll = (data.pairings || []).map((p) => ({ ...p }));
          const currentRound = (data.meta && data.meta.round) || 0;
          const totalRounds = data.meta && data.meta.totalRounds;

          if (data.meta && data.meta.status === "finished") {
            throw new Error("El torneo ya está finalizado. Reabrilo si querés jugar otra ronda.");
          }
          if (totalRounds && currentRound >= totalRounds) {
            throw new Error("El torneo ya jugó las " + totalRounds + " rondas configuradas.");
          }

          const pending = pairingsAll.filter((p) => p.round === currentRound && !p.result);
          if (currentRound > 0 && pending.length > 0) {
            throw new Error("Todavía hay partidas de la ronda " + currentRound + " sin resultado cargado");
          }
          if (currentRound > 0) {
            throw new Error('A partir de la ronda 1, usá el botón "Aprobar ronda" para generar la próxima.');
          }

          const timeControl = {
            minutes: (data.meta && data.meta.timeControlMinutes) || 0,
            increment: (data.meta && data.meta.timeControlIncrement) || 0,
          };
          const { nextRound, newPairings, updatedPlayers, newGames } = buildNextRoundPairings_(players, currentRound, timeControl, pairingsAll);

          tx.set(fbRoomRef, {
            meta: {
              name: data.meta.name,
              round: nextRound,
              status: "active",
              roundStatus: "playing",
              roundApprovalMode: data.meta.roundApprovalMode === "auto" ? "auto" : "manual",
              pendingApprovalAt: null,
              autoApprovalCancelled: false,
              totalRounds: totalRounds || null,
              adminEmails: data.meta.adminEmails || [],
              timeControlMinutes: timeControl.minutes,
              timeControlIncrement: timeControl.increment,
              woGraceMinutes: (data.meta && data.meta.woGraceMinutes) || 0,
            },
            players: updatedPlayers,
            pairings: pairingsAll.concat(newPairings),
          });
          // Cada partida nueva es un documento aparte (ver comentario en la
          // declaración de gamesCollectionRef), así que no hace falta leer
          // ni tocar las partidas de rondas anteriores para crear estas.
          newGames.forEach((g) => tx.set(gamesCollectionRef.doc(gameDocId_(g.round, g.board)), g));
        });
        return getTournamentStateOnce();
      }

      // Aprueba la ronda que está "Pendiente de aprobación": recalcula la
      // clasificación (con desempate Buchholz), genera los emparejamientos
      // de la ronda siguiente respetando las reglas del sistema suizo (sin
      // repetir rivales cuando se puede, equilibrando colores, asignando
      // BYE si sobra alguien) y publica esa ronda nueva. Solo administrador.
      // La usa tanto el botón "Aprobar ronda" (modo manual) como el
      // temporizador de 30s del modo automático.
      async function fbApproveRound() {
        assertAdmin();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const meta = { ...data.meta };
          if (meta.status !== "active" || meta.roundStatus !== "pending_approval") {
            throw new Error("No hay ninguna ronda pendiente de aprobación en este momento");
          }
          const players = (data.players || []).map((p) => ({ ...p, played: (p.played || []).slice() }));
          const pairingsAll = (data.pairings || []).map((p) => ({ ...p }));
          const roundPairings = pairingsAll.filter((p) => p.round === meta.round);
          const pending = roundPairings.filter((p) => !p.result);
          if (pending.length > 0) {
            throw new Error("Todavía hay partidas de esta ronda sin resultado cargado");
          }

          const timeControl = {
            minutes: meta.timeControlMinutes || 0,
            increment: meta.timeControlIncrement || 0,
          };
          const { nextRound, newPairings, updatedPlayers, newGames } = buildNextRoundPairings_(
            players,
            meta.round,
            timeControl,
            pairingsAll
          );

          meta.round = nextRound;
          meta.roundStatus = "playing";
          meta.pendingApprovalAt = null;
          meta.autoApprovalCancelled = false;

          tx.update(fbRoomRef, {
            meta,
            players: updatedPlayers,
            pairings: pairingsAll.concat(newPairings),
          });
          newGames.forEach((g) => tx.set(gamesCollectionRef.doc(gameDocId_(g.round, g.board)), g));
        });
        return getTournamentStateOnce();
      }

      // Cancela la cuenta regresiva del modo automático (la ronda queda
      // "Pendiente de aprobación" igual, pero ya no se aprueba sola: hay que
      // tocar "Aprobar ronda" a mano). Solo administrador.
      async function fbCancelAutoApproval() {
        assertAdmin();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          if (data.meta.roundStatus !== "pending_approval") return; // nada que cancelar
          tx.update(fbRoomRef, { meta: { ...data.meta, autoApprovalCancelled: true } });
        });
        return getTournamentStateOnce();
      }

      // ===== Flujo separado de árbitro: "Cerrar ronda" + "Generar ronda" =====
      // fbApproveRound (arriba) sigue existiendo tal cual para el admin del
      // torneo: en un solo paso cierra y genera la ronda siguiente. Estas dos
      // funciones son el camino alternativo, exclusivo del árbitro, que
      // separa ambos pasos: primero se cierra la ronda (bloqueando los
      // resultados para cualquiera que no sea el árbitro) y recién después,
      // en otro momento si hace falta, se genera la ronda siguiente.

      // Cierra la ronda actual (debe estar "Pendiente de aprobación", es
      // decir con todos los resultados ya cargados). A partir de acá, esos
      // resultados quedan bloqueados: solo el árbitro puede corregirlos (ver
      // el chequeo de "target.locked" en fbSubmitResult). No genera la ronda
      // siguiente; eso lo hace fbGenerateRoundFromClosed por separado.
      async function fbCloseRound() {
        assertReferee();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const meta = { ...data.meta };
          if (meta.status !== "active" || meta.roundStatus !== "pending_approval") {
            throw new Error("Solo se puede cerrar una ronda que ya tiene todos los resultados cargados");
          }
          const pairings = (data.pairings || []).map((p) => (p.round === meta.round ? { ...p, locked: true } : p));
          meta.roundStatus = "closed";
          tx.update(fbRoomRef, { meta, pairings });
        });
        return getTournamentStateOnce();
      }

      // Genera la ronda siguiente a partir de una ronda ya cerrada con
      // fbCloseRound. Misma lógica de emparejamiento suizo que fbApproveRound,
      // pero exige que la ronda esté "closed" en vez de "pending_approval".
      // Exclusivo del árbitro. "forcedByeId" (opcional): el árbitro puede
      // elegir a mano quién descansa esta ronda en vez de dejarlo automático
      // (ver buildNextRoundPairings_ y el selector "Asignar BYE" del panel
      // de árbitro).
      async function fbGenerateRoundFromClosed(forcedByeId) {
        assertReferee();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const meta = { ...data.meta };
          if (meta.status !== "active" || meta.roundStatus !== "closed") {
            throw new Error('Primero hay que "Cerrar ronda" antes de generar la próxima');
          }
          const players = (data.players || []).map((p) => ({ ...p, played: (p.played || []).slice() }));
          const pairingsAll = (data.pairings || []).map((p) => ({ ...p }));

          if (forcedByeId) {
            const activeCount = players.filter((p) => (p.status || "active") === "active").length;
            if (activeCount % 2 === 0) {
              throw new Error("No hace falta asignar BYE: la cantidad de jugadores activos es par");
            }
            const candidate = players.find((p) => p.id === forcedByeId && (p.status || "active") === "active");
            if (!candidate) throw new Error("El jugador elegido para el BYE no está activo en el torneo");
          }

          const timeControl = {
            minutes: meta.timeControlMinutes || 0,
            increment: meta.timeControlIncrement || 0,
          };
          const { nextRound, newPairings, updatedPlayers, newGames } = buildNextRoundPairings_(
            players,
            meta.round,
            timeControl,
            pairingsAll,
            forcedByeId || undefined
          );

          meta.round = nextRound;
          meta.roundStatus = "playing";
          meta.pendingApprovalAt = null;
          meta.autoApprovalCancelled = false;

          tx.update(fbRoomRef, {
            meta,
            players: updatedPlayers,
            pairings: pairingsAll.concat(newPairings),
          });
          newGames.forEach((g) => tx.set(gamesCollectionRef.doc(gameDocId_(g.round, g.board)), g));
        });
        return getTournamentStateOnce();
      }

      // Marca o desmarca una partida como "suspendida" (por ejemplo, un
      // incidente en el tablero que el árbitro necesita revisar antes de
      // que se siga jugando). Mientras está suspendida no se puede mover
      // ninguna pieza (ver fbMakeMove y los bloqueos del lado del cliente).
      // Exclusivo del árbitro.
      async function fbSetGameSuspended(round, board, suspended) {
        assertReferee();
        round = Number(round);
        board = Number(board);
        const gameDocRef = gamesCollectionRef.doc(gameDocId_(round, board));
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(gameDocRef);
          if (!snap.exists) throw new Error("No se encontró esa partida");
          const g = { ...snap.data() };
          if (g.status === "finished") throw new Error("Esa partida ya terminó, no se puede suspender");
          g.status = suspended ? "suspended" : "ongoing";
          // Al reanudar, reiniciamos el "reloj de arranque" del turno actual
          // para no cobrarle a quien tiene el turno el tiempo que la partida
          // estuvo parada (ver updateTournamentClockDisplay).
          if (!suspended && g.clock && g.turnStartAt) g.turnStartAt = srvTimestamp();
          tx.update(gameDocRef, g);
        });
        return getTournamentStateOnce();
      }

      // Declara WO automático a los jugadores que no entraron a su partida
      // dentro del "tiempo reglamentario de espera" (meta.woGraceMinutes,
      // configurable en Ajustes). Se llama periódicamente desde el cliente
      // del árbitro (ver startWOGraceTimerIfNeeded) mientras la ronda está
      // en curso ("playing"). Solo actúa cuando, pasado ese tiempo desde que
      // arrancó la partida (game.startedAt), entró exactamente uno de los
      // dos jugadores: al otro se le carga la incomparecencia (mismo efecto
      // que si el árbitro tocara el botón "WO" a mano). Si no entró
      // ninguno de los dos, no se declara nada automáticamente (queda a
      // criterio del árbitro, con los botones manuales de siempre): puede
      // deberse a un problema ajeno a los jugadores y no conviene
      // perjudicar a ambos sin que un humano lo revise. Devuelve la lista
      // de partidas a las que se les declaró WO (para el aviso en pantalla).
      // Con las partidas repartidas en un documento por mesa, ya no podemos
      // leer "todas las partidas de la ronda" y el documento principal
      // dentro de UNA sola transacción (Firestore no permite hacer queries
      // dentro de una transacción). Este chequeo corre cada 15s y no es
      // sensible a la performance de las jugadas, así que lo resolvemos en
      // dos pasos: 1) una lectura normal (no transaccional) para encontrar
      // qué mesas son candidatas a WO automático, 2) una transacción por
      // cada mesa candidata (revalidando las condiciones adentro, por si
      // cambió algo justo en el medio) y 3) una única transacción sobre el
      // documento principal para sumar los puntos de las mesas que
      // efectivamente se resolvieron.
      async function fbAutoDeclareForfeits() {
        assertReferee();
        const meta = lastTournamentState && lastTournamentState.meta;
        if (!meta) return [];
        const graceMinutes = Number(meta.woGraceMinutes) || 0;
        if (!graceMinutes || meta.status !== "active" || meta.roundStatus !== "playing") return [];
        const graceMs = graceMinutes * 60000;
        const now = Date.now();

        const qsnap = await gamesCollectionRef.where("round", "==", meta.round).get();
        const candidates = qsnap.docs
          .map((d) => ({ ref: d.ref, data: d.data() }))
          .filter(({ data: g }) => {
            if (g.status !== "ongoing" || !g.startedAt) return false;
            if (now - g.startedAt < graceMs) return false;
            const joined = g.joined || { w: false, b: false };
            return joined.w !== joined.b; // exactamente uno entró
          });
        if (candidates.length === 0) return [];

        const declared = [];
        for (const { ref } of candidates) {
          try {
            await fbDb.runTransaction(async (tx) => {
              const snap = await tx.get(ref);
              if (!snap.exists) return;
              const g = { ...snap.data() };
              if (g.status !== "ongoing" || !g.startedAt || now - g.startedAt < graceMs) return;
              const joined = g.joined || { w: false, b: false };
              if (joined.w === joined.b) return;
              g.status = "finished";
              g.resultReason = "wo-auto";
              g._woWinnerIsWhite = joined.w; // usado abajo, no se guarda tal cual
              tx.update(ref, { status: g.status, resultReason: g.resultReason });
              declared.push({ round: g.round, board: g.board, whiteJoined: joined.w });
            });
          } catch (err) {
            // Si otra pestaña del árbitro ya la resolvió, seguimos con las demás.
          }
        }
        if (declared.length === 0) return [];

        const results = [];
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) return;
          const data = snap.data();
          const meta2 = { ...data.meta };
          const players = (data.players || []).map((p) => ({ ...p, played: (p.played || []).slice() }));
          const byId = {};
          players.forEach((p) => (byId[p.id] = p));
          const pairings = (data.pairings || []).map((p) => ({ ...p }));

          declared.forEach((d) => {
            const pr = pairings.find((p) => p.round === d.round && p.board === d.board);
            if (!pr || pr.result) return; // ya tenía resultado: no lo tocamos de nuevo
            const white = byId[pr.whiteId];
            const black = byId[pr.blackId];
            if (!white || !black) return;
            const result = d.whiteJoined ? "wo-black" : "wo-white"; // gana quien entró
            applyResultToPlayers_(white, black, result, 1);
            pr.result = result;
            if (white.played.indexOf(black.id) === -1) white.played.push(black.id);
            if (black.played.indexOf(white.id) === -1) black.played.push(white.id);
            results.push({ board: pr.board, winner: d.whiteJoined ? white.name : black.name, absent: d.whiteJoined ? black.name : white.name });
          });

          if (results.length === 0) return;

          const roundPairings = pairings.filter((p) => p.round === meta2.round);
          const allDone = roundPairings.every((p) => p.result);
          if (allDone) {
            const totalRounds = meta2.totalRounds;
            if (totalRounds && meta2.round >= totalRounds) {
              meta2.status = "finished";
              meta2.roundStatus = "playing";
            } else {
              meta2.roundStatus = "pending_approval";
              meta2.pendingApprovalAt = Date.now();
              meta2.autoApprovalCancelled = false;
            }
          }

          tx.update(fbRoomRef, { players, pairings, meta: meta2 });
        });
        return results;
      }

      async function fbSubmitResult(round, board, result) {
        round = Number(round);
        board = Number(board);
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const players = (data.players || []).map((p) => ({ ...p, played: (p.played || []).slice() }));
          const byId = {};
          players.forEach((p) => (byId[p.id] = p));
          const pairings = (data.pairings || []).map((p) => ({ ...p }));

          const target = pairings.find((p) => p.round === round && p.board === board);
          if (!target) throw new Error("No se encontró esa partida");
          if (target.blackId === "") throw new Error("Esa fila es un BYE, no se puede cambiar");

          // Solo el administrador, el árbitro, o alguno de los dos jugadores
          // de esta partida puede cargar/cambiar su resultado (evita que
          // cualquier usuario cargue resultados de partidas ajenas).
          const myEmail = currentUser ? currentUser.email : "";
          const isParticipant =
            myEmail && ((target.whiteEmail || "").toLowerCase() === myEmail || (target.blackEmail || "").toLowerCase() === myEmail);
          if (!isCurrentUserAdmin(lastTournamentState) && !isCurrentUserReferee() && !isParticipant) {
            throw new Error("No tenés permiso para cargar el resultado de esta partida");
          }
          // Una ronda ya cerrada por el árbitro (ver fbCloseRound) queda
          // bloqueada para todos menos para el árbitro, incluso si el
          // resultado lo había cargado un jugador o el admin.
          if (target.locked && !isCurrentUserReferee()) {
            throw new Error("Esta ronda ya fue cerrada por el árbitro; solo el árbitro puede corregir resultados de una ronda cerrada");
          }

          // Si ya había un resultado cargado antes, primero deshacemos sus puntos.
          applyResultToPlayers_(byId[target.whiteId], byId[target.blackId], target.result, -1);
          target.result = result;
          applyResultToPlayers_(byId[target.whiteId], byId[target.blackId], result, 1);

          if (byId[target.whiteId].played.indexOf(target.blackId) === -1) {
            byId[target.whiteId].played.push(target.blackId);
          }
          if (byId[target.blackId].played.indexOf(target.whiteId) === -1) {
            byId[target.blackId].played.push(target.whiteId);
          }

          // Un resultado "wo-white"/"wo-black" (W.O., declarado por el
          // árbitro) también cierra la partida en vivo del tablero grande,
          // igual que un resultado normal cargado desde una jugada real.
          // Esa partida es un documento aparte (ver gamesCollectionRef): se
          // lee y escribe dentro de esta misma transacción, sin tocar el
          // documento de ninguna otra mesa.
          let gameDocRef = null;
          let gameUpdate = null;
          if (result === "wo-white" || result === "wo-black") {
            gameDocRef = gamesCollectionRef.doc(gameDocId_(round, board));
            const gSnap = await tx.get(gameDocRef);
            if (gSnap.exists) {
              gameUpdate = { status: "finished", resultReason: "wo" };
            }
          }

          // Si con este resultado ya quedaron cargadas todas las partidas de
          // la ronda actual: si ya se jugaron todas las rondas configuradas
          // el torneo se cierra (como antes), y si no, la ronda pasa a
          // "Pendiente de aprobación" — ya NO se generan los emparejamientos
          // de la ronda siguiente automáticamente acá. Eso ahora lo hace
          // fbApproveRound, a mano (modo manual) o solo, después de la
          // cuenta regresiva (modo automático); ver fbApproveRound más abajo.
          const meta = { ...data.meta };
          const totalRounds = meta.totalRounds;

          if (meta.status === "active" && meta.roundStatus !== "pending_approval" && meta.roundStatus !== "closed") {
            const roundPairings = pairings.filter((p) => p.round === meta.round);
            const allDone = roundPairings.every((p) => p.result);
            if (allDone) {
              if (totalRounds && meta.round >= totalRounds) {
                meta.status = "finished";
                meta.roundStatus = "playing";
              } else {
                meta.roundStatus = "pending_approval";
                meta.pendingApprovalAt = Date.now();
                meta.autoApprovalCancelled = false;
              }
            }
          }

          tx.update(fbRoomRef, { players, pairings, meta });
          if (gameDocRef && gameUpdate) tx.update(gameDocRef, gameUpdate);
        });
        return getTournamentStateOnce();
      }

      // Cierra el torneo manualmente en cualquier momento (por ejemplo si no
      // se fijó una cantidad de rondas de antemano). Solo administradores.
      async function fbFinishTournament() {
        assertAdmin();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          tx.update(fbRoomRef, { meta: { ...data.meta, status: "finished" } });
        });
        return getTournamentStateOnce();
      }

      // Reabre un torneo finalizado para poder seguir jugando rondas. Solo administradores.
      async function fbReopenTournament() {
        assertAdmin();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          tx.update(fbRoomRef, { meta: { ...data.meta, status: "active" } });
        });
        return getTournamentStateOnce();
      }

      // Cambia nombre y/o cantidad de rondas. Solo administradores. La lista
      // de administradores ya no es configurable: queda fija en
      // TOURNAMENT_ADMIN_EMAIL sin importar lo que se pase acá.
      async function fbUpdateSettings(name, totalRounds, adminEmails, timeControl, roundApprovalMode, woGraceMinutes) {
        assertAdmin();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const tc = timeControl || {
            minutes: data.meta.timeControlMinutes || 0,
            increment: data.meta.timeControlIncrement || 0,
          };
          tx.update(fbRoomRef, {
            meta: {
              ...data.meta,
              name: name || data.meta.name,
              totalRounds: totalRounds || null,
              adminEmails: [TOURNAMENT_ADMIN_EMAIL],
              timeControlMinutes: tc.minutes > 0 ? tc.minutes : 0,
              timeControlIncrement: tc.increment > 0 ? tc.increment : 0,
              roundApprovalMode: roundApprovalMode === "auto" ? "auto" : "manual",
              woGraceMinutes:
                woGraceMinutes === undefined ? data.meta.woGraceMinutes || 0 : Number(woGraceMinutes) > 0 ? Number(woGraceMinutes) : 0,
            },
          });
        });
        return getTournamentStateOnce();
      }

      async function fbMakeMove(round, board, fen, lastMoveSan, gameOverResult, lastFrom, lastTo, clientMoveAt, isTimeoutClaim) {
        round = Number(round);
        board = Number(board);
        // Sello de tiempo tomado en el cliente apenas se hizo la jugada
        // localmente (ver syncTournamentMove), no el instante en que esta
        // transacción finalmente se ejecuta. Cada partida es su propio
        // documento (ver gamesCollectionRef), así que ya no compite con las
        // jugadas de otras mesas; aun así puede haber algún reintento si
        // dos clientes de la MISMA mesa escriben casi al mismo tiempo (por
        // ejemplo, un reclamo de tiempo agotado cruzándose con una jugada).
        // Si acá usáramos Date.now() directo, cada reintento sumaría más
        // tiempo "de pensada" ficticio al jugador, y con relojes cortos eso
        // puede vaciar el reloj en 1-2 jugadas y dar la partida por
        // perdida injustamente. Usamos el sello del cliente, topado por las
        // dudas a que nunca sea posterior al "ahora" real.
        const effectiveMoveAt = Math.min(clientMoveAt || Date.now(), Date.now());
        const gameDocRef = gamesCollectionRef.doc(gameDocId_(round, board));

        // ATAJO para todo lo que NO sea un reclamo de tiempo agotado
        // (jugada normal, jaque mate, tablas, rendición), tenga o no
        // reloj la partida: en el camino caliente de cada jugada, quien
        // escribe este documento es SIEMPRE el mismo jugador que acaba de
        // mover, nunca compite con otro cliente escribiendo el mismo
        // documento a la vez (la única excepción real es justo el reclamo
        // de tiempo, que por eso sigue yendo por la transacción de abajo).
        // Al no haber carrera posible acá, no hace falta pagar el
        // round-trip de LECTURA que exige runTransaction(): nos alcanza
        // con el reloj/estado que ya tenemos cacheado en el cliente
        // (actualizado en tiempo real por subscribeRoundGames) para
        // calcular el descuento de tiempo nosotros mismos, y escribimos
        // directo con un solo update(). Eso deja la transacción SOLO en
        // claimTournamentTimeout (ver isTimeoutClaim), que es el único
        // punto donde de verdad puede haber dos clientes escribiendo el
        // mismo documento casi al mismo tiempo.
        const cachedGame =
          lastRoundGames.find((g) => g.round === round && g.board === board) ||
          (tournamentCurrentGameRow &&
          tournamentCurrentGameRow.round === round &&
          tournamentCurrentGameRow.board === board
            ? tournamentCurrentGameRow
            : null);
        if (cachedGame && !isTimeoutClaim) {
          if (cachedGame.status === "finished") throw new Error("Esa partida ya terminó");
          if (cachedGame.status === "suspended") throw new Error("Esta partida está suspendida por el árbitro");

          const isRealMove = cachedGame.clock && fen !== cachedGame.fen;
          if (isRealMove) {
            const joined = cachedGame.joined || { w: false, b: false };
            if (!joined.w || !joined.b) {
              throw new Error("Todavía no entraron los dos jugadores a la partida");
            }
          }

          const patch = { fen, lastMoveSan: lastMoveSan || "" };
          if (lastFrom) patch.lastFrom = lastFrom;
          if (lastTo) patch.lastTo = lastTo;
          if (isRealMove) {
            const moverColor = new Chess(cachedGame.fen).turn();
            const elapsed = cachedGame.turnStartAt
              ? Math.max(0, Math.round((effectiveMoveAt - getTimestampMs(cachedGame.turnStartAt)) / 1000))
              : 0;
            const newClock = { ...cachedGame.clock, [moverColor]: Math.max(0, cachedGame.clock[moverColor] - elapsed) };
            if (!gameOverResult && cachedGame.increment) {
              newClock[moverColor] += cachedGame.increment;
            }
            patch.clock = newClock;
            patch.turnStartAt = srvTimestamp();
          }
          if (gameOverResult) {
            patch.status = "finished";
            patch.result = gameOverResult;
          }
          await gameDocRef.update(patch);
          const writtenGame = { ...cachedGame, ...patch };
          // Reemplazar el placeholder de serverTimestamp por un timestamp
          // local para que el cronómetro del cliente pueda calcular elapsed
          // correctamente mientras espera el snapshot de Firestore.
          if (isRealMove) writtenGame.turnStartAt = effectiveMoveAt;
          if (!gameOverResult) {
            return { gameRow: writtenGame };
          }
          const fastState = await fbSubmitResult(round, board, gameOverResult);
          fastState.gameRow = writtenGame;
          return fastState;
        }

        let writtenGame = null;
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(gameDocRef);
          if (!snap.exists) throw new Error("No se encontró esa partida");
          const g = { ...snap.data() };
          if (g.status === "finished") throw new Error("Esa partida ya terminó");
          if (g.status === "suspended") throw new Error("Esta partida está suspendida por el árbitro");

          // En una partida con reloj no se deja mover hasta que entraron los
          // dos jugadores (ver "joined"/fbMarkJoined): si uno mueve antes de
          // que el otro esté presente, el reloj del rival empezaría a
          // correr mientras no está mirando la pantalla. Esto es un
          // resguardo extra del lado del servidor; el botón de mover ya
          // está bloqueado del lado del cliente en ese caso.
          if (g.clock && fen !== g.fen) {
            const joined = g.joined || { w: false, b: false };
            if (!joined.w || !joined.b) {
              throw new Error("Todavía no entraron los dos jugadores a la partida");
            }
          }

          // Si la partida tiene reloj y esto es una jugada real (cambió el
          // FEN), le descontamos a quien acaba de mover el tiempo que pasó
          // desde su último turno, y le sumamos el incremento si corresponde
          // (resignación/tablas/abandono por tiempo no mueven pieza, así que
          // no tocan el reloj acá). Si es la primera jugada de la partida
          // (turnStartAt todavía en null), no se descuenta nada: el reloj
          // recién empieza a correr a partir de esta jugada.
          if (g.clock && fen !== g.fen) {
            const moverColor = new Chess(g.fen).turn();
            const elapsed = g.turnStartAt ? Math.max(0, Math.round((effectiveMoveAt - getTimestampMs(g.turnStartAt)) / 1000)) : 0;
            g.clock = { ...g.clock, [moverColor]: Math.max(0, g.clock[moverColor] - elapsed) };
            if (!gameOverResult && g.increment) {
              g.clock = { ...g.clock, [moverColor]: g.clock[moverColor] + g.increment };
            }
            g.turnStartAt = srvTimestamp();
          }

          g.fen = fen;
          g.lastMoveSan = lastMoveSan || "";
          // Guardamos también origen/destino de la jugada para que el rival
          // pueda ver por unos segundos por dónde se movió la pieza (ver
          // handleLiveMatchUpdate). Si no vienen (p. ej. al rendirse o
          // acordar tablas sin mover), dejamos lo que ya había guardado.
          if (lastFrom) g.lastFrom = lastFrom;
          if (lastTo) g.lastTo = lastTo;
          if (gameOverResult) {
            g.status = "finished";
            // Guardamos el resultado acá, en el propio documento de la
            // partida, además de en meta.pairings (que actualiza
            // fbSubmitResult más abajo). Antes solo se guardaba el status
            // "finished" acá: como el listener de "games" (handleLiveMatchUpdate)
            // se entera de esto casi al instante, pero fbSubmitResult recién
            // actualiza meta.pairings en una segunda escritura por separado,
            // el rival (que no fue quien hizo la jugada) podía llegar a ver
            // el popup de fin de partida ANTES de que el resultado apareciera
            // en meta.pairings, y como updateTournamentMatchBar buscaba el
            // resultado ahí, mostraba el aviso genérico "Partida terminada"
            // en vez de decir quién ganó. Con el resultado ya en este mismo
            // documento, el rival lo ve apenas llega este snapshot, sin
            // depender de esa segunda escritura.
            g.result = gameOverResult;
          }
          tx.update(gameDocRef, g);
          writtenGame = g;
          // Reemplazar el placeholder de serverTimestamp por un timestamp
          // local para que el cronómetro del cliente pueda calcular elapsed
          // correctamente mientras espera el snapshot de Firestore.
          if (g.clock && fen !== g.fen) writtenGame.turnStartAt = effectiveMoveAt;
        });
        // ANTES: acá se hacían dos lecturas de red MÁS, en serie, después de
        // que la transacción ya había confirmado la jugada: getTournamentStateOnce()
        // (traía todo el documento del torneo, aunque en una jugada normal
        // ese dato ni se usa) y gameDocRef.get() (releía el documento de la
        // partida que un par de líneas arriba nosotros mismos acabamos de
        // escribir). Eso eran 3-4 idas y vueltas al servidor por cada
        // jugada. Como ya sabemos exactamente qué quedó guardado
        // (writtenGame, arriba), lo usamos directo: en una jugada normal
        // (sin jaque mate/tablas/rendición) no hace falta ninguna lectura
        // más y la jugada se siente sincronizada de inmediato. Solo cuando
        // hay un resultado (fin de partida) seguimos necesitando
        // fbSubmitResult (actualiza puntos y emparejamientos), pero incluso
        // ahí nos ahorramos la relectura final del documento de la partida.
        if (!gameOverResult) {
          return { gameRow: writtenGame };
        }
        const state = await fbSubmitResult(round, board, gameOverResult);
        state.gameRow = writtenGame;
        return state;
      }

      // Marca que un jugador (color "w" o "b") entró a mirar/jugar su
      // partida de torneo. En partidas con reloj, además sirve para no
      // dejar mover a nadie hasta que los dos entraron al menos una vez
      // (así ninguno pierde tiempo de reloj por no haber llegado todavía).
      // Se registra también en partidas sin reloj porque ahora
      // fbAutoDeclareForfeits usa esta misma marca de presencia para el WO
      // automático por tiempo de espera reglamentario, tenga o no tenga
      // reloj el torneo. Cualquiera de los dos jugadores puede marcar su
      // propia presencia, no hace falta ser administrador.
      async function fbMarkJoined(round, board, color) {
        round = Number(round);
        board = Number(board);
        const gameDocRef = gamesCollectionRef.doc(gameDocId_(round, board));
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(gameDocRef);
          if (!snap.exists) return;
          const g = snap.data();
          const joined = g.joined || { w: false, b: false };
          if (joined[color]) return; // ya estaba marcado: no hace falta escribir de nuevo
          tx.update(gameDocRef, { joined: { ...joined, [color]: true } });
        });
      }

      async function fbResetAll() {
        assertAdmin();
        // Las partidas y los anuncios viven en sus propias subcolecciones
        // (ver gamesCollectionRef / announcementsCollectionRef): sobrescribir
        // el documento principal con .set() no las borra solas, hay que
        // borrarlas explícitamente.
        const gamesSnap = await gamesCollectionRef.get();
        // Firestore permite hasta 500 operaciones por batch; en la
        // práctica un torneo escolar nunca se acerca a eso, pero
        // repartimos en tandas por las dudas de que algún día sí.
        const docs = gamesSnap.docs;
        for (let i = 0; i < docs.length; i += 400) {
          const batch = fbDb.batch();
          docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
        if (announcementsCollectionRef) {
          const announcementsSnap = await announcementsCollectionRef.get();
          const announcementDocs = announcementsSnap.docs;
          for (let i = 0; i < announcementDocs.length; i += 400) {
            const batch = fbDb.batch();
            announcementDocs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
            await batch.commit();
          }
        }
        await fbRoomRef.set({ meta: { name: "", round: 0, status: "setup", adminEmails: [], totalRounds: null }, players: [], pairings: [] });
        return getTournamentStateOnce();
      }

      function playerStatusLabel_(status) {
        if (status === "pending") return "⏳ Pendiente de autorización";
        if (status === "withdrawn") return "🚪 Retirado";
        if (status === "disqualified") return "⛔ Descalificado";
        return "✅ Activo";
      }

      function resultLabel(result) {
        if (result === "1-0") return "1 - 0";
        if (result === "0-1") return "0 - 1";
        if (result === "1/2-1/2") return "½ - ½";
        if (result === "wo-black") return "WO Blancas (1-0)";
        if (result === "wo-white") return "WO Negras (0-1)";
        return "";
      }

      // Ordena jugadores por puntos y, en caso de empate, por Buchholz
      // (suma de los puntos de todos los rivales que enfrentó cada uno).
      // Caché por referencia de rankPlayers_: mientras el snapshot del
      // torneo no cambie, normalizeTournamentState reutiliza los mismos
      // arrays "players" y "pairings" en cada re-render (renderTournamentState,
      // renderStandingsAndPlayers_ y renderPublicScreen llaman a rankPlayers_
      // por separado con esos mismos arrays). Antes eso recalculaba puntos,
      // Buchholz y V-E-D de todos los jugadores hasta 3 veces por cada
      // jugada, aunque nada del torneo hubiera cambiado. Si players y
      // pairings son las MISMAS referencias que la última vez, devolvemos el
      // resultado ya calculado en vez de recorrer todo de nuevo; en cuanto
      // cambie cualquiera de las dos (llega un snapshot nuevo con arrays
      // nuevos), se recalcula como antes.
      let _rankPlayersCache_ = { players: null, pairings: null, result: null };
      function rankPlayers_(players, pairings) {
        if (_rankPlayersCache_.players === players && _rankPlayersCache_.pairings === pairings) {
          return _rankPlayersCache_.result;
        }
        const result = rankPlayersCompute_(players, pairings);
        _rankPlayersCache_ = { players, pairings, result };
        return result;
      }

      function rankPlayersCompute_(players, pairings) {
        const byId = {};
        players.forEach((p) => (byId[p.id] = p));

        // V-E-D (victorias / empates / derrotas) por jugador, calculado a
        // partir de los pairings con resultado cargado. Los byes cuentan
        // como victoria.
        const record = {};
        players.forEach((p) => (record[p.id] = { w: 0, d: 0, l: 0 }));
        (pairings || []).forEach((pr) => {
          if (!pr.result || !record[pr.whiteId]) return;
          if (pr.blackId === "") {
            record[pr.whiteId].w += 1; // bye
            return;
          }
          if (!record[pr.blackId]) return;
          if (pr.result === "1-0" || pr.result === "wo-black") {
            record[pr.whiteId].w += 1;
            record[pr.blackId].l += 1;
          } else if (pr.result === "0-1" || pr.result === "wo-white") {
            record[pr.whiteId].l += 1;
            record[pr.blackId].w += 1;
          } else if (pr.result === "1/2-1/2") {
            record[pr.whiteId].d += 1;
            record[pr.blackId].d += 1;
          }
        });

        return players
          .map((p) => {
            const buchholz = (p.played || []).reduce((sum, oppId) => sum + (byId[oppId] ? byId[oppId].points : 0), 0);
            return { ...p, _buchholz: Math.round(buchholz * 100) / 100, _record: record[p.id] || { w: 0, d: 0, l: 0 } };
          })
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b._buchholz !== a._buchholz) return b._buchholz - a._buchholz;
            return a.name.localeCompare(b.name);
          });
      }

      // "Recalcular posiciones": el cálculo de puntos/Buchholz que se ve en
      // pantalla (rankPlayers_) ya se recalcula solo en cada render, a
      // partir de los pairings. Pero el campo "points" que se guarda en
      // cada jugador (el que de verdad se usa para armar los próximos
      // emparejamientos, ver buildNextRoundPairings_) se actualiza a mano,
      // partida por partida, en cada transacción. Si algún dato queda
      // desincronizado (por ejemplo, el árbitro corrige el resultado de una
      // ronda ya cerrada después de que se generaron rondas posteriores),
      // esta acción reconstruye desde cero "points", "byes", "played" y
      // "colorBalance" de todos los jugadores usando el historial de
      // pairings como única fuente de verdad. Exclusiva del árbitro.
      async function fbRecalculatePositions() {
        assertReferee();
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const players = (data.players || []).map((p) => ({
            ...p,
            points: 0,
            byes: 0,
            played: [],
            colorBalance: 0,
          }));
          const byId = {};
          players.forEach((p) => (byId[p.id] = p));

          (data.pairings || [])
            .slice()
            .sort((a, b) => a.round - b.round || a.board - b.board)
            .forEach((pr) => {
              const white = byId[pr.whiteId];
              if (!white) return;
              if (pr.blackId === "") {
                // BYE: cuenta como partida jugada y ganada, +1 punto.
                if (pr.result) {
                  white.byes += 1;
                  white.points += 1;
                }
                return;
              }
              const black = byId[pr.blackId];
              if (!black) return;
              if (white.played.indexOf(black.id) === -1) white.played.push(black.id);
              if (black.played.indexOf(white.id) === -1) black.played.push(white.id);
              white.colorBalance += 1;
              black.colorBalance -= 1;
              applyResultToPlayers_(white, black, pr.result, 1);
            });

          tx.update(fbRoomRef, { players });
        });
        return getTournamentStateOnce();
      }

      // Abre una ventana nueva con los emparejamientos de la ronda actual en
      // formato apto para imprimir (tablero, blancas, negras y una columna
      // en blanco para anotar el resultado a mano). No depende de Firebase:
      // arma el HTML a partir del estado ya cargado en memoria.
      function printCurrentRoundPairings(state) {
        const roundPairings = state.pairings
          .filter((p) => p.round === state.meta.round)
          .slice()
          .sort((a, b) => a.board - b.board);
        const rowsHtml = roundPairings
          .map(
            (p) => `
              <tr>
                <td>${p.board}</td>
                <td>${escapeHtml_(p.whiteName)}</td>
                <td>${p.blackId === "" ? "— (BYE)" : escapeHtml_(p.blackName)}</td>
                <td>${p.blackId === "" ? "1 - 0" : ""}</td>
              </tr>`
          )
          .join("");
        const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<title>Emparejamientos — ${escapeHtml_(state.meta.name)} — Ronda ${state.meta.round}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 0 0 18px; font-weight: normal; color: #444; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 8px 10px; text-align: left; font-size: 14px; }
  th { background: #eee; }
  td:first-child, th:first-child { width: 60px; text-align: center; }
  td:last-child, th:last-child { width: 110px; text-align: center; }
</style>
</head><body>
  <h1>${escapeHtml_(state.meta.name)}</h1>
  <h2>Emparejamientos — Ronda ${state.meta.round}</h2>
  <table>
    <thead><tr><th>Mesa</th><th>Blancas</th><th>Negras</th><th>Resultado</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body></html>`;
        const win = window.open("", "_blank");
        if (!win) {
          toast("❌ El navegador bloqueó la ventana de impresión. Habilitá pop-ups para este sitio.");
          return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.focus();
        win.onload = () => win.print();
        // Por si onload no dispara (algunos navegadores con document.write):
        setTimeout(() => {
          try {
            win.print();
          } catch (err) {
            /* noop */
          }
        }, 300);
      }

      // Exporta la tabla de posiciones actual a un PDF usando jsPDF (cargado
      // desde CDN en index.html, window.jspdf). No depende de Firebase.
      // Chequea si queda lugar en la página actual del PDF antes de dibujar
      // la próxima línea; si no, agrega una página nueva y devuelve el "y"
      // reiniciado. Se usa en todas las tablas del PDF para no cortar filas
      // a la mitad entre una página y la siguiente.
      function pdfEnsureSpace_(doc, y, marginTop) {
        if (y > 280) {
          doc.addPage();
          return marginTop;
        }
        return y;
      }

      // Dibuja la tabla de posiciones (ranking, puntos, Buchholz, V-E-D,
      // partidas jugadas y estado) a partir de "y" y devuelve el "y" donde
      // quedó libre para seguir escribiendo. La reusan exportStandingsPDF
      // (solo posiciones) y exportFullTournamentPDF (reporte completo).
      function pdfDrawStandingsTable_(doc, marginX, y, ranked, includeStatus) {
        const cols = [
          { label: "#", w: 10 },
          { label: "Jugador", w: includeStatus ? 58 : 70 },
          { label: "Puntos", w: 20 },
          { label: "Buchholz", w: 22 },
          { label: "V-E-D", w: 24 },
          { label: "Partidas", w: 20 },
        ];
        if (includeStatus) cols.push({ label: "Estado", w: 30 });

        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        let x = marginX;
        cols.forEach((c) => {
          doc.text(c.label, x, y);
          x += c.w;
        });
        doc.setFont(undefined, "normal");
        y += 4;
        doc.line(marginX, y, x, y);
        y += 6;

        ranked.forEach((p, i) => {
          y = pdfEnsureSpace_(doc, y, 18);
          const values = [
            String(i + 1),
            p.name,
            String(p.points),
            String(p._buchholz),
            `${p._record.w}-${p._record.d}-${p._record.l}`,
            String(p.played.length),
          ];
          if (includeStatus) values.push(playerStatusLabel_(p.status).replace(/^[^\s]+\s/, ""));
          x = marginX;
          values.forEach((v, idx) => {
            doc.text(String(v), x, y);
            x += cols[idx].w;
          });
          y += 7;
        });
        return y;
      }

      // Arma, en texto plano, la explicación de cómo se llegó al 1°, 2° y 3°
      // puesto a partir de la tabla ya ordenada (ranked = salida de
      // rankPlayers_). Para cada uno de los tres primeros compara contra el
      // jugador inmediatamente siguiente en la tabla para justificar por qué
      // quedó por encima: diferencia de puntos, o -si empataron en puntos-
      // diferencia de Buchholz (suma de los puntos de los rivales que
      // enfrentó cada uno), o -si también empataron en Buchholz- el criterio
      // final de orden alfabético que usa rankPlayers_ como último desempate.
      function explainTopThree_(ranked) {
        const medals = ["1° puesto", "2° puesto", "3° puesto"];
        const lines = [];
        const top = ranked.slice(0, 3);
        top.forEach((p, i) => {
          const next = ranked[i + 1];
          let reason;
          if (!next) {
            reason = "Único jugador en esta posición.";
          } else if (p.points !== next.points) {
            reason = `Se ubica por encima de ${next.name} por haber sumado más puntos en el torneo (${p.points} vs ${next.points}).`;
          } else if (p._buchholz !== next._buchholz) {
            reason =
              `Empató en puntos con ${next.name} (${p.points} c/u), pero lo superó por desempate Buchholz ` +
              `(${p._buchholz} vs ${next._buchholz}). El Buchholz suma los puntos totales que obtuvieron los ` +
              `rivales a los que se enfrentó cada jugador: enfrentar rivales que a su vez sumaron más puntos ` +
              `favorece este desempate.`;
          } else {
            reason =
              `Empató en puntos y en Buchholz con ${next.name} (${p.points} pts, Buchholz ${p._buchholz}). ` +
              `Al no haber diferencia en ningún desempate calculado, el orden entre ambos se definió de forma ` +
              `nominal (orden alfabético), por lo que en la práctica comparten esta posición.`;
          }
          lines.push({
            title: `${medals[i]}: ${p.name} — ${p.points} puntos, Buchholz ${p._buchholz} (${p._record.w}V ${p._record.d}E ${p._record.l}D)`,
            body: reason,
          });
        });
        return lines;
      }

      // Dibuja en el PDF, a partir de "y", la explicación del podio generada
      // por explainTopThree_, envolviendo el texto al ancho de la página.
      // Devuelve el "y" libre siguiente.
      function pdfDrawTopThreeExplanation_(doc, marginX, y, ranked) {
        if (!ranked.length) return y;
        y = pdfEnsureSpace_(doc, y, 18);
        doc.setFontSize(13);
        doc.text("Cómo se determinó el podio (1°, 2° y 3° puesto)", marginX, y);
        y += 8;
        const entries = explainTopThree_(ranked);
        doc.setFontSize(10);
        entries.forEach((entry) => {
          y = pdfEnsureSpace_(doc, y, 18);
          doc.setFont(undefined, "bold");
          const titleLines = doc.splitTextToSize(entry.title, 180);
          titleLines.forEach((tl) => {
            y = pdfEnsureSpace_(doc, y, 18);
            doc.text(tl, marginX, y);
            y += 5;
          });
          doc.setFont(undefined, "normal");
          const bodyLines = doc.splitTextToSize(entry.body, 180);
          bodyLines.forEach((bl) => {
            y = pdfEnsureSpace_(doc, y, 18);
            doc.text(bl, marginX, y);
            y += 5;
          });
          y += 3;
        });
        return y;
      }

      // Dibuja la tabla de emparejamientos/resultados de una ronda a partir
      // de "y" y devuelve el "y" libre siguiente.
      function pdfDrawPairingsTable_(doc, marginX, y, roundPairings) {
        const cols = [
          { label: "Mesa", w: 16 },
          { label: "Blancas", w: 60 },
          { label: "Negras", w: 60 },
          { label: "Resultado", w: 30 },
        ];
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        let x = marginX;
        cols.forEach((c) => {
          doc.text(c.label, x, y);
          x += c.w;
        });
        doc.setFont(undefined, "normal");
        y += 4;
        doc.line(marginX, y, x, y);
        y += 6;

        roundPairings
          .slice()
          .sort((a, b) => a.board - b.board)
          .forEach((p) => {
            y = pdfEnsureSpace_(doc, y, 18);
            const values = [
              String(p.board),
              p.whiteName,
              p.blackId === "" ? "— (BYE)" : p.blackName,
              p.result ? resultLabel(p.result) : "—",
            ];
            x = marginX;
            values.forEach((v, idx) => {
              doc.text(v, x, y);
              x += cols[idx].w;
            });
            y += 7;
          });
        return y;
      }

      function exportStandingsPDF(state) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
          toast("❌ No se pudo cargar la librería de PDF. Revisá tu conexión e intentá de nuevo.");
          return;
        }
        const ranked = rankPlayers_(state.players, state.pairings);
        const doc = new window.jspdf.jsPDF();
        const marginX = 14;
        let y = 18;
        doc.setFontSize(16);
        doc.text(state.meta.name || "Torneo", marginX, y);
        y += 7;
        doc.setFontSize(11);
        doc.text(`Tabla de posiciones — Ronda ${state.meta.round}`, marginX, y);
        y += 10;

        pdfDrawStandingsTable_(doc, marginX, y, ranked, false);

        const safeName = (state.meta.name || "torneo").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
        doc.save(`posiciones_${safeName}_ronda${state.meta.round}.pdf`);
      }

      // "Imprimir resultados del torneo en PDF (toda la información)": a
      // diferencia de exportStandingsPDF (solo la tabla de posiciones), este
      // reporte del administrador arma un PDF completo con: datos generales
      // del torneo, tabla de posiciones final/actual con estado de cada
      // jugador, los emparejamientos y resultados de TODAS las rondas
      // jugadas hasta ahora, y el listado completo de jugadores con su
      // email y estado. Pensado como acta/registro imprimible del torneo.
      function exportFullTournamentPDF(state) {
        if (!window.jspdf || !window.jspdf.jsPDF) {
          toast("❌ No se pudo cargar la librería de PDF. Revisá tu conexión e intentá de nuevo.");
          return;
        }
        const doc = new window.jspdf.jsPDF();
        const marginX = 14;
        let y = 18;

        // --- Portada / datos generales ---
        doc.setFontSize(18);
        doc.text(state.meta.name || "Torneo", marginX, y);
        y += 9;
        doc.setFontSize(11);
        const generatedAt = new Date().toLocaleString("es-AR");
        const statusText = state.meta.status === "finished" ? "Finalizado" : "En curso";
        const roundsNote = state.meta.totalRounds ? ` de ${state.meta.totalRounds}` : "";
        const timeControlText =
          state.meta.timeControlMinutes > 0
            ? `${state.meta.timeControlMinutes} min` + (state.meta.timeControlIncrement > 0 ? ` + ${state.meta.timeControlIncrement}s` : "")
            : "Sin reloj";
        [
          `Estado: ${statusText}`,
          `Ronda actual: ${state.meta.round}${roundsNote}`,
          `Jugadores: ${state.players.length}`,
          `Control de tiempo: ${timeControlText}`,
          `Reporte generado: ${generatedAt}`,
        ].forEach((line) => {
          doc.text(line, marginX, y);
          y += 6;
        });
        y += 4;

        if (state.meta.status === "finished") {
          const ranked0 = rankPlayers_(state.players, state.pairings);
          const topScore = ranked0.length ? ranked0[0].points : 0;
          const topTB = ranked0.length ? ranked0[0]._buchholz : 0;
          const champions = ranked0.filter((p) => p.points === topScore && p._buchholz === topTB);
          doc.setFont(undefined, "bold");
          doc.text(
            "Campeón: " + (champions.length > 1 ? champions.map((p) => p.name).join(", ") + " (empate)" : champions[0] ? champions[0].name : "—"),
            marginX,
            y
          );
          doc.setFont(undefined, "normal");
          y += 10;
        }

        // --- Tabla de posiciones ---
        y = pdfEnsureSpace_(doc, y, 18);
        doc.setFontSize(13);
        doc.text("Tabla de posiciones", marginX, y);
        y += 8;
        const ranked = rankPlayers_(state.players, state.pairings);
        y = pdfDrawStandingsTable_(doc, marginX, y, ranked, true);
        y += 6;

        // --- Explicación de cómo se obtuvo el 1°, 2° y 3° puesto ---
        y = pdfEnsureSpace_(doc, y + 4, 18);
        y = pdfDrawTopThreeExplanation_(doc, marginX, y, ranked);
        y += 4;

        // --- Emparejamientos y resultados, ronda por ronda ---
        const maxRound = state.pairings.reduce((m, p) => Math.max(m, p.round), 0);
        for (let r = 1; r <= maxRound; r++) {
          const roundPairings = state.pairings.filter((p) => p.round === r);
          if (roundPairings.length === 0) continue;
          y = pdfEnsureSpace_(doc, y + 4, 18);
          doc.setFontSize(13);
          doc.text(`Ronda ${r}`, marginX, y);
          y += 8;
          y = pdfDrawPairingsTable_(doc, marginX, y, roundPairings);
          y += 6;
        }

        // --- Listado de jugadores ---
        y = pdfEnsureSpace_(doc, y + 4, 18);
        doc.setFontSize(13);
        doc.text("Jugadores inscriptos", marginX, y);
        y += 8;
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        ["Jugador", "Email", "Estado"].forEach((label, i) => {
          doc.text(label, marginX + [0, 80, 150][i], y);
        });
        doc.setFont(undefined, "normal");
        y += 4;
        doc.line(marginX, y, marginX + 180, y);
        y += 6;
        state.players.forEach((p) => {
          y = pdfEnsureSpace_(doc, y, 18);
          doc.text(p.name, marginX, y);
          doc.text(p.email || "—", marginX + 80, y);
          doc.text(playerStatusLabel_(p.status).replace(/^[^\s]+\s/, ""), marginX + 150, y);
          y += 7;
        });

        const safeName = (state.meta.name || "torneo").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
        doc.save(`torneo_completo_${safeName}_ronda${state.meta.round}.pdf`);
      }

      let tournamentAutoApproveTimer = null;

      function stopAutoApproveTimer() {
        clearInterval(tournamentAutoApproveTimer);
        tournamentAutoApproveTimer = null;
      }

      // Chequeo periódico de incomparecencias (ver fbAutoDeclareForfeits):
      // solo corre en el cliente del árbitro, y solo mientras la ronda está
      // "playing" y el torneo tiene configurado un tiempo de espera > 0. Se
      // arranca/para desde renderTournamentState en cada actualización de
      // estado, igual que el temporizador de aprobación automática.
      let tournamentWOGraceTimer = null;
      // Mesas donde YA se avisó al árbitro que ninguno de los dos jugadores
      // se presentó (ver checkDoubleNoShowBoards_ más abajo). No se declara
      // WO automático en este caso —puede deberse a un problema de conexión
      // que afecte a ambos por igual, y ahí sí conviene que lo revise una
      // persona—, pero antes quedaba en silencio hasta que el árbitro
      // entrara a mirar la lista de mesas. Este Set evita mandar el mismo
      // aviso cada 15s mientras la mesa siga sin resolverse.
      let alertedDoubleNoShowBoards_ = new Set();

      // A diferencia de fbAutoDeclareForfeits (que sí declara WO cuando
      // entró exactamente uno de los dos), acá el caso es que NINGUNO de
      // los dos entró pasado el tiempo de tolerancia. A propósito no se
      // declara ganador automático: puede ser que los dos tengan un
      // problema real (conexión, se equivocaron de horario, etc.) y
      // conviene que un humano lo mire antes de darle el punto a alguien
      // sin partida. Lo que sí se puede hacer es avisarle al árbitro en
      // vez de dejarlo en silencio hasta que entre a mirar la lista de
      // mesas a mano.
      function checkDoubleNoShowBoards_(state) {
        const graceMinutes = Number(state.meta.woGraceMinutes) || 0;
        if (!graceMinutes) return;
        const graceMs = graceMinutes * 60000;
        const now = Date.now();
        const round = state.meta.round;
        const gamesByBoard = new Map();
        lastRoundGames.forEach((g) => gamesByBoard.set(g.board, g));

        state.pairings
          .filter((p) => p.round === round && p.blackId !== "" && !p.result)
          .forEach((p) => {
            const game = gamesByBoard.get(p.board);
            const joined = (game && game.joined) || { w: false, b: false };
            const key = round + "_" + p.board;
            const isDoubleNoShow =
              game && game.status === "ongoing" && game.startedAt && !joined.w && !joined.b && now - game.startedAt >= graceMs;
            if (isDoubleNoShow) {
              if (!alertedDoubleNoShowBoards_.has(key)) {
                alertedDoubleNoShowBoards_.add(key);
                toast(
                  `🔴 Mesa #${p.board}: ni ${p.whiteName} ni ${p.blackName} se presentaron. No se declaró WO automático — revisalo a mano.`
                );
              }
            } else {
              // Si alguno terminó entrando (o la mesa se resolvió de otra
              // forma), se saca del set para poder volver a avisar si en
              // el futuro pasara algo raro parecido en la misma mesa.
              alertedDoubleNoShowBoards_.delete(key);
            }
          });
      }

      function stopWOGraceTimer() {
        clearInterval(tournamentWOGraceTimer);
        tournamentWOGraceTimer = null;
      }

      function startWOGraceTimerIfNeeded(state) {
        const graceMinutes = Number(state.meta.woGraceMinutes) || 0;
        const shouldRun =
          isCurrentUserReferee() && graceMinutes > 0 && state.meta.status === "active" && state.meta.roundStatus === "playing";
        if (!shouldRun) {
          stopWOGraceTimer();
          return;
        }
        if (tournamentWOGraceTimer) return; // ya está corriendo
        const tick = async () => {
          try {
            const declared = await fbAutoDeclareForfeits();
            if (declared && declared.length > 0) {
              declared.forEach((d) => {
                toast(`⏱️ WO automático — mesa #${d.board}: gana ${d.winner} (${d.absent} no se presentó a tiempo)`);
              });
            }
          } catch (err) {
            // Silencioso: puede fallar si otra pestaña ya resolvió lo mismo,
            // o si el estado cambió (ronda cerrada, torneo terminado, etc.).
          }
          // Chequeo de "ninguno se presentó" aparte: es una simple lectura
          // del estado que ya tenemos suscripto (no pega contra Firestore),
          // así que conviene que corra siempre, incluso si fbAutoDeclareForfeits
          // de arriba falló por el motivo que sea.
          try {
            if (lastTournamentState) checkDoubleNoShowBoards_(lastTournamentState);
          } catch (err) {
            // Silencioso por la misma razón que arriba.
          }
        };
        tick();
        tournamentWOGraceTimer = setInterval(tick, 15000);
      }

      // Pinta la tarjeta "Ronda pendiente de aprobación": a los jugadores
      // les muestra solo un aviso, y al administrador le muestra el botón
      // "Aprobar ronda" y, si el torneo está en modo automático, la cuenta
      // regresiva de 30s (con botón para cancelarla).
      function renderApprovalPanel(state, isAdmin, isPendingApproval) {
        const panel = document.getElementById("tournament-approval-panel");
        const statusEl = document.getElementById("tournament-approval-status");
        const adminControls = document.getElementById("tournament-approval-admin-controls");
        const autoBox = document.getElementById("tournament-auto-approve-box");
        const isReferee = isCurrentUserReferee();
        const isClosed = state.meta.roundStatus === "closed";

        if (!isPendingApproval) {
          panel.style.display = "none";
          stopAutoApproveTimer();
          const refPanel = document.getElementById("tournament-referee-round-controls");
          if (refPanel) refPanel.style.display = "none";
          return;
        }

        panel.style.display = "";
        adminControls.style.display = isAdmin && !isClosed ? "" : "none";
        statusEl.textContent = isClosed
          ? "El árbitro ya cerró esta ronda: los resultados quedaron bloqueados y solo él puede corregirlos. Falta generar la ronda siguiente."
          : isAdmin
          ? "Ya están cargados todos los resultados de esta ronda. Revisá la tabla de posiciones y los resultados abajo; podés corregir cualquier resultado antes de aprobar."
          : "Ya terminaron todas las partidas de esta ronda. Falta que el administrador la revise y apruebe para que se genere la ronda siguiente.";

        // Controles exclusivos del árbitro: "Cerrar ronda" (bloquea
        // resultados para todos menos él) y, una vez cerrada, "Generar ronda
        // siguiente". Son un camino alternativo al botón de arriba (que
        // sigue siendo el flujo de un solo paso para el admin del torneo).
        const refPanel = document.getElementById("tournament-referee-round-controls");
        if (refPanel) {
          refPanel.style.display = isReferee ? "" : "none";
          const closeBtn = document.getElementById("tournament-close-round-btn");
          const genBtn = document.getElementById("tournament-generate-round-btn");
          if (closeBtn) closeBtn.style.display = isClosed ? "none" : "";
          if (genBtn) genBtn.style.display = isClosed ? "" : "none";

          // Selector de BYE manual: solo tiene sentido cuando la ronda ya
          // está cerrada (a un paso de "Generar ronda siguiente") y la
          // cantidad de jugadores activos es impar, así que va a haber un
          // BYE de todos modos. Si el árbitro deja "Automático", se
          // mantiene el criterio de siempre (menor puntaje, sin bye previo).
          const byeBox = document.getElementById("tournament-manual-bye-box");
          const byeSelect = document.getElementById("tournament-manual-bye-select");
          if (byeBox && byeSelect) {
            const activePlayers = state.players.filter((p) => (p.status || "active") === "active");
            const needsBye = isClosed && isReferee && activePlayers.length % 2 === 1;
            byeBox.style.display = needsBye ? "" : "none";
            if (needsBye) {
              const ranked = rankPlayers_(activePlayers, state.pairings);
              const previousValue = byeSelect.value;
              byeSelect.innerHTML =
                `<option value="">Automático (por defecto)</option>` +
                ranked
                  .map((p) => `<option value="${p.id}">${escapeHtml_(p.name)} — ${p.points} pts${p.byes ? " · ya tuvo BYE" : ""}</option>`)
                  .join("");
              if (ranked.some((p) => p.id === previousValue)) byeSelect.value = previousValue;
            }
          }
        }

        const isAuto = state.meta.roundApprovalMode === "auto" && !state.meta.autoApprovalCancelled;
        if (!isAdmin || !isAuto || isClosed) {
          autoBox.style.display = "none";
          stopAutoApproveTimer();
          return;
        }

        autoBox.style.display = "";
        if (tournamentAutoApproveTimer) return; // ya está corriendo, no hace falta arrancar otro

        const countdownEl = document.getElementById("tournament-auto-approve-countdown");
        const tick = async () => {
          const st = lastTournamentState;
          if (!st) return;
          const m = st.meta;
          const stillAuto =
            m.status === "active" && m.roundStatus === "pending_approval" && m.roundApprovalMode === "auto" && !m.autoApprovalCancelled;
          if (!stillAuto) {
            stopAutoApproveTimer();
            renderTournamentState(st); // refresca la tarjeta (por ej. si ya se aprobó o se canceló desde otra pestaña)
            return;
          }
          const deadline = (m.pendingApprovalAt || Date.now()) + 30000;
          const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
          countdownEl.textContent = `⏱️ Se va a aprobar sola en ${remaining}s...`;
          if (remaining <= 0) {
            stopAutoApproveTimer();
            try {
              await fbApproveRound();
              toast("✅ Ronda aprobada automáticamente: se generó la ronda siguiente.");
            } catch (err) {
              // Si ya se aprobó desde otra pestaña/dispositivo (por ejemplo,
              // el administrador tiene el torneo abierto en dos lugares),
              // el segundo intento falla en silencio: no es un error real.
              if (!/pendiente de aprobación/.test(err.message)) {
                toast("❌ No se pudo aprobar la ronda automáticamente: " + err.message);
              }
            }
          }
        };
        tick();
        tournamentAutoApproveTimer = setInterval(tick, 500);
      }

      // Muestra el formulario de "Inscribirme" a quien todavía no figure en
      // state.players con su email, o el cartel de confirmación a quien ya
      // esté anotado. Se llama en cada re-render del torneo (renderTournamentState),
      // así que refleja en vivo si alguien se acaba de inscribir desde otra pestaña.
      function renderSelfRegisterCard(state, isFinished) {
        const card = document.getElementById("tournament-self-register-card");
        if (!card) return;
        if (!currentUser || isFinished) {
          card.style.display = "none";
          return;
        }
        card.style.display = "";
        const formEl = document.getElementById("tournament-self-register-form");
        const statusEl = document.getElementById("tournament-self-register-status");
        const already = state.players.find((p) => (p.email || "").toLowerCase() === currentUser.email);
        if (already) {
          formEl.style.display = "none";
          statusEl.style.display = "";
          statusEl.textContent = `✓ Ya estás inscripto como "${already.name}" (${playerStatusLabel_(already.status)}).`;
        } else {
          formEl.style.display = "flex";
          statusEl.style.display = "none";
          const nameInput = document.getElementById("tournament-self-register-name");
          if (!nameInput.value) nameInput.value = currentUser.displayName || "";
        }
      }

      // Antes, cada vez que se reconstruía la lista de mesas se volvían a
      // enganchar listeners nuevos con listEl.querySelectorAll(...).forEach(...),
      // uno por cada botón de cada tarjeta. Con varias partidas online en
      // simultáneo eso significaba des-enganchar y re-enganchar decenas de
      // listeners muchas veces por segundo. Ahora se engancha UNA sola vez
      // (delegación de eventos sobre el contenedor) y sigue funcionando
      // aunque las tarjetas de adentro se reemplacen.
      let pairingsDelegationSetup_ = false;
      function setupPairingsListDelegation_(listEl) {
        if (pairingsDelegationSetup_) return;
        pairingsDelegationSetup_ = true;

        listEl.addEventListener("click", (e) => {
          const playBtn = e.target.closest("button[data-play-round]");
          if (playBtn) {
            enterTournamentMatch(
              Number(playBtn.dataset.playRound),
              Number(playBtn.dataset.playBoard),
              playBtn.dataset.white,
              playBtn.dataset.black,
              playBtn.dataset.whiteEmail,
              playBtn.dataset.blackEmail
            );
            return;
          }

          const resultBtn = e.target.closest("button[data-result]");
          if (resultBtn) {
            (async () => {
              if (tournamentBusy) return;
              tournamentBusy = true;
              try {
                const isAdmin = listEl.dataset.isAdmin === "1";
                if (!isAdmin && !isCurrentUserReferee()) throw new Error("No tenés permiso para cargar resultados");
                const result = resultBtn.dataset.result;
                if (
                  (result === "wo-black" || result === "wo-white") &&
                  !confirm("¿Confirmás declarar esta partida como W.O. (incomparecencia)?")
                ) {
                  tournamentBusy = false;
                  return;
                }
                const wasPending = lastTournamentState && lastTournamentState.meta.roundStatus === "pending_approval";
                const newState = await fbSubmitResult(resultBtn.dataset.round, resultBtn.dataset.board, result);
                if (!wasPending && newState.meta.roundStatus === "pending_approval") {
                  toast("✅ Ya están todos los resultados de la ronda. Revisá y aprobá la siguiente ronda.");
                } else if (!wasPending && newState.meta.status === "finished") {
                  toast("🏁 Se jugaron todas las rondas: el torneo terminó.");
                }
              } catch (err) {
                toast("❌ No se pudo cargar el resultado: " + err.message);
              } finally {
                tournamentBusy = false;
              }
            })();
            return;
          }

          const suspendBtn = e.target.closest("button[data-suspend-round]");
          if (suspendBtn) {
            (async () => {
              if (tournamentBusy) return;
              tournamentBusy = true;
              try {
                const suspend = suspendBtn.dataset.suspendAction === "suspend";
                await fbSetGameSuspended(suspendBtn.dataset.suspendRound, suspendBtn.dataset.suspendBoard, suspend);
                toast(suspend ? "⏸️ Partida suspendida" : "▶️ Partida reanudada");
              } catch (err) {
                showError(err);
              } finally {
                tournamentBusy = false;
              }
            })();
          }
        });
      }

      function renderTournamentState(state) {
        const setupBox = document.getElementById("tournament-setup-box");
        const activeBox = document.getElementById("tournament-active-box");

        updateModeBadge();

        if (!currentUser) {
          setupBox.style.display = "none";
          activeBox.style.display = "none";
          stopWOGraceTimer();
          return;
        }

        if (!state || (state.meta.status !== "active" && state.meta.status !== "finished")) {
          setupBox.style.display = isCurrentUserAdmin(state) ? "" : "none";
          activeBox.style.display = "none";
          stopWOGraceTimer();
          return;
        }

        setupBox.style.display = "none";
        activeBox.style.display = "";
        startWOGraceTimerIfNeeded(state);

        const isAdmin = isCurrentUserAdmin(state);
        const isFinished = state.meta.status === "finished";
        const isPendingApproval =
          !isFinished && (state.meta.roundStatus === "pending_approval" || state.meta.roundStatus === "closed");
        const roundsNote = state.meta.totalRounds ? ` de ${state.meta.totalRounds}` : "";

        document.getElementById("tournament-title-display").textContent = "🏆 " + state.meta.name;
        document.getElementById("tournament-round-display").textContent = isFinished
          ? `Torneo finalizado — ronda ${state.meta.round}${roundsNote} — ${state.players.length} jugadores`
          : isPendingApproval
          ? `Ronda ${state.meta.round}${roundsNote} — ${
              state.meta.roundStatus === "closed" ? "🔒 Cerrada, falta generar la siguiente" : "⏳ Pendiente de aprobación"
            } — ${state.players.length} jugadores`
          : `Ronda ${state.meta.round}${roundsNote} — ${state.players.length} jugadores`;

        const pendingBadgeEl = document.getElementById("tournament-pending-badge");
        const pendingCount = state.players.filter((p) => (p.status || "active") === "pending").length;
        if (pendingBadgeEl) {
          if ((isAdmin || isCurrentUserReferee()) && pendingCount > 0) {
            pendingBadgeEl.textContent = `🔔 ${pendingCount} inscripción${pendingCount === 1 ? "" : "es"} pendiente${
              pendingCount === 1 ? "" : "s"
            }`;
            pendingBadgeEl.style.display = "";
            pendingBadgeEl.style.cursor = "pointer";
            pendingBadgeEl.title = "Ir a las inscripciones pendientes";
          } else {
            pendingBadgeEl.style.display = "none";
          }
        }

        const announceComposerEl = document.getElementById("tournament-announcement-composer");
        if (announceComposerEl) announceComposerEl.style.display = isAdmin || isCurrentUserReferee() ? "" : "none";

        const countdownComposerEl = document.getElementById("tournament-round-countdown-composer");
        if (countdownComposerEl) countdownComposerEl.style.display = isAdmin || isCurrentUserReferee() ? "" : "none";
        renderRoundCountdown_(state);

        document.getElementById("tournament-admin-panel").style.display = isAdmin ? "" : "none";
        document.getElementById("tournament-next-round-btn").style.display = !isFinished && state.meta.round === 0 ? "" : "none";
        document.getElementById("tournament-finish-btn").style.display = isFinished ? "none" : "";
        document.getElementById("tournament-reopen-btn").style.display = isFinished ? "" : "none";
        if (!isAdmin) document.getElementById("tournament-settings-panel").style.display = "none";

        renderSelfRegisterCard(state, isFinished);
        renderApprovalPanel(state, isAdmin, isPendingApproval);

        const bannerEl = document.getElementById("tournament-champion-banner");
        if (isFinished) {
          const ranked = rankPlayers_(state.players, state.pairings);
          const topScore = ranked.length ? ranked[0].points : 0;
          const topTB = ranked.length ? ranked[0]._buchholz : 0;
          const champions = ranked.filter((p) => p.points === topScore && p._buchholz === topTB);
          document.getElementById("tournament-champion-text").textContent =
            champions.length > 1
              ? "Empate en el primer puesto: " + champions.map((p) => p.name).join(", ")
              : "Campeón: " + (champions[0] ? champions[0].name : "—");
          bannerEl.style.display = "";
        } else {
          bannerEl.style.display = "none";
        }

        const myEmail = currentUser.email;
        const isReferee = isCurrentUserReferee();
        const currentRoundPairings = state.pairings.filter((p) => p.round === state.meta.round);
        const listEl = document.getElementById("tournament-pairings-list");

        // Cada jugada de cualquier mesa sigue avisando a todos los
        // conectados (jugadores, admin, pantalla pública), porque el
        // listener de partidas es sobre toda la ronda actual (ver
        // subscribeRoundGames): eso es necesario para que la lista de
        // mesas y el reloj se vean en vivo. Lo que ya NO pasa es que la
        // ESCRITURA de esa jugada compita con la de otra mesa (antes todas
        // pisaban el mismo documento; ahora cada mesa tiene el suyo, ver
        // fbMakeMove).
        //
        // RENDER INCREMENTAL POR MESA: antes, cualquier jugada en
        // CUALQUIER mesa disparaba una firma sobre TODA la ronda
        // (currentRoundPairings + currentRoundGames juntos), así que con
        // varias partidas online en simultáneo cada jugada terminaba
        // reconstruyendo las N tarjetas de mesa enteras (con sus botones
        // y listeners) muchas veces por segundo. Ahora cada tarjeta lleva
        // su propia firma (solo con los datos de ESA mesa) y se saltea el
        // rebuild si no cambió, así una jugada en la mesa 3 no toca el DOM
        // de las mesas 1, 2, 4, etc.
        const currentRoundGames = lastRoundGames;
        setupPairingsListDelegation_(listEl);
        listEl.dataset.isAdmin = isAdmin ? "1" : "0";
        listEl.dataset.isReferee = isReferee ? "1" : "0";

        const sortedPairings = currentRoundPairings.slice().sort((a, b) => a.board - b.board);
        const seenBoards = new Set();

        // Índice round+board -> partida (antes: currentRoundGames.find(...)
        // por cada mesa, O(mesas * partidas)). Se arma una sola vez por
        // render y cada búsqueda pasa a ser O(1); el resultado (qué partida
        // corresponde a cada mesa) es exactamente el mismo.
        const gamesByRoundBoard_ = new Map();
        currentRoundGames.forEach((g) => gamesByRoundBoard_.set(g.round + "_" + g.board, g));

        // Índice mesa -> elemento DOM (antes: listEl.querySelector(...) por
        // cada mesa, dos veces por render, cada una recorriendo el DOM). Se
        // arma una sola vez recorriendo los hijos actuales y se va
        // actualizando a medida que se crean filas nuevas, así las
        // búsquedas de acá en adelante son O(1) por Map en vez de recorrer
        // el DOM.
        const rowsByBoard_ = new Map();
        Array.from(listEl.children).forEach((el) => {
          if (el.dataset && el.dataset.boardKey != null) rowsByBoard_.set(el.dataset.boardKey, el);
        });

        sortedPairings.forEach((p) => {
          seenBoards.add(String(p.board));
          const isBye = p.blackId === "";
          const game = isBye ? null : gamesByRoundBoard_.get(p.round + "_" + p.board) || null;
          const rowSignature = JSON.stringify([p, game, isAdmin, isReferee, myEmail]);

          let row = rowsByBoard_.get(String(p.board));
          if (row && row.dataset.sig === rowSignature) return; // esta mesa no cambió: no se toca su DOM

          if (!row) {
            row = document.createElement("div");
            row.className = "pairing-card";
            row.dataset.boardKey = p.board;
            rowsByBoard_.set(String(p.board), row);
            listEl.appendChild(row);
          }
          row.dataset.sig = rowSignature;

          if (isBye) {
            row.innerHTML = `
              <div class="pairing-card-header">
                <div class="pairing-card-board">Mesa ${p.board}</div>
                <span class="pairing-status pairing-status-bye">⭐ Punto automático</span>
              </div>
              <div class="pairing-card-names">
                <span class="pairing-side pairing-side-white">⚪ ${escapeHtml_(p.whiteName)}</span>
                <span class="vs">—</span>
                <span class="pairing-side-empty">Libre</span>
              </div>
              <div class="pairing-card-detail">Descansa esta ronda (bye, +1 punto)</div>
            `;
            return;
          }

          const bothJoined = !game || !game.clock || ((game.joined || {}).w && (game.joined || {}).b);
          const graceMinutes = Number(state.meta.woGraceMinutes) || 0;
          const joinedInfo = (game && game.joined) || { w: false, b: false };
          const onlyOneJoined = game && game.status === "ongoing" && joinedInfo.w !== joinedInfo.b;
          const woEtaText =
            graceMinutes > 0 && onlyOneJoined && game.startedAt
              ? (() => {
                  const remainingMs = game.startedAt + graceMinutes * 60000 - Date.now();
                  const absentName = escapeHtml_(joinedInfo.w ? p.blackName : p.whiteName);
                  return remainingMs > 0
                    ? `⏱️ Esperando a ${absentName} — WO automático en ${Math.ceil(remainingMs / 60000)} min`
                    : `⏱️ Tiempo de espera reglamentario cumplido para ${absentName}`;
                })()
              : "";
          // Detalle extra debajo del badge de estado: solo lo que no está
          // ya dicho por el badge (última jugada, cuenta regresiva de WO).
          // Evita repetir "Finalizada" / "Esperando jugadores" dos veces.
          const gameStatusText =
            game && game.status !== "finished" && game.status !== "suspended" && woEtaText
              ? woEtaText
              : game && game.status !== "finished" && game.status !== "suspended" && game.lastMoveSan
              ? "Última jugada: " + game.lastMoveSan
              : "";
          // Estado de la mesa: una etiqueta corta y clara, para poder
          // barrer la lista de un vistazo sin leer cada fila entera.
          // Cuando hay resultado cargado pero la ronda todavía está
          // "pending_approval" (y no está cerrada), lo marcamos como
          // pendiente de confirmar en vez de finalizado directamente.
          let statusCls, statusText;
          if (p.result) {
            if (state.meta.roundStatus === "pending_approval" && !p.locked) {
              statusCls = "pending";
              statusText = "🟣 Resultado pendiente de confirmar";
            } else if (p.result === "wo-black" || p.result === "wo-white") {
              statusCls = "wo";
              statusText = "⚫ Incomparecencia";
            } else if (p.result === "1/2-1/2") {
              statusCls = "draw";
              statusText = "🔵 Tablas acordadas";
            } else {
              statusCls = "finished";
              statusText = "⚪ Finalizada";
            }
            if (p.locked) statusText += " 🔒";
          } else if (game && game.status === "suspended") {
            statusCls = "suspended";
            statusText = "⏸️ Suspendida";
          } else if (
            graceMinutes > 0 &&
            game &&
            game.status === "ongoing" &&
            game.startedAt &&
            !joinedInfo.w &&
            !joinedInfo.b &&
            Date.now() - game.startedAt >= graceMinutes * 60000
          ) {
            // Caso distinto del "esperando jugadores" normal: acá ya pasó
            // el tiempo reglamentario y NINGUNO de los dos entró. No se
            // resuelve solo (ver checkDoubleNoShowBoards_), así que se
            // marca fuerte para que el árbitro lo vea de un vistazo en la
            // lista, no solo en el toast que ya recibió cuando pasó.
            statusCls = "no-show";
            statusText = "🔴 Nadie se presentó";
          } else if (game && game.clock && !bothJoined) {
            statusCls = "waiting";
            statusText = "🟡 Esperando jugadores";
          } else {
            statusCls = "playing";
            statusText = "🟢 En juego";
          }
          const clockHtml =
            game && game.clock
              ? `<div class="pairing-card-clock">⏱️ ${formatTime(game.clock.w)} — ${formatTime(game.clock.b)}</div>`
              : "";
          const isMyGame =
            (p.whiteEmail && p.whiteEmail.toLowerCase() === myEmail) || (p.blackEmail && p.blackEmail.toLowerCase() === myEmail);
          const canPlay = isAdmin || isMyGame;
          const opts = [
            ["1-0", "1-0"],
            ["1/2-1/2", "½-½"],
            ["0-1", "0-1"],
          ];
          // Declarar W.O. (incomparecencia) es una acción exclusiva del
          // árbitro: solo a él se le muestran estos dos botones extra.
          if (isReferee) {
            opts.push(["wo-black", "WO Blancas"]);
            opts.push(["wo-white", "WO Negras"]);
          }
          // Una ronda ya cerrada (ver fbCloseRound) queda bloqueada para
          // todos menos el árbitro: el admin y los jugadores ya solo ven
          // el resultado (con un candado) en vez de poder tocarlo.
          const canEditResult = (isAdmin || isReferee) && !(p.locked && !isReferee);
          const btnsHtml = canEditResult
            ? opts
                .map(
                  ([val, label]) =>
                    `<button data-round="${p.round}" data-board="${p.board}" data-result="${val}" class="${p.result === val ? "selected" : ""}">${label}</button>`
                )
                .join("")
            : p.result
            ? `<span class="muted">${resultLabel(p.result)}${p.locked ? " 🔒" : ""}</span>`
            : "";
          // Cualquiera puede entrar a mirar una partida del torneo, esté o
          // no registrado (no hace falta ser jugador ni admin): si no le
          // toca jugar esa partida, entra como espectador (ver
          // enterTournamentMatch / tournamentMyColor).
          const playBtnHtml = `<button class="btn" data-play-round="${p.round}" data-play-board="${p.board}" data-white="${escapeHtml_(p.whiteName)}" data-black="${escapeHtml_(p.blackName)}" data-white-email="${escapeHtml_(p.whiteEmail || "")}" data-black-email="${escapeHtml_(p.blackEmail || "")}">${canPlay ? "▶️ Jugar" : "👁️ Ver"}</button>`;
          // Suspender/reanudar una partida es exclusivo del árbitro, y solo
          // tiene sentido mientras la partida sigue en curso.
          const suspendBtnHtml =
            isReferee && game && game.status !== "finished"
              ? `<button class="btn" data-suspend-round="${p.round}" data-suspend-board="${p.board}" data-suspend-action="${
                  game.status === "suspended" ? "resume" : "suspend"
                }">${game.status === "suspended" ? "▶️ Reanudar" : "⏸️ Suspender"}</button>`
              : "";
          row.innerHTML = `
            <div class="pairing-card-header">
              <div class="pairing-card-board">Mesa ${p.board}</div>
              <span class="pairing-status pairing-status-${statusCls}">${statusText}</span>
            </div>
            <div class="pairing-card-names">
              <span class="pairing-side pairing-side-white">⚪ ${escapeHtml_(p.whiteName)}</span>
              <span class="vs">vs</span>
              <span class="pairing-side pairing-side-black">${escapeHtml_(p.blackName)} ⚫</span>
            </div>
            ${clockHtml}
            ${gameStatusText ? `<div class="pairing-card-detail">${gameStatusText}</div>` : ""}
            <div class="pairing-card-actions">
              ${playBtnHtml}
              ${suspendBtnHtml}
              <div class="pairing-result-btns">${btnsHtml}</div>
            </div>
          `;
        });

        // Saca del DOM las mesas que ya no están en la ronda actual (por
        // ejemplo, al avanzar de ronda con menos mesas por un bye nuevo).
        Array.from(listEl.children).forEach((el) => {
          if (el.dataset && el.dataset.boardKey != null && !seenBoards.has(el.dataset.boardKey)) el.remove();
        });

        // Reordena las tarjetas por número de mesa (por si el orden
        // cambió); como la mayoría ya está en su lugar, esto casi siempre
        // es un no-op barato.
        sortedPairings.forEach((p, idx) => {
          const row = rowsByBoard_.get(String(p.board));
          if (row && listEl.children[idx] !== row) listEl.insertBefore(row, listEl.children[idx] || null);
        });

        renderStandingsAndPlayers_(state, isAdmin, isReferee);
      }

      // Clasificación + panel de jugadores: separado de renderTournamentState
      // para poder saltearlo también (con su propia firma) cuando la lista
      // de mesas no cambió pero igual hace falta revisar si la clasificación
      // sí (por ejemplo, cuando el cambio fue un resultado de una ronda
      // anterior que no toca currentRoundPairings/currentRoundGames).
      let standingsSignature_ = null;
      function renderStandingsAndPlayers_(state, isAdmin, isReferee) {
        const standingsEl = document.getElementById("tournament-standings-list");
        // --- INSTRUMENTACIÓN TEMPORAL: costo de rankPlayers_ + stringify ---
        // Detrás de PERF_DEBUG: en producción no se llama a performance.now()
        // ni se arma el string de log en cada render.
        const __t0 = PERF_DEBUG ? performance.now() : 0;
        const ranked2 = rankPlayers_(state.players, state.pairings);
        const __t1 = PERF_DEBUG ? performance.now() : 0;
        const newStandingsSignature = JSON.stringify([ranked2, isReferee]);
        if (PERF_DEBUG) {
          const __t2 = performance.now();
          console.log(
            `[perf] standings rank=${(__t1 - __t0).toFixed(2)}ms stringify=${(__t2 - __t1).toFixed(2)}ms | pairings=${state.pairings.length}`
          );
        }
        if (standingsSignature_ !== newStandingsSignature) {
          standingsSignature_ = newStandingsSignature;
          let rows = ranked2
            .map(
              (p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml_(p.name)}</td>
                <td>${p.points}</td>
                <td>${p._buchholz}</td>
                <td>${p._record.w}-${p._record.d}-${p._record.l}</td>
                <td>${p.played.length}</td>
                <td>${playerStatusLabel_(p.status)}</td>
              </tr>`
            )
            .join("");
          standingsEl.innerHTML = `
            <table class="standings-table">
              <thead><tr><th>#</th><th>Jugador</th><th>Puntos</th><th>Buchholz</th><th>V-E-D</th><th>Partidas</th><th>Estado</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <p class="muted" style="font-size: 12px; margin-top: 8px">
              Buchholz = suma de puntos de los rivales que enfrentó cada jugador (desempate). V-E-D = victorias-empates-derrotas (el bye cuenta como victoria).
            </p>
          `;
        }

        // Herramientas exclusivas del árbitro sobre emparejamientos y
        // posiciones: recalcular, imprimir e exportar a PDF (ver
        // fbRecalculatePositions, printCurrentRoundPairings y
        // exportStandingsPDF más arriba).
        const refereePanelEl = document.getElementById("tournament-referee-panel");
        if (refereePanelEl) refereePanelEl.style.display = isReferee ? "" : "none";
        const refereeToolsEl = document.getElementById("tournament-referee-tools");
        if (refereeToolsEl) refereeToolsEl.style.display = isReferee ? "flex" : "none";

        renderPlayersPanel(state, isAdmin);
      }

      // =========================
      // PANTALLA PÚBLICA DEL TORNEO
      // Vista de solo lectura pensada para proyectarse en un TV/proyector
      // en el salón: nombre del torneo, ronda actual, clasificación en
      // vivo, mesas activas, resultados recientes y próxima ronda. No
      // requiere iniciar sesión (usa el mismo estado en tiempo real que ya
      // llega por subscribeTournament) y no muestra ningún control de
      // administración.
      // =========================
      // Alias histórico: toda la lógica vive ahora en escapeHtml_ (definida
      // arriba, junto a loadState), para no tener dos implementaciones del
      // mismo escape mantenidas por separado.
      function escapePublicScreenHtml_(text) {
        return escapeHtml_(text);
      }

      function resultLabelForPairing_(pairing) {
        if (!pairing.result) return "";
        if (pairing.blackId === "") return "BYE";
        switch (pairing.result) {
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
            return pairing.result;
        }
      }

      function publicScreenGameKey_(p) {
        return p.round + "-" + p.board;
      }

      // Busca el documento en vivo (con el FEN actual) de una mesa, en la
      // lista que ya mantiene subscribeRoundGames. Puede no estar todavía
      // (por ejemplo, el primer instante antes de que llegue el primer
      // snapshot de "games"), así que quien llama debe tener un fallback.
      function publicScreenLiveGameFor_(p) {
        return lastRoundGames.find((g) => g.round === p.round && g.board === p.board) || null;
      }

      const PUBLIC_SCREEN_START_FEN_ = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

      // Pinta un tablero (mini o de zoom) de la pantalla pública a partir de
      // un FEN. A diferencia de renderBoardGrid (pensado para los diagramas
      // de puzzles/análisis, con su propio esquema de color fijo), acá
      // usamos las mismas clases "white-piece"/"black-piece" + data-piece
      // que arma el tablero principal (ver render(), línea ~1149): así el
      // tablerito respeta el estilo de fichas que el usuario tenga elegido
      // (pstyle-bold, pstyle-neon, etc. -ver applyPieceStyle-, aplicado
      // como clase en <body>) en vez de mostrar siempre los mismos colores
      // fijos sin importar el tema.
      function renderPublicScreenBoardInto_(boardEl, fen) {
        const matrix = fenBoardToMatrix(fen);
        boardEl.innerHTML = "";
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const sqName = FILES[c] + (8 - r);
            const sq = document.createElement("div");
            sq.className = "square " + ((r + c) % 2 ? "dark" : "light");
            sq.dataset.square = sqName;
            const p = matrix[r][c];
            if (p) {
              const piece = document.createElement("div");
              piece.className = "piece " + (p.color === "w" ? "white-piece" : "black-piece");
              piece.textContent = PIECES[p.color + p.type.toUpperCase()];
              piece.dataset.piece = p.type.toUpperCase();
              sq.appendChild(piece);
            }
            boardEl.appendChild(sq);
          }
        }
      }

      function stopPublicScreenCycle_() {
        if (publicScreenCycleTimer_) {
          clearInterval(publicScreenCycleTimer_);
          publicScreenCycleTimer_ = null;
        }
      }

      function startPublicScreenCycleIfNeeded_() {
        if (publicScreenCycleTimer_) return;
        publicScreenCycleTimer_ = setInterval(advancePublicScreenCycle_, 10000);
      }

      function advancePublicScreenCycle_() {
        if (publicScreenActiveGames_.length <= 1) return;
        publicScreenCycleIndex_ = (publicScreenCycleIndex_ + 1) % publicScreenActiveGames_.length;
        renderPublicScreenActiveCard_();
      }

      // Dibuja SOLO la mesa que le toca al índice actual del carrusel (o el
      // estado vacío si no hay ninguna en juego). Separado del resto de
      // renderPublicScreen para poder llamarse también desde el ticker de
      // 10s del carrusel, sin depender de que haya llegado un snapshot
      // nuevo de Firestore.
      function renderPublicScreenActiveCard_() {
        const activeEl = document.getElementById("public-screen-active-tables");
        if (!activeEl) return;
        const games = publicScreenActiveGames_;
        if (!games.length) {
          activeEl.innerHTML = '<p class="public-screen-empty-note">No hay mesas en juego en este momento.</p>';
          return;
        }
        if (publicScreenCycleIndex_ >= games.length) publicScreenCycleIndex_ = 0;
        const p = games[publicScreenCycleIndex_];
        const counterNote =
          games.length > 1
            ? ` <span class="public-screen-cycle-counter">(${publicScreenCycleIndex_ + 1}/${games.length})</span>`
            : "";
        // El <div> se regenera entero en cada llamada (nuevo nodo), así que
        // la animación CSS de la barra de progreso arranca sola de nuevo
        // cada vez, sin necesidad de reiniciarla a mano desde JS.
        activeEl.innerHTML = `
          <div class="public-screen-active-row public-screen-active-row-cycle">
            <span class="public-screen-board-badge">Mesa ${p.board}${counterNote}</span>
            <span class="public-screen-vs">${escapePublicScreenHtml_(p.whiteName)} vs ${escapePublicScreenHtml_(p.blackName)}</span>
          </div>
          <div class="public-screen-mini-board-wrap" id="public-screen-mini-board-wrap" title="Tocá para ver esta mesa en grande">
            <div class="board public-screen-mini-board" id="public-screen-mini-board"></div>
          </div>
          <p class="public-screen-zoom-hint">🔍 Tocá el tablero para verlo en grande</p>
          ${games.length > 1 ? '<div class="public-screen-cycle-progress"><div class="public-screen-cycle-progress-bar"></div></div>' : ""}
        `;
        // El tablero en miniatura se arma con el mismo FEN "en vivo" que ya
        // llega por subscribeRoundGames (ver publicScreenLiveGameFor_): no
        // hace falta ninguna suscripción nueva ni pedir nada extra al
        // servidor. Si por algún motivo ese FEN todavía no llegó, se
        // muestra la posición inicial en vez de dejar el tablero vacío.
        const liveGame = publicScreenLiveGameFor_(p);
        const fen = (liveGame && liveGame.fen) || PUBLIC_SCREEN_START_FEN_;
        const miniBoardEl = document.getElementById("public-screen-mini-board");
        if (miniBoardEl) renderPublicScreenBoardInto_(miniBoardEl, fen);
        const wrapEl = document.getElementById("public-screen-mini-board-wrap");
        if (wrapEl) wrapEl.addEventListener("click", () => openPublicScreenZoom_(p));
      }

      // Repinta SOLO las piezas del tablerito ya presente en pantalla, sin
      // reconstruir el resto de la tarjeta (badge, nombres, barra de
      // progreso del carrusel). Antes, el tablerito solo se actualizaba
      // cuando el carrusel cambiaba de mesa cada 10s -y si había una sola
      // mesa en juego, ni eso: advancePublicScreenCycle_ no hace nada con
      // una sola mesa, así que el tablero quedaba congelado en la posición
      // del momento en que se abrió la pantalla pública. Esto se llama
      // en cada jugada nueva (ver el listener de subscribeRoundGames) para
      // que se vea la partida EN VIVO, jugada a jugada, sin esperar al
      // próximo tick del carrusel.
      function refreshPublicScreenActiveMiniBoard_() {
        const games = publicScreenActiveGames_;
        if (!games.length || publicScreenCycleIndex_ >= games.length) return;
        const p = games[publicScreenCycleIndex_];
        const miniBoardEl = document.getElementById("public-screen-mini-board");
        if (!miniBoardEl) return;
        const liveGame = publicScreenLiveGameFor_(p);
        const fen = (liveGame && liveGame.fen) || PUBLIC_SCREEN_START_FEN_;
        renderPublicScreenBoardInto_(miniBoardEl, fen);
      }

      // Arma (una sola vez) y muestra el modal de "zoom" con el tablero de
      // una mesa puntual en grande. Pausa el carrusel automático mientras
      // está abierto -si no, la mesa cambiaría sola cada 10s debajo del
      // modal, que quedaría desactualizado sin que nadie lo note- y lo
      // retoma al cerrar (ver closePublicScreenZoom_).
      function openPublicScreenZoom_(p) {
        publicScreenZoomKey_ = publicScreenGameKey_(p);
        stopPublicScreenCycle_();
        let backdrop = document.getElementById("public-screen-zoom-backdrop");
        if (!backdrop) {
          backdrop = document.createElement("div");
          backdrop.id = "public-screen-zoom-backdrop";
          backdrop.innerHTML = `
            <div id="public-screen-zoom-box">
              <p class="public-screen-zoom-vs" id="public-screen-zoom-vs"></p>
              <div class="public-screen-zoom-board-wrap">
                <div class="board public-screen-zoom-board" id="public-screen-zoom-board"></div>
              </div>
              <div class="public-screen-zoom-actions">
                <button class="btn" id="public-screen-zoom-fullscreen-btn">⛶ Pantalla completa</button>
                <button class="btn" id="public-screen-zoom-close">Cerrar</button>
              </div>
            </div>`;
          document.body.appendChild(backdrop);
          backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) closePublicScreenZoom_();
          });
          document.getElementById("public-screen-zoom-close").addEventListener("click", closePublicScreenZoom_);
          // Pantalla completa SOLO del modal (tablero + nombres), no de
          // toda la pestaña: útil para dejarlo proyectado en un momento
          // puntual de una mesa sin tener que salir antes de la pantalla
          // pública general (ver public-screen-fullscreen-btn más abajo,
          // mismo patrón con la Fullscreen API nativa).
          document.getElementById("public-screen-zoom-fullscreen-btn").addEventListener("click", () => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else if (backdrop.requestFullscreen) {
              backdrop.requestFullscreen();
            }
          });
        }
        backdrop.style.display = "flex";
        renderPublicScreenZoomBoard_();
      }

      function closePublicScreenZoom_() {
        publicScreenZoomKey_ = null;
        const backdrop = document.getElementById("public-screen-zoom-backdrop");
        if (backdrop) {
          // Si el modal quedó en pantalla completa, salimos de ese modo
          // antes de ocultarlo: si no, el navegador queda "atascado" en
          // fullscreen mostrando un elemento con display:none.
          if (document.fullscreenElement === backdrop) {
            document.exitFullscreen().catch(() => {});
          }
          backdrop.style.display = "none";
        }
        // Al cerrar, retomamos el carrusel automático (si hay más de una
        // mesa en juego; con una sola no hace falta ciclar nada).
        if (publicScreenActiveGames_.length > 1) startPublicScreenCycleIfNeeded_();
      }

      // Redibuja el tablero del modal de zoom con el FEN más reciente.
      // Se llama tanto al abrirlo como cada vez que llega una jugada nueva
      // (desde subscribeRoundGames) o cambia la lista de mesas activas
      // (desde renderPublicScreen), para que se vea la partida EN VIVO en
      // vez de una foto fija del momento en que se abrió.
      function renderPublicScreenZoomBoard_() {
        if (!publicScreenZoomKey_) return;
        const backdrop = document.getElementById("public-screen-zoom-backdrop");
        const p = publicScreenActiveGames_.find((g) => publicScreenGameKey_(g) === publicScreenZoomKey_);
        if (!p || !backdrop) {
          // La mesa que se estaba mirando ya no está en juego (terminó la
          // partida, cambió la ronda, o se reinició el torneo): se cierra
          // sola en vez de quedar mostrando algo que ya no corresponde.
          closePublicScreenZoom_();
          return;
        }
        const vsEl = document.getElementById("public-screen-zoom-vs");
        if (vsEl) vsEl.textContent = `Mesa ${p.board} — ${p.whiteName} vs ${p.blackName}`;
        const liveGame = publicScreenLiveGameFor_(p);
        const fen = (liveGame && liveGame.fen) || PUBLIC_SCREEN_START_FEN_;
        const boardEl = document.getElementById("public-screen-zoom-board");
        if (boardEl) renderPublicScreenBoardInto_(boardEl, fen);
      }

      function renderPublicScreen(state) {
        const emptyEl = document.getElementById("public-screen-empty");
        const contentEl = document.getElementById("public-screen-content");
        if (!emptyEl || !contentEl) return;

        const hasTournament = !!(state && (state.meta.status === "active" || state.meta.status === "finished"));
        emptyEl.style.display = hasTournament ? "none" : "";
        contentEl.style.display = hasTournament ? "" : "none";
        if (!hasTournament) {
          stopPublicScreenCycle_();
          publicScreenZoomKey_ = null;
          const zoomBackdrop = document.getElementById("public-screen-zoom-backdrop");
          if (zoomBackdrop) zoomBackdrop.style.display = "none";
          publicScreenActiveGames_ = [];
          return;
        }

        const isFinished = state.meta.status === "finished";
        const roundsNote = state.meta.totalRounds ? ` de ${state.meta.totalRounds}` : "";

        // Esto corre en TODOS los dispositivos conectados (no solo en la
        // pantalla pública) cada vez que cambia el documento principal del
        // torneo (meta/players/pairings). Ya NO se dispara con cada jugada
        // de cada mesa: eso ahora vive en documentos aparte por partida
        // (ver gamesCollectionRef/subscribeRoundGames), así que este
        // listener solo se activa cuando termina una partida o cambia la
        // ronda. Igual dejamos la comparación por firma para no rehacer el
        // HTML si nada de lo que se muestra acá cambió realmente.
        // --- INSTRUMENTACIÓN TEMPORAL: costo del stringify sobre el historial completo ---
        // Detrás de PERF_DEBUG: en producción no se llama a performance.now()
        // ni se arma el string de log en cada render.
        const __t0 = PERF_DEBUG ? performance.now() : 0;
        const publicSignature = JSON.stringify([state.players, state.pairings, state.meta]);
        if (PERF_DEBUG) {
          const __t1 = performance.now();
          console.log(
            `[perf] renderPublicScreen stringify=${(__t1 - __t0).toFixed(2)}ms | pairings=${state.pairings.length} players=${state.players.length}`
          );
        }
        if (contentEl.dataset.sig === publicSignature) return;
        contentEl.dataset.sig = publicSignature;

        document.getElementById("public-screen-name").textContent = state.meta.name || "Torneo";
        document.getElementById("public-screen-round").textContent = isFinished
          ? `🏁 Torneo finalizado — Ronda ${state.meta.round}${roundsNote}`
          : `Ronda ${state.meta.round}${roundsNote}`;

        // Clasificación en vivo (misma lógica de puntos/Buchholz que el
        // resto de la app: ver rankPlayers_).
        const ranked = rankPlayers_(state.players, state.pairings);
        const standingsEl = document.getElementById("public-screen-standings");
        if (!ranked.length) {
          standingsEl.innerHTML = '<p class="public-screen-empty-note">Todavía no hay jugadores.</p>';
        } else {
          const rows = ranked
            .map((p, i) => {
              const rec = p._record || { w: 0, d: 0, l: 0 };
              return `
                <tr>
                  <td class="public-screen-rank">${i + 1}</td>
                  <td>${escapePublicScreenHtml_(p.name)}</td>
                  <td>${p.points}</td>
                  <td>${p._buchholz}</td>
                  <td>${rec.w}/${rec.d}/${rec.l}</td>
                </tr>`;
            })
            .join("");
          standingsEl.innerHTML = `
            <table class="public-screen-table">
              <thead>
                <tr><th>#</th><th>Jugador</th><th>Pts</th><th>BH</th><th>V/E/D</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>`;
        }

        // Mesas activas: emparejamientos de la ronda actual que todavía no
        // tienen resultado cargado (no incluye byes, que quedan resueltos
        // apenas se genera la ronda). Se muestran de a una en un carrusel
        // (ver renderPublicScreenActiveCard_/advancePublicScreenCycle_) en
        // vez de listadas todas juntas, para que se lean bien en un
        // proyector aunque haya muchas mesas.
        const currentRoundPairings = state.pairings.filter((p) => p.round === state.meta.round);
        const activePairings = currentRoundPairings.filter((p) => p.blackId !== "" && !p.result).sort((a, b) => a.board - b.board);
        // Si la mesa que se estaba mostrando sigue en juego (por ejemplo,
        // acaba de cargarse el resultado de OTRA mesa), mantenemos la
        // posición del carrusel en vez de saltar siempre a la primera.
        const previousGame = publicScreenActiveGames_[publicScreenCycleIndex_];
        const previousKey = previousGame ? publicScreenGameKey_(previousGame) : null;
        publicScreenActiveGames_ = activePairings;
        const keptIndex = previousKey ? activePairings.findIndex((p) => publicScreenGameKey_(p) === previousKey) : -1;
        publicScreenCycleIndex_ = keptIndex !== -1 ? keptIndex : 0;
        renderPublicScreenActiveCard_();
        renderPublicScreenZoomBoard_();
        if (activePairings.length > 1 && !publicScreenZoomKey_) {
          startPublicScreenCycleIfNeeded_();
        } else if (!publicScreenZoomKey_) {
          stopPublicScreenCycle_();
        }

        // Resultados recientes: partidas con resultado cargado, empezando
        // por la ronda actual y, si faltan para completar la lista, las de
        // la ronda anterior.
        const recentEl = document.getElementById("public-screen-recent-results");
        const finishedCurrent = currentRoundPairings.filter((p) => p.result).sort((a, b) => a.board - b.board);
        let recentResults = finishedCurrent.slice();
        if (recentResults.length < 8 && state.meta.round > 1) {
          const prevRoundFinished = state.pairings
            .filter((p) => p.round === state.meta.round - 1 && p.result)
            .sort((a, b) => a.board - b.board);
          recentResults = recentResults.concat(prevRoundFinished);
        }
        recentResults = recentResults.slice(0, 12);
        if (!recentResults.length) {
          recentEl.innerHTML = '<p class="public-screen-empty-note">Todavía no hay resultados cargados.</p>';
        } else {
          recentEl.innerHTML = recentResults
            .map((p) => {
              const opponent = p.blackId === "" ? "— (BYE)" : escapePublicScreenHtml_(p.blackName);
              return `
                <div class="public-screen-result-row">
                  <span class="public-screen-board-badge">R${p.round}·M${p.board}</span>
                  <span class="public-screen-vs">${escapePublicScreenHtml_(p.whiteName)} vs ${opponent}</span>
                  <span class="public-screen-result-badge">${resultLabelForPairing_(p)}</span>
                </div>`;
            })
            .join("");
        }

        // Próxima ronda / estado general del torneo.
        const nextRoundEl = document.getElementById("public-screen-next-round");
        if (isFinished) {
          const topScore = ranked.length ? ranked[0].points : 0;
          const topTB = ranked.length ? ranked[0]._buchholz : 0;
          const champions = ranked.filter((p) => p.points === topScore && p._buchholz === topTB);
          nextRoundEl.textContent =
            champions.length > 1
              ? "🏆 Empate en el primer puesto: " + champions.map((p) => p.name).join(", ")
              : "🏆 Campeón: " + (champions[0] ? champions[0].name : "—");
        } else if (state.meta.roundStatus === "pending_approval") {
          nextRoundEl.textContent = `Ronda ${state.meta.round} terminada — esperando aprobación para pasar a la ronda ${state.meta.round + 1}`;
        } else if (state.meta.roundStatus === "closed") {
          nextRoundEl.textContent = `Ronda ${state.meta.round} cerrada — generando la ronda ${state.meta.round + 1}`;
        } else if (state.meta.totalRounds && state.meta.round >= state.meta.totalRounds) {
          nextRoundEl.textContent = "Última ronda en curso";
        } else {
          nextRoundEl.textContent = `Próxima ronda: ${state.meta.round + 1}${roundsNote}`;
        }
      }

      const publicScreenFullscreenBtn = document.getElementById("public-screen-fullscreen-btn");
      if (publicScreenFullscreenBtn) {
        publicScreenFullscreenBtn.addEventListener("click", () => {
          const el = document.getElementById("public-screen");
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else if (el && el.requestFullscreen) {
            el.requestFullscreen();
          }
        });
      }

      // Antes, cada vez que se reconstruía la lista de jugadores se volvían a
      // enganchar listeners nuevos con listEl.querySelectorAll(...).forEach(...),
      // uno por cada botón (editar/cancelar/guardar/eliminar/aprobar/
      // rechazar/retirar/reincorporar/descalificar) de cada jugador. Con
      // varias inscripciones o aprobaciones en simultáneo (torneo online
      // arrancando) eso significaba des-enganchar y re-enganchar decenas de
      // listeners muchas veces por segundo. Ahora se engancha UNA sola vez
      // (delegación de eventos sobre el contenedor), igual que ya se hacía
      // para la lista de mesas (ver setupPairingsListDelegation_ arriba).
      let playersDelegationSetup_ = false;
      function setupPlayersListDelegation_(listEl) {
        if (playersDelegationSetup_) return;
        playersDelegationSetup_ = true;

        listEl.addEventListener("click", (e) => {
          const editBtn = e.target.closest("button[data-edit-player]");
          if (editBtn) {
            tournamentEditingPlayerId = editBtn.dataset.editPlayer;
            renderPlayersPanel(lastTournamentState, true);
            return;
          }

          const cancelBtn = e.target.closest("button[data-cancel-edit-player]");
          if (cancelBtn) {
            tournamentEditingPlayerId = null;
            renderPlayersPanel(lastTournamentState, true);
            return;
          }

          const saveBtn = e.target.closest("button[data-save-player]");
          if (saveBtn) {
            (async () => {
              const playerId = saveBtn.dataset.savePlayer;
              const row = listEl.querySelector(`[data-player-row="${playerId}"]`);
              const name = row.querySelector(".player-edit-name").value;
              const email = row.querySelector(".player-edit-email").value;
              try {
                await fbEditPlayer(playerId, name, email);
                tournamentEditingPlayerId = null;
                toast("✓ Jugador actualizado");
              } catch (err) {
                showError(err);
              }
            })();
            return;
          }

          const deleteBtn = e.target.closest("button[data-delete-player]");
          if (deleteBtn) {
            (async () => {
              const playerId = deleteBtn.dataset.deletePlayer;
              const player = (lastTournamentState ? lastTournamentState.players : []).find((p) => p.id === playerId);
              if (!confirm(`¿Eliminar a ${player ? player.name : "este jugador"}? Se recalculará el torneo.`)) return;
              try {
                await fbDeletePlayer(playerId);
                toast("✓ Jugador eliminado");
              } catch (err) {
                showError(err);
              }
            })();
            return;
          }

          const approveBtn = e.target.closest("button[data-approve-registration]");
          if (approveBtn) {
            (async () => {
              const playerId = approveBtn.dataset.approveRegistration;
              try {
                await fbApproveRegistration(playerId);
                toast("✅ Inscripción autorizada");
              } catch (err) {
                showError(err);
              }
            })();
            return;
          }

          const rejectBtn = e.target.closest("button[data-reject-registration]");
          if (rejectBtn) {
            (async () => {
              const playerId = rejectBtn.dataset.rejectRegistration;
              const player = (lastTournamentState ? lastTournamentState.players : []).find((p) => p.id === playerId);
              if (!confirm(`¿Rechazar la inscripción de ${player ? player.name : "esta persona"}?`)) return;
              try {
                await fbRejectRegistration(playerId);
                toast("🚫 Inscripción rechazada");
              } catch (err) {
                showError(err);
              }
            })();
            return;
          }

          const withdrawBtn = e.target.closest("button[data-withdraw-player]");
          if (withdrawBtn) {
            (async () => {
              const playerId = withdrawBtn.dataset.withdrawPlayer;
              const player = (lastTournamentState ? lastTournamentState.players : []).find((p) => p.id === playerId);
              if (!confirm(`¿Retirar a ${player ? player.name : "este jugador"} del torneo? Conserva su historial, pero no se lo volverá a emparejar.`)) return;
              try {
                await fbWithdrawPlayer(playerId);
                toast("🚪 Jugador retirado");
              } catch (err) {
                showError(err);
              }
            })();
            return;
          }

          const reactivateBtn = e.target.closest("button[data-reactivate-player]");
          if (reactivateBtn) {
            (async () => {
              const playerId = reactivateBtn.dataset.reactivatePlayer;
              try {
                await fbReactivatePlayer(playerId);
                toast("↩️ Jugador reincorporado");
              } catch (err) {
                showError(err);
              }
            })();
            return;
          }

          const disqualifyBtn = e.target.closest("button[data-disqualify-player]");
          if (disqualifyBtn) {
            (async () => {
              const playerId = disqualifyBtn.dataset.disqualifyPlayer;
              const player = (lastTournamentState ? lastTournamentState.players : []).find((p) => p.id === playerId);
              if (!confirm(`¿Descalificar a ${player ? player.name : "este jugador"}? Esta acción no tiene vuelta atrás.`)) return;
              try {
                await fbDisqualifyPlayer(playerId);
                toast("⛔ Jugador descalificado");
              } catch (err) {
                showError(err);
              }
            })();
          }
        });
      }

      // Panel de administración de jugadores (alta, edición de nombre/email,
      // baja y acciones de estado: retirar/reincorporar/descalificar).
      // Visible para el árbitro del torneo y también para el administrador
      // (aunque no sea árbitro), porque autorizar/rechazar inscripciones
      // pendientes y editar/eliminar jugadores son acciones de admin, no
      // solo de árbitro. Dentro de la lista, cada botón sigue mostrándose
      // solo según corresponda (refereeBtns vs adminBtns más abajo).
      function renderPlayersPanel(state, isAdmin) {
        const card = document.getElementById("tournament-players-card");
        if (!card) return;
        const isReferee = isCurrentUserReferee();
        if (!isReferee && !isAdmin) {
          card.style.display = "none";
          return;
        }
        card.style.display = "";
        const listEl = document.getElementById("tournament-players-list");
        setupPlayersListDelegation_(listEl);

        if (tournamentEditingPlayerId && !state.players.some((p) => p.id === tournamentEditingPlayerId)) {
          tournamentEditingPlayerId = null;
        }

        const playersSignature = JSON.stringify([state.players, tournamentEditingPlayerId]);
        if (listEl.dataset.sig === playersSignature) return;
        listEl.dataset.sig = playersSignature;

        // Barra "Autorizar todos / Rechazar todos": se crea una sola vez y
        // se inserta arriba de la lista, justo antes de listEl. Solo se
        // muestra si hay inscripciones pendientes y el usuario es admin.
        const pendingIds = state.players.filter((p) => (p.status || "active") === "pending").map((p) => p.id);
        let bulkBar = document.getElementById("tournament-pending-bulk-actions");
        if (!bulkBar) {
          bulkBar = document.createElement("div");
          bulkBar.id = "tournament-pending-bulk-actions";
          bulkBar.style.cssText = "display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap;";
          listEl.parentNode.insertBefore(bulkBar, listEl);
        }
        if (isAdmin && pendingIds.length > 0) {
          bulkBar.style.display = "flex";
          bulkBar.innerHTML = `
            <button class="btn primary" id="tournament-approve-all-btn">✅ Autorizar todos (${pendingIds.length})</button>
            <button class="btn danger" id="tournament-reject-all-btn">🚫 Rechazar todos (${pendingIds.length})</button>
          `;
          const approveAllBtn = document.getElementById("tournament-approve-all-btn");
          if (approveAllBtn) {
            approveAllBtn.addEventListener("click", async () => {
              if (!confirm(`¿Autorizar las ${pendingIds.length} inscripciones pendientes?`)) return;
              try {
                await fbApproveAllRegistrations();
                toast("✅ Todas las inscripciones fueron autorizadas");
              } catch (err) {
                showError(err);
              }
            });
          }
          const rejectAllBtn = document.getElementById("tournament-reject-all-btn");
          if (rejectAllBtn) {
            rejectAllBtn.addEventListener("click", async () => {
              if (!confirm(`¿Rechazar las ${pendingIds.length} inscripciones pendientes? Esta acción no se puede deshacer.`)) return;
              try {
                await fbRejectAllRegistrations();
                toast("🚫 Todas las inscripciones pendientes fueron rechazadas");
              } catch (err) {
                showError(err);
              }
            });
          }
        } else {
          bulkBar.style.display = "none";
          bulkBar.innerHTML = "";
        }

        listEl.innerHTML = state.players
          .map((p) => {
            if (p.id === tournamentEditingPlayerId) {
              return `
                <div class="pairing-row" data-player-row="${p.id}">
                  <input type="text" class="player-edit-name" value="${p.name.replace(/"/g, "&quot;")}" style="flex:1; min-width:120px; padding:6px 8px; border-radius:8px; border:1px solid var(--surface2); background:var(--surface); color:var(--text)" />
                  <input type="email" class="player-edit-email" value="${(p.email || "").replace(/"/g, "&quot;")}" placeholder="Email" style="flex:1; min-width:160px; padding:6px 8px; border-radius:8px; border:1px solid var(--surface2); background:var(--surface); color:var(--text)" />
                  <button class="btn primary" data-save-player="${p.id}">Guardar</button>
                  <button class="btn" data-cancel-edit-player="1">Cancelar</button>
                </div>`;
            }
            const status = p.status || "active";
            // Una inscripción "pending" todavía no es parte del torneo: no
            // se le aplican acciones de árbitro (retirar/reincorporar/
            // descalificar no tienen sentido para alguien que ni siquiera
            // fue autorizado) ni las de edición/borrado de jugador ya
            // aceptado. Solo puede ser autorizada o rechazada por el admin.
            if (status === "pending") {
              const approvalBtns = isAdmin
                ? `
                  <button class="btn primary" data-approve-registration="${p.id}">✅ Autorizar</button>
                  <button class="btn danger" data-reject-registration="${p.id}">🚫 Rechazar</button>
                `
                : `<span class="muted" style="font-size:12px">Esperando autorización del administrador</span>`;
              return `
                <div class="pairing-row" data-player-row="${p.id}">
                  <div class="pairing-names">${escapeHtml_(p.name)}${p.email ? ` <span class="muted" style="font-size:12px">(${escapeHtml_(p.email)})</span>` : ""}
                    <div class="mini-diagram-caption" style="margin:2px 0 0;text-align:left">${playerStatusLabel_(p.status)}</div>
                  </div>
                  ${approvalBtns}
                </div>`;
            }
            // Acciones de árbitro sobre el estado del jugador: retirar (solo
            // si está activo), reincorporar (solo si está retirado, nunca si
            // está descalificado) y descalificar (solo si no lo está ya).
            const refereeBtns = isReferee
              ? `
                ${status === "active" ? `<button class="btn" data-withdraw-player="${p.id}">🚪 Retirar</button>` : ""}
                ${status === "withdrawn" ? `<button class="btn" data-reactivate-player="${p.id}">↩️ Reincorporar</button>` : ""}
                ${status !== "disqualified" ? `<button class="btn danger" data-disqualify-player="${p.id}">⛔ Descalificar</button>` : ""}
              `
              : "";
            const adminBtns = isAdmin
              ? `
                <button class="btn" data-edit-player="${p.id}">✏️ Editar</button>
                <button class="btn danger" data-delete-player="${p.id}">🗑️ Eliminar</button>
              `
              : "";
            return `
              <div class="pairing-row" data-player-row="${p.id}">
                <div class="pairing-names">${escapeHtml_(p.name)}${p.email ? ` <span class="muted" style="font-size:12px">(${escapeHtml_(p.email)})</span>` : ""}
                  <div class="mini-diagram-caption" style="margin:2px 0 0;text-align:left">${playerStatusLabel_(p.status)} · ${p.points} pts</div>
                </div>
                ${refereeBtns}
                ${adminBtns}
              </div>`;
          })
          .join("");
        // Los clicks de editar/cancelar/guardar/eliminar/aprobar/rechazar/
        // retirar/reincorporar/descalificar los maneja el listener delegado
        // enganchado una sola vez en setupPlayersListDelegation_ (arriba):
        // no hace falta volver a buscarlos ni re-engancharlos acá.
      }

      async function refreshTournament() {
        if (!fbRoomRef) return;
        try {
          const state = await getTournamentStateOnce();
          lastTournamentState = state;
          const hasActiveOrFinishedRound = state.meta.status === "active" || state.meta.status === "finished";
          subscribeRoundGames(hasActiveOrFinishedRound ? state.meta.round : null);
          renderTournamentState(state);
        } catch (err) {
          document.getElementById("tournament-connect-status").textContent = "❌ No se pudo conectar: " + err.message;
          document.getElementById("tournament-connect-status").classList.remove("correct");
        }
      }

      // Arma el mensaje del popup de fin de partida de torneo a partir del
      // resultado (1-0 / 0-1 / 1/2-1/2): un título grande y bien claro con
      // quién ganó (o si fue tablas), y una segunda línea aclarando si ganó,
      // perdió o empató quien está mirando la pantalla. Devuelve también un
      // "variant" (win/loss/draw) para pintar el popup de color acorde.
      // "reason" es un motivo opcional para agregar al final (por ejemplo,
      // "por tiempo" cuando se le acabó el reloj a alguien).
      function tournamentResultMessage(result, reason) {
        const ctx = tournamentMatchCtx;
        const whiteName = ctx ? ctx.whiteName : "Blancas";
        const blackName = ctx ? ctx.blackName : "Negras";
        const suffix = reason ? ` (${reason})` : "";
        const myColor = tournamentMyColor();

        let headline, detail, variant;
        if (result === "1-0") {
          headline = "🏆 ¡Ganaron las Blancas!";
          detail = `${whiteName} le ganó a ${blackName}${suffix}.`;
          variant = myColor === "w" ? "win" : myColor === "b" ? "loss" : null;
          if (myColor === "w") detail += "\n¡Ganaste vos! 🎉";
          if (myColor === "b") detail += "\nPerdiste esta partida.";
        } else if (result === "0-1") {
          headline = "🏆 ¡Ganaron las Negras!";
          detail = `${blackName} le ganó a ${whiteName}${suffix}.`;
          variant = myColor === "b" ? "win" : myColor === "w" ? "loss" : null;
          if (myColor === "b") detail += "\n¡Ganaste vos! 🎉";
          if (myColor === "w") detail += "\nPerdiste esta partida.";
        } else if (result === "1/2-1/2") {
          headline = "🤝 ¡Tablas!";
          detail = `${whiteName} y ${blackName} empataron la partida${suffix}.`;
          variant = myColor ? "draw" : null;
        } else if (result === "wo-black") {
          headline = "🏆 ¡Ganaron las Blancas!";
          detail = `${blackName} no se presentó: ${whiteName} ganó por incomparecencia (W.O.)${suffix}.`;
          variant = myColor === "w" ? "win" : myColor === "b" ? "loss" : null;
          if (myColor === "w") detail += "\n¡Ganaste vos! 🎉";
          if (myColor === "b") detail += "\nPerdiste esta partida.";
        } else if (result === "wo-white") {
          headline = "🏆 ¡Ganaron las Negras!";
          detail = `${whiteName} no se presentó: ${blackName} ganó por incomparecencia (W.O.)${suffix}.`;
          variant = myColor === "b" ? "win" : myColor === "w" ? "loss" : null;
          if (myColor === "b") detail += "\n¡Ganaste vos! 🎉";
          if (myColor === "w") detail += "\nPerdiste esta partida.";
        } else {
          return { text: "🏁 Partida de torneo terminada.", variant: null };
        }
        return { text: headline + "\n\n" + detail, variant };
      }

      function showTournamentResult(result, reason) {
        const msg = tournamentResultMessage(result, reason);
        showAlert(msg.text, msg.variant);
        showAlertBackToTournamentButton_();
        // Al cerrar este aviso (con el botón o tocando afuera), volvemos a
        // la pantalla del torneo en vez de dejar al jugador mirando el
        // tablero de la partida que ya terminó.
        alertOnClose_ = () => exitTournamentMatch();
      }

      function tournamentMyColor() {
        if (!tournamentMatchCtx || !currentUser) return "";
        const email = currentUser.email;
        if (tournamentMatchCtx.whiteEmail && tournamentMatchCtx.whiteEmail.toLowerCase() === email) return "w";
        if (tournamentMatchCtx.blackEmail && tournamentMatchCtx.blackEmail.toLowerCase() === email) return "b";
        return "";
      }

      // En una partida de torneo con reloj, no se deja mover hasta que
      // entraron los dos jugadores (así ninguno pierde tiempo de reloj por
      // no haber llegado todavía). Sin reloj esto no aplica.
      function tournamentClockWaitingForBothPlayers() {
        const gameRow = tournamentCurrentGameRow;
        if (!gameRow || !gameRow.clock) return false;
        const joined = gameRow.joined || { w: false, b: false };
        return !(joined.w && joined.b);
      }

      function updateTournamentMatchBar(gameRow) {
        if (!tournamentMatchActive || !tournamentMatchCtx) return;
        const statusEl = document.getElementById("tournament-match-status");
        const myColor = tournamentMyColor();
        if (gameRow && gameRow.status === "finished") {
          statusEl.textContent = "🏁 Partida terminada.";
          document.getElementById("tournament-match-controls").style.display = "none";
          document.getElementById("tournament-match-spectator-note").style.display = "none";
          clearInterval(tournamentClockTimer);
          if (!tournamentResultShown) {
            tournamentResultShown = true;
            // Preferimos gameRow.result (viene en el mismo documento/snapshot
            // que ya nos dice "finished", sin demora) y solo si por algún
            // motivo no está (partidas viejas, WO declarado por otra vía)
            // recurrimos al resultado guardado en meta.pairings.
            let finalResult = gameRow.result;
            if (!finalResult) {
              const pairing = (lastTournamentState && lastTournamentState.pairings || []).find(
                (p) => p.round === gameRow.round && p.board === gameRow.board
              );
              finalResult = pairing ? pairing.result : "";
            }
            showTournamentResult(finalResult);
          }
          return;
        }
        if (gameRow && gameRow.status === "suspended") {
          statusEl.textContent = "⏸️ El árbitro suspendió esta partida. Esperá novedades antes de seguir jugando.";
          document.getElementById("tournament-match-controls").style.display = "none";
          return;
        }
        const turn = game.turn();
        const turnName = turn === "w" ? tournamentMatchCtx.whiteName : tournamentMatchCtx.blackName;
        if (tournamentClockWaitingForBothPlayers()) {
          const joined = (gameRow && gameRow.joined) || { w: false, b: false };
          const missing = !joined.w ? tournamentMatchCtx.whiteName : tournamentMatchCtx.blackName;
          statusEl.textContent = `⏳ Esperando a que entre ${missing}. El reloj arranca recién con la primera jugada.`;
        } else {
          statusEl.textContent = !myColor
            ? `Turno de ${turnName}.`
            : myColor === turn
            ? `¡Tu turno! Jugás con ${myColor === "w" ? "blancas" : "negras"}.`
            : `Turno de ${turnName}. Esperando la jugada...`;
        }
      }

      // Se llama automáticamente cada vez que llega una actualización en
      // tiempo real desde Firestore mientras hay una partida de torneo
      // abierta en el tablero grande (reemplaza el sondeo periódico).
      function handleLiveMatchUpdate(state) {
        if (!tournamentMatchActive || !tournamentMatchCtx) return;
        const gameRow = lastRoundGames.find(
          (g) => g.round === tournamentMatchCtx.round && g.board === tournamentMatchCtx.board
        );
        if (!gameRow) return;
        tournamentCurrentGameRow = gameRow;
        if (gameRow.fen !== game.fen()) {
          game.load(gameRow.fen);
          selected = null;
          validMoves = [];
          if (gameRow.lastFrom && gameRow.lastTo) {
            // Antes se apagaba solo a los 3 segundos, pero si el jugador
            // no estaba mirando la pantalla justo en ese momento se lo
            // perdía. Ahora queda marcado hasta que el jugador haga su
            // propia jugada (se limpia en maybeTriggerBotMove).
            clearTimeout(opponentMoveHighlightTimer);
            opponentMoveHighlight = { from: gameRow.lastFrom, to: gameRow.lastTo };
          }
          render();
        }
        updateTournamentMatchBar(gameRow);
        updateTournamentClockDisplay();
      }

      // Reloj visual de la partida de torneo abierta: se recalcula a partir
      // de gameRow.clock (tiempo restante congelado en el último movimiento)
      // más lo que pasó desde gameRow.turnStartAt hasta ahora, así que no
      // hace falta ir a buscarlo a Firestore cada segundo. Si a alguien se
      // le acaba el tiempo, cualquiera de las dos pantallas conectadas
      // (jugador o rival) puede reclamar la derrota por tiempo.
      function updateTournamentClockDisplay() {
        const gameRow = tournamentCurrentGameRow;
        const wEl = document.getElementById("clock-w");
        const bEl = document.getElementById("clock-b");
        if (!gameRow || !gameRow.clock || !wEl || !bEl) return;
        // Mientras nuestra propia jugada se está sincronizando con Firestore
        // (tournamentMatchBusy), game.turn() ya cambió en el cliente pero
        // gameRow.turnStartAt todavía es el del turno anterior: si acá
        // siguiéramos calculando "elapsed", ese tiempo de pensada quedaría
        // mal atribuido al reloj del rival y podría gatillar un reclamo de
        // tiempo agotado falso apenas después de la primera jugada de cada
        // uno. Nos salteamos el chequeo y esperamos al próximo tick, que ya
        // va a tener el gameRow actualizado.
        if (tournamentMatchBusy) return;
        const turn = game.turn();
        const finished = gameRow.status === "finished";
        const suspended = gameRow.status === "suspended";
        const turnStartAtMs = getTimestampMs(gameRow.turnStartAt);
        if (turnStartAtMs && turnStartAtMs !== lastTurnStartAtMs) {
          lastTurnStartAtMs = turnStartAtMs;
          tournamentClockOffsetMs = turnStartAtMs - Date.now();
        }
        const serverNow = Date.now() + tournamentClockOffsetMs;
        const elapsed =
          finished || suspended || !turnStartAtMs
            ? 0
            : Math.max(0, Math.round((serverNow - turnStartAtMs) / 1000));
        const remaining = {
          w: gameRow.clock.w - (turn === "w" && !finished && !suspended ? elapsed : 0),
          b: gameRow.clock.b - (turn === "b" && !finished && !suspended ? elapsed : 0),
        };
        const wSecs = Math.max(0, remaining.w);
        const bSecs = Math.max(0, remaining.b);
        const wTime = wEl.querySelector(".clock-time");
        const bTime = bEl.querySelector(".clock-time");
        (wTime || wEl).textContent = formatTime(wSecs);
        (bTime || bEl).textContent = formatTime(bSecs);
        wEl.classList.toggle("active", turn === "w" && !finished && !suspended);
        bEl.classList.toggle("active", turn === "b" && !finished && !suspended);

        if (!finished && !suspended && ((turn === "w" && remaining.w <= 0) || (turn === "b" && remaining.b <= 0))) {
          claimTournamentTimeout(turn);
        }
      }

      // Alguien se quedó sin tiempo: se le declara la partida perdida a
      // "flaggedColor". Cualquiera de las dos pantallas conectadas puede
      // reclamarlo (por si quien se quedó sin tiempo cerró la app); si dos
      // clientes lo intentan a la vez, el segundo simplemente recibe el
      // error "esa partida ya terminó" y no pasa nada.
      async function claimTournamentTimeout(flaggedColor) {
        if (!tournamentMatchActive || !tournamentMatchCtx) return;
        if (tournamentResultShown || tournamentTimeoutClaimBusy) return;
        tournamentTimeoutClaimBusy = true;
        try {
          const result = flaggedColor === "w" ? "0-1" : "1-0";
          const state = await fbMakeMove(
            tournamentMatchCtx.round,
            tournamentMatchCtx.board,
            game.fen(),
            game.history().slice(-1)[0] || "",
            result,
            undefined,
            undefined,
            undefined,
            /* isTimeoutClaim */ true
          );
          const gameRow = state.gameRow;
          if (!tournamentResultShown) {
            tournamentResultShown = true;
            showTournamentResult(result, "tiempo agotado");
          }
          updateTournamentMatchBar(gameRow);
        } catch (err) {
          // Lo más probable es que la partida ya haya terminado de otra
          // forma (la reclamó el rival, se cargó otro resultado, etc.):
          // no hace falta mostrar ningún error acá.
        } finally {
          tournamentTimeoutClaimBusy = false;
        }
      }

      async function enterTournamentMatch(round, board, whiteName, blackName, whiteEmail, blackEmail) {
        // Pantalla completa real automática al entrar a una mesa de torneo
        // (antes solo se activaba si el jugador tocaba el botón "Pantalla
        // completa" a mano). Se hace ACÁ, antes de cualquier await, para
        // que el navegador todavía la reconozca como resultado directo del
        // toque/click que abrió la mesa (si no, Safari/iOS la rechaza).
        document.body.classList.add("fullscreen-game");
        const fsBtn_ = document.getElementById("game-fullscreen");
        if (fsBtn_) fsBtn_.textContent = fsBtn_.dataset.exitText || "❎ Salir";
        document.documentElement.requestFullscreen().catch(() => {});
        try {
          // Se lee directo el documento de esa mesa (ver gamesCollectionRef)
          // en vez de buscarlo dentro de un state.games que ya no existe;
          // si la ronda actual ya está suscripta (lo normal), lastRoundGames
          // ya lo tiene, pero por las dudas de que se entre justo antes de
          // que llegue el primer snapshot, resolvemos con una lectura directa.
          const cached = lastRoundGames.find((g) => g.round === round && g.board === board);
          let gameRow = cached || null;
          if (!gameRow) {
            const gSnap = await gamesCollectionRef.doc(gameDocId_(round, board)).get();
            gameRow = gSnap.exists ? gSnap.data() : null;
          }
          if (!gameRow) {
            toast("❌ No se encontró esa partida");
            return;
          }

          tournamentMatchCtx = { round, board, whiteName, blackName, whiteEmail: whiteEmail || "", blackEmail: blackEmail || "" };
          tournamentMatchActive = true;
          clearOpponentMoveHighlight();
          // Por si quedó corriendo el reloj local de una partida normal sin
          // terminar: paramos ese timer para que no siga descontando tiempo
          // ni pisando el reloj del torneo (ver updateClockDisplay/addIncrement).
          clearInterval(clockTimer);
          clockTimer = null;

          botEnabled = false;
          gameStarted = true;
          game.load(gameRow.fen);
          selected = null;
          validMoves = [];
          tournamentResultShown = false;

          showPage("jugar");

          // El tablero de una partida de torneo siempre se muestra lo más
          // grande posible (mismo layout ya probado del modo "Pantalla
          // completa" real, pero sin forzar la Fullscreen API del navegador).
          // Si el jugador además toca "Pantalla completa", se suma la clase
          // fullscreen-game encima de esta sin pisarla (ver setupFullscreenToggle).
          document.body.classList.add("tournament-board-max");

          document.getElementById("tournament-match-bar").style.display = "";
          document.getElementById("tournament-match-title").textContent =
            `🏆 Torneo · Ronda ${round}, tablero #${board}: ${whiteName} vs ${blackName}`;
          // Nombres de los jugadores sobre cada lado del reloj, para que se
          // vea claramente quién juega con blancas y quién con negras
          // directamente en el tablero (no solo en el título de arriba).
          const clockWNameEl = document.getElementById("clock-w-name");
          const clockBNameEl = document.getElementById("clock-b-name");
          if (clockWNameEl) clockWNameEl.textContent = whiteName || "";
          if (clockBNameEl) clockBNameEl.textContent = blackName || "";
          // Se ocultan los botones que no aplican a una partida de torneo
          // (iniciar partida nueva, deshacer, rendirse "normal" y copiar
          // partida, ya que el torneo tiene sus propios botones de
          // rendirse/tablas), pero se deja "Pantalla completa" visible
          // para poder jugar la partida de torneo a pantalla completa.
          ["new-game", "undo", "resign", "copy-game"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
          });
          // El reloj se muestra solo si el torneo tiene tiempo configurado
          // para esta partida (gameRow.clock). Se reutiliza el mismo reloj
          // visual del modo "Jugar", pero alimentado por el reloj guardado
          // en Firestore (ver updateTournamentClockDisplay) en vez del
          // reloj local de partidas contra la IA / pasar y jugar.
          tournamentCurrentGameRow = gameRow;
          clearInterval(tournamentClockTimer);
          const clockEl = document.querySelector("#page-jugar .clock");
          if (gameRow.clock) {
            if (clockEl) clockEl.style.display = "";
            updateTournamentClockDisplay();
            tournamentClockTimer = setInterval(updateTournamentClockDisplay, 500);
          } else if (clockEl) {
            clockEl.style.display = "none";
          }

          // En una partida de torneo no corresponde ofrecer ayuda del motor:
          // se ocultan "Modo educativo", "Ayuda educativa" y "Tutor IA".
          ["modo-educativo-panel", "ayuda-educativa-panel", "tutor-card"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
          });

          const myColor = tournamentMyColor();
          const spectatorNote = document.getElementById("tournament-match-spectator-note");
          const controlsEl = document.getElementById("tournament-match-controls");
          if (!myColor) {
            spectatorNote.style.display = "";
            controlsEl.style.display = "none";
          } else {
            spectatorNote.style.display = "none";
            controlsEl.style.display = "flex";
            if (gameRow.clock) {
              // Avisa que este jugador ya está presente; hasta que los dos
              // no entraron a la partida no se puede mover (ver
              // tournamentClockWaitingForBothPlayers), así ninguno pierde
              // tiempo de reloj por no haber llegado todavía.
              fbMarkJoined(round, board, myColor).catch(() => {});
            }
          }

          subscribeMatchChat(round, board);
          if (tournamentMyColor()) subscribeCallSignaling(round, board);
          renderCallUI();

          render();
          updateTournamentMatchBar(gameRow);
          requestAnimationFrame(sizeFullscreenBoard);
        } catch (err) {
          toast("❌ No se pudo abrir la partida: " + err.message);
        }
      }

      function exitTournamentMatch() {
        tournamentMatchActive = false;
        tournamentMatchCtx = null;
        tournamentResultShown = false;
        clearOpponentMoveHighlight();
        clearInterval(tournamentClockTimer);
        tournamentClockTimer = null;
        tournamentCurrentGameRow = null;
        tournamentClockOffsetMs = 0;
        lastTurnStartAtMs = 0;
        unsubscribeMatchChat();
        unsubscribeCallSignaling();

        document.getElementById("tournament-match-bar").style.display = "none";

        // Se apaga el modo de tablero maximizado y se limpia cualquier
        // tamaño en px que haya calculado sizeFullscreenBoard(), para que
        // el layout normal (con el panel de ajustes/jugadas) vuelva a
        // controlar el tamaño del tablero fuera del torneo.
        document.body.classList.remove("tournament-board-max");
        resetBoardFrameSize();
        // Si además había Fullscreen real del navegador activa, se sale
        // también (el listener de "fullscreenchange" ya se encarga de
        // sacar la clase fullscreen-game y actualizar el botón).
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }

        // Mientras la mesa estuvo abierta, el panel de emparejamientos y la
        // pantalla pública no se actualizaron (ver el guard en
        // subscribeRoundGames/subscribeTournament): al volver a la
        // pantalla del torneo hace falta este refresco explícito para que
        // se vean el resultado y el estado reales de todas las mesas.
        if (lastTournamentState) {
          renderTournamentState(lastTournamentState);
          if (typeof renderPublicScreen === "function") renderPublicScreen(lastTournamentState);
        }

        ["new-game", "undo", "resign", "copy-game"].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.style.display = "";
        });
        const clockEl = document.querySelector("#page-jugar .clock");
        if (clockEl) clockEl.style.display = "";
        // Se borran los nombres de jugador que quedaron pegados al reloj
        // durante la partida de torneo, para que no aparezcan en partidas
        // normales contra la IA o pasar y jugar.
        const clockWNameEl = document.getElementById("clock-w-name");
        const clockBNameEl = document.getElementById("clock-b-name");
        if (clockWNameEl) clockWNameEl.textContent = "";
        if (clockBNameEl) clockBNameEl.textContent = "";

        ["modo-educativo-panel", "ayuda-educativa-panel", "tutor-card"].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.style.display = "";
        });

        game.reset();
        gameStarted = false;
        selected = null;
        validMoves = [];
        render();

        showPage("torneo");
      }

      async function syncTournamentMove() {
        if (!tournamentMatchActive || !tournamentMatchCtx) return;
        if (!tournamentMyColor()) return; // espectador/admin mirando: no sincroniza jugadas propias
        tournamentMatchBusy = true;
        // Se toma acá, antes de cualquier ida y vuelta con Firestore: es el
        // instante real en que el jugador movió, y es lo que fbMakeMove usa
        // para descontar el reloj (ver el comentario en esa función).
        const clientMoveAt = Date.now();
        try {
          let gameOverResult = null;
          if (game.in_checkmate()) {
            gameOverResult = game.turn() === "w" ? "0-1" : "1-0";
          } else if (game.in_draw() || game.in_stalemate() || game.insufficient_material() || game.in_threefold_repetition()) {
            gameOverResult = "1/2-1/2";
          }
          const lastVerboseMove = game.history({ verbose: true }).slice(-1)[0];
          const state = await fbMakeMove(
            tournamentMatchCtx.round,
            tournamentMatchCtx.board,
            game.fen(),
            game.history().slice(-1)[0] || "",
            gameOverResult,
            lastVerboseMove ? lastVerboseMove.from : "",
            lastVerboseMove ? lastVerboseMove.to : "",
            clientMoveAt
          );
          const gameRow = state.gameRow;
          if (gameRow) tournamentCurrentGameRow = gameRow;
          if (gameOverResult && !tournamentResultShown) {
            // Se conoce el resultado exacto ya mismo (no hace falta esperar
            // a que llegue el próximo snapshot de Firestore), así que se
            // muestra el popup de una: funciona también a pantalla completa.
            tournamentResultShown = true;
            showTournamentResult(gameOverResult);
          }
          if (gameOverResult && state.meta.roundStatus === "pending_approval") {
            toast("✅ Ya están todos los resultados de esta ronda, falta que el administrador la apruebe.");
          }
          updateTournamentMatchBar(gameRow);
        } catch (err) {
          toast("❌ No se pudo sincronizar la jugada: " + err.message);
        } finally {
          tournamentMatchBusy = false;
        }
      }

      document.getElementById("tournament-match-back-btn").addEventListener("click", exitTournamentMatch);

      document.getElementById("tournament-match-resign-btn").addEventListener("click", async () => {
        const myColor = tournamentMyColor();
        if (!myColor) return;
        if (!confirm("¿Seguro que te querés rendir en esta partida?")) return;
        tournamentMatchBusy = true;
        try {
          const state = await fbMakeMove(
            tournamentMatchCtx.round,
            tournamentMatchCtx.board,
            game.fen(),
            game.history().slice(-1)[0] || "",
            myColor === "w" ? "0-1" : "1-0"
          );
          const gameRow = state.gameRow;
          if (!tournamentResultShown) {
            tournamentResultShown = true;
            showTournamentResult(myColor === "w" ? "0-1" : "1-0");
          }
          updateTournamentMatchBar(gameRow);
          toast(
            state.meta.roundStatus === "pending_approval"
              ? "🏳️ Te rendiste. Resultado cargado. Falta que el administrador apruebe la ronda."
              : "🏳️ Te rendiste. Resultado cargado."
          );
        } catch (err) {
          showError(err);
        } finally {
          tournamentMatchBusy = false;
        }
      });

      document.getElementById("tournament-match-draw-btn").addEventListener("click", async () => {
        if (!tournamentMyColor()) return;
        if (!confirm("¿Las dos partes están de acuerdo en tablas?")) return;
        tournamentMatchBusy = true;
        try {
          const state = await fbMakeMove(
            tournamentMatchCtx.round,
            tournamentMatchCtx.board,
            game.fen(),
            game.history().slice(-1)[0] || "",
            "1/2-1/2"
          );
          const gameRow = state.gameRow;
          if (!tournamentResultShown) {
            tournamentResultShown = true;
            showTournamentResult("1/2-1/2");
          }
          updateTournamentMatchBar(gameRow);
          toast(
            state.meta.roundStatus === "pending_approval"
              ? "🤝 Tablas cargadas. Falta que el administrador apruebe la ronda."
              : "🤝 Tablas cargadas."
          );
        } catch (err) {
          showError(err);
        } finally {
          tournamentMatchBusy = false;
        }
      });

      document.getElementById("tournament-match-call-btn").addEventListener("click", startAudioCall);
      document.getElementById("tournament-match-call-accept-btn").addEventListener("click", () => {
        if (callPendingOffer) acceptIncomingCall_(callPendingOffer);
      });
      document.getElementById("tournament-match-call-decline-btn").addEventListener("click", declineIncomingCall_);
      document.getElementById("tournament-match-call-cancel-btn").addEventListener("click", hangUpCall);
      document.getElementById("tournament-match-call-hangup-btn").addEventListener("click", hangUpCall);
      document.getElementById("tournament-match-call-mute-btn").addEventListener("click", toggleCallMute);

      document.getElementById("tournament-match-chat-toggle-btn").addEventListener("click", toggleMatchChatPanel);
      document.getElementById("tournament-match-chat-mute-btn").addEventListener("click", toggleMatchChatMute);
      renderMatchChatMuteBtn_();

      document.getElementById("tournament-match-chat-send-btn").addEventListener("click", sendMatchChatMessage);

      document.getElementById("tournament-match-chat-clear-btn").addEventListener("click", clearMatchChat);

      document.getElementById("tournament-match-chat-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          sendMatchChatMessage();
        }
      });

      // Contador de caracteres y habilitación del botón "Enviar" en vivo,
      // para que quede claro cuándo hay algo para mandar y cuánto espacio
      // queda antes del límite de 300 caracteres.
      document.getElementById("tournament-match-chat-input").addEventListener("input", (e) => {
        const len = e.target.value.length;
        const counterEl = document.getElementById("tournament-match-chat-counter");
        if (counterEl) counterEl.textContent = len > 0 ? `${len}/300` : "";
        const sendBtn = document.getElementById("tournament-match-chat-send-btn");
        if (sendBtn) sendBtn.disabled = !e.target.value.trim();
      });

      document.getElementById("tournament-connect-btn").addEventListener("click", async () => {
        const configText = document.getElementById("tournament-config-input").value;
        const room = document.getElementById("tournament-room-input").value.trim() || "main";
        const statusEl = document.getElementById("tournament-connect-status");
        try {
          const config = parseFirebaseConfigInput(configText);
          setFirebaseConfig(config);
          setTournamentRoom(room);
          connectFirebase(config, room);
        } catch (err) {
          statusEl.textContent = "❌ " + err.message;
          statusEl.classList.remove("correct");
        }
      });

      document.getElementById("tournament-google-signin-btn").addEventListener("click", async () => {
        try {
          const provider = new firebase.auth.GoogleAuthProvider();
          await firebase.auth().signInWithPopup(provider);
        } catch (err) {
          toast("❌ No se pudo iniciar sesión: " + err.message);
        }
      });

      // Desconecta la sala LAN (si había una) y vuelve la pantalla de
      // Torneo al estado inicial, para que puedan elegir modo de nuevo.
      function disconnectLan_() {
        if (lanClient_) {
          lanClient_.close();
          lanClient_ = null;
        }
        connectionMode = "online";
        currentUser = null;
        const lanBox = document.getElementById("tournament-lan-box");
        if (lanBox) lanBox.style.display = "none";
        const modeSelect = document.getElementById("tournament-mode-select");
        if (modeSelect) modeSelect.style.display = "";
        updateAuthUI();
      }

      document.getElementById("tournament-signout-btn").addEventListener("click", async () => {
        try {
          if (connectionMode === "lan") {
            disconnectLan_();
            toast("🚪 Saliste de la sala LAN");
            return;
          }
          await firebase.auth().signOut();
        } catch (err) {
          showError(err);
        }
      });

      const configSignoutBtn = document.getElementById("config-signout-btn");
      if (configSignoutBtn) {
        configSignoutBtn.addEventListener("click", async () => {
          try {
            if (connectionMode === "lan") {
              disconnectLan_();
              toast("🚪 Saliste de la sala LAN");
              return;
            }
            await firebase.auth().signOut();
            toast("🚪 Sesión cerrada");
          } catch (err) {
            toast("❌ No se pudo cerrar sesión: " + err.message);
          }
        });
      }

      // --- Selección de modo (Online / LAN) y conexión a una sala LAN ---
      const modeOnlineBtn = document.getElementById("tournament-mode-online-btn");
      const modeLanBtn = document.getElementById("tournament-mode-lan-btn");
      if (modeOnlineBtn) {
        modeOnlineBtn.addEventListener("click", () => {
          const lanBox = document.getElementById("tournament-lan-box");
          if (lanBox) lanBox.style.display = "none";
          // Antes esto solo reconectaba si connectionMode === "lan" en ese
          // instante. Pero disconnectLan_() (usado por "Cerrar sesión" en
          // modo LAN) ya deja connectionMode en "online" antes de volver a
          // mostrar esta pantalla, así que ese chequeo quedaba en false y
          // tocar "Torneo Online" no hacía nada: fbDb/fbRoomRef seguían
          // apuntando al cliente LAN ya cerrado. Se saca el chequeo y se
          // reconecta siempre (connectFirebase() es seguro de llamar de
          // nuevo: no reinicializa la app de Firebase si ya existe).
          if (lanClient_) {
            lanClient_.close();
            lanClient_ = null;
          }
          currentUser = null;
          connectionMode = "online";
          connectFirebase(getFirebaseConfig(), getTournamentRoom());
        });
      }
      if (modeLanBtn) {
        modeLanBtn.addEventListener("click", () => {
          const lanBox = document.getElementById("tournament-lan-box");
          if (lanBox) lanBox.style.display = "";
          const nameInput = document.getElementById("lan-name-input");
          if (nameInput) nameInput.focus();
        });
      }
      const lanBackBtn = document.getElementById("lan-back-btn");
      if (lanBackBtn) {
        lanBackBtn.addEventListener("click", () => {
          const lanBox = document.getElementById("tournament-lan-box");
          if (lanBox) lanBox.style.display = "none";
        });
      }
      const lanHostBtn = document.getElementById("lan-host-btn");
      if (lanHostBtn) {
        lanHostBtn.addEventListener("click", () => {
          const name = (document.getElementById("lan-name-input").value || "").trim();
          const room = (document.getElementById("lan-room-input").value || "").trim() || "main";
          const addr = (document.getElementById("lan-host-address-input").value || "").trim() || "localhost:8080";
          if (!name) {
            document.getElementById("lan-connect-status").textContent = "❌ Ingresá tu nombre";
            return;
          }
          connectLan(addr, room, name, true);
        });
      }
      const lanJoinBtn = document.getElementById("lan-join-btn");
      if (lanJoinBtn) {
        lanJoinBtn.addEventListener("click", () => {
          const name = (document.getElementById("lan-name-input").value || "").trim();
          const room = (document.getElementById("lan-room-input").value || "").trim() || "main";
          const addr = (document.getElementById("lan-host-input").value || "").trim();
          if (!name) {
            document.getElementById("lan-connect-status").textContent = "❌ Ingresá tu nombre";
            return;
          }
          if (!addr) {
            document.getElementById("lan-connect-status").textContent = "❌ Ingresá la dirección que te compartió el anfitrión";
            return;
          }
          connectLan(addr, room, name, false);
        });
      }

      document.getElementById("tournament-create-btn").addEventListener("click", async () => {
        const name = document.getElementById("tournament-name-input").value.trim() || "Torneo";
        const playerEntries = parsePlayersInput(document.getElementById("tournament-players-input").value);
        const totalRounds = document.getElementById("tournament-rounds-input").value.trim();
        if (playerEntries.length === 1) {
          toast("❌ Cargá al menos 2 jugadores, o dejá la lista vacía para que se inscriban ellos mismos");
          return;
        }
        if (playerEntries.some((p) => !p.email)) {
          toast("❌ Cada jugador necesita su email de Gmail (formato: Nombre, email)");
          return;
        }
        if (totalRounds && (!/^\d+$/.test(totalRounds) || Number(totalRounds) < 1)) {
          toast("❌ La cantidad de rondas tiene que ser un número entero mayor a 0 (o dejalo vacío)");
          return;
        }
        if (!fbRoomRef) {
          toast("❌ Primero conectate a tu proyecto de Firebase");
          return;
        }
        if (!currentUser) {
          toast("❌ Iniciá sesión con Google primero");
          return;
        }
        const timeControl = {
          minutes: getRawMinutesFromSelect("tournament-time-mode", "tournament-custom-minutes"),
          increment: getIncrementFromSelect("tournament-increment", "tournament-custom-increment"),
        };
        const roundApprovalMode = document.getElementById("tournament-round-mode").value === "auto" ? "auto" : "manual";
        const woGraceMinutes = document.getElementById("tournament-wo-grace-input").value.trim();
        try {
          await fbCreateTournament(name, playerEntries, totalRounds, undefined, timeControl, roundApprovalMode, woGraceMinutes);
          if (playerEntries.length >= 2) {
            await fbGenerateRound();
            toast("✓ Torneo creado y ronda 1 generada");
          } else {
            toast("✓ Torneo creado. Esperá a que se inscriban jugadores y generá la ronda 1 cuando quieras.");
          }
        } catch (err) {
          toast("❌ No se pudo crear el torneo: " + err.message);
        }
      });

      document.getElementById("tournament-next-round-btn").addEventListener("click", async () => {
        try {
          await fbGenerateRound();
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-finish-btn").addEventListener("click", async () => {
        if (!confirm("¿Cerrar el torneo ahora y declarar campeón según la tabla actual?")) return;
        try {
          await fbFinishTournament();
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-reopen-btn").addEventListener("click", async () => {
        try {
          await fbReopenTournament();
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-announcement-send-btn").addEventListener("click", async () => {
        const inputEl = document.getElementById("tournament-announcement-input");
        try {
          await sendTournamentAnnouncement(inputEl.value);
          inputEl.value = "";
          toast("📢 Anuncio enviado");
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-announcement-history-toggle").addEventListener("click", () => {
        const listEl = document.getElementById("tournament-announcement-history-list");
        listEl.style.display = listEl.style.display === "none" ? "" : "none";
      });

      document.querySelectorAll("#tournament-round-countdown-composer [data-countdown-minutes]").forEach((btn) => {
        btn.addEventListener("click", async () => {
          try {
            await fbSetRoundCountdown(Number(btn.dataset.countdownMinutes));
            toast("⏳ Countdown iniciado");
          } catch (err) {
            showError(err);
          }
        });
      });

      document.getElementById("tournament-round-countdown-start-btn").addEventListener("click", async () => {
        const inputEl = document.getElementById("tournament-round-countdown-custom-minutes");
        try {
          await fbSetRoundCountdown(Number(inputEl.value));
          inputEl.value = "";
          toast("⏳ Countdown iniciado");
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-round-countdown-cancel-btn").addEventListener("click", async () => {
        try {
          await fbCancelRoundCountdown();
          toast("⏳ Countdown cancelado");
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-settings-btn").addEventListener("click", () => {
        const state = lastTournamentState;
        if (!state) return;
        document.getElementById("tournament-settings-name-input").value = state.meta.name || "";
        document.getElementById("tournament-settings-rounds-input").value = state.meta.totalRounds || "";
        setSelectFromValue(
          "tournament-settings-time-mode",
          "tournament-settings-custom-time-label",
          "tournament-settings-custom-minutes",
          state.meta.timeControlMinutes || 0,
          ["none", "1", "3", "5", "10", "15", "30"]
        );
        setSelectFromValue(
          "tournament-settings-increment",
          "tournament-settings-custom-increment-label",
          "tournament-settings-custom-increment",
          state.meta.timeControlIncrement || 0,
          ["0", "2", "5", "10", "30"]
        );
        document.getElementById("tournament-settings-round-mode").value = state.meta.roundApprovalMode === "auto" ? "auto" : "manual";
        document.getElementById("tournament-settings-wo-grace-input").value = state.meta.woGraceMinutes || "";
        document.getElementById("tournament-settings-panel").style.display = "";
      });

      document.getElementById("tournament-settings-cancel-btn").addEventListener("click", () => {
        document.getElementById("tournament-settings-panel").style.display = "none";
      });

      document.getElementById("tournament-settings-save-btn").addEventListener("click", async () => {
        try {
          assertAdmin();
          const name = document.getElementById("tournament-settings-name-input").value.trim() || "Torneo";
          const roundsRaw = document.getElementById("tournament-settings-rounds-input").value.trim();
          if (roundsRaw && (!/^\d+$/.test(roundsRaw) || Number(roundsRaw) < 1)) {
            toast("❌ La cantidad de rondas tiene que ser un número entero mayor a 0 (o dejalo vacío)");
            return;
          }
          const totalRounds = roundsRaw ? Number(roundsRaw) : null;
          const timeControl = {
            minutes: getRawMinutesFromSelect("tournament-settings-time-mode", "tournament-settings-custom-minutes"),
            increment: getIncrementFromSelect("tournament-settings-increment", "tournament-settings-custom-increment"),
          };
          const roundApprovalMode = document.getElementById("tournament-settings-round-mode").value === "auto" ? "auto" : "manual";
          const woGraceRaw = document.getElementById("tournament-settings-wo-grace-input").value.trim();
          if (woGraceRaw && (!/^\d+$/.test(woGraceRaw) || Number(woGraceRaw) < 0)) {
            toast("❌ El tiempo de espera tiene que ser un número entero de minutos (o dejalo vacío)");
            return;
          }
          await fbUpdateSettings(name, totalRounds, [TOURNAMENT_ADMIN_EMAIL], timeControl, roundApprovalMode, woGraceRaw);
          document.getElementById("tournament-settings-panel").style.display = "none";
          toast("✓ Configuración guardada");
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-approve-round-btn").addEventListener("click", async () => {
        try {
          assertAdmin();
          await fbApproveRound();
          toast("✅ Ronda aprobada: se generó y publicó la ronda siguiente.");
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-cancel-auto-approve-btn").addEventListener("click", async () => {
        try {
          assertAdmin();
          await fbCancelAutoApproval();
          toast("✖️ Aprobación automática cancelada. Aprobá la ronda a mano cuando quieras.");
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-close-round-btn").addEventListener("click", async () => {
        try {
          await fbCloseRound();
          toast("🔒 Ronda cerrada: los resultados quedaron bloqueados salvo para vos.");
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-generate-round-btn").addEventListener("click", async () => {
        try {
          const byeBox = document.getElementById("tournament-manual-bye-box");
          const byeSelect = document.getElementById("tournament-manual-bye-select");
          const forcedByeId = byeBox && byeSelect && byeBox.style.display !== "none" ? byeSelect.value : "";
          await fbGenerateRoundFromClosed(forcedByeId || undefined);
          toast(
            forcedByeId
              ? "▶️ Se generó la ronda siguiente con el BYE elegido a mano."
              : "▶️ Se generó y publicó la ronda siguiente."
          );
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-recalc-positions-btn").addEventListener("click", async () => {
        if (!confirm("¿Recalcular las posiciones desde el historial de partidas? Esto corrige cualquier desincronización.")) return;
        try {
          await fbRecalculatePositions();
          toast("🔄 Posiciones recalculadas desde el historial de partidas.");
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-print-pairings-btn").addEventListener("click", () => {
        if (!lastTournamentState) return;
        printCurrentRoundPairings(lastTournamentState);
      });

      document.getElementById("tournament-export-standings-pdf-btn").addEventListener("click", () => {
        if (!lastTournamentState) return;
        exportStandingsPDF(lastTournamentState);
      });

      document.getElementById("tournament-export-full-pdf-btn").addEventListener("click", () => {
        try {
          assertAdmin();
          if (!lastTournamentState) return;
          exportFullTournamentPDF(lastTournamentState);
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-reset-btn").addEventListener("click", async () => {
        if (!confirm("¿Seguro que querés borrar todo el torneo actual? No se puede deshacer.")) return;
        try {
          await fbResetAll();
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-add-player-btn").addEventListener("click", async () => {
        const nameInput = document.getElementById("tournament-add-player-name");
        const emailInput = document.getElementById("tournament-add-player-email");
        try {
          await fbAddPlayer(nameInput.value, emailInput.value);
          nameInput.value = "";
          emailInput.value = "";
          toast("✓ Jugador agregado");
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-self-register-btn").addEventListener("click", async () => {
        const nameInput = document.getElementById("tournament-self-register-name");
        try {
          await fbSelfRegister(nameInput.value);
          toast("✅ ¡Te inscribiste al torneo!");
        } catch (err) {
          showError(err);
        }
      });

      document.getElementById("tournament-refresh-btn").addEventListener("click", refreshTournament);

      // El badge "🔔 N inscripciones pendientes" (junto al título del torneo)
      // lleva directo a la tarjeta de jugadores, donde están los botones
      // Autorizar/Rechazar, sin que el admin tenga que ubicarla a mano.
      const pendingBadgeBtn = document.getElementById("tournament-pending-badge");
      if (pendingBadgeBtn) {
        pendingBadgeBtn.addEventListener("click", () => {
          const playersCard = document.getElementById("tournament-players-card");
          if (playersCard) playersCard.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }

      // Al entrar a la página, precargar la configuración guardada y conectar
      // (el estado de sesión de Google lo resuelve onAuthStateChanged solo).
      (function initTournamentPage() {
        const savedConfig = getFirebaseConfig();
        const savedRoom = getTournamentRoom();
        document.getElementById("tournament-room-input").value = savedRoom;
        if (savedConfig) {
          document.getElementById("tournament-config-input").value = JSON.stringify(savedConfig, null, 2);
          try {
            connectFirebase(savedConfig, savedRoom);
          } catch (err) {
            document.getElementById("tournament-connect-status").textContent = "❌ " + err.message;
          }
        }
      })();

      // Nota: como getFirebaseConfig() ahora siempre devuelve, como mínimo,
      // DEFAULT_FIREBASE_CONFIG, savedConfig arriba nunca es null y la
      // conexión al torneo compartido de la escuela se hace sola al entrar
      // a la página, sin que el alumno tenga que pegar nada.

      // Ya no hace falta un temporizador de sondeo: la página del torneo y
      // la partida en vivo se actualizan solas gracias al listener en tiempo
      // real de Firestore (subscribeTournament / onSnapshot).
