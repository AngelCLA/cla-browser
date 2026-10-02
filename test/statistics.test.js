"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { flattenMetrics, summarize, summarizeSamples } = require("../bench/statistics");

test("summarize calculates median and p95 from finite samples", () => {
  assert.deepEqual(summarize([10, 20, Number.NaN, 30, 40, 50]), {
    count: 5,
    median: 30,
    p95: 48,
    min: 10,
    max: 50,
  });
});

test("flattenMetrics and summarizeSamples omit unavailable metrics", () => {
  assert.deepEqual(flattenMetrics({ navigation: { fcp: 42 }, lcp: null }), { "navigation.fcp": 42 });
  const summary = summarizeSamples([
    { status: "ok", metrics: { navigation: { fcp: 10 } } },
    { status: "error", metrics: { navigation: { fcp: 90 } } },
    { status: "ok", metrics: { navigation: { fcp: 30 } } },
  ]);
  assert.equal(summary["navigation.fcp"].median, 20);
});
