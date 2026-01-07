const fs = require("fs");
const path = require("path");
const { validate } = require("./validate");

exports.resolvePaths = resolvePaths;

/**
 * Convert recognized relative path properties in a config or spec object to absolute paths.
 *
 * Traverses the provided object (recursing into nested objects and arrays), resolving fields that represent filesystem paths according to the provided config.relativePathBase and reference filePath. On top-level calls the function infers whether the object is a config or spec via schema validation; for nested calls objectType must be provided.
 *
 * @param {Object} options - Options for path resolution.
 * @param {Object} options.config - Configuration containing settings such as `relativePathBase`.
 * @param {Object} options.object - The config or spec object whose path properties will be resolved.
 * @param {string} options.filePath - Reference file or directory used to resolve relative paths.
 * @param {boolean} [options.nested=false] - True when invoked recursively for nested objects.
 * @param {string} [options.objectType] - 'config' or 'spec'; required for nested invocations to select which properties to resolve.
 * @returns {Object} The same object with applicable path properties converted to absolute paths.
 * @throws {Error} If the top-level object matches neither config nor spec schema, or if `objectType` is missing for nested calls.
 */
async function resolvePaths({
  config,
  object,
  filePath,
  nested = false,
  objectType,
}) {
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
   * @param {string} baseType - Indicates whether to resolve relative to the reference file's directory ("file") or the current working directory ("cwd").
   * @param {string} relativePath - The path to resolve, which may be relative or absolute.
   * @param {string} filePath - The reference file or directory path used for resolution.
   * @returns {string} The absolute path corresponding to {@link relativePath}.
   *
   * @remark If {@link relativePath} is already absolute, it is returned unchanged. If {@link filePath} does not exist, its extension is used to infer whether it is a file or directory.
   * @remark HTTP and HTTPS URLs are returned unchanged without resolution.
   */
  function resolve(baseType, relativePath, filePath) {
    // If the path is an http:// or https:// URL, or a heretto: URI, return it
    if (relativePath.startsWith("https://") || relativePath.startsWith("http://") || relativePath.startsWith("heretto:")) {
      return relativePath;
    }

    // If path is already absolute, return it
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }

    // Check if filePath exists and is a file
    const fileExists = fs.existsSync(filePath);
    const isFile = fileExists
      ? fs.lstatSync(filePath).isFile()
      : path.parse(filePath).ext !== "";

    // Use directory of filePath if it's a file (or looks like one)
    const basePath = isFile ? path.dirname(filePath) : filePath;

    // Resolve the path based on the base type
    return baseType === "file"
      ? path.resolve(basePath, relativePath)
      : path.resolve(relativePath);
  }

  const relativePathBase = config.relativePathBase;

  let pathProperties;
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
      const validation = validate({
        schemaKey: "spec_v3",
        object: { ...object },
      });
      if (validation.valid) {
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
  }

  // If the object is null or empty, return it as is
  if (object === null || Object.keys(object).length === 0) {
    return object;
  }

  for (const property of Object.keys(object)) {
    // If the property is an array, recursively call resolvePaths for each item in the array
    if (Array.isArray(object[property])) {
      for (let i = 0; i < object[property].length; i++) {
        const item = object[property][i];

        // If the item is an object, recursively call resolvePaths to resolve paths within the object
        if (typeof item === "object") {
          await resolvePaths({
            config: config,
            object: item,
            filePath: filePath,
            nested: true,
            objectType: objectType,
          });
        } else if (
          typeof item === "string" &&
          pathProperties.includes(property)
        ) {
          // Resolve the string path and write it back into the array
          const resolved =
            property === "path" &&
            object.directory &&
            path.isAbsolute(object.directory)
              ? resolve(relativePathBase, item, object.directory)
              : resolve(relativePathBase, item, filePath);
          object[property][i] = resolved;
        }
      }
    }
    // If the property is an object, recursively call resolvePaths to resolve paths within the object
    else if (
      typeof object[property] === "object" &&
      ((objectType === "spec" && !specNoResolve.includes(property)) ||
        objectType === "config")
    ) {
      // If the property is an object, recursively call resolvePaths to resolve paths within the object
      object[property] = await resolvePaths({
        config: config,
        object: object[property],
        filePath: filePath,
        nested: true,
        objectType: objectType,
      });
    } else if (typeof object[property] === "string") {
      // If the property begins with "https://", "http://", or "heretto:", skip it
      if (
        object[property].startsWith("https://") ||
        object[property].startsWith("http://") ||
        object[property].startsWith("heretto:")
      ) {
        continue;
      }
      // Check if it matches any of the path properties and resolve it if it does
      if (pathProperties.includes(property)) {
        if (property === "path" && object.directory) {
          const directory = path.isAbsolute(object.directory)
            ? object.directory
            : resolve(relativePathBase, object.directory, filePath);
          object[property] = resolve(
            relativePathBase,
            object[property],
            directory
          );
        } else {
          object[property] = resolve(
            relativePathBase,
            object[property],
            filePath
          );
        }
      }
    }
  }
  return object;
}

// If called directly, resolve paths in the provided object
/* c8 ignore start */
if (require.main === module) {
  (async () => {
    // Example usage
    const config = {
      relativePathBase: "file",
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
/* c8 ignore stop */