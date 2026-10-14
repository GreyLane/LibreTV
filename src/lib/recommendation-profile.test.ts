import { describe, expect, it } from 'vitest';
import { normalizedTitle, recommendationSeeds } from './recommendation-profile';

describe('viewing-based recommendation seeds', () => {
  it('ignores brief clicks and prefers recent engaged viewing over old viewing', () => {
    const now = 1_800_000_000_000;
    const record = { duration: 3600, playbackPosition: 1800, episodeIndex: 0, timestamp: now };
    const seeds = recommendationSeeds([
      { ...record, title: '误点', playbackPosition: 10 },
      { ...record, title: '旧电影', timestamp: now - 90 * 86_400_000 },
      { ...record, title: '最近剧集', episodeIndex: 3 },
      { ...record, title: '最近剧集 ' },
    ], now);
    expect(seeds).toEqual(['最近剧集', '旧电影']);
  });

  it('normalizes title punctuation without collapsing different numbered seasons', () => {
    expect(normalizedTitle(' 奇妙·旅程！ ')).toBe(normalizedTitle('奇妙旅程'));
    expect(normalizedTitle('旅程2')).not.toBe(normalizedTitle('旅程1'));
  });
});
