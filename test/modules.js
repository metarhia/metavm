'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const metavm = require('..');

const examples = path.join(__dirname, '../examples/cjs');

const cjs = (source, options = {}) =>
  metavm.createScript('main.js', source, {
    type: metavm.MODULE_TYPE.COMMONJS,
    dirname: '/app',
    access: { './': true },
    ...options,
  });

test('Return falsy CommonJS exports', () => {
  for (const value of [0, '', false, null]) {
    const script = cjs(`module.exports = ${JSON.stringify(value)};`, {
      dirname: examples,
      access: {},
    });
    assert.strictEqual(script.exports, value);
  }
});

test('Load nested virtual CommonJS modules', () => {
  const script = cjs(`module.exports = require('./math.js').add;`, {
    access: { './math.js': true, './config.json': true },
    modules: {
      '/app/math.js': {
        type: metavm.MODULE_TYPE.COMMONJS,
        source: `const config = require('./config.json');
          module.exports = {
            add: (a, b) => a + b,
            enabled: config.enabled,
          };`,
      },
      '/app/config.json': { json: { enabled: true } },
    },
  });
  assert.strictEqual(script.exports(2, 3), 5);
  assert.strictEqual(script.exports.enabled, undefined);
  const math = cjs(`module.exports = require('./math.js');`, {
    access: { './math.js': true, './config.json': true },
    modules: {
      '/app/math.js': {
        source: `module.exports = {
          add: (a, b) => a + b,
          enabled: require('./config.json').enabled,
        };`,
      },
      '/app/config.json': { json: { enabled: true } },
    },
  });
  assert.strictEqual(math.exports.add(2, 3), 5);
  assert.strictEqual(math.exports.enabled, true);
});

test('Return host exports without copying them', () => {
  const clock = { now: () => 7 };
  const script = cjs(`module.exports = require('clock');`, {
    access: { clock: true },
    modules: { clock: { exports: clock } },
  });
  assert.strictEqual(script.exports, clock);
  assert.strictEqual(script.exports.now(), 7);
});

test('Access object is returned directly', () => {
  const clock = { now: () => 11 };
  const script = cjs(`module.exports = require('clock');`, {
    access: { clock },
  });
  assert.strictEqual(script.exports, clock);
});

test('Resolve .js before .json and do not load index.js', () => {
  const modules = {
    '/app/config.js': { source: 'module.exports = "js";' },
    '/app/config.json': { json: { kind: 'json' } },
    '/app/lib/index.js': { source: 'module.exports = 1;' },
  };
  const fromJs = cjs(`module.exports = require('./config');`, {
    access: { './': true },
    modules,
  });
  assert.strictEqual(fromJs.exports, 'js');
  const fromJson = cjs(`module.exports = require('./config.json');`, {
    access: { './': true },
    modules,
  });
  assert.deepStrictEqual(fromJson.exports, { kind: 'json' });
  assert.throws(
    () =>
      cjs(`module.exports = require('./lib');`, {
        access: { './': true },
        modules,
      }),
    { code: metavm.ERROR_CODE.MODULE_NOT_FOUND },
  );
});

test('Circular virtual modules see partial exports', () => {
  const script = cjs(`module.exports = require('./a.js');`, {
    access: { './': true },
    modules: {
      '/app/a.js': {
        source: `exports.value = 1;
          exports.b = require('./b.js');
          exports.value = 2;`,
      },
      '/app/b.js': {
        source: `const a = require('./a.js');
          module.exports = { value: a.value };`,
      },
    },
  });
  assert.strictEqual(script.exports.value, 2);
  assert.strictEqual(script.exports.b.value, 1);
});

test('Failed virtual modules are not cached', () => {
  const options = {
    access: { './bad.js': true },
    modules: {
      '/app/bad.js': { source: 'throw new Error("bad");' },
    },
  };
  assert.throws(() => cjs(`require('./bad.js');`, options), { message: 'bad' });
  assert.throws(() => cjs(`require('./bad.js');`, options), { message: 'bad' });
});

test('Denied and missing virtual modules use different errors', () => {
  const modules = {
    '/app/secret.js': { source: 'module.exports = 1;' },
  };
  assert.throws(
    () =>
      cjs(`require('./secret.js');`, {
        access: {},
        modules,
      }),
    { code: metavm.ERROR_CODE.ACCESS_DENIED },
  );
  assert.throws(
    () =>
      cjs(`require('./missing.js');`, {
        access: { './missing.js': true },
        modules,
      }),
    { code: metavm.ERROR_CODE.MODULE_NOT_FOUND },
  );
});

test('Virtual registry does not replace filesystem modules', () => {
  const script = metavm.createScript(
    'main.js',
    `module.exports = require('./nestedmodule2.js');`,
    {
      type: metavm.MODULE_TYPE.COMMONJS,
      dirname: examples,
      access: { './nestedmodule2.js': true },
      modules: {
        '/unused.js': { source: 'module.exports = 1;' },
      },
    },
  );
  assert.strictEqual(script.exports.value, 2);
});

test('Virtual module shadows a filesystem file', () => {
  const absolute = path.resolve(examples, 'nestedmodule2.js');
  const script = metavm.createScript(
    'main.js',
    `module.exports = require('./nestedmodule2.js');`,
    {
      type: metavm.MODULE_TYPE.COMMONJS,
      dirname: examples,
      access: { './nestedmodule2.js': true },
      modules: {
        [absolute]: { source: 'module.exports = { value: 42 };' },
      },
    },
  );
  assert.strictEqual(script.exports.value, 42);
});

test('String module entries are not treated as source', () => {
  assert.throws(
    () =>
      cjs(`require('clock');`, {
        access: { clock: true },
        modules: { clock: 'module.exports = 1;' },
      }),
    { code: metavm.ERROR_CODE.MODULE_NOT_FOUND },
  );
});

test('Separate contexts do not share the virtual module cache', () => {
  const modules = {
    '/app/box.js': {
      source: 'module.exports = { n: 0 };',
    },
  };
  const first = cjs(`module.exports = require('./box.js');`, {
    context: metavm.createContext({}),
    access: { './box.js': true },
    modules,
  });
  const second = cjs(`module.exports = require('./box.js');`, {
    context: metavm.createContext({}),
    access: { './box.js': true },
    modules,
  });
  first.exports.n = 4;
  assert.strictEqual(second.exports.n, 0);
});
