import { Context, Script, ScriptOptions } from 'node:vm';

export const EMPTY_CONTEXT: Context;
export const EMPTY_CJS: Context;
export const COMMON_CONTEXT: Context;
export const NODE_CONTEXT: Context;

export class MetavmError extends Error {}

export function createContext(
  context?: Context,
  preventEscape?: boolean,
): Context;

export enum MODULE_TYPE {
  AUTO = 0,
  METARHIA = 1,
  COMMONJS = 2,
  ECMA = 3,
}

export interface MetaScriptOptions extends ScriptOptions {
  type?: MODULE_TYPE;
  dirname?: string;
  relative?: string;
  context?: Context;
  access?: Record<string, boolean | object>;
}

export class MetaScript {
  constructor(name: string, src: string, options?: MetaScriptOptions);
  name: string;
  dirname: string;
  relative: string;
  type: MODULE_TYPE;
  access: Record<string, boolean | object>;
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
  options?: MetaScriptOptions,
): Promise<MetaScript>;
