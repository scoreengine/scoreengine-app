import crypto from 'crypto';
import fetch from 'node-fetch';

/**
 * Perform a constant‑time comparison between two strings. Helps prevent
 * timing attacks when comparing HMAC signatures.
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify the Lemon Squeezy webhook signature. The header name differs
 * depending on the integration; here we assume `X-Signature` contains
 * the HMAC hexdigest of the raw request body using your webhook secret.
 */
export function verifyLszSignature({
  body,
  signature,
  secret,
}: {
  body: string;
  signature: string;
  secret: string;
}): boolean {
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return secureCompare(hmac, signature);
}

/**
 * Construct a hosted checkout link for Lemon Squeezy. This function
 * communicates with the Lemon Squeezy API using the provided store
 * and price identifiers. It returns a URL that can be opened by the
 * customer. See https://docs.lemonsqueezy.com/help/checkouts/api for
 * details.
 */
export async function createCheckoutLink({
  priceId,
  variant,
  successUrl,
  cancelUrl,
  metadata,
}: {
  priceId: string;
  variant: 'subscription' | 'topup';
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  const storeId = process.env.LEMON_SQUEEZY_STORE_ID;
  if (!apiKey || !storeId) {
    throw new Error('Lemon Squeezy API credentials missing');
  }
  try {
    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        store_id: storeId,
        // According to Lemon Squeezy docs the `variant_id` maps to a price
        // Use the priceId passed in via env var
        variant_id: priceId,
        checkout_options: {
          success_url: successUrl,
          cancel_url: cancelUrl,
        },
        metadata,
      }),
    });
    if (!res.ok) {
      throw new Error(`Lemon Squeezy API error: ${res.status}`);
    }
    const json = await res.json();
    // The API returns `url` on the response data
    return json?.data?.attributes?.url ?? '';
  } catch (err) {
    // Fallback to a generic URL if API fails
    return `https://checkout.lemonsqueezy.com/buy/${priceId}`;
  }
}