export type GateFeatureId = "map" | "connect" | "chat" | "privacy";

export type GateFeature = {
  id: GateFeatureId;
  label: string;
  title: string;
  tagline: string;
  summary: string;
  points: string[];
  iconPath: string;
};

export const GATE_FEATURES: GateFeature[] = [
  {
    id: "map",
    label: "Live map",
    title: "See who's online",
    tagline: "Real-time dots worldwide",
    summary:
      "Everyone on Pulse appears as a glowing dot near their area. Dots appear when people join and vanish when they leave.",
    points: [
      "Live updates as strangers come and go.",
      "Your dot is offset 1–3 km for privacy.",
      "Pan and zoom anywhere on the globe.",
    ],
    iconPath:
      "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    id: "connect",
    label: "Connect",
    title: "Tap to meet someone",
    tagline: "One tap, one stranger",
    summary:
      "Tap any dot to send a connection request. They accept or decline — no messaging before they agree.",
    points: [
      "One active connection at a time.",
      "Instant chat once they accept.",
      "Notified if your request is declined.",
    ],
    iconPath:
      "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    id: "chat",
    label: "Chat & video",
    title: "Talk face to face",
    tagline: "Text and video, peer to peer",
    summary:
      "Send messages in real time after connecting. Either person can start a video call — the other accepts first.",
    points: [
      "Messages exist only during the session.",
      "Switch between text and video anytime.",
      "Nothing recorded or stored on servers.",
    ],
    iconPath:
      "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  },
  {
    id: "privacy",
    label: "Privacy",
    title: "Nothing leaves a trace",
    tagline: "Stateless by design",
    summary:
      "No accounts, no chat history, no exact GPS. Close the tab and you disappear from the map completely.",
    points: [
      "No sign-up or personal profiles.",
      "WebRTC keeps chat and video peer-to-peer.",
      "Location used only to place your dot.",
    ],
    iconPath:
      "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
];

export function gateFeatureById(id: GateFeatureId): GateFeature {
  return GATE_FEATURES.find((f) => f.id === id) ?? GATE_FEATURES[0];
}
