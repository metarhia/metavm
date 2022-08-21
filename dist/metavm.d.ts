export type Context =  { [k: string]: unknown & ({ bind?: never } | { call?: never }) };

export type ScriptOptions = { timeout: number, isWorker: boolean, context: Context };

export function createContext(
  context?: Context,
): Context;

export class MetaScript {
  constructor(name: string, src: string, options?: ScriptOptions);
  name: string;
  script: string;
  context: Context;
  exports: any;
}

export function createScript(
  name: string,
  src: string,
  options?: ScriptOptions,
): MetaScript;
