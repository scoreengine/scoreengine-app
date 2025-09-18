import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createCheckoutLink } from '@/lib/lemonSqueezy';

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  try {
    // Determine which price ID to use. In this simplified example we always
    // use the small top‑up. You could inspect the request body or query
    // parameters to select between small and large variants.
    const priceId = process.env.LEMON_SQUEEZY_PRICE_ID_TOPUP_SMALL;
    if (!priceId) {
      throw new Error('Top‑up price ID not configured');
    }
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing`;
    const url = await createCheckoutLink({
      priceId,
      variant: 'topup',
      successUrl,
      cancelUrl,
      metadata: { userId },
    });
    return NextResponse.json({ url });
  } catch (err: any) {
    return new NextResponse('Failed to create checkout: ' + err.message, { status: 500 });
  }
}