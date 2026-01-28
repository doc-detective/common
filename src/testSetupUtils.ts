/**
 * Ollama setup utilities for tests.
 * This module contains the logic for ensuring Ollama is available during testing.
 */

import { execSync as nodeExecSync } from "child_process";

interface StartOllamaCliOptions {
  isOllamaAvailable?: () => Promise<boolean>;
  execSync?: (cmd: string, options: any) => Buffer | string;
  waitMs?: number;
}

interface StopOllamaCliOptions {
  execSync?: (cmd: string, options: any) => Buffer | string;
  waitMs?: number;
}

/**
 * Checks if Ollama CLI is available on the system.
 */
export function isOllamaCLIAvailable(
  execSync: (cmd: string, options: any) => Buffer | string = nodeExecSync
): boolean {
  try {
    execSync("ollama --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a service is running by trying to connect to it.
 */
export async function isServiceAvailable(
  checkFunction: () => Promise<boolean>
): Promise<boolean> {
  try {
    return await checkFunction();
  } catch {
    return false;
  }
}

/**
 * Attempts to start Ollama using the CLI command.
 */
export async function startOllamaWithCLI(
  options: StartOllamaCliOptions = {}
): Promise<{ success: boolean; method: string; error?: unknown }> {
  const {
    isOllamaAvailable = async () => false,
    execSync: execSyncFn = nodeExecSync,
    waitMs = 2000,
  } = options;

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
  } catch (error: unknown) {
    console.warn(
      `  ⚠ Error starting Ollama via CLI: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { success: false, method: "cli", error };
  }
}

/**
 * Attempts to stop Ollama that was started via CLI.
 */
export async function stopOllamaWithCLI(
  options: StopOllamaCliOptions = {}
): Promise<boolean> {
  const { execSync: execSyncFn = nodeExecSync, waitMs = 1000 } = options;

  try {
    console.log("  Stopping Ollama CLI service...");
    execSyncFn("killall ollama", { stdio: "ignore" });
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    console.log("  ✓ Ollama CLI service stopped");
    return true;
  } catch (error: unknown) {
    console.warn(
      `  ⚠ Error stopping Ollama CLI: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
}


