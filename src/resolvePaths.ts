import * as fs from "fs";
import * as path from "path";
import { validate } from "./validate";

export interface ResolvePathsOptions {
  config: {
    relativePathBase?: "file" | "cwd";
    [key: string]: unknown;
  };
  object: Record<string, unknown>;
  filePath: string;
  nested?: boolean;
  objectType?: "config" | "spec";
}

/**
 * Recursively resolves all relative path properties in a configuration or specification object to absolute paths.
 *
 * Traverses the provided object, converting all recognized path-related properties to absolute paths using the given configuration and reference file path. Supports nested objects and distinguishes between config and spec objects based on schema validation. Throws an error if the object is not a valid config or spec, or if the object type is missing for nested objects.
 *
 * @param options - Options for path resolution.
 * @param options.config - Configuration object containing settings such as `relativePathBase`.
 * @param options.object - The config or spec object whose path properties will be resolved.
 * @param options.filePath - Reference file path used for resolving relative paths.
 * @param options.nested - Indicates if this is a recursive call for a nested object.
 * @param options.objectType - Specifies the object type ('config' or 'spec'); required for nested objects.
 * @returns The object with all applicable path properties resolved to absolute paths.
 * @throws Error If the object is neither a valid config nor spec, or if `objectType` is missing for nested objects.
 */
export async function resolvePaths({
  config,
  object,
  filePath,
  nested = false,
  objectType,
}: ResolvePathsOptions): Promise<Record<string, unknown>> {
  // Config properties that contain paths
  const configPaths = [
    "input",
    "output",
    "loadVariables",
    "setup",
    "cleanup",
    "configPath",
    "beforeAny",
    "afterAll",
    "mediaDirectory",
    "downloadDirectory",
    "descriptionPath",
    "path",
  ];
  // Spec properties that contain paths
  const specPaths = [
    "file",
    "path",
    "directory",
    "before",
    "after",
    "loadVariables",
    "setup",
    "cleanup",
    "savePath",
    "saveDirectory",
    "specPath",
    "descriptionPath",
    "workingDirectory",
  ];
  // Spec objects that are configurable by the user and shouldn't be resolved
  const specNoResolve = [
    "requestData",
    "responseData",
    "requestHeaders",
    "responseHeaders",
    "requestParams",
    "responseParams",
  ];

  /**
   * Resolves a relative path to an absolute path using a specified base type and reference file path.
   *
   * @param baseType - Indicates whether to resolve relative to the reference file's directory ("file") or the current working directory ("cwd").
   * @param relativePath - The path to resolve, which may be relative or absolute.
   * @param referencePath - The reference file or directory path used for resolution.
   * @returns The absolute path corresponding to relativePath.
   */
  function resolve(baseType: "file" | "cwd" | undefined, relativePath: string, referencePath: string): string {
    // If the path is an http:// or https:// URL, return it
    if (relativePath.startsWith("https://") || relativePath.startsWith("http://")) {
      return relativePath;
    }

    // If path is already absolute, return it
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }

    // Check if filePath exists and is a file
    const fileExists = fs.existsSync(referencePath);
    const isFile = fileExists
      ? fs.lstatSync(referencePath).isFile()
      : path.parse(referencePath).ext !== "";

    // Use directory of filePath if it's a file (or looks like one)
    const basePath = isFile ? path.dirname(referencePath) : referencePath;

    // Resolve the path based on the base type
    return baseType === "file"
      ? path.resolve(basePath, relativePath)
      : path.resolve(relativePath);
  }

  const relativePathBase = config.relativePathBase;

  let pathProperties: string[];
  if (!nested && !objectType) {
    // Check if object matches the config schema
    const validation = validate({
      schemaKey: "config_v3",
      object: { ...object },
    });
    if (validation.valid) {
      pathProperties = configPaths;
      objectType = "config";
    } else {
      // Check if object matches the spec schema
      const specValidation = validate({
        schemaKey: "spec_v3",
        object: { ...object },
      });
      if (specValidation.valid) {
        pathProperties = specPaths;
        objectType = "spec";
      } else {
        throw new Error("Object isn't a valid config or spec.");
      }
    }
  } else if (nested && !objectType) {
    // If the object is nested, the object type is required
    throw new Error("Object type is required for nested objects.");
  } else if (objectType === "config") {
    // If the object type is config, use configPaths
    pathProperties = configPaths;
  } else if (objectType === "spec") {
    // If the object type is spec, use specPaths
    pathProperties = specPaths;
  } else {
    pathProperties = [];
  }

  // If the object is null or empty, return it as is
  if (object === null || Object.keys(object).length === 0) {
    return object;
  }

  for (const property of Object.keys(object)) {
    const value = object[property];

    // If the property is an array, recursively call resolvePaths for each item in the array
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i];

        // If the item is an object, recursively call resolvePaths to resolve paths within the object
        if (typeof item === "object" && item !== null) {
          await resolvePaths({
            config: config,
            object: item as Record<string, unknown>,
            filePath: filePath,
            nested: true,
            objectType: objectType,
          });
        } else if (
          typeof item === "string" &&
          pathProperties.includes(property)
        ) {
          // Resolve the string path and write it back into the array
          const directory = object.directory as string | undefined;
          const resolved =
            property === "path" &&
            directory &&
            path.isAbsolute(directory)
              ? resolve(relativePathBase, item, directory)
              : resolve(relativePathBase, item, filePath);
          value[i] = resolved;
        }
      }
    }
    // If the property is an object, recursively call resolvePaths to resolve paths within the object
    else if (
      typeof value === "object" &&
      value !== null &&
      ((objectType === "spec" && !specNoResolve.includes(property)) ||
        objectType === "config")
    ) {
      // If the property is an object, recursively call resolvePaths to resolve paths within the object
      object[property] = await resolvePaths({
        config: config,
        object: value as Record<string, unknown>,
        filePath: filePath,
        nested: true,
        objectType: objectType,
      });
    } else if (typeof value === "string") {
      // If the property begins with "https://" or "http://", skip it
      if (
        value.startsWith("https://") ||
        value.startsWith("http://")
      ) {
        continue;
      }
      // Check if it matches any of the path properties and resolve it if it does
      if (pathProperties.includes(property)) {
        const directory = object.directory as string | undefined;
        if (property === "path" && directory) {
          const resolvedDirectory = path.isAbsolute(directory)
            ? directory
            : resolve(relativePathBase, directory, filePath);
          object[property] = resolve(
            relativePathBase,
            value,
            resolvedDirectory
          );
        } else {
          object[property] = resolve(
            relativePathBase,
            value,
            filePath
          );
        }
      }
    }
  }
  return object;
}

// If called directly, resolve paths in the provided object
if (require.main === module) {
  (async () => {
    // Example usage
    const config = {
      relativePathBase: "file" as const,
    };
    const object = {
      tests: [
        {
          steps: [
            {
              screenshot: {
                path: "file.png",
                directory:
                  "/home/hawkeyexl/Workspaces/doc-detective-common/screenshots",
              },
            },
          ],
        },
      ],
    };
    const filePath = process.cwd();

    await resolvePaths({ config, object, filePath });
    console.log(JSON.stringify(object, null, 2));
  })();
}
