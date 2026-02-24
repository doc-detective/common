import { unified } from "unified";
import rehypeParse from "rehype-parse";
import type { AstNode } from "../types.js";

function normalizeNode(node: any): AstNode {
  const attributes: Record<string, any> = {};

  if (node.tagName) {
    attributes.tagName = node.tagName;
  }

  if (node.properties) {
    for (const [key, value] of Object.entries(node.properties)) {
      attributes[key] = value;
    }
  }

  const result: AstNode = {
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

export function parseHtml(content: string): AstNode | null {
  try {
    const tree = unified()
      .use(rehypeParse, { fragment: true })
      .parse(content);
    return normalizeNode(tree);
  /* c8 ignore next 3 -- unified+rehypeParse never throws on input */
  } catch {
    return null;
  }
}
