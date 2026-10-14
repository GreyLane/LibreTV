import { NextResponse } from 'next/server';
import { guardRequest } from '@/lib/api-guard';
import { fetchDoubanHot } from '@/lib/douban-hot';

export const runtime = 'nodejs';

async function recommend(req: Request, seeds: string[] = []) {
  const guarded = guardRequest(req);
  if (guarded) return guarded;
  const rawPage = new URL(req.url).searchParams.get('page') || '0';
  if (!/^\d{1,6}$/.test(rawPage)) return NextResponse.json({ error: '分页参数无效' }, { status: 400 });
  const page = Number(rawPage);
  try {
    const items = await fetchDoubanHot(page, seeds);
    return NextResponse.json({ items, nextPage: items.length ? page + 1 : null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '热门推荐加载失败' }, { status: 502 });
  }
}

export async function GET(req: Request) { return recommend(req); }

export async function POST(req: Request) {
  const guarded = guardRequest(req);
  if (guarded) return guarded;
  try {
    if (Number(req.headers.get('content-length') || '0') > 4096) return NextResponse.json({ error: '请求过大' }, { status: 413 });
    const body = await req.json() as { seeds?: unknown };
    if (!Array.isArray(body.seeds) || body.seeds.length > 8 || body.seeds.some((value) => typeof value !== 'string' || value.length > 100)) return NextResponse.json({ error: '推荐参数无效' }, { status: 400 });
    return recommend(req, body.seeds);
  } catch { return NextResponse.json({ error: '推荐参数无效' }, { status: 400 }); }
}
