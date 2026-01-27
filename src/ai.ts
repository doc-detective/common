import { generateText, generateObject, jsonSchema } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider-v2";
import { z } from "zod";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { ensureModelAvailable, isOllamaAvailable, DEFAULT_OLLAMA_BASE_URL } from "./ollama";

export const DEFAULT_MODEL = "ollama/qwen3:4b";
export const MAX_SCHEMA_VALIDATION_RETRIES = 3;

/**
 * Maps our supported model enums to the model identifiers that platforms expect.
 */
export const modelMap: Record<string, string> = {
  // Anthropic models
  "anthropic/claude-haiku-4.5": "claude-haiku-4-5",
  "anthropic/claude-sonnet-4.5": "claude-sonnet-4-5",
  "anthropic/claude-opus-4.5": "claude-opus-4-5",
  // OpenAI models
  "openai/gpt-5.2": "gpt-5.2",
  "openai/gpt-5-mini": "gpt-5-mini",
  "openai/gpt-5-nano": "gpt-5-nano",
  // Google Gemini models
  "google/gemini-2.5-flash": "gemini-2.5-flash",
  "google/gemini-2.5-pro": "gemini-2.5-pro",
  "google/gemini-3-pro": "gemini-3-pro-preview",
  // Ollama models (text models that support standard chat API)
  "ollama/qwen3:4b": "qwen3:4b",
  "ollama/qwen3:8b": "qwen3:8b",
  "ollama/gemma3:4bq4": "gemma3:4b-it-q4_K_M",
  "ollama/gemma3:4bq8": "gemma3:4b-it-q8_0",
  "ollama/gemma3:12bq4": "gemma3:12b-it-q4_K_M",
  "ollama/gemma3:12bq8": "gemma3:12b-it-q8_0",
};

interface DetectedProvider {
  provider: "openai" | "anthropic" | "google" | "ollama" | null;
  model: string | null;
  apiKey?: string | null;
  baseURL?: string;
}

const getDefaultProvider = async (config: any = {}): Promise<DetectedProvider> => {
  const ollamaBaseUrl = config?.integrations?.ollama?.baseUrl;
  // Try to detect from environment variables if no model is provided
  if (process.env.ANTHROPIC_API_KEY || config.integrations?.anthropic) {
    return {
      provider: "anthropic",
      model: "claude-haiku-4-5",
      apiKey:
        process.env.ANTHROPIC_API_KEY || config.integrations.anthropic.apiKey,
    };
  } else if (process.env.OPENAI_API_KEY || config.integrations?.openAi) {
    return {
      provider: "openai",
      model: "gpt-5-mini",
      apiKey: process.env.OPENAI_API_KEY || config.integrations.openAi.apiKey,
    };
  } else if (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    config.integrations?.google
  ) {
    return {
      provider: "google",
      model: "gemini-2.5-flash",
      apiKey:
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        config.integrations.google.apiKey,
    };
  } else if (await isOllamaAvailable(ollamaBaseUrl)) {
    // Local, no API key needed
    return {
      provider: "ollama",
      model: modelMap["ollama/qwen3:4b"],
      apiKey: null,
      baseURL: ollamaBaseUrl || undefined,
    };
  } else {
    return { provider: null, model: null, apiKey: null };
  }
};

/**
 * Detects the provider, model, and API from a model string and environment variables.
 */
export const detectProvider = async (config: any, model: string): Promise<DetectedProvider> => {
  const detectedModel = modelMap[model] || null;
  if (!detectedModel) return getDefaultProvider(config);

  if (model.startsWith("ollama/")) {
    const ollamaBaseUrl =
      config.integrations?.ollama?.baseUrl || DEFAULT_OLLAMA_BASE_URL;
    await ensureModelAvailable({
      model: detectedModel,
      baseUrl: ollamaBaseUrl,
    });
    return {
      provider: "ollama",
      model: detectedModel,
      apiKey: null,
      baseURL: ollamaBaseUrl,
    };
  }

  if (
    model.startsWith("anthropic/") &&
    (process.env.ANTHROPIC_API_KEY || config.integrations?.anthropic)
  ) {
    const apiKey =
      process.env.ANTHROPIC_API_KEY || config.integrations.anthropic.apiKey;
    return { provider: "anthropic", model: detectedModel, apiKey };
  }

  if (
    model.startsWith("openai/") &&
    (process.env.OPENAI_API_KEY || config.integrations?.openAi)
  ) {
    const apiKey =
      process.env.OPENAI_API_KEY || config.integrations.openAi.apiKey;
    return { provider: "openai", model: detectedModel, apiKey };
  }

  if (
    model.startsWith("google/") &&
    (process.env.GOOGLE_GENERATIVE_AI_API_KEY || config.integrations?.google)
  ) {
    const apiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      config.integrations.google.apiKey;
    return { provider: "google", model: detectedModel, apiKey };
  }

  return { provider: null, model: null };
};

