'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const tsc = path.join(root, 'node_modules/typescript/bin/tsc');

const linkedProject = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'metavm-'));
  fs.mkdirSync(path.join(dir, 'node_modules'));
  fs.symlinkSync(root, path.join(dir, 'node_modules/metavm'));
  return dir;
};

test('package exports resolve on Node.js', () => {
  const dir = linkedProject();
  fs.writeFileSync(
    path.join(dir, 'main.js'),
    `const metavm = require('metavm');
const script = metavm.createScript('Add', '(a, b) => a + b');
if (script.exports(2, 3) !== 5) process.exit(1);
`,
  );
  const result = spawnSync(process.execPath, ['main.js'], {
    cwd: dir,
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0, result.stderr);
});

test('browser condition loads the browser entry', () => {
  const dir = linkedProject();
  const result = spawnSync(
    process.execPath,
    [
      '--conditions=browser',
      '--input-type=module',
      '-e',
      `import * as metavm from 'metavm';
if (typeof metavm.createScript !== 'function') process.exit(1);
if (typeof metavm.disposeContext !== 'function') process.exit(1);
`,
    ],
    { cwd: dir, encoding: 'utf8' },
  );
  assert.strictEqual(result.status, 0, result.stderr);
});

test('TypeScript resolves node and browser conditions', () => {
  const dir = linkedProject();
  fs.writeFileSync(
    path.join(dir, 'node.ts'),
    `import { NODE_CONTEXT, createScript } from 'metavm';
createScript('Add', '(a, b) => a + b');
void NODE_CONTEXT;
`,
  );
  fs.writeFileSync(
    path.join(dir, 'browser.ts'),
    `import { createScript, disposeContext } from 'metavm';
const script = createScript<(a: number, b: number) => number>(
  'Add',
  '(a, b) => a + b',
);
script.exports(2, 3);
disposeContext({});
`,
  );
  const nodeConfig = {
    compilerOptions: {
      module: 'nodenext',
      moduleResolution: 'nodenext',
      strict: true,
      noEmit: true,
      types: ['node'],
      typeRoots: [path.join(root, 'node_modules/@types')],
    },
    files: ['node.ts'],
  };
  const browserConfig = {
    compilerOptions: {
      module: 'ESNext',
      moduleResolution: 'bundler',
      customConditions: ['browser'],
      strict: true,
      noEmit: true,
      types: [],
    },
    files: ['browser.ts'],
  };
  const node16 = {
    ...nodeConfig,
    compilerOptions: {
      ...nodeConfig.compilerOptions,
      module: 'node16',
      moduleResolution: 'node16',
    },
  };
  for (const config of [nodeConfig, node16, browserConfig]) {
    const file = path.join(dir, 'tsconfig.json');
    fs.writeFileSync(file, JSON.stringify(config));
    const result = spawnSync(process.execPath, [tsc, '-p', file], {
      cwd: dir,
      encoding: 'utf8',
    });
    assert.strictEqual(result.status, 0, result.stdout + result.stderr);
  }
});
