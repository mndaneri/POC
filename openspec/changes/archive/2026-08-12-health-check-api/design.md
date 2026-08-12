## Context

Greenfield Node.js project with no existing server code. The openspec/specs/ directory is empty, and the proposal declares one new capability: `health-check`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Modular Express router pattern that allows adding more routes without modifying health check code
- Full TDD coverage via Jest + supertest
- TypeScript strict mode to enforce type safety from day one

**Non-Goals:**
- Authentication or rate limiting on health endpoint
- Detailed diagnostics (CPU, memory, dependencies) — future enhancement
- Docker containerization or CI/CD pipeline

## Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Express Router pattern (`src/routes/`) | Clean separation; each route is independently testable | Single-file handler (rejected: harder to scale) |
| Jest + supertest for HTTP integration tests | Tests real HTTP layer without mocking Express internals | Unit tests with mocked req/res (rejected: less confidence in actual behavior) |
| Separate `src/types/` directory | Centralizes shared interfaces; supports growth | Inline types per file (rejected: duplication risk) |

## Risks / Trade-offs

- **Minimal feature scope** → Easy to miss edge cases early. Mitigation: explicit spec scenarios cover both format validation and real-time behavior.
- **No error handling middleware yet** → Uncaught exceptions could crash server. Mitigation: acceptable for MVP; will be addressed when adding more routes.

## Migration Plan

Not applicable — this is the first implementation. Future changes build on top of this foundation.

## Open Questions

None. The spec and design are sufficient to proceed with task-level implementation.