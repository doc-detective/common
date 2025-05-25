const path = require("path");
const fs = require("fs");
const { Spectral } = require("@stoplight/spectral-core");
const { bundleAndLoadRuleset } = require("@stoplight/spectral-ruleset-bundler/with-loader");
const { createHttpAndFileResolver } = require("@stoplight/spectral-ref-resolver");
const { DiagnosticSeverity } = require("@stoplight/spectral-core");

// Import node-fetch and assign to global.fetch if it doesn't exist
const nodeFetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
if (!global.fetch) {
  global.fetch = nodeFetch;
}

/**
 * Lints JSON schema files using Spectral with a configured ruleset.
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.schemasDir - Directory containing schema files to lint
 * @param {string} options.rulesetPath - Path to the Spectral ruleset (YAML or JSON)
 * @param {string[]} options.include - Glob patterns for files to include
 * @param {string[]} options.exclude - Glob patterns for files to exclude
 * @param {boolean} options.v3Only - Whether to only validate v3 schemas
 * @returns {Promise<Object>} - Results of the linting operation
 */
async function lintSchemas({ 
  schemasDir = path.resolve(`${__dirname}/src_schemas`),
  rulesetPath = path.resolve(`${process.cwd()}/.spectral.yaml`),
  include = ["*.schema.json"], 
  exclude = [], 
  v3Only = true 
}) {
  // Create a new Spectral instance
  const spectral = new Spectral();
  spectral.resolver = createHttpAndFileResolver();

  // Load ruleset
  try {
    const ruleset = await bundleAndLoadRuleset(rulesetPath);
    spectral.setRuleset(ruleset);
  } catch (error) {
    console.error(`Failed to load ruleset: ${error.message}`);
    return { success: false, error: error.message };
  }

  // Get files to lint
  const files = fs.readdirSync(schemasDir)
    .filter(file => {
      // Include only files matching the include patterns
      const shouldInclude = include.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(file);
      });

      // Exclude files matching the exclude patterns
      const shouldExclude = exclude.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(file);
      });

      // Filter for v3 schemas if required
      const isV3 = !v3Only || file.includes('_v3');

      return shouldInclude && !shouldExclude && isV3;
    });

  // Store results
  const results = [];
  let hasErrors = false;

  // Process each file
  for (const file of files) {
    const filePath = path.join(schemasDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      const diagnostics = await spectral.run(JSON.parse(content), {
        ignoreUnknownFormat: true
      });
      
      if (diagnostics.length > 0) {
        results.push({
          file,
          diagnostics: diagnostics.map(diagnostic => ({
            code: diagnostic.code,
            message: diagnostic.message,
            severity: getSeverityName(diagnostic.severity),
            path: diagnostic.path.join('.'),
            range: diagnostic.range
          }))
        });

        // Check if any errors exist
        if (diagnostics.some(d => d.severity === DiagnosticSeverity.Error)) {
          hasErrors = true;
        }
      }
    } catch (error) {
      results.push({
        file,
        error: error.message,
      });
      hasErrors = true;
    }
  }

  return {
    success: !hasErrors,
    results,
  };
}

/**
 * Converts Spectral DiagnosticSeverity to human-readable string
 * 
 * @param {number} severity - Spectral DiagnosticSeverity enum value
 * @returns {string} - Human-readable severity name
 */
function getSeverityName(severity) {
  switch (severity) {
    case DiagnosticSeverity.Error:
      return 'error';
    case DiagnosticSeverity.Warning:
      return 'warning';
    case DiagnosticSeverity.Information:
      return 'info';
    case DiagnosticSeverity.Hint:
      return 'hint';
    default:
      return 'unknown';
  }
}

// Export the linting function
exports.lintSchemas = lintSchemas;

// If called directly, run the linting on v3 schemas
if (require.main === module) {
  (async () => {
    const results = await lintSchemas({ v3Only: true });
    console.log(JSON.stringify(results, null, 2));
    process.exit(results.success ? 0 : 1);
  })();
}