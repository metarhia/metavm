import {
  MODULE_TYPE,
  NODE_CONTEXT,
  createScript,
  readScript,
} from '../metavm.js';

const script = createScript('main.js', 'module.exports = require("./a.js");', {
  type: MODULE_TYPE.COMMONJS,
  dirname: '/app',
  access: { './a.js': true },
  modules: {
    '/app/a.js': { source: 'module.exports = 1;' },
    '/app/config.json': { json: { enabled: true } },
    clock: { exports: { now: () => 0 } },
  },
});

const value: number = script.exports;
void value;
void NODE_CONTEXT;
void readScript;
