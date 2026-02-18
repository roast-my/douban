import { env } from '$env/dynamic/private';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { RequestEvent } from '@sveltejs/kit';

export const LIMIT_CONFIG = {
  MAX_REQUESTS_PER_DAY: 5,
};

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

export function getClientIp(request: Request): string {
  const headers = request.headers;
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  return headers.get('x-real-ip') || headers.get('cf-connecting-ip') ||
    headers.get('x-vercel-forwarded-for') || 'unknown';
}

export async function checkRateLimit(
  request: Request, limitCount: number, prefix: string): Promise<Response | null> {
  const clientIp = getClientIp(request);

  if (clientIp !== 'unknown') {
    const ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.fixedWindow(limitCount, '24 h'),
      analytics: true,
      prefix: prefix,
    });

    const today = new Date().toISOString().split('T')[0];
    const identifier = `${ clientIp }:${ today }`;

    try {
      const { success, limit, remaining } = await ratelimit.limit(identifier);
      if (!success) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: '请求太频繁啦，请休息一下，明天再试吧'
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString()
            }
          });
      }
    } catch (err) {
      console.error('[RateLimit] Redis Error (Allowing Request):', err);
      return null;
    }
  }

  return null;
}


export function withRateLimit(
  handler: (event: RequestEvent) => Promise<Response>
) {
  return async (event: RequestEvent) => {
    const limitRes = await checkRateLimit(
      event.request,
      LIMIT_CONFIG.MAX_REQUESTS_PER_DAY,
      '@rmd/ratelimit'
    );
    if (limitRes) {
      return limitRes;
    }
    return handler(event);
  };
}
