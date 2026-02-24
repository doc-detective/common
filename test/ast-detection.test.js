/**
 * End-to-end AST-based test detection across all file formats (Markdown, HTML, XML/DITA).
 *
 * Validates that parseContent correctly detects and extracts steps from realistic
 * document content using AST matching, regex matching, and combined AST+regex.
 *
 * Scenarios covered per format:
 *   - Code blocks with language tags
 *   - Bold (on-screen) formatting
 *   - Links / cross-references
 *   - Emphasis / italic text
 *   - Headings
 *   - Images
 *   - AST + regex combined
 *   - Multiple markup rules in one file type
 *   - Content regex filtering within AST matches
 */

import { expect } from "chai";
import { parseContent } from "../dist/detectTests.js";
import { clearAstCache } from "../dist/ast/cache.js";

// ─── Test fixtures ───────────────────────────────────────────────────────────

/** Helper: wraps content in an inline test-start sentinel for a given format. */
function mdWrap(body) {
  return '<!-- test {"steps": []} -->\n' + body;
}
function htmlWrap(body) {
  return '<!-- test {"steps": []} -->\n' + body;
}
function xmlWrap(body) {
  return '<!-- test {"steps": []} -->\n' + body;
}

const inlineStatements = {
  testStart: ["<!-- test (.*?)-->"],
  testEnd: ["<!-- test end -->"],
  ignoreStart: ["<!-- test ignore -->"],
  ignoreEnd: ["<!-- test ignore end -->"],
};

// ── Markdown file types ──────────────────────────────────────────────────────

const mdCodeBlock = {
  extensions: ["md"],
  inlineStatements,
  markup: [
    {
      name: "codeBlock",
      ast: {
        nodeType: "code",
        attributes: { lang: ["javascript", "typescript", "python", "bash", "shell"] },
        extract: { "$1": "attributes.lang", "$2": "value" },
      },
      actions: [{ runCode: { language: "$1", code: "$2" } }],
    },
  ],
};

