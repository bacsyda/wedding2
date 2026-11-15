import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

// Đổi 'duan2' thành tên dự án mới, mỗi dự án một tiền tố khác nhau
const PREFIX = 'duan2';
const KEY = `${PREFIX}:comments`;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const items = await redis.lrange(KEY, 0, 199);
      return res.status(200).json(items);
    }
    if (req.method === 'POST') {
      const name = String(req.body?.name ?? '').trim();
      const msg = String(req.body?.msg ?? '').trim();
      if (!name || !msg || name.length > 50 || msg.length > 500) {
        return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
      }
      const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
      const ok = await redis.set(`${PREFIX}:rl:${ip}`, 1, { nx: true, ex: 10 });
      if (!ok) return res.status(429).json({ error: 'Gửi quá nhanh' });

      await redis.lpush(KEY, { name, msg, time: Date.now() });
      return res.status(201).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Lỗi máy chủ' });
  }
}