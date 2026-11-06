'use strict';

const vm = require('node:vm');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');

const { indexModules, loadFromRegistry } = require('./virtual.js');

const CURDIR = `.${path.sep}`;
const MODULE_RECORD = Symbol('moduleRecord');
const MODULE_CACHE = Symbol('moduleCache');

const RUN_OPTIONS = { timeout: 1000 };

const CONTEXT_OPTIONS = {
  codeGeneration: {
    strings: false,
    wasm: false,
  },
};

const ESCAPE_OPTIONS = { ...CONTEXT_OPTIONS, microtaskMode: 'afterEvaluate' };

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

const DEFAULT = {
  AbortController,
  AbortSignal,
  Event,
  EventTarget,
  MessageChannel,
  MessageEvent,
  MessagePort,
  Buffer,
  Blob,
  FormData,
  Headers,
  Response,
  Request,
  ByteLengthQueuingStrategy,
  URL,
  URLSearchParams,
  TextDecoder,
  TextEncoder,
  TextDecoderStream,
  TextEncoderStream,
  WebAssembly,
  queueMicrotask,
  setTimeout,
  setImmediate,
  setInterval,
  clearTimeout,
  clearImmediate,
  clearInterval,
  BroadcastChannel,
  CompressionStream,
  DecompressionStream,
  CountQueuingStrategy,
  fetch,
};

const NODE = { global, console, process };

const EMPTY_CONTEXT = vm.createContext(Object.freeze({}), CONTEXT_OPTIONS);
const COMMON_CONTEXT = vm.createContext(
  Object.freeze({ ...DEFAULT }),
  CONTEXT_OPTIONS,
);
const NODE_CONTEXT = vm.createContext(
  Object.freeze({ ...DEFAULT, ...NODE }),
  CONTEXT_OPTIONS,
);
const CONTEXT_CJS = Object.freeze({ module: {} });
const EMPTY_CJS = vm.createContext(CONTEXT_CJS, CONTEXT_OPTIONS);

class MetavmError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'MetavmError';
    if (code) this.code = code;
  }
}

const createContext = (context, preventEscape = false) => {
  if (context === undefined) return EMPTY_CONTEXT;
  const options = preventEscape ? ESCAPE_OPTIONS : CONTEXT_OPTIONS;
  return vm.createContext(context, options);
};

const wrapSource = (source) =>
  `((exports, require, module, __filename, __dirname) => { ${source}\n});`;

const USE_STRICT = `'use strict';\n`;

const EXTENSIONS = ['.js', '.cjs', '.mjs', '.json'];

const addExt = (name) => {
  const ext = path.extname(name).toLowerCase();
  return EXTENSIONS.includes(ext) ? name : `${name}.js`;
};

const packageRoot = (filename, specifier) => {
  const scoped = specifier.startsWith('@');
  const parts = specifier.split('/').slice(0, scoped ? 2 : 1);
  const folder = parts.join(path.sep);
  const marker = `${path.sep}node_modules${path.sep}${folder}${path.sep}`;
  const index = filename.lastIndexOf(marker);
  if (index === -1) return path.dirname(filename);
  return filename.slice(0, index + marker.length - 1);
};

const accessRule = ([key, value]) => {
  const location = path.normalize(key);
  const hasSep = location.endsWith(path.sep);
  const prefix = hasSep ? location : location + path.sep;
  const file = addExt(location);
  const isRoot = prefix === CURDIR;
  return { location, file, prefix, isRoot, value };
};

const internalRequire = require;

const resolveModule = (name, specifier) => {
  try {
    return internalRequire.resolve(name);
  } catch {
    throw new MetavmError(
      `Cannot find module '${specifier}'`,
      ERROR_CODE.MODULE_NOT_FOUND,
    );
  }
};

class MetaScript {
  #rules;
  #modules;
  #defs;
  #record;
  #cache;

  constructor(name, src, options = {}) {
    if (options.type === MODULE_TYPE.ECMA) {
      throw new MetavmError(
        'ECMAScript modules is not supported',
        ERROR_CODE.ESM_NOT_SUPPORTED,
      );
    }
    this.name = name;
    this.dirname = options.dirname || process.cwd();
    this.relative = options.relative || '.';
    this.type = options.type || MODULE_TYPE.AUTO;
    this.access = options.access || {};
    this.#rules = Object.entries(this.access).map(accessRule);
    this.#defs = options.modules || null;
    this.#modules = indexModules(options.modules);
    this.#record = options[MODULE_RECORD] || null;
    this.#cache = options[MODULE_CACHE] || new Map();
    if (this.type === MODULE_TYPE.AUTO) {
      if (src.includes('module.exports')) this.type = MODULE_TYPE.COMMONJS;
      else this.type = MODULE_TYPE.METARHIA;
    }
    const common = this.type === MODULE_TYPE.COMMONJS;
    const strict = src.startsWith(USE_STRICT) ? '' : USE_STRICT;
    const code = common ? wrapSource(src) : `{\n${src}\n}`;
    const lineOffset = strict === '' ? -1 : -2;
    const vmOptions = { ...options };
    delete vmOptions.modules;
    delete vmOptions[MODULE_RECORD];
    delete vmOptions[MODULE_CACHE];
    const scriptOptions = { filename: name, ...vmOptions, lineOffset };
    this.script = new vm.Script(strict + code, scriptOptions);

    this.context = options.context || (common ? EMPTY_CJS : EMPTY_CONTEXT);

    const runOptions = { ...RUN_OPTIONS, ...options };
    delete runOptions.modules;
    delete runOptions[MODULE_RECORD];
    delete runOptions[MODULE_CACHE];
    const exports = this.script.runInContext(this.context, runOptions);
    this.exports = common ? this.commonExports(exports) : exports;
  }

