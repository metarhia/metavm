import { Context, Script, ScriptOptions, BaseOptions } from 'node:vm';

export const EMPTY_CONTEXT: Context;
export const COMMON_CONTEXT: Context;
export const NODE_CONTEXT: Context;

export class MetavmError extends Error {}

export function createContext(
  context?: Context,
  preventEscape?: boolean,
): Context;

declare enum ModuleType {
  METARHIA = 1,
  COMMONJS = 2,
}

export interface MetaScriptOptions extends ScriptOptions {
  type?: ModuleType;
  dirname?: string;
  relative?: string;
  context?: Context;
  access?: object;
}

export class MetaScript {
  constructor(name: string, src: string, options?: MetaScriptOptions);
  name: string;
  script: Script;
  context: Context;
  exports: any;
}

export function createScript(
  name: string,
  src: string,
  options?: MetaScriptOptions,
): MetaScript;

export function readScript(
  filePath: string,
  options?: BaseOptions,
): Promise<MetaScript>;
