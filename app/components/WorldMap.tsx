"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Map as MapboxMap, Marker, GeoJSONSource } from "mapbox-gl";
import type { ConnectionLine, DisconnectAnimation, MessageOrb, PeerDot } from "@/lib/types";

const TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
  "pk.eyJ1IjoicHVsc2UtbWFwIiwiYSI6ImNrMDBkZW1vMDAwMDAwMDAifQ.AAAAAAAAAAAAAAAAAAAAAA";

const GLOBE_CENTER: [number, number] = [0, 20];
const GLOBE_ZOOM = 1.0;
const USER_ZOOM = 10;
const ROTATE_DURATION_MS = 2800;
const FLY_DURATION_MS = 2500;
const ORB_TRAVEL_MS = 1600;
const DISCONNECT_MS = 1500;

const CONNECTION_SOURCE = "pulse-connection";
const CONNECTION_GLOW = "pulse-connection-glow";
const CONNECTION_CORE = "pulse-connection-core";

/** Marching dot sequence — round caps turn short dashes into glowing beads. */
const MARCHING_DOTS: number[][] = [
  [0, 4, 3, 4],
  [0.5, 4, 2.5, 4],
  [1, 4, 2, 4],
  [1.5, 4, 1.5, 4],
  [2, 4, 1, 4],
  [2.5, 4, 0.5, 4],
  [3, 4, 0, 4],
  [0, 0.5, 3, 3.5],
  [0, 1, 3, 3],
  [0, 1.5, 3, 2.5],
  [0, 2, 3, 2],
  [0, 2.5, 3, 1.5],
  [0, 3, 3, 1],
  [0, 3.5, 3, 0.5],
];

const VISUAL = {
  pending: {
    core: "#fdba74",
    glow: "#f97316",
    coreWidth: 3.5,
    glowWidth: 16,
    glowOpacity: 0.5,
    dotGap: [0, 5] as number[],
  },
  connected: {
    start: "#6ee7b7",
    mid: "#2dd4bf",
    end: "#22d3ee",
    glow: "#34d399",
    coreWidth: 4,
    glowWidth: 16,
    glowOpacity: 0.55,
  },
  rejected: {
    core: "#fca5a5",
    glow: "#f87171",
    coreWidth: 2.5,
    glowWidth: 10,
    glowOpacity: 0.35,
    dotGap: [0, 4] as number[],
  },
  disconnect: {
    glow: "#dc2626",
    coreWidth: 4,
    glowWidth: 22,
    glowOpacity: 0.65,
  },
} as const;

function applyDisconnectLineStyle(map: MapboxMap) {
  const d = VISUAL.disconnect;
  map.setPaintProperty(CONNECTION_GLOW, "line-color", d.glow);
  map.setPaintProperty(CONNECTION_GLOW, "line-width", d.glowWidth);
  map.setPaintProperty(CONNECTION_GLOW, "line-opacity", d.glowOpacity);
  map.setPaintProperty(CONNECTION_GLOW, "line-blur", 2.5);
  map.setPaintProperty(CONNECTION_GLOW, "line-dasharray", [1, 0]);
  map.setPaintProperty(CONNECTION_GLOW, "line-trim-offset", [0, 0]);

  map.setPaintProperty(CONNECTION_CORE, "line-width", d.coreWidth);
  map.setPaintProperty(CONNECTION_CORE, "line-dasharray", [1, 0]);
  map.setPaintProperty(CONNECTION_CORE, "line-blur", 0);
  map.setPaintProperty(CONNECTION_CORE, "line-trim-offset", [0, 0]);
  map.setPaintProperty(CONNECTION_CORE, "line-opacity", 1);
  map.setPaintProperty(CONNECTION_CORE, "line-gradient", [
    "interpolate",
    ["linear"],
    ["line-progress"],
    0,
    "#b91c1c",
    0.15,
    "#ef4444",
    0.5,
    "#fecaca",
    0.85,
    "#ef4444",
    1,
    "#b91c1c",
  ]);
}

