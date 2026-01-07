const sinon = require("sinon");
const axios = require("axios");
const fs = require("fs");
const { readFile } = require("../src/files");

(async () => {
  const { expect } = await import("chai");

  describe("readFile", function () {
    let axiosGetStub;
    let fsReadFileStub;

    beforeEach(function () {
      axiosGetStub = sinon.stub(axios, "get");
      fsReadFileStub = sinon.stub(fs.promises, "readFile");
    });

    afterEach(function () {
      sinon.restore();
    });

    describe("input validation", function () {
      it("should throw error when fileURLOrPath is missing", async function () {
        try {
          await readFile({});
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error.message).to.equal("fileURLOrPath is required");
        }
      });

      it("should throw error when fileURLOrPath is undefined", async function () {
        try {
          await readFile({ fileURLOrPath: undefined });
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error.message).to.equal("fileURLOrPath is required");
        }
      });

      it("should throw error when fileURLOrPath is not a string", async function () {
        try {
          await readFile({ fileURLOrPath: 123 });
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error.message).to.equal("fileURLOrPath must be a string");
        }
      });

      it("should throw error when fileURLOrPath is an object", async function () {
        try {
          await readFile({ fileURLOrPath: { path: "/test" } });
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error.message).to.equal("fileURLOrPath must be a string");
        }
      });

      it("should throw error when fileURLOrPath is an empty string", async function () {
        try {
          await readFile({ fileURLOrPath: "" });
          expect.fail("Should have thrown an error");
        } catch (error) {
          // Empty string is falsy, so first check catches it
          expect(error.message).to.equal("fileURLOrPath is required");
        }
      });

      it("should throw error when fileURLOrPath is whitespace only", async function () {
        try {
          await readFile({ fileURLOrPath: "   " });
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error.message).to.equal("fileURLOrPath cannot be an empty string");
        }
      });
    });

    describe("remote file reading", function () {
      it("should read a remote JSON file", async function () {
        const fileURL = "http://example.com/file.json";
        const fileContent = '{"key": "value"}';
        axiosGetStub.resolves({ data: fileContent });

        const result = await readFile({ fileURLOrPath: fileURL });

        expect(result).to.deep.equal({ key: "value" });
        expect(axiosGetStub.calledOnceWith(fileURL)).to.be.true;
      });

      it("should read a remote YAML file", async function () {
        const fileURL = "http://example.com/file.yaml";
        const fileContent = "key: value";
        axiosGetStub.resolves({ data: fileContent });

        const result = await readFile({ fileURLOrPath: fileURL });

        expect(result).to.deep.equal({ key: "value" });
        expect(axiosGetStub.calledOnceWith(fileURL)).to.be.true;
      });

      it("should read a remote file via https", async function () {
        const fileURL = "https://example.com/file.json";
        const fileContent = '{"key": "value"}';
        axiosGetStub.resolves({ data: fileContent });

        const result = await readFile({ fileURLOrPath: fileURL });

        expect(result).to.deep.equal({ key: "value" });
        expect(axiosGetStub.calledOnceWith(fileURL)).to.be.true;
      });

      it("should return null if remote file cannot be read", async function () {
        const fileURL = "http://example.com/file.json";
        axiosGetStub.rejects(new Error("Network error"));

        const result = await readFile({ fileURLOrPath: fileURL });

        expect(result).to.be.null;
        expect(axiosGetStub.calledOnceWith(fileURL)).to.be.true;
      });
    });

    describe("local file reading", function () {
      it("should read a local JSON file", async function () {
        const filePath = "/path/to/file.json";
        const fileContent = '{"key": "value"}';
        fsReadFileStub.resolves(fileContent);

        const result = await readFile({ fileURLOrPath: filePath });

        expect(result).to.deep.equal({ key: "value" });
        expect(fsReadFileStub.calledOnceWith(filePath, "utf8")).to.be.true;
      });

      it("should read a local YAML file with .yaml extension", async function () {
        const filePath = "/path/to/file.yaml";
        const fileContent = "key: value";
        fsReadFileStub.resolves(fileContent);

        const result = await readFile({ fileURLOrPath: filePath });

        expect(result).to.deep.equal({ key: "value" });
        expect(fsReadFileStub.calledOnceWith(filePath, "utf8")).to.be.true;
      });

      it("should read a local YAML file with .yml extension", async function () {
        const filePath = "/path/to/file.yml";
        const fileContent = "key: value";
        fsReadFileStub.resolves(fileContent);

        const result = await readFile({ fileURLOrPath: filePath });

        expect(result).to.deep.equal({ key: "value" });
        expect(fsReadFileStub.calledOnceWith(filePath, "utf8")).to.be.true;
      });

      it("should return raw content for non-JSON/YAML files", async function () {
        const filePath = "/path/to/file.txt";
        const fileContent = "plain text content";
        fsReadFileStub.resolves(fileContent);

        const result = await readFile({ fileURLOrPath: filePath });

        expect(result).to.equal(fileContent);
        expect(fsReadFileStub.calledOnceWith(filePath, "utf8")).to.be.true;
      });

      it("should return null if local file cannot be found", async function () {
        const filePath = "/path/to/nonexistent.json";
        fsReadFileStub.rejects({ code: "ENOENT" });

        const result = await readFile({ fileURLOrPath: filePath });

        expect(result).to.be.null;
        expect(fsReadFileStub.calledOnceWith(filePath, "utf8")).to.be.true;
      });

      it("should return null if local file read error occurs", async function () {
        const filePath = "/path/to/file.json";
        fsReadFileStub.rejects(new Error("Read error"));

        const result = await readFile({ fileURLOrPath: filePath });

        expect(result).to.be.null;
        expect(fsReadFileStub.calledOnceWith(filePath, "utf8")).to.be.true;
      });
    });

    describe("parse error handling", function () {
      it("should return raw content when JSON parsing fails", async function () {
        const filePath = "/path/to/file.json";
        const fileContent = "not valid json {";
        fsReadFileStub.resolves(fileContent);

        const result = await readFile({ fileURLOrPath: filePath });

        expect(result).to.equal(fileContent);
      });

      it("should return raw content when YAML parsing fails", async function () {
        const filePath = "/path/to/file.yaml";
        const fileContent = "invalid: yaml: content: [";
        fsReadFileStub.resolves(fileContent);

        const result = await readFile({ fileURLOrPath: filePath });

        expect(result).to.equal(fileContent);
      });

      it("should return raw content when .yml parsing fails", async function () {
        const filePath = "/path/to/file.yml";
        const fileContent = "invalid: yaml: content: [";
        fsReadFileStub.resolves(fileContent);

        const result = await readFile({ fileURLOrPath: filePath });

        expect(result).to.equal(fileContent);
      });
    });
  });
})();
