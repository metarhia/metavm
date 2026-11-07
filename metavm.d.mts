export const EMPTY_CONTEXT: Context;
export const EMPTY_CJS: Context;
export const COMMON_CONTEXT: Context;

export type Context = object;

export type MetavmErrorCode =
  | 'ESM_NOT_SUPPORTED'
  | 'ACCESS_DENIED'
  | 'MODULE_NOT_FOUND'
  | 'OPTION_NOT_SUPPORTED'
  | 'EVAL_DISALLOWED'
  | 'CONTEXT_DISPOSED';

export const ERROR_CODE: { readonly [K in MetavmErrorCode]: K };

export class MetavmError extends Error {
  code?: MetavmErrorCode;
  constructor(message: string, code?: MetavmErrorCode);
}

export function createContext(
  context?: Context,
  preventEscape?: boolean,
): Context;

export function disposeContext(context: Context): void;

export function runInContext(context: Context, source: string): unknown;

export enum MODULE_TYPE {
  AUTO = 0,
  METARHIA = 1,
  COMMONJS = 2,
  ECMA = 3,
}

export interface VirtualModule {
  type?: MODULE_TYPE;
  source?: string;
  json?: unknown;
  exports?: unknown;
}

export interface BrowserScript {
  filename: string;
  sourceURL: string;
}

export interface MetaScriptOptions {
  type?: MODULE_TYPE;
  dirname?: string;
  relative?: string;
  filename?: string;
  context?: Context;
  access?: Record<string, boolean | object>;
  modules?: Record<string, VirtualModule>;
}

export class MetaScript<Exports = unknown> {
  constructor(name: string, src: string, options?: MetaScriptOptions);
  name: string;
  dirname: string;
  relative: string;
  type: MODULE_TYPE;
  access: Record<string, boolean | object>;
  script: BrowserScript;
  context: Context;
  exports: Exports;
}

export function createScript<Exports = unknown>(
  name: string,
  src: string,
  options?: MetaScriptOptions,
): MetaScript<Exports>;

export function readScript<Exports = unknown>(
  url: string,
  options?: MetaScriptOptions,
): Promise<MetaScript<Exports>>;
