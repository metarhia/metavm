import { ERROR_CODE, createScript } from '../../metavm.mjs';

if (typeof window !== 'undefined') {
  try {
    createScript('Blocked', '1 + 1');
    window.__cspResult = { ok: true };
  } catch (error) {
    window.__cspResult = {
      ok: false,
      name: error.name,
      code: error.code,
      message: error.message,
      expected: ERROR_CODE.EVAL_DISALLOWED,
    };
  }
}