/**
 * Creates a provider instance based on the provider name.
 */
const createProvider = ({ provider, apiKey, baseURL }: { provider: string; apiKey?: string | null; baseURL?: string }) => {
  if (provider === "ollama") {
    const options: any = {};
    if (baseURL) options.baseURL = baseURL;
    return createOllama(options);
  }

  if (provider === "openai") {
    const options: any = {};
    if (apiKey) options.apiKey = apiKey;
    if (baseURL) options.baseURL = baseURL;
    return createOpenAI(options);
  }

  if (provider === "anthropic") {
    const options: any = {};
    if (apiKey) options.apiKey = apiKey;
    if (baseURL) options.baseURL = baseURL;
    return createAnthropic(options);
  }

  if (provider === "google") {
    const options: any = {};
    if (apiKey) options.apiKey = apiKey;
    if (baseURL) options.baseURL = baseURL;
    return createGoogleGenerativeAI(options);
  }

  throw new Error(`Unsupported provider: ${provider}`);
};

/**
 * Converts a file object to AI SDK image part format.
 */
const fileToImagePart = (file: any) => {
  if (file.type !== "image") {
    throw new Error(
      `Unsupported file type: ${file.type}. Only "image" is supported.`
    );
  }

  // Check if data is binary (Buffer or Uint8Array) - convert to base64
  // Note: The Ollama provider expects base64 strings, not raw binary
  if (Buffer.isBuffer(file.data) || file.data instanceof Uint8Array) {
    const base64Data = Buffer.isBuffer(file.data)
      ? file.data.toString("base64")
      : Buffer.from(file.data).toString("base64");
    return {
      type: "image",
      image: base64Data,
      mimeType: file.mimeType,
    };
  }

  // Check if data is a URL string
  if (
    typeof file.data === "string" &&
    (file.data.startsWith("http://") || file.data.startsWith("https://"))
  ) {
    return {
      type: "image",
      image: new URL(file.data),
    };
  }

  // Base64 string data
  return {
    type: "image",
    image: file.data,
    mimeType: file.mimeType,
  };
};

/**
 * Builds message content from prompt and files.
 */
const buildMessageContent = ({ prompt, files }: { prompt: string; files?: any[] }) => {
  if (!files || files.length === 0) {
    return prompt;
  }

  const parts: any[] = [];

  // Add text part
  parts.push({ type: "text", text: prompt });

  // Add file parts
  for (const file of files) {
    parts.push(fileToImagePart(file));
  }

  return parts;
};

/**
 * Checks if a schema is a Zod schema.
 */
const isZodSchema = (schema: any): schema is z.ZodSchema => {
  return schema && typeof schema.safeParse === "function";
};

/**
 * Validates an object against a Zod schema.
 */
const validateAgainstZodSchema = (object: any, schema: z.ZodSchema) => {
  const result = schema.safeParse(object);

  if (result.success) {
    return { valid: true, errors: null, object: result.data };
  }

  const errors = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");

  return { valid: false, errors, object };
};

/**
 * Validates an object against a JSON schema.
 */
const validateAgainstJsonSchema = (object: any, schema: any) => {
  const ajv = new Ajv({
    allErrors: true,
    useDefaults: true,
    coerceTypes: true,
    strict: false,
  });
  addFormats(ajv);

  const validate = ajv.compile(schema);
  const valid = validate(object);

  if (valid) {
    return { valid: true, errors: null, object };
  }

  const errors = validate.errors
    ?.map((error) => `${error.instancePath || "/"} ${error.message}`)
    .join(", ");

  return { valid: false, errors, object };
};

/**
 * Validates an object against a schema (Zod or JSON schema).
 */
const validateAgainstSchema = (object: any, schema: z.ZodSchema | any) => {
  if (isZodSchema(schema)) {
    return validateAgainstZodSchema(object, schema);
  }
  return validateAgainstJsonSchema(object, schema);
};

/**
 * Converts a schema to the format expected by the AI SDK.
 * Zod schemas are passed directly; JSON schemas are wrapped with jsonSchema().
 */
const toAiSdkSchema = (schema: z.ZodSchema | any) => {
  if (isZodSchema(schema)) {
    return schema;
  }
  return jsonSchema(schema);
};

