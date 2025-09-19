import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimiter';
import { generateEmail } from '@/lib/openai';
import { scrapeSite } from '@/lib/siteScraper';
import { upsertUser } from '@/lib/user';

// ✅ utilitaire de normalisation
function normalizeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const blocklist = ['localhost', '127.0.0.1', '0.0.0.0'];
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (blocklist.includes(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  console.log("🔵 [/api/generate] Request received");

  const { userId } = auth();
  if (!userId) {
    console.warn("❌ Unauthorized: no userId");
    return new NextResponse('Unauthorized', { status: 401 });
  }
  console.log("✅ Authenticated user:", userId);

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await rateLimit(`${userId}-${ip}`);
  if (!success) {
    console.warn(`❌ Rate limit exceeded for ${userId} from ${ip}`);
    return new NextResponse('Too many requests', { status: 429 });
  }

  // Parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    console.error("❌ Invalid JSON body");
    return new NextResponse('Invalid JSON body', { status: 400 });
  }

  const rawUrl = body.url;
  const url = rawUrl ? normalizeUrl(rawUrl) : '';
  const { serviceAngle, recentUpdate, locale, tone } = body || {};

  console.log("📥 Input:", { url, serviceAngle, recentUpdate, locale, tone });

  if (!url || typeof url !== 'string' || !isValidUrl(url)) {
    console.error("❌ Invalid URL after normalization:", url);
    return new NextResponse('Invalid URL', { status: 400 });
  }
  if (!serviceAngle || typeof serviceAngle !== 'string') {
    console.error("❌ Missing serviceAngle");
    return new NextResponse('Service angle is required', { status: 400 });
  }

  // Upsert user in DB
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress || '';
  await upsertUser({ userId, email, name: clerkUser?.firstName || '' });

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscriptions: true },
  });
  if (!dbUser) {
    console.error("❌ User not found in DB:", userId);
    return new NextResponse('User not found', { status: 404 });
  }
  console.log("✅ User in DB:", { credits: dbUser.credits });

  // Credits / subscription check
  const now = new Date();
  const trialActive = dbUser.trialEndsAt && dbUser.trialEndsAt > now;
  const activeSub = dbUser.subscriptions.some(
    (s) =>
      s.status &&
      ['active', 'trialing', 'past_due'].includes(s.status) &&
      (!s.currentPeriodEnd || s.currentPeriodEnd > now)
  );
  if (dbUser.credits <= 0 && !trialActive && !activeSub) {
    console.warn("❌ Insufficient credits for user:", userId);
    return new NextResponse('Insufficient credits', { status: 402 });
  }

  console.log("🔎 Scraping site:", url);
  const signals = await scrapeSite(url);
  console.log("✅ Scraped signals:", signals);

  try {
    console.log("🤖 Calling OpenAI generateEmail...");
    const result = await generateEmail({ url, serviceAngle, recentUpdate, locale, tone });
    console.log("✅ OpenAI result received:", result.subject);

    // Save audit
    await prisma.audit.create({
      data: {
        userId,
        url,
        serviceAngle: serviceAngle.replace(/\s+/g, '_').toUpperCase() as any,
        inputLocale: locale || 'en',
        recentUpdate: recentUpdate || null,
        resultJson: result,
      },
    });
    console.log("✅ Audit saved");

    // Decrement credits
    if (!trialActive || activeSub) {
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: 1 } },
      });
      console.log("✅ Credits decremented");
    }

    // Log event
    await prisma.event.create({
      data: {
        userId,
        type: 'audit.created',
        meta: { url, serviceAngle },
      },
    });
    console.log("✅ Event logged");

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("❌ Error during generation:", err);
    return new NextResponse('Generation failed: ' + err.message, { status: 500 });
  }
}