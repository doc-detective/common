const fs = require("fs").promises;
const path = require("path");

async function createEsmWrapper() {
  const distDir = path.join(__dirname, "..", "dist");

  // Ensure dist directory exists
  await fs.mkdir(distDir, { recursive: true });

  // Create ESM wrapper that re-exports from CJS
  const esmContent = `// ESM wrapper for CommonJS output
import cjsModule from './index.js';
export const { schemas, validate, transformToSchemaKey, detectTests, parseContent, parseXmlAttributes, parseObject, replaceNumericVariables, log, resolvePaths, readFile } = cjsModule;
export default cjsModule;
`;

  await fs.writeFile(path.join(distDir, "index.mjs"), esmContent);
  console.log("Created ESM wrapper at dist/index.mjs");
}

createEsmWrapper().catch((error) => {
  console.error("Failed to create ESM wrapper:", error);
  process.exit(1);
});