function ensureConnectionLayers(map: MapboxMap) {
  if (map.getSource(CONNECTION_SOURCE)) return;

  map.addSource(CONNECTION_SOURCE, {
    type: "geojson",
    lineMetrics: true,
    data: { type: "FeatureCollection", features: [] },
  });

  map.addLayer({
    id: CONNECTION_GLOW,
    type: "line",
    source: CONNECTION_SOURCE,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": VISUAL.pending.glow,
      "line-width": VISUAL.pending.glowWidth,
      "line-opacity": VISUAL.pending.glowOpacity,
      "line-blur": 1.2,
    },
  });

  map.addLayer({
    id: CONNECTION_CORE,
    type: "line",
    source: CONNECTION_SOURCE,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": VISUAL.pending.core,
      "line-width": VISUAL.pending.coreWidth,
      "line-opacity": 1,
      "line-dasharray": VISUAL.pending.dotGap,
    },
  });
}

function applyConnectionVisuals(
  map: MapboxMap,
  status: ConnectionLine["status"],
) {
  if (status === "connected") {
    const c = VISUAL.connected;
    map.setPaintProperty(CONNECTION_GLOW, "line-color", c.glow);
    map.setPaintProperty(CONNECTION_GLOW, "line-width", c.glowWidth);
    map.setPaintProperty(CONNECTION_GLOW, "line-opacity", c.glowOpacity);
    map.setPaintProperty(CONNECTION_GLOW, "line-blur", 1.5);
    map.setPaintProperty(CONNECTION_GLOW, "line-dasharray", [1, 0]);

    map.setPaintProperty(CONNECTION_CORE, "line-width", c.coreWidth);
    map.setPaintProperty(CONNECTION_CORE, "line-opacity", 0.95);
    map.setPaintProperty(CONNECTION_CORE, "line-blur", 0);
    map.setPaintProperty(CONNECTION_CORE, "line-dasharray", [1, 0]);
    map.setPaintProperty(CONNECTION_CORE, "line-gradient", [
      "interpolate",
      ["linear"],
      ["line-progress"],
      0,
      c.start,
      0.5,
      c.mid,
      1,
      c.end,
    ]);
    return;
  }

  const v = VISUAL[status];
  // Reset gradient so solid line-color applies again on dot states.
  map.setPaintProperty(CONNECTION_CORE, "line-gradient", undefined);
  map.setPaintProperty(CONNECTION_CORE, "line-color", v.core);
  map.setPaintProperty(CONNECTION_CORE, "line-width", v.coreWidth);
  map.setPaintProperty(CONNECTION_CORE, "line-opacity", status === "rejected" ? 0.85 : 1);
  map.setPaintProperty(CONNECTION_CORE, "line-blur", 0);
  map.setPaintProperty(
    CONNECTION_CORE,
    "line-dasharray",
    "dotGap" in v ? v.dotGap : [0, 5],
  );

  map.setPaintProperty(CONNECTION_GLOW, "line-color", v.glow);
  map.setPaintProperty(CONNECTION_GLOW, "line-width", v.glowWidth);
  map.setPaintProperty(CONNECTION_GLOW, "line-opacity", v.glowOpacity);
  map.setPaintProperty(CONNECTION_GLOW, "line-blur", status === "pending" ? 2.5 : 1);
  map.setPaintProperty(CONNECTION_GLOW, "line-dasharray", [1, 0]);
}

function setConnectionLineGeo(
  map: MapboxMap,
  me: { lat: number; lng: number },
  peer: { lat: number; lng: number },
  status: ConnectionLine["status"],
) {
  ensureConnectionLayers(map);
  const source = map.getSource(CONNECTION_SOURCE) as GeoJSONSource;
  source.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { status },
        geometry: {
          type: "LineString",
          coordinates: [
            [me.lng, me.lat],
            [peer.lng, peer.lat],
          ],
        },
      },
    ],
  });
  applyConnectionVisuals(map, status);
}

