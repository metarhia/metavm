'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const metavm = require('..');

const examples = path.join(__dirname, '../examples/cjs');

const SCRIPT_FIELDS = [
  'name',
  'dirname',
  'relative',
  'type',
  'access',
  'script',
  'context',
  'exports',
];

test('Load CJS script', async () => {
  const filePath = path.join(examples, 'simple.js');
  const ms = await metavm.readScript(filePath, {
    type: metavm.MODULE_TYPE.COMMONJS,
  });

  assert.strictEqual(typeof ms.exports, 'object');

  const fields = Object.keys(ms);
  assert.deepEqual(fields, SCRIPT_FIELDS);

  const keys = Object.keys(ms.exports);
  assert.deepEqual(keys, ['field', 'add', 'sub']);

  assert.strictEqual(ms.exports.field, 'value');
  assert.strictEqual(ms.exports.sub(2, 3), -1);
  assert.strictEqual(ms.exports.add(2, 3), 5);
});

test('Load CJS empty script', async () => {
  try {
    const filePath = path.join(examples, 'empty');
    await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    assert.fail('Should throw');
  } catch (err) {
    assert.strictEqual(err.constructor.name, 'SyntaxError');
  }
});

test('Load CJS script with context and options', async () => {
  const filePath = path.join(examples, 'complex.js');
  const context = metavm.createContext({ setTimeout });
  const options = {
    filename: 'CUSTOM FILE NAME',
    context,
    type: metavm.MODULE_TYPE.COMMONJS,
  };
  const ms = await metavm.readScript(filePath, options);
  assert.strictEqual(ms.constructor.name, 'MetaScript');

  await new Promise((resolve) => {
    ms.exports.add(2, 3, (err, sum) => {
      assert.strictEqual(err.constructor.name === 'Error', true);
      assert.strictEqual(err.stack.includes('CUSTOM FILE NAME'), true);
      assert.strictEqual(err.message, 'Custom error');
      assert.strictEqual(sum, 5);
      resolve();
    });
  });
});

test('Load CJS function', async () => {
  const filePath = path.join(examples, 'function.js');
  const ms = await metavm.readScript(filePath, {
    type: metavm.MODULE_TYPE.COMMONJS,
  });

  assert.strictEqual(typeof ms.exports, 'function');

  const fields = Object.keys(ms);
  assert.deepEqual(fields, SCRIPT_FIELDS);

  assert.strictEqual(ms.exports(2, 3), 6);
  assert.strictEqual(ms.exports.bind(null, 3)(4), 12);
});

test('Load CJS arrow function', async () => {
  const filePath = path.join(examples, 'arrow.js');
  const ms = await metavm.readScript(filePath, {
    type: metavm.MODULE_TYPE.COMMONJS,
  });

  assert.strictEqual(typeof ms.exports, 'function');
  assert.strictEqual(ms.exports.toString(), '(a, b) => a + b');
  assert.strictEqual(ms.exports(2, 3), 5);
  assert.strictEqual(ms.exports(-1, 1), 0);
});

test('Load CJS async function', async () => {
  const filePath = path.join(examples, 'async.js');
  const ms = await metavm.readScript(filePath, {
    type: metavm.MODULE_TYPE.COMMONJS,
  });

  assert.strictEqual(typeof ms.exports, 'function');
  assert.strictEqual(ms.exports.constructor.name, 'AsyncFunction');

  const expected = { name: 'str', data: { field: 'value' } };
  const result = await ms.exports('str', { field: 'value' });
  assert.deepEqual(result, expected);

  assert.rejects(ms.exports('', { field: 'value' }));
});

test('Use CJS local identifier', async () => {
  const context = metavm.createContext({});
  const filePath = path.join(examples, 'local.js');
  const ms1 = await metavm.readScript(filePath, {
    context,
    type: metavm.MODULE_TYPE.COMMONJS,
  });

  const expected = { args: ['str'], local: 'hello' };
  const result = await ms1.exports('str');
  assert.deepEqual(result, expected);
});

test('CJS syntax error', async () => {
  const filePath = path.join(examples, 'syntax.error');
  try {
    await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    assert.fail();
  } catch (err) {
    assert.strictEqual(err.constructor.name, 'SyntaxError');
  }
});

test('CJS reference error', async () => {
  const filePath = path.join(examples, 'referenceError.js');
  try {
    const script = await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    await script.exports();
    assert.fail();
  } catch (err) {
    assert.strictEqual(err.constructor.name, 'ReferenceError');
  }
});

test('CJS line number and position in reference error', async () => {
  const filePath = path.join(examples, 'referenceError.js');
  try {
    const script = await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    await script.exports();
    assert.fail();
  } catch (err) {
    const [, firstLine] = err.stack.split('\n');
    const [, lineNumber, position] = firstLine.split(':');
    assert.strictEqual(parseInt(lineNumber, 10), 3);
    assert.strictEqual(parseInt(position, 10), 18);
  }
});

test('CJS line number and position in undefined call', async () => {
  const filePath = path.join(examples, 'simpleUndef.js');
  try {
    const script = await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    script.exports.add(5, 2);
    assert.fail();
  } catch (err) {
    const [, firstLine] = err.stack.split('\n');
    const [, lineNumber, position] = firstLine.split(':');
    assert.strictEqual(parseInt(lineNumber, 10), 6);
    assert.strictEqual(parseInt(position, 10), 14);
  }
});

test('CJS call undefined as a function', async () => {
  const filePath = path.join(examples, 'undef.js');
  try {
    const ms = await metavm.readScript(filePath, {
      microtaskMode: 'none',
      type: metavm.MODULE_TYPE.COMMONJS,
    });
    await ms.exports();
    assert.fail();
  } catch (err) {
    assert.strictEqual(err.constructor.name, 'TypeError');
  }
});

test('CJS access with readScript', async () => {
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
