      "use strict";

      import {
        formatTime,
        capitalizeFirst,
        dayOfYear,
        cpToWin,
        classifyLoss,
        levelLabel,
      } from "./utils.js";

      const PIECES = {
        wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
        bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟"
      };

      const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

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
      };

      let state = loadState();
      let toastTimer = null;

      function loadState() {
        try {
          const saved = JSON.parse(localStorage.getItem("chessSchoolData"));
          return { ...DEFAULT_STATE, ...(saved || {}) };
        } catch {
          return { ...DEFAULT_STATE };
        }
      }

      function save() {
        localStorage.setItem("chessSchoolData", JSON.stringify(state));
      }

      function toast(text) {
        const el = document.getElementById("toast");
        el.textContent = text;
        el.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
      }

      function showAlert(text, variant) {
        const box = document.getElementById("alert-box");
        box.classList.remove("result-win", "result-loss", "result-draw");
        if (variant) box.classList.add("result-" + variant);
        document.getElementById("alert-box-text").textContent = text;
        document.getElementById("alert-analyze-btn").style.display = "none";
        document.getElementById("alert").classList.add("show");
      }

      function offerAnalysis(gameId) {
        const btn = document.getElementById("alert-analyze-btn");
        btn.style.display = "inline-flex";
        btn.onclick = () => {
          document.getElementById("alert").classList.remove("show");
          openAnalysisModal(gameId);
        };
      }

      document.getElementById("alert").onclick = (e) => {
        if (e.target.id === "alert") {
          e.currentTarget.classList.remove("show");
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
      initStockfishWorker();

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

      let gameStarted = false;

      // -------- Partida de torneo jugada en el tablero grande de "Jugar" --------
      // (declaradas acá arriba, junto con el resto del estado, porque
      // render() ya las usa y se llama mucho antes de llegar a donde
      // estaban originalmente declaradas más abajo en el archivo)
      let tournamentMatchActive = false;
      let tournamentMatchCtx = null; // {round, board, whiteName, blackName, whiteEmail, blackEmail}
      let tournamentMatchBusy = false;
      let tournamentResultShown = false; // evita mostrar el popup de fin de partida más de una vez
      let tournamentClockTimer = null; // interval del reloj visual de la partida de torneo abierta
      let tournamentCurrentGameRow = null; // última fila de "games" conocida para la partida abierta
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

      // Devuelve el conjunto de casillas cuya pieza está atacada por el rival
      function getThreatenedSquares(fen) {
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
        return threatened;
      }

      // Resalta por unos segundos la casilla de origen y destino de la
      // última jugada recibida del rival en una partida de torneo (ver
      // handleLiveMatchUpdate), y dibuja la flecha de la ruta en render().
      // Declarada acá arriba, antes de render(), porque render() se llama
      // muy temprano al cargar la página (antes de que existiera esta
      // variable si se declaraba más abajo, lo que rompía toda la carga).
      let opponentMoveHighlight = null; // { from, to }
      let opponentMoveHighlightTimer = null;

      function clearOpponentMoveHighlight() {
        clearTimeout(opponentMoveHighlightTimer);
        opponentMoveHighlightTimer = null;
        opponentMoveHighlight = null;
      }

      function render() {
        const board = document.getElementById("board");
        const boardFrameEl = board.closest(".board-frame");
        if (boardFrameEl) boardFrameEl.classList.toggle("thinking", !!botThinking);
        board.innerHTML = "";
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

        for (const r of rows) {
          for (const c of cols) {
            const sqName = squares[c] + (8 - r);
            const square = document.createElement("div");
            square.className = "square " + ((r + c) % 2 ? "dark" : "light");
            square.dataset.square = sqName;

            if (selected === sqName) square.classList.add("selected");
            
            const history = game.history({ verbose: true });
            if (history.length > 0) {
              const lastM = history[history.length - 1];
              if (lastM.from === sqName || lastM.to === sqName) {
                square.classList.add("last");
              }
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
        const history = game.history({ verbose: true });
        const capturedW = [];
        const capturedB = [];
        // Con chess.js podemos inferir capturas o usar un conteo estándar, 
        // simplificamos mostrando material tomado si estuviera disponible o vacío.
        document.getElementById("captured-w").textContent = "";
        document.getElementById("captured-b").textContent = "";
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

      function renderMoves() {
        const container = document.getElementById("moves");
        const emptyMsg = document.getElementById("moves-empty");
        const countEl = document.getElementById("moves-count");

        container.querySelectorAll(".move-row").forEach((el) => el.remove());

        const verboseHistory = game.history({ verbose: true });
        if (countEl) countEl.textContent = verboseHistory.length;

        if (!verboseHistory.length) {
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

        for (let i = 0; i < verboseHistory.length; i += 2) {
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
          render();

          const sqEl = document.querySelector(`.square[data-square="${dragCtx.from}"]`);
          const freshPieceEl = sqEl ? sqEl.querySelector(".piece") : null;
          if (freshPieceEl) {
            dragCtx.pieceEl = freshPieceEl;
            freshPieceEl.classList.add("dragging");
            freshPieceEl.style.width = dragCtx.width + "px";
            freshPieceEl.style.height = dragCtx.height + "px";
            sqEl.classList.add("drag-origin");
          }
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

      function onPieceDragUp(e) {
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
          const fenBeforeMove = game.fen();
          const move = game.move({ from: ctx.from, to, promotion: "q" });
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

      function clickSquare(sqName) {
        if (Date.now() < justDraggedUntil) return;
        if (!gameStarted || game.game_over() || botThinking) return;
        if (botEnabled && game.turn() === botColor) return;
        if (tournamentMatchActive && game.turn() !== tournamentMyColor()) return;

        if (selected === sqName) {
          selected = null;
          validMoves = [];
          render();
          return;
        }

        if (selected) {
          const fenBeforeMove = game.fen();
          const move = game.move({ from: selected, to: sqName, promotion: 'q' });
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
        render();
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
        // Objeto simple para snapshots de análisis
        return {
          board: g.board(),
          turn: g.turn(),
          castling: {},
          enPassant: null,
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
        const increment = getIncrement();
        if (!increment || !clockEnabled || game.game_over()) return;
        const prevTurn = game.turn() === 'w' ? 'b' : 'w';
        clock[prevTurn] += increment;
        updateClockDisplay();
      }

      function initClock(start = false) {
        clearInterval(clockTimer);
        const initial = getInitialTime();
        clockEnabled = initial > 0;
        clock = { w: initial, b: initial };

        if (start && initial > 0) {
          clockTimer = setInterval(() => {
            if (game.game_over()) return;
            const turn = game.turn();
            clock[turn]--;
            if (clock[turn] <= 0) {
              clock[turn] = 0;
              clearInterval(clockTimer);
              const winner = turn === 'w' ? 'Negras' : 'Blancas';
              state.games++;
              const record = saveFinishedGame(`Tiempo agotado · Ganaron las ${winner}`);
              save();
              showAlert(`⏱️ Tiempo agotado. Ganaron las ${winner}.`);
              if (record) offerAnalysis(record.id);
            }
            updateClockDisplay();
          }, 1000);
        }
        updateClockDisplay();
      }

      function updateClockDisplay() {
        const w = document.getElementById("clock-w");
        const b = document.getElementById("clock-b");
        w.textContent = formatTime(clock.w);
        b.textContent = formatTime(clock.b);
        w.classList.toggle("active", game.turn() === "w" && !game.game_over());
        b.classList.toggle("active", game.turn() === "b" && !game.game_over());
      }


      let lastKnownLevel = null;

      // Etiqueta de nivel según el XP acumulado (mismos rangos que las
      // insignias de dificultad usadas en Lecciones/Ejercicios)

      function updateProfile() {
        const level = Math.floor(state.xp / 1000) + 1;
        const progress = state.xp % 1000;
        document.getElementById("mini-name").textContent = state.name || "Alumno";
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

      const soundToggle = document.getElementById("toggle-sound");
      if (soundToggle) {
        SoundFX.setEnabled(soundToggle.checked);
        soundToggle.addEventListener("change", () => {
          SoundFX.setEnabled(soundToggle.checked);
          if (soundToggle.checked) {
            SoundFX.unlock();
            SoundFX.select();
          }
        });
      }
      // Los navegadores requieren un gesto del usuario para habilitar audio
      document.body.addEventListener("pointerdown", () => SoundFX.unlock(), { once: true });

      // Activar/desactivar el resaltado de jugadas posibles (checkbox del
      // panel "Modo educativo" + botón rápido, disponible también en pantalla completa)
      const legalMovesCheckbox = document.getElementById("toggle-legal");
      const legalMovesBtn = document.getElementById("toggle-legal-btn");

      function syncLegalMovesUI() {
        if (legalMovesCheckbox) legalMovesCheckbox.checked = showLegalMoves;
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
      if (legalMovesBtn) {
        legalMovesBtn.addEventListener("click", () => setShowLegalMoves(!showLegalMoves));
      }
      syncLegalMovesUI();

      // Activar/desactivar el resaltado de piezas amenazadas (checkbox del
      // panel "Modo educativo")
      const threatsCheckbox = document.getElementById("toggle-threats");
      if (threatsCheckbox) {
        threatsCheckbox.checked = showThreats;
        threatsCheckbox.addEventListener("change", () => {
          showThreats = threatsCheckbox.checked;
          localStorage.setItem("chessShowThreats", showThreats ? "on" : "off");
          if (gameStarted) render();
          toast(showThreats ? "⚔️ Amenazas activadas" : "⚔️ Amenazas desactivadas");
        });
      }

      document.getElementById("new-game").onclick = () => {
        const modeValue = document.getElementById("mode").value;
        botEnabled = modeValue === "bot";
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
        if (!document.body.classList.contains("fullscreen-game")) return;
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
          const color = positions[i].turn; // quién mueve en esta jugada
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
          const turnAt = record.positions[i].turn;
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
        if (!pos || !pos.board) return;

        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const sq = document.createElement("div");
            sq.className = "square " + ((r + c) % 2 ? "dark" : "light");
            const p = pos.board[r][c];
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
          const turnAt = pos.turn;
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
      let explainMode = localStorage.getItem("chessExplainMode") !== "off";
      const explainToggleEl = document.getElementById("toggle-explain");
      const EDU_DEFAULT_TITLE = "Pensá antes de mover";
      const EDU_DEFAULT_TEXT = "Antes de jugar, preguntate: ¿qué amenaza mi rival?";

      function resetEduPanel() {
        const titleEl = document.getElementById("edu-title");
        const textEl = document.getElementById("edu-text");
        if (titleEl) titleEl.textContent = EDU_DEFAULT_TITLE;
        if (textEl) textEl.textContent = EDU_DEFAULT_TEXT;
      }

      if (explainToggleEl) {
        explainToggleEl.checked = explainMode;
        explainToggleEl.onchange = () => {
          explainMode = explainToggleEl.checked;
          localStorage.setItem("chessExplainMode", explainMode ? "on" : "off");
          if (!explainMode) resetEduPanel();
          toast(explainMode ? "📚 Explicaciones activadas" : "📚 Explicaciones desactivadas");
        };
      }

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

        function onSquareClick(sqName) {
          if (ctx.solvedOrFailed) return;
          const piece = ctx.chess.get(sqName);
          if (ctx.selected === sqName) {
            ctx.selected = null;
            draw();
            return;
          }
          if (ctx.selected) {
            const from = ctx.selected;
            const attempt = { from, to: sqName, promotion: "q" };
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
      let tournamentUnsub = null;
      let tournamentBusy = false;
      let lastTournamentState = null;
      let currentUser = null; // { email, displayName } una vez logueado con Google

      // Única cuenta habilitada para administrar el torneo. Se ignora
      // cualquier lista de administradores guardada en Firestore: sin
      // importar qué diga meta.adminEmails, solo esta cuenta puede crear,
      // configurar o reiniciar el torneo.
      const TOURNAMENT_ADMIN_EMAIL = "ipem146centenario@gmail.com";
      let authListenerAttached = false;

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
      // muestra en su consola (claves sin comillas), pegado tal cual.
      function parseFirebaseConfigInput(text) {
        const trimmed = text.trim();
        if (!trimmed) throw new Error("Pegá la configuración de Firebase");
        const match = trimmed.match(/\{[\s\S]*\}/);
        const objText = match ? match[0] : trimmed;
        try {
          return JSON.parse(objText);
        } catch (err) {
          // No es JSON estricto (claves sin comillas, comentarios, etc.):
          // lo evaluamos como literal de objeto de JS.
          // eslint-disable-next-line no-new-func
          return Function('"use strict"; return (' + objText + ");")();
        }
      }

      function normalizeTournamentState(data) {
        if (!data) {
          return { meta: { name: "", round: 0, status: "setup", adminEmails: [], totalRounds: null }, players: [], pairings: [], games: [] };
        }
        return {
          meta: Object.assign({ name: "", round: 0, status: "setup", adminEmails: [], totalRounds: null }, data.meta || {}),
          players: data.players || [],
          pairings: data.pairings || [],
          games: data.games || [],
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
        document.getElementById("tournament-auth-box").style.display = "";
        if (!authListenerAttached) {
          authListenerAttached = true;
          firebase.auth().onAuthStateChanged((user) => {
            currentUser = user ? { email: (user.email || "").toLowerCase(), displayName: user.displayName || user.email } : null;
            updateAuthUI();
            renderTournamentState(lastTournamentState);
          });
        }
        subscribeTournament();
      }

      function updateAuthUI() {
        const statusEl = document.getElementById("tournament-auth-status");
        const signinBtn = document.getElementById("tournament-google-signin-btn");
        const signoutBtn = document.getElementById("tournament-signout-btn");
        if (currentUser) {
          statusEl.textContent = `Conectado como ${currentUser.displayName} (${currentUser.email})`;
          signinBtn.style.display = "none";
          signoutBtn.style.display = "";
        } else {
          statusEl.textContent = "Iniciá sesión con tu cuenta de Gmail para jugar o administrar el torneo.";
          signinBtn.style.display = "";
          signoutBtn.style.display = "none";
        }
        updateModeBadge();
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
        const text = admin ? "🛠️ Modo Administrador" : "👤 Modo Jugador";
        badges.forEach((b) => {
          if (!b) return;
          b.textContent = text;
          b.style.display = "";
        });
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
            const state = normalizeTournamentState(snap.exists ? snap.data() : null);
            lastTournamentState = state;
            renderTournamentState(state);
            handleLiveMatchUpdate(state);
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
        if (result === "1-0") white.points += 1 * sign;
        else if (result === "0-1") black.points += 1 * sign;
        else if (result === "1/2-1/2") {
          white.points += 0.5 * sign;
          black.points += 0.5 * sign;
        }
      }

      async function fbCreateTournament(name, playerEntries, totalRounds, adminEmails, timeControl) {
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
          }));
        const rounds = Number(totalRounds);
        const tc = timeControl || { minutes: 0, increment: 0 };
        await fbRoomRef.set({
          meta: {
            name: name || "Torneo",
            round: 0,
            status: "active",
            totalRounds: rounds > 0 ? rounds : null,
            adminEmails: [TOURNAMENT_ADMIN_EMAIL],
            timeControlMinutes: tc.minutes > 0 ? tc.minutes : 0,
            timeControlIncrement: tc.increment > 0 ? tc.increment : 0,
          },
          players,
          pairings: [],
          games: [],
        });
        return getTournamentStateOnce();
      }

      // Empareja jugadores estilo suizo simplificado: ordena por puntaje
      // (con desempate fijo por id), y empareja de a pares evitando repetir
      // rivales cuando es posible. Si sobra un jugador, recibe bye (+1 punto).
      // No toca la base de datos: solo calcula los datos de la ronda nueva a
      // partir del estado ya cargado en memoria. La usan tanto
      // fbGenerateRound (botón manual del administrador) como fbSubmitResult
      // (generación automática apenas se completa la última partida
      // pendiente de la ronda actual).
      function buildNextRoundPairings_(players, currentRound, timeControl) {
        const nextRound = currentRound + 1;

        let pool = players.slice().sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return a.id < b.id ? -1 : 1;
        });

        let byePlayer = null;
        if (pool.length % 2 === 1) {
          for (let i = pool.length - 1; i >= 0; i--) {
            if (pool[i].byes === 0) {
              byePlayer = pool[i];
              break;
            }
          }
          if (!byePlayer) byePlayer = pool[pool.length - 1];
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
        // partida arranca con ese tiempo para las dos partes, pero el
        // reloj NO empieza a correr al generarse la ronda: se queda
        // "pausado" (turnStartAt: null) hasta que los dos jugadores entren
        // a la partida y presionen "Jugar" (ver fbMarkPlayerReady). Así no
        // se les descuenta tiempo mientras todavía no llegaron a la
        // pantalla. whiteReady/blackReady registran quién ya entró.
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
            whiteReady: false,
            blackReady: false,
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

          const timeControl = {
            minutes: (data.meta && data.meta.timeControlMinutes) || 0,
            increment: (data.meta && data.meta.timeControlIncrement) || 0,
          };
          const { nextRound, newPairings, updatedPlayers, newGames } = buildNextRoundPairings_(players, currentRound, timeControl);

          tx.set(fbRoomRef, {
            meta: {
              name: data.meta.name,
              round: nextRound,
              status: "active",
              totalRounds: totalRounds || null,
              adminEmails: data.meta.adminEmails || [],
              timeControlMinutes: timeControl.minutes,
              timeControlIncrement: timeControl.increment,
            },
            players: updatedPlayers,
            pairings: pairingsAll.concat(newPairings),
            games: (data.games || []).concat(newGames),
          });
        });
        return getTournamentStateOnce();
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

          // Solo el administrador o alguno de los dos jugadores de esta
          // partida puede cargar/cambiar su resultado (evita que cualquier
          // usuario cargue resultados de partidas ajenas).
          const myEmail = currentUser ? currentUser.email : "";
          const isParticipant =
            myEmail && ((target.whiteEmail || "").toLowerCase() === myEmail || (target.blackEmail || "").toLowerCase() === myEmail);
          if (!isCurrentUserAdmin(lastTournamentState) && !isParticipant) {
            throw new Error("No tenés permiso para cargar el resultado de esta partida");
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

          // Si con este resultado ya quedaron cargadas todas las partidas de
          // la ronda actual, el torneo avanza solo: si ya se jugaron todas
          // las rondas configuradas se cierra (como antes), y si no, se
          // empareja y genera automáticamente la ronda siguiente en el
          // momento — sin esperar a que un administrador toque el botón
          // "Siguiente ronda". Esto pasa acá adentro (y no llamando a
          // fbGenerateRound aparte) porque fbGenerateRound exige ser
          // administrador, y quien complete la última partida puede ser
          // cualquiera de los dos jugadores.
          const meta = { ...data.meta };
          const totalRounds = meta.totalRounds;
          let finalPlayers = players;
          let finalPairings = pairings;
          let finalGames = data.games || [];

          if (meta.status === "active") {
            const roundPairings = pairings.filter((p) => p.round === meta.round);
            const allDone = roundPairings.every((p) => p.result);
            if (allDone) {
              if (totalRounds && meta.round >= totalRounds) {
                meta.status = "finished";
              } else {
                const timeControl = {
                  minutes: meta.timeControlMinutes || 0,
                  increment: meta.timeControlIncrement || 0,
                };
                const generated = buildNextRoundPairings_(players, meta.round, timeControl);
                meta.round = generated.nextRound;
                finalPlayers = generated.updatedPlayers;
                finalPairings = pairings.concat(generated.newPairings);
                finalGames = finalGames.concat(generated.newGames);
              }
            }
          }

          tx.update(fbRoomRef, { players: finalPlayers, pairings: finalPairings, games: finalGames, meta });
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
      async function fbUpdateSettings(name, totalRounds, adminEmails, timeControl) {
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
            },
          });
        });
        return getTournamentStateOnce();
      }

      async function fbMakeMove(round, board, fen, lastMoveSan, gameOverResult, lastFrom, lastTo) {
        round = Number(round);
        board = Number(board);
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) throw new Error("Todavía no creaste un torneo");
          const data = snap.data();
          const games = (data.games || []).map((g) => ({ ...g }));
          const g = games.find((x) => x.round === round && x.board === board);
          if (!g) throw new Error("No se encontró esa partida");
          if (g.status === "finished") throw new Error("Esa partida ya terminó");

          // Si la partida tiene reloj y esto es una jugada real (cambió el
          // FEN), le descontamos a quien acaba de mover el tiempo que pasó
          // desde su último turno, y le sumamos el incremento si corresponde
          // (resignación/tablas/abandono por tiempo no mueven pieza, así que
          // no tocan el reloj acá).
          if (g.clock && g.turnStartAt && fen !== g.fen) {
            const moverColor = new Chess(g.fen).turn();
            const elapsed = Math.max(0, Math.round((Date.now() - (g.turnStartAt || Date.now())) / 1000));
            g.clock = { ...g.clock, [moverColor]: Math.max(0, g.clock[moverColor] - elapsed) };
            if (!gameOverResult && g.increment) {
              g.clock = { ...g.clock, [moverColor]: g.clock[moverColor] + g.increment };
            }
            g.turnStartAt = Date.now();
          }

          g.fen = fen;
          g.lastMoveSan = lastMoveSan || "";
          // Guardamos también origen/destino de la jugada para que el rival
          // pueda ver por unos segundos por dónde se movió la pieza (ver
          // handleLiveMatchUpdate). Si no vienen (p. ej. al rendirse o
          // acordar tablas sin mover), dejamos lo que ya había guardado.
          if (lastFrom) g.lastFrom = lastFrom;
          if (lastTo) g.lastTo = lastTo;
          if (gameOverResult) g.status = "finished";
          tx.update(fbRoomRef, { games });
        });
        if (gameOverResult) {
          return fbSubmitResult(round, board, gameOverResult);
        }
        return getTournamentStateOnce();
      }

      // Marca que el jugador de "myColor" ya entró a la partida (presionó
      // "Jugar"). El reloj de esa partida (si el torneo tiene tiempo
      // configurado) recién arranca a correr —turnStartAt pasa de null a
      // Date.now()— cuando quedan marcados como listos TANTO blancas como
      // negras. Si alguno de los dos todavía no entró, el reloj sigue
      // "pausado" mostrando el tiempo completo (ver updateTournamentClockDisplay).
      async function fbMarkPlayerReady(round, board, myColor) {
        if (!myColor) return; // espectador/admin mirando: no cuenta como jugador
        round = Number(round);
        board = Number(board);
        await fbDb.runTransaction(async (tx) => {
          const snap = await tx.get(fbRoomRef);
          if (!snap.exists) return;
          const data = snap.data();
          const games = (data.games || []).map((g) => ({ ...g }));
          const g = games.find((x) => x.round === round && x.board === board);
          if (!g || g.status === "finished") return;
          if (myColor === "w") g.whiteReady = true;
          if (myColor === "b") g.blackReady = true;
          if (g.clock && !g.turnStartAt && g.whiteReady && g.blackReady) {
            g.turnStartAt = Date.now();
          }
          tx.update(fbRoomRef, { games });
        });
      }

      async function fbResetAll() {
        assertAdmin();
        await fbRoomRef.set({ meta: { name: "", round: 0, status: "setup", adminEmails: [], totalRounds: null }, players: [], pairings: [], games: [] });
        return getTournamentStateOnce();
      }

      function resultLabel(result) {
        if (result === "1-0") return "1 - 0";
        if (result === "0-1") return "0 - 1";
        if (result === "1/2-1/2") return "½ - ½";
        return "";
      }

      // Ordena jugadores por puntos y, en caso de empate, por Buchholz
      // (suma de los puntos de todos los rivales que enfrentó cada uno).
      function rankPlayers_(players, pairings) {
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
          if (pr.result === "1-0") {
            record[pr.whiteId].w += 1;
            record[pr.blackId].l += 1;
          } else if (pr.result === "0-1") {
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

      function renderTournamentState(state) {
        const setupBox = document.getElementById("tournament-setup-box");
        const activeBox = document.getElementById("tournament-active-box");

        updateModeBadge();

        if (!currentUser) {
          setupBox.style.display = "none";
          activeBox.style.display = "none";
          return;
        }

        if (!state || (state.meta.status !== "active" && state.meta.status !== "finished")) {
          setupBox.style.display = isCurrentUserAdmin(state) ? "" : "none";
          activeBox.style.display = "none";
          return;
        }

        setupBox.style.display = "none";
        activeBox.style.display = "";

        const isAdmin = isCurrentUserAdmin(state);
        const isFinished = state.meta.status === "finished";
        const roundsNote = state.meta.totalRounds ? ` de ${state.meta.totalRounds}` : "";

        document.getElementById("tournament-title-display").textContent = "🏆 " + state.meta.name;
        document.getElementById("tournament-round-display").textContent = isFinished
          ? `Torneo finalizado — ronda ${state.meta.round}${roundsNote} — ${state.players.length} jugadores`
          : `Ronda ${state.meta.round}${roundsNote} — ${state.players.length} jugadores`;

        document.getElementById("tournament-admin-controls").style.display = isAdmin ? "flex" : "none";
        document.getElementById("tournament-next-round-btn").style.display = isFinished ? "none" : "";
        document.getElementById("tournament-finish-btn").style.display = isFinished ? "none" : "";
        document.getElementById("tournament-reopen-btn").style.display = isFinished ? "" : "none";
        if (!isAdmin) document.getElementById("tournament-settings-panel").style.display = "none";

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
        const currentRoundPairings = state.pairings.filter((p) => p.round === state.meta.round);
        const listEl = document.getElementById("tournament-pairings-list");
        listEl.innerHTML = "";
        currentRoundPairings
          .sort((a, b) => a.board - b.board)
          .forEach((p) => {
            const row = document.createElement("div");
            row.className = "pairing-row";
            if (p.blackId === "") {
              row.innerHTML = `
                <div class="pairing-board">#${p.board}</div>
                <div class="pairing-names">${p.whiteName}</div>
                <div class="pairing-bye">Descansa esta ronda (bye, +1 punto)</div>
              `;
              listEl.appendChild(row);
              return;
            }
            const game = (state.games || []).find((g) => g.round === p.round && g.board === p.board);
            const gameStatusText = !game
              ? ""
              : game.status === "finished"
              ? "Partida terminada"
              : game.lastMoveSan
              ? "En juego · última jugada: " + game.lastMoveSan
              : "Sin empezar";
            const isMyGame =
              (p.whiteEmail && p.whiteEmail.toLowerCase() === myEmail) || (p.blackEmail && p.blackEmail.toLowerCase() === myEmail);
            const canPlay = isAdmin || isMyGame;
            const opts = [
              ["1-0", "1-0"],
              ["1/2-1/2", "½-½"],
              ["0-1", "0-1"],
            ];
            const btnsHtml = isAdmin
              ? opts
                  .map(
                    ([val, label]) =>
                      `<button data-round="${p.round}" data-board="${p.board}" data-result="${val}" class="${p.result === val ? "selected" : ""}">${label}</button>`
                  )
                  .join("")
              : p.result
              ? `<span class="muted">${resultLabel(p.result)}</span>`
              : "";
            const playBtnHtml = canPlay
              ? `<button class="btn" data-play-round="${p.round}" data-play-board="${p.board}" data-white="${p.whiteName}" data-black="${p.blackName}" data-white-email="${p.whiteEmail || ""}" data-black-email="${p.blackEmail || ""}">▶️ Jugar</button>`
              : "";
            row.innerHTML = `
              <div class="pairing-board">#${p.board}</div>
              <div class="pairing-names">${p.whiteName}<span class="vs">vs</span>${p.blackName}
                <div class="mini-diagram-caption" style="margin:2px 0 0;text-align:left">${gameStatusText}</div>
              </div>
              ${playBtnHtml}
              <div class="pairing-result-btns">${btnsHtml}</div>
            `;
            listEl.appendChild(row);
          });

        listEl.querySelectorAll("button[data-play-round]").forEach((btn) => {
          btn.addEventListener("click", () => {
            enterTournamentMatch(
              Number(btn.dataset.playRound),
              Number(btn.dataset.playBoard),
              btn.dataset.white,
              btn.dataset.black,
              btn.dataset.whiteEmail,
              btn.dataset.blackEmail
            );
          });
        });

        listEl.querySelectorAll("button[data-result]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            if (tournamentBusy) return;
            tournamentBusy = true;
            try {
              assertAdmin();
              const prevRound = state.meta.round;
              const newState = await fbSubmitResult(btn.dataset.round, btn.dataset.board, btn.dataset.result);
              if (newState.meta.round > prevRound) {
                toast("🆕 Se generó automáticamente la ronda " + newState.meta.round);
              }
            } catch (err) {
              toast("❌ No se pudo cargar el resultado: " + err.message);
            } finally {
              tournamentBusy = false;
            }
          });
        });

        const standingsEl = document.getElementById("tournament-standings-list");
        const ranked2 = rankPlayers_(state.players, state.pairings);
        let rows = ranked2
          .map(
            (p, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${p.name}</td>
              <td>${p.points}</td>
              <td>${p._buchholz}</td>
              <td>${p._record.w}-${p._record.d}-${p._record.l}</td>
              <td>${p.played.length}</td>
            </tr>`
          )
          .join("");
        standingsEl.innerHTML = `
          <table class="standings-table">
            <thead><tr><th>#</th><th>Jugador</th><th>Puntos</th><th>Buchholz</th><th>V-E-D</th><th>Partidas</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p class="muted" style="font-size: 12px; margin-top: 8px">
            Buchholz = suma de puntos de los rivales que enfrentó cada jugador (desempate). V-E-D = victorias-empates-derrotas (el bye cuenta como victoria).
          </p>
        `;
      }

      async function refreshTournament() {
        if (!fbRoomRef) return;
        try {
          const state = await getTournamentStateOnce();
          lastTournamentState = state;
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
        } else {
          return { text: "🏁 Partida de torneo terminada.", variant: null };
        }
        return { text: headline + "\n\n" + detail, variant };
      }

      function showTournamentResult(result, reason) {
        const msg = tournamentResultMessage(result, reason);
        showAlert(msg.text, msg.variant);
      }

      function tournamentMyColor() {
        if (!tournamentMatchCtx || !currentUser) return "";
        const email = currentUser.email;
        if (tournamentMatchCtx.whiteEmail && tournamentMatchCtx.whiteEmail.toLowerCase() === email) return "w";
        if (tournamentMatchCtx.blackEmail && tournamentMatchCtx.blackEmail.toLowerCase() === email) return "b";
        return "";
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
            const pairing = (lastTournamentState && lastTournamentState.pairings || []).find(
              (p) => p.round === gameRow.round && p.board === gameRow.board
            );
            showTournamentResult(pairing ? pairing.result : "");
          }
          return;
        }
        // Si hay reloj configurado y todavía no arrancó (falta que alguno
        // de los dos jugadores entre a la partida y presione "Jugar"), se
        // avisa en vez de mostrar el turno normal.
        if (gameRow && gameRow.clock && !gameRow.turnStartAt) {
          const rivalReady = myColor === "w" ? gameRow.blackReady : myColor === "b" ? gameRow.whiteReady : gameRow.whiteReady && gameRow.blackReady;
          statusEl.textContent = !myColor
            ? "⏳ Esperando a que ambos jugadores entren a la partida..."
            : rivalReady
            ? "✅ Tu rival ya está. ¡El reloj arranca ahora!"
            : "⏳ Esperando a que tu rival presione Jugar...";
          return;
        }
        const turn = game.turn();
        const turnName = turn === "w" ? tournamentMatchCtx.whiteName : tournamentMatchCtx.blackName;
        statusEl.textContent = !myColor
          ? `Turno de ${turnName}.`
          : myColor === turn
          ? `¡Tu turno! Jugás con ${myColor === "w" ? "blancas" : "negras"}.`
          : `Turno de ${turnName}. Esperando la jugada...`;
      }

      // Se llama automáticamente cada vez que llega una actualización en
      // tiempo real desde Firestore mientras hay una partida de torneo
      // abierta en el tablero grande (reemplaza el sondeo periódico).
      function handleLiveMatchUpdate(state) {
        if (!tournamentMatchActive || !tournamentMatchCtx) return;
        const gameRow = (state.games || []).find(
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
        const turn = game.turn();
        const finished = gameRow.status === "finished";
        const elapsed = finished ? 0 : Math.max(0, Math.round((Date.now() - (gameRow.turnStartAt || Date.now())) / 1000));
        const remaining = {
          w: gameRow.clock.w - (turn === "w" && !finished ? elapsed : 0),
          b: gameRow.clock.b - (turn === "b" && !finished ? elapsed : 0),
        };
        const wSecs = Math.max(0, remaining.w);
        const bSecs = Math.max(0, remaining.b);
        wEl.textContent = formatTime(wSecs);
        bEl.textContent = formatTime(bSecs);
        wEl.classList.toggle("active", turn === "w" && !finished);
        bEl.classList.toggle("active", turn === "b" && !finished);

        if (!finished && ((turn === "w" && remaining.w <= 0) || (turn === "b" && remaining.b <= 0))) {
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
            result
          );
          const gameRow = (state.games || []).find(
            (g) => g.round === tournamentMatchCtx.round && g.board === tournamentMatchCtx.board
          );
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
        try {
          const state = lastTournamentState || (await getTournamentStateOnce());
          const gameRow = (state.games || []).find((g) => g.round === round && g.board === board);
          if (!gameRow) {
            toast("❌ No se encontró esa partida");
            return;
          }

          tournamentMatchCtx = { round, board, whiteName, blackName, whiteEmail: whiteEmail || "", blackEmail: blackEmail || "" };
          tournamentMatchActive = true;
          clearOpponentMoveHighlight();

          botEnabled = false;
          gameStarted = true;
          game.load(gameRow.fen);
          selected = null;
          validMoves = [];
          tournamentResultShown = false;

          showPage("jugar");

          document.getElementById("tournament-match-bar").style.display = "";
          document.getElementById("tournament-match-title").textContent =
            `🏆 Torneo · Ronda ${round}, tablero #${board}: ${whiteName} vs ${blackName}`;
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
          }

          render();
          updateTournamentMatchBar(gameRow);
          requestAnimationFrame(sizeFullscreenBoard);

          if (myColor && gameRow.status !== "finished") {
            fbMarkPlayerReady(round, board, myColor).catch(() => {});
          }
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

        document.getElementById("tournament-match-bar").style.display = "none";
        ["new-game", "undo", "resign", "copy-game"].forEach((id) => {
          const el = document.getElementById(id);
          if (el) el.style.display = "";
        });
        const clockEl = document.querySelector("#page-jugar .clock");
        if (clockEl) clockEl.style.display = "";

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
            lastVerboseMove ? lastVerboseMove.to : ""
          );
          const gameRow = (state.games || []).find(
            (g) => g.round === tournamentMatchCtx.round && g.board === tournamentMatchCtx.board
          );
          if (gameRow) tournamentCurrentGameRow = gameRow;
          if (gameOverResult && !tournamentResultShown) {
            // Se conoce el resultado exacto ya mismo (no hace falta esperar
            // a que llegue el próximo snapshot de Firestore), así que se
            // muestra el popup de una: funciona también a pantalla completa.
            tournamentResultShown = true;
            showTournamentResult(gameOverResult);
          }
          if (gameOverResult && state.meta.round > tournamentMatchCtx.round) {
            toast("🆕 Se generó automáticamente la ronda " + state.meta.round);
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
          const gameRow = (state.games || []).find(
            (g) => g.round === tournamentMatchCtx.round && g.board === tournamentMatchCtx.board
          );
          if (!tournamentResultShown) {
            tournamentResultShown = true;
            showTournamentResult(myColor === "w" ? "0-1" : "1-0");
          }
          updateTournamentMatchBar(gameRow);
          toast(
            state.meta.round > tournamentMatchCtx.round
              ? "🏳️ Te rendiste. Resultado cargado. 🆕 Se generó la ronda " + state.meta.round
              : "🏳️ Te rendiste. Resultado cargado."
          );
        } catch (err) {
          toast("❌ " + err.message);
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
          const gameRow = (state.games || []).find(
            (g) => g.round === tournamentMatchCtx.round && g.board === tournamentMatchCtx.board
          );
          if (!tournamentResultShown) {
            tournamentResultShown = true;
            showTournamentResult("1/2-1/2");
          }
          updateTournamentMatchBar(gameRow);
          toast(
            state.meta.round > tournamentMatchCtx.round
              ? "🤝 Tablas cargadas. 🆕 Se generó la ronda " + state.meta.round
              : "🤝 Tablas cargadas."
          );
        } catch (err) {
          toast("❌ " + err.message);
        } finally {
          tournamentMatchBusy = false;
        }
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

      document.getElementById("tournament-signout-btn").addEventListener("click", async () => {
        try {
          await firebase.auth().signOut();
        } catch (err) {
          toast("❌ " + err.message);
        }
      });

      document.getElementById("tournament-create-btn").addEventListener("click", async () => {
        const name = document.getElementById("tournament-name-input").value.trim() || "Torneo";
        const playerEntries = parsePlayersInput(document.getElementById("tournament-players-input").value);
        const totalRounds = document.getElementById("tournament-rounds-input").value.trim();
        if (playerEntries.length < 2) {
          toast("❌ Cargá al menos 2 jugadores");
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
        try {
          await fbCreateTournament(name, playerEntries, totalRounds, undefined, timeControl);
          await fbGenerateRound();
        } catch (err) {
          toast("❌ No se pudo crear el torneo: " + err.message);
        }
      });

      document.getElementById("tournament-next-round-btn").addEventListener("click", async () => {
        try {
          await fbGenerateRound();
        } catch (err) {
          toast("❌ " + err.message);
        }
      });

      document.getElementById("tournament-finish-btn").addEventListener("click", async () => {
        if (!confirm("¿Cerrar el torneo ahora y declarar campeón según la tabla actual?")) return;
        try {
          await fbFinishTournament();
        } catch (err) {
          toast("❌ " + err.message);
        }
      });

      document.getElementById("tournament-reopen-btn").addEventListener("click", async () => {
        try {
          await fbReopenTournament();
        } catch (err) {
          toast("❌ " + err.message);
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
          await fbUpdateSettings(name, totalRounds, [TOURNAMENT_ADMIN_EMAIL], timeControl);
          document.getElementById("tournament-settings-panel").style.display = "none";
          toast("✓ Configuración guardada");
        } catch (err) {
          toast("❌ " + err.message);
        }
      });

      document.getElementById("tournament-reset-btn").addEventListener("click", async () => {
        if (!confirm("¿Seguro que querés borrar todo el torneo actual? No se puede deshacer.")) return;
        try {
          await fbResetAll();
        } catch (err) {
          toast("❌ " + err.message);
        }
      });

      document.getElementById("tournament-refresh-btn").addEventListener("click", refreshTournament);

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