function clearConnectionLine(map: MapboxMap) {
  const source = map.getSource(CONNECTION_SOURCE) as GeoJSONSource | undefined;
  if (source) {
    source.setData({ type: "FeatureCollection", features: [] });
  }
}

function startLineAnimation(
  map: MapboxMap,
  status: ConnectionLine["status"],
  reducedMotion: boolean,
): () => void {
  if (reducedMotion) return () => {};

  let raf = 0;
  let dashStep = 0;
  let lastDashAt = 0;
  const t0 = performance.now();

  const tick = (now: number) => {
    const elapsed = now - t0;

    if (status === "pending") {
      if (now - lastDashAt > 90) {
        dashStep = (dashStep + 1) % MARCHING_DOTS.length;
        map.setPaintProperty(
          CONNECTION_CORE,
          "line-dasharray",
          MARCHING_DOTS[dashStep],
        );
        lastDashAt = now;
      }
      map.setPaintProperty(
        CONNECTION_GLOW,
        "line-opacity",
        0.42 + 0.28 * Math.sin(elapsed * 0.004),
      );
      map.setPaintProperty(
        CONNECTION_GLOW,
        "line-width",
        VISUAL.pending.glowWidth + 2 * Math.sin(elapsed * 0.003),
      );
    } else if (status === "connected") {
      map.setPaintProperty(
        CONNECTION_GLOW,
        "line-opacity",
        0.48 + 0.12 * Math.sin(elapsed * 0.0025),
      );
      map.setPaintProperty(
        CONNECTION_GLOW,
        "line-width",
        VISUAL.connected.glowWidth + Math.sin(elapsed * 0.002) * 2,
      );
    } else if (status === "rejected") {
      const fade = 0.35 + 0.25 * Math.sin(elapsed * 0.012);
      map.setPaintProperty(CONNECTION_CORE, "line-opacity", fade);
      map.setPaintProperty(CONNECTION_GLOW, "line-opacity", fade * 0.6);
    }

    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function clampTrimOffset(n: number): number {
  return Math.max(0, Math.min(0.5, n));
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - clamp01(t), 3);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpCoord(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  t: number,
) {
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}

function animateMessageOrb(
  map: MapboxMap,
  orb: MessageOrb,
  reducedMotion: boolean,
  onComplete: () => void,
): () => void {
  const { from, to } = orb;

  // Mapbox positions the outer wrapper via transform — animate the inner orb only.
  const wrap = document.createElement("div");
  wrap.className = "pulse-msg-orb-wrap";
  const el = document.createElement("div");
  el.className = `pulse-msg-orb pulse-msg-orb--${orb.direction}`;
  el.setAttribute("aria-hidden", "true");
  wrap.appendChild(el);

  let marker: Marker | null = null;
  let raf = 0;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    marker?.remove();
    marker = null;
    onComplete();
  };

  const stop = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    marker?.remove();
    marker = null;
  };

  (async () => {
    const mapboxgl = (await import("mapbox-gl")).default;
    if (finished) return;

    marker = new mapboxgl.Marker({ element: wrap, anchor: "center" })
      .setLngLat([from.lng, from.lat])
      .addTo(map);

    if (reducedMotion) {
      marker.setLngLat([to.lng, to.lat]);
      window.setTimeout(finish, 120);
      return;
    }

    const t0 = performance.now();
    const tick = (now: number) => {
      if (finished || !marker) return;
      const raw = Math.min((now - t0) / ORB_TRAVEL_MS, 1);
      const t = easeOutCubic(raw);
      const pos = lerpCoord(from, to, t);
      marker.setLngLat([pos.lng, pos.lat]);

      const scale = raw < 0.12 ? raw / 0.12 : raw > 0.88 ? (1 - raw) / 0.12 : 1;
      el.style.transform = `scale(${0.65 + scale * 0.55})`;
      el.style.opacity = raw > 0.92 ? String((1 - raw) / 0.08) : "1";

      if (raw < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        finish();
      }
    };
    raf = requestAnimationFrame(tick);
  })();

  return stop;
}