  commonExports(closure) {
    const record = this.#record || { exports: {} };
    const require = this.createRequire();
    const filename = this.name;
    const dirname = filename.startsWith('/')
      ? path.posix.dirname(filename)
      : path.dirname(filename);
    closure(record.exports, require, record, filename, dirname);
    return record.exports;
  }

  loadVirtual(specifier) {
    if (this.#modules.size === 0) return { found: false, exports: undefined };
    return loadFromRegistry(specifier, {
      modules: this.#modules,
      dirname: this.dirname,
      relative: this.relative,
      cache: this.#cache,
      MetavmError,
      ERROR_CODE,
      MODULE_TYPE,
      compile: (id, descriptor, record, dirname) => {
        const script = new MetaScript(id, descriptor.source, {
          type: descriptor.type || MODULE_TYPE.COMMONJS,
          dirname,
          relative: '.',
          context: this.context,
          access: this.access,
          modules: this.#defs,
          [MODULE_RECORD]: record,
          [MODULE_CACHE]: this.#cache,
        });
        return script.exports;
      },
    });
  }

  checkAccess(name) {
    const dir = path.normalize(name);
    const isParent = dir === '..' || dir.startsWith(`..${path.sep}`);
    const isLocal = name.startsWith('.') && !isParent;
    for (const { location, file, prefix, isRoot, value } of this.#rules) {
      const isFile = dir === location || dir === file;
      const allowed = isRoot ? isLocal : isFile || dir.startsWith(prefix);
      if (allowed) return value;
    }
    return null;
  }

  createRequire() {
    const { context, type } = this;
    const require = (module) => {
      let name = module;
      let lib = this.checkAccess(name);
      if (lib instanceof Object) return lib;
      const isNpm = !name.includes('.');
      let { dirname, relative, access } = this;
      if (!isNpm) {
        name = path.resolve(dirname, relative, addExt(name));
        const relPath = CURDIR + path.relative(dirname, name);
        lib = this.checkAccess(relPath);
        if (lib instanceof Object) return lib;
      }
      if (!lib) {
        throw new MetavmError(
          `Access denied '${module}'`,
          ERROR_CODE.ACCESS_DENIED,
        );
      }
      const virtual = this.loadVirtual(module);
      if (virtual.found) return virtual.exports;
      const absolute = resolveModule(name, module);
      const isBuiltin = isNpm && absolute === name;
      if (isBuiltin) return internalRequire(name);
      const ext = path.extname(absolute).toLowerCase();
      const src = fs.readFileSync(absolute, 'utf8');
      if (ext === '.json') return JSON.parse(src);
      relative = path.dirname(absolute);
      if (isNpm) {
        dirname = packageRoot(absolute, module);
        access = { ...access, [CURDIR]: true };
      }
      const kind = ext === '.mjs' ? MODULE_TYPE.ECMA : type;
      const opt = { context, type: kind, dirname, relative, access };
      const script = new MetaScript(name, src, opt);
      return script.exports;
    };
    return require;
  }
}

const createScript = (name, src, options) => new MetaScript(name, src, options);

const readScript = async (filePath, options) => {
  const src = await fsp.readFile(filePath, 'utf8');
  if (src === '') {
    throw new SyntaxError(`File ${filePath} is empty`);
  }
  const absolute = path.resolve(filePath);
  const basename = path.basename(filePath, '.js');
  const name = options?.filename || basename;
  const dirname = options?.dirname || path.dirname(absolute);
  const opts = { ...options, dirname };
  const script = new MetaScript(name, src, opts);
  return script;
};

module.exports = {
  createContext,
  MetaScript,
  MetavmError,
  ERROR_CODE,
  createScript,
  EMPTY_CONTEXT,
  EMPTY_CJS,
  COMMON_CONTEXT,
  NODE_CONTEXT,
  MODULE_TYPE,
  readScript,
};
