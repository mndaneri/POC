# RAG Workflow (convención de memoria)

Memoria del proyecto local (BM25, cero deps) + reglas de cuándo usar cada fuente de verdad.

**Fuentes de verdad, en orden de prioridad:**

1. **OpenSpec** (`openspec/specs/`, `openspec/changes/`) — el qué y el porqué del proyecto. SIEMPRE primero para decisiones de diseño y specs.
2. **RAG** (`rag_query` / `npm run rag:query`) — búsqueda BM25 top-k sobre el código y las specs de ESTE repositorio. Determinista, instantánea, con citas `path/lines/symbol/score/snippet`.
3. **MemPalace** (MCP `mempalace_*`) — memoria transversal entre sesiones y proyectos: aprendizajes, contexto no ligado a este repo.

**Reglas:**

- Antes de responder sobre convenciones del repo, "¿dónde está X?", o cómo se resuelve algo similar: usa `rag_query` (o `npm run rag:query -- "<términos>"`).
- Antes de suponer que no hay una decisión pasada: revisar OpenSpec → RAG → MemPalace, en ese orden.
- No duplicar: si un hecho vive en OpenSpec, no repetir su contenido en MemPalace; registrar en el KG un tipo "decisión X documentada en `<change-id>`".
- Al archivar un cambio (`/openspec-archive-change`): registrar el hecho de cierre en el knowledge graph de MemPalace.
- El índice RAG (`.rag/index.json`, gitignored) se regenera solo si está stale (o con `npm run rag:index` / `rag_index --force`).
- Citas: las respuestas RAG SIEMPRE llevan `path:line` verificable; no inventar ubicaciones.

**Comandos rápidos:**

```bash
npm run rag:index                          # (re)indexa el corpus
npm run rag:query -- "ready endpoint"      # búsqueda top-k
npx tsx src/rag/cli.ts query "chunker" --k 3 --scope code
npx tsx src/rag/cli.ts status              # frescura y contadores
npm run rag:mcp                            # server MCP stdio (registro en Cline)
npm run rag:chat                           # chat Ollama + top-k (sección 8)
```
