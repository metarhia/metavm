'use strict';

const metavm = require('..');
const path = require('path');
const metatests = require('metatests');

const examples = path.join(__dirname, 'examples');

metatests.test('MetaScript constructor', async test => {
  const src = `({ field: 'value' });`;
  const ms = new metavm.MetaScript(src, 'Example');

  test.strictSame(typeof ms.exports, 'object');

  const fields = Object.keys(ms);
  test.strictSame(fields, ['name', 'script', 'context', 'exports']);

  const keys = Object.keys(ms.exports);
  test.strictSame(keys, ['field']);

  test.strictSame(ms.exports.field, 'value');
  test.end();
});

metatests.test('MetaScript factory', async test => {
  const src = `({ field: 'value' });`;
  const ms = metavm.createScript(src, 'Example');

  test.strictSame(typeof ms.exports, 'object');

  const fields = Object.keys(ms);
  test.strictSame(fields, ['name', 'script', 'context', 'exports']);

  const keys = Object.keys(ms.exports);
  test.strictSame(keys, ['field']);

  test.strictSame(ms.exports.field, 'value');
  test.end();
});

metatests.test('Load script', async test => {
  const filePath = path.join(examples, 'simple.js');
  const ms = await metavm.load(filePath);

  test.strictSame(typeof ms.exports, 'object');

  const fields = Object.keys(ms);
  test.strictSame(fields, ['name', 'script', 'context', 'exports']);

  const keys = Object.keys(ms.exports);
  test.strictSame(keys, ['field', 'add', 'sub']);

  test.strictSame(ms.exports.field, 'value');
  test.strictSame(ms.exports.sub(2, 3), -1);
  test.strictSame(ms.exports.add(2, 3), 5);
  test.end();
});

metatests.test('Load function', async test => {
  const filePath = path.join(examples, 'function.js');
  const ms = await metavm.load(filePath);

  test.strictSame(typeof ms.exports, 'function');

  const fields = Object.keys(ms);
  test.strictSame(fields, ['name', 'script', 'context', 'exports']);

  test.strictSame(ms.exports(2, 3), 6);
  test.strictSame(ms.exports.bind(this, 3)(4), 12);
  test.end();
});

metatests.test('Load arrow function', async test => {
  const filePath = path.join(examples, 'arrow.js');
  const ms = await metavm.load(filePath);

  test.strictSame(typeof ms.exports, 'function');
  test.strictSame(ms.exports.toString(), '(a, b) => a + b');
  test.strictSame(ms.exports(2, 3), 5);
  test.strictSame(ms.exports(-1, 1), 0);
  test.end();
});

metatests.test('Load async function', async test => {
  const filePath = path.join(examples, 'async.js');
  const ms = await metavm.load(filePath);

  test.strictSame(typeof ms.exports, 'function');
  test.strictSame(ms.exports.constructor.name, 'AsyncFunction');

  const expected = { name: 'str', data: { field: 'value' } };
  const result = await ms.exports('str', { field: 'value' });
  test.strictSame(result, expected);

  test.isRejected(ms.exports('', { field: 'value' }));
  test.end();
});

metatests.test('File is not found', async test => {
  const filePath = path.join(examples, 'notfound.js');
  let ms;
  try {
    ms = await metavm.load(filePath);
  } catch (err) {
    test.strictSame(err.code, 'ENOENT');
  }
  test.strictSame(ms, undefined);
  test.end();
});

metatests.test('Syntax error', async test => {
  const filePath = path.join(examples, 'syntax.error');
  let ms;
  try {
    ms = await metavm.load(filePath);
  } catch (err) {
    test.strictSame(err.constructor.name, 'SyntaxError');
  }
  test.strictSame(ms, undefined);
  test.end();
});