/**
 * Dereferences $ref pointers in a schema by inlining the referenced schemas.
 * Supports both JSON Schema style (#/definitions/...) and OpenAPI style (#/components/schemas/...).
 */
const dereferenceSchema = (schema: any, rootSchema: any): any => {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  // Handle arrays
  if (Array.isArray(schema)) {
    return schema.map((item) => dereferenceSchema(item, rootSchema));
  }

  // Handle $ref
  if (schema.$ref) {
    const refPath = schema.$ref;
    let resolved: any = null;

    // Parse the reference path
    if (refPath.startsWith("#/")) {
      const pathParts = refPath.slice(2).split("/");
      resolved = rootSchema;
      for (const part of pathParts) {
        resolved = resolved?.[part];
        if (!resolved) break;
      }
    }

    if (resolved) {
      // Recursively dereference the resolved schema
      return dereferenceSchema(resolved, rootSchema);
    }
    // If we can't resolve, return an empty object
    return {};
  }

  // Recursively process all properties
  const result: any = {};
  for (const [key, value] of Object.entries(schema)) {
    if (typeof value === "object" && value !== null) {
      result[key] = dereferenceSchema(value, rootSchema);
    } else {
      result[key] = value;
    }
  }

  return result;
};

/**
 * Recursively simplifies a schema.
 */
const simplifySchemaRecursive = (schema: any, isTopLevel = false): any => {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  // Handle arrays
  if (Array.isArray(schema)) {
    return schema.map((item) => simplifySchemaRecursive(item, false));
  }

  const simplified: any = {};

  // Check if this is a top-level discriminated union (anyOf with action types)
  // These have anyOf where each option has allOf with a required action property
  const isDiscriminatedUnion =
    isTopLevel &&
    schema.anyOf &&
    Array.isArray(schema.anyOf) &&
    schema.anyOf.length > 1 &&
    schema.anyOf.every(
      (opt: any) =>
        opt.allOf ||
        (opt.required && opt.required.length === 1 && opt.properties)
    );

  for (const [key, value] of Object.entries(schema)) {
    // Skip unsupported keywords entirely
    if (
      [
        "$schema",
        "components",
        "examples",
        "dynamicDefaults",
        "transform",
        "not",
        "$id",
        "$ref",
        "definitions",
        "$defs",
        "pattern",
      ].includes(key)
    ) {
      continue;
    }

    // Handle top-level anyOf as discriminated union - merge ALL options
    if (key === "anyOf" && isDiscriminatedUnion) {
      // Merge all anyOf options into a single schema with all properties optional
      const mergedProperties: any = {};
      
      for (const option of (value as any[])) {
        const simplifiedOption = simplifySchemaRecursive(option, false);
        
        if (simplifiedOption.properties) {
          for (const [propKey, propValue] of Object.entries(simplifiedOption.properties)) {
            // Don't overwrite if we already have this property (first wins for common props)
            if (!mergedProperties[propKey]) {
              mergedProperties[propKey] = propValue;
            }
          }
        }
      }

      simplified.properties = {
        ...simplified.properties,
        ...mergedProperties,
      };
      // Don't set required - all action properties should be optional in the merged schema
      simplified.type = "object";
      continue;
    }

    // Handle nested anyOf/oneOf - prefer object types, simplify to single option
    if (key === "anyOf" || key === "oneOf") {
      const options = value as any[];
      
      // For nested anyOf, prefer object type schemas
      const objectOption = options.find(
        (opt) => opt.type === "object" || opt.properties
      );
      const selectedOption = objectOption || options[0];

      if (selectedOption) {
        // Merge the selected option into the parent
        const simplifiedOption = simplifySchemaRecursive(selectedOption, false);
        Object.assign(simplified, simplifiedOption);
      }
      continue;
    }

    // Handle allOf - merge all schemas together
    if (key === "allOf") {
      for (const subSchema of (value as any[])) {
        const simplifiedSub = simplifySchemaRecursive(subSchema, false);
        // Merge properties
        if (simplifiedSub.properties) {
          simplified.properties = {
            ...simplified.properties,
            ...simplifiedSub.properties,
          };
        }
        // Merge required arrays (but we'll clear required for discriminated unions later)
        if (simplifiedSub.required) {
          simplified.required = [
            ...new Set([
              ...(simplified.required || []),
              ...simplifiedSub.required,
            ]),
          ];
        }
        // Copy type if not set
        if (simplifiedSub.type && !simplified.type) {
          simplified.type = simplifiedSub.type;
        }
        // Copy other simple properties
        for (const [subKey, subValue] of Object.entries(simplifiedSub)) {
          if (!["properties", "required", "type"].includes(subKey)) {
            simplified[subKey] = subValue;
          }
        }
      }
      continue;
    }

    // Handle patternProperties - convert to additionalProperties
    if (key === "patternProperties") {
      // Use the first pattern's schema as additionalProperties
      const patterns = Object.values(value as any);
      if (patterns.length > 0) {
        simplified.additionalProperties = simplifySchemaRecursive(patterns[0], false);
      }
      continue;
    }

    // Recursively simplify nested objects
    if (key === "properties" && typeof value === "object") {
      simplified.properties = {};
      for (const [propKey, propValue] of Object.entries(value as any)) {
        simplified.properties[propKey] = simplifySchemaRecursive(propValue, false);
      }
      continue;
    }

    // Recursively simplify items in arrays
    if (key === "items") {
      simplified.items = simplifySchemaRecursive(value, false);
      continue;
    }

    // Recursively simplify additionalProperties
    if (key === "additionalProperties" && typeof value === "object") {
      simplified.additionalProperties = simplifySchemaRecursive(value, false);
      continue;
    }

    // Copy other properties as-is
    simplified[key] = value;
  }

  // Ensure type is set for objects with properties
  if (simplified.properties && !simplified.type) {
    simplified.type = "object";
  }

  return simplified;
};

