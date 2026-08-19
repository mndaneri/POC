## Context

The Express server in `src/index.ts` already serves static files and a health-check endpoint. Adding a version route follows the same pattern. The version value lives in `package.json` (`version` field).

## Goals / Non-Goals

**Goals:**
- Expose the package version at `GET /api/version`
- Test the endpoint with vitest + supertest

**Non-Goals:**
- No version history, no upgrade checks, no semantic versioning comparison

## Decisions

- **Read version at request time** from `package.json` via `fs` rather than hardcoding or importing a constant. Rationale: single source of truth, no build step.
- **Place the route in `src/index.ts`** alongside the existing routes. Rationale: trivial change, avoids new module indirection for a one-liner.
- **Use `JSON.parse` on `package.json`** rather than a JSON import. Rationale: works with both ESM and CommonJS without `resolveJsonModule`.

## Risks / Trade-offs

- [File read per request] → negligible for an internal endpoint; no caching needed at this scale.
