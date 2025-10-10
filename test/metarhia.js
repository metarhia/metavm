'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const metavm = require('..');

const examples = path.join(__dirname, '../examples');

const SCRIPT_FIELDS = [
  'name',
  'dirname',
  'relative',
  'type',
  'access',
  'script',
  'context',
  'exports',
];

test('Load script', async () => {
  const filePath = path.join(examples, 'simple.js');
  const ms = await metavm.readScript(filePath);

  assert.strictEqual(typeof ms.exports, 'object');

  const fields = Object.keys(ms);
  assert.deepEqual(fields, SCRIPT_FIELDS);

  const keys = Object.keys(ms.exports);
  assert.deepEqual(keys, ['field', 'add', 'sub']);

  assert.strictEqual(ms.exports.field, 'value');
  assert.strictEqual(ms.exports.sub(2, 3), -1);
  assert.strictEqual(ms.exports.add(2, 3), 5);
});

test('Load empty script', async () => {
  try {
    const filePath = path.join(examples, 'simple');
    await metavm.readScript(filePath);
    assert.fail('Should throw');
  } catch (err) {
    assert.strictEqual(err.constructor.name, 'SyntaxError');
  }
});

test('Load script with context and options', () => {
  const filePath = path.join(examples, 'complex.js');
  const context = metavm.createContext({ setTimeout });
  const options = { filename: 'CUSTOM FILE NAME', context };
  metavm.readScript(filePath, options).then((ms) => {
    assert.strictEqual(ms.constructor.name, 'MetaScript');
    ms.exports.add(2, 3, (err, sum) => {
      assert.strictEqual(err.constructor.name === 'Error', true);
      assert.strictEqual(err.stack.includes('CUSTOM FILE NAME'), true);
      assert.strictEqual(err.message, 'Custom error');
      assert.strictEqual(sum, 5);
    });
  });
});

test('Load function', async () => {
  const filePath = path.join(examples, 'function.js');
  const ms = await metavm.readScript(filePath);

  assert.strictEqual(typeof ms.exports, 'function');

  const fields = Object.keys(ms);
  assert.deepEqual(fields, SCRIPT_FIELDS);

  assert.strictEqual(ms.exports(2, 3), 6);
  assert.strictEqual(ms.exports.bind(null, 3)(4), 12);
});

test('Load arrow function', async () => {
  const filePath = path.join(examples, 'arrow.js');
  const ms = await metavm.readScript(filePath);

  assert.strictEqual(typeof ms.exports, 'function');
  assert.strictEqual(ms.exports.toString(), '(a, b) => a + b');
  assert.strictEqual(ms.exports(2, 3), 5);
  assert.strictEqual(ms.exports(-1, 1), 0);
});

test('Load async function', async () => {
  const filePath = path.join(examples, 'async.js');
  const ms = await metavm.readScript(filePath);

  assert.strictEqual(typeof ms.exports, 'function');
  assert.strictEqual(ms.exports.constructor.name, 'AsyncFunction');

  const expected = { name: 'str', data: { field: 'value' } };
  const result = await ms.exports('str', { field: 'value' });
  assert.deepEqual(result, expected);

  assert.rejects(ms.exports('', { field: 'value' }));
});

test('Use local identifier', async () => {
  const context = metavm.createContext({});
  const filePath = path.join(examples, 'local.js');
  const ms1 = await metavm.readScript(filePath, { context });

  const expected = { args: ['str'], local: 'hello' };
  const result = await ms1.exports('str');
  assert.deepEqual(result, expected);
});

test('File is not found', async () => {
  const filePath = path.join(examples, 'notfound.js');
  let ms;
  try {
    ms = await metavm.readScript(filePath);
  } catch (err) {
    assert.strictEqual(err.code, 'ENOENT');
  }
  assert.strictEqual(ms, undefined);
});

test('Syntax error', async () => {
  const filePath = path.join(examples, 'syntax.error');
  try {
    await metavm.readScript(filePath);
    assert.fail();
  } catch (err) {
    assert.strictEqual(err.constructor.name, 'SyntaxError');
  }
});