/**
 * Simplifies a JSON schema for providers with limited schema support (e.g., Ollama).
 * - Dereferences $ref pointers
 * - Merges allOf schemas
 * - Converts top-level anyOf (discriminated unions) into a single object with all options as optional properties
 * - Simplifies nested anyOf by preferring object types
 * - Removes unsupported keywords like pattern, components, etc.
 */
export const simplifySchemaForOllama = (schema: any) => {
  // First, dereference any $ref pointers
  const dereferenced = dereferenceSchema(schema, schema);
  
  // Then simplify the dereferenced schema
  return simplifySchemaRecursive(dereferenced, true);
};

/**
 * Extracts the API key for a provider from a Doc Detective config object.
 */
export const getApiKey = (config: any, provider: "openai" | "anthropic" | "google") => {
  if (!config || !config.integrations) return undefined;

  if (
    provider === "anthropic" &&
    (process.env.ANTHROPIC_API_KEY || config.integrations.anthropic)
  ) {
    return (
      process.env.ANTHROPIC_API_KEY || config.integrations.anthropic.apiKey
    );
  }

  if (
    provider === "openai" &&
    (process.env.OPENAI_API_KEY || config.integrations.openAi)
  ) {
    return process.env.OPENAI_API_KEY || config.integrations.openAi.apiKey;
  }

  if (
    provider === "google" &&
    (process.env.GOOGLE_GENERATIVE_AI_API_KEY || config.integrations.google)
  ) {
    return (
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      config.integrations.google.apiKey
    );
  }

  return undefined;
};

/**
 * Generates structured output with schema validation and retry logic.
 */
