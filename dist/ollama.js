"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OLLAMA_STARTUP_TIMEOUT_MS = exports.MODEL_PULL_TIMEOUT_MS = exports.DEFAULT_OLLAMA_BASE_URL = exports.OLLAMA_AVAILABILITY_TIMEOUT_MS = exports.DEFAULT_OLLAMA_MODEL = void 0;
exports.isOllamaAvailable = isOllamaAvailable;
exports.detectGpuType = detectGpuType;
exports.isDockerRunning = isDockerRunning;
exports.getGpuFlags = getGpuFlags;
exports.startOllamaContainer = startOllamaContainer;
exports.waitForOllama = waitForOllama;
exports.stopOllamaContainer = stopOllamaContainer;
exports.isModelAvailable = isModelAvailable;
exports.ensureModelAvailable = ensureModelAvailable;
exports.ensureOllamaRunning = ensureOllamaRunning;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
/** Default Ollama model to use (text model that supports standard chat API) */
exports.DEFAULT_OLLAMA_MODEL = "qwen3:4b";
/** Timeout for checking Ollama availability */
exports.OLLAMA_AVAILABILITY_TIMEOUT_MS = 500;
/** Default Ollama base URL */
exports.DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434/api";
/** Maximum time to wait for model pull (10 minutes) */
exports.MODEL_PULL_TIMEOUT_MS = 10 * 60 * 1000;
/** Maximum time to wait for Ollama startup (30 seconds) */
exports.OLLAMA_STARTUP_TIMEOUT_MS = 30 * 1000;
/**
 * Checks if Ollama is available at the specified URL.
 */
async function isOllamaAvailable(baseUrl) {
    const url = baseUrl || "http://localhost:11434";
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), exports.OLLAMA_AVAILABILITY_TIMEOUT_MS);
        const response = await fetch(url, {
            method: "GET",
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response.ok;
    }
    catch {
        return false;
    }
}
/**
 * Detects available GPU type.
 */
function detectGpuType() {
    // Check for Nvidia GPU
    try {
        (0, child_process_1.execSync)("nvidia-smi", { stdio: "ignore" });
        return "nvidia";
    }
    catch {
        // nvidia-smi not available or failed
    }
    // Check for AMD GPU
    try {
        if (fs_1.default.existsSync("/dev/kfd") && fs_1.default.existsSync("/dev/dri")) {
            return "amd";
        }
    }
    catch {
        // fs check failed
    }
    return "none";
}
/**
 * Checks if Docker is running.
 */
