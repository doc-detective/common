import type { AstNode, AstFormat } from "./types.js";
import { parseToAst } from "./parsers/index.js";

/**
 * Simple DJB2 hash for content fingerprinting.
 */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

interface CacheEntry {
  contentHash: string;
  tree: AstNode;
}

const cache = new Map<string, CacheEntry>();

/**
 * Returns cached AST or parses and caches.
 * @param content - Source content to parse
 * @param format - AST format to use
 * @param cacheKey - Optional cache key (defaults to format)
 */
export function getOrParseAst(
  content: string,
  format: AstFormat,
  cacheKey?: string
): AstNode | null {
  const key = cacheKey ?? format;
  const contentHash = djb2Hash(content);

  const existing = cache.get(key);
  if (existing && existing.contentHash === contentHash) {
    return existing.tree;
  }

  const tree = parseToAst(content, format);
  if (tree) {
    cache.set(key, { contentHash, tree });
  }
  return tree;
}

/**
 * Clears the AST cache.
 */
export function clearAstCache(): void {
  cache.clear();
}
