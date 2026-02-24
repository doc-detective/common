import { DOMParser } from "@xmldom/xmldom";
function domToAst(node) {
    // Element node
    if (node.nodeType === 1) {
        const attributes = {};
        attributes.tagName = node.tagName /* c8 ignore next */ || node.nodeName;
        if (node.attributes) {
            for (let i = 0; i < node.attributes.length; i++) {
                const attr = node.attributes[i];
                attributes[attr.name] = attr.value;
            }
        }
        const children = [];
        if (node.childNodes) {
            for (let i = 0; i < node.childNodes.length; i++) {
                const child = domToAst(node.childNodes[i]);
                if (child)
                    children.push(child);
            }
        }
        const result = {
            type: "element",
            attributes,
        };
        if (children.length > 0) {
            result.children = children;
        }
        return result;
    }
    // Text node
    if (node.nodeType === 3) {
        const text = node.nodeValue /* c8 ignore next */ || "";
        if (!text.trim())
            return null;
        return {
            type: "text",
            attributes: {},
            value: text,
        };
    }
    // Processing instruction
    if (node.nodeType === 7) {
        return {
            type: "processing-instruction",
            attributes: { target: node.target },
            value: node.data /* c8 ignore next */ || undefined,
        };
    }
    // Comment
    if (node.nodeType === 8) {
        return {
            type: "comment",
            attributes: {},
            value: node.nodeValue /* c8 ignore next */ || "",
        };
    }
    // Document node - process children
    if (node.nodeType === 9) {
        const children = [];
        if (node.childNodes) {
            for (let i = 0; i < node.childNodes.length; i++) {
                const child = domToAst(node.childNodes[i]);
                if (child)
                    children.push(child);
            }
        }
        if (children.length === 1)
            return children[0];
        return {
            type: "root",
            attributes: {},
            children,
        };
    }
    return null;
}
export function parseXml(content) {
    try {
        const doc = new DOMParser().parseFromString(content, "text/xml");
        return domToAst(doc);
        /* c8 ignore next 3 -- DOMParser never throws on input */
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=xml.js.map