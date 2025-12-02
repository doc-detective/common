import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// ==========================================
// Helper schemas
// ==========================================

export const stringOrArraySchema = z.union([
  z.string(),
  z.array(z.string()).min(1),
]);

// ==========================================
// Context schemas (v3)
// ==========================================

export const platformSchema = z.enum(["linux", "mac", "windows"]);
export type Platform = z.infer<typeof platformSchema>;

export const browserNameSchema = z.enum(["chrome", "firefox", "safari", "webkit"]);
export type BrowserName = z.infer<typeof browserNameSchema>;

export const browserWindowSchema = z.object({
  width: z.number().int().optional(),
  height: z.number().int().optional(),
}).strict();

export const browserViewportSchema = z.object({
  width: z.number().int().optional(),
  height: z.number().int().optional(),
}).strict();

export const browserSchema = z.object({
  name: browserNameSchema,
  headless: z.boolean().default(true).optional(),
  window: browserWindowSchema.optional(),
  viewport: browserViewportSchema.optional(),
}).strict();
export type Browser = z.infer<typeof browserSchema>;

export const contextV3Schema = z.object({
  $schema: z.literal("https://raw.githubusercontent.com/doc-detective/common/refs/heads/main/dist/schemas/context_v3.schema.json").optional(),
  contextId: z.string().default(() => uuidv4()).optional(),
  platforms: z.union([
    platformSchema,
    z.array(platformSchema),
  ]).optional(),
  browsers: z.union([
    browserNameSchema,
    browserSchema,
    z.array(z.union([browserNameSchema, browserSchema])),
  ]).optional(),
}).strict();
export type ContextV3 = z.infer<typeof contextV3Schema>;

// ==========================================
// checkLink schema (v3)
// ==========================================

const urlPatternRegex = /^(http:\/\/|https:\/\/|\/).*|\$[A-Za-z0-9_]+$/;

export const checkLinkStringSchema = z.string().regex(urlPatternRegex).transform(s => s.trim());

export const checkLinkObjectSchema = z.object({
  url: z.string().regex(urlPatternRegex).transform(s => s.trim()),
  origin: z.string().transform(s => s.trim()).optional(),
  statusCodes: z.union([
    z.number().int(),
    z.array(z.number().int()),
  ]).default([200, 301, 302, 307, 308]).optional(),
}).strict();

export const checkLinkV3Schema = z.union([
  checkLinkStringSchema,
  checkLinkObjectSchema,
]);
export type CheckLinkV3 = z.infer<typeof checkLinkV3Schema>;

// ==========================================
// goTo schema (v3)
// ==========================================

const goToUrlPatternRegex = /^(http:\/\/|https:\/\/|\/).*|\$[A-Za-z0-9_]+/;

export const goToFindSchema = z.object({
  selector: z.string().optional(),
  elementText: z.string().optional(),
  elementId: z.string().optional(),
  elementTestId: z.string().optional(),
  elementClass: z.union([z.string(), z.array(z.string())]).optional(),
  elementAttribute: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  elementAria: z.string().optional(),
}).strict().refine(
  (data) => data.selector || data.elementText || data.elementId || data.elementTestId || data.elementClass || data.elementAttribute || data.elementAria,
  { message: "At least one of selector, elementText, elementId, elementTestId, elementClass, elementAttribute, or elementAria must be specified" }
);

export const goToWaitUntilSchema = z.object({
  networkIdleTime: z.union([z.number().int().min(0), z.null()]).default(500).optional(),
  domIdleTime: z.union([z.number().int().min(0), z.null()]).default(1000).optional(),
  find: goToFindSchema.optional(),
}).strict();

export const goToStringSchema = z.string().regex(goToUrlPatternRegex).transform(s => s.trim());

export const goToObjectSchema = z.object({
  url: z.string().regex(goToUrlPatternRegex).transform(s => s.trim()),
  origin: z.string().transform(s => s.trim()).optional(),
  timeout: z.number().int().min(0).default(30000).optional(),
  waitUntil: goToWaitUntilSchema.optional(),
}).strict();

