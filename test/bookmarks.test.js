"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { DEFAULT_BOOKMARKS, normalizeBookmarks, selectBookmarks } = require("../src/main/bookmarks");

test("default bookmarks are compact and have unique URLs", () => {
  const bookmarks = normalizeBookmarks(DEFAULT_BOOKMARKS);
  assert.equal(bookmarks.length, 3);
  assert.equal(new Set(bookmarks.map((bookmark) => bookmark.url)).size, 3);
  assert.ok(bookmarks.every((bookmark) => !Object.hasOwn(bookmark, "favicon")));
});

test("normalization migrates legacy records without favicon payloads or duplicate URLs", () => {
  assert.deepEqual(normalizeBookmarks([
    { url: "https://example.com", title: "Example", favicon: "data:image/png;base64,large" },
    { url: "https://example.com/", title: "Duplicate" },
    { url: "not a url", title: "Ignored" },
  ]), [{ url: "https://example.com/", title: "Example" }]);
});

test("an existing empty user file prevents defaults from returning", () => {
  assert.deepEqual(selectBookmarks({
    hasUserFile: true,
    userBookmarks: [],
    legacyAppBookmarks: DEFAULT_BOOKMARKS,
    legacyBrowserBookmarks: [],
  }), []);
});

test("a new installation uses defaults and an older installation migrates its bookmarks", () => {
  assert.equal(selectBookmarks({
    hasUserFile: false,
    userBookmarks: [],
    legacyAppBookmarks: [],
    legacyBrowserBookmarks: [],
  }).length, 3);
  assert.deepEqual(selectBookmarks({
    hasUserFile: false,
    userBookmarks: [],
    legacyAppBookmarks: [{ url: "https://legacy.example", title: "Legacy" }],
    legacyBrowserBookmarks: [],
  }), [{ url: "https://legacy.example/", title: "Legacy" }]);
  assert.deepEqual(selectBookmarks({
    hasUserFile: false,
    userBookmarks: [],
    legacyAppBookmarks: [],
    legacyBrowserBookmarks: [{ url: "https://browser-legacy.example", title: "Browser legacy" }],
  }), [{ url: "https://browser-legacy.example/", title: "Browser legacy" }]);
});