function isDockerRunning() {
    try {
        (0, child_process_1.execSync)("docker --version", { stdio: "ignore" });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Gets the appropriate GPU flags for Docker based on available hardware.
 */
function getGpuFlags() {
    const gpuType = detectGpuType();
    if (gpuType === "nvidia") {
        return "--gpus=all";
    }
    else if (gpuType === "amd") {
        return "--device /dev/kfd --device /dev/dri -e OLLAMA_ROCM_SUPPORT=1";
    }
    return "";
}
/**
 * Starts the Ollama Docker container with appropriate GPU support.
 */
async function startOllamaContainer() {
    // Check if Docker is installed
    if (!isDockerRunning()) {
        throw new Error("Docker is not installed or not in PATH");
    }
    const gpuType = detectGpuType();
    console.log(`    Detected GPU type: ${gpuType}`);
    let dockerArgs;
    switch (gpuType) {
        case "nvidia":
            dockerArgs = [
                "run", "-d",
                getGpuFlags(), // --gpus=all
                "-v", "ollama:/root/.ollama",
                "-p", "11434:11434",
                "--name", "ollama",
                "ollama/ollama"
            ];
            break;
        case "amd":
            // getGpuFlags returns a string like "--device /dev/kfd --device /dev/dri -e OLLAMA_ROCM_SUPPORT=1"
            // We need to split it if we are putting it into an array that gets joined with spaces later.
            // But wait, the original code had separate array elements for --device and path.
            // The previous implementation used array join(" ").
            // If getGpuFlags returns a string with spaces, it should be fine when joined again.
            // However, to match the exact array structure of original implementation (which might be important for tests expecting specific args structure if they spy on join? no, tests inspect the final string usually, or array args)
            // Let's rely on the string return from getGpuFlags and spread/insert it.
            // But getGpuFlags returns ONE string.
            dockerArgs = [
                "run", "-d",
                getGpuFlags(),
                "-v", "ollama:/root/.ollama",
                "-p", "11434:11434",
                "--name", "ollama",
                "ollama/ollama:rocm"
            ];
            break;
        default:
            dockerArgs = [
                "run", "-d",
                "-v", "ollama:/root/.ollama",
                "-p", "11434:11434",
                "--name", "ollama",
                "ollama/ollama"
            ];
    }
    console.log(`    Starting Ollama container...`);
    // Remove empty strings if any (e.g. getGpuFlags returns empty for default)
    // Actually default case doesn't call getGpuFlags.
    (0, child_process_1.execSync)(`docker ${dockerArgs.join(" ")}`, { stdio: "inherit" });
}
/**
 * Waits for Ollama to become available.
 */
async function waitForOllama(timeoutMs = exports.OLLAMA_STARTUP_TIMEOUT_MS) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        try {
            const response = await fetch("http://localhost:11434");
            if (response.ok) {
                return true;
            }
        }
        catch {
            // Not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
}
/**
 * Stops and removes the Ollama container.
 */
async function stopOllamaContainer() {
    try {
        console.log(`    Stopping Ollama container...`);
        (0, child_process_1.execSync)("docker stop ollama", { stdio: "ignore" });
    }
    catch {
        // Container may not be running
    }
    try {
        (0, child_process_1.execSync)("docker rm ollama", { stdio: "ignore" });
        console.log(`    Ollama container removed.`);
    }
    catch {
        // Container may not exist
    }
}
/**
 * Checks if a model is available locally.
 */
async function isModelAvailable({ model, baseUrl = exports.DEFAULT_OLLAMA_BASE_URL }) {
    try {
        const response = await fetch(`${baseUrl}/tags`);
        if (!response.ok) {
            return false;
        }
        const data = await response.json();
        const models = data.models || [];
        // Check if the model name matches any locally available model
        // Model names can be in format "name:tag" or just "name" (defaults to "latest")
        const normalizedModel = model.includes(":") ? model : `${model}:latest`;
        return models.some((m) => {
            const localModel = m.name || m.model;
            const normalizedLocal = localModel.includes(":") ? localModel : `${localModel}:latest`;
            return normalizedLocal === normalizedModel || localModel === model;
        });
    }
    catch {
        return false;
    }
}
/**
 * Formats bytes into a human-readable string.
 */
const formatBytes = (bytes) => {
    if (bytes === 0)
        return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};
/**
 * Renders a progress bar to the console.
 */
const renderProgressBar = ({ completed, total, status, barWidth = 40 }) => {
    const percentage = total > 0 ? Math.min(100, (completed / total) * 100) : 0;
    const filledWidth = Math.round((percentage / 100) * barWidth);
    const emptyWidth = barWidth - filledWidth;
    const bar = "█".repeat(filledWidth) + "░".repeat(emptyWidth);
    const percentStr = percentage.toFixed(1).padStart(5);
    const completedStr = formatBytes(completed);
    const totalStr = formatBytes(total);
    // Use carriage return to overwrite the line
    process.stdout.write(`\r    [${bar}] ${percentStr}% | ${completedStr}/${totalStr} | ${status}`);
};
/**
 * Ensures a model is available, pulling it if necessary.
 * Uses the /api/pull endpoint with streaming to display progress.
 */
async function ensureModelAvailable({ model, baseUrl = exports.DEFAULT_OLLAMA_BASE_URL }) {
    // First check if Ollama is available
    if (!await isOllamaAvailable()) {
        console.error("    Ollama is not available.");
        return false;
    }
    // Check if model is already available
    if (await isModelAvailable({ model, baseUrl })) {
        console.log(`    Model ${model} is already available.`);
        return true;
    }
    console.log(`    Pulling model ${model}...`);
    try {
        const response = await fetch(`${baseUrl}/pull`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model }),
        });
        if (!response.ok) {
            console.error(`\n    Failed to pull model: HTTP ${response.status}`);
            return false;
        }
        const reader = response.body?.getReader();
        if (!reader) {
            console.error("\n    Failed to get response reader");
            return false;
        }
        const decoder = new TextDecoder();
        let buffer = "";
        let lastStatus = "";
        let lastCompleted = 0;
        let lastTotal = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            buffer += decoder.decode(value, { stream: true });
            // Process complete JSON objects from the buffer
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer
            for (const line of lines) {
                if (!line.trim())
                    continue;
                try {
                    const data = JSON.parse(line);
                    if (data.error) {
                        console.error(`\n    Error pulling model: ${data.error}`);
                        return false;
                    }
                    lastStatus = data.status || lastStatus;
                    // Update progress if we have total/completed info
                    if (data.total !== undefined) {
                        lastTotal = data.total;
                        lastCompleted = data.completed || 0;
                        renderProgressBar({
                            completed: lastCompleted,
                            total: lastTotal,
                            status: lastStatus.substring(0, 30),
                        });
                    }
                    else if (lastTotal === 0) {
                        // Status-only update (no download progress)
                        process.stdout.write(`\r    ${lastStatus.padEnd(80)}`);
                    }
                    // Check for success
                    if (data.status === "success") {
                        process.stdout.write("\n");
                        console.log(`    Model ${model} is ready.`);
                        return true;
                    }
                }
                catch {
                    // Ignore JSON parse errors for incomplete data
                }
            }
        }
        // Process any remaining buffer
        if (buffer.trim()) {
            try {
                const data = JSON.parse(buffer);
                if (data.status === "success") {
                    process.stdout.write("\n");
                    console.log(`    Model ${model} is ready.`);
                    return true;
                }
                if (data.error) {
                    console.error(`\n    Error pulling model: ${data.error}`);
                    return false;
                }
            }
            catch {
                // Ignore parse errors
            }
        }
        // If we got here without success, check if model is now available
        process.stdout.write("\n");
        const available = await isModelAvailable({ model, baseUrl });
        if (available) {
            console.log(`    Model ${model} is ready.`);
        }
        else {
            console.error(`    Failed to make model ${model} available.`);
        }
        return available;
    }
    catch (error) {
        console.error(`\n    Error pulling model: ${error.message}`);
        return false;
    }
}
/**
 * Ensures Ollama is running, starting a Docker container if needed.
 */
async function ensureOllamaRunning(model = exports.DEFAULT_OLLAMA_MODEL) {
    if (await isOllamaAvailable()) {
        console.log("Ollama is already running.");
        return true;
    }
    console.log("Ollama not detected, starting Docker container...");
    // Clean up any existing container first
    await stopOllamaContainer();
    try {
        await startOllamaContainer();
    }
    catch (error) {
        console.error(`Failed to start Ollama container: ${error.message}`);
        return false;
    }
    const available = await waitForOllama();
    if (!available) {
        throw new Error("Ollama container started but did not become available");
    }
    await ensureModelAvailable({ model });
    return true;
}
//# sourceMappingURL=ollama.js.map