function playDisconnectAnimation(
  map: MapboxMap,
  me: { lat: number; lng: number },
  peer: { lat: number; lng: number },
  _wasConnected: boolean,
  reducedMotion: boolean,
  onComplete: () => void,
): () => void {
  ensureConnectionLayers(map);
  setConnectionLineGeo(map, me, peer, "connected");
  applyDisconnectLineStyle(map);

  if (reducedMotion) {
    clearConnectionLine(map);
    onComplete();
    return () => {};
  }

  const mid = lerpCoord(me, peer, 0.5);
  let raf = 0;
  let finished = false;
  const markers: Marker[] = [];

  const cleanup = () => {
    cancelAnimationFrame(raf);
    for (const m of markers) m.remove();
    markers.length = 0;
    map.setPaintProperty(CONNECTION_CORE, "line-trim-offset", [0, 0]);
    map.setPaintProperty(CONNECTION_GLOW, "line-trim-offset", [0, 0]);
    clearConnectionLine(map);
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    cleanup();
    onComplete();
  };

  const stop = () => {
    if (finished) return;
    finished = true;
    cleanup();
  };

  (async () => {
    const mapboxgl = (await import("mapbox-gl")).default;
    if (finished) return;

    const makeMarker = (className: string, lng: number, lat: number) => {
      const wrap = document.createElement("div");
      wrap.className = "pulse-disconnect-wrap";
      const el = document.createElement("div");
      el.className = className;
      wrap.appendChild(el);
      const marker = new mapboxgl.Marker({ element: wrap, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);
      markers.push(marker);
      return { marker, el };
    };

    const burst = makeMarker("pulse-disconnect-burst", mid.lng, mid.lat);
    const emberMe = makeMarker("pulse-disconnect-ember", me.lng, me.lat);
    const emberPeer = makeMarker("pulse-disconnect-ember", peer.lng, peer.lat);

    burst.el.style.opacity = "0";
    burst.el.style.transform = "scale(0)";
    emberMe.el.style.opacity = "0";
    emberPeer.el.style.opacity = "0";

    const t0 = performance.now();
    const tick = (now: number) => {
      if (finished) return;
      const raw = clamp01((now - t0) / DISCONNECT_MS);

      // Red line recedes from both endpoints toward the center.
      const trimT = easeInOutCubic(clamp01(raw / 0.82));
      const trim = clampTrimOffset(trimT * 0.5);
      map.setPaintProperty(CONNECTION_CORE, "line-trim-offset", [trim, trim]);
      map.setPaintProperty(CONNECTION_GLOW, "line-trim-offset", [trim, trim]);

      // Remaining center segment fades out as it collapses.
      const remnantFade =
        raw < 0.55 ? 1 : clamp01(1 - easeOutCubic((raw - 0.55) / 0.45));
      map.setPaintProperty(CONNECTION_CORE, "line-opacity", remnantFade);
      map.setPaintProperty(
        CONNECTION_GLOW,
        "line-opacity",
        clamp01(VISUAL.disconnect.glowOpacity * remnantFade),
      );
      map.setPaintProperty(
        CONNECTION_GLOW,
        "line-width",
        VISUAL.disconnect.glowWidth * (0.85 + remnantFade * 0.15),
      );

      // Embers travel from each pin inward to the meeting point.
      const emberT = easeOutCubic(clamp01(raw / 0.72));
      const mePos = lerpCoord(me, mid, emberT);
      const peerPos = lerpCoord(peer, mid, emberT);
      emberMe.marker.setLngLat([mePos.lng, mePos.lat]);
      emberPeer.marker.setLngLat([peerPos.lng, peerPos.lat]);
      const emberFade =
        raw < 0.05 ? raw / 0.05 : raw > 0.68 ? clamp01(1 - (raw - 0.68) / 0.2) : 1;
      emberMe.el.style.opacity = String(emberFade);
      emberPeer.el.style.opacity = String(emberFade);
      const emberScale = 0.5 + (1 - emberT) * 0.6;
      emberMe.el.style.transform = `scale(${emberScale})`;
      emberPeer.el.style.transform = `scale(${emberScale})`;

      // Final red flash where the line vanishes.
      const burstRaw = clamp01((raw - 0.58) / 0.42);
      const burstScale = easeOutCubic(burstRaw) * 2.4;
      const burstFade =
        burstRaw < 0.35
          ? burstRaw / 0.35
          : clamp01(1 - (burstRaw - 0.35) / 0.65);
      burst.marker.setLngLat([mid.lng, mid.lat]);
      burst.el.style.transform = `scale(${burstScale})`;
      burst.el.style.opacity = String(burstFade);

      if (raw < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        finish();
      }
    };

    raf = requestAnimationFrame(tick);
  })();

  return stop;
}

function dotColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function lockMapInteraction(map: MapboxMap) {
  map.dragPan.disable();
  map.dragRotate.disable();
  map.scrollZoom.disable();
  map.boxZoom.disable();
  map.doubleClickZoom.disable();
  map.touchZoomRotate.disable();
}

function unlockMapInteraction(map: MapboxMap) {
  map.dragPan.enable();
  map.dragRotate.enable();
  map.scrollZoom.enable();
  map.boxZoom.enable();
  map.doubleClickZoom.enable();
  map.touchZoomRotate.enable();
}

// Rotate the globe horizontally (around its pole axis) by animating longitude —
// not bearing, which tilts the view on a diagonal axis on globe projection.
function rotateGlobe(
  map: MapboxMap,
  durationMs: number,
  onComplete: () => void,
): () => void {
  const { lng: startLng, lat } = map.getCenter();
  const zoom = map.getZoom();
  const t0 = performance.now();
  let frameId = 0;

  const tick = (now: number) => {
    const t = Math.min((now - t0) / durationMs, 1);
    const lng = startLng + 360 * easeInOutCubic(t);
    map.jumpTo({ center: [lng, lat], zoom, pitch: 0, bearing: 0 });
    if (t < 1) {
      frameId = requestAnimationFrame(tick);
    } else {
      onComplete();
    }
  };

  frameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frameId);
}