const mdBold = {
  extensions: ["md"],
  inlineStatements,
  markup: [
    {
      name: "boldText",
      ast: {
        nodeType: "strong",
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const mdEmphasis = {
  extensions: ["md"],
  inlineStatements,
  markup: [
    {
      name: "emphasisText",
      ast: {
        nodeType: "emphasis",
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const mdLink = {
  extensions: ["md"],
  inlineStatements,
  markup: [
    {
      name: "link",
      ast: {
        nodeType: "link",
        extract: { "$1": "attributes.url" },
      },
      actions: [{ checkLink: { url: "$1" } }],
    },
  ],
};

const mdImage = {
  extensions: ["md"],
  inlineStatements,
  markup: [
    {
      name: "image",
      ast: {
        nodeType: "image",
        extract: { "$1": "attributes.url", "$2": "attributes.alt" },
      },
      actions: [{ screenshot: { path: "$1" } }],
    },
  ],
};

const mdHeading = {
  extensions: ["md"],
  inlineStatements,
  markup: [
    {
      name: "heading",
      ast: {
        nodeType: "heading",
        attributes: { depth: "1" },
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const mdInlineCode = {
  extensions: ["md"],
  inlineStatements,
  markup: [
    {
      name: "inlineCode",
      ast: {
        nodeType: "inlineCode",
        content: true,
        extract: { "$1": "value" },
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const mdCodeWithRegex = {
  extensions: ["md"],
  inlineStatements,
  markup: [
    {
      name: "codeWithUrl",
      ast: {
        nodeType: "code",
        attributes: { lang: "javascript" },
        extract: { "$1": "attributes.lang", "$2": "value" },
      },
      regex: ["(https?://[^\\s'\"]+)"],
      actions: [{ checkLink: { url: "$1" } }],
    },
  ],
};

const mdMultiMarkup = {
  extensions: ["md"],
  inlineStatements,
  markup: [
    {
      name: "codeBlock",
      ast: {
        nodeType: "code",
        attributes: { lang: "bash" },
        extract: { "$1": "attributes.lang", "$2": "value" },
      },
      actions: [{ runCode: { language: "$1", code: "$2" } }],
    },
    {
      name: "link",
      ast: {
        nodeType: "link",
        extract: { "$1": "attributes.url" },
      },
      actions: [{ checkLink: { url: "$1" } }],
    },
    {
      name: "bold",
      ast: {
        nodeType: "strong",
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const mdCodeBlockBatch = {
  extensions: ["md"],
  inlineStatements,
  markup: [
    {
      name: "batchCode",
      ast: {
        nodeType: "code",
        attributes: { lang: "bash" },
        extract: { "$1": "attributes.lang", "$2": "value" },
      },
      batchMatches: true,
      actions: [{ runShell: { command: "$1" } }],
    },
  ],
};

const mdBlockquote = {
  extensions: ["md"],
  inlineStatements,
  markup: [
    {
      name: "blockquote",
      ast: {
        nodeType: "blockquote",
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const mdCodeRegexFilter = {
  extensions: ["md"],
  inlineStatements,
  markup: [
    {
      name: "jsCodeWithConsoleLog",
      ast: {
        nodeType: "code",
        attributes: { lang: "javascript" },
      },
      regex: ["(console\\.log\\([^)]+\\))"],
      actions: [{ runCode: { language: "javascript", code: "$1" } }],
    },
  ],
};

// ── HTML file types ──────────────────────────────────────────────────────────

const htmlCodeBlock = {
  extensions: ["html"],
  inlineStatements,
  markup: [
    {
      name: "codeBlock",
      ast: {
        nodeType: "element",
        attributes: { tagName: "code" },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const htmlBold = {
  extensions: ["html"],
  inlineStatements,
  markup: [
    {
      name: "boldText",
      ast: {
        nodeType: "element",
        attributes: { tagName: ["strong", "b"] },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const htmlEmphasis = {
  extensions: ["html"],
  inlineStatements,
  markup: [
    {
      name: "emphasis",
      ast: {
        nodeType: "element",
        attributes: { tagName: ["em", "i"] },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const htmlLink = {
  extensions: ["html"],
  inlineStatements,
  markup: [
    {
      name: "link",
      ast: {
        nodeType: "element",
        attributes: { tagName: "a", href: true },
        extract: { "$1": "attributes.href" },
      },
      actions: [{ checkLink: { url: "$1" } }],
    },
  ],
};

const htmlImage = {
  extensions: ["html"],
  inlineStatements,
  markup: [
    {
      name: "image",
      ast: {
        nodeType: "element",
        attributes: { tagName: "img", src: true },
        extract: { "$1": "attributes.src", "$2": "attributes.alt" },
      },
      actions: [{ screenshot: { path: "$1" } }],
    },
  ],
};

const htmlMultiMarkup = {
  extensions: ["html"],
  inlineStatements,
  markup: [
    {
      name: "bold",
      ast: {
        nodeType: "element",
        attributes: { tagName: ["strong", "b"] },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
    {
      name: "link",
      ast: {
        nodeType: "element",
        attributes: { tagName: "a", href: true },
        extract: { "$1": "attributes.href" },
      },
      actions: [{ checkLink: { url: "$1" } }],
    },
  ],
};

const htmlCodeWithRegex = {
  extensions: ["html"],
  inlineStatements,
  markup: [
    {
      name: "codeWithImport",
      ast: {
        nodeType: "element",
        attributes: { tagName: "code" },
        content: true,
      },
      regex: ["(import .+)"],
      actions: [{ find: "$1" }],
    },
  ],
};

const htmlHeading = {
  extensions: ["html"],
  inlineStatements,
  markup: [
    {
      name: "heading",
      ast: {
        nodeType: "element",
        attributes: { tagName: ["h1", "h2", "h3", "h4", "h5", "h6"] },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const htmlInlineCode = {
  extensions: ["html"],
  inlineStatements,
  markup: [
    {
      name: "inlineCode",
      ast: {
        nodeType: "element",
        attributes: { tagName: "code" },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const htmlBlockquote = {
  extensions: ["html"],
  inlineStatements,
  markup: [
    {
      name: "blockquote",
      ast: {
        nodeType: "element",
        attributes: { tagName: "blockquote" },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const htmlCodeBlockBatch = {
  extensions: ["html"],
  inlineStatements,
  markup: [
    {
      name: "batchCode",
      ast: {
        nodeType: "element",
        attributes: { tagName: "code" },
        content: true,
      },
      batchMatches: true,
      actions: [{ find: "$1" }],
    },
  ],
};

const htmlCodeRegexFilter = {
  extensions: ["html"],
  inlineStatements,
  markup: [
    {
      name: "jsCodeWithConsoleLog",
      ast: {
        nodeType: "element",
        attributes: { tagName: "code" },
        content: true,
      },
      regex: ["(console\\.log\\([^)]+\\))"],
      actions: [{ runCode: { language: "javascript", code: "$1" } }],
    },
  ],
};

// ── XML/DITA file types ──────────────────────────────────────────────────────

const xmlCodeBlock = {
  extensions: ["xml", "dita"],
  inlineStatements,
  markup: [
    {
      name: "codeblock",
      ast: {
        nodeType: "element",
        attributes: { tagName: "codeblock", outputclass: true },
        extract: { "$1": "attributes.outputclass" },
      },
      actions: [{ runCode: { language: "$1", code: "$0" } }],
    },
  ],
};

const xmlBold = {
  extensions: ["xml", "dita"],
  inlineStatements,
  markup: [
    {
      name: "boldText",
      ast: {
        nodeType: "element",
        attributes: { tagName: ["b", "uicontrol"] },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const xmlXref = {
  extensions: ["xml", "dita"],
  inlineStatements,
  markup: [
    {
      name: "xref",
      ast: {
        nodeType: "element",
        attributes: { tagName: "xref", href: true },
        extract: { "$1": "attributes.href" },
      },
      actions: [{ checkLink: { url: "$1" } }],
    },
  ],
};

const xmlMultiMarkup = {
  extensions: ["xml", "dita"],
  inlineStatements,
  markup: [
    {
      name: "codeblock",
      ast: {
        nodeType: "element",
        attributes: { tagName: "codeblock", outputclass: true },
        extract: { "$1": "attributes.outputclass" },
      },
      actions: [{ runCode: { language: "$1", code: "$0" } }],
    },
    {
      name: "bold",
      ast: {
        nodeType: "element",
        attributes: { tagName: ["b", "uicontrol"] },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
    {
      name: "xref",
      ast: {
        nodeType: "element",
        attributes: { tagName: "xref", href: true },
        extract: { "$1": "attributes.href" },
      },
      actions: [{ checkLink: { url: "$1" } }],
    },
  ],
};

const xmlCodeWithRegex = {
  extensions: ["xml", "dita"],
  inlineStatements,
  markup: [
    {
      name: "codeblockWithPattern",
      ast: {
        nodeType: "element",
        attributes: { tagName: "codeblock" },
        content: true,
      },
      regex: ["(SELECT .+)"],
      actions: [{ find: "$1" }],
    },
  ],
};

const xmlEmphasis = {
  extensions: ["xml", "dita"],
  inlineStatements,
  markup: [
    {
      name: "emphasis",
      ast: {
        nodeType: "element",
        attributes: { tagName: ["i", "term"] },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const xmlImage = {
  extensions: ["xml", "dita"],
  inlineStatements,
  markup: [
    {
      name: "image",
      ast: {
        nodeType: "element",
        attributes: { tagName: "image", href: true },
        extract: { "$1": "attributes.href" },
      },
      actions: [{ screenshot: { path: "$1" } }],
    },
  ],
};

const xmlHeading = {
  extensions: ["xml", "dita"],
  inlineStatements,
  markup: [
    {
      name: "heading",
      ast: {
        nodeType: "element",
        attributes: { tagName: "title" },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const xmlBlockquote = {
  extensions: ["xml", "dita"],
  inlineStatements,
  markup: [
    {
      name: "blockquote",
      ast: {
        nodeType: "element",
        attributes: { tagName: "lq" },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const xmlInlineCode = {
  extensions: ["xml", "dita"],
  inlineStatements,
  markup: [
    {
      name: "inlineCode",
      ast: {
        nodeType: "element",
        attributes: { tagName: "codeph" },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const xmlCodeBlockBatch = {
  extensions: ["xml", "dita"],
  inlineStatements,
  markup: [
    {
      name: "batchCodeblock",
      ast: {
        nodeType: "element",
        attributes: { tagName: "codeblock", outputclass: true },
      },
      batchMatches: true,
      actions: [{ runShell: { command: "$1" } }],
    },
  ],
};

const xmlCodeRegexFilter = {
  extensions: ["xml", "dita"],
  inlineStatements,
  markup: [
    {
      name: "codeblockWithConsoleLog",
      ast: {
        nodeType: "element",
        attributes: { tagName: "codeblock" },
        content: true,
      },
      regex: ["(console\\.log\\([^)]+\\))"],
      actions: [{ runCode: { language: "javascript", code: "$1" } }],
    },
  ],
};

// ─── Test content fixtures ───────────────────────────────────────────────────

const mdContent = {
  jsCodeBlock:
    '```javascript\nconsole.log("hello world");\n```',
  pyCodeBlock:
    "```python\nprint('hello world')\n```",
  bashCodeBlock:
    "```bash\nnpm install doc-detective\n```",
  boldText:
    "Click **Save** to apply your changes.",
  emphasisText:
    "Select *Continue* to proceed.",
  link:
    "Visit [the documentation](https://docs.example.com).",
  multipleLinks:
    "See [API docs](https://api.example.com) and [user guide](https://guide.example.com).",
  image:
    "![Screenshot of settings](images/settings.png)",
  heading:
    "# Getting Started",
  inlineCode:
    "Run the `npm install` command.",
  codeWithUrl:
    "```javascript\nfetch('https://api.example.com/data');\n```",
  multiMarkup:
    "```bash\necho hello\n```\n\nVisit [docs](https://docs.example.com).\n\nClick **Next** to continue.",
  multipleBashBlocks:
    "```bash\necho one\n```\n\n```bash\necho two\n```",
  blockquote:
    "> Important: back up your data first.",
  codeRegexFilter:
    '```javascript\nconst x = 1;\nconsole.log("found it");\nconst y = 2;\n```',
  codeRegexNoMatch:
    "```javascript\nconst x = 1;\n```",
  boldAndEmphasis:
    "Click **Save**, then *Continue*.",
  multipleCodeLangs:
    '```javascript\nconsole.log("js");\n```\n\n```python\nprint("py")\n```',
};

const htmlContent = {
  codeBlock:
    '<pre><code class="language-javascript">const x = 1;</code></pre>',
  boldStrong:
    "<p>Click <strong>Save</strong> to apply.</p>",
  boldB:
    "<p>Click <b>Save</b> to apply.</p>",
  emphasis:
    "<p>Select <em>Continue</em> to proceed.</p>",
  link:
    '<p>Visit <a href="https://docs.example.com">the docs</a>.</p>',
  multipleLinks:
    '<a href="https://a.com">A</a><a href="https://b.com">B</a>',
  image:
    '<img src="images/screenshot.png" alt="Settings page" />',
  multiMarkup:
    '<p>Click <strong>Next</strong>, then visit <a href="https://docs.example.com">docs</a>.</p>',
  codeWithImport:
    "<pre><code>import express from 'express';\nconst app = express();</code></pre>",
  codeNoImport:
    "<pre><code>const app = express();</code></pre>",
  multipleCodeBlocks:
    "<pre><code>const x = 1;</code></pre><pre><code>const y = 2;</code></pre>",
  heading:
    "<h1>Getting Started</h1>",
  inlineCode:
    "<p>Run <code>npm install</code> to set up.</p>",
  blockquote:
    "<blockquote><p>Back up your data first.</p></blockquote>",
  multipleBashBlocks:
    "<pre><code>echo one</code></pre><pre><code>echo two</code></pre>",
  boldAndEmphasis:
    '<p>Click <strong>Save</strong>, then <em>Continue</em>.</p>',
  codeRegexFilter:
    '<pre><code>const x = 1;\nconsole.log("found it");\nconst y = 2;</code></pre>',
  codeRegexNoMatch:
    "<pre><code>const x = 1;</code></pre>",
};

const xmlContent = {
  codeblock:
    '<topic id="t1"><body><codeblock outputclass="javascript">const x = 1;</codeblock></body></topic>',
  bold:
    '<topic id="t2"><body><p>Click <b>Save</b> to apply.</p></body></topic>',
  uicontrol:
    '<topic id="t3"><body><p>Click <uicontrol>Save</uicontrol> to apply.</p></body></topic>',
  xref:
    '<topic id="t4"><body><p>See <xref href="https://docs.example.com" format="html">docs</xref>.</p></body></topic>',
  multiMarkup:
    '<topic id="t5"><body><codeblock outputclass="bash">echo hi</codeblock><p>Click <uicontrol>Next</uicontrol>, see <xref href="https://docs.example.com" format="html">docs</xref>.</p></body></topic>',
  codeWithSql:
    '<topic id="t6"><body><codeblock>SELECT * FROM users WHERE active = 1;</codeblock></body></topic>',
  codeNoSql:
    '<topic id="t7"><body><codeblock>echo hello</codeblock></body></topic>',
  multipleCodeblocks:
    '<topic id="t8"><body><codeblock outputclass="javascript">const x = 1;</codeblock><codeblock outputclass="python">print(42)</codeblock></body></topic>',
  emphasis:
    '<topic id="t9"><body><p>Select <i>Continue</i> to proceed.</p></body></topic>',
  multipleXrefs:
    '<topic id="t10"><body><p>See <xref href="https://api.example.com" format="html">API</xref> and <xref href="https://guide.example.com" format="html">guide</xref>.</p></body></topic>',
  image:
    '<topic id="t11"><body><image href="images/screenshot.png"><alt>Settings</alt></image></body></topic>',
  heading:
    '<topic id="t12"><title>Getting Started</title><body><p>Content.</p></body></topic>',
  blockquote:
    '<topic id="t13"><body><lq>Back up your data first.</lq></body></topic>',
  multipleBashCodeblocks:
    '<topic id="t14"><body><codeblock outputclass="bash">echo one</codeblock><codeblock outputclass="bash">echo two</codeblock></body></topic>',
  boldAndEmphasis:
    '<topic id="t15"><body><p>Click <b>Save</b>, then <i>Continue</i>.</p></body></topic>',
  inlineCode:
    '<topic id="t16"><body><p>Run <codeph>npm install</codeph> to set up.</p></body></topic>',
  codeRegexFilter:
    '<topic id="t17"><body><codeblock>const x = 1;\nconsole.log("found it");\nconst y = 2;</codeblock></body></topic>',
  codeRegexNoMatch:
    '<topic id="t18"><body><codeblock>const x = 1;</codeblock></body></topic>',
};

// ── AsciiDoc file types ──────────────────────────────────────────────────────

function adocWrap(body) {
  return '<!-- test {"steps": []} -->\n\n' + body;
}

const adocCodeBlock = {
  extensions: ["adoc"],
  inlineStatements,
  markup: [
    {
      name: "codeBlock",
      ast: {
        nodeType: "listing",
        attributes: { language: ["javascript", "typescript", "python", "bash", "shell"] },
        extract: { "$1": "attributes.language", "$2": "value" },
      },
      actions: [{ runCode: { language: "$1", code: "$2" } }],
    },
  ],
};

const adocBold = {
  extensions: ["adoc"],
  inlineStatements,
  markup: [
    {
      name: "boldText",
      ast: {
        nodeType: "element",
        attributes: { tagName: "strong" },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const adocEmphasis = {
  extensions: ["adoc"],
  inlineStatements,
  markup: [
    {
      name: "emphasisText",
      ast: {
        nodeType: "element",
        attributes: { tagName: "em" },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const adocLink = {
  extensions: ["adoc"],
  inlineStatements,
  markup: [
    {
      name: "link",
      ast: {
        nodeType: "element",
        attributes: { tagName: "a", href: true },
        extract: { "$1": "attributes.href" },
      },
      actions: [{ checkLink: { url: "$1" } }],
    },
  ],
};

const adocImage = {
  extensions: ["adoc"],
  inlineStatements,
  markup: [
    {
      name: "image",
      ast: {
        nodeType: "image",
        extract: { "$1": "attributes.target", "$2": "attributes.alt" },
      },
      actions: [{ screenshot: { path: "$1" } }],
    },
  ],
};

const adocMultiMarkup = {
  extensions: ["adoc"],
  inlineStatements,
  markup: [
    {
      name: "codeBlock",
      ast: {
        nodeType: "listing",
        attributes: { language: "bash" },
        extract: { "$1": "attributes.language", "$2": "value" },
      },
      actions: [{ runCode: { language: "$1", code: "$2" } }],
    },
    {
      name: "bold",
      ast: {
        nodeType: "element",
        attributes: { tagName: "strong" },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
    {
      name: "link",
      ast: {
        nodeType: "element",
        attributes: { tagName: "a", href: true },
        extract: { "$1": "attributes.href" },
      },
      actions: [{ checkLink: { url: "$1" } }],
    },
  ],
};

const adocCodeWithRegex = {
  extensions: ["adoc"],
  inlineStatements,
  markup: [
    {
      name: "codeWithUrl",
      ast: {
        nodeType: "listing",
        attributes: { language: "javascript" },
        extract: { "$1": "attributes.language", "$2": "value" },
      },
      regex: ["(https?://[^\\s'\"]+)"],
      actions: [{ checkLink: { url: "$1" } }],
    },
  ],
};

const adocHeading = {
  extensions: ["adoc"],
  inlineStatements,
  markup: [
    {
      name: "heading",
      ast: {
        nodeType: "section",
        attributes: { level: "1" },
        extract: { "$1": "attributes.title" },
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const adocInlineCode = {
  extensions: ["adoc"],
  inlineStatements,
  markup: [
    {
      name: "inlineCode",
      ast: {
        nodeType: "element",
        attributes: { tagName: "code" },
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const adocBlockquote = {
  extensions: ["adoc"],
  inlineStatements,
  markup: [
    {
      name: "blockquote",
      ast: {
        nodeType: "quote",
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const adocCodeBlockBatch = {
  extensions: ["adoc"],
  inlineStatements,
  markup: [
    {
      name: "batchCode",
      ast: {
        nodeType: "listing",
        attributes: { language: "bash" },
        extract: { "$1": "attributes.language", "$2": "value" },
      },
      batchMatches: true,
      actions: [{ runShell: { command: "$1" } }],
    },
  ],
};

const adocCodeRegexFilter = {
  extensions: ["adoc"],
  inlineStatements,
  markup: [
    {
      name: "jsCodeWithConsoleLog",
      ast: {
        nodeType: "listing",
        attributes: { language: "javascript" },
      },
      regex: ["(console\\.log\\([^)]+\\))"],
      actions: [{ runCode: { language: "javascript", code: "$1" } }],
    },
  ],
};

// ── RST file types ───────────────────────────────────────────────────────────

function rstWrap(body) {
  return '<!-- test {"steps": []} -->\n\n' + body;
}

const rstCodeBlock = {
  extensions: ["rst"],
  inlineStatements,
  markup: [
    {
      name: "codeBlock",
      ast: {
        nodeType: "code-block",
        attributes: { language: ["javascript", "typescript", "python", "bash", "shell"] },
        extract: { "$1": "attributes.language", "$2": "value" },
      },
      actions: [{ runCode: { language: "$1", code: "$2" } }],
    },
  ],
};

const rstBold = {
  extensions: ["rst"],
  inlineStatements,
  markup: [
    {
      name: "boldText",
      ast: {
        nodeType: "strong",
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const rstEmphasis = {
  extensions: ["rst"],
  inlineStatements,
  markup: [
    {
      name: "emphasisText",
      ast: {
        nodeType: "emphasis",
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const rstLink = {
  extensions: ["rst"],
  inlineStatements,
  markup: [
    {
      name: "link",
      ast: {
        nodeType: "reference",
        extract: { "$1": "attributes.url" },
      },
      actions: [{ checkLink: { url: "$1" } }],
    },
  ],
};

const rstImage = {
  extensions: ["rst"],
  inlineStatements,
  markup: [
    {
      name: "image",
      ast: {
        nodeType: "image",
        extract: { "$1": "attributes.target", "$2": "attributes.alt" },
      },
      actions: [{ screenshot: { path: "$1" } }],
    },
  ],
};

const rstMultiMarkup = {
  extensions: ["rst"],
  inlineStatements,
  markup: [
    {
      name: "codeBlock",
      ast: {
        nodeType: "code-block",
        attributes: { language: "bash" },
        extract: { "$1": "attributes.language", "$2": "value" },
      },
      actions: [{ runCode: { language: "$1", code: "$2" } }],
    },
    {
      name: "bold",
      ast: {
        nodeType: "strong",
        content: true,
      },
      actions: [{ find: "$1" }],
    },
    {
      name: "link",
      ast: {
        nodeType: "reference",
        extract: { "$1": "attributes.url" },
      },
      actions: [{ checkLink: { url: "$1" } }],
    },
  ],
};

const rstCodeWithRegex = {
  extensions: ["rst"],
  inlineStatements,
  markup: [
    {
      name: "codeWithUrl",
      ast: {
        nodeType: "code-block",
        attributes: { language: "javascript" },
        extract: { "$1": "attributes.language", "$2": "value" },
      },
      regex: ["(https?://[^\\s'\"]+)"],
      actions: [{ checkLink: { url: "$1" } }],
    },
  ],
};

const rstHeading = {
  extensions: ["rst"],
  inlineStatements,
  markup: [
    {
      name: "heading",
      ast: {
        nodeType: "title",
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const rstInlineCode = {
  extensions: ["rst"],
  inlineStatements,
  markup: [
    {
      name: "inlineCode",
      ast: {
        nodeType: ["interpreted_text", "literal"],
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const rstBlockquote = {
  extensions: ["rst"],
  inlineStatements,
  markup: [
    {
      name: "blockquote",
      ast: {
        nodeType: "block_quote",
        content: true,
      },
      actions: [{ find: "$1" }],
    },
  ],
};

const rstCodeBlockBatch = {
  extensions: ["rst"],
  inlineStatements,
  markup: [
    {
      name: "batchCode",
      ast: {
        nodeType: "code-block",
        attributes: { language: "bash" },
        extract: { "$1": "attributes.language", "$2": "value" },
      },
      batchMatches: true,
      actions: [{ runShell: { command: "$1" } }],
    },
  ],
};

const rstCodeRegexFilter = {
  extensions: ["rst"],
  inlineStatements,
  markup: [
    {
      name: "jsCodeWithConsoleLog",
      ast: {
        nodeType: "code-block",
        attributes: { language: "javascript" },
      },
      regex: ["(console\\.log\\([^)]+\\))"],
      actions: [{ runCode: { language: "javascript", code: "$1" } }],
    },
  ],
};

// ── AsciiDoc content fixtures ────────────────────────────────────────────────

const adocContent = {
  jsCodeBlock:
    "[source,javascript]\n----\nconsole.log(42);\n----",
  bashCodeBlock:
    "[source,bash]\n----\nnpm install doc-detective\n----",
  boldText:
    "Click *Save* to apply your changes.",
  emphasisText:
    "Select _Continue_ to proceed.",
  link:
    "Visit https://docs.example.com[the documentation].",
  image:
    "image::images/settings.png[Settings page]",
  multiMarkup:
    "[source,bash]\n----\necho hello\n----\n\nVisit https://docs.example.com[docs].\n\nClick *Next* to continue.",
  codeWithUrl:
    "[source,javascript]\n----\nfetch('https://api.example.com/data');\n----",
  codeRegexNoMatch:
    "[source,javascript]\n----\nconst x = 1;\n----",
  multipleCodeBlocks:
    "[source,javascript]\n----\nconsole.log(1);\n----\n\n[source,javascript]\n----\nconsole.log(2);\n----",
  heading:
    "== Getting Started\n\nSome introductory content here.",
  inlineCode:
    "Run `npm install` to set up.",
  blockquote:
    "[quote]\n____\nBack up your data first.\n____",
  multipleBashBlocks:
    "[source,bash]\n----\necho one\n----\n\n[source,bash]\n----\necho two\n----",
  multipleLinks:
    "Visit https://api.example.com[API docs].\n\nVisit https://guide.example.com[user guide].",
  boldAndEmphasis:
    "Click *Save*, then _Continue_.",
  codeRegexFilter:
    '[source,javascript]\n----\nconst x = 1;\nconsole.log("found it");\nconst y = 2;\n----',
};

// ── RST content fixtures ─────────────────────────────────────────────────────

const rstContent = {
  jsCodeBlock:
    ".. code-block:: javascript\n\n   console.log(42);",
  bashCodeBlock:
    ".. code-block:: bash\n\n   npm install doc-detective",
  boldText:
    "Click **Save** to apply your changes.",
  emphasisText:
    "Select *Continue* to proceed.",
  link:
    "Visit `the documentation <https://docs.example.com>`_.",
  image:
    ".. image:: images/settings.png\n   :alt: Settings page",
  multiMarkup:
    ".. code-block:: bash\n\n   echo hello\n\nVisit `docs <https://docs.example.com>`_.\n\nClick **Next** to continue.",
  codeWithUrl:
    ".. code-block:: javascript\n\n   fetch('https://api.example.com/data');",
  codeRegexNoMatch:
    ".. code-block:: javascript\n\n   const x = 1;",
  multipleCodeBlocks:
    ".. code-block:: javascript\n\n   console.log(1);\n\n.. code-block:: javascript\n\n   console.log(2);",
  heading:
    "Getting Started\n===============\n\nSome introductory content here.",
  inlineCode:
    "Run ``npm install`` to set up.",
  blockquote:
    "Intro paragraph.\n\n   Back up your data first.",
  multipleBashBlocks:
    ".. code-block:: bash\n\n   echo one\n\n.. code-block:: bash\n\n   echo two",
  multipleLinks:
    "See `API docs <https://api.example.com>`_ and `user guide <https://guide.example.com>`_.",
  boldAndEmphasis:
    "Click **Save**, then *Continue*.",
  codeRegexFilter:
    '.. code-block:: javascript\n\n   const x = 1;\n   console.log("found it");\n   const y = 2;',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AST-based detection across file formats", function () {
  afterEach(function () {
    clearAstCache();
  });

  // ╔═══════════════════════════════════════════════════════════════════╗
  // ║  Markdown                                                        ║
  // ╚═══════════════════════════════════════════════════════════════════╝
  describe("Markdown (.md)", function () {
    describe("code blocks with language tags", function () {
      it("should detect a JavaScript code block", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.jsCodeBlock),
          filePath: "tutorial.md",
          fileType: mdCodeBlock,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runCode.language).to.equal("javascript");
        expect(result[0].steps[0].runCode.code).to.equal('console.log("hello world");');
      });

      it("should detect a Python code block", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.pyCodeBlock),
          filePath: "tutorial.md",
          fileType: mdCodeBlock,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runCode.language).to.equal("python");
        expect(result[0].steps[0].runCode.code).to.equal("print('hello world')");
      });

      it("should detect a bash code block", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.bashCodeBlock),
          filePath: "install.md",
          fileType: mdCodeBlock,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runCode.language).to.equal("bash");
        expect(result[0].steps[0].runCode.code).to.equal("npm install doc-detective");
      });

      it("should detect multiple code blocks with different languages", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.multipleCodeLangs),
          filePath: "polyglot.md",
          fileType: mdCodeBlock,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(2);
        expect(result[0].steps[0].runCode.language).to.equal("javascript");
        expect(result[0].steps[1].runCode.language).to.equal("python");
      });
    });

    describe("bold (on-screen) formatting", function () {
      it("should detect bold text as a find step", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.boldText),
          filePath: "guide.md",
          fileType: mdBold,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Save");
      });
    });

    describe("emphasis (italic) formatting", function () {
      it("should detect emphasized text as a find step", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.emphasisText),
          filePath: "guide.md",
          fileType: mdEmphasis,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Continue");
      });
    });

    describe("links", function () {
      it("should detect a link and extract URL", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.link),
          filePath: "readme.md",
          fileType: mdLink,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].checkLink.url).to.equal("https://docs.example.com");
      });

      it("should detect multiple links", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.multipleLinks),
          filePath: "links.md",
          fileType: mdLink,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(2);
        expect(result[0].steps[0].checkLink.url).to.equal("https://api.example.com");
        expect(result[0].steps[1].checkLink.url).to.equal("https://guide.example.com");
      });
    });

    describe("images", function () {
      it("should detect an image and extract src", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.image),
          filePath: "guide.md",
          fileType: mdImage,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].screenshot.path).to.equal("images/settings.png");
      });
    });

    describe("headings", function () {
      it("should detect h1 heading text", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.heading),
          filePath: "guide.md",
          fileType: mdHeading,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Getting Started");
      });
    });

    describe("inline code", function () {
      it("should detect inline code", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.inlineCode),
          filePath: "guide.md",
          fileType: mdInlineCode,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("npm install");
      });
    });

    describe("blockquotes", function () {
      it("should detect blockquote text", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.blockquote),
          filePath: "guide.md",
          fileType: mdBlockquote,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Important: back up your data first.");
      });
    });

    describe("AST + regex combined", function () {
      it("should extract URL from javascript code block via AST + regex", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.codeWithUrl),
          filePath: "api.md",
          fileType: mdCodeWithRegex,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].checkLink.url).to.equal("https://api.example.com/data");
      });

      it("should filter code blocks using regex on content", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.codeRegexFilter),
          filePath: "code.md",
          fileType: mdCodeRegexFilter,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runCode.code).to.equal('console.log("found it")');
      });

      it("should produce no steps when regex does not match AST content", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.codeRegexNoMatch),
          filePath: "code.md",
          fileType: mdCodeRegexFilter,
        });
        // No matched steps means steps stays empty, which fails test_v3 min 1 item → test dropped
        expect(result).to.have.lengthOf(0);
      });
    });

    describe("batch matches", function () {
      it("should combine multiple bash code blocks into one step", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.multipleBashBlocks),
          filePath: "setup.md",
          fileType: mdCodeBlockBatch,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runShell.command).to.equal("echo one\necho two");
      });
    });

    describe("multiple markup rules", function () {
      it("should detect code blocks, links, and bold in one pass", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.multiMarkup),
          filePath: "full.md",
          fileType: mdMultiMarkup,
        });
        expect(result).to.have.lengthOf(1);
        const steps = result[0].steps;
        // Should have at least: code block, link, bold
        expect(steps.length).to.be.greaterThanOrEqual(3);

        const codeStep = steps.find((s) => s.runCode);
        expect(codeStep).to.exist;
        expect(codeStep.runCode.language).to.equal("bash");
        expect(codeStep.runCode.code).to.equal("echo hello");

        const linkStep = steps.find((s) => s.checkLink);
        expect(linkStep).to.exist;
        expect(linkStep.checkLink.url).to.equal("https://docs.example.com");

        const findStep = steps.find((s) => s.find === "Next");
        expect(findStep).to.exist;
      });

      it("should detect bold and emphasis in the same paragraph", async function () {
        const fileType = {
          extensions: ["md"],
          inlineStatements,
          markup: [
            {
              name: "bold",
              ast: { nodeType: "strong", content: true },
              actions: [{ find: "$1" }],
            },
            {
              name: "emphasis",
              ast: { nodeType: "emphasis", content: true },
              actions: [{ find: "$1" }],
            },
          ],
        };
        const result = await parseContent({
          config: { detectSteps: true },
          content: mdWrap(mdContent.boldAndEmphasis),
          filePath: "guide.md",
          fileType,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(2);
        const texts = result[0].steps.map((s) => s.find);
        expect(texts).to.include("Save");
        expect(texts).to.include("Continue");
      });
    });
  });

  // ╔═══════════════════════════════════════════════════════════════════╗
  // ║  HTML                                                            ║
  // ╚═══════════════════════════════════════════════════════════════════╝
  describe("HTML (.html)", function () {
    describe("code blocks with language tags", function () {
      it("should detect <code> elements and extract text content", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.codeBlock),
          filePath: "tutorial.html",
          fileType: htmlCodeBlock,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("const x = 1;");
      });
    });

    describe("bold (on-screen) formatting", function () {
      it("should detect <strong> tags", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.boldStrong),
          filePath: "guide.html",
          fileType: htmlBold,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Save");
      });

      it("should detect <b> tags", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.boldB),
          filePath: "guide.html",
          fileType: htmlBold,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Save");
      });
    });

    describe("emphasis formatting", function () {
      it("should detect <em> tags", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.emphasis),
          filePath: "guide.html",
          fileType: htmlEmphasis,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Continue");
      });
    });

    describe("links", function () {
      it("should detect <a href> and extract URL", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.link),
          filePath: "index.html",
          fileType: htmlLink,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].checkLink.url).to.equal("https://docs.example.com");
      });

      it("should detect multiple <a> elements", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.multipleLinks),
          filePath: "page.html",
          fileType: htmlLink,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(2);
        expect(result[0].steps[0].checkLink.url).to.equal("https://a.com");
        expect(result[0].steps[1].checkLink.url).to.equal("https://b.com");
      });
    });

    describe("images", function () {
      it("should detect <img> and extract src", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.image),
          filePath: "guide.html",
          fileType: htmlImage,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].screenshot.path).to.equal("images/screenshot.png");
      });
    });

    describe("AST + regex combined", function () {
      it("should filter code blocks by content with regex", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.codeWithImport),
          filePath: "api.html",
          fileType: htmlCodeWithRegex,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("import express from 'express';");
      });

      it("should produce no steps when regex does not match code content", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.codeNoImport),
          filePath: "api.html",
          fileType: htmlCodeWithRegex,
        });
        // No matched steps → test_v3 validation rejects empty steps → test dropped
        expect(result).to.have.lengthOf(0);
      });
    });

    describe("multiple markup rules", function () {
      it("should detect bold and links in one pass", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.multiMarkup),
          filePath: "full.html",
          fileType: htmlMultiMarkup,
        });
        expect(result).to.have.lengthOf(1);
        const steps = result[0].steps;
        expect(steps.length).to.be.greaterThanOrEqual(2);

        const findStep = steps.find((s) => s.find === "Next");
        expect(findStep).to.exist;

        const linkStep = steps.find((s) => s.checkLink);
        expect(linkStep).to.exist;
        expect(linkStep.checkLink.url).to.equal("https://docs.example.com");
      });
    });

    describe("multiple code blocks", function () {
      it("should detect two code blocks as separate steps", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.multipleCodeBlocks),
          filePath: "multi.html",
          fileType: htmlCodeBlock,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(2);
      });
    });

    describe("headings", function () {
      it("should detect h1 heading text", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.heading),
          filePath: "guide.html",
          fileType: htmlHeading,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Getting Started");
      });
    });

    describe("inline code", function () {
      it("should detect inline <code> elements", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.inlineCode),
          filePath: "guide.html",
          fileType: htmlInlineCode,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("npm install");
      });
    });

    describe("blockquotes", function () {
      it("should detect blockquote text", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.blockquote),
          filePath: "guide.html",
          fileType: htmlBlockquote,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Back up your data first.");
      });
    });

    describe("batch matches", function () {
      it("should combine multiple code blocks into one step", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.multipleBashBlocks),
          filePath: "setup.html",
          fileType: htmlCodeBlockBatch,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("echo one\necho two");
      });
    });

    describe("bold and emphasis combined", function () {
      it("should detect bold and emphasis in the same paragraph", async function () {
        const fileType = {
          extensions: ["html"],
          inlineStatements,
          markup: [
            {
              name: "bold",
              ast: {
                nodeType: "element",
                attributes: { tagName: ["strong", "b"] },
                content: true,
              },
              actions: [{ find: "$1" }],
            },
            {
              name: "emphasis",
              ast: {
                nodeType: "element",
                attributes: { tagName: ["em", "i"] },
                content: true,
              },
              actions: [{ find: "$1" }],
            },
          ],
        };
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.boldAndEmphasis),
          filePath: "guide.html",
          fileType,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(2);
        const texts = result[0].steps.map((s) => s.find);
        expect(texts).to.include("Save");
        expect(texts).to.include("Continue");
      });
    });

    describe("content regex filter", function () {
      it("should filter code blocks using regex on content", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.codeRegexFilter),
          filePath: "code.html",
          fileType: htmlCodeRegexFilter,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runCode.code).to.equal('console.log("found it")');
      });

      it("should produce no steps when regex does not match code content", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: htmlWrap(htmlContent.codeRegexNoMatch),
          filePath: "code.html",
          fileType: htmlCodeRegexFilter,
        });
        expect(result).to.have.lengthOf(0);
      });
    });
  });

  // ╔═══════════════════════════════════════════════════════════════════╗
  // ║  XML / DITA                                                      ║
  // ╚═══════════════════════════════════════════════════════════════════╝
  describe("XML/DITA (.xml, .dita)", function () {
    describe("code blocks with language tags", function () {
      it("should detect <codeblock outputclass='javascript'>", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.codeblock),
          filePath: "tutorial.dita",
          fileType: xmlCodeBlock,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        const step = result[0].steps[0];
        expect(step.runCode.language).to.equal("javascript");
        // $0 = nodeText (default), used for code
        expect(step.runCode.code).to.equal("const x = 1;");
      });
    });

    describe("bold (on-screen) formatting", function () {
      it("should detect <b> tags", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.bold),
          filePath: "guide.dita",
          fileType: xmlBold,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Save");
      });

      it("should detect <uicontrol> tags", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.uicontrol),
          filePath: "guide.dita",
          fileType: xmlBold,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Save");
      });
    });

    describe("cross-references (xref)", function () {
      it("should detect <xref> and extract href", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.xref),
          filePath: "topic.xml",
          fileType: xmlXref,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].checkLink.url).to.equal("https://docs.example.com");
      });
    });

    describe("AST + regex combined", function () {
      it("should filter codeblock content by regex (SQL)", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.codeWithSql),
          filePath: "database.dita",
          fileType: xmlCodeWithRegex,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("SELECT * FROM users WHERE active = 1;");
      });

      it("should produce no steps when regex does not match codeblock", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.codeNoSql),
          filePath: "shell.dita",
          fileType: xmlCodeWithRegex,
        });
        // No matched steps → test_v3 validation rejects empty steps → test dropped
        expect(result).to.have.lengthOf(0);
      });
    });

    describe("multiple markup rules", function () {
      it("should detect codeblock, bold, and xref in one pass", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.multiMarkup),
          filePath: "full.dita",
          fileType: xmlMultiMarkup,
        });
        expect(result).to.have.lengthOf(1);
        const steps = result[0].steps;
        expect(steps.length).to.be.greaterThanOrEqual(3);

        const codeStep = steps.find((s) => s.runCode);
        expect(codeStep).to.exist;
        expect(codeStep.runCode.language).to.equal("bash");
        // $0 = nodeText for code content
        expect(codeStep.runCode.code).to.equal("echo hi");

        const findStep = steps.find((s) => s.find === "Next");
        expect(findStep).to.exist;

        const linkStep = steps.find((s) => s.checkLink);
        expect(linkStep).to.exist;
        expect(linkStep.checkLink.url).to.equal("https://docs.example.com");
      });
    });

    describe("multiple code blocks", function () {
      it("should detect two codeblock elements as separate steps", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.multipleCodeblocks),
          filePath: "multi.dita",
          fileType: xmlCodeBlock,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(2);
        expect(result[0].steps[0].runCode.language).to.equal("javascript");
        expect(result[0].steps[1].runCode.language).to.equal("python");
      });
    });

    describe("emphasis formatting", function () {
      it("should detect <i> tags", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.emphasis),
          filePath: "guide.dita",
          fileType: xmlEmphasis,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Continue");
      });
    });

    describe("multiple cross-references", function () {
      it("should detect multiple <xref> elements", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.multipleXrefs),
          filePath: "links.dita",
          fileType: xmlXref,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(2);
        expect(result[0].steps[0].checkLink.url).to.equal("https://api.example.com");
        expect(result[0].steps[1].checkLink.url).to.equal("https://guide.example.com");
      });
    });

    describe("images", function () {
      it("should detect <image> and extract href", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.image),
          filePath: "guide.dita",
          fileType: xmlImage,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].screenshot.path).to.equal("images/screenshot.png");
      });
    });

    describe("headings", function () {
      it("should detect <title> element text", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.heading),
          filePath: "guide.dita",
          fileType: xmlHeading,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Getting Started");
      });
    });

    describe("blockquotes", function () {
      it("should detect <lq> element text", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.blockquote),
          filePath: "guide.dita",
          fileType: xmlBlockquote,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Back up your data first.");
      });
    });

    describe("inline code", function () {
      it("should detect <codeph> elements", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.inlineCode),
          filePath: "guide.dita",
          fileType: xmlInlineCode,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("npm install");
      });
    });

    describe("batch matches", function () {
      it("should combine multiple codeblocks into one step", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.multipleBashCodeblocks),
          filePath: "setup.dita",
          fileType: xmlCodeBlockBatch,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runShell.command).to.equal("echo one\necho two");
      });
    });

    describe("bold and emphasis combined", function () {
      it("should detect bold and emphasis in the same paragraph", async function () {
        const fileType = {
          extensions: ["xml", "dita"],
          inlineStatements,
          markup: [
            {
              name: "bold",
              ast: {
                nodeType: "element",
                attributes: { tagName: ["b", "uicontrol"] },
                content: true,
              },
              actions: [{ find: "$1" }],
            },
            {
              name: "emphasis",
              ast: {
                nodeType: "element",
                attributes: { tagName: ["i", "term"] },
                content: true,
              },
              actions: [{ find: "$1" }],
            },
          ],
        };
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.boldAndEmphasis),
          filePath: "guide.dita",
          fileType,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(2);
        const texts = result[0].steps.map((s) => s.find);
        expect(texts).to.include("Save");
        expect(texts).to.include("Continue");
      });
    });

    describe("content regex filter", function () {
      it("should filter codeblock content by regex", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.codeRegexFilter),
          filePath: "code.dita",
          fileType: xmlCodeRegexFilter,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runCode.code).to.equal('console.log("found it")');
      });

      it("should produce no steps when regex does not match codeblock", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: xmlWrap(xmlContent.codeRegexNoMatch),
          filePath: "code.dita",
          fileType: xmlCodeRegexFilter,
        });
        expect(result).to.have.lengthOf(0);
      });
    });
  });

  // ╔═══════════════════════════════════════════════════════════════════╗
  // ║  AsciiDoc                                                        ║
  // ╚═══════════════════════════════════════════════════════════════════╝
  describe("AsciiDoc (.adoc)", function () {
    describe("code blocks with language tags", function () {
      it("should detect a JavaScript code block", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.jsCodeBlock),
          filePath: "tutorial.adoc",
          fileType: adocCodeBlock,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runCode.language).to.equal("javascript");
        expect(result[0].steps[0].runCode.code).to.equal("console.log(42);");
      });

      it("should detect a bash code block", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.bashCodeBlock),
          filePath: "install.adoc",
          fileType: adocCodeBlock,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runCode.language).to.equal("bash");
        expect(result[0].steps[0].runCode.code).to.equal("npm install doc-detective");
      });
    });

    describe("bold (on-screen) formatting", function () {
      it("should detect bold text as a find step", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.boldText),
          filePath: "guide.adoc",
          fileType: adocBold,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Save");
      });
    });

    describe("emphasis (italic) formatting", function () {
      it("should detect emphasized text as a find step", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.emphasisText),
          filePath: "guide.adoc",
          fileType: adocEmphasis,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Continue");
      });
    });

    describe("links", function () {
      it("should detect a link and extract URL", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.link),
          filePath: "readme.adoc",
          fileType: adocLink,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].checkLink.url).to.equal("https://docs.example.com");
      });
    });

    describe("images", function () {
      it("should detect an image and extract target", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.image),
          filePath: "guide.adoc",
          fileType: adocImage,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].screenshot.path).to.equal("images/settings.png");
      });
    });

    describe("AST + regex combined", function () {
      it("should extract URL from javascript code block via AST + regex", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.codeWithUrl),
          filePath: "api.adoc",
          fileType: adocCodeWithRegex,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].checkLink.url).to.equal("https://api.example.com/data");
      });

      it("should produce no steps when regex does not match code block", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.codeRegexNoMatch),
          filePath: "code.adoc",
          fileType: adocCodeWithRegex,
        });
        expect(result).to.have.lengthOf(0);
      });
    });

    describe("multiple markup rules", function () {
      it("should detect code blocks, links, and bold in one pass", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.multiMarkup),
          filePath: "full.adoc",
          fileType: adocMultiMarkup,
        });
        expect(result).to.have.lengthOf(1);
        const steps = result[0].steps;
        expect(steps.length).to.be.greaterThanOrEqual(3);

        const codeStep = steps.find((s) => s.runCode);
        expect(codeStep).to.exist;
        expect(codeStep.runCode.language).to.equal("bash");
        expect(codeStep.runCode.code).to.equal("echo hello");

        const linkStep = steps.find((s) => s.checkLink);
        expect(linkStep).to.exist;
        expect(linkStep.checkLink.url).to.equal("https://docs.example.com");

        const findStep = steps.find((s) => s.find === "Next");
        expect(findStep).to.exist;
      });
    });

    describe("multiple code blocks", function () {
      it("should detect two code blocks as separate steps", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.multipleCodeBlocks),
          filePath: "multi.adoc",
          fileType: adocCodeBlock,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(2);
      });
    });

    describe("headings", function () {
      it("should detect section heading text", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.heading),
          filePath: "guide.adoc",
          fileType: adocHeading,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Getting Started");
      });
    });

    describe("inline code", function () {
      it("should detect inline code elements", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.inlineCode),
          filePath: "guide.adoc",
          fileType: adocInlineCode,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("npm install");
      });
    });

    describe("blockquotes", function () {
      it("should detect quote block text", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.blockquote),
          filePath: "guide.adoc",
          fileType: adocBlockquote,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find.trim()).to.equal("Back up your data first.");
      });
    });

    describe("batch matches", function () {
      it("should combine multiple bash code blocks into one step", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.multipleBashBlocks),
          filePath: "setup.adoc",
          fileType: adocCodeBlockBatch,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runShell.command).to.equal("echo one\necho two");
      });
    });

    describe("bold and emphasis combined", function () {
      it("should detect bold and emphasis in the same paragraph", async function () {
        const fileType = {
          extensions: ["adoc"],
          inlineStatements,
          markup: [
            {
              name: "bold",
              ast: {
                nodeType: "element",
                attributes: { tagName: "strong" },
                content: true,
              },
              actions: [{ find: "$1" }],
            },
            {
              name: "emphasis",
              ast: {
                nodeType: "element",
                attributes: { tagName: "em" },
                content: true,
              },
              actions: [{ find: "$1" }],
            },
          ],
        };
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.boldAndEmphasis),
          filePath: "guide.adoc",
          fileType,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(2);
        const texts = result[0].steps.map((s) => s.find);
        expect(texts).to.include("Save");
        expect(texts).to.include("Continue");
      });
    });

    describe("multiple links", function () {
      it("should detect multiple links", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.multipleLinks),
          filePath: "links.adoc",
          fileType: adocLink,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(2);
        expect(result[0].steps[0].checkLink.url).to.equal("https://api.example.com");
        expect(result[0].steps[1].checkLink.url).to.equal("https://guide.example.com");
      });
    });

    describe("content regex filter", function () {
      it("should filter code blocks using regex on content", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.codeRegexFilter),
          filePath: "code.adoc",
          fileType: adocCodeRegexFilter,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runCode.code).to.equal('console.log("found it")');
      });

      it("should produce no steps when regex does not match code block", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: adocWrap(adocContent.codeRegexNoMatch),
          filePath: "code.adoc",
          fileType: adocCodeRegexFilter,
        });
        expect(result).to.have.lengthOf(0);
      });
    });
  });

  // ╔═══════════════════════════════════════════════════════════════════╗
  // ║  RST                                                             ║
  // ╚═══════════════════════════════════════════════════════════════════╝
  describe("RST (.rst)", function () {
    describe("code blocks with language tags", function () {
      it("should detect a JavaScript code block", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.jsCodeBlock),
          filePath: "tutorial.rst",
          fileType: rstCodeBlock,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runCode.language).to.equal("javascript");
        expect(result[0].steps[0].runCode.code).to.equal("console.log(42);");
      });

      it("should detect a bash code block", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.bashCodeBlock),
          filePath: "install.rst",
          fileType: rstCodeBlock,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runCode.language).to.equal("bash");
        expect(result[0].steps[0].runCode.code).to.equal("npm install doc-detective");
      });
    });

    describe("bold (on-screen) formatting", function () {
      it("should detect bold text as a find step", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.boldText),
          filePath: "guide.rst",
          fileType: rstBold,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Save");
      });
    });

    describe("emphasis (italic) formatting", function () {
      it("should detect emphasized text as a find step", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.emphasisText),
          filePath: "guide.rst",
          fileType: rstEmphasis,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Continue");
      });
    });

    describe("links", function () {
      it("should detect a reference and extract URL", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.link),
          filePath: "readme.rst",
          fileType: rstLink,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].checkLink.url).to.equal("https://docs.example.com");
      });
    });

    describe("images", function () {
      it("should detect an image directive and extract target", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.image),
          filePath: "guide.rst",
          fileType: rstImage,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].screenshot.path).to.equal("images/settings.png");
      });
    });

    describe("AST + regex combined", function () {
      it("should extract URL from javascript code block via AST + regex", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.codeWithUrl),
          filePath: "api.rst",
          fileType: rstCodeWithRegex,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].checkLink.url).to.equal("https://api.example.com/data");
      });

      it("should produce no steps when regex does not match code block", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.codeRegexNoMatch),
          filePath: "code.rst",
          fileType: rstCodeWithRegex,
        });
        expect(result).to.have.lengthOf(0);
      });
    });

    describe("multiple markup rules", function () {
      it("should detect code blocks, links, and bold in one pass", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.multiMarkup),
          filePath: "full.rst",
          fileType: rstMultiMarkup,
        });
        expect(result).to.have.lengthOf(1);
        const steps = result[0].steps;
        expect(steps.length).to.be.greaterThanOrEqual(3);

        const codeStep = steps.find((s) => s.runCode);
        expect(codeStep).to.exist;
        expect(codeStep.runCode.language).to.equal("bash");
        expect(codeStep.runCode.code).to.equal("echo hello");

        const linkStep = steps.find((s) => s.checkLink);
        expect(linkStep).to.exist;
        expect(linkStep.checkLink.url).to.equal("https://docs.example.com");

        const findStep = steps.find((s) => s.find === "Next");
        expect(findStep).to.exist;
      });
    });

    describe("multiple code blocks", function () {
      it("should detect two code blocks as separate steps", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.multipleCodeBlocks),
          filePath: "multi.rst",
          fileType: rstCodeBlock,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(2);
      });
    });

    describe("headings", function () {
      it("should detect title text", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.heading),
          filePath: "guide.rst",
          fileType: rstHeading,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Getting Started");
      });
    });

    describe("inline code", function () {
      it("should detect inline literal text", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.inlineCode),
          filePath: "guide.rst",
          fileType: rstInlineCode,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("npm install");
      });
    });

    describe("blockquotes", function () {
      it("should detect block quote text", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.blockquote),
          filePath: "guide.rst",
          fileType: rstBlockquote,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].find).to.equal("Back up your data first.");
      });
    });

    describe("batch matches", function () {
      it("should combine multiple bash code blocks into one step", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.multipleBashBlocks),
          filePath: "setup.rst",
          fileType: rstCodeBlockBatch,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runShell.command).to.equal("echo one\necho two");
      });
    });

    describe("bold and emphasis combined", function () {
      it("should detect bold and emphasis in the same paragraph", async function () {
        const fileType = {
          extensions: ["rst"],
          inlineStatements,
          markup: [
            {
              name: "bold",
              ast: { nodeType: "strong", content: true },
              actions: [{ find: "$1" }],
            },
            {
              name: "emphasis",
              ast: { nodeType: "emphasis", content: true },
              actions: [{ find: "$1" }],
            },
          ],
        };
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.boldAndEmphasis),
          filePath: "guide.rst",
          fileType,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(2);
        const texts = result[0].steps.map((s) => s.find);
        expect(texts).to.include("Save");
        expect(texts).to.include("Continue");
      });
    });

    describe("multiple links", function () {
      it("should detect multiple references", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.multipleLinks),
          filePath: "links.rst",
          fileType: rstLink,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(2);
        expect(result[0].steps[0].checkLink.url).to.equal("https://api.example.com");
        expect(result[0].steps[1].checkLink.url).to.equal("https://guide.example.com");
      });
    });

    describe("content regex filter", function () {
      it("should filter code blocks using regex on content", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.codeRegexFilter),
          filePath: "code.rst",
          fileType: rstCodeRegexFilter,
        });
        expect(result).to.have.lengthOf(1);
        expect(result[0].steps).to.have.lengthOf(1);
        expect(result[0].steps[0].runCode.code).to.equal('console.log("found it")');
      });

      it("should produce no steps when regex does not match code block", async function () {
        const result = await parseContent({
          config: { detectSteps: true },
          content: rstWrap(rstContent.codeRegexNoMatch),
          filePath: "code.rst",
          fileType: rstCodeRegexFilter,
        });
        expect(result).to.have.lengthOf(0);
      });
    });
  });

  // ╔═══════════════════════════════════════════════════════════════════╗
  // ║  Cross-format consistency                                        ║
  // ╚═══════════════════════════════════════════════════════════════════╝
  describe("cross-format consistency", function () {
    it("should detect bold text identically across all formats", async function () {
      const mdResult = await parseContent({
        config: { detectSteps: true },
        content: mdWrap("Click **Save** to apply."),
        filePath: "guide.md",
        fileType: mdBold,
      });

      const htmlResult = await parseContent({
        config: { detectSteps: true },
        content: htmlWrap("<p>Click <strong>Save</strong> to apply.</p>"),
        filePath: "guide.html",
        fileType: htmlBold,
      });

      const xmlResult = await parseContent({
        config: { detectSteps: true },
        content: xmlWrap('<topic id="t"><body><p>Click <b>Save</b> to apply.</p></body></topic>'),
        filePath: "guide.dita",
        fileType: xmlBold,
      });

      const adocResult = await parseContent({
        config: { detectSteps: true },
        content: adocWrap("Click *Save* to apply."),
        filePath: "guide.adoc",
        fileType: adocBold,
      });

      const rstResult = await parseContent({
        config: { detectSteps: true },
        content: rstWrap("Click **Save** to apply."),
        filePath: "guide.rst",
        fileType: rstBold,
      });

      expect(mdResult[0].steps[0].find).to.equal("Save");
      expect(htmlResult[0].steps[0].find).to.equal("Save");
      expect(xmlResult[0].steps[0].find).to.equal("Save");
      expect(adocResult[0].steps[0].find).to.equal("Save");
      expect(rstResult[0].steps[0].find).to.equal("Save");
    });

    it("should detect links identically across formats", async function () {
      const mdResult = await parseContent({
        config: { detectSteps: true },
        content: mdWrap("[Docs](https://docs.example.com)"),
        filePath: "guide.md",
        fileType: mdLink,
      });

      const htmlResult = await parseContent({
        config: { detectSteps: true },
        content: htmlWrap('<a href="https://docs.example.com">Docs</a>'),
        filePath: "guide.html",
        fileType: htmlLink,
      });

      const xmlResult = await parseContent({
        config: { detectSteps: true },
        content: xmlWrap('<topic id="t"><body><xref href="https://docs.example.com">Docs</xref></body></topic>'),
        filePath: "guide.xml",
        fileType: xmlXref,
      });

      const adocResult = await parseContent({
        config: { detectSteps: true },
        content: adocWrap("Visit https://docs.example.com[Docs]."),
        filePath: "guide.adoc",
        fileType: adocLink,
      });

      const rstResult = await parseContent({
        config: { detectSteps: true },
        content: rstWrap("Visit `Docs <https://docs.example.com>`_."),
        filePath: "guide.rst",
        fileType: rstLink,
      });

      expect(mdResult[0].steps[0].checkLink.url).to.equal("https://docs.example.com");
      expect(htmlResult[0].steps[0].checkLink.url).to.equal("https://docs.example.com");
      expect(xmlResult[0].steps[0].checkLink.url).to.equal("https://docs.example.com");
      expect(adocResult[0].steps[0].checkLink.url).to.equal("https://docs.example.com");
      expect(rstResult[0].steps[0].checkLink.url).to.equal("https://docs.example.com");
    });
  });

  // ╔═══════════════════════════════════════════════════════════════════╗
  // ║  Edge cases                                                      ║
  // ╚═══════════════════════════════════════════════════════════════════╝
  describe("edge cases", function () {
    it("should handle markdown with no matching AST nodes", async function () {
      const result = await parseContent({
        config: { detectSteps: true },
        content: mdWrap("Just plain text, no code blocks."),
        filePath: "plain.md",
        fileType: mdCodeBlock,
      });
      // No matched steps → test_v3 validation rejects empty steps → test dropped
      expect(result).to.have.lengthOf(0);
    });

    it("should handle HTML with no matching elements", async function () {
      const result = await parseContent({
        config: { detectSteps: true },
        content: htmlWrap("<p>Just text.</p>"),
        filePath: "plain.html",
        fileType: htmlBold,
      });
      // No matched steps → test_v3 validation rejects empty steps → test dropped
      expect(result).to.have.lengthOf(0);
    });

    it("should handle XML with no matching elements", async function () {
      const result = await parseContent({
        config: { detectSteps: true },
        content: xmlWrap('<topic id="t"><body><p>Text.</p></body></topic>'),
        filePath: "plain.dita",
        fileType: xmlBold,
      });
      // No matched steps → test_v3 validation rejects empty steps → test dropped
      expect(result).to.have.lengthOf(0);
    });

    it("should handle AsciiDoc with no matching AST nodes", async function () {
      const result = await parseContent({
        config: { detectSteps: true },
        content: adocWrap("Just plain text, no code blocks."),
        filePath: "plain.adoc",
        fileType: adocCodeBlock,
      });
      expect(result).to.have.lengthOf(0);
    });

    it("should handle RST with no matching AST nodes", async function () {
      const result = await parseContent({
        config: { detectSteps: true },
        content: rstWrap("Just plain text, no code blocks."),
        filePath: "plain.rst",
        fileType: rstCodeBlock,
      });
      expect(result).to.have.lengthOf(0);
    });

    it("should not detect AST steps when detectSteps is false", async function () {
      const result = await parseContent({
        config: { detectSteps: false },
        content: mdWrap(mdContent.jsCodeBlock),
        filePath: "tutorial.md",
        fileType: mdCodeBlock,
      });
      // No steps detected → test_v3 rejects empty steps → test dropped
      expect(result).to.have.lengthOf(0);
    });

    it("should handle AST nodeType as regex-like string matching", async function () {
      const fileType = {
        extensions: ["md"],
        inlineStatements,
        markup: [
          {
            name: "anyCodeType",
            ast: {
              nodeType: ["code", "inlineCode"],
              content: true,
              extract: { "$1": "value" },
            },
            actions: [{ find: "$1" }],
          },
        ],
      };
      const result = await parseContent({
        config: { detectSteps: true },
        content: mdWrap("Some `inline` and:\n\n```bash\nblock\n```"),
        filePath: "mixed.md",
        fileType,
      });
      expect(result).to.have.lengthOf(1);
      expect(result[0].steps).to.have.lengthOf(2);
      const values = result[0].steps.map((s) => s.find);
      expect(values).to.include("inline");
      expect(values).to.include("block");
    });

    it("should respect ignore blocks with AST detection", async function () {
      const content =
        '<!-- test {"steps": []} -->\n' +
        "Click **Visible** here.\n" +
        "<!-- test ignore -->\n" +
        "Click **Ignored** text.\n" +
        "<!-- test ignore end -->\n" +
        "Click **AlsoVisible** now.";
      const result = await parseContent({
        config: { detectSteps: true },
        content,
        filePath: "guide.md",
        fileType: mdBold,
      });
      expect(result).to.have.lengthOf(1);
      const foundTexts = result[0].steps.map((s) => s.find);
      expect(foundTexts).to.include("Visible");
      expect(foundTexts).to.include("AlsoVisible");
      expect(foundTexts).to.not.include("Ignored");
    });
  });
});
