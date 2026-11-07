// constants.js

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

// context.js

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

// script.js

const KNOWN_EXT = ['.js', '.json', '.cjs', '.mjs'];

const normalizePortable = (input) => {
  const value = String(input).replaceAll('\\', '/');
  if (value === '') return '.';
  const drive = /^[A-Za-z]:/.test(value) ? value.slice(0, 2) : '';
  const rest = drive ? value.slice(2) : value;
  const isAbs = rest.startsWith('/');
  const pieces = rest.split('/');
  const stack = [];
  for (const piece of pieces) {
    if (piece === '' || piece === '.') continue;
    if (piece === '..') {
      if (stack.length > 0 && stack[stack.length - 1] !== '..') stack.pop();
      else if (!isAbs) stack.push('..');
      continue;
    }
    stack.push(piece);
  }
  const trailing = rest.length > 1 && rest.endsWith('/');
  let out = stack.join('/');
  if (isAbs) out = `/${out}`;
  if (trailing && out !== '/') out += '/';
  if (out === '') out = '.';
  if (
    !isAbs &&
    stack.length === 0 &&
    rest.endsWith('/') &&
    rest.includes('.')
  ) {
    out = './';
  }
  if (!drive) return out;
  if (out === '.') return `${drive}/.`;
  if (out.startsWith('/')) return `${drive}${out}`;
  return `${drive}/${out}`;
};

const extname = (name) => {
  const base = String(name).split('/').pop();
  const index = base.lastIndexOf('.');
  if (index <= 0) return '';
  return base.slice(index).toLowerCase();
};

const addExt = (name) =>
  KNOWN_EXT.includes(extname(name)) ? name : `${name}.js`;

const isNamed = (specifier) =>
  !specifier.includes('.') &&
  !specifier.startsWith('/') &&
  !/^[A-Za-z]:[\\/]/.test(specifier);

const normalizeModuleKey = (key) => {
  const slash = String(key).replaceAll('\\', '/');
  if (slash.startsWith('/') || /^[A-Za-z]:/.test(slash)) {
    return normalizePortable(slash);
  }
  return slash;
};

const resolveVirtual = (dirname, relative, specifier) => {
  const spec = String(specifier).replaceAll('\\', '/');
  if (spec.startsWith('/') || /^[A-Za-z]:/.test(spec)) {
    return normalizePortable(spec);
  }
  const dir = dirname ? normalizePortable(dirname) : '.';
  const rel =
    !relative || relative === '.'
      ? spec
      : `${String(relative).replaceAll('\\', '/')}/${spec}`;
  if (dir === '/') return normalizePortable(`/${rel}`);
  if (dir === '.') return normalizePortable(rel);
  const base = dir.endsWith('/') ? dir.slice(0, -1) : dir;
  return normalizePortable(`${base}/${rel}`);
};

const splitParts = (value) => {
  const normal = normalizePortable(value).replace(/\/$/, '') || '.';
  const drive = /^[A-Za-z]:/.test(normal) ? normal.slice(0, 2) : '';
  const rest = drive ? normal.slice(2) : normal;
  const absolute = rest.startsWith('/');
  const parts = rest.split('/').filter((part) => part !== '');
  return { drive, absolute, parts };
};

const relativePortable = (from, to) => {
  const left = splitParts(from);
  const right = splitParts(to);
  if (left.drive !== right.drive || left.absolute !== right.absolute) {
    return normalizePortable(to);
  }
  let index = 0;
  while (
    index < left.parts.length &&
    index < right.parts.length &&
    left.parts[index] === right.parts[index]
  ) {
    index += 1;
  }
  const parts = [];
  const ups = left.parts.length - index;
  for (let i = 0; i < ups; i += 1) parts.push('..');
  for (const part of right.parts.slice(index)) parts.push(part);
  if (parts.length === 0) return '';
  return parts.join('/');
};

const candidateIds = (specifier, dirname, relative) => {
  const keys = [];
  const add = (key) => {
    const normalized = normalizeModuleKey(key);
    if (!keys.includes(normalized)) keys.push(normalized);
  };
  if (isNamed(specifier)) {
    add(specifier);
    return keys;
  }
  const resolved = resolveVirtual(dirname, relative, specifier);
  add(resolved);
  if (!KNOWN_EXT.includes(extname(resolved))) {
    add(`${resolved}.js`);
    add(`${resolved}.json`);
  }
  add(specifier);
  return keys;
};

const parentDirname = (id, fallback) => {
  const slash = String(id).replaceAll('\\', '/');
  if (!slash.startsWith('/') && !/^[A-Za-z]:/.test(slash)) return fallback;
  const index = slash.lastIndexOf('/');
  if (index <= 0) return index === 0 ? '/' : fallback;
  return slash.slice(0, index);
};

