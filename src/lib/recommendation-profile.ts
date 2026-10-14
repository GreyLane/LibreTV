export function normalizedTitle(title: string): string {
  return title.trim().toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

interface ViewingRecord {
  title: string;
  timestamp: number;
  playbackPosition: number;
  duration: number;
  episodeIndex: number;
}

export function recommendationSeeds(history: ViewingRecord[], now = Date.now()): string[] {
  const weights = new Map<string, { title: string; weight: number }>();
  for (const entry of history) {
    if (entry.playbackPosition < 60 && entry.episodeIndex === 0) continue;
    const title = normalizedTitle(entry.title);
    if (!title) continue;
    const ageDays = Math.max(0, now - entry.timestamp) / 86_400_000;
    const engagement = entry.duration > 0 ? Math.min(1, entry.playbackPosition / entry.duration) : 0.25;
    const weight = (1 + engagement + Math.min(entry.episodeIndex, 10) / 10) * Math.exp(-ageDays / 30);
    if (weight > (weights.get(title)?.weight ?? -1)) weights.set(title, { title: entry.title, weight });
  }
  return [...weights.values()].sort((a, b) => b.weight - a.weight).slice(0, 8).map((entry) => entry.title);
}
