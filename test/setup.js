/**
 * Test setup file that ensures Ollama is running before AI tests execute.
 * This file is automatically loaded by Mocha before running tests.
 */

const ollamaModule = require("../dist/ollama");
const testSetupUtils = require("../dist/testSetupUtils");

const {
  isOllamaAvailable,
  isDockerRunning,
  ensureOllamaRunning,
  stopOllamaContainer,
  DEFAULT_OLLAMA_MODEL,
} = ollamaModule;

const {
  isOllamaCLIAvailable,
  startOllamaWithCLI,
  stopOllamaWithCLI,
} = testSetupUtils;

// Global state to track Ollama setup
global.ollamaSetupComplete = false;
global.ollamaStarted = false;
global.ollamaStartMethod = null; // Track how Ollama was started: "cli", "docker", or null
global.ollamaSetupPromise = null;

/**
 * Ensures Ollama is available and ready for tests.
 * Tries multiple methods: existing server, CLI command, Docker container.
 */
async function ensureOllamaReady() {
  try {
    console.log("\n  Setting up Ollama for tests...");
    
    // Check if Ollama server is already running
    const available = await isOllamaAvailable();
    
    if (available) {
      console.log("  ✓ Ollama is already available");
      global.ollamaSetupComplete = true;
      global.ollamaStartMethod = null; // We didn't start it
      return;
    }

    // Ollama not available - try to start it
    console.log("  Ollama not detected. Attempting to start...");

    // Method 1: Try Ollama CLI
    if (isOllamaCLIAvailable()) {
      const cliResult = await startOllamaWithCLI({
        isOllamaAvailable,
      });
      if (cliResult.success) {
        global.ollamaSetupComplete = true;
        global.ollamaStarted = true;
        global.ollamaStartMethod = "cli";
        return;
      }
    }

    // Method 2: Try Docker
    if (!isDockerRunning()) {
      console.warn("  ⚠ Docker is not available. Cannot start Ollama container.");
      console.warn("  ⚠ Ollama-dependent tests will be skipped.");
      console.warn("  ⚠ To run Ollama tests, install Ollama CLI or Docker.\n");
      global.ollamaSetupComplete = false;
      return;
    }

    // Docker is available, try to start Ollama container
    console.log("  Docker found. Starting Ollama container...");
    
    try {
      const success = await ensureOllamaRunning(DEFAULT_OLLAMA_MODEL);
      
      if (success) {
        console.log("  ✓ Ollama started successfully via Docker");
        global.ollamaSetupComplete = true;
        global.ollamaStarted = true;
        global.ollamaStartMethod = "docker";
      } else {
        console.warn("  ⚠ Failed to start Ollama via Docker");
        console.warn("  ⚠ Ollama-dependent tests will be skipped.");
        global.ollamaSetupComplete = false;
      }
    } catch (error) {
      console.warn(`  ⚠ Error starting Ollama via Docker: ${error.message}`);
      console.warn("  ⚠ Ollama-dependent tests will be skipped.");
      global.ollamaSetupComplete = false;
    }
  } catch (error) {
    console.warn(`  ⚠ Error during Ollama setup: ${error.message}`);
    console.warn("  ⚠ Ollama-dependent tests will be skipped.");
    global.ollamaSetupComplete = false;
  }
}

/**
 * Stops Ollama if we started it during test setup.
 * Does nothing if Ollama was already running before tests started.
 */
async function stopOllamaIfNeeded() {
  if (!global.ollamaStarted || !global.ollamaStartMethod) {
    return;
  }

  try {
    if (global.ollamaStartMethod === "cli") {
      await stopOllamaWithCLI();
    } else if (global.ollamaStartMethod === "docker") {
      console.log("\n  Cleaning up Ollama container...");
      await stopOllamaContainer();
      console.log("  ✓ Ollama container stopped");
    }
  } catch (error) {
    console.warn(`  ⚠ Error stopping Ollama: ${error.message}`);
  }
}

// Start the setup immediately when this module is loaded
global.ollamaSetupPromise = ensureOllamaReady();

/**
 * Root hook to set up and tear down Ollama before/after all tests.
 * This runs for the entire test suite, not per test file.
 */
module.exports = {
  rootHooks: {
    beforeAll: async function () {
      this.timeout(60000); // 60 second timeout for setup
      // Wait for the setup that was started when the module was loaded
      await global.ollamaSetupPromise;
    },
    afterAll: async function () {
      this.timeout(30000); // 30 second timeout for cleanup
      await stopOllamaIfNeeded();
    },
  },
};
