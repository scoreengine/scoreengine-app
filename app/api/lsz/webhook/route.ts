import { NextResponse } from 'next/server';
import { verifyLszSignature } from '@/lib/lemonSqueezy';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Lemon Squeezy webhook handler. This endpoint must be configured as the
 * webhook URL in your Lemon Squeezy dashboard. It verifies the signature
 * using the `LEMON_SQUEEZY_WEBHOOK_SECRET`, processes different event
 * types and updates the database accordingly. All payloads are logged in
 * the `WebhookLog` table for auditing.
 */
export async function POST(req: Request) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return new NextResponse('Webhook secret not configured', { status: 500 });
  }
  const rawBody = await req.text();
  const signature = req.headers.get('X-Signature') || '';
  const isValid = verifyLszSignature({ body: rawBody, signature, secret });
  let status = 200;
  if (!isValid) {
    status = 400;
  }
  try {
    if (isValid) {
      const payload = JSON.parse(rawBody);
      const event = payload?.meta?.event_name || payload?.event_name;
      // Basic event handling. You can see the full schema in Lemon Squeezy docs.
      if (event === 'order_created') {
        const variantId = payload?.data?.attributes?.variant_id;
        const userId = payload?.data?.attributes?.custom_data?.userId;
        const invoiceId = payload?.data?.id;
        // Determine how many credits to add based on variant. This example
        // treats the "small" price as 250 credits and the "large" price as 1000.
        const smallId = process.env.LEMON_SQUEEZY_PRICE_ID_TOPUP_SMALL;
        const largeId = process.env.LEMON_SQUEEZY_PRICE_ID_TOPUP_LARGE;
        let creditsToAdd = 0;
        if (String(variantId) === String(smallId)) creditsToAdd = 250;
        else if (String(variantId) === String(largeId)) creditsToAdd = 1000;
        if (userId && creditsToAdd > 0) {
          await prisma.invoice.create({
            data: {
              id: invoiceId,
              userId,
              lszInvoiceId: String(invoiceId),
              amountCents: payload?.data?.attributes?.total ?? 0,
              currency: payload?.data?.attributes?.currency ?? 'USD',
              type: 'topup',
              meta: payload,
            },
          });
          await prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: creditsToAdd } },
          });
        }
      } else if (event && event.startsWith('subscription_')) {
        const subId = payload?.data?.id;
        const lszCustomerId = payload?.data?.attributes?.customer_id;
        const statusStr = payload?.data?.attributes?.status;
        const nextBill = payload?.data?.attributes?.renews_at;
        const planName = payload?.data?.attributes?.variant_name;
        const userId = payload?.data?.attributes?.custom_data?.userId;
        if (userId) {
          await prisma.subscription.upsert({
            where: { id: subId },
            update: {
              lszCustomerId: String(lszCustomerId),
              status: statusStr,
              currentPeriodEnd: nextBill ? new Date(nextBill) : null,
              plan: planName,
            },
            create: {
              id: subId,
              userId,
              lszCustomerId: String(lszCustomerId),
              lszSubId: subId,
              status: statusStr,
              currentPeriodEnd: nextBill ? new Date(nextBill) : null,
              plan: planName,
            },
          });
        }
        if (event === 'subscription_payment_success') {
          // Add monthly credits; derive quantity from plan name
          let credits = 120;
          if (planName?.toLowerCase().includes('600')) credits = 600;
          else if (planName?.toLowerCase().includes('2000')) credits = 2000;
          if (userId) {
            await prisma.invoice.create({
              data: {
                id: payload?.data?.attributes?.invoice_id ?? subId + Date.now().toString(),
                userId,
                lszInvoiceId: String(payload?.data?.attributes?.invoice_id ?? ''),
                amountCents: payload?.data?.attributes?.payment_amount ?? 0,
                currency: payload?.data?.attributes?.currency ?? 'USD',
                type: 'subscription',
                meta: payload,
              },
            });
            await prisma.user.update({ where: { id: userId }, data: { credits: { increment: credits } } });
          }
        }
      }
    }
    // Always log the webhook regardless of signature validity
    await prisma.webhookLog.create({
      data: {
        source: 'lemon_squeezy',
        payload: JSON.parse(rawBody),
        status,
      },
    });
  } catch (err) {
    status = 500;
  }
  return new NextResponse('ok', { status });
}