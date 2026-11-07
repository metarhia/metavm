'use strict';

if (typeof window !== 'undefined') {
  const { assert, metavm, test } = globalThis;
  const frames = () => document.querySelectorAll('iframe[data-metavm]').length;

  test('createContext returns the same object', () => {
    const initial = { n: 1 };
    const context = metavm.createContext(initial);
    assert.strictEqual(metavm.createContext(context), initial);
  });

  test('host objects and callbacks stay live', () => {
    const box = { n: 1 };
    let seen = 0;
    const context = metavm.createContext({
      box,
      inc() {
        seen += 1;
      },
    });
    const script = metavm.createScript('Live', 'inc(); box.n += 1; box', {
      context,
    });
    assert.strictEqual(seen, 1);
    assert.strictEqual(script.exports, box);
    assert.strictEqual(box.n, 2);
  });

  test('primitive writes, var, and globalThis sync back', () => {
    const context = metavm.createContext({ n: 1 });
    metavm.createScript('Write', 'n = 2', { context });
    assert.strictEqual(context.n, 2);
    metavm.createScript('Global', 'globalThis.n = 3', { context });
    assert.strictEqual(context.n, 3);
    metavm.createScript('Var', 'globalThis.added = 5', { context });
    assert.strictEqual(context.added, 5);
    metavm.createScript('Local', 'var hidden = 9', { context });
    assert.strictEqual(context.hidden, undefined);
  });

  test('assignment is visible when evaluation throws', () => {
    const context = metavm.createContext({ n: 1 });
    const source = 'n = 4; throw new Error("boom")';
    assert.throws(
      () => metavm.createScript('Boom', source, { context }),
      (error) => error.message === 'boom',
    );
    assert.strictEqual(context.n, 4);
  });

  test('exported functions keep running in the original realm', () => {
    const context = metavm.createContext({ n: 1 });
    const script = metavm.createScript(
      'Step',
      '() => { n += 1; return { n, realm: window }; }',
      { context },
    );
    const first = script.exports();
    const second = script.exports();
    assert.strictEqual(first.n, 2);
    assert.strictEqual(second.n, 3);
    assert.strictEqual(context.n, 3);
    assert.notStrictEqual(first.realm, window);
    assert.strictEqual(first.realm.parent, window);
    assert.strictEqual(first.realm, second.realm);
  });

  test('reassignment replaces the host binding', () => {
    const box = { n: 1 };
    const context = metavm.createContext({ box });
    metavm.createScript('Replace', 'box = { n: 5 }', { context });
    assert.strictEqual(context.box.n, 5);
    assert.notStrictEqual(context.box, box);
  });

  test('contexts are isolated and a context reuses one iframe', () => {
    const before = frames();
    const first = metavm.createContext({});
    const second = metavm.createContext({});
    metavm.createScript('A', 'globalThis.n = 1', { context: first });
    metavm.createScript('A2', 'n = 2', { context: first });
    const read = metavm.createScript('B', 'typeof n', { context: second });
    assert.strictEqual(first.n, 2);
    assert.strictEqual(read.exports, 'undefined');
    assert.strictEqual(frames(), before + 2);
  });

  test('frozen and sealed contexts keep their constraints', () => {
    const frozen = metavm.createContext(Object.freeze({ n: 1 }));
    assert.throws(() => {
      metavm.createScript('Frozen', 'n = 2', { context: frozen });
    });
    assert.strictEqual(frozen.n, 1);
    const sealed = metavm.createContext(Object.seal({ n: 1 }));
    const sealedSource = 'n = 6; globalThis.extra = 1';
    metavm.createScript('Sealed', sealedSource, { context: sealed });
    assert.strictEqual(sealed.n, 6);
    assert.strictEqual(sealed.extra, undefined);
  });

  test('disposeContext removes the frame and rejects later scripts', () => {
    const before = frames();
    const context = metavm.createContext({});
    const source = '(value) => value + 1';
    const script = metavm.createScript('Keep', source, { context });
    assert.strictEqual(script.exports(1), 2);
    assert.strictEqual(frames(), before + 1);
    metavm.disposeContext(context);
    assert.strictEqual(frames(), before);
    assert.throws(
      () => metavm.createScript('Again', '1', { context }),
      (error) => error.code === metavm.ERROR_CODE.CONTEXT_DISPOSED,
    );
    assert.strictEqual(script.exports(1), 2);
  });
}
