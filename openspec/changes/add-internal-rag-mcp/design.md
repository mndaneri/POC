## Context

Repo CJS (`"type": "commonjs"`) con Express 5, Jest 30 + ts-jest (tests en `tests/`), ts-node/tsx como runners. Runtime objetivo para el server MCP: el mismo runtime que `dev`/`build`. Modelo local Ollama `qwen3.8:27b-q4_K_M` (localhost:11434). Ver motivation en proposal.md y requisitos en specs/rag-mcp.

## Goals / Non-Goals

**Goals:**
- `src/rag/*` autocontenido (no dependa de `require` de archivos CJS del repo ni de módulos compilados).
- Cero dependencias runtime nuevas; offline; determinista.
- Server MCP stdio arrancable como `tsx src/rag/server.ts` (o ts-node), verificado en vivo antes de registrarse en Cline.
- Tests Jest (`tests/rag*.test.ts`) siguiendo la convención del repo.

**Non-Goals:**
- Sin embeddings/vector DB/ONNX; sin UI web; sin cambios a la API Express; sin multitenancy.

## Decisions

1. **BM25/TF-IDF en vez de embeddings.** Alternativa: `onnxruntime-node` + BGE-small. BM25 gana en: determinismo (tests reproducibles), cero deps, offline, corpus pequeño (≈20–50 archivos). Coste: matching léxico (mitigado con stemming trivial + split camelCase).
2. **MCP JSON-RPC 2.0 a mano (3 tools).** Alternativa: `@modelcontextprotocol/sdk`. Implementación manual: superficie mínima (initialize, notifications/initialized, tools/list, tools/call), testeable in-process; fallback documentado al SDK si surgen edge cases.
3. **Módulos: `token.ts`, `chunk.ts`, `bm25.ts`, `store.ts`, `server.ts`, `chat.ts`, `cli.ts`.** Cada uno testeable por separado; `server.ts` delega en `store.ts` (sin lógica de ranking dentro del handler).
4. **Índice `.rag/index.json`** con `version`, `builtAt`, `files[] {path, mtime, hash}`, `chunks[]`. Frescura por mtime+hash; auto-reindex en `rag_query`.
5. **Runtime del server:** `tsx`/`ts-node` (ya en devDependencies), **no** Node 24 type-stripping (experimental para `.ts` CJS/ESM interop en este repo). Scripts: `rag:mcp = tsx src/rag/server.ts`, `rag:index/query/chat = tsx src/rag/cli.ts ...`.
6. **Chat:** `fetch` POST `http://localhost:11434/api/chat` (Node 18+ global), system prompt restrictivo con citas; modelo por `RAG_MODEL`/`--model`/default; fallback a crudo en fallo.

## Risks / Trade-offs

- [Protocolo MCP manual con bug sutil] → Test de handshake completo (5) in-process; fallback al SDK documentado.
- [Índice stale] → mtime+hash + auto-reindex + flag `indexStale` visible en respuestas.
- [Runtime mismatch al registrar en Cline] → Verificar `tsx src/rag/server.ts` en vivo ANTES de tocar `cline_mcp_settings.json`; si falla, usar el bin global de tsx.
- [Tag Ollama incorrecto] → Ya confirmado por usuario; parámetro `RAG_MODEL`/`--model` para corregir sin tocar código.
- [Matching solo léxico] → Stemming + camelCase split + boost por símbolo; suficiente para corpus de ~20 archivos.

## Migration Plan

1. Implementar en este change (TDD).
2. Registrar entrada MCP en `cline_mcp_settings.json` (usuario) tras verificación en vivo.
3. Rollback: borrar `src/rag/`, scripts `rag:*`, entrada MCP y `.clinerules/rag-workflow.md`; `.rag/` es regenerable.

## Open Questions

Ninguno (el tag de Ollama se confirmó: `qwen3.8:27b-q4_K_M`).