const indexModules = (modules) => {
  const map = new Map();
  if (!modules || typeof modules !== 'object') return map;
  for (const [key, descriptor] of Object.entries(modules)) {
    map.set(normalizeModuleKey(key), descriptor);
  }
  return map;
};

const accessRules = (access) => {
  if (!access) return [];
  return Object.entries(access).map(([key, value]) => {
    const location = normalizePortable(key);
    const hasSep = location.endsWith('/');
    const prefix = hasSep ? location : `${location}/`;
    return {
      location,
      file: addExt(location),
      prefix,
      isRoot: prefix === './',
      value,
    };
  });
};

const checkAccess = (rules, name) => {
  const dir = normalizePortable(name);
  const isParent = dir === '..' || dir.startsWith('../');
  const isLocal = name.startsWith('.') && !isParent;
  for (const rule of rules) {
    const isFile = dir === rule.location || dir === rule.file;
    const allowed = rule.isRoot
      ? isLocal
      : isFile || dir.startsWith(rule.prefix);
    if (allowed) return rule.value;
  }
  return null;
};

const invalidModule = (id) => {
  throw new MetavmError(
    `Invalid virtual module '${id}'`,
    ERROR_CODE.MODULE_NOT_FOUND,
  );
};

const evaluate = (id, descriptor, env, compile) => {
  if (!descriptor || typeof descriptor !== 'object') invalidModule(id);
  const { cache } = env;
  if ('exports' in descriptor) {
    cache.set(id, { exports: descriptor.exports });
    return descriptor.exports;
  }
  if ('json' in descriptor) {
    cache.set(id, { exports: descriptor.json });
    return descriptor.json;
  }
  if (typeof descriptor.source !== 'string') invalidModule(id);
  if (descriptor.type === MODULE_TYPE.ECMA) {
    throw new MetavmError(
      'ECMAScript modules is not supported',
      ERROR_CODE.ESM_NOT_SUPPORTED,
    );
  }
  const record = { exports: {} };
  cache.set(id, record);
  try {
    const exported = compile(
      id,
      descriptor,
      record,
      parentDirname(id, env.dirname),
    );
    record.exports = exported;
    return exported;
  } catch (error) {
    cache.delete(id);
    throw error;
  }
};

const loadFromRegistry = (specifier, env, compile) => {
  const { cache } = env;
  const ids = candidateIds(specifier, env.dirname, env.relative);
  for (const id of ids) {
    if (cache.has(id)) {
      return { found: true, exports: cache.get(id).exports };
    }
    if (!env.modules.has(id)) continue;
    return {
      found: true,
      exports: evaluate(id, env.modules.get(id), env, compile),
    };
  }
  return { found: false, exports: undefined };
};

const createRequire = (env, compile) => (specifier) => {
  let lib = checkAccess(env.rules, specifier);
  if (lib instanceof Object) return lib;
  if (!isNamed(specifier)) {
    const resolved = resolveVirtual(
      env.dirname,
      env.relative,
      addExt(specifier),
    );
    const relPath = `./${relativePortable(env.dirname, resolved)}`;
    lib = checkAccess(env.rules, relPath);
    if (lib instanceof Object) return lib;
  }
  if (env.modules.size > 0) {
    const virtual = loadFromRegistry(specifier, env, compile);
    if (virtual.found) {
      if (!lib) {
        throw new MetavmError(
          `Access denied '${specifier}'`,
          ERROR_CODE.ACCESS_DENIED,
        );
      }
      return virtual.exports;
    }
  }
  if (!lib) {
    throw new MetavmError(
      `Access denied '${specifier}'`,
      ERROR_CODE.ACCESS_DENIED,
    );
  }
  throw new MetavmError(
    `Cannot find module '${specifier}'`,
    ERROR_CODE.MODULE_NOT_FOUND,
  );
};

const MODULE_RECORD = Symbol('moduleRecord');
const MODULE_CACHE = Symbol('moduleCache');
const USE_STRICT = `'use strict';\n`;
const UNSUPPORTED = ['timeout', 'microtaskMode', 'breakOnSigint'];
const CJS_MARKER = ['module', 'exports'].join('.');

const rejectUnsupported = (options) => {
  if (!options) return;
  for (const key of UNSUPPORTED) {
    if (options[key] !== undefined) {
      throw new MetavmError(
        `Option '${key}' is not supported in the browser`,
        ERROR_CODE.OPTION_NOT_SUPPORTED,
      );
    }
  }
};

const sourceURL = (filename) => {
  const safe = String(filename).replaceAll(/[\r\n]/g, '');
  return `\n//# sourceURL=${safe}\n`;
};

const wrapMetarhia = (source, filename) => {
  const strict = source.startsWith(USE_STRICT) ? '' : USE_STRICT;
  return `${strict}{\n${source}\n}${sourceURL(filename)}`;
};

