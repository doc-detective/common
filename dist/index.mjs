// ESM wrapper for CommonJS output
import cjsModule from './index.js';
export const { schemas, validate, transformToSchemaKey, detectTests, parseContent, parseXmlAttributes, parseObject, replaceNumericVariables, log, resolvePaths, readFile } = cjsModule;
export default cjsModule;
