'use strict';

const fs = require('fs').promises;
const path = require('path');
const vm = require('./vm.js');

const load = async filePath => {
  const src = await fs.readFile(filePath, 'utf8');
  if (!src) return null;
  const name = path.basename(filePath, '.js');
  const script = new vm.MetaScript(src, name);
  return script;
};

module.exports = { load };
