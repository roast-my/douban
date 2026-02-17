import { Redis } from '@upstash/redis';
import { env } from '$env/dynamic/private';

// Initialize Redis
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const CACHE_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds

export const cache = {
    get: async (key: string): Promise<any | null> => {
        try {
            const data = await redis.get(key);
            return data;
        } catch (e) {
            console.error('[Cache] Redis Get Error:', e);
            return null;
        }
    },
    
    set: async (key: string, data: any) => {
        try {
            await redis.set(key, data, { ex: CACHE_DURATION_SECONDS });
        } catch (e) {
            console.error('[Cache] Redis Set Error:', e);
        }
    }
};
