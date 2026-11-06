import {
  COMMON_CONTEXT,
  EMPTY_CJS,
  EMPTY_CONTEXT,
  ERROR_CODE,
  MODULE_TYPE,
  MetaScript,
  createContext,
  createScript,
  disposeContext,
  readScript,
} from '../../metavm.mjs';
import { install, runSuite } from './harness.mjs';

const metavm = {
  COMMON_CONTEXT,
  EMPTY_CJS,
  EMPTY_CONTEXT,
  ERROR_CODE,
  MODULE_TYPE,
  MetaScript,
  createContext,
  createScript,
  disposeContext,
  readScript,
};

const start = async () => {
  install(metavm);
  await import('./script.test.js');
  await import('./context.test.js');
  await import('./modules.test.js');
  await import('./errors.test.js');
  await import('./read.test.js');
  globalThis.__metavmResults = await runSuite();
};

if (typeof window !== 'undefined') {
  start().catch((error) => {
    const message =
      error instanceof Error ? error.stack || error.message : String(error);
    globalThis.__metavmResults = [{ name: 'runner', ok: false, message }];
  });
}
