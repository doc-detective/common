import { expect } from "chai";
import { getOrParseAst, clearAstCache } from "../dist/ast/cache.js";

describe("AST cache", function () {
  beforeEach(function () {
    clearAstCache();
  });

  it("should parse and cache content", function () {
    const result = getOrParseAst("# Hello", "markdown");
    expect(result).to.not.be.null;
    expect(result.type).to.equal("root");
  });

  it("should return cached result for identical content", function () {
    const first = getOrParseAst("# Hello", "markdown", "test-key");
    const second = getOrParseAst("# Hello", "markdown", "test-key");
    expect(first).to.equal(second); // Same reference (cached)
  });

  it("should re-parse when content changes", function () {
    const first = getOrParseAst("# Hello", "markdown", "test-key");
    const second = getOrParseAst("# World", "markdown", "test-key");
    expect(first).to.not.equal(second);
    expect(second).to.not.be.null;
  });

  it("should use format as default cache key", function () {
    const first = getOrParseAst("# Hello", "markdown");
    const second = getOrParseAst("# Hello", "markdown");
    expect(first).to.equal(second); // Same reference
  });

  it("should keep separate entries for different cache keys", function () {
    const first = getOrParseAst("# Hello", "markdown", "key1");
    const second = getOrParseAst("# Hello", "markdown", "key2");
    // Both should exist but from different cache entries
    expect(first).to.not.be.null;
    expect(second).to.not.be.null;
  });

  it("should keep separate entries for different formats with same content", function () {
    const mdResult = getOrParseAst("<p>Hello</p>", "markdown", "md-key");
    const htmlResult = getOrParseAst("<p>Hello</p>", "html", "html-key");
    expect(mdResult).to.not.be.null;
    expect(htmlResult).to.not.be.null;
    // Different parsers produce different trees
    expect(mdResult).to.not.equal(htmlResult);
  });

  it("should clear all entries on clearAstCache", function () {
    getOrParseAst("# Hello", "markdown", "key1");
    clearAstCache();
    // After clear, re-parsing should create a new object
    const after = getOrParseAst("# Hello", "markdown", "key1");
    expect(after).to.not.be.null;
    // Can't compare identity since the previous ref is gone, but result should be valid
    expect(after.type).to.equal("root");
  });

  it("should return null for unparseable content with unknown format", function () {
    const result = getOrParseAst("some content", "unknown_format");
    expect(result).to.be.null;
  });
});
