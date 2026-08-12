'use strict';

const vm = require('node:vm');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');
const builtinModules = require('node:module').builtinModules;

const CURDIR = `.${path.sep}`;

const RUN_OPTIONS = { timeout: 1000 };

const CONTEXT_OPTIONS = {
  codeGeneration: {
    strings: false,
    wasm: false,
  },
};

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
const COMMON_CONTEXT = vm.createContext(Object.freeze({ ...DEFAULT }));
const NODE_CONTEXT = vm.createContext(Object.freeze({ ...DEFAULT, ...NODE }));
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
  const options = preventEscape ? { microtaskMode: 'afterEvaluate' } : {};
  return vm.createContext(context, { ...CONTEXT_OPTIONS, ...options });
};

const wrapSource = (source) =>
  `((exports, require, module, __filename, __dirname) => { ${source}\n});`;

const USE_STRICT = `'use strict';\n`;

const addExt = (name) => {
  if (name.toLowerCase().endsWith('.js')) return name;
  return `${name}.js`;
};

const internalRequire = require;

class MetaScript {
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
    if (this.type === MODULE_TYPE.AUTO) {
      if (src.includes('module.exports')) this.type = MODULE_TYPE.COMMONJS;
      else this.type = MODULE_TYPE.METARHIA;
    }
    const common = this.type === MODULE_TYPE.COMMONJS;
    const strict = src.startsWith(USE_STRICT) ? '' : USE_STRICT;
    const code = common ? wrapSource(src) : `{\n${src}\n}`;
    const lineOffset = strict === '' ? -1 : -2;
    const scriptOptions = { filename: name, ...options, lineOffset };
    this.script = new vm.Script(strict + code, scriptOptions);

    if (options.context) this.context = options.context;
    else if (this.type === MODULE_TYPE.COMMONJS) this.context = EMPTY_CJS;
    else this.context = EMPTY_CONTEXT;

    const runOptions = { ...RUN_OPTIONS, ...options };
    const exports = this.script.runInContext(this.context, runOptions);
    this.exports = common ? this.commonExports(exports) : exports;
  }

  commonExports(closure) {
    const exports = {};
    const module = { exports };
    const require = this.createRequire();
    const __filename = this.name;
    const __dirname = path.dirname(__filename);
    closure(exports, require, module, __filename, __dirname);
    return module.exports || exports;
  }

  checkAccess(name) {
    const dir = path.normalize(path.join(name));
    for (const key of Object.keys(this.access)) {
      const location = path.normalize(path.join(key));
      if (dir === location) return Reflect.get(this.access, key);
      let prefix = location;
      if (!prefix.endsWith(path.sep)) prefix += path.sep;
      if (dir.startsWith(prefix)) return Reflect.get(this.access, key);
    }
    return null;
  }

  createRequire() {
    const { context, type } = this;
    const require = (module) => {
      let name = module;
      const builtin = name.startsWith('node:');
      if (builtin) {
        const builtinName = name.slice(5);
        if (builtinModules.includes(builtinName)) return internalRequire(name);
      }
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
      try {
        const absolute = internalRequire.resolve(name);
        const isBuiltin = isNpm && absolute === name;
        if (isBuiltin) return internalRequire(name);
        relative = path.dirname(absolute);
        if (isNpm) {
          dirname = relative;
          access = { ...access, [CURDIR]: true };
          relative = '.';
        }
        const src = fs.readFileSync(absolute, 'utf8');
        const opt = { context, type, dirname, relative, access };
        const script = new MetaScript(name, src, opt);
        return script.exports;
      } catch (error) {
        if (error instanceof MetavmError) throw error;
        throw new MetavmError(
          `Cannot find module '${module}'`,
          ERROR_CODE.MODULE_NOT_FOUND,
        );
      }
    };
    return require;
  }
}

const createScript = (name, src, options) => new MetaScript(name, src, options);

const readScript = async (filePath, options = {}) => {
  const src = await fsp.readFile(filePath, 'utf8');
  if (src === '') {
    throw new SyntaxError(`File ${filePath} is empty`);
  }
  const absolute = path.resolve(filePath);
  const basename = path.basename(filePath, '.js');
  const name = options.filename ? options.filename : basename;
  const dirname = options.dirname ?? path.dirname(absolute);
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
