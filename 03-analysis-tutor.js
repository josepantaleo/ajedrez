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
