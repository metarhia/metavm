'use strict';

const metavm = require('..');
const path = require('path');
const metatests = require('metatests');

const examples = path.join(__dirname, 'examples');

metatests.test('Load script', async test => {
  const filePath = path.join(examples, 'simple.js');
  const ms = await metavm.load(filePath);
  test.strictSame(ms.exports.field, 'value');
  test.strictSame(ms.exports.fn(2, 3), [2, 3]);
  test.strictSame(ms.exports.method(2, 3), [2, 3]);
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
