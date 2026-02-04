export { schemas, SchemaKey, Schema } from "./schemas";
export { validate, transformToSchemaKey, ValidateOptions, ValidateResult, TransformOptions } from "./validate";
export { detectTests, DetectTestsInput, DetectedTest, DetectTestsConfig, FileType } from "./detectTests";

// Note: The following exports will be deprecated and moved to Core in Phase 1
// They are kept temporarily for backwards compatibility
export { resolvePaths, ResolvePathsOptions } from "./resolvePaths";
export { readFile, ReadFileOptions } from "./files";
export { parseContent, parseXmlAttributes, parseObject, replaceNumericVariables, log } from "./detectTests";
