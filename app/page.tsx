"use client";

import { useEffect, useRef, useState } from "react";
import EntryGate from "./components/EntryGate";
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

  function enterLiveMap() {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMyLocation({ lat, lng });
        await join(sessionId, lat, lng);
      },
      (err) => {
        showNotice(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is required to place you on the map."
            : "Couldn't get your location. Please try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  // Restore map + reconnect after refresh (skips entry gate).
  useEffect(() => {
    if (phase !== "live" || !sessionId || myLocation) return;
    enterLiveMap();
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

  async function handleEnter() {
    setPhase("live");
    enterLiveMap();
  }

  if (phase === "gate") {
    return <EntryGate onEnter={handleEnter} />;
  }

  if (!sessionId) {
    return null;
  }

  const inChat =
    conn.kind === "connecting" ||
    conn.kind === "connected" ||
    disconnecting;
  const connectionLine =
    disconnectAnim || disconnecting
      ? null
      : lineFlash ?? connectionLineFromConn(conn);

  const connectedPeerLocation =
    conn.kind === "connecting" || conn.kind === "connected"
      ? (peers.find((p) => p.id === conn.peerId) ??
        connectedPeerCoordsRef.current ??
        null)
      : null;

  return (
    <main className="fixed inset-0 overflow-hidden">
      <WorldMap
        peers={peers}
        me={myLocation}
        skipIntro={skipIntro}
        connectionLine={connectionLine}
        connectedPeerLocation={connectedPeerLocation}
        disconnectAnim={disconnectAnim}
        onDisconnectComplete={completeDisconnect}
        messageOrbs={messageOrbs}
        onMessageOrbComplete={completeMessageOrb}
        onPeerClick={requestConnection}
        canConnect={conn.kind === "idle" && !disconnecting}
      />

      {notice && (
        <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-zinc-800/90 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur">
          {notice}
        </div>
      )}

      {conn.kind === "requesting" && (
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

      {conn.kind === "incoming" && (
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

      {video === "requesting" && (
        <div className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-zinc-800/90 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur">
          Waiting for stranger to accept video…
        </div>
      )}

      {video === "incoming" && (
        <ConnectionPrompt
          title="Start video call?"
          subtitle="The stranger wants to turn on video."
          acceptLabel="Accept"
          declineLabel="Decline"
          onAccept={acceptVideo}
          onDecline={declineVideo}
        />
      )}

      {video === "active" && (
        <VideoPanel
          localStream={localStream}
          remoteStream={remoteStream}
          onEnd={endVideo}
        />
      )}
    </main>
  );
}
