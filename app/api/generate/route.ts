import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimiter';
import { generateEmail } from '@/lib/openai';
import { scrapeSite } from '@/lib/siteScraper';
import { upsertUser } from '@/lib/user';

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    // Disallow internal addresses
    const blocklist = ['localhost', '127.0.0.1', '0.0.0.0'];
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (blocklist.includes(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  // Apply rate limiting per user and per IP
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await rateLimit(`${userId}-${ip}`);
  if (!success) {
    return new NextResponse('Too many requests', { status: 429 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new NextResponse('Invalid JSON body', { status: 400 });
  }
  const { url, serviceAngle, recentUpdate, locale, tone } = body || {};
  if (!url || typeof url !== 'string' || !isValidUrl(url)) {
    return new NextResponse('Invalid URL', { status: 400 });
  }
  if (!serviceAngle || typeof serviceAngle !== 'string') {
    return new NextResponse('Service angle is required', { status: 400 });
  }
  // Upsert user in DB to ensure we have a record
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress || '';
  await upsertUser({ userId, email, name: clerkUser?.firstName || '' });
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscriptions: true },
  });
  if (!dbUser) {
    return new NextResponse('User not found', { status: 404 });
  }
  // Check credits/trial/subscription
  const now = new Date();
  const trialActive = dbUser.trialEndsAt && dbUser.trialEndsAt > now;
  const activeSub = dbUser.subscriptions.some(
    (s) =>
      s.status &&
      ['active', 'trialing', 'past_due'].includes(s.status) &&
      (!s.currentPeriodEnd || s.currentPeriodEnd > now)
  );
  if (dbUser.credits <= 0 && !trialActive && !activeSub) {
    return new NextResponse('Insufficient credits', { status: 402 });
  }
  // Scrape site signals
  const signals = await scrapeSite(url);
  try {
    const result = await generateEmail({ url, serviceAngle, recentUpdate, locale, tone });
    // Record audit in DB
    await prisma.audit.create({
      data: {
        userId,
        url,
        serviceAngle: serviceAngle
          .replace(/\s+/g, '_')
          .toUpperCase() as any,
        inputLocale: locale || 'en',
        recentUpdate: recentUpdate || null,
        resultJson: result,
      },
    });
    // Decrement credits if applicable
    if (!trialActive || activeSub) {
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: 1 } },
      });
    }
    // Log event
    await prisma.event.create({
      data: {
        userId,
        type: 'audit.created',
        meta: { url, serviceAngle },
      },
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return new NextResponse('Generation failed: ' + err.message, { status: 500 });
  }
}