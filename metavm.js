'use strict';

const vm = require('node:vm');
const fs = require('node:fs');
const fsp = fs.promises;
const path = require('node:path');

const CURDIR = `.${path.sep}`;

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

const addExt = (name) => {
  const ext = path.extname(name);
  if (ext === '') return `${name}.js`;
  return name;
};

const packageRoot = (filename, specifier) => {
  const parts = specifier.split('/');
  const scoped = specifier.startsWith('@');
  const folder = scoped ? `${parts[0]}${path.sep}${parts[1]}` : parts[0];
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

    this.context = options.context || (common ? EMPTY_CJS : EMPTY_CONTEXT);

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
      const absolute = resolveModule(name, module);
      const isBuiltin = isNpm && absolute === name;
      if (isBuiltin) return internalRequire(name);
      const entryDir = path.dirname(absolute);
      if (isNpm) {
        dirname = packageRoot(absolute, module);
        const nested = path.relative(dirname, entryDir);
        relative = nested === '' ? '.' : nested;
        access = { ...access, [CURDIR]: true };
      } else {
        relative = entryDir;
      }
      const src = fs.readFileSync(absolute, 'utf8');
      const isJson = path.extname(absolute).toLowerCase() === '.json';
      if (isJson) return JSON.parse(src);
      const opt = { context, type, dirname, relative, access };
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
