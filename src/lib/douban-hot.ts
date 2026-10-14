import type { DoubanItem } from './types';
import { fetchUpstream, getCache, setCache } from './fetch-utils';
import { normalizedTitle } from './recommendation-profile';

interface HotSubject {
  id: string | number;
  title: string;
  type: string;
  rank?: number;
  score?: number;
  pic?: { normal?: string; large?: string };
  cover?: { url?: string };
  rating?: { value?: number };
}

/** Preserve Douban's combined film/TV popularity ranking, not rating order. */
export function normalizeHotSubjects(subjects: HotSubject[]): DoubanItem[] {
  const seen = new Set<string>();
  return [...subjects]
    .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER)
      || (b.score ?? 0) - (a.score ?? 0))
    .filter((subject) => {
      const id = String(subject.id ?? '');
      if (!id || !subject.title || !['movie', 'tv'].includes(subject.type) || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((subject) => ({
      id: String(subject.id),
      title: subject.title,
      cover: subject.pic?.large || subject.pic?.normal || subject.cover?.url || '',
      rating: subject.rating?.value ? String(subject.rating.value) : undefined,
      isTv: subject.type === 'tv',
    }));
}

const HEADERS = { 'User-Agent': 'Mozilla/5.0', Referer: 'https://m.douban.com/', Accept: 'application/json' };

async function fetchCollection(id: string, start: number): Promise<DoubanItem[]> {
  const key = `recommend-collection:${id}:${start}`;
  const cached = getCache<DoubanItem[]>(key);
  if (cached) return cached;
  const response = await fetchUpstream(`https://m.douban.com/rexxar/api/v2/subject_collection/${id}/items?start=${start}&count=10`, { timeoutMs: 8000, headers: HEADERS });
  if (!response.ok) throw new Error('推荐榜单暂时不可用');
  const data = await response.json() as { subject_collection_items?: HotSubject[] };
  if (!Array.isArray(data.subject_collection_items)) throw new Error('推荐榜单数据格式异常');
  const items = normalizeHotSubjects(data.subject_collection_items);
  setCache(key, items, 10 * 60 * 1000);
  return items;
}

async function similarTo(title: string): Promise<DoubanItem[]> {
  const key = `recommend-similar:${normalizedTitle(title)}`;
  const cached = getCache<DoubanItem[]>(key);
  if (cached) return cached;
  const search = await fetchUpstream(`https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(title)}`, { timeoutMs: 8000, headers: { ...HEADERS, Referer: 'https://movie.douban.com/' } });
  if (!search.ok) throw new Error('相似作品匹配暂时不可用');
  const suggestions = await search.json() as { id: string; title: string }[];
  if (!Array.isArray(suggestions)) throw new Error('作品匹配数据格式异常');
  const match = suggestions.find((subject) => normalizedTitle(subject.title) === normalizedTitle(title));
  if (!match || !/^\d+$/.test(match.id)) return [];
  const response = await fetchUpstream(`https://m.douban.com/rexxar/api/v2/movie/${match.id}/recommendations`, { timeoutMs: 8000, headers: HEADERS });
  if (!response.ok) throw new Error('相似作品暂时不可用');
  const raw = await response.json() as HotSubject[];
  if (!Array.isArray(raw)) throw new Error('相似作品数据格式异常');
  const items = normalizeHotSubjects(raw);
  setCache(key, items, 60 * 60 * 1000);
  return items;
}

export async function fetchDoubanHot(page = 0, seeds: string[] = []): Promise<DoubanItem[]> {
  if (page > 0) {
    const collections = ['movie_hot_gaia', 'tv_hot', 'show_hot', 'tv_animation'];
    const results = await Promise.allSettled([
      ...(page <= seeds.length ? [similarTo(seeds[page - 1])] : []),
      ...collections.map((id) => fetchCollection(id, (page - 1) * 10)),
    ]);
    const lists = results.map((result) => result.status === 'fulfilled' ? result.value : []);
    const items: DoubanItem[] = [];
    for (let i = 0; i < Math.max(...lists.map((list) => list.length)); i++) {
      for (const list of lists) if (list[i]) items.push(list[i]);
    }
    if (!items.length && results.some((result) => result.status === 'rejected')) throw new Error('热门推荐加载失败，请重试');
    return items;
  }
  const key = 'douban:combined-real-time-hot';
  const cached = getCache<DoubanItem[]>(key);
  if (cached) return cached;
  const response = await fetchUpstream(
    'https://m.douban.com/rexxar/api/v2/subject_collection/subject_real_time_hotest/items?start=0&count=50',
    { timeoutMs: 8000, headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://m.douban.com/', Accept: 'application/json' } }
  );
  if (!response.ok) throw new Error('豆瓣热门推荐暂时不可用，请稍后重试');
  const data = await response.json() as { subject_collection_items?: HotSubject[] };
  if (!Array.isArray(data.subject_collection_items)) throw new Error('豆瓣热门推荐数据格式异常');
  const items = normalizeHotSubjects(data.subject_collection_items);
  if (!items.length) throw new Error('豆瓣热门推荐暂时没有内容');
  setCache(key, items, 10 * 60 * 1000);
  return items;
}
