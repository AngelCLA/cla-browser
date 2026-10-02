"use strict";

const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { _electron, chromium, firefox } = require("playwright");
const { ResourceMonitor } = require("./resources");
const { samplesToCsv, summarizeSamples } = require("./statistics");
const { startServer } = require("./server");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_VIEWPORT = { width: 1280, height: 720 };

function parseArguments(argv) {
  const options = {
    browsers: ["cla", "chrome", "edge", "firefox"],
    caches: ["cold", "warm"],
    runs: 5,
    scenarioGroups: ["local", "real"],
    sitesPath: path.join(__dirname, "sites.json"),
    output: path.join(ROOT, "benchmark-results", new Date().toISOString().replaceAll(":", "-")),
    headless: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];
    if (argument === "--browsers" && value) options.browsers = value.split(",").map((item) => item.trim()).filter(Boolean);
    else if (argument === "--cache" && value) options.caches = value.split(",").map((item) => item.trim()).filter(Boolean);
    else if (argument === "--runs" && value) options.runs = Number(value);
    else if (argument === "--scenarios" && value) options.scenarioGroups = value.split(",").map((item) => item.trim()).filter(Boolean);
    else if (argument === "--sites" && value) options.sitesPath = path.resolve(value);
    else if (argument === "--output" && value) options.output = path.resolve(value);
    else if (argument === "--headless") options.headless = true;
    else if (argument === "--help") {
      console.log("Usage: npm run benchmark -- [--browsers cla,chrome,edge,firefox] [--cache cold,warm] [--runs 5] [--scenarios local,real] [--sites bench/sites.json] [--output directory] [--headless]");
      process.exit(0);
    }
  }
  if (!Number.isInteger(options.runs) || options.runs < 1) throw new Error("--runs must be a positive integer");
  const allowedBrowsers = new Set(["cla", "chrome", "edge", "firefox"]);
  const allowedCaches = new Set(["cold", "warm"]);
  const allowedGroups = new Set(["local", "real"]);
  if (options.browsers.some((browser) => !allowedBrowsers.has(browser))) throw new Error("Unknown browser in --browsers");
  if (options.caches.some((cache) => !allowedCaches.has(cache))) throw new Error("--cache only accepts cold and warm");
  if (options.scenarioGroups.some((group) => !allowedGroups.has(group))) throw new Error("--scenarios only accepts local and real");
  return options;
}

async function loadScenarios(options, serverUrl) {
  const scenarios = [];
  if (options.scenarioGroups.includes("local")) {
    scenarios.push(
      { name: "local-render", url: `${serverUrl}/render`, type: "navigation" },
      { name: "local-heavy", url: `${serverUrl}/heavy`, type: "navigation" },
      { name: "local-interaction", url: `${serverUrl}/interaction`, type: "interaction" },
      { name: "local-tab-cycle", url: `${serverUrl}/render`, type: "tab-cycle" },
    );
  }
  if (options.scenarioGroups.includes("real")) {
    const contents = JSON.parse(await fs.readFile(options.sitesPath, "utf8"));
    if (!Array.isArray(contents.sites)) throw new Error(`Expected a sites array in ${options.sitesPath}`);
    for (const site of contents.sites) {
      if (typeof site?.name !== "string" || typeof site?.url !== "string") throw new Error(`Invalid site in ${options.sitesPath}`);
      scenarios.push({ name: `real-${site.name}`, url: site.url, type: "navigation" });
    }
  }
  return scenarios;
}

function pageProbe() {
  window.__claBenchmarkProbe = { lcp: null, longTaskDuration: null };
  const supported = PerformanceObserver.supportedEntryTypes || [];
  if (supported.includes("largest-contentful-paint")) {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__claBenchmarkProbe.lcp = Math.max(window.__claBenchmarkProbe.lcp || 0, entry.startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });
  }
  if (supported.includes("longtask")) {
    window.__claBenchmarkProbe.longTaskDuration = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__claBenchmarkProbe.longTaskDuration += entry.duration;
    }).observe({ type: "longtask", buffered: true });
  }
}

