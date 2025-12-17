# Doc Detective Common

Shared components for Doc Detective projects. Written in TypeScript with Zod for type-safe schema validation.

## 📦 Installation

```bash
# Install stable version
npm install doc-detective-common

# Install latest development version
npm install doc-detective-common@dev
```

## 🚀 Development Releases

This package automatically publishes development versions on every commit to the main branch. This enables dependent libraries to consume the latest changes without waiting for formal releases.

- **Dev versions** follow the pattern: `3.1.0-dev.1`, `3.1.0-dev.2`, etc.
- **Available via npm**: `npm install doc-detective-common@dev`
- **Documentation**: See [Auto Dev Release Guide](./docs/auto-dev-release.md)

## 📚 API

This package exports the following components:

- `schemas` - JSON schemas for validation
- `validate` - Validation functions using AJV
- `resolvePaths` - Path resolution utilities
- `readFile` - File reading utilities
- `transformToSchemaKey` - Schema key transformation

### TypeScript & Zod Schemas

The package includes Zod schemas for type inference:

```typescript
import { 
  configV3Schema, 
  stepV3Schema, 
  type ConfigV3, 
  type StepV3 
} from 'doc-detective-common';

// Type-safe validation
const config: ConfigV3 = configV3Schema.parse(myConfigObject);
```

## 🧪 Development

```bash
# Install dependencies
npm install

# Build TypeScript and schemas
npm run build

# Run tests
npm test

# Compile TypeScript only
npm run compile
```

## 📄 License

AGPL-3.0-only