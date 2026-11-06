# Metarhia script loader, node.js vm wrapper

[![ci status](https://github.com/metarhia/metavm/workflows/Testing%20CI/badge.svg)](https://github.com/metarhia/metavm/actions?query=workflow%3A%22Testing+CI%22+branch%3Amaster)
[![snyk](https://snyk.io/test/github/metarhia/metavm/badge.svg)](https://snyk.io/test/github/metarhia/metavm)
[![npm version](https://badge.fury.io/js/metavm.svg)](https://badge.fury.io/js/metavm)
[![npm downloads/month](https://img.shields.io/npm/dm/metavm.svg)](https://www.npmjs.com/package/metavm)
[![npm downloads](https://img.shields.io/npm/dt/metavm.svg)](https://www.npmjs.com/package/metavm)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/metarhia/metavm/blob/master/LICENSE)

## Create script from string

Script contains object expression. You can use it for configs, network packets,
serialization format, etc.

```js
const metavm = require('metavm');

const src = `({ field: 'value' });`;
const ms = metavm.createScript('Example', src);
console.log(ms);
```

Output:

```js
MetaScript {
  name: 'Example',
  script: Script {},
  context: {},
  exports: { field: 'value' }
}
```

Script contains function expression. You can use it for api endpoints, domain logic stored in files or database, etc.

```js
const metavm = require('metavm');

const src = `(a, b) => a + b;`;
const ms = metavm.createScript('Example', src);
console.log(ms);
```

Output:

```js
MetaScript {
  name: 'Example',
  script: Script {},
  context: {},
  exports: [Function]
}
```

CommonJS format

```js
const metavm = require('metavm');

const src = `module.exports = { field: 'value' };`;
const ms = metavm.createScript('Example', src, {
  type: metavm.MODULE_TYPE.COMMONJS,
});
console.log(ms.exports); // { field: 'value' }
```

## Read script from file

Metarhia format

```js
const metavm = require('metavm');

const ms = await metavm.readScript('./examples/metarhia/simple.js');
console.log(ms.exports);
// { field: 'value', add: [Function: add], sub: [Function: sub] }
```

CommonJS format

```js
const metavm = require('metavm');

const ms = await metavm.readScript('./examples/cjs/simple.js', {
  type: metavm.MODULE_TYPE.COMMONJS,
});
console.log(ms.exports);
// { field: 'value', add: [Function: add], sub: [Function: sub] }
```

## Browser

The browser entry is `metavm.mjs`, built from `lib/` with
[metarhia-build](https://github.com/metarhia/metarhia-build) (`npm run build`).
It evaluates trusted application code in a persistent same-origin `about:blank`
iframe. `createScript()` stays synchronous, and a callable export can be called
directly. This is a separate JavaScript realm, not a security sandbox: the
frame can see browser globals and `parent`.

```js
import * as metavm from 'metavm';

const context = metavm.createContext({ console });
const script = metavm.createScript('Calculator', '(a, b) => a + b', {
  context,
});

const add = script.exports;
console.log(add(2, 3)); // 5
```

Preload CommonJS dependencies. The browser never fetches from inside
`require()`.

```js
const script = metavm.createScript(
  'main.js',
  `module.exports = require('./math.js').add;`,
  {
    type: metavm.MODULE_TYPE.COMMONJS,
    dirname: '/app',
    context: metavm.createContext({ console }),
    access: { './math.js': true },
    modules: {
      '/app/math.js': {
        source: `module.exports = { add: (a, b) => a + b };`,
      },
      '/app/config.json': { json: { enabled: true } },
      clock: { exports: { now: () => performance.now() } },
    },
  },
);
```

`modules` is also available on Node.js. A registry hit is used before the
filesystem. In the browser, a missing registry entry is `MODULE_NOT_FOUND`.
Resolution tries the exact virtual path, then `.js`, then `.json`. It does
not append `index.js`.

`readScript(url)` fetches only that entry script, then evaluates it with
`createScript()`. `disposeContext(context)` removes the hidden iframe; closures
created inside it may keep the realm alive.

Scripts use the same strict wrapper as Node.js. Assignments to context
bindings and `globalThis` properties are written back. A strict `var` binding
stays inside that evaluation in the browser and does not become a context
property; use `globalThis.name = value` for a new persistent global.

The page Content-Security-Policy must allow `eval`
(`script-src` including `'unsafe-eval'`). `timeout`, `microtaskMode`, and
`preventEscape` are rejected. The browser does not hide `eval` or `Function`:
replacing those iframe globals breaks ordinary `var` bindings, so this is not
equivalent to Node's `codeGeneration` restrictions. There is no ESM loader and
no Node.js built-in polyfill. Chromium and Firefox include the `//# sourceURL`
name in a runtime `Error.stack`. WebKit labels that frame `eval code` and does
not include the name.

| Behavior                            | Node.js         | Browser iframe               |
| ----------------------------------- | --------------- | ---------------------------- |
| `createScript` / callable `exports` | Synchronous     | Synchronous                  |
| Host function references            | Direct          | Direct, same-origin          |
| Context globals                     | V8 context      | Browser realm, including DOM |
| Hard execution timeout              | Supported       | Rejected                     |
| `codeGeneration` controls           | Enforced        | Not emulated                 |
| CommonJS files                      | Filesystem      | Preloaded `modules`          |
| `readScript`                        | Filesystem      | `fetch` for the entry only   |
| ESM                                 | Not implemented | Not implemented              |

## License & Contributors

Copyright (c) 2020-2026 [Metarhia contributors](https://github.com/metarhia/metavm/graphs/contributors).
Metavm is [MIT licensed](./LICENSE).\
Metavm is a part of [Metarhia](https://github.com/metarhia) technology stack.
