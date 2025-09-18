import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { upsertUser } from '@/lib/user';

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  // Fetch Clerk user to get email and name
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  // Ensure the user exists in our database
  await upsertUser({ userId, email: email || '', name: clerkUser.firstName || '' });
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscriptions: true },
  });
  if (!dbUser) {
    return new NextResponse('Not found', { status: 404 });
  }
  const now = new Date();
  const activeSub = dbUser.subscriptions.find(
    (s) =>
      s.status &&
      ['active', 'trialing', 'past_due'].includes(s.status) &&
      (!s.currentPeriodEnd || s.currentPeriodEnd > now)
  );
  return NextResponse.json({
    id: dbUser.id,
    email: dbUser.email,
    credits: dbUser.credits,
    trialEndsAt: dbUser.trialEndsAt,
    hasActiveSub: !!activeSub,
  });
}