# Proposal: add-readiness-endpoint

## Why

The service exposes `/health` (liveness) and `/version`, but there is no readiness probe that reports process-level state (uptime, memory). Orchestrators and monitoring agents currently have no cheap, dependency-free signal to decide whether the process is fully operational.

## What Changes

- Add a `GET /ready` endpoint to the Express router (alongside `/health` and `/version`).
- The response is JSON: `{ status: "ready", uptime_seconds: number, memory_mb: number }`, always HTTP 200 while the process is running.
- Add a supertest integration test covering status code and response shape.
- No new dependencies, no breaking changes.

## Capabilities

### New Capabilities

- `api-readiness`: Defines the readiness probe contract — endpoint path, method, status code, and response shape.

### Modified Capabilities

_(none — existing `api-version` and `html-welcome-page` requirements are untouched)_

## Impact

- Code: `src/routes/ready.ts` (new), `src/routes/index.ts` (registration), `tests/ready.test.ts` (new).
- API: one additional GET route; no changes to existing routes.
- Dependencies: none.
