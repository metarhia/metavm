'use strict';

if (typeof window !== 'undefined') {
  const { assert, metavm, test } = globalThis;

  test('syntax errors and runtime filenames', () => {
    assert.throws(
      () => metavm.createScript('calc.js', 'const [ ='),
      (error) => error.name === 'SyntaxError',
    );
    assert.throws(
      () => metavm.createScript('calc.js', 'unknownFn()'),
      (error) => {
        const stack = String(error.stack);
        const named = stack.includes('calc.js');
        const webkitEval = stack.includes('eval code');
        return error.name === 'ReferenceError' && (named || webkitEval);
      },
    );
  });

  test('unsupported vm options and preventEscape fail clearly', () => {
    assert.throws(
      () => metavm.createScript('T', '1', { timeout: 10 }),
      (error) =>
        error.code === metavm.ERROR_CODE.OPTION_NOT_SUPPORTED &&
        error.message.includes('timeout'),
    );
    assert.throws(
      () => metavm.createScript('T', '1', { microtaskMode: 'afterEvaluate' }),
      (error) => error.message.includes('microtaskMode'),
    );
    assert.throws(
      () => metavm.createContext({}, true),
      (error) => error.message.includes('preventEscape'),
    );
  });

  test('ECMAScript modules stay unsupported', () => {
    assert.throws(
      () =>
        metavm.createScript('Mod', 'export const value = 1;', {
          type: metavm.MODULE_TYPE.ECMA,
        }),
      (error) => error.code === metavm.ERROR_CODE.ESM_NOT_SUPPORTED,
    );
  });
}
