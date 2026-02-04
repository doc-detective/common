/**
 * Browser-compatible test detection utilities.
 * This module provides pure parsing functionality that works with strings/objects,
 * without dependencies on Node.js file system or path modules.
 */
/**
 * Parses XML-style attributes to an object.
 * Example: 'wait=500' becomes { wait: 500 }
 * Example: 'testId="myTestId" detectSteps=false' becomes { testId: "myTestId", detectSteps: false }
 * Example: 'httpRequest.url="https://example.com"' becomes { httpRequest: { url: "https://example.com" } }
 */
export declare function parseXmlAttributes({ stringifiedObject }: {
    stringifiedObject: string;
}): Record<string, any> | null;
/**
 * Parses a JSON or YAML object from a string.
 */
export declare function parseObject({ stringifiedObject }: {
    stringifiedObject: string;
}): Record<string, any> | null;
/**
 * Replaces numeric variables ($0, $1, etc.) in strings and objects with provided values.
 */
export declare function replaceNumericVariables(stringOrObjectSource: string | Record<string, any>, values: Record<string, any>): string | Record<string, any> | null;
export interface FileType {
    name?: string;
    extensions: string[];
    inlineStatements?: {
        testStart?: string[];
        testEnd?: string[];
        ignoreStart?: string[];
        ignoreEnd?: string[];
        step?: string[];
    };
    markup?: Array<{
        regex: string[];
        actions?: (string | Record<string, any>)[];
        batchMatches?: boolean;
    }>;
    runShell?: Record<string, any>;
}
export interface DetectTestsConfig {
    detectSteps?: boolean;
    origin?: string;
    logLevel?: string;
    _herettoPathMapping?: Record<string, string>;
}
export interface DetectedTest {
    testId?: string;
    detectSteps?: boolean;
    steps: Array<Record<string, any>>;
    [key: string]: any;
}
/**
 * Parses raw test content into an array of structured test objects.
 * This is a browser-compatible function that works with strings and doesn't require file system access.
 *
 * @param options - Options for parsing
 * @param options.config - Test configuration object
 * @param options.content - Raw file content as a string
 * @param options.filePath - Path to the file being parsed (for metadata, not file I/O)
 * @param options.fileType - File type definition containing parsing rules
 * @returns Array of parsed and validated test objects
 */
export declare function parseContent({ config, content, filePath, fileType, }: {
    config: DetectTestsConfig;
    content: string;
    filePath: string;
    fileType: FileType;
}): Promise<DetectedTest[]>;
/**
 * Simple browser-compatible logging function.
 */
export declare function log(config: DetectTestsConfig, level: string, message: any): void;
//# sourceMappingURL=detectTests.d.ts.map