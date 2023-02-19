'use strict';

const path = require('node:path');
const metatests = require('metatests');
const metavm = require('..');

const examples = path.join(__dirname, 'examples');

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

metatests.test('MetaScript constructor', async (test) => {
  const src = `({ field: 'value' });`;
  const ms = new metavm.MetaScript('Example', src);

  test.strictSame(typeof ms.exports, 'object');

  const fields = Object.keys(ms);
  test.strictSame(fields, SCRIPT_FIELDS);

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
  test.strictSame(fields, SCRIPT_FIELDS);

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
  test.strictSame(fields, SCRIPT_FIELDS);

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
  test.strictSame(fields, SCRIPT_FIELDS);

  test.strictSame(ms.exports(2, 3), 6);
  test.strictSame(ms.exports.bind(null, 3)(4), 12);
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

metatests.test('Use local identifier', async (test) => {
  const context = metavm.createContext({});
  const filePath = path.join(examples, 'local.js');
  const ms1 = await metavm.readScript(filePath, { context });
  const ms2 = await metavm.readScript(filePath, { context });
  console.log({ ms1, ms2 });

  const expected = { args: ['str'], local: 'hello' };
  const result = await ms1.exports('str');
  console.log({ result });
  test.strictSame(result, expected);

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
  try {
    await metavm.readScript(filePath);
    test.fail();
  } catch (err) {
    test.strictSame(err.constructor.name, 'SyntaxError');
  }
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
  try {
    const ms = await metavm.readScript(filePath, { microtaskMode: 'none' });
    await ms.exports();
    test.fail();
  } catch (err) {
    test.strictSame(err.constructor.name, 'TypeError');
  }
  test.end();
});

metatests.test('Access for node internal module', async (test) => {
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
  test.strictSame(typeof ms.exports, 'object');
  test.strictSame(typeof ms.exports.fs.promises, 'object');
  test.end();
});

metatests.test('Access for stub module', async (test) => {
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
  test.strictSame(res, 'stub-content');
  test.end();
});

metatests.test('Access internal not permitted', async (test) => {
  try {
    const src = `const fs = require('fs');`;
    const ms = metavm.createScript('Example', src, {
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    test.strictSame(ms, undefined);
  } catch (err) {
    test.strictSame(err.message, `Access denied 'fs'`);
  }
  test.end();
});

metatests.test('Access non-existent not permitted', async (test) => {
  try {
    const src = `const notExist = require('nothing');`;
    const ms = metavm.createScript('Example', src, {
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    test.strictSame(ms, undefined);
  } catch (err) {
    test.strictSame(err.message, `Access denied 'nothing'`);
  }
  test.end();
});

metatests.test('Access non-existent module', async (test) => {
  try {
    const src = `const notExist = require('metalog');`;
    const ms = metavm.createScript('Example', src, {
      access: {
        metalog: true,
      },
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    test.strictSame(ms, undefined);
  } catch (err) {
    test.strictSame(err.message, `Cannot find module 'metalog'`);
  }
  test.end();
});

metatests.test('Access nestsed commonjs', async (test) => {
  const sandbox = {};
  sandbox.global = sandbox;
  const src = `module.exports = require('./examples/nestedmodule1');`;
  const ms = metavm.createScript('Example', src, {
    context: metavm.createContext(sandbox),
    dirname: __dirname,
    access: {
      './examples/nestedmodule1.js': true,
      './examples/nestedmodule2.js': true,
    },
    type: metavm.MODULE_TYPE.COMMONJS,
  });
  test.strictSame(ms.exports.value, 1);
  test.strictSame(ms.exports.nested.value, 2);
  test.end();
});

metatests.test('Access folder (path prefix)', async (test) => {
  const src = `module.exports = require('./examples/nestedmodule1.js');`;
  const ms = metavm.createScript('Example', src, {
    dirname: __dirname,
    access: {
      './examples': true,
    },
    type: metavm.MODULE_TYPE.COMMONJS,
  });
  test.strictSame(ms.exports.value, 1);
  test.strictSame(ms.exports.nested.value, 2);
  test.end();
});

metatests.test('Access with readScript', async (test) => {
  const filePath = path.join(examples, 'nestedmodule1.js');
  const ms = await metavm.readScript(filePath, {
    dirname: examples,
    access: {
      './nestedmodule2.js': true,
    },
    type: metavm.MODULE_TYPE.COMMONJS,
  });
  test.strictSame(ms.exports.value, 1);
  test.strictSame(ms.exports.nested.value, 2);
  test.end();
});

metatests.test('Access nestsed not permitted', async (test) => {
  try {
    const src = `module.exports = require('./examples/nestedmodule1.js');`;
    const ms = metavm.createScript('Example', src, {
      dirname: __dirname,
      access: {
        './examples/nestedmodule1.js': true,
      },
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    test.fail('Should not be loaded', ms);
  } catch (err) {
    const module2 = './nestedmodule2.js';
    test.strictSame(err.message, `Access denied '${module2}'`);
  }
  test.end();
});

metatests.test('Access nestsed npm modules', async (test) => {
  const src = `module.exports = require('inherits');`;
  const ms = metavm.createScript('Example', src, {
    access: {
      inherits: true,
    },
    type: metavm.MODULE_TYPE.COMMONJS,
  });
  test.strictSame(typeof ms.exports, 'function');
  test.end();
});

metatests.test('Prevent eval for common.js modules', async (test) => {
  const src = `module.exports = eval('100 * 2');`;
  try {
    metavm.createScript('Example', src, {
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    test.fail();
  } catch (error) {
    test.strictSame(error.constructor.name, 'EvalError');
  }
  test.end();
});

metatests.test('Erevent eval for Metarhia modules', async (test) => {
  const src = `eval('100 * 2')`;
  try {
    metavm.createScript('Example', src);
    test.fail();
  } catch (error) {
    test.strictSame(error.constructor.name, 'EvalError');
  }
  test.end();
});
