'use strict';

const fs = require('fs');
const metavm = require('..');
const path = require('path');
const metatests = require('metatests');

const examples = path.join(__dirname, 'examples');

metatests.test('MetaScript constructor', async (test) => {
  const src = `({ field: 'value' });`;
  const ms = new metavm.MetaScript('Example', src);

  test.strictSame(typeof ms.exports, 'object');

  const fields = Object.keys(ms);
  test.strictSame(fields, ['name', 'script', 'context', 'exports']);

  const keys = Object.keys(ms.exports);
  test.strictSame(keys, ['field']);

  test.strictSame(ms.exports.field, 'value');
  test.end();
});

metatests.test('MetaScript factory', async (test) => {
  const src = `({ field: 'value' });`;
  const ms = metavm.createScript('Example', src);

  test.strictSame(typeof ms.exports, 'object');

  const fields = Object.keys(ms);
  test.strictSame(fields, ['name', 'script', 'context', 'exports']);

  const keys = Object.keys(ms.exports);
  test.strictSame(keys, ['field']);

  test.strictSame(ms.exports.field, 'value');
  test.end();
});

metatests.test('Load script', async (test) => {
  const filePath = path.join(examples, 'simple.js');
  const ms = await metavm.readScript(filePath);

  test.strictSame(typeof ms.exports, 'object');

  const fields = Object.keys(ms);
  test.strictSame(fields, ['name', 'script', 'context', 'exports']);

  const keys = Object.keys(ms.exports);
  test.strictSame(keys, ['field', 'add', 'sub']);

  test.strictSame(ms.exports.field, 'value');
  test.strictSame(ms.exports.sub(2, 3), -1);
  test.strictSame(ms.exports.add(2, 3), 5);
  test.end();
});

metatests.test('Load empty script', async (test) => {
  try {
    const filePath = path.join(examples, 'simple');
    await metavm.readScript(filePath);
  } catch {
    test.end();
  }
  test.fail('Should throw');
});

metatests.test('Load script with context and options', (test) => {
  const filePath = path.join(examples, 'complex.js');
  const context = metavm.createContext({ setTimeout });
  const options = { filename: 'CUSTOM FILE NAME', context };
  metavm.readScript(filePath, options).then((ms) => {
    test.strictSame(ms.constructor.name, 'MetaScript');
    ms.exports.add(2, 3, (err, sum) => {
      test.strictSame(err.constructor.name === 'Error', true);
      test.strictSame(err.stack.includes('CUSTOM FILE NAME'), true);
      test.strictSame(err.message, 'Custom error');
      test.strictSame(sum, 5);
      test.end();
    });
  });
});

metatests.test('Load function', async (test) => {
  const filePath = path.join(examples, 'function.js');
  const ms = await metavm.readScript(filePath);

  test.strictSame(typeof ms.exports, 'function');

  const fields = Object.keys(ms);
  test.strictSame(fields, ['name', 'script', 'context', 'exports']);

  test.strictSame(ms.exports(2, 3), 6);
  test.strictSame(ms.exports.bind(this, 3)(4), 12);
  test.end();
});

metatests.test('Load arrow function', async (test) => {
  const filePath = path.join(examples, 'arrow.js');
  const ms = await metavm.readScript(filePath);

  test.strictSame(typeof ms.exports, 'function');
  test.strictSame(ms.exports.toString(), '(a, b) => a + b');
  test.strictSame(ms.exports(2, 3), 5);
  test.strictSame(ms.exports(-1, 1), 0);
  test.end();
});

metatests.test('Load async function', async (test) => {
  const filePath = path.join(examples, 'async.js');
  const ms = await metavm.readScript(filePath);

  test.strictSame(typeof ms.exports, 'function');
  test.strictSame(ms.exports.constructor.name, 'AsyncFunction');

  const expected = { name: 'str', data: { field: 'value' } };
  const result = await ms.exports('str', { field: 'value' });
  test.strictSame(result, expected);

  test.isRejected(ms.exports('', { field: 'value' }));
  test.end();
});

