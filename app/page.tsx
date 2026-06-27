"use client";

import { useEffect, useRef, useState } from "react";
import EntryGate, { GATE_ENTER_PROGRESS } from "./components/EntryGate";
import MilkyWayScene from "./components/entry/MilkyWayScene";
import WorldMap, { GLOBE_ZOOM, type LiveMapZoomInfo } from "./components/WorldMap";
import ReturnHomePrompt from "./components/ReturnHomePrompt";
import { getReturnHomeCopy } from "@/lib/return-home-copy";
import ConnectionPrompt from "./components/ConnectionPrompt";
import ChatPanel, { type ChatMessage } from "./components/ChatPanel";
import VideoPanel from "./components/VideoPanel";
import { join, leave, poll, sendSignal } from "@/lib/api";
import { PeerSession, type DescType, type PeerControl } from "@/lib/webrtc";
import { POLL_INTERVAL_MS, RECONNECT_POLL_INTERVAL_MS } from "@/lib/presence";
import {
  clearPendingReconnect,
  consumePendingReconnect,
  getOrCreateSessionId,
  hasPendingReconnect,
  savePendingReconnect,
} from "@/lib/session";
import { type ConnectionLine, type DisconnectAnimation, type MessageOrb, type PeerDot, type SignalMsg } from "@/lib/types";

type Conn =
  | { kind: "idle" }
  | { kind: "requesting"; peerId: string }
  | { kind: "incoming"; peerId: string }
  | { kind: "connecting"; peerId: string }
  | { kind: "connected"; peerId: string };

type VideoState = "none" | "requesting" | "incoming" | "reconnecting" | "active";

const REQUEST_TIMEOUT_MS = 30_000;
const REJECTED_LINE_MS = 2_500;
const RECONNECT_WAIT_MS = 30_000;
/** How close to minZoom counts as “fully zoomed out”. */
const ZOOM_AT_MIN_EPSILON = 0.08;
/** Zoomed-out globe level that should offer return home (matches preview globe). */
const RETURN_HOME_ZOOM = GLOBE_ZOOM + 0.3;
/** Zoom in this much after dismissing before the prompt can show again. */
const RETURN_HOME_REARM_DELTA = 0.85;

function shouldOfferReturnHome(zoom: number, minZoom: number): boolean {
  return (
    zoom <= minZoom + ZOOM_AT_MIN_EPSILON || zoom <= RETURN_HOME_ZOOM
  );
}

function connectionLineFromConn(conn: Conn): ConnectionLine | null {
  switch (conn.kind) {
    case "requesting":
    case "incoming":
    case "connecting":
      return { peerId: conn.peerId, status: "pending" };
    case "connected":
      return { peerId: conn.peerId, status: "connected" };
    default:
      return null;
  }
}

