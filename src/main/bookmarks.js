const DEFAULT_BOOKMARKS = [
  { id: 'google', title: 'Google', url: 'https://www.google.com/', category: 'search' },
  { id: 'google-drive', title: 'Google Drive', url: 'https://drive.google.com/', category: 'productivity' },
  { id: 'gmail', title: 'Gmail', url: 'https://mail.google.com/', category: 'productivity' }
];

function normalizeBookmarkUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function normalizeBookmarks(data) {
  if (!Array.isArray(data)) return [];

  const seen = new Set();
  return data.flatMap((bookmark) => {
    const url = normalizeBookmarkUrl(bookmark?.url);
    if (!url || seen.has(url) || seen.size >= 100) return [];
    seen.add(url);
    const normalized = {
      url,
      title: typeof bookmark.title === 'string' && bookmark.title.trim() ? bookmark.title : url,
    };
    if (typeof bookmark.id === 'string' && bookmark.id) normalized.id = bookmark.id;
    if (typeof bookmark.category === 'string' && bookmark.category) normalized.category = bookmark.category;
    return [normalized];
  });
}

function selectBookmarks({ hasUserFile, userBookmarks, legacyAppBookmarks, legacyBrowserBookmarks }) {
  if (hasUserFile) return normalizeBookmarks(userBookmarks);
  const appBookmarks = normalizeBookmarks(legacyAppBookmarks);
  if (appBookmarks.length) return appBookmarks;
  const browserBookmarks = normalizeBookmarks(legacyBrowserBookmarks);
  return browserBookmarks.length ? browserBookmarks : normalizeBookmarks(DEFAULT_BOOKMARKS);
}

module.exports = { DEFAULT_BOOKMARKS, normalizeBookmarkUrl, normalizeBookmarks, selectBookmarks };