test('Reference error', async () => {
  const filePath = path.join(examples, 'referenceError.js');
  try {
    const script = await metavm.readScript(filePath);
    await script.exports();
    assert.fail();
  } catch (err) {
    assert.strictEqual(err.constructor.name, 'ReferenceError');
  }
});

test('Line number and position', async () => {
  {
    const filePath = path.join(examples, 'referenceError.js');
    try {
      const script = await metavm.readScript(filePath);
      await script.exports();
      assert.fail();
    } catch (err) {
      const [, firstLine] = err.stack.split('\n');
      const [, lineNumber, position] = firstLine.split(':');
      assert.strictEqual(parseInt(lineNumber, 10), 2);
      assert.strictEqual(parseInt(position, 10), 18);
    }
  }
  {
    const filePath = path.join(examples, 'useStrict.cjs');
    try {
      const script = await metavm.readScript(filePath);
      await script.exports();
      assert.fail();
    } catch (err) {
      const [, firstLine] = err.stack.split('\n');
      const [, lineNumber, position] = firstLine.split(':');
      assert.strictEqual(parseInt(lineNumber, 10), 4);
      assert.strictEqual(parseInt(position, 10), 18);
    }
  }
  {
    const filePath = path.join(examples, 'simpleUndef.js');
    try {
      const script = await metavm.readScript(filePath);
      script.exports.add(5, 2);
      assert.fail();
    } catch (err) {
      const [, firstLine] = err.stack.split('\n');
      const [, lineNumber, position] = firstLine.split(':');
      assert.strictEqual(parseInt(lineNumber, 10), 5);
      assert.strictEqual(parseInt(position, 10), 14);
    }
  }
});

test('Create default context', async () => {
  const context = metavm.createContext();
  assert.deepEqual(Object.keys(context), []);
  assert.strictEqual(context.global, undefined);
});

test('Create common context', async () => {
  const context = metavm.createContext(metavm.COMMON_CONTEXT);
  assert.strictEqual(typeof context, 'object');
  assert.strictEqual(context.global, undefined);
  assert.strictEqual(context.console, undefined);
  assert.strictEqual(context.process, undefined);
  assert.strictEqual(context.AbortController, AbortController);
  assert.strictEqual(context.Buffer, Buffer);
  assert.strictEqual(context.Event, Event);
  assert.strictEqual(context.EventTarget, EventTarget);
  assert.strictEqual(context.MessageChannel, MessageChannel);
  assert.strictEqual(context.MessageEvent, MessageEvent);
  assert.strictEqual(context.MessagePort, MessagePort);
  assert.strictEqual(context.URL, URL);
  assert.strictEqual(context.URLSearchParams, URLSearchParams);
  assert.strictEqual(context.TextDecoder, TextDecoder);
  assert.strictEqual(context.TextEncoder, TextEncoder);
  assert.strictEqual(context.queueMicrotask, queueMicrotask);
  assert.strictEqual(context.setTimeout, setTimeout);
  assert.strictEqual(context.setImmediate, setImmediate);
  assert.strictEqual(context.setInterval, setInterval);
  assert.strictEqual(context.clearTimeout, clearTimeout);
  assert.strictEqual(context.clearImmediate, clearImmediate);
  assert.strictEqual(context.clearInterval, clearInterval);
  assert.strictEqual(context.fetch, fetch);
});

test('Create nodejs context', async () => {
  const context = metavm.createContext(metavm.NODE_CONTEXT);
  assert.strictEqual(typeof context, 'object');
  assert.strictEqual(context.global, global);
  assert.strictEqual(context.console, console);
  assert.strictEqual(context.process, process);
});

test('Create custom context', async () => {
  const sandbox = { field: 'value' };
  sandbox.global = sandbox;
  const context = metavm.createContext(sandbox);
  assert.strictEqual(context.field, 'value');
  assert.deepEqual(Object.keys(context), ['field', 'global']);
  assert.strictEqual(context.global, sandbox);
});

test('Call undefined as a function', async () => {
  const filePath = path.join(examples, 'undef.js');
  try {
    const ms = await metavm.readScript(filePath, { microtaskMode: 'none' });
    await ms.exports();
    assert.fail();
  } catch (err) {
    assert.strictEqual(err.constructor.name, 'TypeError');
  }
});
