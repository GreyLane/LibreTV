import { describe, expect, it } from 'vitest';
import { normalizeHotSubjects } from './douban-hot';

describe('combined popularity recommendations', () => {
  it('mixes film and TV by popularity rank rather than rating, with duplicate IDs removed', () => {
    const result = normalizeHotSubjects([
      { id: 'film', title: '电影', type: 'movie', rank: 2, rating: { value: 9.8 } },
      { id: 'tv', title: '剧集', type: 'tv', rank: 1, rating: { value: 6.2 } },
      { id: 'film', title: '重复电影', type: 'movie', rank: 3 },
      { id: 'book', title: '书籍', type: 'book', rank: 0 },
    ]);
    expect(result.map((item) => item.id)).toEqual(['tv', 'film']);
    expect(result[0].isTv).toBe(true);
  });

  it('keeps unrated titles and supports alternate cover fields', () => {
    const [item] = normalizeHotSubjects([{ id: 42, title: '新片', type: 'movie', cover: { url: 'https://example.com/poster.jpg' }, rating: { value: 0 } }]);
    expect(item.id).toBe('42');
    expect(item.rating).toBeUndefined();
    expect(item.cover).toBe('https://example.com/poster.jpg');
  });
});
