# Health Check API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a Node.js REST API with Express that exposes `GET /health` returning `{"status":"ok","timestamp":"<ISO date>"}`

**Architecture:** Express app with modular router pattern. Health route isolated in its own module, server bootstraps Express and mounts routes. TypeScript interfaces define response contracts.

**Tech Stack:** Express 4.x, TypeScript 5.x, Jest + ts-jest + supertest, nodemon (dev)

## Global Constraints

- TypeScript strict mode enabled
- Node.js 18+ runtime target
- All imports use relative paths with `.ts` extension omitted
- Test files co-located in `tests/` mirroring `src/` structure
- Commit after each completed task
- TDD: write failing test → verify failure → implement → verify pass → commit

---

## File Structure

| File | Responsibility |
|------|---------------|
| `package.json` | Project metadata, dependencies, scripts |
| `tsconfig.json` | TypeScript configuration (strict mode) |
| `src/types/response.ts` | TypeScript interfaces for API responses |
| `src/routes/health.ts` | Express Router with GET /health handler |
| `src/server.ts` | Express app bootstrap and HTTP server listener |
| `tests/health.test.ts` | Jest + supertest integration tests for health endpoint |

## Tasks

### Task 1: Project Scaffolding
- [ ] 1.1 Run `npm init -y` to create `package.json`
- [ ] 1.2 Install dependencies: `npm i express` and `npm i -D typescript @types/express @types/node jest ts-jest ts-node supertest @types/jest @types/supertest`
- [ ] 1.3 Create `tsconfig.json` with strict mode, ES2020 target, CommonJS modules, `outDir: dist`, rootDir `src`
- [ ] 1.4 Add scripts to package.json: `"dev": "nodemon src/server.ts"`, `"test": "jest --forceExit --coverage"`
- [ ] 1.5 Configure Jest in package.json: `"jest": { "transform": {"^.+\\.tsx?$": "ts-jest"}, "testEnvironment": "node", "roots": ["<rootDir>/tests"] }`
- [ ] 1.6 Run `npx tsc --version` and `npx jest --version` to verify toolchain works
- [ ] 1.7 Commit: `feat: initialize project with TypeScript + Express + Jest`

### Task 2: Response Types (TDD)
- [ ] 2.1 Write failing test in `tests/health.test.ts`: import HealthResponse and assert it has required properties
- [ ] 2.2 Verify test fails (file doesn't exist yet): `npm test`
- [ ] 2.3 Create `src/types/response.ts` with `HealthResponse` interface: `{ status: string; timestamp: string }`
- [ ] 2.4 Run test → verify it passes (interface exists and is importable)
- [ ] 2.5 Commit: `feat: add HealthResponse type interface`

### Task 3: Health Route Handler (TDD)
- [ ] 3.1 Write failing test in `tests/health.test.ts`: create Express app, mount health router, GET /health expects 200 with correct JSON shape and Content-Type application/json
- [ ] 3.2 Verify test fails (route doesn't exist): `npm test`
- [ ] 3.3 Create `src/routes/health.ts` with Express Router, GET handler that returns `{ status: "ok", timestamp: new Date().toISOString() }`
- [ ] 3.4 Run test → verify it passes
- [ ] 3.5 Add second test: assert timestamp matches ISO 8601 format via regex `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/`
- [ ] 3.6 Run all tests → verify both pass
- [ ] 3.7 Commit: `feat: implement health check route handler`

### Task 4: Server Bootstrap (TDD)
- [ ] 4.1 Write failing test in `tests/health.test.ts`: import server module, assert app listens on expected port and health endpoint is accessible via full HTTP request
- [ ] 4.2 Verify test fails (server doesn't exist): `npm test`
- [ ] 4.3 Create `src/server.ts`: import Express, mount health router at `/`, listen on process.env.PORT || 3000
- [ ] 4.4 Run test → verify it passes
- [ ] 4.5 Commit: `feat: implement Express server bootstrap`

### Task 5: Final Verification
- [ ] 5.1 Run full test suite with coverage: `npm test`
- [ ] 5.2 Verify all tests pass and coverage is acceptable (>80%)
- [ ] 5.3 Manually start server (`npm run dev`) and curl `http://localhost:3000/health` to verify live response
- [ ] 5.4 Commit: `feat: complete health check API with full test coverage`

---

**Estimated total tasks:** 5 main tasks, ~20 granular steps
**Estimated time:** ~30-45 minutes with TDD cycle per task