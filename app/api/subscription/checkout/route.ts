import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createCheckoutLink } from '@/lib/lemonSqueezy';

export async function POST() {
  const { userId } = auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  try {
    const priceId = process.env.LEMON_SQUEEZY_PRICE_ID_SUBSCRIPTION;
    if (!priceId) {
      throw new Error('Subscription price ID not configured');
    }
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing`;
    const url = await createCheckoutLink({
      priceId,
      variant: 'subscription',
      successUrl,
      cancelUrl,
      metadata: { userId },
    });
    return NextResponse.json({ url });
  } catch (err: any) {
    return new NextResponse('Failed to create checkout: ' + err.message, { status: 500 });
  }
}