import * as fs from "fs";
import * as YAML from "yaml";
import axios from "axios";
import { URL } from "url";

export interface ReadFileOptions {
  fileURLOrPath: string;
}

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
export async function readFile({ fileURLOrPath }: ReadFileOptions): Promise<unknown | string | null> {
  if (!fileURLOrPath) {
    throw new Error("fileURLOrPath is required");
  }
  if (typeof fileURLOrPath !== "string") {
    throw new Error("fileURLOrPath must be a string");
  }
  if (fileURLOrPath.trim() === "") {
    throw new Error("fileURLOrPath cannot be an empty string");
  }

  let content: string;
  let isRemote = false;

  try {
    const parsedURL = new URL(fileURLOrPath);
    isRemote =
      parsedURL.protocol === "http:" || parsedURL.protocol === "https:";
  } catch (error) {
    // Not a valid URL, assume local file path
  }

  if (isRemote) {
    try {
      const response = await axios.get(fileURLOrPath);
      content = response.data;
    } catch (error) {
      console.warn(
        `Error reading remote file from ${fileURLOrPath}: ${(error as Error).message}`
      );
      return null;
    }
  } else {
    try {
      content = await fs.promises.readFile(fileURLOrPath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.warn(`File not found: ${fileURLOrPath}`);
      } else {
        console.warn(`Error reading file: ${(error as Error).message}`);
      }
      return null;
    }
  }

  // Parse based on file extension
  const ext = fileURLOrPath.split('.').pop()?.toLowerCase();

  if (ext === "json") {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Failed to parse JSON: ${(error as Error).message}`);
      return content;
    }
  } else if (ext === "yaml" || ext === "yml") {
    try {
      return YAML.parse(content);
    } catch (error) {
      console.warn(`Failed to parse YAML: ${(error as Error).message}`);
      return content;
    }
  } else {
    return content;
  }
}
