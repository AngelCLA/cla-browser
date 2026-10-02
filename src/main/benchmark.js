"use strict";

function nowMs(state) {
  return Number(process.hrtime.bigint() - state.startedAt) / 1e6;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function createBenchmarkState(enabled) {
  if (!enabled) return null;
  let resolveInitialReady;
  return {
    startedAt: process.hrtime.bigint(),
    initialReadyAt: null,
    initialReady: new Promise((resolve) => { resolveInitialReady = resolve; }),
    resolveInitialReady,
  };
}

function markInitialTabReady(state) {
  if (!state || state.initialReadyAt !== null) return;
  state.initialReadyAt = nowMs(state);
  state.resolveInitialReady(state.initialReadyAt);
}

async function collectPageMetrics(webContents) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await delay(500);
      return await webContents.executeJavaScript(`
    (async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const navigation = performance.getEntriesByType('navigation')[0];
      const paints = Object.fromEntries(performance.getEntriesByType('paint').map((entry) => [entry.name, entry.startTime]));
      const resources = performance.getEntriesByType('resource');
      const supported = PerformanceObserver.supportedEntryTypes || [];
      let lcp = null;
      let longTaskDuration = null;
      if (supported.includes('largest-contentful-paint')) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) lcp = Math.max(lcp || 0, entry.startTime);
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        await new Promise((resolve) => setTimeout(resolve));
        observer.disconnect();
      }
      if (supported.includes('longtask')) {
        let total = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) total += entry.duration;
        });
        observer.observe({ type: 'longtask', buffered: true });
        await new Promise((resolve) => setTimeout(resolve));
        observer.disconnect();
        longTaskDuration = total;
      }
      return {
        navigation: navigation ? {
          ttfb: navigation.responseStart,
          domContentLoaded: navigation.domContentLoadedEventEnd,
          load: navigation.loadEventEnd || null,
        } : {},
        paints: {
          firstContentfulPaint: paints['first-contentful-paint'] ?? null,
          largestContentfulPaint: lcp,
          longTaskDuration,
        },
        resources: {
          count: resources.length,
          transferBytes: resources.reduce((total, entry) => total + (entry.transferSize || 0), 0),
          encodedBodyBytes: resources.reduce((total, entry) => total + (entry.encodedBodySize || 0), 0),
        },
        viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      };
    })();
  `);
    } catch (error) {
      lastError = error;
      if (!isNavigationContextError(error)) throw error;
      await delay(250);
    }
  }
  throw lastError;
}

function isNavigationContextError(error) {
  return /ERR_ABORTED|\(-3\)|execution context was destroyed/i.test(error instanceof Error ? error.message : String(error));
}

async function navigateTab(tab, url, state) {
  const webContents = tab.view.webContents;
  const started = nowMs(state);
  await loadUntilDomReady(webContents, url);
  const navigation = nowMs(state) - started;
  const metrics = await collectPageMetrics(webContents);
  return { operation: { navigation }, ...metrics };
}

async function loadUntilDomReady(webContents, url) {
  await new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => fail(new Error(`Timed out waiting for DOMContentLoaded: ${url}`)), 45000);
    const cleanup = () => {
      clearTimeout(timeout);
      webContents.removeListener("dom-ready", complete);
      webContents.removeListener("did-fail-load", failed);
    };
    const complete = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const failed = (_event, errorCode, errorDescription, _validatedUrl, isMainFrame) => {
      if (isMainFrame === false || errorCode === -3) return;
      fail(new Error(`Navigation failed (${errorCode}): ${errorDescription}`));
    };
    webContents.once("dom-ready", complete);
    webContents.on("did-fail-load", failed);
    webContents.loadURL(url).catch((error) => {
      if (!isNavigationContextError(error)) fail(error);
    });
  });
}

async function waitForTabLoad(webContents) {
  if (!webContents.isLoading() && webContents.getURL()) return;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for a tab to load"));
    }, 30000);
    const complete = () => {
      cleanup();
      resolve();
    };
    const fail = (_event, errorCode, errorDescription) => {
      cleanup();
      reject(new Error(`Navigation failed (${errorCode}): ${errorDescription}`));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      webContents.removeListener("did-stop-loading", complete);
      webContents.removeListener("did-fail-load", fail);
    };
    webContents.once("did-stop-loading", complete);
    webContents.once("did-fail-load", fail);
  });
}

function installBenchmarkApi(state, dependencies) {
  if (!state) return;
  const { app, getActiveTab, createTab, closeTab, showTab, getWindow, getToolbarHeight } = dependencies;

  globalThis.__claBenchmark = {
    async startup() {
      await state.initialReady;
      return {
        initialTabReady: state.initialReadyAt,
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        v8: process.versions.v8,
      };
    },
    async setViewport({ width, height }) {
      const window = getWindow();
      if (!window || !Number.isFinite(width) || !Number.isFinite(height)) throw new Error("Invalid benchmark viewport");
      const bounds = window.getContentBounds();
      window.setContentBounds({ x: bounds.x, y: bounds.y, width: Math.round(width), height: Math.round(height + getToolbarHeight()) });
      await delay(100);
      return getActiveTab().view.webContents.executeJavaScript("({ width: innerWidth, height: innerHeight, devicePixelRatio })");
    },
    async navigate(url) {
      return withBenchmarkTab(createTab, closeTab, showTab, (tab) => navigateTab(tab, url, state));
    },
    async interaction(url) {
      return withBenchmarkTab(createTab, closeTab, showTab, async (tab) => {
        const navigation = await navigateTab(tab, url, state);
        const interaction = await tab.view.webContents.executeJavaScript(`
        (async () => {
          const button = document.querySelector('#run-work');
          if (!button) throw new Error('Interaction fixture is missing #run-work');
          const start = performance.now();
          button.click();
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return performance.now() - start;
        })();
      `);
        return { ...navigation, operation: { ...navigation.operation, scriptedInteraction: interaction } };
      });
    },
    async tabCycle(url) {
      const previous = getActiveTab();
      if (!previous) throw new Error("No active tab");
      const createStarted = nowMs(state);
      const tab = createTab(url, false);
      await waitForTabLoad(tab.view.webContents);
      const created = nowMs(state) - createStarted;
      const switchStarted = nowMs(state);
      showTab(tab.id);
      await tab.view.webContents.executeJavaScript("new Promise((resolve) => requestAnimationFrame(resolve))");
      const switched = nowMs(state) - switchStarted;
      const closeStarted = nowMs(state);
      closeTab(tab.id);
      await previous.view.webContents.executeJavaScript("new Promise((resolve) => requestAnimationFrame(resolve))");
      return { operation: { tabCreate: created, tabSwitch: switched, tabClose: nowMs(state) - closeStarted } };
    },
    resources() {
      return app.getAppMetrics().map((metric) => ({
        type: metric.type,
        pid: metric.pid,
        workingSetSize: metric.memory?.workingSetSize ?? null,
        privateBytes: metric.memory?.privateBytes ?? null,
        cpuPercent: metric.cpu?.percentCPUUsage ?? null,
      }));
    },
  };
}

async function withBenchmarkTab(createTab, closeTab, showTab, operation) {
  const tab = createTab(undefined, false);
  try {
    await waitForTabLoad(tab.view.webContents);
    showTab(tab.id);
    return await operation(tab);
  } finally {
    closeTab(tab.id);
  }
}

module.exports = { createBenchmarkState, installBenchmarkApi, markInitialTabReady };
