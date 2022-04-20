'use strict';

const vm = require('vm');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const RUN_OPTIONS = { timeout: 5000, displayErrors: false };
const CONTEXT_OPTIONS = { microtaskMode: 'afterEvaluate' };
const USE_STRICT = `'use strict';\n`;
const CURDIR = '.' + path.sep;
const SRC_BEFORE = '((exports, require, module, __filename, __dirname) => { ';
const SRC_AFTER = '\n});';

const MODULE_TYPE = {
  METARHIA: 1,
  COMMONJS: 2,
};

const EMPTY_CONTEXT = vm.createContext(Object.freeze({}));

const COMMON_CONTEXT = vm.createContext(
  Object.freeze({
    Buffer,
    URL,
    URLSearchParams,
    TextDecoder,
    TextEncoder,
    console,
    queueMicrotask,
    setTimeout,
    setImmediate,
    setInterval,
    clearTimeout,
    clearImmediate,
    clearInterval,
  })
);

class MetavmError extends Error {}

const createContext = (context, preventEscape = false) => {
  if (context === undefined) return EMPTY_CONTEXT;
  return vm.createContext(context, preventEscape ? CONTEXT_OPTIONS : {});
};

const wrapSource = (src) => SRC_BEFORE + src + SRC_AFTER;

const useStrict = (src) => (src.startsWith(USE_STRICT) ? '' : USE_STRICT);

class MetaScript {
  constructor(name, src, options = {}) {
    this.name = name;
    this.type = options.type || MODULE_TYPE.METARHIA;
    const common = this.type === MODULE_TYPE.COMMONJS;
    const strict = useStrict(src);
    const code = common ? wrapSource(src) : src;
    const lineOffset = strict === '' ? 0 : -1;
    const scriptOptions = { filename: name, ...options, lineOffset };
    this.script = new vm.Script(strict + code, scriptOptions);
    this.context = options.context || createContext();
    const exports = this.script.runInContext(this.context, RUN_OPTIONS);
    this.exports = common ? this.commonExports(exports) : exports;
  }

  commonExports(closure) {
    const exports = {};
    const module = { exports };
    const { require } = this.context;
    const __filename = this.name;
    const __dirname = path.dirname(__filename);
    closure(exports, require, module, __filename, __dirname);
    return module.exports || exports;
  }
}

const createScript = (name, src, options) => new MetaScript(name, src, options);

const readScript = async (filePath, options) => {
  const src = await fsp.readFile(filePath, 'utf8');
  if (src === '') throw new SyntaxError(`File ${filePath} is empty`);
  const name =
    options && options.filename
      ? options.filename
      : path.basename(filePath, '.js');
  const script = new MetaScript(name, src, options);
  return script;
};

const internalRequire = require;

const checkAccess = (access, name) => {
  const dir = path.join(name);
  for (const key of Object.keys(access)) {
    const location = path.join(key);
    if (dir.startsWith(location)) return Reflect.get(access, key);
  }
};

const metarequire = (options) => {
  const { dirname = process.cwd(), relative = '.', type } = options;
  const context = createContext({ ...options.context });
  const access = { ...options.access };

  const require = (module) => {
    let name = module;
    let lib = checkAccess(access, name);
    if (lib instanceof Object) return lib;
    const npm = !name.includes('.');
    if (!npm) {
      name = path.resolve(dirname, relative, module);
      let rel = CURDIR + path.relative(dirname, name);
      lib = checkAccess(access, rel);
      if (lib instanceof Object) return lib;
      const ext = name.toLocaleLowerCase().endsWith('.js') ? '' : '.js';
      const js = name + ext;
      name = name.startsWith('.') ? path.resolve(dirname, js) : js;
      rel = CURDIR + path.relative(dirname, js);
      lib = checkAccess(access, rel);
      if (lib instanceof Object) return lib;
    }
    if (!lib) throw new MetavmError(`Access denied '${module}'`);
    try {
      const absolute = internalRequire.resolve(name);
      if (npm && absolute === name) return internalRequire(name);
      let relative = path.dirname(absolute);
      if (npm) {
        const dirname = relative;
        const access = { ...options.access, [CURDIR]: true };
        relative = '.';
        const opt = { dirname, relative, context, access, type };
        context.require = metarequire(opt);
      } else {
        const opt = { dirname, relative, context, access, type };
        context.require = metarequire(opt);
      }
      const src = fs.readFileSync(absolute, 'utf8');
      const opt = { context: createContext(context), type };
      const script = createScript(module, src, opt);
      return script.exports;
    } catch (err) {
      if (err instanceof MetavmError) throw err;
      throw new MetavmError(`Cannot find module '${module}'`);
    }
  };

  return require;
};

module.exports = {
  createContext,
  MetaScript,
  createScript,
  EMPTY_CONTEXT,
  COMMON_CONTEXT,
  MODULE_TYPE,
  readScript,
  metarequire,
};
