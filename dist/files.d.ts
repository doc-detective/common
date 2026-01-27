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
export declare function readFile({ fileURLOrPath }: ReadFileOptions): Promise<unknown | string | null>;
//# sourceMappingURL=files.d.ts.map