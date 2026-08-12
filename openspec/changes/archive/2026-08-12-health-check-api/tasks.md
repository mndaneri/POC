## 1. Project Scaffolding

- [x] 1.1 Run `npm init -y` to create package.json with project metadata
- [x] 1.2 Install production dependency: `express`
- [x] 1.3 Install dev dependencies: `typescript`, `@types/express`, `@types/node`, `jest`, `ts-jest`, `ts-node`, `supertest`, `@types/jest`, `@types/supertest`, `nodemon`
- [x] 1.4 Create `tsconfig.json` with strict mode, ES2020 target, CommonJS modules, outDir `dist`, rootDir `src`
- [x] 1.5 Configure Jest in package.json: transform with ts-jest, testEnvironment node, roots include tests directory
- [x] 1.6 Verify toolchain: run `npx tsc --version` and `npx jest --version`

## 2. Response Types (TDD)

- [x] 2.1 Write failing test in `tests/health.test.ts`: import HealthResponse type and verify it has required shape
- [x] 2.2 Run test to confirm it fails (file doesn't exist yet)
- [x] 2.3 Create `src/types/response.ts` with `HealthResponse` interface: `{ status: string; timestamp: string }`
- [x] 2.4 Run test to verify it passes

## 3. Health Route Handler (TDD)

- [x] 3.1 Write failing test in `tests/health.test.ts`: create Express app with health router, send GET /health, expect 200 with correct JSON and Content-Type application/json
- [x] 3.2 Run test to confirm it fails (route doesn't exist yet)
- [x] 3.3 Create `src/routes/health.ts` with Express Router exporting GET handler that returns `{ status: "ok", timestamp: new Date().toISOString() }`
- [x] 3.4 Run test to verify basic response passes
- [x] 3.5 Add test asserting timestamp matches ISO 8601 regex pattern
- [x] 3.6 Run all tests to verify they pass

## 4. Server Bootstrap (TDD)

- [x] 4.1 Write failing test in `tests/health.test.ts`: verify full HTTP server responds on configured port with health endpoint accessible via supertest
- [x] 4.2 Run test to confirm it fails (server doesn't exist yet)
- [x] 4.3 Create `src/server.ts` importing Express, mounting health router at `/`, listening on PORT env or 3000
- [x] 4.4 Run all tests to verify integration works end-to-end

## 5. Final Verification

- [x] 5.1 Run complete test suite with coverage: `npm test` — verify >80% coverage and exit code 0
- [x] 5.2 Manually start dev server and curl `http://localhost:3000/health` to verify live response matches spec