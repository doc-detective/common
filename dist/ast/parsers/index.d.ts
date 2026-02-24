import type { AstNode, AstFormat } from "../types.js";
export declare function getAstFormat(fileTypeOrExt: string): AstFormat | null;
export declare function parseToAst(content: string, format: AstFormat): AstNode | null;
export { parseMarkdown } from "./markdown.js";
export { parseHtml } from "./html.js";
export { parseXml } from "./xml.js";
export { parseAsciidoc } from "./asciidoc.js";
export { parseRst } from "./rst.js";
//# sourceMappingURL=index.d.ts.map