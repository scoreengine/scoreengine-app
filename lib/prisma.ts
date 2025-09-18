import { PrismaClient } from '@prisma/client';

// When using Prisma in Next.js, it's important to avoid instantiating
// a new client on every hot reload. We attach the client to the global
// object in development and reuse the existing instance if present.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}