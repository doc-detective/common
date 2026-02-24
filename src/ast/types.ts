export interface AstNode {
  type: string;
  attributes: Record<string, any>;
  value?: string;
  children?: AstNode[];
  position?: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
  };
}

export type AstFormat = "markdown" | "html" | "xml" | "asciidoc" | "rst";

export interface AstMatchConfig {
  nodeType?: string | string[];
  attributes?: Record<string, string | boolean | string[]>;
  content?: string | boolean;
  children?: AstMatchConfig[];
  extract?: Record<string, string>;
}
