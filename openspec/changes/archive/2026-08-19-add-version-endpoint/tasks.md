## 1. Implementation

- [x] 1.1 Add `GET /api/version` route in `src/index.ts` that reads `package.json` and returns `{ "version": "..." }`
- [x] 1.2 Create `tests/version.test.ts` with vitest + supertest asserting 200 status, JSON content type, and correct version value

## 2. Verification

- [x] 2.1 Run `npx tsx --test tests/version.test.ts` and confirm all tests pass
