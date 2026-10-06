const MAX_HISTORY_ENTRIES = 10000;

function historyCutoff(now = Date.now()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - 4);
  return cutoff.getTime();
}

function normalizeHistory(entries, now = Date.now()) {
  if (!Array.isArray(entries)) return [];
  const cutoff = historyCutoff(now);
  return entries
    .flatMap((entry) => {
      if (typeof entry?.url !== 'string' || !Number.isFinite(entry.visitedAt) || entry.visitedAt < cutoff) return [];
      try {
        const url = new URL(entry.url);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return [];
        return [{
          url: url.toString(),
          title: typeof entry.title === 'string' && entry.title.trim() ? entry.title : url.toString(),
          visitedAt: entry.visitedAt,
        }];
      } catch {
        return [];
      }
    })
    .sort((left, right) => right.visitedAt - left.visitedAt)
    .slice(0, MAX_HISTORY_ENTRIES);
}

module.exports = { historyCutoff, normalizeHistory };
