import { expect } from "chai";
import {
  matchesPattern,
  nodeMatches,
  extractValues,
  matchNodes,
  getNodeTextContent,
} from "../dist/ast/matcher.js";

describe("AST matcher", function () {
  // ========== matchesPattern ==========
  describe("matchesPattern", function () {
    it("should match exact string", function () {
      expect(matchesPattern("hello", "hello")).to.be.true;
    });

    it("should not match different string", function () {
      expect(matchesPattern("hello", "world")).to.be.false;
    });

    it("should match regex pattern /pattern/", function () {
      expect(matchesPattern("javascript", "/java/")).to.be.true;
    });

    it("should match regex pattern with flags", function () {
      expect(matchesPattern("JavaScript", "/javascript/i")).to.be.true;
    });

    it("should not match non-matching regex", function () {
      expect(matchesPattern("python", "/java/")).to.be.false;
    });

    it("should match array any-of (first item)", function () {
      expect(matchesPattern("bash", ["bash", "python", "js"])).to.be.true;
    });

    it("should match array any-of (last item)", function () {
      expect(matchesPattern("js", ["bash", "python", "js"])).to.be.true;
    });

    it("should not match array when value absent", function () {
      expect(matchesPattern("ruby", ["bash", "python", "js"])).to.be.false;
    });

    it("should match boolean true when value exists", function () {
      expect(matchesPattern("something", true)).to.be.true;
    });

    it("should not match boolean true when value is empty", function () {
      expect(matchesPattern("", true)).to.be.false;
    });

    it("should not match boolean true when value is null", function () {
      expect(matchesPattern(null, true)).to.be.false;
    });

    it("should not match boolean true when value is undefined", function () {
      expect(matchesPattern(undefined, true)).to.be.false;
    });

    it("should match boolean false when value is empty", function () {
      expect(matchesPattern("", false)).to.be.true;
    });

    it("should match boolean false when value is null", function () {
      expect(matchesPattern(null, false)).to.be.true;
    });

    it("should match boolean false when value is undefined", function () {
      expect(matchesPattern(undefined, false)).to.be.true;
    });

    it("should not match boolean false when value exists", function () {
      expect(matchesPattern("something", false)).to.be.false;
    });

    it("should coerce null value to empty string for string match", function () {
      expect(matchesPattern(null, "")).to.be.true;
    });

    it("should coerce undefined value to empty string for string match", function () {
      expect(matchesPattern(undefined, "")).to.be.true;
    });

    it("should return false for unsupported pattern type", function () {
      expect(matchesPattern("val", 42)).to.be.false;
    });

    it("should coerce null value to empty string for array match", function () {
      expect(matchesPattern(null, ["", "bash"])).to.be.true;
      expect(matchesPattern(null, ["bash", "python"])).to.be.false;
    });

    it("should coerce null value for regex match", function () {
      expect(matchesPattern(null, "/^$/")).to.be.true;
      expect(matchesPattern(null, "/bash/")).to.be.false;
    });
  });

  // ========== getNodeTextContent ==========
  describe("getNodeTextContent", function () {
    it("should return value when present", function () {
      expect(getNodeTextContent({ type: "text", attributes: {}, value: "hello" })).to.equal("hello");
    });

    it("should recursively extract from children", function () {
      const node = {
        type: "paragraph",
        attributes: {},
        children: [
          { type: "text", attributes: {}, value: "hello " },
          { type: "text", attributes: {}, value: "world" },
        ],
      };
      expect(getNodeTextContent(node)).to.equal("hello world");
    });

    it("should return empty string for empty node", function () {
      expect(getNodeTextContent({ type: "empty", attributes: {} })).to.equal("");
    });
  });

  // ========== nodeMatches ==========
  describe("nodeMatches", function () {
    const codeNode = {
      type: "code",
      attributes: { lang: "bash" },
      value: "echo hello",
    };

    it("should match by nodeType string", function () {
      expect(nodeMatches(codeNode, { nodeType: "code" })).to.be.true;
    });

    it("should not match wrong nodeType string", function () {
      expect(nodeMatches(codeNode, { nodeType: "heading" })).to.be.false;
    });

    it("should match by nodeType array", function () {
      expect(nodeMatches(codeNode, { nodeType: ["code", "heading"] })).to.be.true;
    });

    it("should not match nodeType array without match", function () {
      expect(nodeMatches(codeNode, { nodeType: ["heading", "paragraph"] })).to.be.false;
    });

    it("should match by attributes", function () {
      expect(nodeMatches(codeNode, { attributes: { lang: "bash" } })).to.be.true;
    });

    it("should not match wrong attributes", function () {
      expect(nodeMatches(codeNode, { attributes: { lang: "python" } })).to.be.false;
    });

    it("should match by content string", function () {
      expect(nodeMatches(codeNode, { content: "echo hello" })).to.be.true;
    });

    it("should not match wrong content string", function () {
      expect(nodeMatches(codeNode, { content: "ls" })).to.be.false;
    });

    it("should match by content boolean true", function () {
      expect(nodeMatches(codeNode, { content: true })).to.be.true;
    });

    it("should not match content boolean true on empty node", function () {
      const emptyNode = { type: "code", attributes: {} };
      expect(nodeMatches(emptyNode, { content: true })).to.be.false;
    });

    it("should match with children matchers", function () {
      const parent = {
        type: "element",
        attributes: {},
        children: [
          { type: "text", attributes: {}, value: "hello" },
        ],
      };
      expect(
        nodeMatches(parent, {
          children: [{ nodeType: "text", content: true }],
        })
      ).to.be.true;
    });

    it("should not match when child matcher fails", function () {
      const parent = {
        type: "element",
        attributes: {},
        children: [
          { type: "text", attributes: {}, value: "hello" },
        ],
      };
      expect(
        nodeMatches(parent, {
          children: [{ nodeType: "code" }],
        })
      ).to.be.false;
    });

    it("should not match children when node has no children", function () {
      const leaf = { type: "text", attributes: {}, value: "hi" };
      expect(
        nodeMatches(leaf, {
          children: [{ nodeType: "text" }],
        })
      ).to.be.false;
    });

    it("should not match children when node has empty children", function () {
      const leaf = { type: "element", attributes: {}, children: [] };
      expect(
        nodeMatches(leaf, {
          children: [{ nodeType: "text" }],
        })
      ).to.be.false;
    });

    it("should match with empty config (matches everything)", function () {
      expect(nodeMatches(codeNode, {})).to.be.true;
    });

    it("should match combined nodeType + attributes + content", function () {
      expect(
        nodeMatches(codeNode, {
          nodeType: "code",
          attributes: { lang: "bash" },
          content: "echo hello",
        })
      ).to.be.true;
    });
  });

  // ========== extractValues ==========
  describe("extractValues", function () {
    it("should extract simple path", function () {
      const node = { type: "code", attributes: { lang: "bash" }, value: "echo hi" };
      const result = extractValues(node, { "$1": "attributes.lang" });
      expect(result).to.deep.equal({ "$1": "bash" });
    });

    it("should extract nested dot-path", function () {
      const node = { type: "code", attributes: { lang: "bash" }, value: "echo" };
      const result = extractValues(node, { "$2": "value" });
      expect(result).to.deep.equal({ "$2": "echo" });
    });

    it("should handle missing path", function () {
      const node = { type: "code", attributes: {} };
      const result = extractValues(node, { "$1": "attributes.lang" });
      expect(result).to.deep.equal({});
    });

    it("should extract multiple values", function () {
      const node = { type: "code", attributes: { lang: "python" }, value: "print('hi')" };
      const result = extractValues(node, {
        "$1": "attributes.lang",
        "$2": "value",
      });
      expect(result).to.deep.equal({ "$1": "python", "$2": "print('hi')" });
    });

    it("should handle null intermediate path", function () {
      const node = { type: "code", attributes: {} };
      const result = extractValues(node, { "$1": "nonexistent.deep.path" });
      expect(result).to.deep.equal({});
    });
  });

  // ========== matchNodes ==========
  describe("matchNodes", function () {
    const tree = {
      type: "root",
      attributes: {},
      position: {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 10, column: 1, offset: 100 },
      },
      children: [
        {
          type: "heading",
          attributes: { depth: 1 },
          position: {
            start: { line: 1, column: 1, offset: 0 },
            end: { line: 1, column: 10, offset: 9 },
          },
          children: [{ type: "text", attributes: {}, value: "Title" }],
        },
        {
          type: "code",
          attributes: { lang: "bash" },
          value: "echo hello",
          position: {
            start: { line: 3, column: 1, offset: 20 },
            end: { line: 5, column: 4, offset: 50 },
          },
        },
        {
          type: "code",
          attributes: { lang: "python" },
          value: "print('world')",
          position: {
            start: { line: 7, column: 1, offset: 60 },
            end: { line: 9, column: 4, offset: 90 },
          },
        },
      ],
    };

    it("should find single match", function () {
      const results = matchNodes(tree, { nodeType: "code", attributes: { lang: "bash" } });
      expect(results).to.have.length(1);
      expect(results[0].node.value).to.equal("echo hello");
    });

    it("should find multiple matches", function () {
      const results = matchNodes(tree, { nodeType: "code" });
      expect(results).to.have.length(2);
    });

    it("should return no matches for non-existent type", function () {
      const results = matchNodes(tree, { nodeType: "image" });
      expect(results).to.have.length(0);
    });

    it("should extract values from matched nodes", function () {
      const results = matchNodes(tree, {
        nodeType: "code",
        extract: { "$1": "attributes.lang", "$2": "value" },
      });
      expect(results).to.have.length(2);
      expect(results[0].extracted).to.deep.equal({ "$1": "bash", "$2": "echo hello" });
      expect(results[1].extracted).to.deep.equal({ "$1": "python", "$2": "print('world')" });
    });

    it("should order by sortIndex (position offset)", function () {
      const results = matchNodes(tree, { nodeType: "code" });
      expect(results[0].sortIndex).to.be.below(results[1].sortIndex);
    });

    it("should use results.length as sortIndex when position is missing", function () {
      const noPos = {
        type: "root",
        attributes: {},
        children: [
          { type: "code", attributes: { lang: "bash" }, value: "cmd" },
        ],
      };
      const results = matchNodes(noPos, { nodeType: "code" });
      expect(results).to.have.length(1);
      // sortIndex should be 0 (results.length was 0 when matched)
      expect(results[0].sortIndex).to.equal(0);
    });

    it("should match nested nodes", function () {
      const results = matchNodes(tree, { nodeType: "text" });
      expect(results).to.have.length(1);
      expect(results[0].node.value).to.equal("Title");
    });

    it("should include position in results", function () {
      const results = matchNodes(tree, { nodeType: "code", attributes: { lang: "bash" } });
      expect(results[0].position).to.deep.equal({
        start: { line: 3, column: 1, offset: 20 },
        end: { line: 5, column: 4, offset: 50 },
      });
    });

    it("should return empty extracted when no extract config", function () {
      const results = matchNodes(tree, { nodeType: "heading" });
      expect(results).to.have.length(1);
      expect(results[0].extracted).to.deep.equal({});
    });
  });
});
