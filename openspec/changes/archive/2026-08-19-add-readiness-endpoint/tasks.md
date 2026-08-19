# Tasks: add-readiness-endpoint

## 1. Implementation

- [x] 1.1 Add `ReadyResponse` interface to `src/types/response.ts` (`status: string; uptime_seconds: number; memory_mb: number`)
- [x] 1.2 Create `src/routes/ready.ts` with `GET /ready` returning `status: "ready"`, `uptime_seconds` (process.uptime, 3 decimals), `memory_mb` (RSS, 2 decimals)
- [x] 1.3 Mount `readyRouter` in `src/server.ts` alongside the other routers

## 2. Verification

- [x] 2.1 Add `tests/ready.test.ts` with supertest: assert 200, JSON content-type, `status === "ready"`, numeric `uptime_seconds` ≥ 0, numeric `memory_mb` ≥ 0
- [x] 2.2 Run `npm test` and confirm all tests pass (including the new readiness tests)
- [x] 2.3 Run `openspec validate add-readiness-endpoint --strict` and confirm no errors
