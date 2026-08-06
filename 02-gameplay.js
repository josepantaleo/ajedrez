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
    if (tournamentMatchActive && game.turn() !== tournamentMyColor()) return;
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
  }
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
      updateSelectionHighlights());
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
  const o = a[1];
  return "8" === o || "1" === o;
}
function askPromotion(e) {
  return new Promise((t) => {
    const a = document.getElementById("promo"),
      n = document.getElementById("promo-box");
    if (!a || !n) return void t("q");
    n.innerHTML = "";
    const o = document.createElement("div");
    ((o.className = "promo-title"),
      (o.textContent = "Elegí la pieza para coronar"),
      n.appendChild(o),
      [
        { code: "q", label: "Dama" },
        { code: "r", label: "Torre" },
        { code: "b", label: "Alfil" },
        { code: "n", label: "Caballo" },
      ].forEach((o) => {
        const r = document.createElement("button");
        ((r.type = "button"),
          (r.textContent = PIECES[e + o.code.toUpperCase()]),
          r.setAttribute("aria-label", o.label),
          (r.title = o.label),
          r.addEventListener(
            "click",
            () => {
              (a.classList.remove("show"), t(o.code));
            },
            { once: !0 },
          ),
          n.appendChild(r));
      }),
      a.classList.add("show"));
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
    (document
      .querySelectorAll(".square.drop-target")
      .forEach((e) => e.classList.remove("drop-target")),
    document
      .querySelectorAll(".square.drag-origin")
      .forEach((e) => e.classList.remove("drag-origin")),
    o && validMoves.includes(o))
  ) {
    let e = "q";
    isPromotionMove(game, t.from, o) &&
      (render(), (e = await askPromotion(game.turn())));
    const a = game.fen(),
      n = game.move({ from: t.from, to: o, promotion: e });
    if (n) {
      if (
        (addIncrement(),
        (selected = null),
        (validMoves = []),
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
    o && o !== t.from && SoundFX.invalid(),
    render());
}
async function clickSquare(e) {
  if (Date.now() < justDraggedUntil) return;
  if (!gameStarted || game.game_over() || botThinking) return;
  if (botEnabled && game.turn() === botColor) return;
  if (tournamentMatchActive && game.turn() !== tournamentMyColor()) return;
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
      void updateSelectionHighlights()
    );
  if (selected) {
    const t = selected;
    let a = "q";
    isPromotionMove(game, t, e) && (a = await askPromotion(game.turn()));
    const n = game.fen(),
      o = game.move({ from: t, to: e, promotion: a });
    if (o)
      return (
        addIncrement(),
        (selected = null),
        (validMoves = []),
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
  updateSelectionHighlights();
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
    s = getComputedStyle(a),
    l = parseFloat(s.rowGap || s.gap || "12") || 12,
    i = (parseFloat(s.paddingTop) || 0) + (parseFloat(s.paddingBottom) || 0),
    c = (parseFloat(s.paddingLeft) || 0) + (parseFloat(s.paddingRight) || 0),
    d = window.visualViewport ? window.visualViewport.width : window.innerWidth,
    u = window.visualViewport
      ? window.visualViewport.height
      : window.innerHeight,
    m = a.getBoundingClientRect(),
    p = n ? n.getBoundingClientRect().height : 0,
    g = o ? o.getBoundingClientRect().height : 0,
    f = r && null !== r.offsetParent ? r.getBoundingClientRect().height : 0,
    h = (m.height || u) - p - g - f - 2 * l - i,
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
    floatingMovesCard.classList.toggle("collapsed");
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
        r = document.getElementById("tournament-match-bar");
      (n && e.observe(n), o && e.observe(o), r && e.observe(r));
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
