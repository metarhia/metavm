'use strict';

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

const invalidModule = (env, id) => {
  throw new env.MetavmError(
    `Invalid virtual module '${id}'`,
    env.ERROR_CODE.MODULE_NOT_FOUND,
  );
};

const evaluate = (id, descriptor, env) => {
  if (!descriptor || typeof descriptor !== 'object') invalidModule(env, id);
  const { cache } = env;
  if ('exports' in descriptor) {
    cache.set(id, { exports: descriptor.exports });
    return descriptor.exports;
  }
  if ('json' in descriptor) {
    cache.set(id, { exports: descriptor.json });
    return descriptor.json;
  }
  if (typeof descriptor.source !== 'string') invalidModule(env, id);
  if (descriptor.type === env.MODULE_TYPE.ECMA) {
    throw new env.MetavmError(
      'ECMAScript modules is not supported',
      env.ERROR_CODE.ESM_NOT_SUPPORTED,
    );
  }
  const record = { exports: {} };
  cache.set(id, record);
  try {
    const exported = env.compile(
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

const loadFromRegistry = (specifier, env) => {
  const ids = candidateIds(specifier, env.dirname, env.relative);
  for (const id of ids) {
    if (env.cache.has(id)) {
      return { found: true, exports: env.cache.get(id).exports };
    }
    if (!env.modules.has(id)) continue;
    return {
      found: true,
      exports: evaluate(id, env.modules.get(id), env),
    };
  }
  return { found: false, exports: undefined };
};

module.exports = {
  indexModules,
  loadFromRegistry,
};
