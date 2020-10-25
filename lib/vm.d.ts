/// <reference lib="dom" />
import vm from 'vm';

export declare const EMPTY_CONTEXT: Readonly<{}>;
type VMCtxNodeKeys =
  | 'Buffer'
  | 'console'
  | 'queueMicrotask'
  | 'setTimeout'
  | 'setImmediate'
  | 'setInterval'
  | 'clearTimeout'
  | 'clearImmediate'
  | 'clearInterval';

type VMContextNodeTypes = {
  [key in VMCtxNodeKeys]: NodeJS.Global[key];
};

type VMContextLibDOMTypes = {
  URL: URL;
  URLSearchParams: URLSearchParams;
  TextDecoder: TextDecoder;
  TextEncoder: TextEncoder;
};

export declare const COMMON_CONTEXT: Readonly<
  VMContextLibDOMTypes & VMContextNodeTypes
>;

export declare const createContext: (
  context: Record<string, any>
) => vm.Context;

export declare class MetaScript {
  public name: string;
  public script: vm.Script;
  public context: vm.Context;
  public exports: any;
  constructor(
    name: string,
    src: string,
    options?: vm.ScriptOptions & { context: vm.Context }
  );
}

export declare const createScript: (
  name: string,
  src: string,
  options?: vm.ScriptOptions & { context: vm.Context }
) => MetaScript;
