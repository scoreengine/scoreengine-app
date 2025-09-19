// lib/rateLimiter.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Instancie le client Redis à partir des env vars Vercel
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 1 requête par 20 secondes, sliding window (comportement smooth)
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1, '20 s'), // 👈 règle le débit ici
  analytics: true,
  prefix: 'scoreengine:rl',
});

export async function rateLimit(key: string) {
  try {
    // ❌ pas de { burst: 3 } ici — l’API ne le supporte pas
    const { success, limit, remaining, reset } = await ratelimit.limit(key);
    return { success, limit, remaining, reset };
  } catch {
    // En cas de panne Upstash, on laisse passer pour éviter les faux négatifs en prod
    return { success: true, limit: 1, remaining: 1, reset: 0 };
  }
}