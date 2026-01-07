const sinon = require("sinon");
const fs = require("fs");
const path = require("path");

(async () => {
  const { expect } = await import("chai");
  const { resolvePaths } = require("../src/resolvePaths");

  describe("resolvePaths", function () {
    const mockFilePath = "/home/user/project/config.json";
    const cwd = process.cwd();

    describe("config object resolution (using nested/objectType)", function () {
      it("should resolve relative paths with relativePathBase='file'", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          input: "./input",
          output: "./output",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "config",
        });

        expect(result.input).to.equal(path.resolve("/home/user/project", "./input"));
        expect(result.output).to.equal(path.resolve("/home/user/project", "./output"));
      });

      it("should resolve relative paths with relativePathBase='cwd'", async function () {
        const config = { relativePathBase: "cwd" };
        const object = {
          input: "./input",
          output: "./output",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "config",
        });

        expect(result.input).to.equal(path.resolve(cwd, "./input"));
        expect(result.output).to.equal(path.resolve(cwd, "./output"));
      });

      it("should not modify absolute paths", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          input: "/absolute/path/to/input",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "config",
        });

        expect(result.input).to.equal("/absolute/path/to/input");
      });

      it("should not modify http:// URLs", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          input: "http://example.com/input.json",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "config",
        });

        expect(result.input).to.equal("http://example.com/input.json");
      });

      it("should not modify https:// URLs", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          input: "https://example.com/input.json",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "config",
        });

        expect(result.input).to.equal("https://example.com/input.json");
      });

      it("should not modify heretto: URIs", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          input: "heretto:some-identifier",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "config",
        });

        expect(result.input).to.equal("heretto:some-identifier");
      });

      it("should resolve loadVariables path", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          loadVariables: "./vars.json",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "config",
        });

        expect(result.loadVariables).to.equal(path.resolve("/home/user/project", "./vars.json"));
      });

      it("should resolve mediaDirectory path", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          mediaDirectory: "./media",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "config",
        });

        expect(result.mediaDirectory).to.equal(path.resolve("/home/user/project", "./media"));
      });

      it("should resolve beforeAny and afterAll paths", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          beforeAny: "./setup.js",
          afterAll: "./cleanup.js",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "config",
        });

        expect(result.beforeAny).to.equal(path.resolve("/home/user/project", "./setup.js"));
        expect(result.afterAll).to.equal(path.resolve("/home/user/project", "./cleanup.js"));
      });
    });

    describe("spec object resolution (using nested/objectType)", function () {
      it("should resolve file path in spec object", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          file: "./test.md",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "spec",
        });

        expect(result.file).to.equal(path.resolve("/home/user/project", "./test.md"));
      });

      it("should resolve path relative to directory when directory is absolute", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          directory: "/absolute/dir",
          path: "file.png",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "spec",
        });

        expect(result.path).to.equal(path.resolve("/absolute/dir", "file.png"));
      });

      it("should resolve path relative to resolved directory when directory is relative", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          directory: "./screenshots",
          path: "file.png",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "spec",
        });

        const expectedDir = path.resolve("/home/user/project", "./screenshots");
        expect(result.directory).to.equal(expectedDir);
        expect(result.path).to.equal(path.resolve(expectedDir, "file.png"));
      });

      it("should resolve before and after paths in spec", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          before: "./before.js",
          after: "./after.js",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "spec",
        });

        expect(result.before).to.equal(path.resolve("/home/user/project", "./before.js"));
        expect(result.after).to.equal(path.resolve("/home/user/project", "./after.js"));
      });

      it("should resolve workingDirectory path", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          workingDirectory: "./work",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "spec",
        });

        expect(result.workingDirectory).to.equal(path.resolve("/home/user/project", "./work"));
      });

      it("should not resolve requestData objects", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          requestData: {
            path: "./should-not-resolve.json",
          },
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "spec",
        });

        expect(result.requestData.path).to.equal("./should-not-resolve.json");
      });

      it("should not resolve responseData objects", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          responseData: {
            file: "./should-not-resolve.json",
          },
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "spec",
        });

        expect(result.responseData.file).to.equal("./should-not-resolve.json");
      });

      it("should not resolve requestHeaders objects", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          requestHeaders: {
            path: "./should-not-resolve.json",
          },
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "spec",
        });

        expect(result.requestHeaders.path).to.equal("./should-not-resolve.json");
      });
    });

    describe("nested object resolution", function () {
      it("should resolve paths in nested objects", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          tests: [
            {
              steps: [
                {
                  screenshot: {
                    path: "screenshot.png",
                    directory: "./screenshots",
                  },
                },
              ],
            },
          ],
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "spec",
        });

        const expectedDir = path.resolve("/home/user/project", "./screenshots");
        expect(result.tests[0].steps[0].screenshot.directory).to.equal(expectedDir);
      });

      it("should resolve paths in arrays of strings", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          before: ["./setup1.js", "./setup2.js"],
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "spec",
        });

        expect(result.before[0]).to.equal(path.resolve("/home/user/project", "./setup1.js"));
        expect(result.before[1]).to.equal(path.resolve("/home/user/project", "./setup2.js"));
      });

      it("should resolve paths in arrays relative to directory", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          directory: "/absolute/screenshots",
          path: ["file1.png", "file2.png"],
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "spec",
        });

        expect(result.path[0]).to.equal(path.resolve("/absolute/screenshots", "file1.png"));
        expect(result.path[1]).to.equal(path.resolve("/absolute/screenshots", "file2.png"));
      });

      it("should handle URLs in arrays by returning them unchanged", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          before: ["https://example.com/setup.js", "http://example.com/setup2.js", "heretto:setup3"],
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "spec",
        });

        // URLs should remain unchanged
        expect(result.before[0]).to.equal("https://example.com/setup.js");
        expect(result.before[1]).to.equal("http://example.com/setup2.js");
        expect(result.before[2]).to.equal("heretto:setup3");
      });
    });

    describe("error handling", function () {
      it("should throw error for invalid object (not config or spec)", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          someRandomProperty: "value",
        };

        try {
          await resolvePaths({ config, object, filePath: mockFilePath });
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error.message).to.equal("Object isn't a valid config or spec.");
        }
      });

      it("should throw error for nested object without objectType", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          someProp: "value",
        };

        try {
          await resolvePaths({ config, object, filePath: mockFilePath, nested: true });
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error.message).to.equal("Object type is required for nested objects.");
        }
      });
    });

    describe("null and empty object handling", function () {
      it("should return null object as is", async function () {
        const config = { relativePathBase: "file" };
        const object = null;

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "config",
        });

        expect(result).to.be.null;
      });

      it("should return empty object as is", async function () {
        const config = { relativePathBase: "file" };
        const object = {};

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "config",
        });

        expect(result).to.deep.equal({});
      });
    });

    describe("filePath handling", function () {
      it("should handle filePath that is a directory", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          input: "./input",
        };
        const dirPath = "/home/user/project";

        // Stub fs.existsSync and fs.lstatSync for directory
        const existsStub = sinon.stub(fs, "existsSync").returns(true);
        const lstatStub = sinon.stub(fs, "lstatSync").returns({ isFile: () => false });

        try {
          const result = await resolvePaths({
            config,
            object,
            filePath: dirPath,
            nested: true,
            objectType: "config",
          });
          expect(result.input).to.equal(path.resolve(dirPath, "./input"));
        } finally {
          existsStub.restore();
          lstatStub.restore();
        }
      });

      it("should infer directory from path without extension when path doesn't exist", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          input: "./input",
        };
        // Path with no extension - should be treated as directory
        const dirPath = "/home/user/project/somedir";

        // Stub fs.existsSync to return false
        const existsStub = sinon.stub(fs, "existsSync").returns(false);

        try {
          const result = await resolvePaths({
            config,
            object,
            filePath: dirPath,
            nested: true,
            objectType: "config",
          });
          expect(result.input).to.equal(path.resolve(dirPath, "./input"));
        } finally {
          existsStub.restore();
        }
      });
    });

    describe("auto-detection of object type", function () {
      it("should auto-detect config_v3 object type and resolve paths", async function () {
        const config = { relativePathBase: "file" };
        // A valid config_v3 object (with valid properties)
        const object = {
          input: "./input",
          output: "./output",
          recursive: true,
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          // No nested or objectType - should auto-detect
        });

        expect(result.input).to.equal(path.resolve("/home/user/project", "./input"));
        expect(result.output).to.equal(path.resolve("/home/user/project", "./output"));
      });

      it("should auto-detect spec_v3 object type and resolve paths", async function () {
        const config = { relativePathBase: "file" };
        // A valid spec_v3 object
        const object = {
          tests: [
            {
              steps: [
                {
                  goTo: "https://example.com"
                }
              ]
            }
          ]
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          // No nested or objectType - should auto-detect as spec
        });

        // Object should be returned (even if no paths to resolve)
        expect(result).to.deep.include({ tests: object.tests });
      });
    });

    describe("URL handling in resolve helper", function () {
      it("should return http:// URLs unchanged from resolve helper", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          file: "http://example.com/file.md",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "spec",
        });

        expect(result.file).to.equal("http://example.com/file.md");
      });

      it("should return https:// URLs unchanged from resolve helper", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          file: "https://example.com/file.md",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "spec",
        });

        expect(result.file).to.equal("https://example.com/file.md");
      });

      it("should return heretto: URIs unchanged from resolve helper", async function () {
        const config = { relativePathBase: "file" };
        const object = {
          file: "heretto:some-id",
        };

        const result = await resolvePaths({
          config,
          object,
          filePath: mockFilePath,
          nested: true,
          objectType: "spec",
        });

        expect(result.file).to.equal("heretto:some-id");
      });
    });
  });
})();
