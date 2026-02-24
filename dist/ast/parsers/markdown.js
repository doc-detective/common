import { unified } from "unified";
import remarkParse from "remark-parse";
function normalizeNode(node) {
    const attributes = {};
    if (node.lang != null)
        attributes.lang = node.lang;
    if (node.meta != null)
        attributes.meta = node.meta;
    if (node.url != null)
        attributes.url = node.url;
    if (node.title != null)
        attributes.title = node.title;
    if (node.alt != null)
        attributes.alt = node.alt;
    if (node.depth != null)
        attributes.depth = node.depth;
    if (node.ordered != null)
        attributes.ordered = node.ordered;
    if (node.identifier != null)
        attributes.identifier = node.identifier;
    if (node.label != null)
        attributes.label = node.label;
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
export function parseMarkdown(content) {
    try {
        const tree = unified().use(remarkParse).parse(content);
        return normalizeNode(tree);
        /* c8 ignore next 3 -- unified+remarkParse never throws on input */
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=markdown.js.map