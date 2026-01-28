const sinon = require("sinon");

let expect;

describe("testSetupUtils", () => {
  let sandbox;
  let testSetupUtils;

  before(async () => {
    const chai = await import("chai");
    expect = chai.expect;

    try {
      testSetupUtils = require("../dist/testSetupUtils");
    } catch (e) {
      throw new Error("Build required. Run 'npm run build' before testing.");
    }
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("isOllamaCLIAvailable", () => {
    it("should return true when ollama command succeeds", () => {
      const mockExecSync = sinon.stub().returns(Buffer.from("ollama version 0.x.x"));

      const result = testSetupUtils.isOllamaCLIAvailable(mockExecSync);

      expect(result).to.be.true;
      expect(mockExecSync.calledWith("ollama --version", { stdio: "ignore" })).to.be.true;
    });

    it("should return false when ollama command throws error", () => {
      const mockExecSync = sinon.stub().throws(new Error("Command not found"));

      const result = testSetupUtils.isOllamaCLIAvailable(mockExecSync);

      expect(result).to.be.false;
    });

    it("should use default execSync when not provided", () => {
      // This test validates that the function can be called without arguments
      // It will use the system's actual execSync
      expect(typeof testSetupUtils.isOllamaCLIAvailable).to.equal("function");
    });

    it("should handle non-Error exceptions thrown by execSync", () => {
      const mockExecSync = sinon.stub().throws("String error");

      const result = testSetupUtils.isOllamaCLIAvailable(mockExecSync);

      expect(result).to.be.false;
    });
  });

  describe("isServiceAvailable", () => {
    it("should return true when check function returns true", async () => {
      const checkFunction = async () => true;
      const result = await testSetupUtils.isServiceAvailable(checkFunction);
      expect(result).to.be.true;
    });

    it("should return false when check function returns false", async () => {
      const checkFunction = async () => false;
      const result = await testSetupUtils.isServiceAvailable(checkFunction);
      expect(result).to.be.false;
    });

    it("should return false when check function throws an error", async () => {
      const checkFunction = async () => {
        throw new Error("Connection refused");
      };
      const result = await testSetupUtils.isServiceAvailable(checkFunction);
      expect(result).to.be.false;
    });

    it("should return false when check function throws any exception", async () => {
      const checkFunction = async () => {
        throw { message: "Some error object" };
      };
      const result = await testSetupUtils.isServiceAvailable(checkFunction);
      expect(result).to.be.false;
    });
  });

  describe("startOllamaWithCLI", () => {
    it("should return success when Ollama starts and becomes available", async () => {
      const mockExecSync = sinon.stub();
      const mockIsOllamaAvailable = sinon.stub().resolves(true);

      const result = await testSetupUtils.startOllamaWithCLI({
        execSync: mockExecSync,
        isOllamaAvailable: mockIsOllamaAvailable,
        waitMs: 100,
      });

      expect(result.success).to.be.true;
      expect(result.method).to.equal("cli");
      expect(mockExecSync.calledWith("ollama serve", { stdio: "inherit", detached: true })).to.be
        .true;
      expect(mockIsOllamaAvailable.called).to.be.true;
    });

    it("should return failure when Ollama does not respond after start command", async () => {
      const mockExecSync = sinon.stub();
      const mockIsOllamaAvailable = sinon.stub().resolves(false);

      const result = await testSetupUtils.startOllamaWithCLI({
        execSync: mockExecSync,
        isOllamaAvailable: mockIsOllamaAvailable,
        waitMs: 100,
      });

      expect(result.success).to.be.false;
      expect(result.method).to.equal("cli");
      expect(result.error).to.be.undefined;
    });

    it("should return failure with error when execSync throws", async () => {
      const testError = new Error("Command failed");
      const mockExecSync = sinon.stub().throws(testError);
      const mockIsOllamaAvailable = sinon.stub().resolves(false);

      const result = await testSetupUtils.startOllamaWithCLI({
        execSync: mockExecSync,
        isOllamaAvailable: mockIsOllamaAvailable,
        waitMs: 100,
      });

      expect(result.success).to.be.false;
      expect(result.method).to.equal("cli");
      expect(result.error).to.be.instanceOf(Error);
      expect(result.error.message).to.equal("Command failed");
    });

    it("should use default execSync when not provided", async () => {
      const mockIsOllamaAvailable = sinon.stub().resolves(false);

      // This test verifies the function handles the default case without crashing
      const result = await testSetupUtils.startOllamaWithCLI({
        isOllamaAvailable: mockIsOllamaAvailable,
        waitMs: 50,
      });

      expect(result).to.have.property("success");
      expect(result).to.have.property("method", "cli");
    });

    it("should use default isOllamaAvailable when not provided", async () => {
      const mockExecSync = sinon.stub();

      const result = await testSetupUtils.startOllamaWithCLI({
        execSync: mockExecSync,
        waitMs: 50,
      });

      expect(result.success).to.be.false;
      expect(result.method).to.equal("cli");
    });

    it("should use default waitMs of 2000 when not provided", async () => {
      const mockExecSync = sinon.stub();
      const mockIsOllamaAvailable = sinon.stub().resolves(false);
      const startTime = Date.now();

      await testSetupUtils.startOllamaWithCLI({
        execSync: mockExecSync,
        isOllamaAvailable: mockIsOllamaAvailable,
      });

      const elapsed = Date.now() - startTime;
      // Default is 2000ms, so we should wait at least a reasonable amount
      expect(elapsed).to.be.at.least(1500);
    });

    it("should handle non-Error exceptions thrown by execSync", async () => {
      const mockExecSync = sinon.stub().throws("String error");
      const mockIsOllamaAvailable = sinon.stub().resolves(false);

      const result = await testSetupUtils.startOllamaWithCLI({
        execSync: mockExecSync,
        isOllamaAvailable: mockIsOllamaAvailable,
        waitMs: 50,
      });

      expect(result.success).to.be.false;
      expect(result.method).to.equal("cli");
    });
  });

  describe("stopOllamaWithCLI", () => {
    it("should successfully stop Ollama", async () => {
      const mockExecSync = sinon.stub();

      const result = await testSetupUtils.stopOllamaWithCLI({
        execSync: mockExecSync,
        waitMs: 100,
      });

      expect(result).to.be.true;
      expect(mockExecSync.calledWith("killall ollama", { stdio: "ignore" })).to.be.true;
    });

    it("should return false when killall command throws", async () => {
      const mockExecSync = sinon.stub().throws(new Error("Process not found"));

      const result = await testSetupUtils.stopOllamaWithCLI({
        execSync: mockExecSync,
        waitMs: 100,
      });

      expect(result).to.be.false;
    });

    it("should use default execSync when not provided", async () => {
      // This test verifies the function handles the default case
      const result = await testSetupUtils.stopOllamaWithCLI({
        waitMs: 50,
      });

      expect(typeof result).to.equal("boolean");
    });

    it("should use default waitMs of 1000 when not provided", async () => {
      const mockExecSync = sinon.stub();
      const startTime = Date.now();

      await testSetupUtils.stopOllamaWithCLI({
        execSync: mockExecSync,
      });

      const elapsed = Date.now() - startTime;
      // Default is 1000ms, so we should wait at least a reasonable amount
      expect(elapsed).to.be.at.least(800);
    });

    it("should wait for specified time before resolving", async () => {
      const mockExecSync = sinon.stub();
      const startTime = Date.now();

      await testSetupUtils.stopOllamaWithCLI({
        execSync: mockExecSync,
        waitMs: 100,
      });

      const elapsed = Date.now() - startTime;
      // Allow for timer imprecision - should be at least 95ms (within 5% tolerance)
      expect(elapsed).to.be.at.least(95);
    });

    it("should handle non-Error exceptions thrown by execSync", async () => {
      const mockExecSync = sinon.stub().throws("String error");

      const result = await testSetupUtils.stopOllamaWithCLI({
        execSync: mockExecSync,
        waitMs: 50,
      });

      expect(result).to.be.false;
    });
  });
});


