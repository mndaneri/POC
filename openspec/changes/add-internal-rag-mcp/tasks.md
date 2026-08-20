## 1. Tokenizer

- [ ] 1.1 Tests: `token.test.ts` — split camelCase, acentos/stopwords es-en, tokens vacíos
- [ ] 1.2 Implementar `src/rag/token.ts` hasta que los tests pasen

## 2. Chunker

- [ ] 2.1 Tests: `chunk.test.ts` — fixture TS con 2 exports (líneas exactas), fixture MD por heading, JSON completo
- [ ] 2.2 Implementar `src/rag/chunk.ts` hasta que los tests pasen

## 3. BM25

- [ ] 3.1 Tests: `bm25.test.ts` — ranking determinista sobre corpus fijo, boost por símbolo, query sin matches → `[]`
- [ ] 3.2 Implementar `src/rag/bm25.ts` hasta que los tests pasen

## 4. Store / índice

- [ ] 4.1 Tests: `store.test.ts` — build → persist → reload; mtime alterado → `stale=true`; `force` rebuild
- [ ] 4.2 Implementar `src/rag/store.ts` (`.rag/index.json` + freshness) hasta que los tests pasen

## 5. Server MCP

- [ ] 5.1 Tests: `server.test.ts` — handshake (initialize → tools/list con 3 tools → tools/call `rag_query`) + error JSON-RPC bienformado
- [ ] 5.2 Implementar `src/rag/server.ts` (JSON-RPC 2.0 stdio, delegando en `store.ts`) hasta que los tests pasen

## 6. CLI

- [ ] 6.1 Implementar `src/rag/cli.ts`: `index | query <q> [--k N] [--scope code|specs|all] | chat [pregunta] | status`
- [ ] 6.2 Scripts en `package.json`: `rag:index`, `rag:query`, `rag:chat`, `rag:mcp` (runner `tsx`)

## 7. Integración

- [ ] 7.1 `.gitignore`: añadir `.rag/`
- [ ] 7.2 `.clinerules/rag-workflow.md`: convención RAG vs MemPalace vs Superpowers/OpenSpec
- [ ] 7.3 Verificar en vivo: `tsx src/rag/server.ts` responde handshake; `rag:index` + `rag:query -- "ready endpoint"` devuelve top-k con `path/lines/symbol/score`

## 8. Chat (Ollama)

- [ ] 8.1 Tests: `chat.test.ts` — fetch mockeado 200 / 500 / timeout; prompt incluye top-k y citas; fallback a crudo
- [ ] 8.2 Implementar `src/rag/chat.ts` (modelo default `qwen3.8:27b-q4_K_M`, `RAG_MODEL`/`--model`) hasta que los tests pasen

## 9. Verificación final

- [ ] 9.1 `npm test` 100% verde (15+ tests)
- [ ] 9.2 Demo E2E: `rag:chat -- "¿quién valida /api/ready?"` → respuesta de Qwen 27B citando `file:line` (o fallback crudo si Ollama no responde)
- [ ] 9.3 Registrar entrada MCP en `cline_mcp_settings.json` (tras paso 7.3)
- [ ] 9.4 `openspec validate add-internal-rag-mcp --strict` OK + commit + push
