## Why

Para un modelo local de 27B (ventana 8–32K), leer archivos "a ciegas" es caro y propenso a error. Faltan top-k de snippets sobre `src/` + specs OpenSpec con cita `file:line`: contexto preciso y barato para el agente.

## What Changes

- Motor de retrieval BM25/TF-IDF sin dependencias nuevas, corpus = `src/`, `tests/`, `openspec/` (índice cacheado en `.rag/`).
- 3 tools MCP sobre stdio (JSON-RPC 2.0 implementado a mano): `rag_index`, `rag_query`, `rag_status`, registrables en Cline.
- Chat CLI opcional: top-k como contexto → respuesta generada por Ollama local (`qwen3.8:27b-q4_K_M`, configurable), con fallback a resultados crudos si el generador no responde.

## Capabilities

### New Capabilities
- `rag-mcp`: Retrieval local top-k sobre código y specs + herramientas MCP + chat generativo opcional sobre contexto recuperado.

### Modified Capabilities
- Ninguna (no cambia comportamiento de `api-readiness`, `api-version`, `html-welcome-page`).

## Impact

- Nuevo: `src/rag/*`, `tests/rag*.test.ts`, scripts `rag:*` en `package.json`, `.gitignore` (`.rag/`), `.clinerules/rag-workflow.md`.
- Sin tocar la API Express existente. La entrada MCP debe ser arrancable con el mismo runtime que `dev`/`build` (tsx/ts-node), verificada en vivo antes de registrar en Cline.
