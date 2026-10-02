"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { startServer } = require("../bench/server");

test("benchmark server serves the local scenarios and cacheable assets", async () => {
  const server = await startServer();
  try {
    for (const route of ["/render", "/interaction", "/heavy"]) {
      const response = await fetch(`${server.url}${route}`);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /data-benchmark-ready/);
    }
    const asset = await fetch(`${server.url}/assets/card-1.svg`);
    assert.equal(asset.headers.get("cache-control"), "public, max-age=31536000, immutable");
  } finally {
    await server.close();
  }
});