async function readPageMetrics(page) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    try {
      return await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const navigation = performance.getEntriesByType("navigation")[0];
    const paints = Object.fromEntries(performance.getEntriesByType("paint").map((entry) => [entry.name, entry.startTime]));
    const resources = performance.getEntriesByType("resource");
    return {
      navigation: navigation ? {
        ttfb: navigation.responseStart,
        domContentLoaded: navigation.domContentLoadedEventEnd,
        load: navigation.loadEventEnd || null,
      } : {},
      paints: {
        firstContentfulPaint: paints["first-contentful-paint"] ?? null,
        largestContentfulPaint: window.__claBenchmarkProbe?.lcp ?? null,
        longTaskDuration: window.__claBenchmarkProbe?.longTaskDuration ?? null,
      },
      resources: {
        count: resources.length,
        transferBytes: resources.reduce((total, entry) => total + (entry.transferSize || 0), 0),
        encodedBodyBytes: resources.reduce((total, entry) => total + (entry.encodedBodySize || 0), 0),
      },
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
    };
      });
    } catch (error) {
      lastError = error;
      if (!/execution context was destroyed/i.test(error instanceof Error ? error.message : String(error))) throw error;
      await page.waitForTimeout(250);
    }
  }
  throw lastError;
}

async function navigatePage(page, url) {
  const started = performance.now();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  } catch (error) {
    if (!isNavigationAbort(error)) throw error;
    await page.waitForTimeout(500);
    if (!page.url() || page.url() === "about:blank") throw error;
  }
  const navigation = performance.now() - started;
  const metrics = await readPageMetrics(page);
  return { operation: { navigation }, ...metrics };
}

function isNavigationAbort(error) {
  return /ERR_ABORTED|NS_BINDING_ABORTED/i.test(error instanceof Error ? error.message : String(error));
}

async function warmPage(page, url) {
  await page.goto(url, { waitUntil: "commit", timeout: 45000 });
  await page.waitForTimeout(1000);
}

async function runNativeScenario(context, scenario, cache) {
  const page = await context.newPage();
  await page.addInitScript(pageProbe);
  if (cache === "warm") await warmPage(page, scenario.url);
  let metrics;
  if (scenario.type === "interaction") {
    metrics = await navigatePage(page, scenario.url);
    const scriptedInteraction = await page.evaluate(async () => {
      const button = document.querySelector("#run-work");
      if (!button) throw new Error("Interaction fixture is missing #run-work");
      const started = performance.now();
      button.click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return performance.now() - started;
    });
    metrics.operation.scriptedInteraction = scriptedInteraction;
  } else if (scenario.type === "tab-cycle") {
    const first = await context.newPage();
    const createStarted = performance.now();
    const second = await context.newPage();
    await second.addInitScript(pageProbe);
    await second.goto(scenario.url, { waitUntil: "load", timeout: 45000 });
    const tabCreate = performance.now() - createStarted;
    const switchStarted = performance.now();
    await second.bringToFront();
    await second.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    const tabSwitch = performance.now() - switchStarted;
    const closeStarted = performance.now();
    await second.close();
    await first.bringToFront();
    await first.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    metrics = { operation: { tabCreate, tabSwitch, tabClose: performance.now() - closeStarted } };
    await first.close();
  } else {
    metrics = await navigatePage(page, scenario.url);
  }
  await page.close().catch(() => {});
  return metrics;
}

async function launchNative(name, headless) {
  const browserType = name === "firefox" ? firefox : chromium;
  const launchOptions = { headless };
  if (name === "chrome") launchOptions.channel = "chrome";
  if (name === "edge") launchOptions.channel = "msedge";
  const server = await browserType.launchServer(launchOptions);
  const browser = await browserType.connect(server.wsEndpoint());
  return {
    browser,
    pid: server.process().pid,
    version: browser.version(),
    close: async () => {
      await browser.close().catch(() => {});
      await server.close().catch(() => {});
    },
  };
}

