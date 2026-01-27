const sinon = require("sinon");
const { expect } = require("chai");
const fs = require("fs");
const child_process = require("child_process");

describe("ollama", () => {
  let sandbox;
  let ollama;

  before(async () => {
    try {
      ollama = require("../dist/ollama");
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

  describe("detectGpuType", () => {
    it("should detect nvidia gpu", () => {
      sandbox.stub(child_process, "execSync").returns(Buffer.from(""));
      expect(ollama.detectGpuType()).to.equal("nvidia");
    });

    it("should detect amd gpu", () => {
      const execSyncStub = sandbox.stub(child_process, "execSync");
      execSyncStub.withArgs("nvidia-smi", { stdio: "ignore" }).throws(new Error("Command failed"));

      const existsSyncStub = sandbox.stub(fs, "existsSync");
      existsSyncStub.withArgs("/dev/kfd").returns(true);
      existsSyncStub.withArgs("/dev/dri").returns(true);

      expect(ollama.detectGpuType()).to.equal("amd");
    });

    it("should detect no gpu", () => {
      const execSyncStub = sandbox.stub(child_process, "execSync");
      execSyncStub.withArgs("nvidia-smi", { stdio: "ignore" }).throws(new Error("Command failed"));

      const existsSyncStub = sandbox.stub(fs, "existsSync");
      existsSyncStub.returns(false);

      expect(ollama.detectGpuType()).to.equal("none");
    });
  });

  describe("isOllamaAvailable", () => {
    it("should return true when fetch succeeds", async () => {
      // Mock global fetch
      const fetchStub = sandbox.stub(global, "fetch").resolves({
        ok: true
      });

      const result = await ollama.isOllamaAvailable();
      expect(result).to.be.true;
      expect(fetchStub.calledWith("http://localhost:11434")).to.be.true;
    });

    it("should return false when fetch fails", async () => {
      sandbox.stub(global, "fetch").rejects(new Error("Connection refused"));

      const result = await ollama.isOllamaAvailable();
      expect(result).to.be.false;
    });

    it("should use custom base url", async () => {
      const fetchStub = sandbox.stub(global, "fetch").resolves({
        ok: true
      });

      await ollama.isOllamaAvailable("http://custom:1234");
      expect(fetchStub.calledWith("http://custom:1234")).to.be.true;
    });
  });

  describe("startOllamaContainer", () => {
    it("should start container with nvidia support", async () => {
      const execSyncStub = sandbox.stub(child_process, "execSync");
      // Docker check
      execSyncStub.withArgs("docker --version", { stdio: "ignore" }).returns(Buffer.from("Docker version 20.10.7"));
      
      // GPU check stub - since it's same module we can't stub internal call easily with sinon if it's direct export
      // But looking at code: `export function detectGpuType` and `export async function startOllamaContainer` which calls `detectGpuType()`
      // If they are in same module and compiled to one file, stubbing the export might not work if it calls local function directly.
      // However, usually in CJS/TS integration, stubbing the export works if it's called via `exports.detectGpuType` or similar, 
      // OR if we accept we might need to mock the system calls underlying detectGpuType again.
      
      // Let's mock the underlying system calls for detectGpuType to return nvidia
      execSyncStub.withArgs("nvidia-smi", { stdio: "ignore" }).returns(Buffer.from("")); // Simulate nvidia present

      await ollama.startOllamaContainer();

      expect(execSyncStub.calledWith(sinon.match.string, { stdio: "inherit" })).to.be.true;
      // Find the call that starts docker
      const calls = execSyncStub.getCalls();
      const startCall = calls.find(c => c.args[0].startsWith("docker run"));
      expect(startCall).to.exist;
      expect(startCall.args[0]).to.include("--gpus=all");
      expect(startCall.args[0]).to.include("ollama/ollama");
    });

    it("should start container with amd support", async () => {
      const execSyncStub = sandbox.stub(child_process, "execSync");
      execSyncStub.withArgs("docker --version", { stdio: "ignore" }).returns(Buffer.from("Docker version 20.10.7"));
      
      // Simulate AMD
      execSyncStub.withArgs("nvidia-smi", { stdio: "ignore" }).throws(new Error("Command failed"));
      const existsSyncStub = sandbox.stub(fs, "existsSync");
      existsSyncStub.withArgs("/dev/kfd").returns(true);
      existsSyncStub.withArgs("/dev/dri").returns(true);

      await ollama.startOllamaContainer();

      const calls = execSyncStub.getCalls();
      const startCall = calls.find(c => c.args[0].startsWith("docker run"));
      
      expect(startCall.args[0]).to.include("--device /dev/kfd");
      expect(startCall.args[0]).to.include("ollama/ollama:rocm");
    });

    it("should start container with cpu only", async () => {
      const execSyncStub = sandbox.stub(child_process, "execSync");
      execSyncStub.withArgs("docker --version", { stdio: "ignore" }).returns(Buffer.from("Docker version 20.10.7"));
      
      // Simulate None
      execSyncStub.withArgs("nvidia-smi", { stdio: "ignore" }).throws(new Error("Command failed"));
      const existsSyncStub = sandbox.stub(fs, "existsSync");
      existsSyncStub.returns(false);

      await ollama.startOllamaContainer();

      const calls = execSyncStub.getCalls();
      const startCall = calls.find(c => c.args[0].startsWith("docker run"));
      
      expect(startCall.args[0]).to.not.include("--gpus");
      expect(startCall.args[0]).to.not.include("--device");
    });

    it("should throw if docker is missing", async () => {
      const execSyncStub = sandbox.stub(child_process, "execSync");
      execSyncStub.withArgs("docker --version", { stdio: "ignore" }).throws(new Error("Command failed"));

      try {
        await ollama.startOllamaContainer();
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.contain("Docker is not installed");
      }
    });
  });

  describe("isModelAvailable", () => {
    it("should return true if model exists", async () => {
      sandbox.stub(global, "fetch").resolves({
        ok: true,
        json: async () => ({ models: [{ name: "llama3:latest" }] })
      });

      const result = await ollama.isModelAvailable({ model: "llama3" });
      expect(result).to.be.true;
    });

    it("should match exact model name", async () => {
      sandbox.stub(global, "fetch").resolves({
        ok: true,
        json: async () => ({ models: [{ name: "llama3:8b" }] })
      });

      const result = await ollama.isModelAvailable({ model: "llama3:8b" });
      expect(result).to.be.true;
    });

    it("should return false if model missing", async () => {
      sandbox.stub(global, "fetch").resolves({
        ok: true,
        json: async () => ({ models: [{ name: "other:latest" }] })
      });

      const result = await ollama.isModelAvailable({ model: "llama3" });
      expect(result).to.be.false;
    });

    it("should handle fetch error", async () => {
      sandbox.stub(global, "fetch").rejects(new Error("Network error"));
      const result = await ollama.isModelAvailable({ model: "llama3" });
      expect(result).to.be.false;
    });
  });

  describe("ensureModelAvailable", () => {
    // NOTE: In the CJS test environment, we are testing the built JS in dist/.
    // The sinon stubs on `ollama` module exports only work if the code under test calls those functions via `this` or the exported object.
    // However, TypeScript/Babel transpilation often converts local calls (e.g., calling `isOllamaAvailable` from `ensureModelAvailable`) 
    // to direct internal function calls, bypassing the `exports` object. 
    // This makes sinon stubs on the export ineffective for internal calls.
    // 
    // To fix the timeout issues (caused by real network calls happening instead of stubs) and assertion failures:
    // 1. We must stub the low-level dependencies (`fetch`, `child_process`, `fs`) that the internal functions use.
    // 2. We cannot rely on stubbing `ollama.isOllamaAvailable` to influence `ollama.ensureModelAvailable`.
    // 3. Instead, we stub `fetch` to simulate the behavior of `isOllamaAvailable` and `isModelAvailable`.

    it("should return false if Ollama is not available", async () => {
      // Simulate isOllamaAvailable() returning false by making fetch throw or return error
      const fetchStub = sandbox.stub(global, "fetch");
      fetchStub.rejects(new Error("Connection refused")); // Causes isOllamaAvailable to return false

      const result = await ollama.ensureModelAvailable({ model: "llama3" });
      expect(result).to.be.false;
    });

    it("should return true if model is already available", async () => {
      const fetchStub = sandbox.stub(global, "fetch");
      
      // 1. isOllamaAvailable -> returns true
      fetchStub.onCall(0).resolves({ ok: true });
      
      // 2. isModelAvailable -> fetch tags -> returns true and model list
      fetchStub.onCall(1).resolves({
        ok: true,
        json: async () => ({ models: [{ name: "llama3:latest" }] })
      });

      const result = await ollama.ensureModelAvailable({ model: "llama3" });
      expect(result).to.be.true;
    });

    it("should handle pull error response", async () => {
      const fetchStub = sandbox.stub(global, "fetch");
      
      // 1. isOllamaAvailable -> true
      fetchStub.onCall(0).resolves({ ok: true });
      
      // 2. isModelAvailable -> false (model not found)
      fetchStub.onCall(1).resolves({
        ok: true,
        json: async () => ({ models: [] })
      });
      
      // 3. pull -> error
      fetchStub.onCall(2).resolves({
        ok: false,
        status: 500
      });

      const result = await ollama.ensureModelAvailable({ model: "llama3" });
      expect(result).to.be.false;
    });

    it("should handle invalid reader", async () => {
      const fetchStub = sandbox.stub(global, "fetch");
      
      // 1. isOllamaAvailable -> true
      fetchStub.onCall(0).resolves({ ok: true });
      
      // 2. isModelAvailable -> false
      fetchStub.onCall(1).resolves({
        ok: true,
        json: async () => ({ models: [] })
      });

      // 3. pull -> no reader
      fetchStub.onCall(2).resolves({
        ok: true,
        body: null // No reader
      });

      const result = await ollama.ensureModelAvailable({ model: "llama3" });
      expect(result).to.be.false;
    });
  });

  describe("ensureOllamaRunning", () => {
    it("should return true if already available", async () => {
      // isOllamaAvailable -> true
      sandbox.stub(global, "fetch").resolves({ ok: true });
      
      const result = await ollama.ensureOllamaRunning();
      expect(result).to.be.true;
    });

    it("should start container and wait if not available", async () => {
      const fetchStub = sandbox.stub(global, "fetch");
      
      // 1. initial check -> false
      fetchStub.onCall(0).rejects(new Error("Not running")); 
      
      // 2. waitForOllama loop -> eventually true
      // Note: waitForOllama calls fetch inside a loop. We need it to succeed eventually.
      // But ensureOllamaRunning ALSO calls startOllamaContainer.
      
      const execSyncStub = sandbox.stub(child_process, "execSync");
      execSyncStub.withArgs("docker --version", { stdio: "ignore" }).returns(Buffer.from("Docker version"));
      execSyncStub.withArgs("nvidia-smi", { stdio: "ignore" }).throws(new Error("No GPU")); // CPU mode
      sandbox.stub(fs, "existsSync").returns(false);

      // We need to handle the calls:
      // 1. ensureOllamaRunning -> isOllamaAvailable (fail)
      // 2. stopOllamaContainer -> execSync
      // 3. startOllamaContainer -> execSync
      // 4. waitForOllama -> fetch loop
      // 5. ensureModelAvailable -> isOllamaAvailable (pass) -> isModelAvailable (pass/fail)
      
      // Let's simplify:
      fetchStub.onCall(0).rejects(new Error("Not running"));
      // waitForOllama succeeds
      fetchStub.onCall(1).resolves({ ok: true }); 
      
      // ensureModelAvailable calls:
      // isOllamaAvailable
      fetchStub.onCall(2).resolves({ ok: true });
      // isModelAvailable -> let's say it exists to exit early
      fetchStub.onCall(3).resolves({
        ok: true,
        json: async () => ({ models: [{ name: "qwen3:4b:latest" }] }) // default model
      });

      const result = await ollama.ensureOllamaRunning();
      expect(result).to.be.true;
    });

    it("should return false if container start fails", async () => {
      sandbox.stub(global, "fetch").rejects(new Error("Not running"));
      
      const execSyncStub = sandbox.stub(child_process, "execSync");
      execSyncStub.withArgs("docker --version", { stdio: "ignore" }).throws(new Error("Docker missing"));

      const result = await ollama.ensureOllamaRunning();
      expect(result).to.be.false;
    });

    it("should throw if container starts but not available", async () => {
      const fetchStub = sandbox.stub(global, "fetch");
      fetchStub.rejects(new Error("Not running")); // Always fail fetch to simulate not starting
      
      const execSyncStub = sandbox.stub(child_process, "execSync");
      execSyncStub.withArgs("docker --version", { stdio: "ignore" }).returns(Buffer.from("Docker version"));
      execSyncStub.withArgs("nvidia-smi", { stdio: "ignore" }).throws(new Error("No GPU"));
      sandbox.stub(fs, "existsSync").returns(false);
      
      // Mock setTimeout to speed up waitForOllama
      const clock = sandbox.useFakeTimers();
      
      // Run in background because waitForOllama loops
      const promise = ollama.ensureOllamaRunning();
      
      // Fast forward time to trigger timeout in waitForOllama
      // OLLAMA_STARTUP_TIMEOUT_MS is 30s
      await clock.tickAsync(35000);
      
      try {
        await promise;
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e.message).to.contain("Ollama container started but did not become available");
      }
    });
  });

  describe("stopOllamaContainer", () => {
    it("should stop and remove container", async () => {
      const execSyncStub = sandbox.stub(child_process, "execSync");
      
      await ollama.stopOllamaContainer();

      expect(execSyncStub.calledWith("docker stop ollama", { stdio: "ignore" })).to.be.true;
      expect(execSyncStub.calledWith("docker rm ollama", { stdio: "ignore" })).to.be.true;
    });

    it("should handle errors gracefully", async () => {
      const execSyncStub = sandbox.stub(child_process, "execSync");
      execSyncStub.throws(new Error("Command failed"));
      
      await ollama.stopOllamaContainer();
      // Should not throw
    });
  });

  describe("isDockerRunning", () => {
    it("should return false when docker command fails", () => {
      const execSyncStub = sandbox.stub(child_process, "execSync");
      execSyncStub.withArgs("docker --version", { stdio: "ignore" }).throws(new Error("Command failed"));
      
      expect(ollama.isDockerRunning()).to.be.false;
    });

    it("should return true when docker command succeeds", () => {
      const execSyncStub = sandbox.stub(child_process, "execSync");
      execSyncStub.withArgs("docker --version", { stdio: "ignore" }).returns(Buffer.from("Docker version 20.10.7"));
      
      expect(ollama.isDockerRunning()).to.be.true;
    });
  });

  describe("getGpuFlags", () => {
    it("should return flags for nvidia", () => {
      const execSyncStub = sandbox.stub(child_process, "execSync");
      execSyncStub.withArgs("nvidia-smi", { stdio: "ignore" }).returns(Buffer.from(""));
      
      expect(ollama.getGpuFlags()).to.equal("--gpus=all");
    });

    it("should return flags for amd", () => {
      const execSyncStub = sandbox.stub(child_process, "execSync");
      execSyncStub.withArgs("nvidia-smi", { stdio: "ignore" }).throws(new Error("No nvidia"));
      
      const existsSyncStub = sandbox.stub(fs, "existsSync");
      existsSyncStub.withArgs("/dev/kfd").returns(true);
      existsSyncStub.withArgs("/dev/dri").returns(true);
      
      expect(ollama.getGpuFlags()).to.equal("--device /dev/kfd --device /dev/dri -e OLLAMA_ROCM_SUPPORT=1");
    });
  });
});
