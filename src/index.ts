import { schemas } from "./schemas";
import { validate, transformToSchemaKey } from "./validate";
import { resolvePaths } from "./resolvePaths";
import { readFile } from "./files";

// Re-export Zod schemas and types
export * from "./zodSchemas";

// Export main functionality
export {
  schemas,
  validate,
  resolvePaths,
  readFile,
  transformToSchemaKey,
};
