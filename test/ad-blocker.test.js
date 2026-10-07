"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeAdBlockerSettings, shouldBlockRequest } = require("../src/main/ad-blocker");

test("lightweight mode blocks known advertising and tracking domains", () => {
  const settings = normalizeAdBlockerSettings({ enabled: true });
  assert.equal(shouldBlockRequest({ url: "https://securepubads.g.doubleclick.net/tag.js", resourceType: "script", pageUrl: "https://example.com", settings }), true);
  assert.equal(shouldBlockRequest({ url: "https://cdn.example.com/app.js", resourceType: "script", pageUrl: "https://example.com", settings }), false);
});

test("reinforced mode adds URL pattern filtering without blocking navigation", () => {
  const settings = normalizeAdBlockerSettings({ enabled: true, mode: "reinforced" });
  assert.equal(shouldBlockRequest({ url: "https://www.youtube.com/api/stats/ads", resourceType: "xhr", pageUrl: "https://www.youtube.com", settings }), true);
  assert.equal(shouldBlockRequest({ url: "https://ads.example.com", resourceType: "mainFrame", pageUrl: "https://example.com", settings }), false);
});

test("exceptions and disabled state allow every request for the selected site", () => {
  const settings = normalizeAdBlockerSettings({ enabled: true, exceptions: ["example.com"] });
  assert.equal(shouldBlockRequest({ url: "https://doubleclick.net/ad.js", resourceType: "script", pageUrl: "https://news.example.com", settings }), false);
  assert.equal(shouldBlockRequest({ url: "https://doubleclick.net/ad.js", resourceType: "script", pageUrl: "https://other.test", settings: { ...settings, enabled: false } }), false);
});