const wrapCommon = (source, filename) => {
  const strict = source.startsWith(USE_STRICT) ? '' : USE_STRICT;
  const params = 'exports, require, module, __filename, __dirname';
  const body = `((${params}) => { ${source}\n});`;
  return `${strict}${body}${sourceURL(filename)}`;
};

const scriptDirname = (filename) => {
  const slash = String(filename).replaceAll('\\', '/');
  if (!slash.includes('/')) return '.';
  const index = slash.lastIndexOf('/');
  if (index <= 0) return index === 0 ? '/' : '.';
  return slash.slice(0, index);
};

class MetaScript {
  #rules;
  #modules;
  #defs;
  #record;
  #cache;

  constructor(name, src, options = {}) {
    rejectUnsupported(options);
    if (options.type === MODULE_TYPE.ECMA) {
      throw new MetavmError(
        'ECMAScript modules is not supported',
        ERROR_CODE.ESM_NOT_SUPPORTED,
      );
    }
    this.name = name;
    this.dirname = options.dirname || '/';
    this.relative = options.relative || '.';
    this.type = options.type || MODULE_TYPE.AUTO;
    this.access = options.access || {};
    this.#rules = accessRules(this.access);
    this.#defs = options.modules || null;
    this.#modules = indexModules(options.modules);
    this.#record = options[MODULE_RECORD] || null;
    this.#cache = options[MODULE_CACHE] || new Map();
    if (this.type === MODULE_TYPE.AUTO) {
      if (src.includes(CJS_MARKER)) this.type = MODULE_TYPE.COMMONJS;
      else this.type = MODULE_TYPE.METARHIA;
    }
    const common = this.type === MODULE_TYPE.COMMONJS;
    const code = common ? wrapCommon(src, name) : wrapMetarhia(src, name);
    this.script = { filename: name, sourceURL: name };
    this.context = options.context || (common ? EMPTY_CJS : EMPTY_CONTEXT);
    const exported = runInContext(this.context, code);
    this.exports = common ? this.#commonExports(exported) : exported;
  }

  #env() {
    return {
      dirname: this.dirname,
      relative: this.relative,
      rules: this.#rules,
      context: this.context,
      access: this.access,
      modules: this.#modules,
      cache: this.#cache,
    };
  }

  #commonExports(closure) {
    const record = this.#record || { exports: {} };
    const require = createRequire(
      this.#env(),
      (id, descriptor, child, dirname) => {
        const script = new MetaScript(id, descriptor.source, {
          type: descriptor.type || MODULE_TYPE.COMMONJS,
          dirname,
          relative: '.',
          context: this.context,
          access: this.access,
          modules: this.#defs,
          [MODULE_RECORD]: child,
          [MODULE_CACHE]: this.#cache,
        });
        return script.exports;
      },
    );
    const dirname = scriptDirname(this.name);
    closure(record.exports, require, record, this.name, dirname);
    return record.exports;
  }
}

const createScript = (name, src, options) => new MetaScript(name, src, options);

const nameFromUrl = (input) => {
  let pathname = String(input);
  try {
    pathname = new URL(input, 'http://local.invalid').pathname;
  } catch (error) {
    void error;
  }
  const base = pathname.split('/').pop() || 'script';
  return base.endsWith('.js') ? base.slice(0, -3) : base;
};

const dirnameFromUrl = (input) => {
  let pathname = String(input);
  try {
    pathname = new URL(input, 'http://local.invalid').pathname;
  } catch (error) {
    void error;
  }
  const index = pathname.lastIndexOf('/');
  if (index <= 0) return '/';
  return pathname.slice(0, index);
};

const readScript = async (url, options) => {
  rejectUnsupported(options);
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new MetavmError(
      `Failed to read script '${url}': ${reason}`,
      ERROR_CODE.MODULE_NOT_FOUND,
    );
  }
  if (!response.ok) {
    const status = `${response.status} ${response.statusText}`;
    throw new MetavmError(
      `Failed to read script '${url}': ${status}`,
      ERROR_CODE.MODULE_NOT_FOUND,
    );
  }
  const src = await response.text();
  if (src === '') throw new SyntaxError(`File ${url} is empty`);
  const located = response.url || String(url);
  const name = options?.filename || nameFromUrl(located);
  const dirname = options?.dirname || dirnameFromUrl(located);
  return createScript(name, src, { ...options, dirname });
};

export {
  MODULE_TYPE,
  ERROR_CODE,
  MetavmError,
  EMPTY_CONTEXT,
  EMPTY_CJS,
  COMMON_CONTEXT,
  createContext,
  disposeContext,
  runInContext,
  MetaScript,
  createScript,
  readScript,
};
