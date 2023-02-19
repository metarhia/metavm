'use strict';

const vm = require('node:vm');
const assert = require('node:assert');
const metavm = require('..');

const TIMEOUT = 1000;

{
  const name = 'Test: vm.runInNewContext with timeout';
  const src = `({
    field: Promise.resolve().then(() => {
      while (1);
    })
  });`;
  try {
    const options = { timeout: TIMEOUT, microtaskMode: 'afterEvaluate' };
    vm.runInNewContext(src, {}, options);
    assert.fail(`${name}: failed`);
  } catch (error) {
    assert(error.message.includes('timed out'));
    console.log(`${name}: passed`);
  }
}

{
  const name = 'Test: createContext, new Script, vm.runInContext';
  const src = `({
    field: Promise.resolve().then(() => {
      while (1);
    })
  });`;
  try {
    const context = vm.createContext({}, { microtaskMode: 'afterEvaluate' });
    const script = new vm.Script(src);
    script.runInContext(context, { timeout: TIMEOUT });
    assert.fail(`${name}: failed`);
  } catch (error) {
    assert(error.message.includes('timed out'));
    console.log(`${name}: passed`);
  }
}

{
  const name = 'Test: metavm with timeout';
  const src = `({
    field: Promise.resolve().then(() => {
      while (1);
    })
  });`;
  try {
    //const context = metavm.createContext({}, true);
    const context = vm.createContext({}, { microtaskMode: 'afterEvaluate' });
    metavm.createScript('Example', src, { context });
    assert.fail(`${name}: failed`);
  } catch (error) {
    assert(error.message.includes('timed out'));
    console.log(`${name}: passed`);
  }
}
