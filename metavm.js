'use strict';

const vm = require('vm');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const RUN_OPTIONS = { timeout: 5000, displayErrors: false };
const CONTEXT_OPTIONS = { microtaskMode: 'afterEvaluate' };
const USE_STRICT = `'use strict';\n`;

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

class MetaScript {
  constructor(name, src, options = {}) {
    const strict = src.startsWith(USE_STRICT);
    const code = strict ? src : USE_STRICT + src;
    const lineOffset = strict ? 0 : -1;
    this.name = name;
    const scriptOptions = { filename: name, ...options, lineOffset };
    this.script = new vm.Script(code, scriptOptions);
    this.context = options.context || createContext();
    this.exports = this.script.runInContext(this.context, RUN_OPTIONS);
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
  for (const key of Object.keys(access)) {
    if (name.startsWith(key)) return Reflect.get(access, key);
  }
};

const metarequire = (options) => {
  const { dirname = process.cwd(), relative = '.' } = options;
  const context = createContext({ ...options.context });
  const access = { ...options.access };

  const require = (module) => {
    let name = module;
    let lib = checkAccess(access, name);
    if (lib instanceof Object) return lib;
    const npm = !name.includes('.');
    if (!npm) {
      name = path.resolve(dirname, relative, module);
      let rel = './' + path.relative(dirname, name);
      lib = checkAccess(access, rel);
      if (lib instanceof Object) return lib;
      const ext = name.toLocaleLowerCase().endsWith('.js') ? '' : '.js';
      const js = name + ext;
      name = name.startsWith('.') ? path.resolve(dirname, js) : js;
      rel = './' + path.relative(dirname, js);
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
        const access = { ...options.access, './': true };
        relative = '.';
        context.require = metarequire({ dirname, relative, context, access });
      } else {
        context.require = metarequire({ dirname, relative, context, access });
      }
      const src = fs.readFileSync(absolute, 'utf8');
      const script = createScript(module, src, { context });
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
  readScript,
  metarequire,
};
