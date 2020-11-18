'use strict';

const mt = require('metatests');
const vm = require('../dist/vm.js');

const strict = (code) => `'use strict';\n` + code;

mt.test('option.timeout', (test) => {
  const name = 'option.timeout';
  const findIframes = () => document.getElementsByName(name);
  vm.runInNewContext(
    '',
    {},
    {
      contextName: name,
      timeout: 10,
    }
  );
  test.strictSame(findIframes().length, 1);
  setTimeout(() => {
    test.strictSame(findIframes().length, 0);
    test.end();
  }, 20);
});

mt.test('options.name', (test) => {
  const expectedName = 'options.name';
  vm.runInNewContext(
    '',
    {},
    {
      timeout: 5,
      contextName: expectedName,
    }
  );
  test.strictSame(document.getElementsByName(expectedName).length, 1);
  test.end();
});

mt.test('check deleting iframe if timeout == 0', (test) => {
  const name = 'deleting iframe';
  vm.runInNewContext('', {
    contextName: name,
  });
  const actual = document.getElementsByName(name);
  test.strictSame(actual.length, 0);
  test.end();
});

mt.test('use not contextified object', (test) => {
  const msg =
    'The "contextifiedObject" argument must be an vm.Context.' +
    ` Received an instance of object`;
  test.throws(() => vm.runInContext('', {}), new TypeError(msg));
  test.end();
});

mt.test('run in this context', (test) => {
  window.a = 2;
  window.b = 2;
  const actual = vm.runInThisContext('a + b');
  test.strictSame(actual, 4);
  test.end();
});

mt.test('has context property', (test) => {
  const code = 'a';
  const script = new vm.Script(code);
  const context = vm.createContext({ a: 2 });
  const result = script.runInContext(context);
  test.strictSame(result, 2);
  test.end();
});

mt.test('change object property', (test) => {
  const context = vm.createContext({ a: { b: 1 } });
  vm.runInContext('a.b = 2', context);
  test.strictSame(context.a.b, 2);
  test.end();
});

mt.test('reassign object property', (test) => {
  const context = vm.createContext({ a: { b: 1 } });
  vm.runInContext('a = {c: 2}', context);
  test.strictSame(context.a.c, 2);
  test.end();
});

mt.test('change context primitive property', (test) => {
  const context = vm.createContext({ a: 1 });
  vm.runInContext('a = 2', context);
  test.strictSame(context.a, 2);
  test.end();
});

mt.test('add new property', (test) => {
  const context = vm.createContext({});
  vm.runInContext('a = 1', context);
  test.strictSame(context.a, 1);
  test.end();
});

mt.test('add default window property "name"', (test) => {
  const context = vm.createContext({ name: {} });
  vm.runInContext('name = "hello"', context);
  test.strictSame(context.name, 'hello');
  test.end();
});

mt.test('frozen object', (test) => {
  const context = vm.createContext(Object.freeze({ a: 1 }));
  vm.runInContext('a = 2; b = 3', context);
  test.strictSame(context.a, 1);
  test.strictSame(context.b, undefined);
  test.end();
});

mt.test('sealed object', (test) => {
  const context = vm.createContext(Object.seal({ a: 1 }));
  vm.runInContext('a = 2; b = 3', context);
  test.strictSame(context.a, 2);
  test.strictSame(context.b, undefined);
  test.end();
});

mt.test('get html element', (test) => {
  const element = document.createElement('h1');
  document.body.appendChild(element);

  const getElementsByTagName = (tag) => document.getElementsByTagName(tag);
  const code = 'getElementsByTagName("h1");';
  const context = vm.createContext({ getElementsByTagName });

  const result = vm.runInContext(code, context);
  test.strictSame(result.length, 1);
  test.end();
});

mt.test('block eval', (test) => {
  const context = vm.createContext(
    {},
    {
      codeGeneration: {
        strings: false,
      },
    }
  );
  const msg = 'Code generation from strings disallowed for this context';
  const withEval = () => {
    vm.runInContext(strict('eval("1 + 1")'), context);
  };
  test.throws(withEval, new EvalError(msg));
  test.end();
});

mt.test('run code without eval with eval blocking', (test) => {
  const context = vm.createContext(
    {},
    {
      codeGeneration: {
        strings: false,
      },
    }
  );
  const actual = vm.runInContext('1 + 1', context);
  test.strictSame(actual, 2);
  test.end();
});

mt.test('options.filename', (test) => {
  const context = vm.createContext({});
  const expectedFilename = 'filename';
  const expectedMessage = 'message';
  const errors = [
    'Error',
    'EvalError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'TypeError',
    'URIError',
  ];
  for (const error of errors) {
    const code = `throw new ${error}("${expectedMessage}", "wrongFilename")`;
    try {
      vm.runInContext(code, context, expectedFilename);
    } catch (e) {
      test.strictSame(e.message, expectedMessage, error);
      test.strictSame(e.filename, expectedFilename, error);
    }
  }
  test.end();
});

mt.test('block code generation with Function constructor', (test) => {
  const context = vm.createContext(
    {},
    {
      codeGeneration: {
        strings: false,
      },
    }
  );
  const msg = 'Code generation from strings disallowed for this context';
  const withEval = () => {
    vm.runInContext(strict('new Function("1 + 1")'), context);
  };
  test.throws(withEval, new EvalError(msg));
  test.end();
});

mt.test('call function with blocking Function constructor', (test) => {
  const context = vm.createContext(
    {
      a: {
        b: 1,
      },
    },
    {
      codeGeneration: {
        strings: false,
      },
    }
  );
  const code = 'function f() {return this.b} f.call(a)';
  const result = vm.runInContext(strict(code), context);
  test.strictSame(result, 1);
  test.end();
});

mt.test('name property with blocking Function constructor', (test) => {
  const context = vm.createContext(
    {
      a: {
        b: 1,
      },
    },
    {
      codeGeneration: {
        strings: false,
      },
    }
  );
  const code = 'function f() {return this.b} f.name';
  const result = vm.runInContext(strict(code), context);
  test.strictSame(result, 'f');
  test.end();
});

mt.test('delete iframe by hand before timeout', (test) => {
  const name = 'delete iframe';
  vm.runInNewContext(
    '',
    {},
    {
      timeout: 5,
      contextName: name,
    }
  );
  const iframe = document.getElementsByName(name)[0];
  document.body.removeChild(iframe);
  setTimeout(() => {
    test.end();
  }, 10);
});

/**
 * Blocking code generation for GeneratorFunction constructor
 * isn't implemented.
 */
//
// mt.test('block code generation GeneratorFunction', (test) => {
//   const context = vm.createContext({}, {
//     codeGeneration: {
//       strings: false
//     }
//   });
//   const msg = 'Code generation from strings disallowed for this context';
//   const code = 'Object.getPrototypeOf(function *(a){return a}).constructor';
//   const withEval = () => {
//     vm.runInContext(strict(code), context);
//   };
//   test.throws(withEval, new EvalError(msg));
//   test.end();
// });
