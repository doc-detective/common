import { schemas as jsonSchemas } from "./schemas";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import addKeywords from "ajv-keywords";
import addErrors from "ajv-errors";
import { randomUUID } from "crypto";

// Re-export Zod schemas for type inference
export * from "./zodSchemas";

// Configure base Ajv for backward compatibility with v2 schemas
const ajv = new Ajv({
  strictSchema: false,
  useDefaults: true,
  allErrors: true,
  allowUnionTypes: true,
  coerceTypes: true,
});

// Enable `uuid` dynamic default
const def = require("ajv-keywords/dist/definitions/dynamicDefaults");
def.DEFAULTS.uuid = () => randomUUID;

// Enhance Ajv
addFormats(ajv);
addKeywords(ajv);
addErrors(ajv);

// Add all JSON schemas from `schema` object for backward compatibility
for (const [key, value] of Object.entries(jsonSchemas)) {
  ajv.addSchema(value, key);
}

// Map of compatible schemas for backward compatibility transformations
const compatibleSchemas: Record<string, string[]> = {
  config_v3: ["config_v2"],
  context_v3: ["context_v2"],
  openApi_v3: ["openApi_v2"],
  spec_v3: ["spec_v2"],
  step_v3: [
    "checkLink_v2",
    "find_v2",
    "goTo_v2",
    "httpRequest_v2",
    "runShell_v2",
    "runCode_v2",
    "saveScreenshot_v2",
    "setVariables_v2",
    "startRecording_v2",
    "stopRecording_v2",
    "typeKeys_v2",
    "wait_v2",
  ],
  test_v3: ["test_v2"],
};

export interface ValidateOptions {
  schemaKey: string;
  object: unknown;
  addDefaults?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string;
  object: unknown;
}

/**
 * Escapes special characters in a string for safe use in a regular expression pattern.
 *
 * @param string - The input string to escape.
 * @returns The escaped string, safe for use in regular expressions.
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validates an object against a specified JSON schema, supporting backward compatibility and automatic transformation from older schema versions if needed.
 *
 * If validation against the target schema fails and compatible older schemas are defined, attempts validation against each compatible schema. On a match, transforms the object to the target schema and revalidates. Returns the validation result, any errors, and the (possibly transformed) object.
 *
 * @param options - Validation options.
 * @param options.schemaKey - The key identifying the target JSON schema.
 * @param options.object - The object to validate.
 * @param options.addDefaults - Whether to include default values in the returned object.
 * @returns Validation result, error messages, and the validated (and possibly transformed) object.
 *
 * @throws Error If schemaKey or object is missing.
 */
export function validate({ schemaKey, object, addDefaults = true }: ValidateOptions): ValidationResult {
  if (!schemaKey) {
    throw new Error("Schema key is required.");
  }
  if (!object) {
    throw new Error("Object is required.");
  }

  const result: ValidationResult = {
    valid: false,
    errors: "",
    object: object,
  };

  let validationObject: Record<string, unknown>;
  let check = ajv.getSchema(schemaKey);
  if (!check) {
    result.valid = false;
    result.errors = `Schema not found: ${schemaKey}`;
    result.object = object;
    return result;
  }

  // Clone the object to avoid modifying the original object
  validationObject = JSON.parse(JSON.stringify(object));

  // Check if the object is compatible with the schema
  result.valid = check(validationObject) as boolean;
  result.errors = "";

  if (check.errors) {
    // Check if the object is compatible with another schema
    const compatibleSchemasList = compatibleSchemas[schemaKey];
    if (!compatibleSchemasList) {
      result.errors = check.errors
        .map(
          (error) =>
            `${error.instancePath} ${error.message} (${JSON.stringify(
              error.params
            )})`
        )
        .join(", ");
      result.object = object;
      result.valid = false;
      return result;
    }
    const matchedSchemaKey = compatibleSchemasList.find((key) => {
      validationObject = JSON.parse(JSON.stringify(object));
      const compatCheck = ajv.getSchema(key);
      if (compatCheck && (compatCheck(validationObject) as boolean)) return true;
      return false;
    });
    if (!matchedSchemaKey) {
      result.errors = check.errors
        .map(
          (error) =>
            `${error.instancePath} ${error.message} (${JSON.stringify(
              error.params
            )})`
        )
        .join(", ");
      result.object = object;
      result.valid = false;
      return result;
    } else {
      const transformedObject = transformToSchemaKey({
        currentSchema: matchedSchemaKey,
        targetSchema: schemaKey,
        object: validationObject,
      });

      result.valid = check(transformedObject) as boolean;
      if (result.valid) {
        validationObject = transformedObject;
        object = transformedObject;
      } else if (check.errors) {
        const errors = check.errors.map(
          (error) =>
            `${error.instancePath} ${error.message} (${JSON.stringify(
              error.params
            )})`
        );
        result.errors = errors.join(", ");
        return result;
      }
    }
  }
  if (addDefaults) {
    result.object = validationObject;
  } else {
    result.object = object;
  }

  return result;
}

