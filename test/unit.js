'use strict';

const { MetaScript } = require('..');
const path = require('path');
const metatests = require('metatests');

const examples = path.join(__dirname, 'examples');

metatests.test('Load script', async test => {
  const filePath = path.join(examples, 'simple.js');
  const ms = await new MetaScript(filePath);
  test.strictSame(ms.script.field, 'value');
  test.strictSame(ms.script.fn(2, 3), [2, 3]);
  test.strictSame(ms.script.method(2, 3), [2, 3]);
  test.end();
});

metatests.test('File is not found', async test => {
  const filePath = path.join(examples, 'notfound.js');
  let ms;
  try {
    ms = await new MetaScript(filePath);
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
    ms = await new MetaScript(filePath);
  } catch (err) {
    test.strictSame(err.constructor.name, 'SyntaxError');
  }
  test.strictSame(ms, undefined);
  test.end();
});
