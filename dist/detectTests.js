"use strict";
/**
 * Browser-compatible test detection utilities.
 * This module provides pure parsing functionality that works with strings/objects,
 * without dependencies on Node.js file system or path modules.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectTests = detectTests;
exports.parseXmlAttributes = parseXmlAttributes;
exports.parseObject = parseObject;
exports.replaceNumericVariables = replaceNumericVariables;
exports.parseContent = parseContent;
exports.log = log;
const validate_1 = require("./validate");
// Web Crypto API compatible UUID generation
function generateUUID() {
    // Use crypto.randomUUID if available (modern browsers and Node 15+)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
/**
 * Browser-compatible test detection function.
 * Detects tests from content string using specified file type configuration.
 *
 * This is the main entry point for test detection in Common.
 * It works with content strings rather than file paths, making it browser-compatible.
 *
 * @param input - Detection input
 * @param input.content - Content string to parse for tests
 * @param input.filePath - File path (for metadata only, not file I/O)
 * @param input.fileType - File type configuration with parsing rules
 * @param input.config - Optional configuration
 * @returns Array of detected tests
 *
 * @example
 * ```typescript
 * const tests = await detectTests({
 *   content: markdownContent,
 *   filePath: 'docs/test.md',
 *   fileType: { extensions: ['md'], markup: [...] },
 *   config: { detectSteps: true }
 * });
 * ```
 */
async function detectTests(input) {
    return parseContent({
        config: input.config || {},
        content: input.content,
        filePath: input.filePath,
        fileType: input.fileType,
    });
}
/**
 * Parses XML-style attributes to an object.
 * Example: 'wait=500' becomes { wait: 500 }
 * Example: 'testId="myTestId" detectSteps=false' becomes { testId: "myTestId", detectSteps: false }
 * Example: 'httpRequest.url="https://example.com"' becomes { httpRequest: { url: "https://example.com" } }
 */
function parseXmlAttributes({ stringifiedObject }) {
    if (typeof stringifiedObject !== "string") {
        return null;
    }
    const str = stringifiedObject.trim();
    // Check if it looks like JSON or YAML - if so, return null to let JSON/YAML parsers handle it
    if (str.startsWith("{") || str.startsWith("[")) {
        return null;
    }
    // Check if it looks like YAML (key: value pattern)
    const yamlPattern = /^\w+:\s/;
    if (yamlPattern.test(str)) {
        return null;
    }
    if (str.startsWith("-")) {
        return null;
    }
    // Parse XML-style attributes
    const result = {};
    const attrRegex = /([\w.]+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
    let match;
    let hasMatches = false;
    while ((match = attrRegex.exec(str)) !== null) {
        hasMatches = true;
        const keyPath = match[1];
        let value = match[2] !== undefined ? match[2] : match[3] !== undefined ? match[3] : match[4];
        // Try to parse as boolean
        if (value === "true") {
            value = true;
        }
        else if (value === "false") {
            value = false;
        }
        else if (!isNaN(value) && value !== "") {
            value = Number(value);
        }
        // Handle dot notation for nested objects
        if (keyPath.includes(".")) {
            const keys = keyPath.split(".");
            let current = result;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!current[key] || typeof current[key] !== "object") {
                    current[key] = {};
                }
                current = current[key];
            }
            current[keys[keys.length - 1]] = value;
        }
        else {
            result[keyPath] = value;
        }
    }
    return hasMatches ? result : null;
}
/**
 * Parses a JSON or YAML object from a string.
 */
