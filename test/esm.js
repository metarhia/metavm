'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const metavm = require('..');

const examples = path.join(__dirname, '../examples/esm');

test('Load ESM script', async () => {
  const filePath = path.join(examples, 'simple.mjs');
  try {
    await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.ECMA,
    });
    assert.fail('ESM not fully supported yet');
  } catch (error) {
    assert.ok(error);
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
    assert.ok(error);
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
    await metavm.readScript(filePath, options);
    assert.fail('ESM not fully supported yet');
  } catch (error) {
    assert.ok(error);
  }
});

test('Load ESM function', async () => {
  const filePath = path.join(examples, 'function.mjs');
  try {
    await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.ECMA,
    });
    assert.fail('ESM not fully supported yet');
  } catch (error) {
    assert.ok(error);
  }
});

test('Load ESM arrow function', async () => {
  const filePath = path.join(examples, 'arrow.mjs');
  try {
    await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.ECMA,
    });
    assert.fail('ESM not fully supported yet');
  } catch (error) {
    assert.ok(error);
  }
});

test('Load ESM async function', async () => {
  const filePath = path.join(examples, 'async.mjs');
  try {
    await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.ECMA,
    });
    assert.fail('ESM not fully supported yet');
  } catch (error) {
    assert.ok(error);
  }
});

test('Use ESM local identifier', async () => {
  const context = metavm.createContext({});
  const filePath = path.join(examples, 'local.mjs');
  try {
    await metavm.readScript(filePath, {
      context,
      type: metavm.MODULE_TYPE.ECMA,
    });
    assert.fail('ESM not fully supported yet');
  } catch (error) {
    assert.ok(error);
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
    assert.ok(error);
  }
});

test('ESM reference error', async () => {
  const filePath = path.join(examples, 'referenceError.mjs');
  try {
    const script = await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.ECMA,
    });
    await script.exports();
    assert.fail();
  } catch (error) {
    assert.ok(error);
  }
});

test('ESM line number and position in undefined call', async () => {
  const filePath = path.join(examples, 'simpleUndef.mjs');
  try {
    const script = await metavm.readScript(filePath, {
      type: metavm.MODULE_TYPE.ECMA,
    });
    script.exports.add(5, 2);
    assert.fail();
  } catch (error) {
    assert.ok(error);
  }
});

test('ESM call undefined as a function', async () => {
  const filePath = path.join(examples, 'undef.mjs');
  try {
    const ms = await metavm.readScript(filePath, {
      microtaskMode: 'none',
      type: metavm.MODULE_TYPE.ECMA,
    });
    await ms.exports();
    assert.fail();
  } catch (error) {
    assert.ok(error);
  }
});

test('ESM access with readScript', async () => {
  const filePath = path.join(examples, 'nestedmodule1.mjs');
  try {
    await metavm.readScript(filePath, {
      dirname: examples,
      access: {
        './nestedmodule2.mjs': true,
      },
      type: metavm.MODULE_TYPE.ECMA,
    });
    assert.fail('ESM not fully supported yet');
  } catch (error) {
    assert.ok(error);
  }
});