const generateWithSchemaValidation = async ({
  generationOptions,
  schema,
  schemaName,
  schemaDescription,
  prompt,
  messages,
  provider,
}: {
  generationOptions: any;
  schema: z.ZodSchema | any;
  schemaName?: string;
  schemaDescription?: string;
  prompt?: string;
  messages?: any[];
  provider: string;
}) => {
  let lastError = null;
  let lastObject = null;
  let wrappedSchema = false;

  // Store the original schema for validation (before any simplification)
  const originalSchema = schema;

  // Simplify schema for Ollama which has limited JSON Schema support
  if (provider === "ollama" && !isZodSchema(schema)) {
    schema = simplifySchemaForOllama(schema);
  }

  // If JSON schema with allOf/anyOf/oneOf at the top level, wrap it in an object
  if (!isZodSchema(schema) && (schema.allOf || schema.anyOf || schema.oneOf)) {
    schema = {
      type: "object",
      properties: {
        object: schema,
      },
      required: ["object"],
      additionalProperties: false,
    };
    wrappedSchema = true;
  }

  // Convert schema to AI SDK format (wraps JSON schemas with jsonSchema())
  const aiSdkSchema = toAiSdkSchema(schema);

  for (let attempt = 1; attempt <= MAX_SCHEMA_VALIDATION_RETRIES; attempt++) {
    const objectOptions = {
      ...generationOptions,
      schema: aiSdkSchema,
    };

    if (schemaName) {
      objectOptions.schemaName = schemaName;
    }

    if (schemaDescription) {
      objectOptions.schemaDescription = schemaDescription;
    }

    // Add retry context if this is a retry attempt
    if (attempt > 1 && lastError) {
      const retryMessage = `Previous attempt failed schema validation with errors: ${lastError}. Please fix these issues and try again.`;

      if (objectOptions.messages) {
        // Add retry context to messages
        objectOptions.messages = [
          ...objectOptions.messages,
          { role: "assistant", content: JSON.stringify(lastObject) },
          { role: "user", content: retryMessage },
        ];
      } else if (typeof objectOptions.prompt === "string") {
        // Add retry context to prompt
        objectOptions.prompt = `${objectOptions.prompt}\n\n${retryMessage}`;
      }
    }

    try {
      const result = await generateObject(objectOptions);

      const validationObject = wrappedSchema
        ? (result.object as any).object
        : result.object;
      // Use original schema for validation (before Ollama simplification)
      // This ensures the output conforms to the full schema requirements
      const validation = validateAgainstSchema(
        validationObject,
        originalSchema
      );

      if (validation.valid) {
        return {
          object: validationObject,
          usage: result.usage,
          finishReason: result.finishReason,
        };
      }

      // Schema validation failed, store error for retry
      lastError = validation.errors;
      lastObject = validationObject;

      if (attempt === MAX_SCHEMA_VALIDATION_RETRIES) {
        throw new Error(
          `Schema validation failed after ${MAX_SCHEMA_VALIDATION_RETRIES} attempts. Last errors: ${validation.errors}`
        );
      }
    } catch (error: any) {
      // If it's our validation error and we have retries left, continue
      if (
        error.message.includes("Schema validation failed after") ||
        attempt === MAX_SCHEMA_VALIDATION_RETRIES
      ) {
        throw error;
      }

      // Store the error and retry
      lastError = error.message;
      lastObject = null;
    }
  }

  throw new Error(
    `Schema validation failed after ${MAX_SCHEMA_VALIDATION_RETRIES} attempts. Last errors: ${lastError}`
  );
};

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
export const generate = async ({
  prompt,
  messages,
  files,
  model,
  system,
  schema,
  schemaName,
  schemaDescription,
  provider,
  config = {},
  apiKey,
  baseURL,
  temperature,
  maxTokens,
}: GenerateOptions) => {
  // Validate required input
  if (!prompt && (!messages || messages.length === 0)) {
    throw new Error("Either 'prompt' or 'messages' is required.");
  }

  // Determine provider, model, and API key
  const detected = await detectProvider(config, model || DEFAULT_MODEL);

  if (!detected.provider) {
    throw new Error(
      `Cannot determine provider for model "${model}". Please specify a 'provider' option ("openai" or "anthropic").`
    );
  }

  // Create provider instance
  const providerFactory = createProvider({
    provider: detected.provider,
    apiKey: apiKey || detected.apiKey,
    baseURL: baseURL || detected.baseURL,
  });

  // Get model instance
  const modelInstance = providerFactory(detected.model!);

  // Build generation options
  const generationOptions: any = {
    model: modelInstance,
  };

  // Add system message if provided
  if (system) {
    generationOptions.system = system;
  }

  // Add temperature if provided
  if (temperature !== undefined) {
    generationOptions.temperature = temperature;
  }

  // Add maxTokens if provided
  if (maxTokens !== undefined) {
    generationOptions.maxTokens = maxTokens;
  }

  // Build messages or prompt
  if (messages && messages.length > 0) {
    // Find the index of the last user message
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIndex = i;
        break;
      }
    }

    // Use messages array, attaching files only to the last user message
    generationOptions.messages = messages.map((msg: any, index: number) => {
      if (index === lastUserIndex && files && files.length > 0) {
        return {
          ...msg,
          content: buildMessageContent({ prompt: msg.content, files }),
        };
      }
      return msg;
    });
  } else if (files && files.length > 0) {
    // When files are provided, we must use messages format for multimodal content
    generationOptions.messages = [
      {
        role: "user",
        content: buildMessageContent({ prompt: prompt!, files }),
      },
    ];
  } else {
    // Use simple prompt for text-only requests
    generationOptions.prompt = prompt;
  }

  // Handle structured output with schema
  if (schema) {
    return generateWithSchemaValidation({
      generationOptions,
      schema,
      schemaName,
      schemaDescription,
      prompt,
      messages,
      provider: detected.provider,
    });
  }

  // Generate text
  const result = await generateText(generationOptions);

  return {
    text: result.text,
    usage: result.usage,
    finishReason: result.finishReason,
  };
};
