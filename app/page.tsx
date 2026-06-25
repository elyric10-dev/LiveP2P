"use client";

import { useEffect, useRef, useState } from "react";
import EntryGate from "./components/EntryGate";
import MilkyWayScene from "./components/entry/MilkyWayScene";
import WorldMap from "./components/WorldMap";
import ConnectionPrompt from "./components/ConnectionPrompt";
import ChatPanel, { type ChatMessage } from "./components/ChatPanel";
import VideoPanel from "./components/VideoPanel";
import { join, leave, poll, sendSignal } from "@/lib/api";
import { PeerSession, type DescType, type PeerControl } from "@/lib/webrtc";
import { POLL_INTERVAL_MS } from "@/lib/presence";
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

type VideoState = "none" | "requesting" | "incoming" | "active";

const REQUEST_TIMEOUT_MS = 30_000;
const REJECTED_LINE_MS = 2_500;
const RECONNECT_WAIT_MS = 30_000;

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
  const reconnectAttempted = useRef(false);
  const blockReconnectSave = useRef(false);
  const rejectedLineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orbId = useRef(0);
  const [lineFlash, setLineFlash] = useState<ConnectionLine | null>(null);
  const [messageOrbs, setMessageOrbs] = useState<MessageOrb[]>([]);
  const [disconnectAnim, setDisconnectAnim] = useState<DisconnectAnimation | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const pendingNoticeRef = useRef<string | null>(null);

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

  function teardown(message?: string, rejectedPeerId?: string) {
    if (requestTimer.current) clearTimeout(requestTimer.current);
    if (reconnectWaitTimer.current) clearTimeout(reconnectWaitTimer.current);
    clearPendingReconnect();
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
    clearPendingReconnect();
    peerRef.current?.close();
    peerRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
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
        void sendSignal(sessionId, peerId, type, payload);
      },
      onChat: (text) => {
        addMessage(false, text);
        spawnMessageOrb("incoming", peerId);
      },
      onControl: (ctrl) => handleControl(ctrl),
      onRemoteStream: (stream) => setRemoteStream(stream),
      onConnectionState: (state) => {
        const c = connRef.current;
        if (state !== "failed" && state !== "disconnected") return;

        if (c.kind === "connected") {
          // Peer may have refreshed — wait for reconnect signal.
          peerRef.current?.close();
          peerRef.current = null;
          setConn({ kind: "connecting", peerId: c.peerId });
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
        if (reconnectWaitTimer.current) clearTimeout(reconnectWaitTimer.current);
        setConn({ kind: "connected", peerId });
      },
    });
    peerRef.current = ps;
  }

  function attemptReconnect(peerId: string) {
    setConn({ kind: "connecting", peerId });
    startPeer(peerId, true);
    void sendSignal(sessionId, peerId, "reconnect");
    showNotice("Reconnecting…");
  }

  function handleControl(ctrl: PeerControl) {
    const ps = peerRef.current;
    switch (ctrl) {
      case "video-request":
        if (videoRef.current === "none") setVideo("incoming");
        break;
      case "video-accept":
        if (videoRef.current === "requesting" && ps) {
          ps.startVideo()
            .then((stream) => {
              setLocalStream(stream);
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
        setVideo("none");
        break;
    }
  }

  function requestConnection(peerId: string) {
    if (connRef.current.kind !== "idle") return;
    setConn({ kind: "requesting", peerId });
    void sendSignal(sessionId, peerId, "request");
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
    void sendSignal(sessionId, peerId, "accept");
    setConn({ kind: "connecting", peerId });
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
    if (videoRef.current !== "none" || !peerRef.current) return;
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
          void sendSignal(sessionId, sig.fromId, "accept");
          setConn({ kind: "connecting", peerId: sig.fromId });
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
          if (reconnectWaitTimer.current) clearTimeout(reconnectWaitTimer.current);
          peerRef.current?.close();
          peerRef.current = null;
          startPeer(sig.fromId, false);
          setConn({ kind: "connecting", peerId: sig.fromId });
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
  useEffect(() => {
    processSignalRef.current = processSignal;
  });

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
        for (const s of data.signals) processSignalRef.current(s);
      } catch {}
      if (active) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();

    return () => {
      active = false;
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
        savePendingReconnect(c.peerId);
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
        setMyLocation({ lat, lng });
        await join(sessionId, lat, lng);
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
    if (phase !== "live" || !sessionId || !myLocation || reconnectAttempted.current) {
      return;
    }
    const pending = consumePendingReconnect();
    if (!pending) return;
    reconnectAttempted.current = true;
    attemptReconnect(pending.peerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconnect once after refresh
  }, [phase, sessionId, myLocation]);

  function handleEnter() {
    setGateProgress(1);
    setMapIntroDone(false);
    setPhase("live");
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
          className="pointer-events-none fixed inset-0 z-0 bg-[#0a0a23] transition-opacity duration-700"
          style={{ opacity: cosmicActive ? 1 : 0 }}
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
            ? { opacity: mapReveal, transition: "opacity 0.2s ease-out" }
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
        />
      )}

      {!inGate && notice && (
        <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-zinc-800/90 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur">
          {notice}
        </div>
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

      {!inGate && video === "requesting" && (
        <div className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-zinc-800/90 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur">
          Waiting for stranger to accept video…
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
        />
      )}
    </main>
  );
}
