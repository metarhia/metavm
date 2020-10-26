/// <reference lib="dom" />

import { Context, Script, ScriptOptions } from 'vm';

interface DeclaredAPIs {
  Buffer: typeof Buffer;
  console: typeof console;
  queueMicrotask: typeof queueMicrotask;
  setTimeout: typeof setTimeout;
  setImmediate: typeof setImmediate;
  setInterval: typeof setInterval;
  clearTimeout: typeof clearTimeout;
  clearImmediate: typeof clearImmediate;
  clearInterval: typeof clearInterval;
  URL: typeof URL;
  URLSearchParams: typeof URLSearchParams;
  TextDecoder: typeof TextDecoder;
  TextEncoder: typeof TextEncoder;
}

interface MetaOptions extends ScriptOptions {
  context: Context;
}

export declare const EMPTY_CONTEXT: Readonly<{}>;

export declare const COMMON_CONTEXT: Readonly<DeclaredAPIs>;

export declare const createContext: (context: Record<string, any>) => Context;

export declare class MetaScript {
  public name: string;
  public script: Script;
  public context: Context;
  public exports: any;
  constructor(name: string, src: string, options?: MetaOptions);
}

export declare const createScript: (
  name: string,
  src: string,
  options?: MetaOptions
) => MetaScript;