export const goToV3Schema = z.union([goToStringSchema, goToObjectSchema]);
export type GoToV3 = z.infer<typeof goToV3Schema>;

// ==========================================
// click schema (v3)
// ==========================================

export const clickButtonSchema = z.enum(["left", "middle", "right"]).default("left");
export const clickCountSchema = z.number().int().min(1).default(1);
export const clickDelaySchema = z.number().int().min(0).default(0);
export const clickPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
}).strict();
export const clickModifiersSchema = z.array(z.enum(["Alt", "Control", "Meta", "Shift"]));

export const clickObjectSchema = z.object({
  button: clickButtonSchema.optional(),
  count: clickCountSchema.optional(),
  delay: clickDelaySchema.optional(),
  position: clickPositionSchema.optional(),
  modifiers: clickModifiersSchema.optional(),
}).strict();

export const clickV3Schema = z.union([
  z.literal(true),
  clickObjectSchema,
]);
export type ClickV3 = z.infer<typeof clickV3Schema>;

// ==========================================
// type schema (v3)
// ==========================================

export const typeStringSchema = z.string();

export const typeObjectSchema = z.object({
  keys: z.union([z.string(), z.array(z.string())]),
  inputDelay: z.number().int().min(0).default(0).optional(),
  selector: z.string().optional(),
  elementText: z.string().optional(),
  elementId: z.string().optional(),
  elementTestId: z.string().optional(),
  elementClass: z.union([z.string(), z.array(z.string())]).optional(),
  elementAttribute: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  elementAria: z.string().optional(),
}).strict();

export const typeV3Schema = z.union([typeStringSchema, typeObjectSchema]);
export type TypeV3 = z.infer<typeof typeV3Schema>;

// ==========================================
// find schema (v3)
// ==========================================

export const findStringSchema = z.string();

export const findObjectSchema = z.object({
  elementText: z.string().optional(),
  selector: z.string().optional(),
  elementId: z.string().optional(),
  elementTestId: z.string().optional(),
  elementClass: z.union([z.string(), z.array(z.string())]).optional(),
  elementAttribute: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  elementAria: z.string().optional(),
  timeout: z.number().int().default(5000).optional(),
  moveTo: z.boolean().default(true).optional(),
  click: z.union([clickV3Schema, z.object({ button: clickButtonSchema.optional() }).strict()]).optional(),
  type: typeV3Schema.optional(),
}).strict().refine(
  (data) => data.selector || data.elementText || data.elementId || data.elementTestId || data.elementClass || data.elementAttribute || data.elementAria,
  { message: "At least one of selector, elementText, elementId, elementTestId, elementClass, elementAttribute, or elementAria must be specified" }
);

export const findV3Schema = z.union([findStringSchema, findObjectSchema]);
export type FindV3 = z.infer<typeof findV3Schema>;

// ==========================================
// wait schema (v3)
// ==========================================

export const waitV3Schema = z.union([
  z.number().int().min(0),
  z.object({
    duration: z.number().int().min(0),
  }).strict(),
]);
export type WaitV3 = z.infer<typeof waitV3Schema>;

// ==========================================
// screenshot schema (v3)
// ==========================================

export const screenshotCropStringSchema = z.string();

export const screenshotCropObjectSchema = z.object({
  selector: z.string().optional(),
  elementText: z.string().optional(),
  padding: z.object({
    top: z.number().default(0).optional(),
    right: z.number().default(0).optional(),
    bottom: z.number().default(0).optional(),
    left: z.number().default(0).optional(),
  }).strict().optional(),
}).strict();

export const screenshotObjectSchema = z.object({
  path: z.string().optional(),
  directory: z.string().optional(),
  maxVariation: z.number().min(0).max(1).default(0.05).optional(),
  overwrite: z.union([z.boolean(), z.enum(["aboveVariation"])]).default("aboveVariation").optional(),
  crop: z.union([screenshotCropStringSchema, screenshotCropObjectSchema]).optional(),
}).strict();

