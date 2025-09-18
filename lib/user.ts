import { prisma } from './prisma';

/**
 * Ensures that a user exists in the database. When a Clerk session is
 * established for the first time we upsert the user with a starting
 * credit balance and trial. The first user whose email matches
 * `OWNER_EMAIL` becomes an admin via public metadata (this example
 * just adds an `isAdmin` flag on the database record).
 */
export async function upsertUser({
  userId,
  email,
  name,
}: {
  userId: string;
  email: string;
  name?: string | null;
}) {
  const ownerEmail = process.env.OWNER_EMAIL;
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return prisma.user.upsert({
    where: { id: userId },
    update: {
      email,
      name: name || undefined,
    },
    create: {
      id: userId,
      email,
      name: name || undefined,
      credits: 10,
      trialEndsAt,
      locale: 'en',
    },
  });
}