"use strict";

function finite(values) {
  return values.filter((value) => Number.isFinite(value)).sort((left, right) => left - right);
}

function percentile(sorted, fraction) {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function summarize(values) {
  const samples = finite(values);
  if (!samples.length) return { count: 0, median: null, p95: null, min: null, max: null };

  return {
    count: samples.length,
    median: percentile(samples, 0.5),
    p95: percentile(samples, 0.95),
    min: samples[0],
    max: samples.at(-1),
  };
}

function flattenMetrics(value, prefix = "", output = {}) {
  if (Number.isFinite(value)) {
    output[prefix] = value;
    return output;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return output;
  for (const [key, child] of Object.entries(value)) {
    flattenMetrics(child, prefix ? `${prefix}.${key}` : key, output);
  }
  return output;
}

function summarizeSamples(samples) {
  const metrics = new Map();
  for (const sample of samples) {
    if (sample.status !== "ok") continue;
    for (const [name, value] of Object.entries(flattenMetrics(sample.metrics))) {
      if (!metrics.has(name)) metrics.set(name, []);
      metrics.get(name).push(value);
    }
  }

  return Object.fromEntries([...metrics.entries()].map(([name, values]) => [name, summarize(values)]));
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function samplesToCsv(samples) {
  const rows = samples.map((sample) => ({
    browser: sample.browser,
    scenario: sample.scenario,
    cache: sample.cache,
    iteration: sample.iteration,
    status: sample.status,
    error: sample.error || "",
    ...flattenMetrics(sample.metrics),
  }));
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return `${columns.join(",")}\n${rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")).join("\n")}\n`;
}

module.exports = { flattenMetrics, samplesToCsv, summarize, summarizeSamples };
