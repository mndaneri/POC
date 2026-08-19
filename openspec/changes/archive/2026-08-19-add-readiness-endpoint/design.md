# Design: add-readiness-endpoint

## Context

The Express app (`src/server.ts`) mounts one router per concern at `/`: `index` (HTML welcome), `health` (`GET /health` → `{ status, timestamp }`), `version` (`GET /api/version`). Tests run with jest + ts-jest + supertest against the `getServerApp()` factory. Response types live in `src/types/response.ts` (see proposal.md for motivation).

## Goals / Non-Goals

**Goals:**
- `GET /ready` returning `{ status: "ready", uptime_seconds, memory_mb }` with HTTP 200.
- Follow the existing per-route-file pattern exactly.
- Cover with a supertest integration test in `tests/`.

**Non-Goals:**
- No dependency checks (DB, Ollama, etc.) — this is a liveness-adjacent probe, not a deep health check.
- No metrics endpoint, no Prometheus format, no caching.

## Decisions

1. **New route file `src/routes/ready.ts`** (alternative: add the route to `health.ts`). Chosen for consistency with the one-concern-per-router convention already established (`health.ts`, `version.ts`) and to keep the diff isolated.
2. **Uptime via `process.uptime()`**, memory via `process.memoryUsage().rss` (RSS in MB, rounded to 2 decimals). Alternatives considered: `os.uptime()` (system-wide, less meaningful for a containerized process) and `heapUsed` (understates true footprint). RSS + process uptime is the standard in-process signal.
3. **New `ReadyResponse` interface in `src/types/response.ts`** next to `HealthResponse` (keeps response contracts in one place).
4. **Rounding**: `uptime_seconds` rounded to 3 decimals; `memory_mb` to 2 decimals — keeps JSON payloads stable and comparable in logs without losing meaningful precision.
5. **Test placement `tests/ready.test.ts`** using `getServerApp()` + supertest, matching existing test setup (jest, `--runInBand`).

## Risks / Trade-offs

- [RSS fluctuates between calls] → The spec only requires number ≥ 0; tests assert type and lower bound, not exact values.
- [Value semantics differ from `/health` (liveness)] → Documented in the spec Purpose; both are intentionally always-200 while the process runs.

## Migration Plan

None required: additive route, no schema or config changes. Rollback = remove the route registration and file.
