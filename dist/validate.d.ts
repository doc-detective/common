export interface ValidateOptions {
    schemaKey: string;
    object: any;
    addDefaults?: boolean;
}
export interface ValidateResult {
    valid: boolean;
    errors: string;
    object: any;
}
export interface TransformOptions {
    currentSchema: string;
    targetSchema: string;
    object: any;
}
/**
 * Validates an object against a specified JSON schema, supporting backward compatibility and automatic transformation from older schema versions if needed.
 *
 * If validation against the target schema fails and compatible older schemas are defined, attempts validation against each compatible schema. On a match, transforms the object to the target schema and revalidates. Returns the validation result, any errors, and the (possibly transformed) object.
 *
 * @param options - Validation options
 * @param options.schemaKey - The key identifying the target JSON schema.
 * @param options.object - The object to validate.
 * @param options.addDefaults - Whether to include default values in the returned object.
 * @returns Validation result, error messages, and the validated (and possibly transformed) object.
 *
 * @throws {Error} If {@link schemaKey} or {@link object} is missing.
 */
export declare function validate({ schemaKey, object, addDefaults, }: ValidateOptions): ValidateResult;
/**
 * Transform an object from one schema key to another and return a validated instance of the target schema.
 *
 * @param params - Function parameters.
 * @param params.currentSchema - Schema key representing the object's current version.
 * @param params.targetSchema - Schema key to transform the object into.
 * @param params.object - The source object to transform.
 * @returns The transformed object conforming to the target schema.
 * @throws {Error} If transformation between the specified schemas is not supported or if the transformed object fails validation.
 */
export declare function transformToSchemaKey({ currentSchema, targetSchema, object, }: TransformOptions): any;
//# sourceMappingURL=validate.d.ts.map