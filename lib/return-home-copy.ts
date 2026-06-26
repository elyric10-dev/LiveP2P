type Conn =
  | { kind: "idle" }
  | { kind: "requesting"; peerId: string }
  | { kind: "incoming"; peerId: string }
  | { kind: "connecting"; peerId: string }
  | { kind: "connected"; peerId: string };

type VideoState = "none" | "requesting" | "incoming" | "reconnecting" | "active";

export function getReturnHomeCopy(
  conn: Conn,
  video: VideoState,
): { title: string; subtitle: string } {
  if (video === "active") {
    return {
      title: "Leave the globe?",
      subtitle:
        "You're in a live video call. Returning to outer space will end the call, disconnect you from your stranger, and take you back to the Pulse homepage.",
    };
  }

  if (video === "requesting" || video === "incoming" || video === "reconnecting") {
    return {
      title: "Leave the globe?",
      subtitle:
        video === "reconnecting"
          ? "A video call is reconnecting after a refresh. Going back to outer space will end the call and return you to the Pulse homepage."
          : "A video call is being set up. Going back to outer space will cancel it and return you to the Pulse homepage.",
    };
  }

  switch (conn.kind) {
    case "connected":
      return {
        title: "Return to outer space?",
        subtitle:
          "You're connected to a stranger right now. Leaving the globe will end your chat, disconnect you both, and bring you back to the Pulse homepage.",
      };
    case "connecting":
      return {
        title: "Return to outer space?",
        subtitle:
          "You're still connecting to a stranger. Going back now will cancel the connection and return you to the Pulse homepage.",
      };
    case "requesting":
      return {
        title: "Return to outer space?",
        subtitle:
          "You have a connection request waiting. Leaving the globe will cancel it and take you back to the Pulse homepage.",
      };
    case "incoming":
      return {
        title: "Return to outer space?",
        subtitle:
          "Someone wants to connect with you. Going back will decline them and return you to the Pulse homepage.",
      };
    default:
      return {
        title: "Return to outer space?",
        subtitle:
          "You've zoomed out to the edge of the globe. Go back to the Pulse homepage and drift through the stars again?",
      };
  }
}
