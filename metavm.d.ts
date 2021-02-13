import * as vm from 'vm';

export const createContext: (
  context?: vm.Context,
  preventEscape?: boolean
) => vm.Context;

export interface MetaScriptOptions
  extends Omit<vm.ScriptOptions, 'filename' | 'lineOffset'> {
  context: vm.Context;
}

export class MetaScript {
  name: string;
  script: vm.Script;
  context: vm.Context;
  exports: any;
  constructor(name: string, src: string, options?: MetaScriptOptions);
}

export const createScript: (
  name: string,
  src: string,
  options?: MetaScriptOptions
) => MetaScript;

export const EMPTY_CONTEXT: vm.Context;
export const COMMON_CONTEXT: vm.Context;

export interface ReadScriptOptions
  extends Omit<vm.ScriptOptions, 'lineOffset'> {
  context?: vm.Context;
}

export const readScript: (
  filePath: string,
  options?: ReadScriptOptions
) => Promise<MetaScript>;
