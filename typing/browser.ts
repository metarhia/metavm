import {
  ERROR_CODE,
  MODULE_TYPE,
  createContext,
  createScript,
  disposeContext,
  readScript,
} from '../metavm.mjs';

const context = createContext({ value: 1 });
const script = createScript<(a: number, b: number) => number>(
  'Calculator',
  '(a, b) => a + b',
  {
    context,
    type: MODULE_TYPE.METARHIA,
    dirname: '/app',
    access: { './math.js': true, clock: true },
    modules: {
      '/app/math.js': {
        type: MODULE_TYPE.COMMONJS,
        source: 'module.exports = { add: (a, b) => a + b };',
      },
      '/app/config.json': { json: { enabled: true } },
      clock: { exports: { now: () => 0 } },
    },
  },
);

const add = script.exports;
add(2, 3);
disposeContext(context);
void readScript;
void ERROR_CODE.OPTION_NOT_SUPPORTED;
void ERROR_CODE.EVAL_DISALLOWED;
void ERROR_CODE.CONTEXT_DISPOSED;
