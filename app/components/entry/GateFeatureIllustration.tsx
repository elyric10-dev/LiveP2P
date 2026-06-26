import type { GateFeatureId } from "@/lib/gate-features";
import GateChatVideoGallery from "./GateChatVideoGallery";
import LiveMapArt from "./gate-art/LiveMapArt";
import ConnectArt from "./gate-art/ConnectArt";
import PrivacyArt from "./gate-art/PrivacyArt";

type Props = { id: GateFeatureId; animated?: boolean };

export default function GateFeatureIllustration({ id, animated = false }: Props) {
  const anim = animated ? " gate-feature-art--active" : "";
  switch (id) {
    case "map":
      return <LiveMapArt className={anim} />;
    case "connect":
      return <ConnectArt className={anim} />;
    case "chat":
      return <GateChatVideoGallery animated={animated} />;
    case "privacy":
      return <PrivacyArt className={anim} />;
    default:
      return <LiveMapArt className={anim} />;
  }
}
