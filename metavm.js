'use strict';

const vm = require('./lib/vm.js');
const loader = require('./lib/loader.js');

module.exports = { ...vm, ...loader };
