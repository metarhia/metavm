const cases = [];

export const assert = {
  ok(value, message) {
    if (!value) throw new Error(message || 'Expected value to be truthy');
  },
  strictEqual(actual, expected, message) {
    if (!Object.is(actual, expected)) {
      throw new Error(
        message || `Expected ${String(expected)} but got ${String(actual)}`,
      );
    }
  },
  notStrictEqual(actual, expected) {
    if (Object.is(actual, expected)) {
      throw new Error('Expected values to be different');
    }
  },
  deepEqual(actual, expected) {
    const left = JSON.stringify(actual);
    const right = JSON.stringify(expected);
    if (left !== right) {
      throw new Error(`Expected ${right} but got ${left}`);
    }
  },
  throws(fn, check) {
    try {
      fn();
    } catch (error) {
      if (check && !check(error)) {
        throw new Error(`Unexpected error ${error.name}: ${error.message}`, {
          cause: error,
        });
      }
      return;
    }
    throw new Error('Expected function to throw');
  },
  async rejects(promise, check) {
    try {
      await promise;
    } catch (error) {
      if (check && !check(error)) {
        const message = `Unexpected rejection ${error.name}: ${error.message}`;
        throw new Error(message, { cause: error });
      }
      return;
    }
    throw new Error('Expected promise to reject');
  },
};

export const test = (name, fn) => {
  cases.push({ name, fn });
};

export const install = (metavm) => {
  globalThis.metavm = metavm;
  globalThis.test = test;
  globalThis.assert = assert;
};

const describe = (error) => {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause ? `\n${describe(error.cause)}` : '';
  return `${error.name}: ${error.message}\n${error.stack || ''}${cause}`;
};

export const runSuite = async () => {
  const results = [];
  for (const item of cases) {
    try {
      await item.fn();
      results.push({ name: item.name, ok: true });
    } catch (error) {
      results.push({ name: item.name, ok: false, message: describe(error) });
    }
  }
  return results;
};