metatests.test('File is not found', async (test) => {
  const filePath = path.join(examples, 'notfound.js');
  let ms;
  try {
    ms = await metavm.readScript(filePath);
  } catch (err) {
    test.strictSame(err.code, 'ENOENT');
  }
  test.strictSame(ms, undefined);
  test.end();
});

metatests.test('Syntax error', async (test) => {
  const filePath = path.join(examples, 'syntax.error');
  let ms;
  try {
    ms = await metavm.readScript(filePath);
  } catch (err) {
    test.strictSame(err.constructor.name, 'SyntaxError');
  }
  test.strictSame(ms, undefined);
  test.end();
});

metatests.test('Create default context', async (test) => {
  const context = metavm.createContext();
  test.strictSame(Object.keys(context), []);
  test.strictSame(context.global, undefined);
  test.end();
});

metatests.test('Create common context', async (test) => {
  const context = metavm.createContext(metavm.COMMON_CONTEXT);
  test.strictSame(typeof context, 'object');
  test.strictSame(context.console, console);
  test.strictSame(context.global, undefined);
  test.end();
});

metatests.test('Create custom context', async (test) => {
  const sandbox = { field: 'value' };
  sandbox.global = sandbox;
  const context = metavm.createContext(sandbox);
  test.strictSame(context.field, 'value');
  test.strictSame(Object.keys(context), ['field', 'global']);
  test.strictSame(context.global, sandbox);
  test.end();
});

metatests.test('Call undefined as a function', async (test) => {
  const filePath = path.join(examples, 'undef.js');
  const ms = await metavm.readScript(filePath);

  let result;
  try {
    result = await ms.exports();
  } catch (err) {
    test.strictSame(err.constructor.name, 'TypeError');
    test.strictSame(result, undefined);
  }
  test.end();
});

metatests.test('Metarequire node internal module', async (test) => {
  const sandbox = {};
  sandbox.global = sandbox;
  sandbox.require = metavm.metarequire(sandbox, { fs });
  const context = metavm.createContext(sandbox);
  const src = `({ fs: require('fs') })`;
  const ms = metavm.createScript('Example', src, { context });
  test.strictSame(typeof ms.exports, 'object');
  test.strictSame(typeof ms.exports.fs.promises, 'object');
  test.end();
});

metatests.test('Metarequire internal not permitted', async (test) => {
  const sandbox = {};
  sandbox.global = sandbox;
  sandbox.require = metavm.metarequire(sandbox);
  const context = metavm.createContext(sandbox);
  const src = `({ fs: require('fs') })`;
  try {
    const ms = metavm.createScript('Example', src, { context });
    test.strictSame(ms, undefined);
  } catch (err) {
    test.strictSame(err.message, `Cannot find module: 'fs'`);
  }
  test.end();
});

metatests.test('Metarequire non-existent module', async (test) => {
  const sandbox = {};
  sandbox.global = sandbox;
  sandbox.require = metavm.metarequire(sandbox);
  const context = metavm.createContext(sandbox);
  const src = `({ notExist: require('nothing') })`;
  try {
    const ms = metavm.createScript('Example', src, { context });
    test.strictSame(ms, undefined);
  } catch (err) {
    test.strictSame(err.message, `Cannot find module: 'nothing'`);
  }
  test.end();
});

metatests.test('Metarequire nestsed modules', async (test) => {
  const sandbox = {};
  sandbox.global = sandbox;
  sandbox.require = metavm.metarequire(sandbox);
  const context = metavm.createContext(sandbox);
  const src = `({ loaded: require('./test/examples/nestedmodule1.js') })`;
  const ms = metavm.createScript('Example', src, { context });
  test.strictSame(ms.exports.loaded.exports.value, 1);
  test.strictSame(ms.exports.loaded.exports.nested.exports.value, 2);
  test.end();
});
