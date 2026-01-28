import { z } from "zod";
export declare const DEFAULT_MODEL = "ollama/qwen3:4b";
export declare const MAX_SCHEMA_VALIDATION_RETRIES = 3;
/**
 * Maps our supported model enums to the model identifiers that platforms expect.
 */
export declare const modelMap: Record<string, string>;
interface DetectedProvider {
    provider: "openai" | "anthropic" | "google" | "ollama" | null;
    model: string | null;
    apiKey?: string | null;
    baseURL?: string;
}
/**
 * Detects the provider, model, and API from a model string and environment variables.
 */
export declare const detectProvider: (config: any, model: string) => Promise<DetectedProvider>;
/**
 * Simplifies a JSON schema for providers with limited schema support (e.g., Ollama).
 * - Dereferences $ref pointers
 * - Merges allOf schemas
 * - Converts top-level anyOf (discriminated unions) into a single object with all options as optional properties
 * - Simplifies nested anyOf by preferring object types
 * - Removes unsupported keywords like pattern, components, etc.
 */
export declare const simplifySchemaForOllama: (schema: any) => any;
/**
 * Extracts the API key for a provider from a Doc Detective config object.
 */
export declare const getApiKey: (config: any, provider: "openai" | "anthropic" | "google") => any;
export interface GenerateOptions {
    prompt?: string;
    messages?: any[];
    files?: any[];
    model?: string;
    system?: string;
    schema?: z.ZodSchema | any;
    schemaName?: string;
    schemaDescription?: string;
    provider?: "openai" | "anthropic" | "ollama" | "google";
    config?: any;
    apiKey?: string;
    baseURL?: string;
    temperature?: number;
    maxTokens?: number;
}
/**
 * Generates text or structured output using an AI model.
 */
export declare const generate: ({ prompt, messages, files, model, system, schema, schemaName, schemaDescription, provider, config, apiKey, baseURL, temperature, maxTokens, }: GenerateOptions) => Promise<{
    object: any;
    usage: import("ai").LanguageModelUsage;
    finishReason: import("ai").FinishReason;
} | {
    text: string;
    usage: import("ai").LanguageModelUsage;
    finishReason: import("ai").FinishReason;
}>;
export {};
//# sourceMappingURL=ai.d.ts.map