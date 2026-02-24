import type { AstNode, AstMatchConfig } from "./types.js";
/**
 * Matches a value against a pattern.
 * - string: exact match, or regex if wrapped in /pattern/flags
 * - boolean: true = value must exist (not undefined/null/empty), false = must not exist
 * - string[]: any-of match
 */
export declare function matchesPattern(value: any, pattern: string | boolean | string[]): boolean;
/**
 * Recursively extracts text content from a node.
 */
export declare function getNodeTextContent(node: AstNode): string;
/**
 * Checks if a node matches the given config criteria.
 */
export declare function nodeMatches(node: AstNode, config: AstMatchConfig): boolean;
/**
 * Extracts values from a node according to the extract config.
 * Returns a map like { "$1": "bash", "$2": "echo hello" }
 */
export declare function extractValues(node: AstNode, extractConfig: Record<string, string>): Record<string, string>;
export interface MatchResult {
    node: AstNode;
    position?: AstNode["position"];
    extracted: Record<string, string>;
    sortIndex: number;
}
/**
 * Depth-first traversal matching nodes against config.
 */
export declare function matchNodes(tree: AstNode, config: AstMatchConfig): MatchResult[];
//# sourceMappingURL=matcher.d.ts.map