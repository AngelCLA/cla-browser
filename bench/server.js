"use strict";

const http = require("node:http");

const HOST = "127.0.0.1";
const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-cache",
};
const ASSET_HEADERS = {
  "cache-control": "public, max-age=31536000, immutable",
};

function page(title, body, script) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f6f8; color: #17212b; font: 16px/1.45 Arial, sans-serif; }
    main { width: min(1120px, calc(100% - 32px)); margin: 32px auto; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { margin: 0 0 20px; color: #52606d; }
    button { border: 0; border-radius: 6px; padding: 10px 16px; background: #1769aa; color: white; font: inherit; cursor: pointer; }
    button:focus-visible { outline: 3px solid #f0b429; outline-offset: 2px; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
    .card { min-width: 0; padding: 14px; border: 1px solid #d9e2ec; border-radius: 8px; background: white; box-shadow: 0 1px 2px rgba(23, 33, 43, .06); }
    .card img { display: block; width: 100%; height: 108px; margin-bottom: 10px; border-radius: 4px; background: #d9e2ec; }
    .card h2 { margin: 0 0 4px; font-size: 16px; }
    .card span { color: #7b8794; font-size: 13px; }
    #result { min-height: 24px; margin: 16px 0; color: #243b53; font-weight: bold; }
    .heavy-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }
    .heavy-card { min-height: 76px; padding: 10px; border-left: 4px solid #1769aa; background: white; font-size: 12px; }
    @media (max-width: 720px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .heavy-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  </style>
</head>
<body>
  <main data-benchmark-ready="true">
    ${body}
  </main>
  ${script ? `<script>${script}</script>` : ""}
</body>
</html>`;
}

function renderPage() {
  const cards = Array.from({ length: 24 }, (_, index) => {
    const number = index + 1;
    return `<article class="card"><img src="/assets/card-${number}.svg" width="240" height="108" alt="Benchmark image ${number}"><h2>Layout card ${number}</h2><span>Deterministic content block ${number}</span></article>`;
  }).join("");

  return page(
    "Render benchmark",
    `<h1>Render benchmark</h1><p>DOM, layout, and locally generated images.</p><section class="grid">${cards}</section>`
  );
}

function interactionPage() {
  const script = `
    const button = document.querySelector("#run-work");
    const result = document.querySelector("#result");
    button.addEventListener("click", () => {
      let checksum = 0;
      const fragment = document.createDocumentFragment();
      for (let index = 0; index < 1800; index += 1) {
        checksum = (checksum + ((index * 17) % 97)) % 1000003;
        const row = document.createElement("div");
        row.className = "card";
        row.textContent = "Interaction row " + (index + 1) + " / " + checksum;
        fragment.appendChild(row);
      }
      const output = document.querySelector("#output");
      output.replaceChildren(fragment);
      result.textContent = "Completed deterministic work: " + checksum;
    });
  `;

  return page(
    "Interaction benchmark",
    `<h1>Interaction benchmark</h1><p>Click the button to run repeatable script and DOM work.</p><button id="run-work" type="button">Run benchmark work</button><div id="result" aria-live="polite"></div><section id="output" class="grid"></section>`,
    script
  );
}

function heavyPage() {
  return page(
    "Heavy benchmark",
    `<h1>Heavy benchmark</h1><p>Intensive deterministic JavaScript and initial DOM construction.</p><div id="heavy-result"></div><section id="heavy-output" class="heavy-grid"></section>`,
    ""
  ).replace("</body>", "  <script src=\"/assets/heavy.js\"></script>\n</body>");
}

function svgForCard(number) {
  const hue = (number * 37) % 360;
  const accent = (hue + 48) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="108" viewBox="0 0 240 108" role="img" aria-label="Benchmark image ${number}"><rect width="240" height="108" fill="hsl(${hue} 52% 42%)"/><circle cx="184" cy="40" r="34" fill="hsl(${accent} 66% 66%)"/><path d="M0 84L58 44L105 80L145 56L240 94V108H0Z" fill="rgba(255,255,255,.42)"/><text x="16" y="28" fill="white" font-family="Arial" font-size="18">Image ${number}</text></svg>`;
}

const HEAVY_SCRIPT = `
(() => {
  const output = document.querySelector("#heavy-output");
  const fragment = document.createDocumentFragment();
  let checksum = 0;
  const values = new Uint32Array(180000);
  for (let index = 0; index < values.length; index += 1) {
    const value = ((index + 11) * 2654435761) >>> 0;
    values[index] = value;
    checksum = (checksum + (value & 1023)) >>> 0;
  }
  for (let index = 0; index < 3000; index += 1) {
    const value = values[(index * 59) % values.length];
    const card = document.createElement("article");
    card.className = "heavy-card";
    card.innerHTML = "<strong>Work item " + (index + 1) + "</strong><br><span>Value " + value + "</span>";
    fragment.appendChild(card);
  }
  output.appendChild(fragment);
  document.querySelector("#heavy-result").textContent = "Completed deterministic work: " + checksum;
})();
`;

function respond(response, status, headers, body) {
  response.writeHead(status, { ...headers, "content-length": Buffer.byteLength(body) });
  response.end(body);
}

function requestHandler(request, response) {
  const url = new URL(request.url, `http://${HOST}`);

  if (request.method !== "GET" && request.method !== "HEAD") {
    respond(response, 405, { allow: "GET, HEAD", "cache-control": "no-store" }, "Method Not Allowed");
    return;
  }

  let body;
  let headers;
  if (url.pathname === "/render") {
    body = renderPage();
    headers = HTML_HEADERS;
  } else if (url.pathname === "/interaction") {
    body = interactionPage();
    headers = HTML_HEADERS;
  } else if (url.pathname === "/heavy") {
    body = heavyPage();
    headers = HTML_HEADERS;
  } else if (url.pathname === "/assets/heavy.js") {
    body = HEAVY_SCRIPT;
    headers = { ...ASSET_HEADERS, "content-type": "text/javascript; charset=utf-8" };
  } else {
    const match = /^\/assets\/card-(\d+)\.svg$/.exec(url.pathname);
    if (!match || Number(match[1]) < 1 || Number(match[1]) > 24) {
      respond(response, 404, { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" }, "Not Found");
      return;
    }
    body = svgForCard(Number(match[1]));
    headers = { ...ASSET_HEADERS, "content-type": "image/svg+xml; charset=utf-8" };
  }

  if (request.method === "HEAD") {
    response.writeHead(200, { ...headers, "content-length": Buffer.byteLength(body) });
    response.end();
    return;
  }
  respond(response, 200, headers, body);
}

function startServer(port = 0) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(requestHandler);
    server.once("error", reject);
    server.listen(port, HOST, () => {
      server.removeListener("error", reject);
      const address = server.address();
      resolve({
        url: `http://${HOST}:${address.port}`,
        close: () => new Promise((closeResolve, closeReject) => {
          server.close((error) => error ? closeReject(error) : closeResolve());
        }),
      });
    });
  });
}

module.exports = { startServer };
