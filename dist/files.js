"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readFile = readFile;
const fs = __importStar(require("fs"));
const YAML = __importStar(require("yaml"));
const axios_1 = __importDefault(require("axios"));
const url_1 = require("url");
/**
 * Reads and parses content from a remote URL or local file path, supporting JSON and YAML formats.
 *
 * Attempts to parse the file content as JSON first, then YAML. If both parsing attempts fail, returns the raw content as a string. Returns `null` if the file cannot be read.
 *
 * @param options - Options object
 * @param options.fileURLOrPath - The URL or local file path to read.
 * @returns Parsed object for JSON or YAML files, raw string for other formats, or `null` if reading fails.
 *
 * @throws {Error} If {@link fileURLOrPath} is missing, not a string, or is an empty string.
 */
async function readFile({ fileURLOrPath }) {
    if (!fileURLOrPath) {
        throw new Error("fileURLOrPath is required");
    }
    if (typeof fileURLOrPath !== "string") {
        throw new Error("fileURLOrPath must be a string");
    }
    if (fileURLOrPath.trim() === "") {
        throw new Error("fileURLOrPath cannot be an empty string");
    }
    let content;
    let isRemote = false;
    try {
        const parsedURL = new url_1.URL(fileURLOrPath);
        isRemote =
            parsedURL.protocol === "http:" || parsedURL.protocol === "https:";
    }
    catch (error) {
        // Not a valid URL, assume local file path
    }
    if (isRemote) {
        try {
            const response = await axios_1.default.get(fileURLOrPath);
            content = response.data;
        }
        catch (error) {
            console.warn(`Error reading remote file from ${fileURLOrPath}: ${error.message}`);
            return null;
        }
    }
    else {
        try {
            content = await fs.promises.readFile(fileURLOrPath, "utf8");
        }
        catch (error) {
            if (error.code === "ENOENT") {
                console.warn(`File not found: ${fileURLOrPath}`);
            }
            else {
                console.warn(`Error reading file: ${error.message}`);
            }
            return null;
        }
    }
    // Parse based on file extension
    const ext = fileURLOrPath.split('.').pop()?.toLowerCase();
    if (ext === "json") {
        try {
            return JSON.parse(content);
        }
        catch (error) {
            console.warn(`Failed to parse JSON: ${error.message}`);
            return content;
        }
    }
    else if (ext === "yaml" || ext === "yml") {
        try {
            return YAML.parse(content);
        }
        catch (error) {
            console.warn(`Failed to parse YAML: ${error.message}`);
            return content;
        }
    }
    else {
        return content;
    }
}
//# sourceMappingURL=files.js.map