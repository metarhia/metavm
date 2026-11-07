'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '../..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const startServer = () =>
  new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const requestPath = decodeURIComponent(url.pathname);
      const filePath = path.resolve(ROOT, `.${requestPath}`);
      const inside =
        filePath === ROOT || filePath.startsWith(`${ROOT}${path.sep}`);
      if (!inside) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(filePath, (error, body) => {
        if (error) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const headers = {
          'content-type': MIME[path.extname(filePath)] || 'text/plain',
        };
        if (filePath.endsWith(`${path.sep}csp.html`)) {
          const self = 'self';
          headers['content-security-policy'] = `script-src '${self}'`;
        }
        res.writeHead(200, headers);
        res.end(body);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });

const engines = async () => {
  const playwright = require('playwright');
  return [
    ['chromium', playwright.chromium],
    ['firefox', playwright.firefox],
    ['webkit', playwright.webkit],
  ];
};

const failedMessage = (results) =>
  results
    .filter((item) => !item.ok)
    .map((item) => `${item.name}\n${item.message}`)
    .join('\n');

test('browser runtimes', { timeout: 180000 }, async (t) => {
  if (process.env.METAVM_SKIP_BROWSER === '1') {
    t.skip('METAVM_SKIP_BROWSER=1');
    return;
  }
  let browsers;
  try {
    browsers = await engines();
  } catch (error) {
    if (process.env.METAVM_REQUIRE_BROWSER === '1') throw error;
    t.skip('playwright is not installed');
    return;
  }
  const server = await startServer();
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;
  try {
    for (const [name, engine] of browsers) {
      await t.test(name, async (browserTest) => {
        let browser;
        try {
          browser = await engine.launch();
        } catch (error) {
          if (process.env.METAVM_REQUIRE_BROWSER === '1') throw error;
          browserTest.skip(`Could not launch ${name}`);
          return;
        }
        try {
          const page = await browser.newPage();
          await page.goto(`${origin}/test/browser/index.html`);
          await page.waitForFunction(() => globalThis.__metavmResults);
          const results = await page.evaluate(() => globalThis.__metavmResults);
          assert.deepStrictEqual(failedMessage(results), '');
          const csp = await browser.newPage();
          await csp.goto(`${origin}/test/browser/csp.html`);
          await csp.waitForFunction(() => globalThis.__cspResult);
          const cspResult = await csp.evaluate(() => globalThis.__cspResult);
          assert.strictEqual(cspResult.ok, false);
          assert.strictEqual(cspResult.code, 'EVAL_DISALLOWED');
          assert.match(cspResult.message, /Content-Security-Policy/);
        } finally {
          await browser.close();
        }
      });
    }
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
});