export const screenshotV3Schema = z.union([
  z.literal(true),
  z.string(),
  screenshotObjectSchema,
]);
export type ScreenshotV3 = z.infer<typeof screenshotV3Schema>;

// ==========================================
// record schema (v3)
// ==========================================

export const recordObjectSchema = z.object({
  path: z.string().optional(),
  directory: z.string().optional(),
  overwrite: z.boolean().default(true).optional(),
}).strict();

export const recordV3Schema = z.union([
  z.literal(true),
  z.string(),
  recordObjectSchema,
]);
export type RecordV3 = z.infer<typeof recordV3Schema>;

// ==========================================
// stopRecord schema (v3)
// ==========================================

export const stopRecordV3Schema = z.literal(true);
export type StopRecordV3 = z.infer<typeof stopRecordV3Schema>;

// ==========================================
// loadVariables schema (v3)
// ==========================================

export const loadVariablesV3Schema = z.string();
export type LoadVariablesV3 = z.infer<typeof loadVariablesV3Schema>;

// ==========================================
// runShell schema (v3)
// ==========================================

export const runShellV3Schema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  workingDirectory: z.string().optional(),
  exitCodes: z.union([z.number().int(), z.array(z.number().int())]).default([0]).optional(),
  stdio: z.union([z.string(), z.object({
    stdout: z.string().optional(),
    stderr: z.string().optional(),
  }).strict()]).optional(),
  path: z.string().optional(),
  directory: z.string().optional(),
  maxVariation: z.number().min(0).max(1).default(0.05).optional(),
  overwrite: z.union([z.boolean(), z.enum(["aboveVariation"])]).default("aboveVariation").optional(),
  timeout: z.number().int().min(0).optional(),
}).strict();
export type RunShellV3 = z.infer<typeof runShellV3Schema>;

// ==========================================
// runCode schema (v3)
// ==========================================

export const runCodeV3Schema = z.object({
  language: z.enum(["python", "javascript", "bash", "go"]),
  code: z.string(),
  args: z.array(z.string()).optional(),
  workingDirectory: z.string().optional(),
  exitCodes: z.union([z.number().int(), z.array(z.number().int())]).default([0]).optional(),
  stdio: z.union([z.string(), z.object({
    stdout: z.string().optional(),
    stderr: z.string().optional(),
  }).strict()]).optional(),
  path: z.string().optional(),
  directory: z.string().optional(),
  maxVariation: z.number().min(0).max(1).default(0.05).optional(),
  overwrite: z.union([z.boolean(), z.enum(["aboveVariation"])]).default("aboveVariation").optional(),
  timeout: z.number().int().min(0).optional(),
}).strict();
export type RunCodeV3 = z.infer<typeof runCodeV3Schema>;

// ==========================================
// httpRequest schema (v3)
// ==========================================

export const httpMethodSchema = z.enum(["get", "GET", "post", "POST", "put", "PUT", "patch", "PATCH", "delete", "DELETE", "head", "HEAD", "options", "OPTIONS"]);

export const httpRequestV3Schema = z.object({
  method: httpMethodSchema.default("GET").optional(),
  url: z.string(),
  openApi: z.any().optional(), // Reference to OpenAPI schema
  request: z.object({
    body: z.any().optional(),
    headers: z.record(z.string()).optional(),
    parameters: z.record(z.any()).optional(),
  }).strict().optional(),
  response: z.object({
    body: z.any().optional(),
    headers: z.record(z.string()).optional(),
  }).strict().optional(),
  statusCodes: z.union([z.number().int(), z.array(z.number().int())]).default([200, 201]).optional(),
  allowAdditionalFields: z.boolean().optional(),
  timeout: z.number().int().min(0).optional(),
  path: z.string().optional(),
  directory: z.string().optional(),
  maxVariation: z.number().min(0).max(1).default(0.05).optional(),
  overwrite: z.union([z.boolean(), z.enum(["aboveVariation"])]).default("aboveVariation").optional(),
}).strict();
export type HttpRequestV3 = z.infer<typeof httpRequestV3Schema>;

// ==========================================
// saveCookie schema (v3)
// ==========================================

