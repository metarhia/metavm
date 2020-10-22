'use strict';

const vm = require('vm');

const SCRIPT_OPTIONS = { timeout: 5000, displayErrors: false };
const CONTEXT_OPTIONS = { microtaskMode: 'afterEvaluate' };
const USE_STRICT = '\'use strict\';\n';
const EMPTY_CONTEXT = Object.freeze({});
const COMMON_CONTEXT = Object.freeze({
  Buffer, URL, URLSearchParams, TextDecoder, TextEncoder,
  console, queueMicrotask,
  setTimeout, setImmediate, setInterval,
  clearTimeout, clearImmediate, clearInterval,
});

const createContext = context => {
  if (!context) return EMPTY_CONTEXT;
  return vm.createContext(context, CONTEXT_OPTIONS);
};

createContext(EMPTY_CONTEXT);
createContext(COMMON_CONTEXT);

class MetaScript {
  constructor(src, name = '', context = null, options = {}) {
    const strict = src.startsWith(USE_STRICT);
    const code = strict ? src : USE_STRICT + src;
    const lineOffset = strict ? 0 : -1;
    this.name = name;
    const scriptOptions = { filename: name, ...options, lineOffset };
    this.script = new vm.Script(code, scriptOptions);
    this.context = context || createContext();
    this.exports = this.script.runInContext(this.context, SCRIPT_OPTIONS);
  }
}

const createScript = (src, name, context, options) =>
  new MetaScript(src, name, context, options);

module.exports = {
  createContext,
  MetaScript,
  createScript,
  EMPTY_CONTEXT,
  COMMON_CONTEXT,
};
