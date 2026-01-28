const { generateText, generateObject, jsonSchema } = require("ai");
const { createOpenAI } = require("@ai-sdk/openai");
const { createAnthropic } = require("@ai-sdk/anthropic");
const { createGoogleGenerativeAI } = require("@ai-sdk/google");
const { createOllama } = require("ollama-ai-provider-v2");
const { z } = require("zod");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const { ensureModelAvailable, isOllamaAvailable, DEFAULT_OLLAMA_BASE_URL } = require("./ollama");

const DEFAULT_MODEL = "ollama/qwen3:4b";
const MAX_SCHEMA_VALIDATION_RETRIES = 3;

/**
 * Maps our supported model enums to the model identifiers that platforms expect.
 */
const modelMap = {
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

const getDefaultProvider = async (config = {}) => {
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
 * @param {Object} config - The Doc Detective configuration object.
 * @param {string} model - The model identifier.
 * @returns {Promise<{ provider: "openai" | "anthropic" | "ollama" | null, model: string | null, apiKey: string | null, baseURL?: string }>} The detected provider, model, and API key.
 */
const detectProvider = async (config, model) => {
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
 * @param {Object} options
 * @param {"openai" | "anthropic" | "ollama"} options.provider - The provider name.
 * @param {string} [options.apiKey] - Optional API key override.
 * @param {string} [options.baseURL] - Optional base URL override.
 * @returns {Function} The provider factory function.
 */
const createProvider = ({ provider, apiKey, baseURL }) => {
  if (provider === "ollama") {
    const options = {};
    if (baseURL) options.baseURL = baseURL;
    return createOllama(options);
  }

  if (provider === "openai") {
    const options = {};
    if (apiKey) options.apiKey = apiKey;
    if (baseURL) options.baseURL = baseURL;
    return createOpenAI(options);
  }

  if (provider === "anthropic") {
    const options = {};
    if (apiKey) options.apiKey = apiKey;
    if (baseURL) options.baseURL = baseURL;
    return createAnthropic(options);
  }

  if (provider === "google") {
    const options = {};
    if (apiKey) options.apiKey = apiKey;
    if (baseURL) options.baseURL = baseURL;
    return createGoogleGenerativeAI(options);
  }

  throw new Error(`Unsupported provider: ${provider}`);
};

/**
 * Converts a file object to AI SDK image part format.
 * @param {Object} file - The file object.
 * @param {string} file.type - The file type (e.g., "image").
 * @param {string | Buffer | Uint8Array} file.data - Base64 string, URL, Buffer, or Uint8Array.
 * @param {string} [file.mimeType] - The MIME type (e.g., "image/png").
 * @returns {Object} The AI SDK image part.
 */
const fileToImagePart = (file) => {
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
 * @param {Object} options
 * @param {string} options.prompt - The text prompt.
 * @param {Array} [options.files] - Optional array of file objects.
 * @returns {string | Array} The message content.
 */
const buildMessageContent = ({ prompt, files }) => {
  if (!files || files.length === 0) {
    return prompt;
  }

  const parts = [];

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
 * @param {Object} schema - The schema to check.
 * @returns {boolean} True if the schema is a Zod schema.
 */
const isZodSchema = (schema) => {
  return schema && typeof schema.safeParse === "function";
};

/**
 * Validates an object against a Zod schema.
 * @param {Object} object - The object to validate.
 * @param {z.ZodSchema} schema - The Zod schema.
 * @returns {{ valid: boolean, errors: string | null, object: Object }} Validation result.
 */
const validateAgainstZodSchema = (object, schema) => {
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
 * @param {Object} object - The object to validate.
 * @param {Object} schema - The JSON schema.
 * @returns {{ valid: boolean, errors: string | null, object: Object }} Validation result.
 */
const validateAgainstJsonSchema = (object, schema) => {
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
    .map((error) => `${error.instancePath || "/"} ${error.message}`)
    .join(", ");

  return { valid: false, errors, object };
};

/**
 * Validates an object against a schema (Zod or JSON schema).
 * @param {Object} object - The object to validate.
 * @param {z.ZodSchema | Object} schema - The Zod or JSON schema.
 * @returns {{ valid: boolean, errors: string | null, object: Object }} Validation result.
 */
const validateAgainstSchema = (object, schema) => {
  if (isZodSchema(schema)) {
    return validateAgainstZodSchema(object, schema);
  }
  return validateAgainstJsonSchema(object, schema);
};

/**
 * Converts a schema to the format expected by the AI SDK.
 * Zod schemas are passed directly; JSON schemas are wrapped with jsonSchema().
 * @param {z.ZodSchema | Object} schema - The Zod or JSON schema.
 * @returns {Object} The schema in AI SDK format.
 */
const toAiSdkSchema = (schema) => {
  if (isZodSchema(schema)) {
    return schema;
  }
  return jsonSchema(schema);
};

/**
 * Dereferences $ref pointers in a schema by inlining the referenced schemas.
 * Supports both JSON Schema style (#/definitions/...) and OpenAPI style (#/components/schemas/...).
 * @param {Object} schema - The schema to dereference.
 * @param {Object} rootSchema - The root schema containing definitions/components.
 * @returns {Object} The dereferenced schema.
 */
const dereferenceSchema = (schema, rootSchema) => {
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
    let resolved = null;

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
  const result = {};
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
 * Simplifies a JSON schema for providers with limited schema support (e.g., Ollama).
 * - Dereferences $ref pointers
 * - Merges allOf schemas
 * - Converts top-level anyOf (discriminated unions) into a single object with all options as optional properties
 * - Simplifies nested anyOf by preferring object types
 * - Removes unsupported keywords like pattern, components, etc.
 * @param {Object} schema - The JSON schema to simplify.
 * @returns {Object} A simplified schema compatible with basic JSON schema support.
 */
const simplifySchemaForOllama = (schema) => {
  // First, dereference any $ref pointers
  const dereferenced = dereferenceSchema(schema, schema);
  
  // Then simplify the dereferenced schema
  return simplifySchemaRecursive(dereferenced, true);
};

/**
 * Recursively simplifies a schema.
 * @param {Object} schema - The schema to simplify.
 * @param {boolean} isTopLevel - Whether this is the top-level schema (affects anyOf handling).
 * @returns {Object} The simplified schema.
 */
const simplifySchemaRecursive = (schema, isTopLevel = false) => {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  // Handle arrays
  if (Array.isArray(schema)) {
    return schema.map((item) => simplifySchemaRecursive(item, false));
  }

  const simplified = {};

  // Check if this is a top-level discriminated union (anyOf with action types)
  // These have anyOf where each option has allOf with a required action property
  const isDiscriminatedUnion =
    isTopLevel &&
    schema.anyOf &&
    Array.isArray(schema.anyOf) &&
    schema.anyOf.length > 1 &&
    schema.anyOf.every(
      (opt) =>
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
      const mergedProperties = {};
      
      for (const option of value) {
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
      const options = value;
      
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
      for (const subSchema of value) {
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
      const patterns = Object.values(value);
      if (patterns.length > 0) {
        simplified.additionalProperties = simplifySchemaRecursive(patterns[0], false);
      }
      continue;
    }

    // Recursively simplify nested objects
    if (key === "properties" && typeof value === "object") {
      simplified.properties = {};
      for (const [propKey, propValue] of Object.entries(value)) {
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
 * Extracts the API key for a provider from a Doc Detective config object.
 * @param {Object} config - The Doc Detective configuration object.
 * @param {"openai" | "anthropic"} provider - The provider name.
 * @returns {string | undefined} The API key if found.
 */
const getApiKey = (config, provider) => {
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
 * Generates text or structured output using an AI model.
 *
 * @param {Object} options - Generation options.
 * @param {string} [options.prompt] - The text prompt (required if messages not provided).
 * @param {Array} [options.messages] - Array of messages for multi-turn conversation.
 * @param {Array} [options.files] - Array of file objects to include (e.g., images).
 * @param {string} [options.files[].type] - File type ("image").
 * @param {string} [options.files[].data] - Base64 data or URL.
 * @param {string} [options.files[].mimeType] - MIME type (e.g., "image/png").
 * @param {string} [options.model] - Model identifier (default: "anthropic/claude-haiku-4.5").
 * @param {string} [options.system] - System message.
 * @param {z.ZodSchema | Object} [options.schema] - Zod schema or JSON schema for structured output.
 * @param {string} [options.schemaName] - Name for the schema (used in API calls).
 * @param {string} [options.schemaDescription] - Description for the schema.
 * @param {"openai" | "anthropic"} [options.provider] - Explicit provider override.
 * @param {Object} [options.config] - Doc Detective config object with integrations.anthropic/openai API keys.
 * @param {string} [options.apiKey] - API key override (takes precedence over config and env vars).
 * @param {string} [options.baseURL] - Base URL override for the provider.
 * @param {number} [options.temperature] - Temperature for generation.
 * @param {number} [options.maxTokens] - Maximum tokens to generate.
 * @returns {Promise<Object>} Generation result.
 * @returns {string} [result.text] - Generated text (when no schema provided).
 * @returns {Object} [result.object] - Generated object (when schema provided).
 * @returns {Object} result.usage - Token usage information.
 * @returns {string} result.finishReason - Why generation stopped.
 *
 * @throws {Error} If prompt/messages is missing or provider cannot be determined.
 */
const generate = async ({
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
}) => {
  // Validate required input
  if (!prompt && (!messages || messages.length === 0)) {
    throw new Error("Either 'prompt' or 'messages' is required.");
  }

  // Determine provider, model, and API key
  const detected = await detectProvider(config, model);

  if (!detected.provider) {
    throw new Error(
      `Cannot determine provider for model "${model}". Please specify a 'provider' option ("openai" or "anthropic").`
    );
  }

  // Create provider instance
  const providerFactory = createProvider({
    provider: detected.provider,
    apiKey: detected.apiKey,
    baseURL: baseURL || detected.baseURL,
  });

  // Get model instance
  const modelInstance = providerFactory(detected.model);

  // Build generation options
  const generationOptions = {
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
    const lastUserIndex = messages.findLastIndex((msg) => msg.role === "user");

    // Use messages array, attaching files only to the last user message
    generationOptions.messages = messages.map((msg, index) => {
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
        content: buildMessageContent({ prompt, files }),
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

/**
 * Generates structured output with schema validation and retry logic.
 * @param {Object} options
 * @param {Object} options.generationOptions - AI SDK generation options.
 * @param {z.ZodSchema | Object} options.schema - Zod schema or JSON schema for validation.
 * @param {string} [options.schemaName] - Name for the schema.
 * @param {string} [options.schemaDescription] - Description for the schema.
 * @param {string} [options.prompt] - Original prompt for retry context.
 * @param {Array} [options.messages] - Original messages for retry context.
 * @param {string} [options.provider] - The provider being used (e.g., "ollama", "anthropic").
 * @returns {Promise<Object>} Generation result with validated object.
 */
const generateWithSchemaValidation = async ({
  generationOptions,
  schema,
  schemaName,
  schemaDescription,
  prompt,
  messages,
  provider,
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
        ? result.object.object
        : result.object;
      // Use original schema for validation (before Ollama simplification)
      // This ensures the output conforms to the full schema requirements
      const validationSchema = originalSchema;

      // Validate the generated object against the schema ourselves
      const validation = validateAgainstSchema(
        validationObject,
        validationSchema
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
    } catch (error) {
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

module.exports = {
  generate,
  detectProvider,
  getApiKey,
  modelMap,
  DEFAULT_MODEL,
  MAX_SCHEMA_VALIDATION_RETRIES,
  simplifySchemaForOllama,
};
