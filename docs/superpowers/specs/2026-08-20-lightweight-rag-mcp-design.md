# Diseño: Subsistema RAG Ligero vía MCP (prueba1)

- **Fecha:** 2026-08-20
- **Estado:** Aprobado por el usuario (2026-08-20)
- **Modelo generativo (chat CLI):** `qwen3.8:27b-q4_K_M` (Ollama, localhost:11434)
- **Flujo:** design doc → OpenSpec change (propose) → plan Superpowers → TDD (apply) → verify → archive

## 1. Contexto y propósito

El flujo de desarrollo es: **Cline + Ollama (Qwen3 27B q4) + Superpowers + OpenSpec (SDD) + MemPalace**.
Falta una capa de **retrieval preciso sobre código y specs**: hoy el agente lee archivos "a ciegas",
costoso para un modelo local de 27B (ventana 8–32K). RAG = amplificador de modelos pequeños:
top-k chunks con `file:line` → contexto compacto → mejor respuesta, menos tokens, menos iteraciones.

**División de responsabilidades (sin duplicar):**

| Herramienta | Recupera |
|---|---|
| **RAG (este cambio)** | Código + specs OpenSpec: dónde está X, cómo funciona Y, qué exige la spec |
| **MemPalace (existente)** | Decisiones, hechos, conversaciones pasadas (`mempalace_search`, KG) |
| **Superpowers bridge** | Orquesta qué tool usar en cada fase (EXPLORE/APPLY → `rag_query`) |

## 2. No-objetivos (fuera de scope)

- Sin servicios externos, sin vector DB, sin modelos de embeddings (ONNX), sin índice de MemPalace.
- Sin chat web/UI. Solo CLI.
- Sin multitenancy ni corpus multi-repo (configurable por parámetro, pero por defecto `prueba1`).

## 3. Arquitectura (módulos, cero deps nuevas)

```
src/rag/
  token.ts   tokenizador: lowercase + split camelCase + stopwords (es/en) + stemming trivial
  chunk.ts   chunker por tipo:
             - .ts/.js  → por export/símbolo (function/const/class), cada chunk guarda path, symbol, start/end line
             - .md      → por heading (##/###), chunk incluye ruta del heading
             - .json    → archivo completo (pequeño)
             Ignora: node_modules, .rag, .git, binarios, leftovers DOCX
  bm25.ts    BM25 estándar (k1=1.5, b=0.75) + boost 2× si la query matchea símbolo o nombre de archivo
  store.ts   persiste .rag/index.json { version, builtAt, files:[{path,mtime,hash}], chunks[] }
             freshness: si algún mtime/hash cambió → index stale
  server.ts  MCP stdio implementado a mano (JSON-RPC 2.0): initialize, notifications/initialized,
             tools/list, tools/call. Solo 3 tools → superficie acotada y testeable.
             Syntax erasable únicamente (sin enums/namespace) → Node 24 type-stripping: `node src/rag/server.ts`
  chat.ts    cliente Ollama: fetch POST http://localhost:11434/api/chat
             model: env RAG_MODEL | --model | default "qwen3.8:27b-q4_K_M"
             system prompt: "Responde SOLO con el contexto provisto. Cita file:line. Si no está en el contexto, dilo."
  cli.ts     entradas: index | query <q> [--k N] [--scope code|specs|all] | chat [pregunta] | status
tests/rag-*.test.ts   (node:test + tsx, convención actual del repo)
.rag/  → índice generado (gitignore)
```

**Corpus por defecto:** `src/`, `tests/`, `openspec/` del repo (código + specs).
**Scripts `package.json`:** `rag:index`, `rag:query`, `rag:chat`, `rag:mcp` (lanza server.ts para Cline).

## 4. Tools MCP (contratos)

| Tool | Parámetros | Resultado |
|---|---|---|
| `rag_index` | `force?: boolean` | `{ ok, chunks, files, tokens, ms, staleBefore }` |
| `rag_query` | `query: string, k?: number(=5), scope?: 'code'\|'specs'\|'all' (=all)` | `{ query, results: [{ path, lines, symbol, score, snippet }], indexStale }` |
| `rag_status` | — | `{ indexVersion, builtAt, chunks, files, stale, corpusRoot }` |

