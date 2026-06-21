// Privacy offset: move a real coordinate 1–3 km in a random direction so the
// dot is placed *near* the user, never at their exact location. When sessionId
// is provided the offset is deterministic so refresh/re-join lands on the same dot.

const KM_PER_DEG_LAT = 111.32;

function hashSession(sessionId: string): number {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function applyPrivacyOffset(
  lat: number,
  lng: number,
  sessionId?: string,
): { lat: number; lng: number } {
  let distanceKm: number;
  let bearing: number;

  if (sessionId) {
    const h = hashSession(sessionId);
    distanceKm = 1 + ((h % 10_000) / 10_000) * 2;
    bearing = ((h >> 12) % 10_000) / 10_000 * 2 * Math.PI;
  } else {
    distanceKm = 1 + Math.random() * 2;
    bearing = Math.random() * 2 * Math.PI;
  }

  const dLat = (distanceKm * Math.cos(bearing)) / KM_PER_DEG_LAT;
  const latRad = (lat * Math.PI) / 180;
  const dLng =
    (distanceKm * Math.sin(bearing)) /
    (KM_PER_DEG_LAT * Math.cos(latRad) || KM_PER_DEG_LAT);

  return {
    lat: clamp(lat + dLat, -90, 90),
    lng: wrapLng(lng + dLng),
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function wrapLng(lng: number): number {
  // Keep longitude in [-180, 180].
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
