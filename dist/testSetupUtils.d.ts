/**
 * Ollama setup utilities for tests.
 * This module contains the logic for ensuring Ollama is available during testing.
 */
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
export declare function isOllamaCLIAvailable(execSync?: (cmd: string, options: any) => Buffer | string): boolean;
/**
 * Checks if a service is running by trying to connect to it.
 */
export declare function isServiceAvailable(checkFunction: () => Promise<boolean>): Promise<boolean>;
/**
 * Attempts to start Ollama using the CLI command.
 */
export declare function startOllamaWithCLI(options?: StartOllamaCliOptions): Promise<{
    success: boolean;
    method: string;
    error?: unknown;
}>;
/**
 * Attempts to stop Ollama that was started via CLI.
 */
export declare function stopOllamaWithCLI(options?: StopOllamaCliOptions): Promise<boolean>;
export {};
//# sourceMappingURL=testSetupUtils.d.ts.map