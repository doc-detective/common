import type { AstNode, AstFormat } from "./types.js";
/**
 * Returns cached AST or parses and caches.
 * @param content - Source content to parse
 * @param format - AST format to use
 * @param cacheKey - Optional cache key (defaults to format)
 */
export declare function getOrParseAst(content: string, format: AstFormat, cacheKey?: string): AstNode | null;
/**
 * Clears the AST cache.
 */
export declare function clearAstCache(): void;
//# sourceMappingURL=cache.d.ts.map