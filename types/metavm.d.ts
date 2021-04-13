import { Context, Script, ScriptOptions, BaseOptions } from 'vm';

export const EMPTY_CONTEXT: Context;
export const COMMON_CONTEXT: Context;

export function createContext(
  context: Context,
  preventEscape?: boolean
): Context;

export interface MetaScriptOptions extends ScriptOptions {
  context: Context;
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
  options?: MetaScriptOptions
): MetaScript;

export function readScript(
  filePath: string,
  options?: BaseOptions
): Promise<MetaScript>;
