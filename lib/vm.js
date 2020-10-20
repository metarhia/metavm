'use strict';

const vm = require('vm');

const SCRIPT_OPTIONS = { timeout: 5000, displayErrors: false };
const CONTEXT_OPTIONS = { microtaskMode: 'afterEvaluate' };

const createContext = context => {
  const sandbox = context || {
    Buffer, URL, URLSearchParams, TextDecoder, TextEncoder,
    console, queueMicrotask,
    setTimeout, setImmediate, setInterval,
    clearTimeout, clearImmediate, clearInterval,
  };
  return vm.createContext(sandbox, CONTEXT_OPTIONS);
};

class MetaScript {
  constructor(src, name = '', context = null) {
    this.name = name;
    this.script = new vm.Script(src, { filename: name });
    this.context = context || createContext();
    this.exports = this.script.runInContext(this.context, SCRIPT_OPTIONS);
  }
}

const createScript = (src, name, context) => new MetaScript(src, name, context);

module.exports = { createContext, MetaScript, createScript };
