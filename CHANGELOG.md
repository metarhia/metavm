# Changelog

## [Unreleased][unreleased]

## [1.4.0][] - 2023-10-25

- Add fetch to default global
- Move to native node.js test runner
- Support node.js 21

## [1.3.0][] - 2023-10-09

- Support new globals for node.js 18 and 20
- Drop node.js 16 and 19

## [1.2.6][] - 2023-07-31

- Classes added to COMMON_CONTEXT: AbortController, Event, EventTarget,
  MessageChannel, MessageEvent, MessagePort
- Added NODE_CONTEXT with: global, console, process and everything from
  COMMON_CONTEXT

## [1.2.5][] - 2023-04-29

- Drop node.js 14 support, add node.js 20
- Convert package_lock.json to lockfileVersion 2
- Update dependencies

## [1.2.4][] - 2023-03-10

- Fix 1 line shift in stack traces

## [1.2.3][] - 2023-02-19

- Add `node:` prefix in require for built-in modules

## [1.2.2][] - 2022-11-16

- Using optional chaining operator
- Package maintenance

## [1.2.1][] - 2022-07-07

- Support local identifiers

## [1.2.0][] - 2022-05-18

- Implement metarequire and require nesting
- Support permissions for node.js modules including internal and npm modules
- Update dependencies and apply security fixes
- Security: prevent eval, update timeout, other context and script options

## [1.1.0][] - 2022-03-15

- Move everything into a single file
- Update dependencies

## [1.0.3][] - 2021-07-19

- Throw SyntaxError on empty files
- Allow optional context
- Move types to package root
- Package maintenance: update dependencies, update engines

## [1.0.2][] - 2021-05-13

- Update dependencies and fix security alert

## [1.0.1][] - 2021-04-13

- Add .d.ts typings

## [1.0.0][] - 2020-12-17

- Add security policy and config for editors
- Remove node.js 13.x support, add 15.x to CI

## [0.2.0][] - 2020-11-30

- Add sandboxed context parameter preventEscape
- Update contributing templates
- Add changelog, and other chore stuff
- Apply prettier and fix code style

## [0.1.0][] - 2020-10-02

First metavm implementation with following features

- Script class with context isolation (sandboxing) for node.js
- Loader script from file with timeout and error handling
- Add `use strict` if it's not found, fix line offset
- Contexts, use default empty and frozen, emulated or pass one
- Use `microtaskMode` https://github.com/nodejs/node/pull/34023

[unreleased]: https://github.com/metarhia/metavm/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/metarhia/metavm/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/metarhia/metavm/compare/v1.2.6...v1.3.0
[1.2.6]: https://github.com/metarhia/metavm/compare/v1.2.5...v1.2.6
[1.2.5]: https://github.com/metarhia/metavm/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/metarhia/metavm/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/metarhia/metavm/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/metarhia/metavm/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/metarhia/metavm/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/metarhia/metavm/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/metarhia/metavm/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/metarhia/metavm/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/metarhia/metavm/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/metarhia/metavm/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/metarhia/metavm/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/metarhia/metavm/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/metarhia/metavm/releases/tag/v0.1.0
