"use strict";
/**
 * Ollama setup utilities for tests.
 * This module contains the logic for ensuring Ollama is available during testing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOllamaCLIAvailable = isOllamaCLIAvailable;
exports.isServiceAvailable = isServiceAvailable;
exports.startOllamaWithCLI = startOllamaWithCLI;
exports.stopOllamaWithCLI = stopOllamaWithCLI;
const child_process_1 = require("child_process");
/**
 * Checks if Ollama CLI is available on the system.
 */
function isOllamaCLIAvailable(execSync = child_process_1.execSync) {
    try {
        execSync("ollama --version", { stdio: "ignore" });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Checks if a service is running by trying to connect to it.
 */
async function isServiceAvailable(checkFunction) {
    try {
        return await checkFunction();
    }
    catch {
        return false;
    }
}
/**
 * Attempts to start Ollama using the CLI command.
 */
async function startOllamaWithCLI(options = {}) {
    const { isOllamaAvailable = async () => false, execSync: execSyncFn = child_process_1.execSync, waitMs = 2000, } = options;
    try {
        console.log("  Ollama CLI found. Attempting to start Ollama...");
        execSyncFn("ollama serve", { stdio: "inherit", detached: true });
        // Wait a bit for the server to start
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        // Check if it's available
        if (await isOllamaAvailable()) {
            console.log("  ✓ Ollama started successfully via CLI");
            return { success: true, method: "cli" };
        }
        console.warn("  ⚠ Ollama CLI command executed but server not responding");
        return { success: false, method: "cli" };
    }
    catch (error) {
        console.warn(`  ⚠ Error starting Ollama via CLI: ${error instanceof Error ? error.message : String(error)}`);
        return { success: false, method: "cli", error };
    }
}
/**
 * Attempts to stop Ollama that was started via CLI.
 */
async function stopOllamaWithCLI(options = {}) {
    const { execSync: execSyncFn = child_process_1.execSync, waitMs = 1000 } = options;
    try {
        console.log("  Stopping Ollama CLI service...");
        execSyncFn("killall ollama", { stdio: "ignore" });
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        console.log("  ✓ Ollama CLI service stopped");
        return true;
    }
    catch (error) {
        console.warn(`  ⚠ Error stopping Ollama CLI: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}
//# sourceMappingURL=testSetupUtils.js.map