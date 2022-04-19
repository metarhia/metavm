# Changelog

## [Unreleased][unreleased]

- Implement metarequire and require nesting
- Support permissions for node.js modules (including internal but not for npm)
- Update dependencies and apply security fixes

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

[unreleased]: https://github.com/metarhia/metavm/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/metarhia/metavm/compare/v1.0.3...v1.1.0
[1.0.3]: https://github.com/metarhia/metavm/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/metarhia/metavm/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/metarhia/metavm/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/metarhia/metavm/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/metarhia/metavm/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/metarhia/metavm/releases/tag/v0.1.0
