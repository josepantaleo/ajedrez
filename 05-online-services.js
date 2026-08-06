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
function renderRoundCountdown_(e) {
  const t = document.getElementById("tournament-round-countdown-banner"),
    a = document.getElementById("tournament-round-countdown-label"),
    n = document.getElementById("tournament-round-countdown-time"),
    o = document.getElementById("tournament-round-countdown-cancel-btn");
  if (!t || !a || !n) return;
  stopRoundCountdownTimer_();
  const r = e.meta.roundCountdownSetAt,
    s = e.meta.roundCountdownMs,
    l = r && "function" == typeof r.toMillis && s;
  if ((o && (o.style.display = l ? "" : "none"), !l))
    return (
      (t.style.display = "none"),
      void t.classList.remove("round-countdown-urgent")
    );
  const i = r.toMillis() + s;
  ((a.textContent = `Ronda ${e.meta.round + 1} arranca en`),
    (t.style.display = ""));
  const c = () => {
    const e = i - syncedNow_();
    if (e <= 0)
      return (
        (n.textContent = "¡ya!"),
        t.classList.remove("round-countdown-urgent"),
        void stopRoundCountdownTimer_()
      );
    const a = Math.ceil(e / 1e3);
    ((n.textContent = formatTime(a)),
      t.classList.toggle("round-countdown-urgent", a <= 60));
  };
  (c(), (roundCountdownTimer_ = setInterval(c, 250)));
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
  assertAdminOrReferee();
  const t = (e || "").trim();
  if (!t) throw new Error("Escribí un mensaje para anunciar");
  await announcementsCollectionRef.add({
    text: t,
    ts: srvTimestamp(),
    byEmail: currentUser ? currentUser.email : null,
  });
}
async function fbSetRoundCountdown(e) {
  assertAdminOrReferee();
  const t = Number(e);
  if (!t || t <= 0) throw new Error("Elegí una cantidad de minutos válida");
  await fbDb.runTransaction(async (e) => {
    const a = await e.get(fbRoomRef);
    if (!a.exists) throw new Error("Todavía no creaste un torneo");
    const n = a.data();
    e.update(fbRoomRef, {
      meta: {
        ...n.meta,
        roundCountdownSetAt: srvTimestamp(),
        roundCountdownMs: Math.round(6e4 * t),
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
      e.update(fbRoomRef, {
        meta: { ...a.meta, roundCountdownSetAt: null, roundCountdownMs: null },
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
function renderMatchChat() {
  const e = document.getElementById("tournament-match-chat"),
    t = document.getElementById("tournament-match-chat-messages"),
    a = document.getElementById("tournament-match-chat-note"),
    n = document.getElementById("tournament-match-chat-unread"),
    o = document.querySelector("#tournament-match-chat-panel .chat-input-row"),
    r = document.getElementById("tournament-match-chat-clear-btn"),
    s = document.getElementById("tournament-match-chat-toggle-btn");
  if (!e || !t) return;
  const l = !!tournamentMyColor();
  if (((e.style.display = tournamentMatchActive && l ? "" : "none"), l))
    if (
      (o && (o.style.display = ""),
      a && (a.textContent = ""),
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
  if (!tournamentMatchCtx || !currentUser) return;
  const a = tournamentMyColor();
  if (a) {
    ((e.value = ""), resetMatchChatComposer_());
    try {
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
  const l = tournamentMyColor();
  ((e.style.display = tournamentMatchActive && l ? "" : "none"),
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
  if (!tournamentMatchCtx || "idle" !== callState || !tournamentMyColor())
    return;
  const e = tournamentMatchCtx.round,
    t = tournamentMatchCtx.board;
  try {
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
  if (!tournamentMatchCtx || !tournamentMyColor()) return;
  const t = tournamentMatchCtx.round,
    a = tournamentMatchCtx.board;
  try {
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
function isCurrentUserReferee() {
  return !!currentUser && currentUser.email === TOURNAMENT_REFEREE_EMAIL;
}
function assertReferee() {
  if (!isCurrentUserReferee())
    throw new Error("Esta acción es exclusiva del árbitro del torneo");
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
    adminEmails: [],
    totalRounds: null,
    roundStatus: "playing",
    roundApprovalMode: "manual",
    pendingApprovalAt: null,
    autoApprovalCancelled: !1,
    woGraceMinutes: 0,
    roundCountdownSetAt: null,
    roundCountdownMs: null,
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
              email: (e.email || "").toLowerCase(),
              displayName: e.displayName || e.email,
            }
          : null),
          updateAuthUI(),
          renderTournamentState(lastTournamentState));
      })),
    subscribeTournament(),
    subscribeAnnouncements());
}
function updateAuthUI() {
  const e = document.getElementById("tournament-auth-status"),
    t = document.getElementById("tournament-google-signin-btn"),
    a = document.getElementById("tournament-signout-btn");
  (currentUser
    ? ((e.textContent = `Conectado como ${currentUser.displayName} (${currentUser.email})`),
      (t.style.display = "none"),
      (a.style.display = ""))
    : ((e.textContent =
        "Iniciá sesión con tu cuenta de Gmail para jugar o administrar el torneo."),
      (t.style.display = ""),
      (a.style.display = "none")),
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
  return !!currentUser && currentUser.email === TOURNAMENT_ADMIN_EMAIL;
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
    a = isCurrentUserReferee()
      ? "🧑‍⚖️ Modo Árbitro"
      : t
        ? "🛠️ Modo Administrador"
        : "👤 Modo Jugador";
  e.forEach((e) => {
    e && ((e.textContent = a), (e.style.display = ""));
  });
}
