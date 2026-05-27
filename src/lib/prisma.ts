import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

// Reuse the client across warm serverless invocations and dev hot-reloads to avoid
// opening a fresh connection (and exhausting the Neon pool) on every request.
globalForPrisma.prisma = prisma;