async function runNativeIteration(name, iteration, scenarios, options) {
  const launchedAt = performance.now();
  const session = await launchNative(name, options.headless);
  const samples = [];
  try {
    const startupContext = await session.browser.newContext({ viewport: DEFAULT_VIEWPORT, deviceScaleFactor: 1 });
    const startupPage = await startupContext.newPage();
    await startupPage.addInitScript(pageProbe);
    const startupUrl = scenarios.find((scenario) => scenario.name === "local-render")?.url || scenarios[0].url;
    const startupNavigation = performance.now();
    await startupPage.goto(startupUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    const startupReady = performance.now();
    const startupMetrics = await readPageMetrics(startupPage);
    startupMetrics.operation = {
      navigation: startupReady - startupNavigation,
      launchToFirstContent: startupReady - launchedAt,
    };
    samples.push(successSample(name, "startup", "cold", iteration, startupMetrics, { version: session.version }));
    await startupContext.close();

    for (const cache of options.caches) {
      for (const scenario of scenarios) {
        const context = await session.browser.newContext({ viewport: DEFAULT_VIEWPORT, deviceScaleFactor: 1 });
        const monitor = new ResourceMonitor(session.pid);
        await monitor.start();
        try {
          const metrics = await runNativeScenario(context, scenario, cache);
          metrics.resources = await monitor.stop();
          samples.push(successSample(name, scenario.name, cache, iteration, metrics, { version: session.version }));
        } catch (error) {
          await monitor.stop();
          samples.push(errorSample(name, scenario.name, cache, iteration, error, { version: session.version }));
        } finally {
          await context.close().catch(() => {});
        }
      }
    }
  } finally {
    await session.close();
  }
  return samples;
}

async function runClaScenario(electronApp, scenario, cache) {
  if (cache === "warm") {
    await evaluateCla(electronApp, `globalThis.__claBenchmark.navigate(${JSON.stringify(scenario.url)})`);
  }
  if (scenario.type === "interaction") return evaluateCla(electronApp, `globalThis.__claBenchmark.interaction(${JSON.stringify(scenario.url)})`);
  if (scenario.type === "tab-cycle") return evaluateCla(electronApp, `globalThis.__claBenchmark.tabCycle(${JSON.stringify(scenario.url)})`);
  return evaluateCla(electronApp, `globalThis.__claBenchmark.navigate(${JSON.stringify(scenario.url)})`);
}

function evaluateCla(electronApp, expression) {
  return electronApp.evaluate(new Function(`return (${expression});`));
}

async function waitForClaBenchmarkApi(electronApp) {
  await electronApp.evaluate(async () => {
    for (let attempt = 0; attempt < 300; attempt += 1) {
      if (globalThis.__claBenchmark) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("CLA benchmark API did not initialize");
  });
}

async function runClaIteration(iteration, scenarios, options) {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "cla-benchmark-"));
  const launchedAt = performance.now();
  const electronApp = await _electron.launch({
    args: [ROOT, `--user-data-dir=${profile}`],
    env: { ...process.env, CLA_BENCHMARK: "1" },
  });
  const samples = [];
  try {
    await waitForClaBenchmarkApi(electronApp);
    const startup = await evaluateCla(electronApp, "globalThis.__claBenchmark.startup()");
    const viewport = await evaluateCla(electronApp, `globalThis.__claBenchmark.setViewport(${JSON.stringify(DEFAULT_VIEWPORT)})`);
    samples.push(successSample("cla", "startup", "cold", iteration, {
      operation: { launchToFirstContent: performance.now() - launchedAt, initialTabReady: startup.initialTabReady },
      viewport,
    }, { electron: startup.electron, chrome: startup.chrome, v8: startup.v8 }));

    for (const cache of options.caches) {
      for (const scenario of scenarios) {
        const monitor = new ResourceMonitor(electronApp.process().pid);
        await monitor.start();
        try {
          const metrics = await runClaScenario(electronApp, scenario, cache);
          metrics.resources = await monitor.stop();
          metrics.electronProcesses = await evaluateCla(electronApp, "globalThis.__claBenchmark.resources()");
          samples.push(successSample("cla", scenario.name, cache, iteration, metrics, { electron: startup.electron, chrome: startup.chrome, v8: startup.v8 }));
        } catch (error) {
          await monitor.stop();
          samples.push(errorSample("cla", scenario.name, cache, iteration, error, { electron: startup.electron, chrome: startup.chrome, v8: startup.v8 }));
        }
      }
    }
  } finally {
    await electronApp.close().catch(() => {});
    await fs.rm(profile, { recursive: true, force: true });
  }
  return samples;
}

