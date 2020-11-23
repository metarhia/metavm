'use strict';

const fs = require('fs').promises;
const path = require('path');
const vm = require('./vm.js');

const readScript = async (filePath, options) => {
  const src = await fs.readFile(filePath, 'utf8');
  if (!src) return null;
  const name =
    options && options.filename
      ? options.filename
      : path.basename(filePath, '.js');
  const script = new vm.MetaScript(name, src, options);
  return script;
};

module.exports = { readScript };
