'use strict';

const vm = require('node:vm');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');

const CURDIR = '.' + path.sep;

const RUN_OPTIONS = { timeout: 1000 };

const CONTEXT_OPTIONS = {
  codeGeneration: {
    strings: false,
    wasm: false,
  },
};

const MODULE_TYPE = {
  METARHIA: 1,
  COMMONJS: 2,
  ECMA: 3,
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

class MetavmError extends Error {}

const createContext = (context, preventEscape = false) => {
  if (context === undefined) return EMPTY_CONTEXT;
  const options = preventEscape ? { microtaskMode: 'afterEvaluate' } : {};
  return vm.createContext(context, { ...CONTEXT_OPTIONS, ...options });
};

const SRC_BEFORE = '((exports, require, module, __filename, __dirname) => { ';
const SRC_AFTER = '\n});';
const wrapSource = (src) => SRC_BEFORE + src + SRC_AFTER;

const USE_STRICT = `'use strict';\n`;
const useStrict = (src) => (src.startsWith(USE_STRICT) ? '' : USE_STRICT);

const addExt = (name) => {
  if (name.toLocaleLowerCase().endsWith('.js')) return name;
  return name + '.js';
};

const internalRequire = require;

class MetaScript {
  constructor(name, src, options = {}) {
    if (options.type === MODULE_TYPE.ECMA) {
      throw new Error('ECMAScript modules is not supported');
    }
    this.name = name;
    this.dirname = options.dirname || process.cwd();
    this.relative = options.relative || '.';
    this.type = options.type || MODULE_TYPE.METARHIA;
    this.access = options.access || {};
    const common = this.type === MODULE_TYPE.COMMONJS;
    const strict = useStrict(src);
    const code = common ? wrapSource(src) : `{\n${src}\n}`;
    const lineOffset = strict === '' ? -1 : -2;
    const scriptOptions = { filename: name, ...options, lineOffset };
    this.script = new vm.Script(strict + code, scriptOptions);
    this.context = options.context || createContext();
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
    const dir = path.join(name);
    for (const key of Object.keys(this.access)) {
      const location = path.join(key);
      if (dir.startsWith(location)) {
        return Reflect.get(this.access, key);
      }
    }
    return null;
  }

  createRequire() {
    const { context, type } = this;
    let { dirname, relative, access } = this;
    const require = (module) => {
      let name = module;
      let lib = this.checkAccess(name);
      if (lib instanceof Object) return lib;
      const npm = !name.includes('.');
      if (!npm) {
        name = path.resolve(dirname, relative, addExt(name));
        lib = this.checkAccess(CURDIR + path.relative(dirname, name));
        if (lib instanceof Object) return lib;
      }
      if (!lib) throw new MetavmError(`Access denied '${module}'`);
      try {
        const absolute = internalRequire.resolve(name);
        if (npm && absolute === name) return internalRequire(name);
        relative = path.dirname(absolute);
        if (npm) {
          dirname = relative;
          access = { ...access, [CURDIR]: true };
          relative = '.';
        }
        const src = fs.readFileSync(absolute, 'utf8');
        const opt = { context, type, dirname, relative, access };
        const script = new MetaScript(name, src, opt);
        return script.exports;
      } catch (err) {
        if (err instanceof MetavmError) throw err;
        throw new MetavmError(`Cannot find module '${module}'`);
      }
    };
    return require;
  }
}

const createScript = (name, src, options) => new MetaScript(name, src, options);

const readScript = async (filePath, options) => {
  const src = await fsp.readFile(filePath, 'utf8');
  if (src === '') throw new SyntaxError(`File ${filePath} is empty`);
  const name = options?.filename
    ? options.filename
    : path.basename(filePath, '.js');
  const script = new MetaScript(name, src, options);
  return script;
};

module.exports = {
  createContext,
  MetaScript,
  createScript,
  EMPTY_CONTEXT,
  COMMON_CONTEXT,
  NODE_CONTEXT,
  MODULE_TYPE,
  readScript,
};
