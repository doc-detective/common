// @ts-ignore -- restructured has no type declarations
import restructuredModule from "restructured";
// restructured exports { default: { parse } } in ESM context
const rstParse = restructuredModule.default?.parse ?? restructuredModule.parse;
/**
 * Parses an RST reference text like "link text <https://url>" into { text, url }.
 */
function parseReferenceText(raw) {
    const match = /^(.*?)\s*<([^>]+)>$/.exec(raw);
    if (match) {
        return { text: match[1].trim(), url: match[2] };
    }
    return { text: raw, url: raw };
}
/**
 * Normalizes a restructured AST node into our AstNode format.
 * Handles special RST types: directives (code-block, image), references (links).
 */
function normalizeNode(node) {
    const type = node.type || "unknown";
    const attributes = {};
    // Section depth
    if (node.depth != null)
        attributes.depth = node.depth;
    // Directive handling — flatten into semantic types
    if (type === "directive" && node.directive) {
        return normalizeDirective(node);
    }
    // Reference (link) handling — parse "text <url>" format
    if (type === "reference") {
        return normalizeReference(node);
    }
    const result = {
        type,
        attributes,
    };
    if (node.value != null) {
        result.value = node.value;
    }
    if (node.children && node.children.length > 0) {
        result.children = node.children.map(normalizeNode);
    }
    return result;
}
/**
 * Normalizes RST directives into semantic AstNode types.
 * - `code-block` → type "code-block" with language and code as value
 * - `image` → type "image" with target and alt attributes
 * - Other directives → type "directive" with directive name in attributes
 */
function normalizeDirective(node) {
    const directive = node.directive;
    const attributes = {};
    const children = node.children || [];
    if (directive === "code-block") {
        // children[0] is language (text node), children[1+] is code content
        let language;
        let code = "";
        for (const child of children) {
            if (child.type === "text") {
                if (!language) {
                    language = child.value.trim();
                }
                else {
                    code += child.value;
                }
            }
        }
        if (language)
            attributes.language = language;
        const result = {
            type: "code-block",
            attributes,
        };
        if (code)
            result.value = code;
        return result;
    }
    if (directive === "image") {
        // children[0] is the target path, rest are options like :alt:
        for (const child of children) {
            if (child.type === "text") {
                const val = child.value.trim();
                // Parse :option: value directives
                const optMatch = /^:(\w+):\s*(.*)$/.exec(val);
                if (optMatch) {
                    attributes[optMatch[1]] = optMatch[2].trim();
                }
                else if (!attributes.target) {
                    attributes.target = val;
                }
            }
        }
        return {
            type: "image",
            attributes,
        };
    }
    // Generic directive fallback
    attributes.directive = directive;
    const result = {
        type: "directive",
        attributes,
    };
    if (children.length > 0) {
        result.children = children.map(normalizeNode);
    }
    return result;
}
/**
 * Normalizes RST references into link-like AstNodes.
 * Parses "text <url>" format from child text nodes.
 */
function normalizeReference(node) {
    const attributes = {};
    const children = node.children || [];
    // Extract text and URL from child text nodes
    let rawText = "";
    for (const child of children) {
        if (child.type === "text" && child.value) {
            rawText += child.value;
        }
    }
    const { text, url } = parseReferenceText(rawText);
    attributes.url = url;
    const result = {
        type: "reference",
        attributes,
    };
    // Replace children with just the link text
    result.children = [
        {
            type: "text",
            attributes: {},
            value: text,
        },
    ];
    return result;
}
export function parseRst(content) {
    try {
        const tree = rstParse(content);
        return normalizeNode(tree);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=rst.js.map