export interface TransformOptions {
  currentSchema: string;
  targetSchema: string;
  object: Record<string, unknown>;
}

/**
 * Transforms an object from one JSON schema version to another, supporting multiple schema types and nested conversions.
 *
 * @param params - Transformation options.
 * @param params.currentSchema - The schema key of the object's current version.
 * @param params.targetSchema - The schema key to which the object should be transformed.
 * @param params.object - The object to transform.
 * @returns The transformed object, validated against the target schema.
 *
 * @throws Error If transformation between the specified schemas is not supported, or if the transformed object fails validation.
 */
export function transformToSchemaKey({
  currentSchema = "",
  targetSchema = "",
  object = {},
}: TransformOptions): Record<string, unknown> {
  // Check if the current schema is the same as the target schema
  if (currentSchema === targetSchema) {
    return object;
  }
  // Check if the current schema is compatible with the target schema
  if (!compatibleSchemas[targetSchema]?.includes(currentSchema)) {
    throw new Error(
      `Can't transform from ${currentSchema} to ${targetSchema}.`
    );
  }

  // Transform the object
  if (targetSchema === "step_v3") {
    const transformedObject: Record<string, unknown> = {
      stepId: object.id as string | undefined,
      description: object.description as string | undefined,
    };

    if (currentSchema === "goTo_v2") {
      transformedObject.goTo = {
        url: object.url,
        origin: object.origin,
      };
    } else if (currentSchema === "checkLink_v2") {
      transformedObject.checkLink = {
        url: object.url,
        origin: object.origin,
        statusCodes: object.statusCodes,
      };
    } else if (currentSchema === "find_v2") {
      const typeKeys = object.typeKeys as { keys?: string; delay?: number } | undefined;
      transformedObject.find = {
        selector: object.selector,
        elementText: object.matchText,
        timeout: object.timeout,
        moveTo: object.moveTo,
        click: object.click,
        type: typeKeys,
      };
      // Handle typeKeys.delay key change
      if (typeof typeKeys === "object" && typeKeys.keys) {
        (transformedObject.find as Record<string, unknown>).type = {
          keys: typeKeys.keys,
          inputDelay: typeKeys.delay,
        };
      }
      transformedObject.variables = {};
      const setVariables = object.setVariables as Array<{ name: string; regex: string }> | undefined;
      setVariables?.forEach((variable) => {
        (transformedObject.variables as Record<string, string>)[variable.name] = 
          `extract($$element.text, "${variable.regex}")`;
      });
    } else if (currentSchema === "httpRequest_v2") {
      const maxVariation = (object.maxVariation as number) ?? 0;
      transformedObject.httpRequest = {
        method: object.method,
        url: object.url,
        openApi: object.openApi,
        request: {
          body: object.requestData,
          headers: object.requestHeaders,
          parameters: object.requestParams,
        },
        response: {
          body: object.responseData,
          headers: object.responseHeaders,
        },
        statusCodes: object.statusCodes,
        allowAdditionalFields: object.allowAdditionalFields,
        timeout: object.timeout,
        path: object.savePath,
        directory: object.saveDirectory,
        maxVariation: maxVariation / 100,
        overwrite:
          object.overwrite === "byVariation"
            ? "aboveVariation"
            : object.overwrite,
      };
      // Handle openApi.requestHeaders key change
      if (object.openApi) {
        (transformedObject.httpRequest as Record<string, unknown>).openApi = transformToSchemaKey({
          currentSchema: "openApi_v2",
          targetSchema: "openApi_v3",
          object: object.openApi as Record<string, unknown>,
        });
      }
      transformedObject.variables = {};
      const envsFromResponseData = object.envsFromResponseData as Array<{ name: string; jqFilter: string }> | undefined;
      envsFromResponseData?.forEach((variable) => {
        (transformedObject.variables as Record<string, string>)[variable.name] = 
          `jq($$response.body, "${variable.jqFilter}")`;
      });
    } else if (currentSchema === "runShell_v2") {
      const maxVariation = (object.maxVariation as number) ?? 0;
      transformedObject.runShell = {
        command: object.command,
        args: object.args,
        workingDirectory: object.workingDirectory,
        exitCodes: object.exitCodes,
        stdio: object.output,
        path: object.savePath,
        directory: object.saveDirectory,
        maxVariation: maxVariation / 100,
        overwrite:
          object.overwrite === "byVariation"
            ? "aboveVariation"
            : object.overwrite,
        timeout: object.timeout,
      };
      transformedObject.variables = {};
      const setVariables = object.setVariables as Array<{ name: string; regex: string }> | undefined;
      setVariables?.forEach((variable) => {
        (transformedObject.variables as Record<string, string>)[variable.name] = 
          `extract($$stdio.stdout, "${variable.regex}")`;
      });
    } else if (currentSchema === "runCode_v2") {
      const maxVariation = (object.maxVariation as number) ?? 0;
      transformedObject.runCode = {
        language: object.language,
        code: object.code,
        args: object.args,
        workingDirectory: object.workingDirectory,
        exitCodes: object.exitCodes,
        stdio: object.output,
        path: object.savePath,
        directory: object.saveDirectory,
        maxVariation: maxVariation / 100,
        overwrite:
          object.overwrite === "byVariation"
            ? "aboveVariation"
            : object.overwrite,
        timeout: object.timeout,
      };
      transformedObject.variables = {};
      const setVariables = object.setVariables as Array<{ name: string; regex: string }> | undefined;
      setVariables?.forEach((variable) => {
        (transformedObject.variables as Record<string, string>)[variable.name] = 
          `extract($$stdio.stdout, "${variable.regex}")`;
      });
    } else if (currentSchema === "setVariables_v2") {
      transformedObject.loadVariables = object.path;
    } else if (currentSchema === "typeKeys_v2") {
      transformedObject.type = {
        keys: object.keys,
        inputDelay: object.delay,
      };
    } else if (currentSchema === "saveScreenshot_v2") {
      const maxVariation = (object.maxVariation as number) ?? 0;
      transformedObject.screenshot = {
        path: object.path,
        directory: object.directory,
        maxVariation: maxVariation / 100,
        overwrite:
          object.overwrite === "byVariation"
            ? "aboveVariation"
            : object.overwrite,
        crop: object.crop,
      };
    } else if (currentSchema === "startRecording_v2") {
      transformedObject.record = {
        path: object.path,
        directory: object.directory,
        overwrite: object.overwrite,
      };
    } else if (currentSchema === "stopRecording_v2") {
      transformedObject.stopRecord = true;
    } else if (currentSchema === "wait_v2") {
      transformedObject.wait = object;
    }

    const validationResult = validate({
      schemaKey: "step_v3",
      object: transformedObject,
    });
    if (!validationResult.valid) {
      throw new Error(`Invalid object: ${validationResult.errors}`);
    }
    return validationResult.object as Record<string, unknown>;
  } else if (targetSchema === "config_v3") {
    const runTests = object.runTests as Record<string, unknown> | undefined;
    const transformedObject: Record<string, unknown> = {
      loadVariables: object.envVariables,
      input: runTests?.input ?? object.input,
      output: runTests?.output ?? object.output,
      recursive: runTests?.recursive ?? object.recursive,
      relativePathBase: object.relativePathBase,
      detectSteps: runTests?.detectSteps,
      beforeAny: runTests?.setup,
      afterAll: runTests?.cleanup,
      logLevel: object.logLevel,
      telemetry: object.telemetry,
    };

    // Handle context transformation
    if (runTests?.contexts) {
      transformedObject.runOn = (runTests.contexts as Record<string, unknown>[]).map((context) =>
        transformToSchemaKey({
          currentSchema: "context_v2",
          targetSchema: "context_v3",
          object: context,
        })
      );
    }

    // Handle openApi transformation
    const integrations = object.integrations as Record<string, unknown> | undefined;
    if (integrations?.openApi) {
      transformedObject.integrations = {
        openApi: (integrations.openApi as Record<string, unknown>[]).map((description) =>
          transformToSchemaKey({
            currentSchema: "openApi_v2",
            targetSchema: "openApi_v3",
            object: description,
          })
        ),
      };
    }

    // Handle fileTypes transformation
    const fileTypes = object.fileTypes as Array<Record<string, unknown>> | undefined;
    if (fileTypes) {
      transformedObject.fileTypes = fileTypes.map((fileType) => {
        const extensions = fileType.extensions as string[] | undefined;
        const transformedFileType: Record<string, unknown> = {
          name: fileType.name,
          extensions: extensions?.map((extension) =>
            (extension as string).replace(/^\./, "")
          ),
          inlineStatements: {
            testStart: `${escapeRegExp(fileType.testStartStatementOpen as string)}(.*?)${escapeRegExp(fileType.testStartStatementClose as string)}`,
            testEnd: escapeRegExp(fileType.testEndStatement as string),
            ignoreStart: escapeRegExp(fileType.testIgnoreStatement as string),
            step: `${escapeRegExp(fileType.stepStatementOpen as string)}(.*?)${escapeRegExp(fileType.stepStatementClose as string)}`,
          },
        };

        const markup = fileType.markup as Array<Record<string, unknown>> | undefined;
        if (markup) {
          transformedFileType.markup = markup.map((markupItem) => {
            const transformedMarkup: Record<string, unknown> = {
              name: markupItem.name,
              regex: markupItem.regex,
            };

            const actions = markupItem.actions as Array<unknown> | undefined;
            if (actions) {
              transformedMarkup.actions = actions.map((action) => {
                if (typeof action === "string") return action;
                if (typeof action === "object" && action !== null) {
                  const actionObj = action as Record<string, unknown>;
                  if (actionObj.params) {
                    const newAction = {
                      action: actionObj.name,
                      ...(actionObj.params as Record<string, unknown>),
                    };
                    return transformToSchemaKey({
                      currentSchema: `${newAction.action}_v2`,
                      targetSchema: "step_v3",
                      object: newAction,
                    });
                  }
                  return transformToSchemaKey({
                    currentSchema: `${actionObj.action}_v2`,
                    targetSchema: "step_v3",
                    object: actionObj,
                  });
                }
                return action;
              });
            }
            return transformedMarkup;
          });
        }
        return transformedFileType;
      });
    }

    const validationResult = validate({
      schemaKey: "config_v3",
      object: transformedObject,
    });
    if (!validationResult.valid) {
      throw new Error(`Invalid object: ${validationResult.errors}`);
    }
    return validationResult.object as Record<string, unknown>;
  } else if (targetSchema === "context_v3") {
    const transformedObject: Record<string, unknown> = {};
    // Handle context_v2 to context_v3 transformation
    transformedObject.platforms = object.platforms;

    const app = object.app as Record<string, unknown> | undefined;
    if (app?.name) {
      const name = app.name === "edge" ? "chrome" : app.name;
      const options = app.options as Record<string, unknown> | undefined;
      transformedObject.browsers = [
        {
          name,
          headless: options?.headless,
          window: {
            width: options?.width,
            height: options?.height,
          },
          viewport: {
            width: options?.viewport_width,
            height: options?.viewport_height,
          },
        },
      ];
    }

    const validationResult = validate({
      schemaKey: "context_v3",
      object: transformedObject,
    });
    if (!validationResult.valid) {
      throw new Error(`Invalid object: ${validationResult.errors}`);
    }
    return validationResult.object as Record<string, unknown>;
  } else if (targetSchema === "openApi_v3") {
    // Handle openApi_v2 to openApi_v3 transformation
    const { name, requestHeaders, ...intermediaryObject } = object;
    const transformedObject = {
      ...intermediaryObject,
      name: name,
      headers: requestHeaders,
    };

    const validationResult = validate({
      schemaKey: "openApi_v3",
      object: transformedObject,
    });
    if (!validationResult.valid) {
      throw new Error(`Invalid object: ${validationResult.errors}`);
    }
    return transformedObject as Record<string, unknown>;
  } else if (targetSchema === "spec_v3") {
    // Handle spec_v2 to spec_v3 transformation
    const transformedObject: Record<string, unknown> = {
      specId: object.id,
      description: object.description,
      contentPath: object.file,
    };

    const contexts = object.contexts as Record<string, unknown>[] | undefined;
    if (contexts) {
      transformedObject.runOn = contexts.map((context) =>
        transformToSchemaKey({
          currentSchema: "context_v2",
          targetSchema: "context_v3",
          object: context,
        })
      );
    }

    const openApi = object.openApi as Record<string, unknown>[] | undefined;
    if (openApi) {
      transformedObject.openApi = openApi.map((description) =>
        transformToSchemaKey({
          currentSchema: "openApi_v2",
          targetSchema: "openApi_v3",
          object: description,
        })
      );
    }

    const tests = object.tests as Record<string, unknown>[];
    transformedObject.tests = tests.map((test) =>
      transformToSchemaKey({
        currentSchema: "test_v2",
        targetSchema: "test_v3",
        object: test,
      })
    );

    const validationResult = validate({
      schemaKey: "spec_v3",
      object: transformedObject,
    });
    if (!validationResult.valid) {
      throw new Error(`Invalid object: ${validationResult.errors}`);
    }
    return validationResult.object as Record<string, unknown>;
  } else if (targetSchema === "test_v3") {
    // Handle test_v2 to test_v3 transformation
    const transformedObject: Record<string, unknown> = {
      testId: object.id,
      description: object.description,
      contentPath: object.file,
      detectSteps: object.detectSteps,
      before: object.setup,
      after: object.cleanup,
    };

    const contexts = object.contexts as Record<string, unknown>[] | undefined;
    if (contexts) {
      transformedObject.runOn = contexts.map((context) =>
        transformToSchemaKey({
          currentSchema: "context_v2",
          targetSchema: "context_v3",
          object: context,
        })
      );
    }

    const openApi = object.openApi as Record<string, unknown>[] | undefined;
    if (openApi) {
      transformedObject.openApi = openApi.map((description) =>
        transformToSchemaKey({
          currentSchema: "openApi_v2",
          targetSchema: "openApi_v3",
          object: description,
        })
      );
    }

    const steps = object.steps as Record<string, unknown>[];
    transformedObject.steps = steps.map((step) =>
      transformToSchemaKey({
        currentSchema: `${step.action}_v2`,
        targetSchema: "step_v3",
        object: step,
      })
    );

    const validationResult = validate({
      schemaKey: "test_v3",
      object: transformedObject,
    });
    if (!validationResult.valid) {
      throw new Error(`Invalid object: ${validationResult.errors}`);
    }
    return validationResult.object as Record<string, unknown>;
  }

  throw new Error(`Transformation to ${targetSchema} is not implemented.`);
}

// If called directly, validate an example object
if (require.main === module) {
  const example = { path: "/User/manny/projects/doc-detective/static/images/image.png" };

  const result = validate({ schemaKey: "screenshot_v3", object: example });
  console.log(JSON.stringify(result, null, 2));
}
