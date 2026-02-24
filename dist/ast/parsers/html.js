import { unified } from "unified";
import rehypeParse from "rehype-parse";
function normalizeNode(node) {
    const attributes = {};
    if (node.tagName) {
        attributes.tagName = node.tagName;
    }
    if (node.properties) {
        for (const [key, value] of Object.entries(node.properties)) {
            attributes[key] = value;
        }
    }
    const result = {
        type: node.type,
        attributes,
    };
    if (node.value != null) {
        result.value = node.value;
    }
    if (node.position) {
        result.position = {
            start: {
                line: node.position.start.line,
                column: node.position.start.column,
                offset: node.position.start.offset,
            },
            end: {
                line: node.position.end.line,
                column: node.position.end.column,
                offset: node.position.end.offset,
            },
        };
    }
    if (node.children && Array.isArray(node.children)) {
        result.children = node.children.map(normalizeNode);
    }
    return result;
}
export function parseHtml(content) {
    try {
        const tree = unified()
            .use(rehypeParse, { fragment: true })
            .parse(content);
        return normalizeNode(tree);
        /* c8 ignore next 3 -- unified+rehypeParse never throws on input */
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=html.js.map