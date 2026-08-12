## Why

The project has no server code and needs a basic health check endpoint for monitoring, load balancer integration, and verifying service availability. This is the foundational API capability required before any other endpoints can be added.

## What Changes

- Initialize Node.js project with TypeScript, Express, and Jest
- Create `GET /health` endpoint returning `{"status":"ok","timestamp":"<ISO 8601>"}`
- Implement modular router pattern for extensibility
- Add full test coverage using Jest + supertest

## Capabilities

### New Capabilities
- `health-check`: HTTP health check endpoint that returns service status and timestamp

### Modified Capabilities
- None

## Impact

- New dependencies: Express 4.x, TypeScript 5.x, Jest, supertest
- New directories: `src/`, `tests/`, `docs/superpowers/`
- No existing code affected (greenfield project)