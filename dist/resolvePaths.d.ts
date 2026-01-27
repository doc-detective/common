type RelativePathBase = "file" | "cwd";
type ObjectType = "config" | "spec";
export interface ResolvePathsOptions {
    config: {
        relativePathBase: RelativePathBase;
    };
    object: Record<string, any>;
    filePath: string;
    nested?: boolean;
    objectType?: ObjectType;
}
/**
 * Convert recognized relative path properties in a config or spec object to absolute paths.
 *
 * Traverses the provided object (recursing into nested objects and arrays), resolving fields that represent filesystem paths according to the provided config.relativePathBase and reference filePath. On top-level calls the function infers whether the object is a config or spec via schema validation; for nested calls objectType must be provided.
 *
 * @param options - Options for path resolution.
 * @param options.config - Configuration containing settings such as `relativePathBase`.
 * @param options.object - The config or spec object whose path properties will be resolved.
 * @param options.filePath - Reference file or directory used to resolve relative paths.
 * @param options.nested - True when invoked recursively for nested objects.
 * @param options.objectType - 'config' or 'spec'; required for nested invocations to select which properties to resolve.
 * @returns The same object with applicable path properties converted to absolute paths.
 * @throws {Error} If the top-level object matches neither config nor spec schema, or if `objectType` is missing for nested calls.
 */
export declare function resolvePaths({ config, object, filePath, nested, objectType, }: ResolvePathsOptions): Promise<Record<string, any>>;
export {};
//# sourceMappingURL=resolvePaths.d.ts.map