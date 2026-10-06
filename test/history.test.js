"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { historyCutoff, normalizeHistory } = require("../src/main/history");

test("institutional history retains only valid visits from the last four months", () => {
  const now = Date.UTC(2026, 9, 6);
  assert.equal(historyCutoff(now), Date.UTC(2026, 5, 6));
  assert.deepEqual(normalizeHistory([
    { url: "https://recent.example", title: "Recent", visitedAt: now - 1 },
    { url: "https://old.example", title: "Old", visitedAt: Date.UTC(2026, 4, 6) },
    { url: "file:///private", title: "Local", visitedAt: now - 1 },
  ], now), [{ url: "https://recent.example/", title: "Recent", visitedAt: now - 1 }]);
});
