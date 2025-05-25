# Spectral JSON Schema Validation

This document explains how to use Spectral for validating JSON schemas in the Doc Detective project.

## Overview

Spectral is a powerful tool for linting and validating structured data formats including JSON and YAML. We use it to ensure our JSON schema files adhere to best practices and follow consistent patterns.

## Running Spectral Validation

You can validate your JSON schemas using the following npm scripts:

```bash
# Using our custom JavaScript integration
npm run lint:schemas

# Using Spectral CLI directly on v3 schemas
npm run spectral
```

## Understanding the Rules

The Spectral ruleset is configured in `.spectral.yaml`, which provides a consistent configuration used by both the CLI and programmatic interfaces.

Rules are categorized as:

- **Error** - Must be fixed, violates schema best practices
- **Warning** - Should be fixed, but not critical
- **Info** - Suggestions for improvement

## Core Rules

Our ruleset enforces:

1. **Schema Structure**
   - Schemas must have titles
   - Schemas should have descriptions
   - Schemas must have `$schema` property

2. **Property Validation**
   - Properties should have descriptions
   - `additionalProperties` should be explicitly defined
   - `required` must be an array
   - `properties` must be an object
   - `type` must be a string or array

3. **Doc Detective Specific**
   - Schemas should include examples
   - v3 schemas should follow naming conventions

## Creating Custom Rules

Custom functions can be added to the `spectral-functions` directory and referenced in the `.spectral.yaml` file. Each rule follows this structure:

```yaml
rule-name:
  description: 'Description of the rule'
  message: 'Message shown when rule is violated'
  given: '$.path.to.evaluate' # JSONPath of where to apply rule
  severity: error # or warn, info, hint
  recommended: true
  then:
    field: fieldName # Field to check
    function: functionName # Validation function to apply
    functionOptions: {} # Options for the function
```

## Programmatic Usage

You can use the linting functionality programmatically:

```js
const { lintSchemas } = require('doc-detective-common');

async function validateSchemas() {
  const results = await lintSchemas({
    schemasDir: './path/to/schemas',
    v3Only: true // Only validate v3 schemas
  });
  
  console.log(results);
}
```

## Adding New Rules

When adding new rules:

1. Choose an appropriate severity level
2. Provide clear descriptions and messages
3. Test the rule against existing schemas
4. Document the rule in this file

## Reference

- [Spectral Documentation](https://meta.stoplight.io/docs/spectral/docs/getting-started/1-concepts.md)
- [JSONPath Syntax](https://goessner.net/articles/JsonPath/)
- [JSON Schema Best Practices](https://json-schema.org/understanding-json-schema/reference/)