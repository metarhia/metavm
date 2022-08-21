/* eslint-disable import/no-unresolved */
'use strict';

const metatests = require('metatests');
const { remote } = require('webdriverio');
const { createServer, checkServerStart } = require('./staticServer.js');

const server = createServer(3000);

metatests.test('run basic script', async (test) => {
  const browser = await remote({
    capabilities: { browserName: 'chrome' },
    logLevel: 'error',
  });

  await checkServerStart(3000);

  await browser.url('http://localhost:3000/');

  const result = await browser.execute(async () => {
    const metavm = await import('/metavm.mjs');

    const script = metavm.createScript('name', '1 + 1');
    const result = await script.exports;
    return result;
  });

  test.strictEqual(result, 2);

  browser.closeWindow();
  browser.deleteSession();

  test.end();
});

metatests.test('run script with valid context', async (test) => {
  const browser = await remote({
    capabilities: { browserName: 'chrome' },
    logLevel: 'error',
  });

  await checkServerStart(3000);

  await browser.url('http://localhost:3000/');

  const result = await browser.execute(async () => {
    const metavm = await import('/metavm.mjs');

    const script = metavm.createScript('name', '() => A1 + A2', {
      context: { A1: 10, A2: 30 },
    });
    const result = await script.exports;
    return result;
  });
  test.strictEqual(result, 40);

  browser.closeWindow();
  browser.deleteSession();

  test.end();
});

metatests.test('run script not in worker', async (test) => {
  const browser = await remote({
    capabilities: { browserName: 'chrome' },
    logLevel: 'error',
  });

  await checkServerStart(3000);

  await browser.url('http://localhost:3000/');

  const result = await browser.execute(async () => {
    const metavm = await import('/metavm.mjs');

    const script = metavm.createScript('name', '() => A1 + A2', {
      context: { A1: 50, A2: 30 }, inWorker: false,
    });
    const result = await script.exports;
    return result;
  });

  test.strictEqual(result, 80);

  browser.closeWindow();
  browser.deleteSession();

  server.close();
  test.end();
});

