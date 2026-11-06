'use strict';

const { ERROR_CODE, MetavmError } = require('./constants.js');

const GLOBAL_NAMES = [
  'AbortController',
  'AbortSignal',
  'Event',
  'EventTarget',
  'MessageChannel',
  'MessageEvent',
  'MessagePort',
  'Blob',
  'FormData',
  'Headers',
  'Response',
  'Request',
  'ByteLengthQueuingStrategy',
  'URL',
  'URLSearchParams',
  'TextDecoder',
  'TextEncoder',
  'TextDecoderStream',
  'TextEncoderStream',
  'WebAssembly',
  'queueMicrotask',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'BroadcastChannel',
  'CompressionStream',
  'DecompressionStream',
  'CountQueuingStrategy',
  'fetch',
];

const records = new WeakMap();
const disposed = new WeakSet();

const browserGlobals = () => {
  const context = {};
  for (const name of GLOBAL_NAMES) {
    if (typeof globalThis[name] !== 'undefined') {
      context[name] = globalThis[name];
    }
  }
  return context;
};

const blankRecord = () => ({
  iframe: null,
  realm: null,
  evaluator: null,
  builtinKeys: null,
});

const register = (context) => {
  if (!records.has(context)) records.set(context, blankRecord());
  return context;
};

const EMPTY_CONTEXT = register(Object.freeze({}));
const EMPTY_CJS = register(Object.freeze({ module: {} }));
const COMMON_CONTEXT = register(Object.freeze(browserGlobals()));

const tryCall = (fn) => {
  try {
    fn();
    return true;
  } catch (error) {
    void error;
    return false;
  }
};

const linkProperty = (realm, context, key) => {
  const descriptor = Object.getOwnPropertyDescriptor(context, key);
  if (!descriptor) return;
  if (descriptor.get || descriptor.set) {
    Object.defineProperty(realm, key, descriptor);
    return;
  }
  Object.defineProperty(realm, key, {
    configurable: true,
    enumerable: descriptor.enumerable !== false,
    get: () => context[key],
    set: (value) => {
      context[key] = value;
    },
  });
};

const rememberGlobal = (realm, context, key, value) => {
  if (!Object.isExtensible(context)) {
    Reflect.deleteProperty(realm, key);
    return;
  }
  const defined = tryCall(() => {
    Object.defineProperty(context, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });
  if (!defined) return;
  tryCall(() => {
    linkProperty(realm, context, key);
  });
};

const injectContext = (realm, context) => {
  for (const key of Object.getOwnPropertyNames(context)) {
    const linked = tryCall(() => {
      linkProperty(realm, context, key);
    });
    if (linked) continue;
    tryCall(() => {
      realm[key] = context[key];
    });
  }
};

const syncRealm = (realm, context, builtinKeys) => {
  for (const key of Object.getOwnPropertyNames(realm)) {
    if (builtinKeys.has(key)) continue;
    const current = Object.getOwnPropertyDescriptor(realm, key);
    if (!current || !('value' in current)) continue;
    if (!Object.hasOwn(context, key)) {
      rememberGlobal(realm, context, key, current.value);
      continue;
    }
    const target = Object.getOwnPropertyDescriptor(context, key);
    if (!target || target.get || target.set || target.writable === false) {
      continue;
    }
    context[key] = current.value;
    tryCall(() => {
      linkProperty(realm, context, key);
    });
  }
};

const evaluationError = (error) => {
  const reason = error instanceof Error ? error.message : String(error);
  const message = [
    'Cannot evaluate JavaScript in the browser context.',
    'Synchronous source loading requires eval; a Content-Security-Policy',
    `without 'unsafe-eval' blocks metavm. ${reason}`,
  ].join(' ');
  return new MetavmError(message, ERROR_CODE.EVAL_DISALLOWED);
};

const attachFrame = (record) => {
  if (typeof document === 'undefined' || !document.documentElement) {
    throw new MetavmError(
      'A document is required to evaluate scripts in the browser',
      ERROR_CODE.EVAL_DISALLOWED,
    );
  }
  const iframe = document.createElement('iframe');
  iframe.setAttribute('data-metavm', '');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.tabIndex = -1;
  iframe.style.display = 'none';
  document.documentElement.append(iframe);
  const realm = iframe.contentWindow;
  if (!realm || typeof realm.eval !== 'function') {
    iframe.remove();
    throw new MetavmError(
      'Failed to initialize the browser execution context',
      ERROR_CODE.EVAL_DISALLOWED,
    );
  }
  const evaluator = realm.eval;
  try {
    if (evaluator('1+1') !== 2) {
      throw new Error('Evaluator probe failed');
    }
  } catch (error) {
    iframe.remove();
    throw evaluationError(error);
  }
  const builtinKeys = new Set(Object.getOwnPropertyNames(realm));
  record.iframe = iframe;
  record.realm = realm;
  record.evaluator = evaluator;
  record.builtinKeys = builtinKeys;
  return record;
};

const ensureRecord = (context) => {
  if (disposed.has(context)) {
    throw new MetavmError(
      'Context has been disposed',
      ERROR_CODE.CONTEXT_DISPOSED,
    );
  }
  if (context === null || typeof context !== 'object') {
    throw new TypeError('Context must be an object');
  }
  if (!records.has(context)) register(context);
  const record = records.get(context);
  if (record.evaluator) return record;
  return attachFrame(record);
};

const createContext = (initial, preventEscape = false) => {
  if (preventEscape) {
    throw new MetavmError(
      'preventEscape is not supported in the browser',
      ERROR_CODE.OPTION_NOT_SUPPORTED,
    );
  }
  if (initial === undefined) return EMPTY_CONTEXT;
  if (initial === null || typeof initial !== 'object') {
    throw new TypeError('Context must be an object');
  }
  if (disposed.has(initial)) {
    throw new MetavmError(
      'Context has been disposed',
      ERROR_CODE.CONTEXT_DISPOSED,
    );
  }
  return register(initial);
};

const disposeContext = (context) => {
  if (context === null || typeof context !== 'object') {
    throw new TypeError('Context must be an object');
  }
  const record = records.get(context);
  if (record?.iframe) record.iframe.remove();
  if (record) {
    record.iframe = null;
    record.realm = null;
    record.evaluator = null;
    record.builtinKeys = null;
  }
  records.delete(context);
  disposed.add(context);
};

const runInContext = (context, source) => {
  const record = ensureRecord(context);
  injectContext(record.realm, context);
  try {
    return record.evaluator(source);
  } finally {
    syncRealm(record.realm, context, record.builtinKeys);
  }
};

module.exports = {
  EMPTY_CONTEXT,
  EMPTY_CJS,
  COMMON_CONTEXT,
  createContext,
  disposeContext,
  runInContext,
};
