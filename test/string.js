'use strict';

const test = require('node:test');
const assert = require('node:assert');
const metavm = require('..');

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

test('Prevent eval for Metarhia modules', async () => {
  const src = `eval('100 * 2')`;
  try {
    metavm.createScript('Example', src);
    assert.fail();
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
    assert.fail('Should not be loaded', ms);
  } catch (err) {
    const module2 = './nestedmodule2.js';
    assert.strictEqual(err.message, `Access denied '${module2}'`);
  }
});

test('Access nestsed npm modules', async () => {
  const src = `module.exports = require('typescript');`;
  const ms = metavm.createScript('Example', src, {
    access: {
      typescript: true,
    },
    type: metavm.MODULE_TYPE.COMMONJS,
  });
  assert.strictEqual(typeof ms.exports, 'object');
});

test('Prevent eval for common.js modules', async () => {
  const src = `module.exports = eval('100 * 2');`;
  try {
    metavm.createScript('Example', src, {
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    assert.fail();
  } catch (error) {
    assert.strictEqual(error.constructor.name, 'EvalError');
  }
});

test('ECMAScript modules', async () => {
  const sandbox = {};
  sandbox.global = sandbox;
  const src = `
    const fn = x => x;
    export { fn };
  `;
  try {
    const ms = metavm.createScript('Example', src, {
      context: metavm.createContext(sandbox),
      dirname: __dirname,
      type: metavm.MODULE_TYPE.ECMA,
    });
    assert.fail(ms);
  } catch (err) {
    assert.ok(err);
  }
});
