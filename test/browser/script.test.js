'use strict';

if (typeof window !== 'undefined') {
  const { assert, metavm, test } = globalThis;

  test('expression exports an object synchronously', () => {
    const script = metavm.createScript('Example', '({ field: `value` });');
    assert.strictEqual(script.constructor.name, 'MetaScript');
    assert.strictEqual(script.exports.field, 'value');
    assert.strictEqual(script.exports instanceof Promise, false);
  });

  test('callable export adds without a promise', () => {
    const script = metavm.createScript('Calculator', '(a, b) => a + b');
    const add = script.exports;
    assert.strictEqual(typeof add, 'function');
    assert.strictEqual(add(2, 3), 5);
    assert.strictEqual(add(2, 3) instanceof Promise, false);
  });

  test('named constants are available', () => {
    assert.strictEqual(metavm.MODULE_TYPE.COMMONJS, 2);
    assert.strictEqual(metavm.ERROR_CODE.MODULE_NOT_FOUND, 'MODULE_NOT_FOUND');
    assert.ok(metavm.EMPTY_CONTEXT);
    assert.ok(metavm.EMPTY_CJS);
    assert.ok(metavm.COMMON_CONTEXT);
  });

  test('CommonJS can reassign module.exports to a function', () => {
    const script = metavm.createScript(
      'main.js',
      'module.exports = (a, b) => a + b;',
      { type: metavm.MODULE_TYPE.COMMONJS },
    );
    assert.strictEqual(script.exports(2, 3), 5);
  });
}