function parseObject({ stringifiedObject }) {
    if (typeof stringifiedObject === "string") {
        // First, try to parse as XML attributes
        const xmlAttrs = parseXmlAttributes({ stringifiedObject });
        if (xmlAttrs !== null) {
            return xmlAttrs;
        }
        // Try to parse as JSON
        try {
            const json = JSON.parse(stringifiedObject);
            return json;
        }
        catch (jsonError) {
            // JSON parsing failed - check if this looks like escaped JSON
            const trimmedString = stringifiedObject.trim();
            const looksLikeEscapedJson = (trimmedString.startsWith("{") || trimmedString.startsWith("[")) &&
                trimmedString.includes('\\"');
            if (looksLikeEscapedJson) {
                try {
                    const stringToParse = JSON.parse('"' + stringifiedObject + '"');
                    return JSON.parse(stringToParse);
                }
                catch {
                    // Fallback to simple quote replacement
                    try {
                        const unescaped = stringifiedObject.replace(/\\"/g, '"');
                        return JSON.parse(unescaped);
                    }
                    catch {
                        // Continue to YAML parsing
                    }
                }
            }
            // Try to parse as YAML
            try {
                // Note: In browser environment, YAML library must be provided
                // This is a placeholder - actual implementation would use a YAML library
                if (typeof globalThis.YAML !== 'undefined') {
                    return globalThis.YAML.parse(stringifiedObject);
                }
                console.warn("YAML parser not available in browser environment");
                return null;
            }
            catch (yamlError) {
                return null;
            }
        }
    }
    return stringifiedObject;
}
/**
 * Replaces numeric variables ($0, $1, etc.) in strings and objects with provided values.
 */
function replaceNumericVariables(stringOrObjectSource, values) {
    let stringOrObject = JSON.parse(JSON.stringify(stringOrObjectSource));
    if (typeof stringOrObject !== "string" && typeof stringOrObject !== "object") {
        throw new Error("Invalid stringOrObject type");
    }
    if (typeof values !== "object") {
        throw new Error("Invalid values type");
    }
    if (typeof stringOrObject === "string") {
        const matches = stringOrObject.match(/\$[0-9]+/g);
        if (matches) {
            const allExist = matches.every((variable) => {
                const index = variable.substring(1);
                return Object.hasOwn(values, index) && typeof values[index] !== "undefined";
            });
            if (!allExist) {
                return null;
            }
            else {
                stringOrObject = stringOrObject.replace(/\$[0-9]+/g, (variable) => {
                    const index = variable.substring(1);
                    return values[index];
                });
            }
        }
    }
    if (typeof stringOrObject === "object") {
        Object.keys(stringOrObject).forEach((key) => {
            if (typeof stringOrObject[key] === "object") {
                stringOrObject[key] = replaceNumericVariables(stringOrObject[key], values);
            }
            else if (typeof stringOrObject[key] === "string") {
                const matches = stringOrObject[key].match(/\$[0-9]+/g);
                if (matches) {
                    const allExist = matches.every((variable) => {
                        const index = variable.substring(1);
                        return Object.hasOwn(values, index) && typeof values[index] !== "undefined";
                    });
                    if (!allExist) {
                        delete stringOrObject[key];
                    }
                    else {
                        stringOrObject[key] = stringOrObject[key].replace(/\$[0-9]+/g, (variable) => {
                            const index = variable.substring(1);
                            return values[index];
                        });
                    }
                }
            }
        });
    }
    return stringOrObject;
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
async function parseContent({ config, content, filePath, fileType, }) {
    const statements = [];
    const statementTypes = ["testStart", "testEnd", "ignoreStart", "ignoreEnd", "step"];
    function findTest({ tests, testId }) {
        let test = tests.find((t) => t.testId === testId);
        if (!test) {
            test = { testId, steps: [] };
            tests.push(test);
        }
        return test;
    }
    // Test for each statement type
    statementTypes.forEach((statementType) => {
        if (typeof fileType.inlineStatements === "undefined" ||
            typeof fileType.inlineStatements[statementType] === "undefined")
            return;
        fileType.inlineStatements[statementType].forEach((statementRegex) => {
            const regex = new RegExp(statementRegex, "g");
            const matches = [...content.matchAll(regex)];
            matches.forEach((match) => {
                match.type = statementType;
                match.sortIndex = match[1] ? match.index + match[1].length : match.index;
            });
            statements.push(...matches);
        });
    });
    if (config.detectSteps !== false && fileType.markup) {
        fileType.markup.forEach((markup) => {
            markup.regex.forEach((pattern) => {
                const regex = new RegExp(pattern, "g");
                const matches = [...content.matchAll(regex)];
                if (matches.length > 0 && markup.batchMatches) {
                    const combinedMatch = {
                        1: matches.map((match) => match[1] || match[0]).join("\n"),
                        type: "detectedStep",
                        markup: markup,
                        sortIndex: Math.min(...matches.map((match) => match.index)),
                    };
                    statements.push(combinedMatch);
                }
                else if (matches.length > 0) {
                    matches.forEach((match) => {
                        match.type = "detectedStep";
                        match.markup = markup;
                        match.sortIndex = match[1] ? match.index + match[1].length : match.index;
                    });
                    statements.push(...matches);
                }
            });
        });
    }
    // Sort statements by index
    statements.sort((a, b) => a.sortIndex - b.sortIndex);
    // Process statements into tests and steps
    let tests = [];
    let testId = generateUUID();
    let ignore = false;
    statements.forEach((statement) => {
        let test;
        let statementContent = "";
        let stepsCleanup = false;
        switch (statement.type) {
            case "testStart":
                statementContent = statement[1] || statement[0];
                const parsedTest = parseObject({ stringifiedObject: statementContent });
                if (!parsedTest)
                    break;
                test = parsedTest;
                // If v2 schema, convert to v3
                if (test.id || test.file || test.setup || test.cleanup) {
                    if (!test.steps) {
                        test.steps = [{ action: "goTo", url: "https://doc-detective.com" }];
                        stepsCleanup = true;
                    }
                    const transformed = (0, validate_1.transformToSchemaKey)({
                        object: test,
                        currentSchema: "test_v2",
                        targetSchema: "test_v3",
                    });
                    test = transformed;
                    if (stepsCleanup && test) {
                        test.steps = [];
                    }
                }
                if (test.testId) {
                    testId = test.testId;
                }
                else {
                    test.testId = testId;
                }
                if (test.detectSteps === "false") {
                    test.detectSteps = false;
                }
                else if (test.detectSteps === "true") {
                    test.detectSteps = true;
                }
                if (!test.steps) {
                    test.steps = [];
                }
                tests.push(test);
                break;
            case "testEnd":
                testId = generateUUID();
                ignore = false;
                break;
            case "ignoreStart":
                ignore = true;
                break;
            case "ignoreEnd":
                ignore = false;
                break;
            case "detectedStep":
                test = findTest({ tests, testId });
                if (typeof test.detectSteps !== "undefined" && !test.detectSteps) {
                    break;
                }
                if (statement?.markup?.actions) {
                    statement.markup.actions.forEach((action) => {
                        let step = {};
                        if (typeof action === "string") {
                            if (action === "runCode")
                                return;
                            step[action] = statement[1] || statement[0];
                            if (config.origin && (action === "goTo" || action === "checkLink")) {
                                step[action] = { ...step[action], origin: config.origin };
                            }
                            // Attach sourceIntegration for Heretto
                            if (action === "screenshot" && config._herettoPathMapping) {
                                const herettoIntegration = findHerettoIntegration(config, filePath);
                                if (herettoIntegration) {
                                    const screenshotPath = step[action];
                                    step[action] = {
                                        path: screenshotPath,
                                        sourceIntegration: {
                                            type: "heretto",
                                            integrationName: herettoIntegration,
                                            filePath: screenshotPath,
                                            contentPath: filePath,
                                        },
                                    };
                                }
                            }
                        }
                        else {
                            const replacedStep = replaceNumericVariables(action, statement);
                            if (!replacedStep || typeof replacedStep === 'string')
                                return;
                            step = replacedStep;
                            // Attach sourceIntegration for Heretto
                            if (step.screenshot && config._herettoPathMapping) {
                                const herettoIntegration = findHerettoIntegration(config, filePath);
                                if (herettoIntegration) {
                                    if (typeof step.screenshot === "string") {
                                        step.screenshot = { path: step.screenshot };
                                    }
                                    else if (typeof step.screenshot === "boolean") {
                                        step.screenshot = {};
                                    }
                                    step.screenshot.sourceIntegration = {
                                        type: "heretto",
                                        integrationName: herettoIntegration,
                                        filePath: step.screenshot.path || "",
                                        contentPath: filePath,
                                    };
                                }
                            }
                        }
                        // Normalize step field formats
                        if (step.httpRequest) {
                            if (typeof step.httpRequest.request.headers === "string") {
                                try {
                                    const headers = {};
                                    step.httpRequest.request.headers.split("\n").forEach((header) => {
                                        const colonIndex = header.indexOf(":");
                                        if (colonIndex === -1)
                                            return;
                                        const key = header.substring(0, colonIndex).trim();
                                        const value = header.substring(colonIndex + 1).trim();
                                        if (key && value) {
                                            headers[key] = value;
                                        }
                                    });
                                    step.httpRequest.request.headers = headers;
                                }
                                catch (error) {
                                    // Ignore parsing errors
                                }
                            }
                            if (typeof step.httpRequest.request.body === "string" &&
                                (step.httpRequest.request.body.trim().startsWith("{") ||
                                    step.httpRequest.request.body.trim().startsWith("["))) {
                                try {
                                    step.httpRequest.request.body = JSON.parse(step.httpRequest.request.body);
                                }
                                catch (error) {
                                    // Ignore parsing errors
                                }
                            }
                        }
                        // Validate step
                        const valid = (0, validate_1.validate)({
                            schemaKey: "step_v3",
                            object: step,
                            addDefaults: false,
                        });
                        if (!valid.valid) {
                            console.warn(`Step ${JSON.stringify(step)} isn't a valid step. Skipping.`);
                            return;
                        }
                        step = valid.object;
                        test.steps.push(step);
                    });
                }
                break;
            case "step":
                test = findTest({ tests, testId });
                statementContent = statement[1] || statement[0];
                const parsedStep = parseObject({ stringifiedObject: statementContent });
                if (!parsedStep)
                    break;
                let step = parsedStep;
                const validation = (0, validate_1.validate)({
                    schemaKey: "step_v3",
                    object: step,
                    addDefaults: false,
                });
                if (!validation.valid) {
                    console.warn(`Step ${JSON.stringify(step)} isn't a valid step. Skipping.`);
                    return;
                }
                step = validation.object;
                test.steps.push(step);
                break;
            default:
                break;
        }
    });
    // Validate test objects
    const validatedTests = [];
    tests.forEach((test) => {
        const validation = (0, validate_1.validate)({
            schemaKey: "test_v3",
            object: test,
            addDefaults: false,
        });
        if (!validation.valid) {
            console.warn(`Couldn't convert test in ${filePath} to valid test. Skipping.`);
            return;
        }
        validatedTests.push(validation.object);
    });
    return validatedTests;
}
/**
 * Helper function to find which Heretto integration a file belongs to.
 */
function findHerettoIntegration(config, filePath) {
    if (!config._herettoPathMapping)
        return null;
    // Simple string matching since we don't have path.resolve in browser
    const normalizedFilePath = filePath.replace(/\\/g, "/");
    for (const [outputPath, integrationName] of Object.entries(config._herettoPathMapping)) {
        const normalizedOutputPath = outputPath.replace(/\\/g, "/");
        if (normalizedFilePath.startsWith(normalizedOutputPath)) {
            return integrationName;
        }
    }
    return null;
}
/**
 * Simple browser-compatible logging function.
 */
function log(config, level, message) {
    const logLevels = ["silent", "error", "warning", "warn", "info", "debug"];
    const configLevel = config.logLevel || "info";
    const configLevelIndex = logLevels.indexOf(configLevel);
    const messageLevelIndex = logLevels.indexOf(level);
    if (configLevelIndex < 0 || messageLevelIndex < 0)
        return;
    if (messageLevelIndex > configLevelIndex)
        return;
    // Normalize 'warning' to 'warn'
    const normalizedLevel = level === "warning" ? "warn" : level;
    if (typeof message === "object") {
        console[normalizedLevel](JSON.stringify(message, null, 2));
    }
    else {
        console[normalizedLevel](message);
    }
}
//# sourceMappingURL=detectTests.js.map