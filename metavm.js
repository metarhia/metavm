'use strict';

const vm = require('vm');
const fs = require('fs').promises;

const SCRIPT_OPTIONS = { timeout: 5000, displayErrors: false };

const createContext = () => {
  const context = {};
  return vm.createContext(context);
};

class MetaScript {
  constructor(filePath, context = null) {
    this.path = filePath;
    this.context = context || createContext();
    this.script = null;
    return this.load();
  }

  async load() {
    const src = await fs.readFile(this.path, 'utf8');
    if (!src) return null;
    const script = new vm.Script(src, { filename: this.path });
    this.script = script.runInContext(this.context, SCRIPT_OPTIONS);
    return this;
  }
}

module.exports = { MetaScript };