export const saveCookieStringSchema = z.string();

export const saveCookieObjectSchema = z.object({
  name: z.string(),
  path: z.string().optional(),
  directory: z.string().optional(),
  overwrite: z.boolean().default(true).optional(),
}).strict();

export const saveCookieV3Schema = z.union([saveCookieStringSchema, saveCookieObjectSchema]);
export type SaveCookieV3 = z.infer<typeof saveCookieV3Schema>;

// ==========================================
// loadCookie schema (v3)
// ==========================================

export const loadCookieStringSchema = z.string();

export const loadCookieObjectSchema = z.object({
  name: z.string(),
  path: z.string().optional(),
  directory: z.string().optional(),
}).strict();

export const loadCookieV3Schema = z.union([loadCookieStringSchema, loadCookieObjectSchema]);
export type LoadCookieV3 = z.infer<typeof loadCookieV3Schema>;

// ==========================================
// dragAndDrop schema (v3)
// ==========================================

export const dragAndDropTargetSchema = z.object({
  selector: z.string().optional(),
  elementText: z.string().optional(),
  elementId: z.string().optional(),
  elementTestId: z.string().optional(),
  elementClass: z.union([z.string(), z.array(z.string())]).optional(),
  elementAttribute: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  elementAria: z.string().optional(),
}).strict();

export const dragAndDropV3Schema = z.object({
  source: dragAndDropTargetSchema,
  target: dragAndDropTargetSchema,
}).strict();
export type DragAndDropV3 = z.infer<typeof dragAndDropV3Schema>;

// ==========================================
// openApi schema (v3)
// ==========================================

export const openApiV3Schema = z.object({
  name: z.string().optional(),
  descriptionPath: z.string().optional(),
  definition: z.any().optional(),
  headers: z.record(z.string()).optional(),
}).strict();
export type OpenApiV3 = z.infer<typeof openApiV3Schema>;

// ==========================================
// step schema (v3)
// ==========================================

export const stepCommonSchema = z.object({
  $schema: z.literal("https://raw.githubusercontent.com/doc-detective/common/refs/heads/main/dist/schemas/step_v3.schema.json").optional(),
  stepId: z.string().default(() => uuidv4()).optional(),
  description: z.string().optional(),
  unsafe: z.boolean().default(false).optional(),
  outputs: z.record(z.string()).default({}).optional(),
  variables: z.record(z.string()).default({}).optional(),
  breakpoint: z.boolean().default(false).optional(),
});

export const stepV3Schema = z.union([
  stepCommonSchema.extend({ checkLink: checkLinkV3Schema }).strict(),
  stepCommonSchema.extend({ click: clickV3Schema }).strict(),
  stepCommonSchema.extend({ find: findV3Schema }).strict(),
  stepCommonSchema.extend({ goTo: goToV3Schema }).strict(),
  stepCommonSchema.extend({ httpRequest: httpRequestV3Schema }).strict(),
  stepCommonSchema.extend({ runShell: runShellV3Schema }).strict(),
  stepCommonSchema.extend({ runCode: runCodeV3Schema }).strict(),
  stepCommonSchema.extend({ type: typeV3Schema }).strict(),
  stepCommonSchema.extend({ screenshot: screenshotV3Schema }).strict(),
  stepCommonSchema.extend({ saveCookie: saveCookieV3Schema }).strict(),
  stepCommonSchema.extend({ record: recordV3Schema }).strict(),
  stepCommonSchema.extend({ stopRecord: stopRecordV3Schema }).strict(),
  stepCommonSchema.extend({ loadVariables: loadVariablesV3Schema }).strict(),
  stepCommonSchema.extend({ dragAndDrop: dragAndDropV3Schema }).strict(),
  stepCommonSchema.extend({ loadCookie: loadCookieV3Schema }).strict(),
  stepCommonSchema.extend({ wait: waitV3Schema }).strict(),
]);
export type StepV3 = z.infer<typeof stepV3Schema>;

// ==========================================
// test schema (v3)
// ==========================================