Comportamiento: `rag_query` sobre índice stale → auto-reindex transparente + flag `indexStale: true`.
Erros: JSON-RPC error con mensaje accionable (p. ej. corpus vacío, Ollama sin responder en chat).

## 5. Chat CLI (bonus, sobre el mismo núcleo)

```
npm run rag:chat -- "¿quién valida /api/ready?"
npm run rag:chat                → REPL interactivo (readline)
RAG_MODEL=qwen3.8:27b-q4_K_M npm run rag:chat
```
Pipeline: query → `rag_query` top-k (k=6) → prompt con contexto citado → Ollama → stdout: respuesta + bloques de cita.
Si Ollama no responde: error claro + mostrar el retrieval crudo (el valor de contexto persiste sin generador).

## 6. Integración Cline / Superpowers / OpenSpec

- **`cline_mcp_settings.json`** (usuario, fuera del repo): nueva entrada
  `prueba1-rag: { transport: stdio, command: node, args: [C:\desarrollo_ia\prueba1\src\rag\server.ts], timeout: 60 }`.
  (Se edita en la fase de implementación tras probar `node src/rag/server.ts` en vivo; si el type-stripping
  fallara → fallback: `node_modules\.bin\tsx.cmd src\rag\server.ts`.)
- **`.clinerules/rag-workflow.md`** (nuevo, versionado en el repo): convención de uso —
  - Brainstorming (EXPLORE) y TDD (APPLY): **antes** de proponer código o tests → `rag_query` (specs + código).
  - Decisiones/hechos pasados → `mempalace_search` (no RAG).
  - Verificación (ARCHIVE) → contrastar implementación vs. spec con `rag_query` sobre la spec concreta.
  - Regla de oro: "contexto exacto → RAG; memoria → MemPalace; proceso → Superpowers; qué → OpenSpec".

## 7. Tests (TDD — se escriben ANTES de cada implementación)

1. `token.test.ts`: camelCase split, acentos, stopwords es/en, tokens vacíos.
2. `chunk.test.ts`: fixture TS con 2 exports → 2 chunks con líneas exactas; fixture MD por heading; JSON completo.
3. `bm25.test.ts`: corpus fijo (fixtures) → ranking determinista esperado; boost por símbolo; query sin matches → [].
4. `store.test.ts`: build → persist → reload; mtime alterado → stale=true; `force` rebuild.
5. `server.test.ts`: stdio simulado (spawn `node src/rag/server.ts` o in-process): initialize → tools/list (3 tools) →
   `tools/call rag_query` (corpus de fixtures) → resultado válido; JSON-RPC error bienformado en caso inválido.
6. `chat.test.ts`: fetch mockeado (Ollama 200 / 500 / timeout) → prompt incluye top-k y cita; fallback a crudo.

Objetivo: 15+ tests, todos in-process, `npm test` en verde.

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Protocolo MCP manual con bug sutil | Test de handshake completo (5); fallback documentado a `@modelcontextprotocol/sdk` |
| Node 24 type-stripping vs. syntax no-erasable | Solo syntax erasable; verificación en vivo `node src/rag/server.ts` antes de registrar en Cline |
| Tag Ollama incorrecto | Confirmado por usuario: `qwen3.8:27b-q4_K_M`; param `RAG_MODEL`/`--model` para corregir sin código |
| Índice cacheado tras cambios | freshness por mtime+hash + auto-reindex en `rag_query` + flag visible |

## 9. Criterios de aceptación

1. `npm test` → 100% verde (15+ tests), sin nuevos deps runtime.
2. `npm run rag:index` → `.rag/index.json` con chunks de `src/`, `tests/`, `openspec/`.
3. `npm run rag:query -- "ready endpoint"` → top-k con `path`, `lines`, `symbol`, `score` (incluye `ready.ts` y spec `api-readiness`).
4. Server MCP stdio responde `initialize`/`tools/list`/`tools/call` correctamente (verificado en vivo).
5. `npm run rag:chat -- "¿quién valida /api/ready?"` → respuesta de Qwen 27B citando `file:line` (requiere Ollama corriendo; si no, el fallback muestra retrieval crudo sin romper).
6. Entradas MCP en Cline + `.clinerules/rag-workflow.md` versionados.
7. Commit + push al terminar el ciclo OpenSpec (verificación completa antes de archivar).
