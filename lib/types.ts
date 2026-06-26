// Shared types across client + API.

// Signal mailbox message types.
export type SignalType =
  | "request" // connection request (tap a dot)
  | "accept" // recipient accepted
  | "decline" // recipient declined (or auto-declined while busy)
  | "offer" // WebRTC SDP offer
  | "answer" // WebRTC SDP answer
  | "ice" // WebRTC ICE candidate
  | "reconnect" // peer refreshed — renegotiate WebRTC without dropping busy
  | "reconnect-ready" // responder recreated peer — initiator may send offer
  | "end"; // hang up / leave the connection

export interface PeerDot {
  id: string;
  lat: number;
  lng: number;
  busy: boolean;
}

export interface SignalMsg {
  id: string;
  fromId: string;
  toId: string;
  type: SignalType;
  payload: string | null;
  createdAt: string;
}

export interface PollResponse {
  peers: PeerDot[];
  signals: SignalMsg[];
}

export interface GateStatsResponse {
  strangersOnline: number;
  connectionsToday: number;
  countries: number;
}

/** Map line from me → peer while connecting. */
export type ConnectionLineStatus = "pending" | "connected" | "rejected";

export interface ConnectionLine {
  peerId: string;
  status: ConnectionLineStatus;
}

/** Animated orb flying along the connection when a chat message is sent/received. */
export interface MessageOrb {
  id: string;
  direction: "outgoing" | "incoming";
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

/** Snapshot coords for the end-connection map animation. */
export interface DisconnectAnimation {
  id: string;
  me: { lat: number; lng: number };
  peer: { lat: number; lng: number };
  wasConnected: boolean;
}