function successSample(browser, scenario, cache, iteration, metrics, metadata) {
  return { browser, scenario, cache, iteration, status: "ok", metadata, metrics };
}

function errorSample(browser, scenario, cache, iteration, error, metadata = {}) {
  return { browser, scenario, cache, iteration, status: "error", metadata, error: error instanceof Error ? error.message : String(error), metrics: {} };
}

function groupSamples(samples) {
  const groups = new Map();
  for (const sample of samples) {
    const key = `${sample.browser}/${sample.scenario}/${sample.cache}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(sample);
  }
  return Object.fromEntries([...groups.entries()].map(([key, entries]) => [key, {
    samples: entries.length,
    failures: entries.filter((entry) => entry.status !== "ok").length,
    metrics: summarizeSamples(entries),
  }]));
}

function environment() {
  return {
    createdAt: new Date().toISOString(),
    platform: process.platform,
    release: os.release(),
    architecture: process.arch,
    node: process.version,
    cpu: os.cpus()[0]?.model || null,
    cpuCount: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
    viewport: DEFAULT_VIEWPORT,
  };
}

async function writeResults(output, options, scenarios, samples) {
  await fs.mkdir(output, { recursive: true });
  const run = { environment: environment(), options, scenarios, samples, summary: groupSamples(samples) };
  await Promise.all([
    fs.writeFile(path.join(output, "raw.ndjson"), `${samples.map((sample) => JSON.stringify(sample)).join("\n")}\n`),
    fs.writeFile(path.join(output, "summary.json"), `${JSON.stringify(run, null, 2)}\n`),
    fs.writeFile(path.join(output, "summary.csv"), samplesToCsv(samples)),
    fs.writeFile(path.join(output, "environment.json"), `${JSON.stringify(run.environment, null, 2)}\n`),
  ]);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const server = await startServer();
  const samples = [];
  try {
    const scenarios = await loadScenarios(options, server.url);
    if (!scenarios.length) throw new Error("No scenarios selected");
    for (const browser of options.browsers) {
      for (let iteration = 1; iteration <= options.runs; iteration += 1) {
        process.stdout.write(`[${browser}] iteration ${iteration}/${options.runs}\n`);
        try {
          const results = browser === "cla"
            ? await runClaIteration(iteration, scenarios, options)
            : await runNativeIteration(browser, iteration, scenarios, options);
          samples.push(...results);
        } catch (error) {
          samples.push(errorSample(browser, "startup", "cold", iteration, error));
          process.stderr.write(`[${browser}] ${error instanceof Error ? error.message : error}\n`);
        }
      }
    }
    await writeResults(options.output, options, scenarios, samples);
    const failures = samples.filter((sample) => sample.status !== "ok").length;
    process.stdout.write(`Results: ${options.output}\nSamples: ${samples.length}, failures: ${failures}\n`);
    process.exitCode = failures ? 1 : 0;
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
