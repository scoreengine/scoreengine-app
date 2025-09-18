import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Upstash rate limiter configuration. We allow 1 request every 10 seconds
// with a burst capacity of 3. This is enforced per unique key (e.g. userId or IP).
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, '10 s'),
  analytics: true,
});

export async function rateLimit(key: string) {
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(key, { burst: 3 });
    return { success, limit, remaining, reset };
  } catch (err) {
    // In case of Upstash failures we allow the request to proceed
    return { success: true, limit: 1, remaining: 1, reset: 0 };
  }
}