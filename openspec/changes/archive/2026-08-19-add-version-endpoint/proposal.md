## Why

The API needs a lightweight way for clients to verify which version is running. A simple version endpoint is standard practice and makes debugging/troubleshooting easier.

## What Changes

- Add a `GET /api/version` route to the Express server
- Return JSON `{ "version": "<from package.json>" }`
- Add a vitest test for the endpoint

## Capabilities

### New Capabilities

- `api-version`: Expose the application version via a REST endpoint

### Modified Capabilities

## Impact

- `src/index.ts` — one new route
- `tests/version.test.ts` — one new test file
- No new dependencies
