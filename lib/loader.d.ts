import { BaseOptions } from 'vm';
import { MetaScript } from './vm';

export declare const readScript: (
  filePath: string,
  options?: Pick<BaseOptions, 'filename'>
) => Promise<MetaScript>;
