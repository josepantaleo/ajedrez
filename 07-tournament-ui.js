/* Tournament timers, rendering, public screen, and result UI. Generated from the verified legacy bundle. */
let tournamentAutoApproveTimer = null;
let tournamentResultReturnTimer_ = null;
function stopAutoApproveTimer() {
  (clearInterval(tournamentAutoApproveTimer),
    (tournamentAutoApproveTimer = null));
}
function clearTournamentResultReturnTimer_() {
  (clearTimeout(tournamentResultReturnTimer_),
    (tournamentResultReturnTimer_ = null));
}
let tournamentWOGraceTimer = null,
  alertedDoubleNoShowBoards_ = new Set();
let tournamentJoinReminderTimer_ = null,
  tournamentJoinReminderSent_ = new Set();
let tournamentRoundCompleteNoticeKey_ = "";
let tournamentWOAutoFailureCount_ = 0;
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
      isCurrentUserAdmin(e) &&
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
      tournamentWOAutoFailureCount_ = 0;
      e &&
        e.length > 0 &&
        e.forEach((e) => {
          toast(
            `⏱️ WO automático — mesa #${e.board}: gana ${e.winner} (${e.absent} no se presentó a tiempo)`,
          );
        });
    } catch (e) {
      (console.error("[WO automático] Falló la verificación:", e),
        (tournamentWOAutoFailureCount_ += 1),
        2 === tournamentWOAutoFailureCount_ &&
          toast(
            "⚠️ No se pudieron verificar W.O. automáticos. Revisá la conexión con Firebase.",
            7e3,
          ));
    }
    try {
      lastTournamentState && checkDoubleNoShowBoards_(lastTournamentState);
    } catch (e) {}
    lastTournamentState && renderTournamentState(lastTournamentState);
  };
  (a(), (tournamentWOGraceTimer = setInterval(a, 15e3)));
}
function renderApprovalPanel(e, t, a) {
  const n = document.getElementById("tournament-approval-panel"),
    o = document.getElementById("tournament-approval-status"),
    r = document.getElementById("tournament-approval-admin-controls"),
    s = document.getElementById("tournament-auto-approve-box"),
    l = isCurrentUserOfficial(e),
    i = "closed" === e.meta.roundStatus;
  if (!a) {
    ((n.style.display = "none"), stopAutoApproveTimer());
    const e = document.getElementById("tournament-referee-round-controls");
    return void (e && (e.style.display = "none"));
  }
  ((n.style.display = ""),
    (r.style.display = t && !i ? "" : "none"),
    (o.textContent = i
      ? "La ronda está cerrada y los resultados quedaron bloqueados. La publicación de la siguiente ronda sigue disponible para administración o arbitraje."
      : t
            ? "Ya están cargados todos los resultados de esta ronda. Revisá la tabla de posiciones y los resultados abajo; el administrador puede aprobarla."
            : "Ya terminaron todas las partidas de esta ronda. Falta que el administrador la revise y apruebe para generar la ronda siguiente."));
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
function promptTournamentDecisionReason_(e) {
  const t = prompt(
    `${e}\n\nIngresá el motivo obligatorio (máximo 300 caracteres):`,
  );
  if (null === t) return null;
  try {
    return requireTournamentDecisionReason_(t, e.toLowerCase());
  } catch (e) {
    return (showError(e), null);
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
              if ("1" !== e.dataset.isAdmin)
                throw new Error("No tenés permiso para cargar resultados");
              const t = n.dataset.result;
              let r = "";
              if (
                ["wo-black", "wo-white", "double-wo"].includes(t) &&
                !confirm(
                  "double-wo" === t
                    ? "¿Confirmás declarar Doble W.O.? Ningún jugador recibirá puntos."
                    : "¿Confirmás declarar esta partida como W.O. (incomparecencia)?",
                )
              )
                return void (tournamentBusy = !1);
              if (["wo-black", "wo-white", "double-wo"].includes(t)) {
                r = promptTournamentDecisionReason_("Motivo del W.O.");
                if (null === r) return;
              }
              const a =
                  lastTournamentState &&
                  "pending_approval" === lastTournamentState.meta.roundStatus,
                o = await fbSubmitResult(
                  n.dataset.round,
                  n.dataset.board,
                  t,
                  r,
                );
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
              const e = "suspend" === o.dataset.suspendAction,
                t = e
                  ? promptTournamentDecisionReason_("Motivo de la suspensión")
                  : "";
              if (e && null === t) return;
              (await fbSetGameSuspended(
                o.dataset.suspendRound,
                o.dataset.suspendBoard,
                e,
                t,
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
  );
  t.textContent = `${a.length} administrador${1 === a.length ? "" : "es"} con acceso completo`;
}
function formatTournamentDiagnosticTime_(e) {
  if (!e) return "Aun sin datos";
  const t = Date.now() - e;
  if (t >= 0 && t < 6e4) return `Hace ${Math.max(1, Math.round(t / 1e3))} s`;
  if (t >= 0 && t < 36e5) return `Hace ${Math.round(t / 6e4)} min`;
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(e));
}
function tournamentRoundStatusLabel_(e) {
  return {
    playing: "En juego",
    pending_approval: "Pendiente de aprobacion",
    closed: "Cerrada",
  }[e] || "Sin ronda activa";
}
function renderTournamentDiagnostics_(e) {
  const t = document.getElementById("tournament-diagnostics-panel");
  if (!t) return;
  const a = isCurrentUserAdmin(e),
    o = !!currentUser && a;
  if (!o) return void (t.style.display = "none");
  t.style.display = "";
  const r = document.getElementById("tournament-diagnostics-round"),
    s = document.getElementById("tournament-diagnostics-round-status"),
    l = document.getElementById("tournament-diagnostics-account"),
    i = document.getElementById("tournament-diagnostics-role"),
    c = document.getElementById("tournament-diagnostics-room-sync"),
    d = document.getElementById("tournament-diagnostics-games-sync"),
    u = document.getElementById("tournament-diagnostics-connection"),
    m = document.getElementById("tournament-diagnostics-detail"),
    g = Math.max(
      tournamentLastRoomSnapshotAt_ || 0,
      tournamentLastGamesSnapshotAt_ || 0,
    ),
    f =
      tournamentLastFirebaseErrorAt_ > g
        ? tournamentLastFirebaseError_
        : "";
  (r && (r.textContent = e && e.meta ? String(e.meta.round || 0) : "-"),
    s &&
      (s.textContent =
        e && e.meta
          ? `${e.meta.status === "finished" ? "Torneo finalizado · " : ""}${tournamentRoundStatusLabel_(e.meta.roundStatus)}`
          : "Sin torneo activo"),
    l && (l.textContent = currentUser.email || "Cuenta sin email"),
    i && (i.textContent = a ? "Administrador" : "Sin permisos"),
    c &&
      (c.textContent = formatTournamentDiagnosticTime_(
        tournamentLastRoomSnapshotAt_,
      )),
    d &&
      (d.textContent = formatTournamentDiagnosticTime_(
        tournamentLastGamesSnapshotAt_,
      )));
  if (u) {
    const e = !navigator.onLine
        ? "offline"
        : f
          ? "error"
          : g
            ? "online"
            : "waiting",
      t =
        "offline" === e
          ? "Sin conexion"
          : "error" === e
            ? "Error de Firebase"
            : "online" === e
              ? "Firebase conectado"
              : "Esperando datos";
    ((u.dataset.state = e), (u.textContent = t));
  }
  m &&
    (m.textContent = f
      ? `Ultimo error: ${f}`
      : tournamentMatchActive && tournamentLastConfirmedSnapshotAt_
        ? `Partida actual: confirmada ${formatTournamentDiagnosticTime_(tournamentLastConfirmedSnapshotAt_)}${Number.isFinite(tournamentLastLatencyMs_) ? ` · latencia ${Math.max(0, Math.round(tournamentLastLatencyMs_))} ms` : ""}.`
        : g
          ? `Ultima sincronizacion recibida ${formatTournamentDiagnosticTime_(g)}.`
          : "Esperando la primera actualizacion de Firebase.");
}
function renderTournamentOfficialRoles_(e) {
  const t = document.getElementById("tournament-official-roles-panel"),
    a = document.getElementById("tournament-official-roles-summary");
  if (!t || !a) return;
  const n = isCurrentUserAdmin(e);
  if (!n) return void (t.style.display = "none");
  ((t.style.display = ""),
    (a.textContent =
      "Tu cuenta administra el torneo y puede ejecutar todas las decisiones oficiales: resultados, W.O., suspensiones, sanciones, rondas y configuración."));
}
function renderTournamentRoundCompleteNotice_(e) {
  const t = document.getElementById("tournament-round-complete-notice"),
    a = document.getElementById("tournament-round-complete-text");
  if (!t || !a) return;
  const n =
    e &&
    e.meta &&
    "active" === e.meta.status &&
    "pending_approval" === e.meta.roundStatus &&
    isCurrentUserOfficial(e);
  if (!n)
    return (
      (t.style.display = "none"),
      void (tournamentRoundCompleteNoticeKey_ = "")
    );
  const o = `${e.meta.name || "torneo"}:${e.meta.round}`,
    r =
      e.meta.totalRounds && e.meta.round >= e.meta.totalRounds
        ? `La ronda final ${e.meta.round} está lista para validar y cerrar el torneo.`
        : `La ronda ${e.meta.round} está completa. Revisá los resultados y aprobá la publicación de la siguiente ronda.`;
  ((t.style.display = "flex"),
    (a.textContent = r),
    tournamentRoundCompleteNoticeKey_ !== o &&
      ((tournamentRoundCompleteNoticeKey_ = o),
      SoundFX.announcement(),
      toast(`Atención: todas las mesas de la ronda ${e.meta.round} finalizaron.`, 7000)));
}
let tournamentOfficialTabsReady_ = !1,
  tournamentOfficialActiveTab_ = "admin",
  tournamentOfficialLastStatus_ = "";
function activateTournamentOfficialTab_(e, t) {
  if (!tournamentOfficialTabsReady_) setupTournamentOfficialTabs_();
  const a = document.getElementById("tournament-official-tabs");
  if (!a) return;
  const n = Array.from(
      a.querySelectorAll("[data-tournament-official-tab]"),
    ).filter((e) => !e.hidden),
    o = n.find((t) => t.dataset.tournamentOfficialTab === e) || n[0];
  if (!o) return;
  ((tournamentOfficialActiveTab_ = o.dataset.tournamentOfficialTab),
    n.forEach((e) => {
      const t = e === o;
      (e.setAttribute("aria-selected", t ? "true" : "false"),
        (e.tabIndex = t ? 0 : -1),
        e.classList.toggle("is-active", t));
    }),
    a.querySelectorAll("[data-tournament-official-panel]").forEach((e) => {
      e.hidden =
        e.dataset.tournamentOfficialPanel !== tournamentOfficialActiveTab_;
    }),
    t && o.focus());
}
function setupTournamentOfficialTabs_() {
  if (tournamentOfficialTabsReady_) return;
  const e = document.getElementById("tournament-audit-panel"),
    t = e && e.parentElement;
  if (!e || !t) return;
  const a = document.createElement("section");
  ((a.id = "tournament-official-tabs"),
    (a.className = "tournament-official-workspace"),
    (a.style.display = "none"),
    (a.innerHTML = `
      <div class="tournament-official-tabs-heading">
        <div>
          <h3>Gestión oficial</h3>
          <p class="muted">Administración integral y registro de decisiones del torneo.</p>
        </div>
        <div class="tournament-official-tablist" role="tablist" aria-label="Opciones de gestión oficial">
          <button
            class="tournament-official-tab"
            id="tournament-official-admin-tab"
            type="button"
            role="tab"
            aria-controls="tournament-official-admin-content"
            data-tournament-official-tab="admin"
          >Administrador</button>
          <button
            class="tournament-official-tab"
            id="tournament-official-audit-tab"
            type="button"
            role="tab"
            aria-controls="tournament-official-audit-content"
            data-tournament-official-tab="audit"
          >Auditoría <span class="tournament-official-tab-count" id="tournament-official-audit-tab-count">0</span></button>
        </div>
      </div>
      <div
        class="tournament-official-tab-content"
        id="tournament-official-admin-content"
        role="tabpanel"
        aria-labelledby="tournament-official-admin-tab"
        data-tournament-official-panel="admin"
      ></div>
      <div
        class="tournament-official-tab-content"
        id="tournament-official-audit-content"
        role="tabpanel"
        aria-labelledby="tournament-official-audit-tab"
        data-tournament-official-panel="audit"
        hidden
      ></div>
    `),
    t.insertBefore(a, e));
  const n = a.querySelector('[data-tournament-official-panel="admin"]'),
    s = a.querySelector('[data-tournament-official-panel="audit"]');
  [
    "tournament-admin-panel",
    "tournament-settings-panel",
    "tournament-roles-panel",
    "tournament-round-command-center",
    "tournament-announcement-composer",
    "tournament-round-countdown-composer",
    "tournament-approval-panel",
    "tournament-referee-panel",
    "tournament-players-card",
    "tournament-diagnostics-panel",
  ].forEach((e) => {
    const t = document.getElementById(e);
    t && n.appendChild(t);
  });
  const l = document.getElementById("tournament-audit-panel");
  l && s.appendChild(l);
  const r = Array.from(
    a.querySelectorAll("[data-tournament-official-tab]"),
  );
  (r.forEach((e) => {
    (e.addEventListener("click", () =>
      activateTournamentOfficialTab_(
        e.dataset.tournamentOfficialTab,
        !1,
      ),
    ),
      e.addEventListener("keydown", (e) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
          return;
        e.preventDefault();
        const t = r.filter((e) => !e.hidden);
        if (!t.length) return;
        const a = t.indexOf(e.currentTarget);
        let n =
          "Home" === e.key
            ? 0
            : "End" === e.key
              ? t.length - 1
              : (a + ("ArrowRight" === e.key ? 1 : -1) + t.length) %
                t.length;
        activateTournamentOfficialTab_(
          t[n].dataset.tournamentOfficialTab,
          !0,
        );
      }));
  }),
    (tournamentOfficialTabsReady_ = !0),
    activateTournamentOfficialTab_(tournamentOfficialActiveTab_, !1));
}
function renderTournamentOfficialTabs_(e) {
  setupTournamentOfficialTabs_();
  const t = document.getElementById("tournament-official-tabs"),
    a = document.getElementById("tournament-official-admin-tab"),
    l = document.getElementById("tournament-official-audit-tab"),
    o = isCurrentUserAdmin(e),
    s = Boolean(currentUser && o),
    i = e && e.meta ? e.meta.status || "" : "",
    c = "finished" === i && "finished" !== tournamentOfficialLastStatus_;
  if (!t || !a || !l) return;
  ((t.style.display = s ? "" : "none"),
    (a.hidden = !o),
    (l.hidden = !s),
    (tournamentOfficialLastStatus_ = i));
  if (!s) return;
  const d = c
    ? "audit"
    : "audit" === tournamentOfficialActiveTab_
      ? "audit"
      : "admin";
  activateTournamentOfficialTab_(d, !1);
}
function renderTournamentAdminSummary_(e) {
  const t = document.getElementById("tournament-admin-status-title"),
    a = document.getElementById("tournament-admin-status-detail"),
    n = document.getElementById("tournament-admin-mode-pill"),
    d = document.getElementById("tournament-admin-active-games"),
    u = document.getElementById("tournament-admin-finished-games"),
    m = document.getElementById("tournament-admin-pending-players"),
    g = document.getElementById("tournament-admin-round-progress"),
    f = document.getElementById("tournament-admin-round-progress-track"),
    h = document.getElementById("tournament-admin-round-progress-bar"),
    y = document.getElementById("tournament-admin-round-progress-detail");
  if (!t || !a || !n || !e || !e.meta) return;
  const o = Number(e.meta.round || 0),
    r = e.players.filter((e) => "active" === (e.status || "active")).length,
    s = e.players.filter((e) => "pending" === e.status).length,
    l = (e.pairings || []).filter(
      (t) => t.round === o && "" !== t.blackId,
    ),
    i = l.filter((e) => e.result).length,
    p = lastRoundGames.filter(
      (e) => Number(e.round) === o && "ongoing" === e.status,
    ).length,
    E = Number(e.meta.totalRounds) || 0,
    b = E > 0 ? Math.min(100, Math.round((100 * o) / E)) : 0,
    v = l.length - i,
    k = "auto" === e.meta.roundApprovalMode,
    c =
      "finished" === e.meta.status
        ? "Torneo finalizado"
        : 0 === o
          ? "Ronda inicial pendiente"
          : "pending_approval" === e.meta.roundStatus
            ? `Ronda ${o} lista para validar`
            : "closed" === e.meta.roundStatus
              ? `Ronda ${o} cerrada`
              : `Ronda ${o} en juego`;
  ((t.textContent = c),
    (a.textContent = `${r} jugador${1 === r ? "" : "es"} activo${1 === r ? "" : "s"} · ${s} pendiente${1 === s ? "" : "s"} · ${v} mesa${1 === v ? "" : "s"} sin resultado`),
    (n.textContent = k ? "Avance automático" : "Avance manual"),
    (n.dataset.mode = k ? "auto" : "manual"),
    d && (d.textContent = p),
    u && (u.textContent = i),
    m && (m.textContent = s),
    g && (g.textContent = E > 0 ? `${o} / ${E}` : `${o} / ∞`),
    f &&
      ((f.style.display = E > 0 ? "" : "none"),
      f.setAttribute("aria-valuenow", String(b))),
    h && (h.style.width = `${b}%`),
    y &&
      (y.textContent =
        E > 0
          ? `${b}% del calendario programado`
          : "Sin límite de rondas configurado"));
}
function renderTournamentRefereeSummary_(e) {
  const t = document.getElementById("tournament-referee-status-title"),
    a = document.getElementById("tournament-referee-status-detail"),
    n = document.getElementById("tournament-referee-round-pill"),
    o = document.getElementById("tournament-referee-active-games"),
    r = document.getElementById("tournament-referee-pending-results"),
    s = document.getElementById("tournament-referee-suspended-games"),
    l = document.getElementById("tournament-referee-round-progress"),
    i = document.getElementById("tournament-referee-round-progress-track"),
    c = document.getElementById("tournament-referee-round-progress-bar"),
    d = document.getElementById("tournament-referee-round-progress-detail");
  if (!t || !a || !n || !e || !e.meta) return;
  const u = Number(e.meta.round || 0),
    m = (e.pairings || []).filter(
      (e) => Number(e.round) === u && "" !== e.blackId,
    ),
    g = lastRoundGames.filter((e) => Number(e.round) === u),
    f = new Map(g.map((e) => [Number(e.board), e])),
    h = g.filter((e) => "ongoing" === e.status).length,
    y = g.filter((e) => "suspended" === e.status).length,
    p = m.filter((e) => {
      const t = f.get(Number(e.board));
      return !e.result && t && "finished" === t.status && t.result;
    }).length,
    E = m.filter((e) => e.result).length,
    b = m.length,
    v = b > 0 ? Math.min(100, Math.round((100 * E) / b)) : 0,
    k =
      "finished" === e.meta.status
        ? "Torneo finalizado"
        : p > 0
          ? `${p} resultado${1 === p ? "" : "s"} por validar`
          : y > 0
            ? `${y} partida${1 === y ? "" : "s"} suspendida${1 === y ? "" : "s"}`
            : h > 0
              ? `Ronda ${u} en juego`
              : b > 0 && E === b
                ? `Ronda ${u} completa`
                : 0 === u
                  ? "Esperando la primera ronda"
                  : `Ronda ${u} sin partidas activas`,
    w =
      p > 0
        ? "Hay resultados declarados que requieren confirmación arbitral."
        : y > 0
          ? "Revisá las partidas suspendidas antes de continuar la ronda."
          : b > 0
            ? `${E} de ${b} mesa${1 === b ? "" : "s"} tienen resultado oficial.`
            : "Todavía no hay partidas programadas en esta ronda.";
  ((t.textContent = k),
    (a.textContent = w),
    (n.textContent = `Ronda ${u}`),
    o && (o.textContent = h),
    r && (r.textContent = p),
    s && (s.textContent = y),
    l && (l.textContent = `${E} / ${b}`),
    i && i.setAttribute("aria-valuenow", String(v)),
    c && (c.style.width = `${v}%`),
    d &&
      (d.textContent =
        b > 0 ? `${v}% de resultados oficiales` : "Sin partidas programadas"));
}
function renderTournamentState(e) {
  const t = document.getElementById("tournament-setup-box"),
    a = document.getElementById("tournament-active-box");
  if ((updateModeBadge(), !currentUser))
    return (
      renderTournamentOfficialTabs_(null),
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
    p = n,
    o = "finished" === e.meta.status,
    r =
      !o &&
      ("pending_approval" === e.meta.roundStatus ||
        "closed" === e.meta.roundStatus),
    s = e.meta.totalRounds ? ` de ${e.meta.totalRounds}` : "";
  renderTournamentOfficialTabs_(e);
  renderTournamentAdminSummary_(e);
  renderTournamentRefereeSummary_(e);
  renderTournamentDiagnostics_(e);
  renderTournamentOfficialRoles_(e);
  renderTournamentRoundCompleteNotice_(e);
  renderTournamentAuditHistory_();
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
    (n && i > 0
      ? ((l.textContent = `🔔 ${i} inscripción${1 === i ? "" : "es"} pendiente${1 === i ? "" : "s"}`),
        (l.style.display = ""),
        (l.style.cursor = "pointer"),
        (l.title = "Ir a las inscripciones pendientes"))
      : (l.style.display = "none"));
  const c = document.getElementById("tournament-announcement-composer");
  c && (c.style.display = !o && n ? "" : "none");
  const d = document.getElementById("tournament-round-countdown-composer");
  (d &&
      (d.style.display = !o && n ? "" : "none"),
    renderRoundCountdown_(e),
    (document.getElementById("tournament-admin-panel").style.display = n
      ? ""
      : "none"),
    (document.getElementById("tournament-open-admin-btn").style.display = n
      ? ""
      : "none"),
    (() => {
      const t = document.getElementById("tournament-next-round-btn"),
        a =
          n &&
          !o &&
          (0 === e.meta.round ||
            "pending_approval" === e.meta.roundStatus ||
            "closed" === e.meta.roundStatus);
      t &&
        ((t.style.display = a ? "" : "none"),
        (t.textContent =
          0 === e.meta.round
            ? "Generar ronda 1"
            : "pending_approval" === e.meta.roundStatus
              ? "Aprobar y generar nueva ronda"
              : "Generar nueva ronda"));
    })(),
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
  const z = document.getElementById("tournament-auto-round-control"),
    A = document.getElementById("tournament-auto-round-mode"),
    B = document.getElementById("tournament-auto-round-status");
  z &&
    ((z.style.display = n && !o ? "" : "none"),
    A && (A.value = "auto" === e.meta.roundApprovalMode ? "auto" : "manual"),
    B &&
      (B.textContent =
        "auto" === e.meta.roundApprovalMode
          ? "Activo: cuando finalicen todas las partidas, la siguiente ronda se publicara automaticamente despues de 30 segundos."
          : "Manual: al finalizar una ronda, el administrador debe aprobarla."));
  const C = document.getElementById("tournament-round-command-center"),
    D = document.getElementById("tournament-round-command-title"),
    F = document.getElementById("tournament-round-command-status"),
    G = document.getElementById("tournament-round-command-action"),
    H = isCurrentUserOfficial(e);
  if (C && D && F && G) {
    ((C.style.display = H ? "" : "none"), (G.style.display = "none"));
    if (H)
      if (o)
        ((D.textContent = "Torneo finalizado"),
          (F.textContent =
            "La ultima ronda quedo cerrada. Podes consultar resultados o reabrir el torneo como administrador."));
      else if (0 === e.meta.round)
        ((D.textContent = "Ronda inicial pendiente"),
          (F.textContent =
            "Todavia no se genero la ronda 1. El administrador puede crear los emparejamientos."),
          n &&
            ((G.style.display = ""),
            (G.textContent = "Generar ronda 1"),
            (G.dataset.roundAction = "generate-first")));
      else if ("pending_approval" === e.meta.roundStatus)
        ((D.textContent = `Ronda ${e.meta.round} lista para avanzar`),
          (F.textContent =
            e.meta.totalRounds && e.meta.round >= e.meta.totalRounds
              ? "Todos los resultados estan cargados. El administrador debe validar la ronda final para cerrar el torneo."
              : "Todos los resultados estan cargados. El administrador puede aprobar la ronda actual y publicar la siguiente."),
          H &&
            ((G.style.display = ""),
            (G.textContent =
              e.meta.totalRounds && e.meta.round >= e.meta.totalRounds
                ? "Validar ronda final y cerrar torneo"
                : "Aprobar y publicar nueva ronda"),
            (G.dataset.roundAction = "approve")));
      else if ("closed" === e.meta.roundStatus)
        ((D.textContent = `Ronda ${e.meta.round} cerrada`),
          (F.textContent =
            H
              ? "Los resultados fueron bloqueados. Ya se puede publicar la ronda siguiente."
              : "Los resultados fueron validados y bloqueados. El administrador debe publicar la ronda siguiente."),
          H &&
            ((G.style.display = ""),
            (G.textContent = "Generar nueva ronda"),
            (G.dataset.roundAction = "generate-closed")));
      else
        ((D.textContent = `Ronda ${e.meta.round} en juego`),
          (F.textContent =
            "Esperando que finalicen todas las partidas. El estado se actualiza automaticamente."));
  }
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
        r = JSON.stringify([t, o, n, p, m, Math.floor(syncedNow_() / 15e3)]);
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
        q =
          i > 0 &&
          o &&
          "ongoing" === o.status &&
          o.startedAt &&
          !c.w &&
          !c.b &&
          syncedNow_() - getTimestampMs(o.startedAt) >= 6e4 * i,
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
            ? `Resultado declarado desde el tablero: ${resultLabel(o.result)}. Requiere confirmación del administrador.`
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
              : "double-wo" === t.result
                ? ((h = "no-show"), (y = "🔴 Doble W.O. · sin puntos"))
              : "1/2-1/2" === t.result
                ? ((h = "draw"), (y = "🔵 Tablas acordadas"))
                : ((h = "finished"), (y = "⚪ Finalizada"))
            : ((h = "pending"), (y = "🟣 Resultado pendiente de confirmar")),
          t.locked && (y += " 🔒"))
        : o && "finished" === o.status && o.result
            ? ((h = "pending"), (y = "🟣 Resultado pendiente del administrador"))
        : o && "suspended" === o.status
          ? ((h = "suspended"), (y = "⏸️ Suspendida"))
          : q
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
        (x.push(["wo-black", "WO Blancas"]),
        x.push(["wo-white", "WO Negras"]),
        q && x.push(["double-wo", "Doble W.O. (0-0)"]));
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
    case "double-wo":
      return "0 - 0 (Doble W.O.)";
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
              const a =
                promptTournamentDecisionReason_("Motivo del retiro");
              if (null === a) return;
              (await fbWithdrawPlayer(e, a), toast("🚪 Jugador retirado"));
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
              const a = promptTournamentDecisionReason_(
                "Motivo de la descalificación",
              );
              if (null === a) return;
              (await fbDisqualifyPlayer(e, a),
                toast("⛔ Jugador descalificado"));
            } catch (e) {
              showError(e);
            }
        })();
    }));
}
function renderPlayersPanel(e, t) {
  const a = document.getElementById("tournament-players-card");
  if (!a) return;
  const n = isCurrentUserAdmin(e);
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
async function refreshTournament(e) {
  const t = Boolean(e && "click" === e.type),
    a = document.getElementById("tournament-refresh-btn"),
    n = document.getElementById("tournament-connect-status");
  if (!fbRoomRef)
    return void (t && toast("Primero conectate al servicio del torneo."));
  t &&
    a &&
    ((a.disabled = !0),
    (a.dataset.originalText = a.textContent),
    (a.textContent = "Actualizando..."));
  try {
    const e = await getTournamentStateOnce(),
      o =
        "active" === e.meta.status || "finished" === e.meta.status
          ? Number(e.meta.round)
          : null;
    ((lastTournamentState = e),
      null == o ? (lastRoundGames = []) : await getRoundGamesOnce_(o),
      subscribeRoundGames(o),
      tournamentMatchActive || renderTournamentState(e),
      "function" == typeof renderPublicScreen && renderPublicScreen(e),
      refreshPublicScreenActiveMiniBoard_(),
      renderPublicScreenZoomBoard_(),
      handleLiveMatchUpdate(e),
      await reconcileFinishedGamesForTournament_(),
      n &&
        ((n.textContent = "✓ Datos actualizados y sincronizados."),
        n.classList.add("correct")),
      t && toast("Torneo y partidas actualizados.", 3e3));
  } catch (e) {
    (n &&
      ((n.textContent = "❌ No se pudo actualizar: " + e.message),
      n.classList.remove("correct")),
      t && showError(e));
  } finally {
    t &&
      a &&
      ((a.disabled = !1),
      (a.textContent = a.dataset.originalText || "🔄 Actualizar"),
      delete a.dataset.originalText);
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
  else if ("double-wo" === e)
    ((l = "🚫 Doble W.O."),
      (i = `${n} y ${o} no se presentaron. La mesa fue cerrada sin puntos.`),
      (c = null));
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
    r = isCurrentUserAdmin({ meta: e });
  if (t)
    n.innerHTML =
      "<strong>Resultado pendiente de validacion</strong><span>Un administrador debe confirmar el resultado antes de revisar la aprobacion de la ronda.</span>";
  else if (o) {
    n.innerHTML = r
      ? "<strong>Ronda lista para aprobar</strong><span>Todos los resultados fueron cargados. Usa el boton de aprobacion del panel del torneo para publicar la siguiente ronda.</span>"
      : "<strong>Ronda pendiente de aprobacion</strong><span>Todos los resultados fueron cargados. Espera a que el administrador apruebe la ronda.</span>";
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
  showAlert(a.text + "\n\nVas a volver al menú Torneo en unos segundos.", a.variant);
  const s = saveTournamentGameForAnalysis_(e, t),
    r = n || (lastTournamentState && lastTournamentState.meta);
  (showTournamentRoundApprovalPopup_(r, o),
    s && offerAnalysis(s.id),
    showAlertBackToTournamentButton_(),
    clearTournamentResultReturnTimer_(),
    (alertOnClose_ = () => {
      (clearTournamentResultReturnTimer_(), exitTournamentMatch());
    }),
    (tournamentResultReturnTimer_ = setTimeout(() => {
      closeAlert_();
    }, 3500)));
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
        "⏸️ El administrador suspendió esta partida. Esperá novedades antes de seguir jugando."),
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
            "Tiempo agotado registrado. Un administrador debe confirmar el resultado.",
          ),
        updateTournamentMatchBar(a));
    } catch (e) {
    } finally {
      tournamentTimeoutClaimBusy = !1;
    }
  }
}
