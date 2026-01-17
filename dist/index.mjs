// ESM wrapper for CommonJS output
import cjsModule from './index.js';
export const { schemas, validate, transformToSchemaKey, resolvePaths, readFile } = cjsModule;
export default cjsModule;
