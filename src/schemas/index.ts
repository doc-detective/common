import schemasJson from "./schemas.json";

// Type definition for JSON schemas
export type JsonSchema = {
  $schema?: string;
  title?: string;
  description?: string;
  type?: string;
  properties?: Record<string, unknown>;
  examples?: unknown[];
  [key: string]: unknown;
};

// Export the JSON schemas with explicit type
export const schemas: Record<string, JsonSchema> = schemasJson;
