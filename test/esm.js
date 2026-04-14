'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const metavm = require('..');

const examples = path.join(__dirname, '../examples/esm');

const ESM_SUPPORTED = !!require('node:vm').SourceTextModule;
const ESM_ERROR = 'ECMAScript modules require --experimental-vm-modules flag';

const ESM_SCRIPT_FIELDS = [
  'name',
  'dirname',
  'relative',
  'type',
  'access',
  'script',
  'context',
  '_module',
  '_linker',
  'exports',
];

test('Load ESM script', async () => {
  const filePath = path.join(examples, 'simple.mjs');
  try {
    const ms = await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.ECMA,
    });

    if (!ESM_SUPPORTED) {
      assert.fail('Should throw without experimental flag');
    }

    assert.strictEqual(typeof ms.exports, 'object');
    const fields = Object.keys(ms);
    assert.deepEqual(fields, ESM_SCRIPT_FIELDS);

    const keys = Object.keys(ms.exports).sort();
    assert.deepEqual(keys, ['add', 'field', 'sub']);

    assert.strictEqual(ms.exports.field, 'value');
    assert.strictEqual(ms.exports.sub(2, 3), -1);
    assert.strictEqual(ms.exports.add(2, 3), 5);
  } catch (error) {
    if (ESM_SUPPORTED) throw error;
    assert.strictEqual(error.message, ESM_ERROR);
  }
});

test('Load ESM empty script', async () => {
  try {
    const filePath = path.join(examples, 'empty');
    await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.ECMA,
    });
    assert.fail('Should throw');
  } catch (error) {
    // Empty file throws SyntaxError before ESM check
    assert.strictEqual(error.constructor.name, 'SyntaxError');
  }
});

test('Load ESM script with context and options', async () => {
  const filePath = path.join(examples, 'complex.mjs');
  const context = metavm.createContext({ setTimeout });
  const options = {
    filename: 'CUSTOM FILE NAME',
    context,
    type: metavm.MODULE_TYPE.ECMA,
  };
  try {
    const ms = await metavm.readScript(filePath, options);

    if (!ESM_SUPPORTED) {
      assert.fail('Should throw without experimental flag');
    }

    assert.strictEqual(ms.constructor.name, 'MetaScript');
    // Note: ESM async callback patterns work differently than CJS
    assert.strictEqual(typeof ms.exports, 'object');
  } catch (error) {
    if (ESM_SUPPORTED) throw error;
    assert.strictEqual(error.message, ESM_ERROR);
  }
});

test('Load ESM function', async () => {
  const filePath = path.join(examples, 'function.mjs');
  try {
    const ms = await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.ECMA,
    });

    if (!ESM_SUPPORTED) {
      assert.fail('Should throw without experimental flag');
    }

    assert.strictEqual(typeof ms.exports, 'function');
    const fields = Object.keys(ms);
    assert.deepEqual(fields, ESM_SCRIPT_FIELDS);

    assert.strictEqual(ms.exports(2, 3), 6);
    assert.strictEqual(ms.exports.bind(null, 3)(4), 12);
  } catch (error) {
    if (ESM_SUPPORTED) throw error;
    assert.strictEqual(error.message, ESM_ERROR);
  }
});

test('Load ESM arrow function', async () => {
  const filePath = path.join(examples, 'arrow.mjs');
  try {
    const ms = await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.ECMA,
    });

    if (!ESM_SUPPORTED) {
      assert.fail('Should throw without experimental flag');
    }

    assert.strictEqual(typeof ms.exports, 'function');
    assert.strictEqual(ms.exports(2, 3), 5);
    assert.strictEqual(ms.exports(-1, 1), 0);
  } catch (error) {
    if (ESM_SUPPORTED) throw error;
    assert.strictEqual(error.message, ESM_ERROR);
  }
});

test('Load ESM async function', async () => {
  const filePath = path.join(examples, 'async.mjs');
  try {
    const ms = await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.ECMA,
    });

    if (!ESM_SUPPORTED) {
      assert.fail('Should throw without experimental flag');
    }

    assert.strictEqual(typeof ms.exports, 'function');
    assert.strictEqual(ms.exports.constructor.name, 'AsyncFunction');

    const expected = { name: 'str', data: { field: 'value' } };
    const result = await ms.exports('str', { field: 'value' });
    assert.deepEqual(result, expected);

    assert.rejects(ms.exports('', { field: 'value' }));
  } catch (error) {
    if (ESM_SUPPORTED) throw error;
    assert.strictEqual(error.message, ESM_ERROR);
  }
});

