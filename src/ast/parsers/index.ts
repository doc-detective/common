import type { AstNode, AstFormat } from "../types.js";
import { parseMarkdown } from "./markdown.js";
import { parseHtml } from "./html.js";
import { parseXml } from "./xml.js";
import { parseAsciidoc } from "./asciidoc.js";
import { parseRst } from "./rst.js";

const parserMap: Record<AstFormat, (content: string) => AstNode | null> = {
  markdown: parseMarkdown,
  html: parseHtml,
  xml: parseXml,
  asciidoc: parseAsciidoc,
  rst: parseRst,
};

const formatMap: Record<string, AstFormat> = {
  md: "markdown",
  markdown: "markdown",
  mdx: "markdown",
  html: "html",
  htm: "html",
  xml: "xml",
  dita: "xml",
  ditamap: "xml",
  adoc: "asciidoc",
  asciidoc: "asciidoc",
  asc: "asciidoc",
  rst: "rst",
  rest: "rst",
};

export function getAstFormat(fileTypeOrExt: string): AstFormat | null {
  const lower = fileTypeOrExt.toLowerCase().replace(/^\./, "");
  return formatMap[lower] ?? null;
}

export function parseToAst(content: string, format: AstFormat): AstNode | null {
  const parser = parserMap[format];
  if (!parser) return null;
  return parser(content);
}

export { parseMarkdown } from "./markdown.js";
export { parseHtml } from "./html.js";
export { parseXml } from "./xml.js";
export { parseAsciidoc } from "./asciidoc.js";
export { parseRst } from "./rst.js";
