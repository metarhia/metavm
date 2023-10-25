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

test('MetaScript constructor', async () => {
  const src = `({ field: 'value' });`;
  const ms = new metavm.MetaScript('Example', src);

  assert.strictEqual(typeof ms.exports, 'object');

  const fields = Object.keys(ms);
  assert.deepEqual(fields, SCRIPT_FIELDS);

  const keys = Object.keys(ms.exports);
  assert.deepEqual(keys, ['field']);

  assert.strictEqual(ms.exports.field, 'value');
});

test('MetaScript factory', async () => {
  const src = `({ field: 'value' });`;
  const ms = metavm.createScript('Example', src);

  assert.strictEqual(typeof ms.exports, 'object');

  const fields = Object.keys(ms);
  assert.deepEqual(fields, SCRIPT_FIELDS);

  const keys = Object.keys(ms.exports);
  assert.deepEqual(keys, ['field']);

  assert.strictEqual(ms.exports.field, 'value');
});

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
    test.fail('Should throw');
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
    test.fail();
  } catch (err) {
    assert.strictEqual(err.constructor.name, 'SyntaxError');
  }
});

test('Reference error', async () => {
  const filePath = path.join(examples, 'referenceError.js');
  try {
    const script = await metavm.readScript(filePath);
    await script.exports();
    test.fail();
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
      test.fail();
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
      test.fail();
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
      test.fail();
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
    test.fail();
  } catch (err) {
    assert.strictEqual(err.constructor.name, 'TypeError');
  }
});

test('Access for node internal module', async () => {
  const sandbox = {};
  sandbox.global = sandbox;
  const src = `module.exports = { fs: require('fs') };`;
  const ms = metavm.createScript('Example', src, {
    context: metavm.createContext(sandbox),
    dirname: __dirname,
    access: {
      fs: true,
    },
    type: metavm.MODULE_TYPE.COMMONJS,
  });
  assert.strictEqual(typeof ms.exports, 'object');
  assert.strictEqual(typeof ms.exports.fs.promises, 'object');
});

test('Access for stub module', async () => {
  const src = `
    const fs = require('fs');
    module.exports = {
      async useStub() {
        return new Promise((resolve) => {
          fs.readFile('name', (err, data) => {
            resolve(data);
          });
        });
      }
    };
  `;
  const ms = metavm.createScript('Example', src, {
    access: {
      fs: {
        readFile(filename, callback) {
          callback(null, 'stub-content');
        },
      },
    },
    type: metavm.MODULE_TYPE.COMMONJS,
  });
  const res = await ms.exports.useStub();
  assert.strictEqual(res, 'stub-content');
});

test('Access internal not permitted', async () => {
  try {
    const src = `const fs = require('fs');`;
    const ms = metavm.createScript('Example', src, {
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    assert.strictEqual(ms, undefined);
  } catch (err) {
    assert.strictEqual(err.message, `Access denied 'fs'`);
  }
});

test('Access non-existent not permitted', async () => {
  try {
    const src = `const notExist = require('nothing');`;
    const ms = metavm.createScript('Example', src, {
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    assert.strictEqual(ms, undefined);
  } catch (err) {
    assert.strictEqual(err.message, `Access denied 'nothing'`);
  }
});

test('Access non-existent module', async () => {
  try {
    const src = `const notExist = require('metalog');`;
    const ms = metavm.createScript('Example', src, {
      access: {
        metalog: true,
      },
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    assert.strictEqual(ms, undefined);
  } catch (err) {
    assert.strictEqual(err.message, `Cannot find module 'metalog'`);
  }
});

test('Access nestsed commonjs', async () => {
  const sandbox = {};
  sandbox.global = sandbox;
  const src = `module.exports = require('../examples/nestedmodule1');`;
  const ms = metavm.createScript('Example', src, {
    context: metavm.createContext(sandbox),
    dirname: __dirname,
    access: {
      '../examples/nestedmodule1.js': true,
      '../examples/nestedmodule2.js': true,
    },
    type: metavm.MODULE_TYPE.COMMONJS,
  });
  assert.strictEqual(ms.exports.value, 1);
  assert.strictEqual(ms.exports.nested.value, 2);
});

test('Access folder (path prefix)', async () => {
  const src = `module.exports = require('../examples/nestedmodule1.js');`;
  const ms = metavm.createScript('Example', src, {
    dirname: __dirname,
    access: {
      '../examples': true,
    },
    type: metavm.MODULE_TYPE.COMMONJS,
  });
  assert.strictEqual(ms.exports.value, 1);
  assert.strictEqual(ms.exports.nested.value, 2);
});

test('Access with readScript', async () => {
  const filePath = path.join(examples, 'nestedmodule1.js');
  const ms = await metavm.readScript(filePath, {
    dirname: examples,
    access: {
      './nestedmodule2.js': true,
    },
    type: metavm.MODULE_TYPE.COMMONJS,
  });
  assert.strictEqual(ms.exports.value, 1);
  assert.strictEqual(ms.exports.nested.value, 2);
});

test('Access nestsed not permitted', async () => {
  try {
    const src = `module.exports = require('../examples/nestedmodule1.js');`;
    const ms = metavm.createScript('Example', src, {
      dirname: __dirname,
      access: {
        '../examples/nestedmodule1.js': true,
      },
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    test.fail('Should not be loaded', ms);
  } catch (err) {
    const module2 = './nestedmodule2.js';
    assert.strictEqual(err.message, `Access denied '${module2}'`);
  }
});

test('Access nestsed npm modules', async () => {
  const src = `module.exports = require('inherits');`;
  const ms = metavm.createScript('Example', src, {
    access: {
      inherits: true,
    },
    type: metavm.MODULE_TYPE.COMMONJS,
  });
  assert.strictEqual(typeof ms.exports, 'function');
});

test('Prevent eval for common.js modules', async () => {
  const src = `module.exports = eval('100 * 2');`;
  try {
    metavm.createScript('Example', src, {
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    test.fail();
  } catch (error) {
    assert.strictEqual(error.constructor.name, 'EvalError');
  }
});

test('Erevent eval for Metarhia modules', async () => {
  const src = `eval('100 * 2')`;
  try {
    metavm.createScript('Example', src);
    test.fail();
  } catch (error) {
    assert.strictEqual(error.constructor.name, 'EvalError');
  }
});

test('Check native fetch', async () => {
  const src = `fetch`;
  const context = metavm.createContext(metavm.COMMON_CONTEXT);
  const ms = metavm.createScript('Example', src, { context });
  const proto = Object.getPrototypeOf(ms.exports);
  assert.ok(proto);
  assert.ok(proto.constructor.name.endsWith('Function'));
});

test('ECMAScript modules', async () => {
  const sandbox = {};
  sandbox.global = sandbox;
  const src = `const fn = x => x;
export { fn };
`;
  try {
    const ms = metavm.createScript('Example', src, {
      context: metavm.createContext(sandbox),
      dirname: __dirname,
      type: metavm.MODULE_TYPE.ECMA,
    });
    test.fail(ms);
  } catch (err) {
    assert.ok(err);
  }
});
