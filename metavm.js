'use strict';

const vm = require('vm');
const fs = require('fs').promises;
const path = require('path');

const RUN_OPTIONS = { timeout: 5000, displayErrors: false };
const CONTEXT_OPTIONS = { microtaskMode: 'afterEvaluate' };
const USE_STRICT = `'use strict';\n`;

const EMPTY_CONTEXT = vm.createContext(Object.freeze({}));

const COMMON_CONTEXT = vm.createContext(
  Object.freeze({
    Buffer,
    URL,
    URLSearchParams,
    TextDecoder,
    TextEncoder,
    console,
    queueMicrotask,
    setTimeout,
    setImmediate,
    setInterval,
    clearTimeout,
    clearImmediate,
    clearInterval,
  })
);

const createContext = (context, preventEscape = false) => {
  if (context === undefined) return EMPTY_CONTEXT;
  return vm.createContext(context, preventEscape ? CONTEXT_OPTIONS : {});
};

class MetaScript {
  constructor(name, src, options = {}) {
    const strict = src.startsWith(USE_STRICT);
    const code = strict ? src : USE_STRICT + src;
    const lineOffset = strict ? 0 : -1;
    this.name = name;
    const scriptOptions = { filename: name, ...options, lineOffset };
    this.script = new vm.Script(code, scriptOptions);
    this.context = options.context || createContext();
    this.exports = this.script.runInContext(this.context, RUN_OPTIONS);
  }
}

const createScript = (name, src, options) => new MetaScript(name, src, options);

const readScript = async (filePath, options) => {
  const src = await fs.readFile(filePath, 'utf8');
  if (src === '') throw new SyntaxError(`File ${filePath} is empty`);
  const name =
    options && options.filename
      ? options.filename
      : path.basename(filePath, '.js');
  const script = new MetaScript(name, src, options);
  return script;
};

module.exports = {
  createContext,
  MetaScript,
  createScript,
  EMPTY_CONTEXT,
  COMMON_CONTEXT,
  readScript,
};
