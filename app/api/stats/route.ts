import { prisma } from "@/lib/prisma";
import { STALE_MS, SIGNAL_TTL_MS } from "@/lib/presence";
import { activeRegionCount, utcStartOfDay } from "@/lib/stats";
import type { GateStatsResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/stats — live gate metrics (no session id required).
export async function GET() {
  const now = Date.now();
  const staleCutoff = new Date(now - STALE_MS);
  const signalCutoff = new Date(now - SIGNAL_TTL_MS);

  await prisma.presence.deleteMany({
    where: { lastSeen: { lt: staleCutoff } },
  });
  await prisma.signal.deleteMany({
    where: { createdAt: { lt: signalCutoff } },
  });

  const peers = await prisma.presence.findMany({
    where: { lastSeen: { gte: staleCutoff } },
    select: { lat: true, lng: true },
  });

  const connectionsToday = await prisma.signal.count({
    where: {
      type: "accept",
      createdAt: { gte: utcStartOfDay(new Date(now)) },
    },
  });

  const response: GateStatsResponse = {
    strangersOnline: peers.length,
    connectionsToday,
    countries: activeRegionCount(peers),
  };

  return Response.json(response);
}