export default function WorldMap({
  peers,
  me,
  connectionLine,
  disconnectAnim,
  onDisconnectComplete,
  messageOrbs,
  onMessageOrbComplete,
  onPeerClick,
  canConnect,
}: {
  peers: PeerDot[];
  me: { lat: number; lng: number } | null;
  connectionLine: ConnectionLine | null;
  disconnectAnim: DisconnectAnimation | null;
  onDisconnectComplete: () => void;
  messageOrbs: MessageOrb[];
  onMessageOrbComplete: (id: string) => void;
  onPeerClick: (id: string) => void;
  canConnect: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const meMarkerRef = useRef<Marker | null>(null);
  const introDoneRef = useRef(false);
  const flyStartedRef = useRef(false);
  const rotateCompleteRef = useRef(false);
  const meCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const cancelRotateRef = useRef<(() => void) | null>(null);
  const peerCoordsCache = useRef<Map<string, { lat: number; lng: number }>>(
    new Map(),
  );
  const lineAnimStopRef = useRef<(() => void) | null>(null);
  const disconnectStopRef = useRef<(() => void) | null>(null);
  const orbAnimStopsRef = useRef<Map<string, () => void>>(new Map());
  const onOrbCompleteRef = useRef(onMessageOrbComplete);
  const onDisconnectCompleteRef = useRef(onDisconnectComplete);
  const [ready, setReady] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);

  const onPeerClickRef = useRef(onPeerClick);
  const canConnectRef = useRef(canConnect);
  useEffect(() => {
    onPeerClickRef.current = onPeerClick;
    canConnectRef.current = canConnect;
    onOrbCompleteRef.current = onMessageOrbComplete;
    onDisconnectCompleteRef.current = onDisconnectComplete;
  });

  function tryFlyToUser(map: MapboxMap) {
    if (flyStartedRef.current || introDoneRef.current) return;
    if (!rotateCompleteRef.current || !meCoordsRef.current) return;

    flyStartedRef.current = true;
    const { lat, lng } = meCoordsRef.current;
    const reduced = prefersReducedMotion();

    map.flyTo({
      center: [lng, lat],
      zoom: USER_ZOOM,
      duration: reduced ? 800 : FLY_DURATION_MS,
      essential: true,
    });

    map.once("moveend", () => {
      if (introDoneRef.current) return;
      introDoneRef.current = true;
      setIntroComplete(true);
      unlockMapInteraction(map);
    });
  }

  // Initialise the map at full globe zoom.
  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    let cancelled = false;
    const markers = markersRef.current;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: GLOBE_CENTER,
        zoom: GLOBE_ZOOM,
        pitch: 0,
        bearing: 0,
        attributionControl: true,
      });

      map.on("load", () => {
        if (cancelled) return;
        map.setProjection("globe");
        map.setFog({
          color: "rgb(5, 5, 8)",
          "high-color": "rgb(12, 12, 20)",
          "horizon-blend": 0.08,
          "space-color": "rgb(0, 0, 0)",
          "star-intensity": 0.15,
        });
        setReady(true);
        lockMapInteraction(map);

        if (prefersReducedMotion()) {
          rotateCompleteRef.current = true;
          tryFlyToUser(map);
          return;
        }

        cancelRotateRef.current = rotateGlobe(map, ROTATE_DURATION_MS, () => {
          rotateCompleteRef.current = true;
          tryFlyToUser(map);
        });
      });

      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      cancelRotateRef.current?.();
      cancelRotateRef.current = null;
      lineAnimStopRef.current?.();
      lineAnimStopRef.current = null;
      disconnectStopRef.current?.();
      disconnectStopRef.current = null;
      orbAnimStopsRef.current.forEach((stop) => stop());
      orbAnimStopsRef.current.clear();
      markers.forEach((m) => m.remove());
      markers.clear();
      meMarkerRef.current?.remove();
      meMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
      flyStartedRef.current = false;
      introDoneRef.current = false;
      rotateCompleteRef.current = false;
      meCoordsRef.current = null;
    };
  }, []);

  // Store location and fly only after the full globe rotation finishes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !me) return;
    meCoordsRef.current = me;
    tryFlyToUser(map);
  }, [me, ready]);

  // User pin — visible during rotation once location is known.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !me) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      if (!meMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "pulse-me";
        el.title = "You are here";
        el.innerHTML = `<span class="pulse-me-label">Me</span>📍`;
        meMarkerRef.current = new mapboxgl.Marker({
          element: el,
          anchor: "bottom",
        })
          .setLngLat([me.lng, me.lat])
          .addTo(map);
      } else {
        meMarkerRef.current.setLngLat([me.lng, me.lat]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me, ready]);

  // Peer dots — only after intro completes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !introComplete) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      const markers = markersRef.current;
      const seen = new Set<string>();

      for (const peer of peers) {
        seen.add(peer.id);
        let marker = markers.get(peer.id);
        if (!marker) {
          const el = document.createElement("button");
          el.className = "pulse-dot";
          el.style.background = dotColor(peer.id);
          el.title = peer.busy ? "In a conversation" : "Tap to connect";
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            if (canConnectRef.current && el.dataset.busy !== "1") {
              onPeerClickRef.current(peer.id);
            }
          });
          marker = new mapboxgl.Marker({ element: el })
            .setLngLat([peer.lng, peer.lat])
            .addTo(map);
          markers.set(peer.id, marker);
        }
        const el = marker.getElement();
        el.dataset.busy = peer.busy ? "1" : "0";
        el.style.opacity = peer.busy ? "0.35" : "1";
        el.style.cursor = peer.busy ? "not-allowed" : "pointer";
        el.title = peer.busy ? "In a conversation" : "Tap to connect";
      }

      for (const [id, marker] of markers) {
        if (!seen.has(id)) {
          marker.remove();
          markers.delete(id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [peers, ready, introComplete]);

  // Line from me → peer with glow + dot/bead styling per status.
  useEffect(() => {
    const map = mapRef.current;
    lineAnimStopRef.current?.();
    lineAnimStopRef.current = null;

    if (!map || !ready || !introComplete || !me) {
      return;
    }

    for (const p of peers) {
      peerCoordsCache.current.set(p.id, { lat: p.lat, lng: p.lng });
    }

    if (!connectionLine) {
      if (!disconnectAnim) clearConnectionLine(map);
      return;
    }

    const peer =
      peers.find((p) => p.id === connectionLine.peerId) ??
      (peerCoordsCache.current.has(connectionLine.peerId)
        ? {
            id: connectionLine.peerId,
            ...peerCoordsCache.current.get(connectionLine.peerId)!,
            busy: false,
          }
        : null);

    if (!peer) {
      clearConnectionLine(map);
      return;
    }

    setConnectionLineGeo(map, me, peer, connectionLine.status);
    lineAnimStopRef.current = startLineAnimation(
      map,
      connectionLine.status,
      prefersReducedMotion(),
    );

    return () => {
      lineAnimStopRef.current?.();
      lineAnimStopRef.current = null;
    };
  }, [connectionLine, disconnectAnim, me, peers, ready, introComplete]);

  // End connection: line implodes, burst at center, shards return to each pin.
  useEffect(() => {
    const map = mapRef.current;
    disconnectStopRef.current?.();
    disconnectStopRef.current = null;
    lineAnimStopRef.current?.();
    lineAnimStopRef.current = null;

    if (!map || !ready || !introComplete || !disconnectAnim) return;

    disconnectStopRef.current = playDisconnectAnimation(
      map,
      disconnectAnim.me,
      disconnectAnim.peer,
      disconnectAnim.wasConnected,
      prefersReducedMotion(),
      () => {
        disconnectStopRef.current = null;
        onDisconnectCompleteRef.current();
      },
    );

    return () => {
      disconnectStopRef.current?.();
      disconnectStopRef.current = null;
    };
  }, [disconnectAnim, ready, introComplete]);

  // Glowing orbs travel me ↔ peer when chat messages are sent or received.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !introComplete) return;

    const active = orbAnimStopsRef.current;

    for (const orb of messageOrbs) {
      if (active.has(orb.id)) continue;

      const stop = animateMessageOrb(
        map,
        orb,
        prefersReducedMotion(),
        () => {
          active.delete(orb.id);
          onOrbCompleteRef.current(orb.id);
        },
      );
      active.set(orb.id, stop);
    }

    for (const [id, stop] of active) {
      if (!messageOrbs.some((o) => o.id === id)) {
        stop();
        active.delete(id);
      }
    }
  }, [messageOrbs, ready, introComplete]);

  return (
    <div className="absolute inset-0 bg-black">
      <div ref={containerRef} className="h-full w-full bg-black" />

      {!TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="max-w-md rounded-lg bg-zinc-800 p-4 text-sm text-zinc-200">
            Set{" "}
            <code className="text-emerald-400">NEXT_PUBLIC_MAPBOX_TOKEN</code>{" "}
            in <code>.env</code> to load the map.
          </p>
        </div>
      )}

      {introComplete && (
        <div className="pointer-events-none absolute top-4 left-4 z-10 rounded-full bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-zinc-100 shadow-lg backdrop-blur">
          {peers.length} online
        </div>
      )}
    </div>
  );
}
