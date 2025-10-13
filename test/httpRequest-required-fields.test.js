const { validate } = require("../src/index");
const assert = require("assert");

describe("httpRequest_v3 required fields validation", function () {
  it("should accept httpRequest with only url", function () {
    const test = { url: "https://example.com" };
    const result = validate({ schemaKey: "httpRequest_v3", object: test });
    assert.ok(result.valid, `Validation failed: ${result.errors}`);
  });

  it("should accept httpRequest with only openApi string", function () {
    const test = { openApi: "getUserById" };
    const result = validate({ schemaKey: "httpRequest_v3", object: test });
    assert.ok(result.valid, `Validation failed: ${result.errors}`);
  });

  it("should accept httpRequest with openApi object containing only operationId", function () {
    const test = { openApi: { operationId: "getUserById" } };
    const result = validate({ schemaKey: "httpRequest_v3", object: test });
    assert.ok(result.valid, `Validation failed: ${result.errors}`);
  });

  it("should accept httpRequest with openApi object containing only descriptionPath", function () {
    const test = {
      openApi: { descriptionPath: "https://api.example.com/openapi.json" },
    };
    const result = validate({ schemaKey: "httpRequest_v3", object: test });
    assert.ok(
      result.valid,
      `Validation failed: ${result.errors}. This test validates that openApi can have descriptionPath without operationId, which was fixed in the schema.`
    );
  });

  it("should accept httpRequest with openApi object containing both descriptionPath and operationId", function () {
    const test = {
      openApi: {
        descriptionPath: "https://api.example.com/openapi.json",
        operationId: "getUserById",
      },
    };
    const result = validate({ schemaKey: "httpRequest_v3", object: test });
    assert.ok(result.valid, `Validation failed: ${result.errors}`);
  });

  it("should accept httpRequest with both url and openApi", function () {
    const test = {
      url: "https://example.com",
      openApi: "getUserById",
    };
    const result = validate({ schemaKey: "httpRequest_v3", object: test });
    assert.ok(result.valid, `Validation failed: ${result.errors}`);
  });

  it("should reject httpRequest with neither url nor openApi", function () {
    const test = { method: "get" };
    const result = validate({ schemaKey: "httpRequest_v3", object: test });
    assert.ok(
      !result.valid,
      "Validation should fail when neither url nor openApi is provided"
    );
  });

  it("should reject httpRequest with openApi object containing neither operationId nor descriptionPath", function () {
    const test = { openApi: { name: "MyAPI" } };
    const result = validate({ schemaKey: "httpRequest_v3", object: test });
    assert.ok(
      !result.valid,
      "Validation should fail when openApi object has neither operationId nor descriptionPath"
    );
  });

  it("should reject empty httpRequest object", function () {
    const test = {};
    const result = validate({ schemaKey: "httpRequest_v3", object: test });
    assert.ok(!result.valid, "Validation should fail for empty object");
  });
});
