'use strict';

const vm = require('vm');

const SCRIPT_OPTIONS = { timeout: 5000, displayErrors: false };

const createContext = () => {
  const context = {};
  return vm.createContext(context);
};

class MetaScript {
  constructor(src, name = '', context = null) {
    this.name = name;
    this.script = new vm.Script(src, { filename: name });
    this.context = context || createContext();
    this.exports = this.script.runInContext(this.context, SCRIPT_OPTIONS);
  }
}

module.exports = { createContext, MetaScript };
