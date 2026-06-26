// Shared helpers for gate / dashboard live stats.

/** Coarse lat/lng buckets — approximates distinct regions without a geo DB. */
export function activeRegionCount(
  peers: { lat: number; lng: number }[],
): number {
  const regions = new Set<string>();
  for (const { lat, lng } of peers) {
    regions.add(`${Math.floor(lat / 12)}:${Math.floor(lng / 18)}`);
  }
  return regions.size;
}

export function utcStartOfDay(now = new Date()): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