export const testV3Schema = z.object({
  $schema: z.literal("https://raw.githubusercontent.com/doc-detective/common/refs/heads/main/dist/schemas/test_v3.schema.json").optional(),
  testId: z.string().default(() => uuidv4()).optional(),
  description: z.string().optional(),
  contentPath: z.string().optional(),
  detectSteps: z.boolean().optional(),
  before: z.union([z.string(), z.array(z.string())]).optional(),
  after: z.union([z.string(), z.array(z.string())]).optional(),
  runOn: z.union([contextV3Schema, z.array(contextV3Schema)]).optional(),
  openApi: z.array(openApiV3Schema).optional(),
  steps: z.array(stepV3Schema).min(1),
}).strict();
export type TestV3 = z.infer<typeof testV3Schema>;

// ==========================================
// spec schema (v3)
// ==========================================

export const specV3Schema = z.object({
  $schema: z.literal("https://raw.githubusercontent.com/doc-detective/common/refs/heads/main/dist/schemas/spec_v3.schema.json").optional(),
  specId: z.string().default(() => uuidv4()).optional(),
  description: z.string().optional(),
  contentPath: z.string().optional(),
  runOn: z.union([contextV3Schema, z.array(contextV3Schema)]).optional(),
  openApi: z.array(openApiV3Schema).optional(),
  tests: z.array(testV3Schema).min(1),
}).strict();
export type SpecV3 = z.infer<typeof specV3Schema>;

// ==========================================
// config schema (v3)
// ==========================================

export const environmentSchema = z.object({
  workingDirectory: z.string().optional(),
  platform: platformSchema,
  arch: z.enum(["arm32", "arm64", "x32", "x64"]).optional(),
}).strict();

export const markupActionStringSchema = z.enum([
  "checkLink", "click", "find", "goTo", "httpRequest", "loadCookie",
  "loadVariables", "record", "runCode", "runShell", "saveCookie",
  "screenshot", "stopRecord", "type", "wait"
]);

export const inlineStatementsSchema = z.object({
  testStart: stringOrArraySchema.optional(),
  testEnd: stringOrArraySchema.optional(),
  ignoreStart: stringOrArraySchema.optional(),
  ignoreEnd: stringOrArraySchema.optional(),
  step: stringOrArraySchema.optional(),
}).strict();

export const markupDefinitionSchema = z.object({
  name: z.string().optional(),
  regex: stringOrArraySchema.optional(),
  batchMatches: z.boolean().default(false).optional(),
  actions: z.union([
    markupActionStringSchema,
    z.array(z.union([markupActionStringSchema, stepV3Schema])),
  ]).optional(),
}).strict();

export const fileTypePredefinedSchema = z.enum(["markdown", "asciidoc", "html", "dita"]);

export const fileTypeCustomSchema = z.object({
  name: z.string().optional(),
  extends: z.enum(["markdown", "asciidoc", "html"]).optional(),
  extensions: stringOrArraySchema.optional(),
  inlineStatements: inlineStatementsSchema.optional(),
  markup: z.array(markupDefinitionSchema).min(1).optional(),
}).strict().refine(
  (data) => data.extensions || data.extends,
  { message: "Either 'extensions' or 'extends' must be specified" }
);

export const fileTypeExecutableSchema = z.object({
  name: z.string().optional(),
  extensions: stringOrArraySchema,
  runShell: runShellV3Schema.optional(),
}).strict();

export const fileTypeSchema = z.union([
  fileTypePredefinedSchema,
  fileTypeCustomSchema,
  fileTypeExecutableSchema,
]);

export const telemetrySchema = z.object({
  send: z.boolean().default(true),
  userId: z.string().optional(),
}).strict();

export const integrationsSchema = z.object({
  openApi: z.array(openApiV3Schema).optional(),
  docDetectiveApi: z.object({
    apiKey: z.string().optional(),
  }).strict().optional(),
}).strict();

