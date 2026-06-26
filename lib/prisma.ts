import { PrismaClient } from "@prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

// PrismaNeonHttp sends every query as a stateless HTTP POST to Neon's
// serverless proxy. Unlike the pg/WebSocket adapters, there is no persistent
// TCP connection to establish — so Neon's compute cold-start (~20s on the
// free tier) is handled server-side by Neon's proxy, not timed-out by the
// client or Vercel's function runner.
//
// Note: PrismaNeonHttp does not support interactive transactions (no BEGIN/
// COMMIT). None of the routes here use transactions — they rely on independent
// deleteMany/update calls instead (see poll/route.ts comment).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaNeonHttp(connectionString, {});
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