export default function Home() {
  const [phase, setPhase] = useState<"gate" | "live">("gate");
  const [gateProgress, setGateProgress] = useState(0);
  const [mapIntroDone, setMapIntroDone] = useState(false);
  const [inGlobeView, setInGlobeView] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [skipIntro, setSkipIntro] = useState(false);
  const [peers, setPeers] = useState<PeerDot[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const [conn, _setConn] = useState<Conn>({ kind: "idle" });
  const connRef = useRef<Conn>(conn);
  const setConn = (c: Conn) => {
    connRef.current = c;
    _setConn(c);
  };

  const [video, _setVideo] = useState<VideoState>("none");
  const videoRef = useRef<VideoState>(video);
  const setVideo = (v: VideoState) => {
    videoRef.current = v;
    _setVideo(v);
  };

  const peerRef = useRef<PeerSession | null>(null);
  const peersRef = useRef(peers);
  const myLocationRef = useRef(myLocation);
  const connectedPeerCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const msgId = useRef(0);
  const requestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectWaitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempted = useRef(false);
  const bothReconnectingRef = useRef(false);
  const signalEpochRef = useRef(0);
  const lastDrainedSignalAtRef = useRef(0);
  const hadVideoBeforeRefreshRef = useRef(false);
  const restoringVideoRef = useRef(false);
  const videoReconnectSelfRef = useRef(false);
  const blockReconnectSave = useRef(false);
  const rejectedLineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orbId = useRef(0);
  const [lineFlash, setLineFlash] = useState<ConnectionLine | null>(null);
  const [messageOrbs, setMessageOrbs] = useState<MessageOrb[]>([]);
  const [disconnectAnim, setDisconnectAnim] = useState<DisconnectAnimation | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showReturnHome, setShowReturnHome] = useState(false);
  const [gateScrollToEnter, setGateScrollToEnter] = useState(false);
  const [returningHome, setReturningHome] = useState(false);
  const pendingNoticeRef = useRef<string | null>(null);
  const returnHomeSuppressedRef = useRef(false);
  const zoomWhenSuppressedRef = useRef<number | null>(null);
  const lastLiveZoomRef = useRef(10);
  const wasExploringRef = useRef(false);
  const showReturnHomeRef = useRef(false);
  const phaseRef = useRef(phase);
  const mapIntroDoneRef = useRef(mapIntroDone);
  const disconnectingRef = useRef(disconnecting);
  phaseRef.current = phase;
  mapIntroDoneRef.current = mapIntroDone;
  disconnectingRef.current = disconnecting;
  showReturnHomeRef.current = showReturnHome;

  function showNotice(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 3500);
  }

  function addMessage(mine: boolean, text: string) {
    setMessages((prev) => [...prev, { id: msgId.current++, mine, text }]);
  }

  function spawnMessageOrb(direction: MessageOrb["direction"], peerId: string) {
    const me = myLocationRef.current;
    const livePeer = peersRef.current.find((p) => p.id === peerId);
    const peerCoords =
      livePeer != null
        ? { lat: livePeer.lat, lng: livePeer.lng }
        : connectedPeerCoordsRef.current;
    if (!me || !peerCoords) return;

    const from =
      direction === "outgoing" ? me : peerCoords;
    const to =
      direction === "outgoing" ? peerCoords : me;

    setMessageOrbs((prev) => [
      ...prev,
      { id: `orb-${orbId.current++}`, direction, from, to },
    ]);
  }

  function completeMessageOrb(id: string) {
    setMessageOrbs((prev) => prev.filter((o) => o.id !== id));
  }

  function flashRejectedLine(peerId: string) {
    if (rejectedLineTimer.current) clearTimeout(rejectedLineTimer.current);
    setLineFlash({ peerId, status: "rejected" });
    rejectedLineTimer.current = setTimeout(() => {
      setLineFlash(null);
      rejectedLineTimer.current = null;
    }, REJECTED_LINE_MS);
  }

  function resetVideoState(preserveForReconnect = false) {
    const wasActive = videoRef.current === "active";
    peerRef.current?.stopVideo();
    setLocalStream(null);
    setRemoteStream(null);
    if (preserveForReconnect && wasActive) {
      restoringVideoRef.current = true;
      videoReconnectSelfRef.current = false;
      setVideo("reconnecting");
    } else {
      restoringVideoRef.current = false;
      setVideo("none");
    }
  }

  function clearVideoRestore() {
    hadVideoBeforeRefreshRef.current = false;
    restoringVideoRef.current = false;
    videoReconnectSelfRef.current = false;
    bothReconnectingRef.current = false;
  }

  function markSignalEpoch() {
    signalEpochRef.current = lastDrainedSignalAtRef.current;
  }

  function isStaleWebRtcSignal(sig: SignalMsg): boolean {
    // Only filter SDP during an active reconnect handshake.
    if (!signalEpochRef.current || !reconnectAttempted.current) return false;
    return new Date(sig.createdAt).getTime() <= signalEpochRef.current;
  }

  function noteDrainedSignals(signals: SignalMsg[]) {
    for (const s of signals) {
      const t = new Date(s.createdAt).getTime();
      if (t > lastDrainedSignalAtRef.current) {
        lastDrainedSignalAtRef.current = t;
      }
    }
  }

  /** Refreshed user starts WebRTC; when both refreshed, lower session id wins. */
  function shouldBeReconnectInitiator(peerId: string): boolean {
    if (!reconnectAttempted.current) return false;
    if (!bothReconnectingRef.current) return true;
    return sessionId < peerId;
  }

  /** Staying user, or higher session id when both refreshed, recreates polite peer. */
  function shouldRespondToReconnect(peerId: string): boolean {
    if (!reconnectAttempted.current) return true;
    return sessionId > peerId;
  }

  function clearConnectingTimeout() {
    if (connectingTimer.current) clearTimeout(connectingTimer.current);
    connectingTimer.current = null;
  }

  function armConnectingTimeout(peerId: string) {
    clearConnectingTimeout();
    connectingTimer.current = setTimeout(() => {
      const c = connRef.current;
      if (c.kind === "connecting" && c.peerId === peerId) {
        beginDisconnect(
          reconnectAttempted.current
            ? "Could not reconnect."
            : "Connection failed (network).",
        );
      }
    }, REQUEST_TIMEOUT_MS);
  }

  function maybeRestoreVideoAfterReconnect() {
    const shouldRestore =
      hadVideoBeforeRefreshRef.current || videoRef.current === "reconnecting";
    if (!shouldRestore || !peerRef.current) return;
    hadVideoBeforeRefreshRef.current = false;
    restoringVideoRef.current = true;
    startVideoRequest();
  }

  function teardown(message?: string, rejectedPeerId?: string) {
    if (requestTimer.current) clearTimeout(requestTimer.current);
    if (reconnectWaitTimer.current) clearTimeout(reconnectWaitTimer.current);
    clearConnectingTimeout();
    clearPendingReconnect();
    clearVideoRestore();
    signalEpochRef.current = 0;
    lastDrainedSignalAtRef.current = 0;
    reconnectAttempted.current = false;
    peerRef.current?.close();
    peerRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setVideo("none");
    setMessages([]);
    setMessageOrbs([]);
    setDisconnectAnim(null);
    setDisconnecting(false);
    pendingNoticeRef.current = null;
    setConn({ kind: "idle" });
    connectedPeerCoordsRef.current = null;
    if (rejectedPeerId) flashRejectedLine(rejectedPeerId);
    if (message) showNotice(message);
  }

  function beginDisconnect(message?: string) {
    if (disconnecting) return;

    const c = connRef.current;
    if (c.kind !== "connecting" && c.kind !== "connected") {
      teardown(message);
      return;
    }

    const me = myLocationRef.current;
    const livePeer = peersRef.current.find((p) => p.id === c.peerId);
    const peerCoords =
      livePeer != null
        ? { lat: livePeer.lat, lng: livePeer.lng }
        : connectedPeerCoordsRef.current;
    if (!me || !peerCoords) {
      teardown(message);
      return;
    }

    setDisconnecting(true);
    setMessageOrbs([]);
    pendingNoticeRef.current = message ?? null;
    blockReconnectSave.current = true;

    if (requestTimer.current) clearTimeout(requestTimer.current);
    if (reconnectWaitTimer.current) clearTimeout(reconnectWaitTimer.current);
    clearConnectingTimeout();
    clearPendingReconnect();
    peerRef.current?.close();
    peerRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    clearVideoRestore();
    setVideo("none");

    setDisconnectAnim({
      id: `dc-${Date.now()}`,
      me,
      peer: peerCoords,
      wasConnected: c.kind === "connected",
    });
  }

  function completeDisconnect() {
    const notice = pendingNoticeRef.current;
    clearPendingReconnect();
    clearVideoRestore();
    signalEpochRef.current = 0;
    lastDrainedSignalAtRef.current = 0;
    reconnectAttempted.current = false;
    setDisconnectAnim(null);
    setDisconnecting(false);
    pendingNoticeRef.current = null;
    setMessages([]);
    setConn({ kind: "idle" });
    connectedPeerCoordsRef.current = null;
    blockReconnectSave.current = false;
    if (notice) showNotice(notice);
  }

  function startPeer(peerId: string, initiator: boolean) {
    const ps = new PeerSession(initiator, {
      onSignal: (type: DescType, payload: string) => {
        if (peerRef.current !== ps) return;
        void sendSignal(sessionId, peerId, type, payload).then(() => kickPoll());
      },
      onChat: (text) => {
        if (peerRef.current !== ps) return;
        addMessage(false, text);
        spawnMessageOrb("incoming", peerId);
      },
      onControl: (ctrl) => {
        if (peerRef.current !== ps) return;
        handleControl(ctrl);
      },
      onRemoteStream: (stream) => {
        if (peerRef.current !== ps) return;
        setRemoteStream(stream);
      },
      onConnectionState: (state) => {
        if (peerRef.current !== ps) return;
        const c = connRef.current;
        if (state !== "failed" && state !== "disconnected") return;

        if (c.kind === "connected") {
          // Peer may have refreshed — wait for reconnect signal.
          resetVideoState(true);
          peerRef.current?.close();
          peerRef.current = null;
          setConn({ kind: "connecting", peerId: c.peerId });
          markSignalEpoch();
          showNotice("Stranger reconnecting…");
          if (reconnectWaitTimer.current) clearTimeout(reconnectWaitTimer.current);
          reconnectWaitTimer.current = setTimeout(() => {
            if (
              connRef.current.kind === "connecting" &&
              connRef.current.peerId === c.peerId
            ) {
              beginDisconnect("Connection lost.");
            }
          }, RECONNECT_WAIT_MS);
          return;
        }

        if (c.kind === "connecting" && !reconnectAttempted.current) {
          beginDisconnect("Connection failed (network).");
        }
      },
      onChannelOpen: () => {
        if (peerRef.current !== ps) return;
        if (reconnectWaitTimer.current) clearTimeout(reconnectWaitTimer.current);
        clearConnectingTimeout();
        setConn({ kind: "connected", peerId });
        maybeRestoreVideoAfterReconnect();
      },
    });
    peerRef.current = ps;
  }

  function attemptReconnect(peerId: string) {
    bothReconnectingRef.current = false;
    markSignalEpoch();
    setConn({ kind: "connecting", peerId });
    if (hadVideoBeforeRefreshRef.current) {
      restoringVideoRef.current = true;
      videoReconnectSelfRef.current = true;
      setVideo("reconnecting");
    }
    void sendReconnectSignal(peerId, "reconnect");
    const restoring = hadVideoBeforeRefreshRef.current;
    showNotice(
      restoring ? "Reconnecting chat and video…" : "Reconnecting…",
    );
    if (reconnectWaitTimer.current) clearTimeout(reconnectWaitTimer.current);
    reconnectWaitTimer.current = setTimeout(() => {
      if (
        connRef.current.kind === "connecting" &&
        connRef.current.peerId === peerId &&
        !peerRef.current
      ) {
        beginDisconnect("Could not reconnect.");
      }
    }, RECONNECT_WAIT_MS);
  }

  function handleControl(ctrl: PeerControl) {
    const ps = peerRef.current;
    switch (ctrl) {
      case "video-request":
        if (videoRef.current === "reconnecting" || videoRef.current === "requesting") {
          acceptVideo();
        } else if (videoRef.current === "none") {
          setVideo("incoming");
        }
        break;
      case "video-accept":
        if ((videoRef.current === "requesting" || videoRef.current === "reconnecting") && ps) {
          ps.startVideo()
            .then((stream) => {
              setLocalStream(stream);
              restoringVideoRef.current = false;
              setVideo("active");
            })
            .catch(() => {
              setVideo("none");
              ps.sendControl("video-end");
              showNotice("Camera unavailable.");
            });
        }
        break;
      case "video-decline":
        if (videoRef.current === "requesting") {
          setVideo("none");
          showNotice("Video declined.");
        }
        break;
      case "video-end":
        ps?.stopVideo();
        setLocalStream(null);
        setRemoteStream(null);
        clearVideoRestore();
        setVideo("none");
        break;
    }
  }

  function requestConnection(peerId: string) {
    if (connRef.current.kind !== "idle") return;
    setConn({ kind: "requesting", peerId });
    void sendSignal(sessionId, peerId, "request").then(() => kickPoll());
    requestTimer.current = setTimeout(() => {
      if (
        connRef.current.kind === "requesting" &&
        connRef.current.peerId === peerId
      ) {
        void sendSignal(sessionId, peerId, "end");
        teardown("No answer.", peerId);
      }
    }, REQUEST_TIMEOUT_MS);
  }

  function cancelRequest() {
    if (connRef.current.kind === "requesting") {
      void sendSignal(sessionId, connRef.current.peerId, "end");
    }
    teardown();
  }

  function acceptIncoming() {
    if (connRef.current.kind !== "incoming") return;
    const peerId = connRef.current.peerId;
    startPeer(peerId, false);
    void sendSignal(sessionId, peerId, "accept").then(() => kickPoll());
    setConn({ kind: "connecting", peerId });
    armConnectingTimeout(peerId);
  }

  function declineIncoming() {
    if (connRef.current.kind !== "incoming") return;
    void sendSignal(sessionId, connRef.current.peerId, "decline");
    setConn({ kind: "idle" });
  }

  function endConnection() {
    const c = connRef.current;
    if (c.kind === "connecting" || c.kind === "connected") {
      void sendSignal(sessionId, c.peerId, "end");
    }
    beginDisconnect();
  }

  function startVideoRequest() {
    if (
      (videoRef.current !== "none" && videoRef.current !== "reconnecting") ||
      !peerRef.current
    ) {
      return;
    }
    setVideo("requesting");
    peerRef.current.sendControl("video-request");
  }

  function acceptVideo() {
    const ps = peerRef.current;
    if (!ps) return;
    ps.startVideo()
      .then((stream) => {
        setLocalStream(stream);
        ps.sendControl("video-accept");
        restoringVideoRef.current = false;
        setVideo("active");
      })
      .catch(() => {
        ps.sendControl("video-decline");
        setVideo("none");
        showNotice("Camera unavailable.");
      });
  }

  function declineVideo() {
    peerRef.current?.sendControl("video-decline");
    setVideo("none");
  }

  function endVideo() {
    const ps = peerRef.current;
    ps?.stopVideo();
    ps?.sendControl("video-end");
    setLocalStream(null);
    setRemoteStream(null);
    clearVideoRestore();
    setVideo("none");
  }

  function processSignal(sig: SignalMsg) {
    switch (sig.type) {
      case "request": {
        const c = connRef.current;
        if (c.kind === "idle") {
          setConn({ kind: "incoming", peerId: sig.fromId });
        } else if (c.kind === "requesting" && c.peerId === sig.fromId) {
          // Both users tapped each other — connect instead of declining.
          if (requestTimer.current) clearTimeout(requestTimer.current);
          startPeer(sig.fromId, false);
          void sendSignal(sessionId, sig.fromId, "accept").then(() => kickPoll());
          setConn({ kind: "connecting", peerId: sig.fromId });
          armConnectingTimeout(sig.fromId);
        } else {
          void sendSignal(sessionId, sig.fromId, "decline");
        }
        break;
      }
      case "accept": {
        const c = connRef.current;
        if (c.kind === "requesting" && c.peerId === sig.fromId) {
          if (requestTimer.current) clearTimeout(requestTimer.current);
          startPeer(sig.fromId, true);
          setConn({ kind: "connecting", peerId: sig.fromId });
          armConnectingTimeout(sig.fromId);
        }
        break;
      }
      case "decline": {
        const c = connRef.current;
        if (c.kind === "requesting" && c.peerId === sig.fromId) {
          if (requestTimer.current) clearTimeout(requestTimer.current);
          teardown("Request declined.", sig.fromId);
        }
        break;
      }
      case "offer":
      case "answer":
      case "ice": {
        if (isStaleWebRtcSignal(sig)) break;
        const c = connRef.current;
        const peerId =
          c.kind === "connecting" || c.kind === "connected" ? c.peerId : null;
        if (peerRef.current && peerId === sig.fromId) {
          void peerRef.current.handleSignal(
            sig.type as DescType,
            sig.payload ?? "",
          );
        }
        break;
      }
      case "reconnect": {
        const c = connRef.current;
        if (
          (c.kind === "connected" || c.kind === "connecting") &&
          c.peerId === sig.fromId
        ) {
          if (reconnectAttempted.current) {
            bothReconnectingRef.current = true;
          }
          if (!shouldRespondToReconnect(sig.fromId)) {
            break;
          }
          markSignalEpoch();
          if (reconnectWaitTimer.current) clearTimeout(reconnectWaitTimer.current);
          resetVideoState(true);
          peerRef.current?.close();
          peerRef.current = null;
          startPeer(sig.fromId, false);
          setConn({ kind: "connecting", peerId: sig.fromId });
          armConnectingTimeout(sig.fromId);
          void sendReconnectSignal(sig.fromId, "reconnect-ready");
        }
        break;
      }
      case "reconnect-ready": {
        const c = connRef.current;
        if (
          c.kind === "connecting" &&
          c.peerId === sig.fromId &&
          shouldBeReconnectInitiator(sig.fromId)
        ) {
          if (reconnectWaitTimer.current) clearTimeout(reconnectWaitTimer.current);
          peerRef.current?.close();
          peerRef.current = null;
          startPeer(sig.fromId, true);
          kickPoll();
          armConnectingTimeout(sig.fromId);
        }
        break;
      }
      case "end": {
        const c = connRef.current;
        if (
          (c.kind === "incoming" ||
            c.kind === "connecting" ||
            c.kind === "connected") &&
          c.peerId === sig.fromId
        ) {
          if (c.kind === "incoming") setConn({ kind: "idle" });
          else beginDisconnect("Stranger disconnected.");
        }
        break;
      }
    }
  }

  const processSignalRef = useRef(processSignal);
  const pollKickRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    processSignalRef.current = processSignal;
  });

  function kickPoll() {
    pollKickRef.current?.();
  }

  async function sendReconnectSignal(
    toId: string,
    type: "reconnect" | "reconnect-ready",
  ) {
    await sendSignal(sessionId, toId, type);
    kickPoll();
  }

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  useEffect(() => {
    myLocationRef.current = myLocation;
  }, [myLocation]);

  useEffect(() => {
    const c = connRef.current;
    if (c.kind !== "connecting" && c.kind !== "connected") {
      connectedPeerCoordsRef.current = null;
      return;
    }
    const live = peers.find((p) => p.id === c.peerId);
    if (live) {
      connectedPeerCoordsRef.current = { lat: live.lat, lng: live.lng };
    }
  }, [peers, conn]);

  useEffect(() => {
    if (phase !== "live" || !sessionId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const data = await poll(sessionId);
        if (!active) return;
        setPeers(data.peers);
        const handshake = data.signals.filter(
          (s) => s.type === "reconnect" || s.type === "reconnect-ready",
        );
        const rest = data.signals.filter(
          (s) => s.type !== "reconnect" && s.type !== "reconnect-ready",
        );
        for (const s of handshake) processSignalRef.current(s);
        for (const s of rest) processSignalRef.current(s);
        noteDrainedSignals(data.signals);
      } catch {}
      if (!active) return;
      const delay =
        connRef.current.kind === "connecting"
          ? RECONNECT_POLL_INTERVAL_MS
          : POLL_INTERVAL_MS;
      timer = setTimeout(tick, delay);
    };

    pollKickRef.current = () => {
      if (!active) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(tick, 0);
    };
    tick();

    return () => {
      active = false;
      pollKickRef.current = null;
      if (timer) clearTimeout(timer);
    };
  }, [phase, sessionId]);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
    if (hasPendingReconnect()) {
      setSkipIntro(true);
      setPhase("live");
    }
  }, []);

  useEffect(() => {
    if (!sessionId || phase !== "live") return;
    const onPageHide = () => {
      if (blockReconnectSave.current) {
        leave(sessionId);
        return;
      }
      const c = connRef.current;
      if (c.kind === "connecting" || c.kind === "connected") {
        savePendingReconnect(
          c.peerId,
          videoRef.current === "active" || videoRef.current === "reconnecting",
        );
        return;
      }
      leave(sessionId);
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [sessionId, phase]);

  const geoActiveRef = useRef(false);

  function requestLocation() {
    if (geoActiveRef.current || myLocationRef.current) return;
    if (!("geolocation" in navigator)) return;

    geoActiveRef.current = true;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        geoActiveRef.current = false;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // Show a persistent banner while the server wakes up (Neon cold start
        // can take ~20s on the free tier; the notice is cleared on success).
        setNotice("Joining the map…");

        // Retry join up to 4 times with exponential back-off.
        let joined = false;
        for (let attempt = 0; attempt < 4 && !joined; attempt++) {
          try {
            await join(sessionId, lat, lng, {
              preserveBusy: reconnectAttempted.current,
            });
            joined = true;
          } catch {
            if (attempt < 3) {
              await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
            }
          }
        }

        if (joined) {
          setNotice(null);
          setMyLocation({ lat, lng });
        } else {
          showNotice("Couldn't register your location. Retrying…");
          window.setTimeout(() => {
            geoActiveRef.current = false;
            requestLocation();
          }, 3000);
        }
      },
      (err) => {
        geoActiveRef.current = false;
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location permission is required. Allow location for this site in your browser settings."
            : err.code === err.TIMEOUT
              ? "Location timed out. Try again."
              : "Couldn't get your location. On Mac, enable Location Services for your browser.";
        showNotice(msg);
      },
      // Low accuracy works reliably on desktop Mac; high accuracy often fails with CoreLocation.
      { enableHighAccuracy: false, timeout: 20_000, maximumAge: 300_000 },
    );
  }

  // Restore map + reconnect after refresh (skips entry gate).
  useEffect(() => {
    if (phase !== "live" || !sessionId || myLocation) return;
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when live without location
  }, [phase, sessionId]);

  useEffect(() => {
    if (phase !== "live" || !sessionId || reconnectAttempted.current) {
      return;
    }
    const pending = consumePendingReconnect();
    if (!pending) return;
    reconnectAttempted.current = true;
    hadVideoBeforeRefreshRef.current = pending.hadVideo;
    if (pending.hadVideo) {
      restoringVideoRef.current = true;
      videoReconnectSelfRef.current = true;
    }
    attemptReconnect(pending.peerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconnect once after refresh
  }, [phase, sessionId]);

  function handleEnter() {
    reconnectAttempted.current = false;
    signalEpochRef.current = 0;
    lastDrainedSignalAtRef.current = 0;
    setGateProgress(GATE_ENTER_PROGRESS);
    setGateScrollToEnter(false);
    setMapIntroDone(false);
    setShowReturnHome(false);
    returnHomeSuppressedRef.current = false;
    zoomWhenSuppressedRef.current = null;
    wasExploringRef.current = false;
    setPhase("live");
  }

  function cleanupBeforeReturnHome() {
    const c = connRef.current;
    if (c.kind === "requesting") {
      void sendSignal(sessionId, c.peerId, "end");
    } else if (c.kind === "incoming") {
      void sendSignal(sessionId, c.peerId, "decline");
    } else if (c.kind === "connecting" || c.kind === "connected") {
      void sendSignal(sessionId, c.peerId, "end");
    }
    teardown();
  }

  function returnToHome() {
    setShowReturnHome(false);
    cleanupBeforeReturnHome();
    setReturningHome(true);
    setGateScrollToEnter(true);
    setGateProgress(GATE_ENTER_PROGRESS);
    setPhase("gate");
    setMapIntroDone(false);
    setInGlobeView(true);
    returnHomeSuppressedRef.current = false;
    zoomWhenSuppressedRef.current = null;
    wasExploringRef.current = false;
  }

  useEffect(() => {
    if (!returningHome) return;
    const timer = window.setTimeout(() => setReturningHome(false), 1000);
    return () => window.clearTimeout(timer);
  }, [returningHome]);

  function dismissReturnHome() {
    setShowReturnHome(false);
    returnHomeSuppressedRef.current = true;
    zoomWhenSuppressedRef.current = lastLiveZoomRef.current;
  }

  function handleLiveZoomChange({ zoom, minZoom }: LiveMapZoomInfo) {
    lastLiveZoomRef.current = zoom;
    if (zoom > RETURN_HOME_ZOOM + 0.5) {
      wasExploringRef.current = true;
    }

    if (phaseRef.current !== "live" || !mapIntroDoneRef.current) return;
    if (!wasExploringRef.current) return;
    if (disconnectingRef.current || showReturnHomeRef.current) return;

    if (returnHomeSuppressedRef.current && zoomWhenSuppressedRef.current !== null) {
      const base = zoomWhenSuppressedRef.current;
      if (zoom > base + RETURN_HOME_REARM_DELTA) {
        returnHomeSuppressedRef.current = false;
        zoomWhenSuppressedRef.current = null;
      } else if (zoom < base - 0.05) {
        // Zoomed out further after dismiss — allow prompt at the real limit.
        returnHomeSuppressedRef.current = false;
        zoomWhenSuppressedRef.current = null;
      }
    }

    if (shouldOfferReturnHome(zoom, minZoom) && !returnHomeSuppressedRef.current) {
      setShowReturnHome(true);
    }
  }

  if (!sessionId) {
    return null;
  }

  const inGate = phase === "gate";
  const cosmicActive =
    inGate || (phase === "live" && (!mapIntroDone || inGlobeView));
  const milkyProgress = inGate ? gateProgress : 1;
  const mapZoomProgress = inGate
    ? Math.min(1, Math.max(0, (gateProgress - 0.28) / 0.55))
    : 1;
  const mapReveal =
    mapZoomProgress > 0.02 ? Math.min(1, mapZoomProgress * 1.05) : 0;
  const inChat =
    !inGate &&
    (conn.kind === "connecting" ||
      conn.kind === "connected" ||
      disconnecting);
  const connectionLine =
    inGate || disconnectAnim || disconnecting
      ? null
      : lineFlash ?? connectionLineFromConn(conn);

  const connectedPeerLocation =
    !inGate &&
    (conn.kind === "connecting" || conn.kind === "connected")
      ? (peers.find((p) => p.id === conn.peerId) ??
        connectedPeerCoordsRef.current ??
        null)
      : null;

  return (
    <main className="fixed inset-0 overflow-hidden">
      {(inGate || phase === "live") && (
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-[#0a0a23]"
          style={{
            opacity: cosmicActive ? 1 : 0,
            transition: returningHome ? "opacity 0.9s ease" : "opacity 0.7s ease",
          }}
        >
          <MilkyWayScene progress={milkyProgress} />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: cosmicActive ? 1 : 0,
              transition: "opacity 0.7s ease",
              background: [
                `radial-gradient(ellipse 55% 40% at 50% 42%, rgba(216, 191, 216, ${0.14 + (1 - milkyProgress) * 0.1}) 0%, transparent 58%)`,
                `radial-gradient(ellipse 90% 70% at 50% 45%, rgba(106, 13, 173, ${0.22 + (1 - milkyProgress) * 0.08}) 0%, transparent 65%)`,
              ].join(", "),
            }}
            aria-hidden
          />
        </div>
      )}

      <div
        className={`fixed inset-0 ${cosmicActive ? "z-10" : "z-0"}`}
        style={
          inGate
            ? {
                opacity: mapReveal,
                transition: returningHome
                  ? "opacity 0.9s ease"
                  : "opacity 0.2s ease-out",
              }
            : undefined
        }
      >
        <WorldMap
          peers={inGate ? [] : peers}
          me={inGate ? null : myLocation}
          previewMode={inGate}
          previewScrollProgress={mapZoomProgress}
          transparentSpace={cosmicActive}
          skipIntro={skipIntro}
          onIntroComplete={() => {
            setMapIntroDone(true);
            setInGlobeView(false);
          }}
          onGlobeViewChange={setInGlobeView}
          onZoomChange={handleLiveZoomChange}
          connectionLine={connectionLine}
          connectedPeerLocation={connectedPeerLocation}
          disconnectAnim={inGate ? null : disconnectAnim}
          onDisconnectComplete={inGate ? () => {} : completeDisconnect}
          messageOrbs={inGate ? [] : messageOrbs}
          onMessageOrbComplete={inGate ? () => {} : completeMessageOrb}
          onPeerClick={inGate ? () => {} : requestConnection}
          canConnect={!inGate && conn.kind === "idle" && !disconnecting}
        />
      </div>

      {inGate && (
        <EntryGate
          onEnter={handleEnter}
          onRequestLocation={requestLocation}
          onProgressChange={setGateProgress}
          scrollToEnterOnMount={gateScrollToEnter}
          onEnterScrollApplied={() => setGateScrollToEnter(false)}
        />
      )}

      {!inGate && notice && (
        <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-zinc-800/90 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur">
          {notice}
        </div>
      )}

      {!inGate && showReturnHome && (
        <ReturnHomePrompt
          {...getReturnHomeCopy(conn, video)}
          acceptLabel="Return to outer space"
          declineLabel="Stay on the globe"
          onAccept={returnToHome}
          onDecline={dismissReturnHome}
        />
      )}

      {!inGate && conn.kind === "requesting" && (
        <div className="absolute left-1/2 top-20 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-zinc-800/90 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur">
          <span>Requesting connection…</span>
          <button
            onClick={cancelRequest}
            className="rounded-full bg-zinc-700 px-3 py-1 text-xs hover:bg-zinc-600"
          >
            Cancel
          </button>
        </div>
      )}

      {!inGate && conn.kind === "incoming" && (
        <ConnectionPrompt
          title="A stranger wants to connect"
          acceptLabel="Accept"
          declineLabel="Decline"
          onAccept={acceptIncoming}
          onDecline={declineIncoming}
        />
      )}

      {inChat && (
        <ChatPanel
          messages={messages}
          connected={conn.kind === "connected" && !disconnecting}
          exiting={disconnecting}
          videoBusy={video !== "none"}
          onSend={(text) => {
            peerRef.current?.sendChat(text);
            addMessage(true, text);
            const c = connRef.current;
            if (c.kind === "connected") {
              spawnMessageOrb("outgoing", c.peerId);
            }
          }}
          onStartVideo={startVideoRequest}
          onEnd={endConnection}
        />
      )}

      {!inGate && video === "reconnecting" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 px-6 text-center backdrop-blur-sm">
          <div className="max-w-sm space-y-3">
            <p className="text-lg font-medium text-zinc-100">
              {videoReconnectSelfRef.current
                ? "Reconnecting your video call…"
                : "Waiting for stranger to reconnect video…"}
            </p>
            <p className="text-sm text-zinc-400">
              {videoReconnectSelfRef.current
                ? "Chat is reconnecting. Video will resume automatically once you\u2019re back online."
                : "Your chat is still connected. Video will resume automatically once they\u2019re back."}
            </p>
            <div className="mx-auto h-1 w-24 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-violet-500" />
            </div>
          </div>
        </div>
      )}

      {!inGate && video === "requesting" && (
        <div className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-zinc-800/90 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur">
          {restoringVideoRef.current
            ? "Reconnecting video call…"
            : "Waiting for stranger to accept video…"}
        </div>
      )}

      {!inGate && video === "incoming" && (
        <ConnectionPrompt
          title="Start video call?"
          subtitle="The stranger wants to turn on video."
          acceptLabel="Accept"
          declineLabel="Decline"
          onAccept={acceptVideo}
          onDecline={declineVideo}
        />
      )}

      {!inGate && video === "active" && (
        <VideoPanel
          localStream={localStream}
          remoteStream={remoteStream}
          onEnd={endVideo}
          onEndCall={endConnection}
        />
      )}
    </main>
  );
}
