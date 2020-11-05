import { BaseOptions } from 'vm';
import { MetaScript } from './vm';

export function readScript(
  filePath: string,
  options?: Pick<BaseOptions, 'filename'>
): Promise<MetaScript>;
