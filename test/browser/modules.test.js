'use strict';

if (typeof window !== 'undefined') {
  const { assert, metavm, test } = globalThis;

  const load = (source, options) =>
    metavm.createScript('main.js', source, {
      type: metavm.MODULE_TYPE.COMMONJS,
      dirname: '/app',
      context: metavm.createContext({}),
      ...options,
    });

  test('nested virtual modules return a callable export', () => {
    const script = load(`module.exports = require('./math.js').add;`, {
      access: { './math.js': true },
      modules: {
        '/app/math.js': {
          type: metavm.MODULE_TYPE.COMMONJS,
          source: 'module.exports = { add: (a, b) => a + b };',
        },
      },
    });
    assert.strictEqual(script.exports(2, 3), 5);
  });

  test('json, extension order, cycles, and falsy exports', () => {
    const modules = {
      '/app/config.js': { source: 'module.exports = "js";' },
      '/app/config.json': { json: { enabled: true } },
      '/app/zero.js': { source: 'module.exports = 0;' },
      '/app/a.js': {
        source: `exports.value = 1;
          exports.b = require('./b.js');
          exports.value = 2;`,
      },
      '/app/b.js': {
        source: `const a = require('./a.js');
          module.exports = { value: a.value };`,
      },
    };
    const config = load(`module.exports = require('./config');`, {
      access: { './': true },
      modules,
    });
    assert.strictEqual(config.exports, 'js');
    const json = load(`module.exports = require('./config.json');`, {
      access: { './': true },
      modules,
    });
    assert.deepEqual(json.exports, { enabled: true });
    const zero = load(`module.exports = require('./zero.js');`, {
      access: { './zero.js': true },
      modules,
    });
    assert.strictEqual(zero.exports, 0);
    const cycle = load(`module.exports = require('./a.js');`, {
      access: { './': true },
      modules,
    });
    assert.strictEqual(cycle.exports.value, 2);
    assert.strictEqual(cycle.exports.b.value, 1);
  });

  test('access objects are returned and require does not fetch', () => {
    const clock = { now: () => performance.now() };
    let fetches = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (...args) => {
      fetches += 1;
      return original(...args);
    };
    try {
      const script = load(`module.exports = require('clock');`, {
        access: { clock },
      });
      assert.strictEqual(script.exports, clock);
      assert.throws(
        () =>
          load(`require('./missing.js');`, {
            access: { './missing.js': true },
            modules: {},
          }),
        (error) => error.code === metavm.ERROR_CODE.MODULE_NOT_FOUND,
      );
      assert.throws(
        () => load(`require('./secret.js');`, { access: {}, modules: {} }),
        (error) => error.code === metavm.ERROR_CODE.ACCESS_DENIED,
      );
      assert.strictEqual(fetches, 0);
    } finally {
      globalThis.fetch = original;
    }
  });
}
