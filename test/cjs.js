'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const metavm = require('..');

const examples = path.join(__dirname, '../examples/cjs');

test('Access with readScript', async () => {
  const filePath = path.join(examples, 'nestedmodule1.js');
  const ms = await metavm.readScript(filePath, {
    dirname: examples,
    access: {
      './nestedmodule2.js': true,
    },
    type: metavm.MODULE_TYPE.COMMONJS,
  });
  assert.strictEqual(ms.exports.value, 1);
  assert.strictEqual(ms.exports.nested.value, 2);
});
