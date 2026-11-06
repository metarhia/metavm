'use strict';

if (typeof window !== 'undefined') {
  const { assert, metavm, test } = globalThis;

  test('readScript loads a relative entry synchronously', async () => {
    const script = await metavm.readScript('fixtures/add.js');
    assert.strictEqual(script.name, 'add');
    assert.strictEqual(script.dirname, '/test/browser/fixtures');
    assert.strictEqual(script.exports(2, 3), 5);
  });

  test('readScript honors filename and dirname', async () => {
    const script = await metavm.readScript('fixtures/value.js', {
      filename: 'CUSTOM',
      dirname: '/virtual',
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    assert.strictEqual(script.name, 'CUSTOM');
    assert.strictEqual(script.dirname, '/virtual');
    assert.strictEqual(script.exports.value, 7);
  });

  test('empty dirname falls back to the entry directory', async () => {
    const script = await metavm.readScript('fixtures/add.js', { dirname: '' });
    assert.strictEqual(script.dirname, '/test/browser/fixtures');
  });

  test('HTTP errors and empty source fail clearly', async () => {
    await assert.rejects(metavm.readScript('/missing-script.js'), (error) =>
      error.message.includes('404'),
    );
    await assert.rejects(
      metavm.readScript('fixtures/empty.js'),
      (error) =>
        error.name === 'SyntaxError' && error.message.includes('empty'),
    );
  });

  test('cross-origin reads fail without crawling dependencies', async () => {
    const url = `http://localhost:${location.port}/test/browser/fixtures/add.js`;
    await assert.rejects(metavm.readScript(url), (error) =>
      error.message.includes(url),
    );
  });
}
