export type { AstNode, AstFormat, AstMatchConfig } from "./types.js";
export { parseToAst, getAstFormat, parseAsciidoc, parseRst } from "./parsers/index.js";
export { matchNodes, matchesPattern, nodeMatches, extractValues, getNodeTextContent, } from "./matcher.js";
export type { MatchResult } from "./matcher.js";
export { getOrParseAst, clearAstCache } from "./cache.js";
//# sourceMappingURL=index.d.ts.map