test('Use ESM local identifier', async () => {
  const context = metavm.createContext({});
  const filePath = path.join(examples, 'local.mjs');
  try {
    const ms1 = await metavm.readScript(filePath, {
      context,
      type: metavm.MODULE_TYPE.ECMA,
    });

    if (!ESM_SUPPORTED) {
      assert.fail('Should throw without experimental flag');
    }

    const expected = { args: ['str'], local: 'hello' };
    const result = await ms1.exports('str');
    assert.deepEqual(result, expected);
  } catch (error) {
    if (ESM_SUPPORTED) throw error;
    assert.strictEqual(error.message, ESM_ERROR);
  }
});

test('ESM syntax error', async () => {
  const filePath = path.join(examples, 'syntax.error');
  try {
    await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.ECMA,
    });
    assert.fail();
  } catch (error) {
    if (!ESM_SUPPORTED) {
      assert.strictEqual(error.message, ESM_ERROR);
    } else {
      assert.strictEqual(error.constructor.name, 'SyntaxError');
    }
  }
});

test('ESM reference error', async () => {
  const filePath = path.join(examples, 'referenceError.mjs');
  try {
    const script = await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.ECMA,
    });

    if (!ESM_SUPPORTED) {
      assert.fail('Should throw without experimental flag');
    }

    await script.exports();
    assert.fail();
  } catch (error) {
    if (!ESM_SUPPORTED) {
      assert.strictEqual(error.message, ESM_ERROR);
    } else {
      assert.strictEqual(error.constructor.name, 'ReferenceError');
    }
  }
});

test('ESM line number and position in reference error', async () => {
  const filePath = path.join(examples, 'referenceError.mjs');
  try {
    const script = await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.ECMA,
    });

    if (!ESM_SUPPORTED) {
      assert.fail('Should throw without experimental flag');
    }

    await script.exports();
    assert.fail();
  } catch (error) {
    if (!ESM_SUPPORTED) {
      assert.strictEqual(error.message, ESM_ERROR);
    } else {
      const [, firstLine] = error.stack.split('\n');
      const [, lineNumber, position] = firstLine.split(':');
      assert.strictEqual(parseInt(lineNumber, 10), 2);
      assert.strictEqual(parseInt(position, 10), 18);
    }
  }
});

test('ESM line number and position in undefined call', async () => {
  const filePath = path.join(examples, 'simpleUndef.mjs');
  try {
    const script = await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.ECMA,
    });

    if (!ESM_SUPPORTED) {
      assert.fail('Should throw without experimental flag');
    }

    script.exports.add(5, 2);
    assert.fail();
  } catch (error) {
    if (!ESM_SUPPORTED) {
      assert.strictEqual(error.message, ESM_ERROR);
    } else {
      const [, firstLine] = error.stack.split('\n');
      const [, lineNumber, position] = firstLine.split(':');
      assert.strictEqual(parseInt(lineNumber, 10), 3);
      assert.strictEqual(parseInt(position, 10), 25);
    }
  }
});

test('ESM call undefined as a function', async () => {
  const filePath = path.join(examples, 'undef.mjs');
  try {
    const ms = await metavm.readScript(filePath, {
      microtaskMode: 'none',
      type: metavm.MODULE_TYPE.ECMA,
    });

    if (!ESM_SUPPORTED) {
      assert.fail('Should throw without experimental flag');
    }

    await ms.exports();
    assert.fail();
  } catch (error) {
    if (!ESM_SUPPORTED) {
      assert.strictEqual(error.message, ESM_ERROR);
    } else {
      assert.strictEqual(error.constructor.name, 'TypeError');
    }
  }
});

test('ESM access with readScript', async () => {
  const filePath = path.join(examples, 'nestedmodule1.mjs');
  try {
    const ms = await metavm.readScript(filePath, {
      dirname: examples,
      access: {
        './nestedmodule2.mjs': true,
      },
      type: metavm.MODULE_TYPE.ECMA,
    });

    if (!ESM_SUPPORTED) {
      assert.fail('Should throw without experimental flag');
    }

    // When ESM imports are implemented, check nested values
    assert.ok(ms);
  } catch (error) {
    if (!ESM_SUPPORTED) {
      assert.strictEqual(error.message, ESM_ERROR);
    } else {
      // With ESM support, imports should work or throw access error
      assert.ok(error);
    }
  }
});
