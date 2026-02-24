/**
 * Matches a value against a pattern.
 * - string: exact match, or regex if wrapped in /pattern/flags
 * - boolean: true = value must exist (not undefined/null/empty), false = must not exist
 * - string[]: any-of match
 */
export function matchesPattern(value, pattern) {
    if (typeof pattern === "boolean") {
        if (pattern) {
            return value !== undefined && value !== null && value !== "";
        }
        return value === undefined || value === null || value === "";
    }
    if (Array.isArray(pattern)) {
        const strValue = String(value ?? "");
        return pattern.some((p) => matchesPattern(strValue, p));
    }
    if (typeof pattern === "string") {
        // Check for regex pattern: /pattern/ or /pattern/flags
        const regexMatch = /^\/(.+)\/([gimsuy]*)$/.exec(pattern);
        if (regexMatch) {
            const re = new RegExp(regexMatch[1], regexMatch[2]);
            return re.test(String(value ?? ""));
        }
        return String(value ?? "") === pattern;
    }
    return false;
}
/**
 * Recursively extracts text content from a node.
 */
export function getNodeTextContent(node) {
    if (node.value != null)
        return node.value;
    if (node.children) {
        return node.children.map(getNodeTextContent).join("");
    }
    return "";
}
/**
 * Checks if a node matches the given config criteria.
 */
export function nodeMatches(node, config) {
    // Check nodeType
    if (config.nodeType !== undefined) {
        if (typeof config.nodeType === "string") {
            if (node.type !== config.nodeType)
                return false;
        }
        else if (Array.isArray(config.nodeType)) {
            if (!config.nodeType.includes(node.type))
                return false;
        }
    }
    // Check attributes
    if (config.attributes) {
        for (const [key, pattern] of Object.entries(config.attributes)) {
            const value = node.attributes[key];
            if (!matchesPattern(value, pattern))
                return false;
        }
    }
    // Check content
    if (config.content !== undefined) {
        const text = getNodeTextContent(node);
        if (!matchesPattern(text, config.content))
            return false;
    }
    // Check children (all child matchers must match at least one child)
    if (config.children && config.children.length > 0) {
        if (!node.children || node.children.length === 0)
            return false;
        for (const childConfig of config.children) {
            const hasMatch = node.children.some((child) => nodeMatches(child, childConfig));
            if (!hasMatch)
                return false;
        }
    }
    return true;
}
/**
 * Navigates a dot-path on a node to extract a value.
 * e.g., "attributes.lang" -> node.attributes.lang
 */
function getByPath(node, path) {
    const parts = path.split(".");
    let current = node;
    for (const part of parts) {
        if (current === undefined || current === null)
            return undefined;
        current = current[part];
    }
    return current;
}
/**
 * Extracts values from a node according to the extract config.
 * Returns a map like { "$1": "bash", "$2": "echo hello" }
 */
export function extractValues(node, extractConfig) {
    const result = {};
    for (const [variable, path] of Object.entries(extractConfig)) {
        const value = getByPath(node, path);
        if (value !== undefined && value !== null) {
            result[variable] = String(value);
        }
    }
    return result;
}
/**
 * Depth-first traversal matching nodes against config.
 */
export function matchNodes(tree, config) {
    const results = [];
    function walk(node) {
        if (nodeMatches(node, config)) {
            const extracted = config.extract
                ? extractValues(node, config.extract)
                : {};
            results.push({
                node,
                position: node.position,
                extracted,
                sortIndex: node.position?.start.offset ?? results.length,
            });
        }
        if (node.children) {
            for (const child of node.children) {
                walk(child);
            }
        }
    }
    walk(tree);
    return results;
}
//# sourceMappingURL=matcher.js.map