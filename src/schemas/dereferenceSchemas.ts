import parser from "@apidevtools/json-schema-ref-parser";
import * as path from "path";
import * as fs from "fs";

interface Schema {
  $id?: string;
  [key: string]: unknown;
}

(async () => {
  await dereferenceSchemas();
})();

/**
 * Processes JSON schema files by updating reference paths, dereferencing all `$ref` pointers, and generating fully resolved schema outputs.
 *
 * For each schema in the input directory, this function updates reference paths, writes intermediate schemas to a build directory, dereferences all references, removes `$id` properties, and writes the final schemas to an output directory. It also creates a consolidated `schemas.json` file containing all dereferenced schemas keyed by filename.
 */
async function dereferenceSchemas(): Promise<void> {
  const inputDir = path.resolve(`${__dirname}/src_schemas`);
  const buildDir = path.resolve(`${__dirname}/build`);
  fs.mkdirSync(buildDir, { recursive: true });
  const outputDir = path.resolve(`${__dirname}/output_schemas`);
  fs.mkdirSync(outputDir, { recursive: true });
  const distDir = path.resolve(__dirname, `../../dist/schemas`);
  fs.mkdirSync(distDir, { recursive: true });

  // List of schema files to process
  const files = [
    // v3 schemas
    "checkLink_v3.schema.json",
    "click_v3.schema.json",
    "config_v3.schema.json",
    "context_v3.schema.json",
    "dragAndDrop_v3.schema.json",
    "find_v3.schema.json",
    "goTo_v3.schema.json",
    "loadCookie_v3.schema.json",
    "loadVariables_v3.schema.json",
    "httpRequest_v3.schema.json",
    "openApi_v3.schema.json",
    "record_v3.schema.json",
    "resolvedTests_v3.schema.json",
    "report_v3.schema.json",
    "runCode_v3.schema.json",
    "runShell_v3.schema.json",
    "saveCookie_v3.schema.json",
    "screenshot_v3.schema.json",
    "spec_v3.schema.json",
    "step_v3.schema.json",
    "stopRecord_v3.schema.json",
    "test_v3.schema.json",
    "type_v3.schema.json",
    "wait_v3.schema.json",
    // v2 schemas
    "checkLink_v2.schema.json",
    "config_v2.schema.json",
    "context_v2.schema.json",
    "find_v2.schema.json",
    "goTo_v2.schema.json",
    "httpRequest_v2.schema.json",
    "moveTo_v2.schema.json",
    "openApi_v2.schema.json",
    "runShell_v2.schema.json",
    "runCode_v2.schema.json",
    "saveScreenshot_v2.schema.json",
    "setVariables_v2.schema.json",
    "startRecording_v2.schema.json",
    "stopRecording_v2.schema.json",
    "spec_v2.schema.json",
    "test_v2.schema.json",
    "typeKeys_v2.schema.json",
    "wait_v2.schema.json",
  ];

  // Update schema reference paths
  console.log("Updating schema reference paths...");
  for (const file of files) {
    console.log(`File: ${file}`);
    const filePath = path.resolve(`${inputDir}/${file}`);
    const buildFilePath = path.resolve(`${buildDir}/${file}`);
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      // Load schema
      const schemaContent = fs.readFileSync(filePath).toString();
      let schema = JSON.parse(schemaContent) as Schema;

      // Update references to current relative path
      schema.$id = `${filePath}`;
      schema = updateRefPaths(schema);

      // Write to build directory
      fs.writeFileSync(buildFilePath, JSON.stringify(schema, null, 2));
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }

  // Dereference schemas
  console.log("Dereferencing schemas...");
  for await (const file of files) {
    console.log(`Processing file: ${file}`);
    const filePath = path.resolve(`${buildDir}/${file}`);
    const outputFilePath = path.resolve(`${outputDir}/${file}`);
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Load schema
      const schemaContent = fs.readFileSync(filePath).toString();
      let schema = JSON.parse(schemaContent) as Schema;

      // Dereference schema
      schema = await parser.dereference(schema) as Schema;
      // Delete $id attributes
      schema = deleteDollarIds(schema);

      // Write to file
      fs.writeFileSync(outputFilePath, JSON.stringify(schema, null, 2));
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }

  // Build final schemas.json file
  console.log("Building schemas.json file...");
  const schemas: Record<string, Schema> = {};
  files.forEach((file) => {
    const key = file.replace(".schema.json", "");
    // Load schema from file
    const schemaContent = fs.readFileSync(`${outputDir}/${file}`).toString();
    const schema = JSON.parse(schemaContent) as Schema;
    // Load into `schema` object
    schemas[key] = schema;
  });
  fs.writeFileSync(
    `${__dirname}/schemas.json`,
    JSON.stringify(schemas, null, 2)
  );

  // Publish v3 schemas to distribution directory
  const publishedSchemas = files.filter(file => file.includes('_v3.schema.json'));

  console.log("Publishing schemas to dist/schemas directory...");
  publishedSchemas.forEach((file) => {
    try {
      console.log(`Publishing file: ${file}`);
      const srcPath = path.resolve(`${outputDir}/${file}`);
      const destPath = path.resolve(`${distDir}/${file}`);

      // Verify source file exists before copying
      if (!fs.existsSync(srcPath)) {
        throw new Error(`Source file not found: ${srcPath}`);
      }

      fs.copyFileSync(srcPath, destPath);
    } catch (err) {
      console.error(`Error publishing ${file}:`, err);
    }
  });
}

// Prepend app-root path to referenced relative paths
function updateRefPaths(schema: Schema): Schema {
  if (schema === null || typeof schema !== "object") return schema;
  for (const [key, value] of Object.entries(schema)) {
    if (typeof value === "object" && value !== null) {
      updateRefPaths(value as Schema);
    }
    if (key === "$ref" && typeof value === "string" && !value.startsWith("#")) {
      // File name of the referenced schema
      const valueFile = value.split("#")[0];
      // Attribute path in the referenced schema
      const valueAttribute = value.split("#")[1];
      const valuePath = path.resolve(`${__dirname}/build/${valueFile}`);
      schema[key] = `${valuePath}#${valueAttribute}`;
    }
  }
  return schema;
}

/**
 * Recursively removes all `$id` properties from a JSON schema object.
 *
 * @param schema - The JSON schema object to process.
 * @returns The schema object with all `$id` properties deleted.
 */
function deleteDollarIds(schema: Schema): Schema {
  if (schema === null || typeof schema !== "object") return schema;
  for (const [key, value] of Object.entries(schema)) {
    if (typeof value === "object" && value !== null) {
      deleteDollarIds(value as Schema);
    }
    if (key === "$id") {
      delete schema[key];
    }
  }
  return schema;
}
