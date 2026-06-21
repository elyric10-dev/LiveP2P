"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import type { PeerDot } from "@/lib/types";

const TOKEN =
  process.env.NEXT_PUBLIC_MAPBOX_TOKEN ??
  "pk.eyJ1IjoicHVsc2UtbWFwIiwiYSI6ImNrMDBkZW1vMDAwMDAwMDAifQ.AAAAAAAAAAAAAAAAAAAAAA";

const GLOBE_CENTER: [number, number] = [0, 20];
const GLOBE_ZOOM = 1.0;
const USER_ZOOM = 10;
const ROTATE_DURATION_MS = 2800;
const FLY_DURATION_MS = 2500;

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

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
  onPeerClick,
  canConnect,
}: {
  peers: PeerDot[];
  me: { lat: number; lng: number } | null;
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
  const [ready, setReady] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);

  const onPeerClickRef = useRef(onPeerClick);
  const canConnectRef = useRef(canConnect);
  useEffect(() => {
    onPeerClickRef.current = onPeerClick;
    canConnectRef.current = canConnect;
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
