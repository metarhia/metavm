'use strict';

const MODULE_TYPE = {
  AUTO: 0,
  METARHIA: 1,
  COMMONJS: 2,
  ECMA: 3,
};

const ERROR_CODE = {
  ESM_NOT_SUPPORTED: 'ESM_NOT_SUPPORTED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  MODULE_NOT_FOUND: 'MODULE_NOT_FOUND',
  OPTION_NOT_SUPPORTED: 'OPTION_NOT_SUPPORTED',
  EVAL_DISALLOWED: 'EVAL_DISALLOWED',
  CONTEXT_DISPOSED: 'CONTEXT_DISPOSED',
};

class MetavmError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'MetavmError';
    if (code) this.code = code;
  }
}

module.exports = { MODULE_TYPE, ERROR_CODE, MetavmError };
