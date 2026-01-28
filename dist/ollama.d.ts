/** Default Ollama model to use (text model that supports standard chat API) */
export declare const DEFAULT_OLLAMA_MODEL = "qwen3:4b";
/** Timeout for checking Ollama availability */
export declare const OLLAMA_AVAILABILITY_TIMEOUT_MS = 500;
/** Default Ollama base URL */
export declare const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434/api";
/** Maximum time to wait for model pull (10 minutes) */
export declare const MODEL_PULL_TIMEOUT_MS: number;
/** Maximum time to wait for Ollama startup (30 seconds) */
export declare const OLLAMA_STARTUP_TIMEOUT_MS: number;
/**
 * Checks if Ollama is available at the specified URL.
 */
export declare function isOllamaAvailable(baseUrl?: string): Promise<boolean>;
/**
 * Detects available GPU type.
 */
export declare function detectGpuType(): "nvidia" | "amd" | "none";
/**
 * Checks if Docker is running.
 */
export declare function isDockerRunning(): boolean;
/**
 * Gets the appropriate GPU flags for Docker based on available hardware.
 */
export declare function getGpuFlags(): string;
/**
 * Starts the Ollama Docker container with appropriate GPU support.
 */
export declare function startOllamaContainer(): Promise<void>;
/**
 * Waits for Ollama to become available.
 */
export declare function waitForOllama(timeoutMs?: number): Promise<boolean>;
/**
 * Stops and removes the Ollama container.
 */
export declare function stopOllamaContainer(): Promise<void>;
/**
 * Checks if a model is available locally.
 */
export declare function isModelAvailable({ model, baseUrl }: {
    model: string;
    baseUrl?: string;
}): Promise<boolean>;
/**
 * Ensures a model is available, pulling it if necessary.
 * Uses the /api/pull endpoint with streaming to display progress.
 */
export declare function ensureModelAvailable({ model, baseUrl }: {
    model: string;
    baseUrl?: string;
}): Promise<boolean>;
/**
 * Ensures Ollama is running, starting a Docker container if needed.
 */
export declare function ensureOllamaRunning(model?: string): Promise<boolean>;
//# sourceMappingURL=ollama.d.ts.map