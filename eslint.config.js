'use strict';

const init = require('eslint-config-metarhia');

module.exports = [
  ...init,
  {
    files: ['examples/**/*.js', 'examples/**/*.cjs'],
    rules: {
      strict: 'off',
    },
    languageOptions: {
      globals: {
        unknownFunction: true,
      },
    },
  },
  {
    files: ['dist/**/*.js'],
    languageOptions: {
      sourceType: 'module',
    },
  },
];
