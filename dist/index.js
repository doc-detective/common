"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.replaceNumericVariables = exports.parseObject = exports.parseXmlAttributes = exports.parseContent = exports.readFile = exports.resolvePaths = exports.transformToSchemaKey = exports.validate = exports.schemas = void 0;
var schemas_1 = require("./schemas");
Object.defineProperty(exports, "schemas", { enumerable: true, get: function () { return schemas_1.schemas; } });
var validate_1 = require("./validate");
Object.defineProperty(exports, "validate", { enumerable: true, get: function () { return validate_1.validate; } });
Object.defineProperty(exports, "transformToSchemaKey", { enumerable: true, get: function () { return validate_1.transformToSchemaKey; } });
var resolvePaths_1 = require("./resolvePaths");
Object.defineProperty(exports, "resolvePaths", { enumerable: true, get: function () { return resolvePaths_1.resolvePaths; } });
var files_1 = require("./files");
Object.defineProperty(exports, "readFile", { enumerable: true, get: function () { return files_1.readFile; } });
var detectTests_1 = require("./detectTests");
Object.defineProperty(exports, "parseContent", { enumerable: true, get: function () { return detectTests_1.parseContent; } });
Object.defineProperty(exports, "parseXmlAttributes", { enumerable: true, get: function () { return detectTests_1.parseXmlAttributes; } });
Object.defineProperty(exports, "parseObject", { enumerable: true, get: function () { return detectTests_1.parseObject; } });
Object.defineProperty(exports, "replaceNumericVariables", { enumerable: true, get: function () { return detectTests_1.replaceNumericVariables; } });
Object.defineProperty(exports, "log", { enumerable: true, get: function () { return detectTests_1.log; } });
//# sourceMappingURL=index.js.map