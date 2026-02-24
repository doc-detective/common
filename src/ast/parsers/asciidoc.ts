import asciidoctorFactory from "asciidoctor";
import { parseHtml } from "./html.js";
import type { AstNode } from "../types.js";

const Asciidoctor = (asciidoctorFactory as any)();

/**
 * Converts an Asciidoctor block (and its children) to our normalized AstNode format.
 * Block-level nodes use Asciidoctor's document model.
 * Inline content in paragraphs is parsed via HTML conversion.
 */
function blockToAst(block: any): AstNode {
  const context: string = block.getContext?.() || "unknown";
  const attributes: Record<string, any> = {};

  // Common attributes
  const title = block.getTitle?.();
  if (title != null) attributes.title = title;
  const level = block.getLevel?.();
  if (level != null) attributes.level = level;
  const id = block.getId?.();
  if (id != null) attributes.id = id;
  const style = block.getStyle?.();
  if (style != null) attributes.style = style;

  // Context-specific attributes
  if (context === "document") {
    const doctitle = block.getDoctitle?.();
    if (doctitle != null) attributes.doctitle = doctitle;
  }

  if (context === "listing") {
    const lang = block.getAttribute?.("language");
    if (lang != null) attributes.language = lang;
  }

  if (context === "image") {
    const target = block.getAttribute?.("target");
    if (target != null) attributes.target = target;
    const alt = block.getAttribute?.("alt");
    if (alt != null) attributes.alt = alt;
  }

  const result: AstNode = {
    type: context,
    attributes,
  };

  // For verbatim blocks (listing, literal), store source as value
  const contentModel = block.getContentModel?.();
  if (contentModel === "verbatim") {
    const source = block.getSource?.();
    if (source != null) result.value = source;
  }

  // Process children
  const children: AstNode[] = [];
  const blocks = block.getBlocks?.();
  if (blocks && blocks.length > 0) {
    for (const child of blocks) {
      children.push(blockToAst(child));
    }
  }

  // For "simple" content (paragraphs etc.), parse HTML to get inline nodes
  if (contentModel === "simple") {
    const html = block.convert?.();
    if (html) {
      const htmlTree = parseHtml(html);
      if (htmlTree && htmlTree.children) {
        children.push(...htmlTree.children);
      }
    }
  }

  if (children.length > 0) {
    result.children = children;
  }

  return result;
}

export function parseAsciidoc(content: string): AstNode | null {
  try {
    const doc = Asciidoctor.load(content, { safe: "secure" });
    return blockToAst(doc);
  /* c8 ignore next 3 -- asciidoctor.load never throws on string input */
  } catch {
    return null;
  }
}