export const configV3Schema = z.object({
  $schema: z.literal("https://raw.githubusercontent.com/doc-detective/common/refs/heads/main/dist/schemas/config_v3.schema.json").optional(),
  configId: z.string().default(() => uuidv4()).optional(),
  configPath: z.string().optional(),
  input: stringOrArraySchema.default(".").optional(),
  output: z.string().default(".").optional(),
  recursive: z.boolean().default(true).optional(),
  relativePathBase: z.enum(["cwd", "file"]).default("file").optional(),
  loadVariables: loadVariablesV3Schema.optional(),
  origin: z.string().optional(),
  beforeAny: z.union([z.string(), z.array(z.string())]).optional(),
  afterAll: z.union([z.string(), z.array(z.string())]).optional(),
  detectSteps: z.boolean().default(true).optional(),
  allowUnsafeSteps: z.boolean().optional(),
  crawl: z.boolean().default(false).optional(),
  processDitaMaps: z.boolean().default(true).optional(),
  logLevel: z.enum(["silent", "error", "warning", "info", "debug"]).default("info").optional(),
  runOn: z.union([contextV3Schema, z.array(contextV3Schema)]).optional(),
  fileTypes: z.array(fileTypeSchema).min(1).default(["markdown", "asciidoc", "html", "dita"]).optional(),
  integrations: integrationsSchema.optional(),
  telemetry: telemetrySchema.default({ send: true }).optional(),
  concurrentRunners: z.union([z.number().int().min(1), z.literal(true)]).default(1).optional(),
  environment: environmentSchema.optional(),
  debug: z.union([z.boolean(), z.literal("stepThrough")]).default(false).optional(),
}).strict();
export type ConfigV3 = z.infer<typeof configV3Schema>;

// ==========================================
// report schema (v3)
// ==========================================

export const reportV3Schema = z.object({
  $schema: z.literal("https://raw.githubusercontent.com/doc-detective/common/refs/heads/main/dist/schemas/report_v3.schema.json").optional(),
  reportId: z.string().default(() => uuidv4()).optional(),
  timestamp: z.string().optional(),
  duration: z.number().optional(),
  status: z.enum(["passed", "failed", "skipped", "unknown"]).optional(),
  summary: z.object({
    total: z.number().int().optional(),
    passed: z.number().int().optional(),
    failed: z.number().int().optional(),
    skipped: z.number().int().optional(),
  }).strict().optional(),
  config: configV3Schema.optional(),
  results: z.array(z.any()).optional(),
}).strict();
export type ReportV3 = z.infer<typeof reportV3Schema>;

// ==========================================
// resolvedTests schema (v3)
// ==========================================

export const resolvedTestsV3Schema = z.object({
  beforeAny: z.array(specV3Schema).optional(),
  specs: z.array(specV3Schema),
  afterAll: z.array(specV3Schema).optional(),
}).strict();
export type ResolvedTestsV3 = z.infer<typeof resolvedTestsV3Schema>;

// ==========================================
// Exports - All schemas
// ==========================================

export const zodSchemaMap: Record<string, z.ZodSchema> = {
  // v3 schemas
  checkLink_v3: checkLinkV3Schema,
  click_v3: clickV3Schema,
  config_v3: configV3Schema,
  context_v3: contextV3Schema,
  dragAndDrop_v3: dragAndDropV3Schema,
  find_v3: findV3Schema,
  goTo_v3: goToV3Schema,
  httpRequest_v3: httpRequestV3Schema,
  loadCookie_v3: loadCookieV3Schema,
  loadVariables_v3: loadVariablesV3Schema,
  openApi_v3: openApiV3Schema,
  record_v3: recordV3Schema,
  report_v3: reportV3Schema,
  resolvedTests_v3: resolvedTestsV3Schema,
  runCode_v3: runCodeV3Schema,
  runShell_v3: runShellV3Schema,
  saveCookie_v3: saveCookieV3Schema,
  screenshot_v3: screenshotV3Schema,
  spec_v3: specV3Schema,
  step_v3: stepV3Schema,
  stopRecord_v3: stopRecordV3Schema,
  test_v3: testV3Schema,
  type_v3: typeV3Schema,
  wait_v3: waitV3Schema,
};

export type SchemaKey = keyof typeof zodSchemaMap;
