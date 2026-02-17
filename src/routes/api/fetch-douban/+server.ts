import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cache } from '$lib/server/cache';

export const POST: RequestHandler = async ({ request }: { request: Request }) => {
	const { userId, type } = await request.json();

	if (!userId || !type) {
		throw error(400, '缺少必要参数');
	}

  const cacheKey = `@rmd/cache:douban:${ userId }:${ type }`;
  const cachedData = await cache.get(cacheKey);

  if (cachedData) {
    console.log(`[Cache] Hit for ${ cacheKey }`);
    return json(cachedData);
  }

  console.log(`[Cache] Miss for ${ cacheKey }, fetching from Douban...`);

    // Helper to fetch data from Rexxar API
    const fetchData = async (start: number, count: number) => {
        // API: https://m.douban.com/rexxar/api/v2/user/{userId}/interests
        // Params from user report: type=book&status=done&start=0&count=20&ck=ruZ3&for_mobile=1
        const url = `https://m.douban.com/rexxar/api/v2/user/${userId}/interests?type=${type}&status=done&count=${count}&start=${start}&ck=ruZ3&for_mobile=1`;
        
        const headers = {
            'Referer': 'https://m.douban.com/mine/',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.31(0x18001f30) NetType/WIFI Language/zh_CN',
            // Note: No cookie needed for public profiles via this API often, 
            // but if we had one, we'd add it. Here we try without as requested.
        };

        const res = await fetch(url, { headers });
        if (!res.ok) {
            console.error(`Douban API Error: ${res.status} ${res.statusText}`);
            if (res.status === 404) throw error(404, '未找到用户或隐私设置阻止访问');
            if (res.status === 403) throw error(403, '豆瓣拒绝了请求 (403)，请稍后再试');
            // Return empty if failed to allow partial data? Or throw?
            // Throwing is safer to let user know.
            throw error(res.status, '从豆瓣获取数据失败');
        }
        return await res.json();
    };

	try {
        // Fetch 100 items (2 parallel requests of 50)
		const [page1, page2] = await Promise.all([
			fetchData(0, 50),
			fetchData(50, 50)
		]);

		const rawInterests = [...(page1.interests || []), ...(page2.interests || [])];

        // Map to cleaner format
        const items = rawInterests.map((item: any) => ({
            title: item.subject?.title || '未知',
            rating: item.rating?.value, // API returns object { value: 5, ... }
            tags: item.tags,
            comment: item.comment,
            create_time: item.create_time,
            year: item.subject?.year,
            cover_url: item.subject?.pic?.large || item.subject?.cover_url || ''
        })).filter(item => item.rating !== undefined && item.rating !== null);

    const result = {
            count: items.length,
            interests: items
    };

    // Save to cache only if count >= 30
    if (result.count >= 30) {
      await cache.set(cacheKey, result);
    } else {
      console.log(`[Cache] Skipped caching for ${ cacheKey } (count: ${ result.count } < 30)`);
    }

    return json(result);

	} catch (e: any) {
		console.error('Proxy Error:', e);
		throw error(e.status || 500, e.body?.message || '获取豆瓣数据失败');
	}
};

