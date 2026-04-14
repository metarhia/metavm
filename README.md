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

## ECMAScript Modules (ESM) - Experimental

ESM support is available but requires running Node.js with the `--experimental-vm-modules` flag:

```bash
node --experimental-vm-modules your-script.js
```

Example:

```js
const metavm = require('metavm');

// Load ESM from file
const ms = await metavm.readScript('./examples/esm/simple.mjs', {
  type: metavm.MODULE_TYPE.ECMA,
});
console.log(ms.exports);
// { field: 'value', add: [Function], sub: [Function] }

// Create ESM from string
const src = `const fn = x => x * 2; export { fn };`;
const script = await metavm.createScript('Example', src, {
  type: metavm.MODULE_TYPE.ECMA,
});
console.log(script.exports.fn(5)); // 10
```

**Note:** Without the experimental flag, attempting to use ESM will throw an error:
`ECMAScript modules require --experimental-vm-modules flag`

### Limitations

- ESM import statements are not yet fully supported
- Requires Node.js to be run with `--experimental-vm-modules` flag
- The API may change as Node.js stabilizes vm module ESM support

## License & Contributors

Copyright (c) 2020-2025 [Metarhia contributors](https://github.com/metarhia/metavm/graphs/contributors).
Metavm is [MIT licensed](./LICENSE).\
Metavm is a part of [Metarhia](https://github.com/metarhia) technology stack.
