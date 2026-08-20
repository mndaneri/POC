## Purpose

Recuperación local de contexto top-k sobre código y specs para agentes y CLI, con cita `file:line`, expuesta como tools MCP y con chat generativo opcional.

## ADDED Requirements

### Requirement: Indexación de corpus
El sistema SHALL indexar por defecto `src/`, `tests/` y `openspec/` del repositorio, excluyendo `node_modules`, `.git`, `.rag`, binarios y archivos no-texto. El corpus raíz SHALL ser configurable por parámetro.

#### Scenario: Indexación inicial
- **WHEN** se ejecuta `rag_index` (o `npm run rag:index`)
- **THEN** se produce un índice persistente en `.rag/` con los chunks de los 3 directorios y un resumen `{ chunks, files, tokens, ms }`

#### Scenario: Chunk por símbolo con líneas exactas
- **WHEN** se indexa un archivo TypeScript con 2 exports
- **THEN** cada export genera un chunk con `path`, `symbol`, `startLine`, `endLine` correctos

#### Scenario: Chunk de Markdown por heading
- **WHEN** se indexa un `.md` con headings
- **THEN** cada sección genera un chunk cuyo texto incluye la ruta de headings y cuyo rango de líneas cubre la sección

#### Scenario: Corpus vacío
- **WHEN** se solicita indexación sobre un directorio sin archivos elegibles
- **THEN** se devuelve un error explícito (corpus vacío) sin crear un índice corrupto

### Requirement: Ranking BM25
El sistema SHALL rankear chunks con BM25 sobre tokens normalizados (lowercase, split camelCase, stopwords es/en) y devolver top-k (default 5) ordenado por relevancia descendente.

#### Scenario: Resultado con contexto de cita
- **WHEN** se ejecuta `rag_query` con una query que matchea el corpus
- **THEN** cada resultado incluye `path`, `lines`, `symbol`, `score` y `snippet`

#### Scenario: Filtro por scope
- **WHEN** `rag_query` recibe `scope=code` o `scope=specs`
- **THEN** solo se devuelven chunks del scope solicitado

#### Scenario: Sin coincidencias
- **WHEN** la query no matchea ningún chunk
- **THEN** se devuelve `results: []` (sin error)

### Requirement: Herramientas MCP
El sistema SHALL exponer por stdio un server JSON-RPC 2.0 con tools `rag_index`, `rag_query`, `rag_status`, incluyendo schemas de entrada.

#### Scenario: Handshake MCP
- **WHEN** un cliente envía `initialize`
- **THEN** el server responde `protocolVersion`, `capabilities.tools` y `serverInfo`, y acepta `tools/list` y `tools/call` sin crash

#### Scenario: Error accionable
- **WHEN** `tools/call` recibe argumentos inválidos (p. ej. `rag_query` sin `query`)
- **THEN** se responde un error JSON-RPC 2.0 con código y mensaje descriptivo

### Requirement: Estado del índice
El sistema SHALL reportar el estado del índice (versión, fecha, contadores, frescura, corpus raíz).

#### Scenario: Estado del índice
- **WHEN** se invoca `rag_status`
- **THEN** se devuelve `{ indexVersion, builtAt, chunks, files, stale, corpusRoot }`

### Requirement: Frescura del índice
El sistema SHALL persistir por archivo su `mtime` y hash, y detectar cuando el índice está desactualizado.

#### Scenario: Auto-reindex
- **WHEN** `rag_query` detecta que un archivo del corpus cambió desde la última indexación
- **THEN** el sistema reindexa antes de responder y marca `indexStale: true` en el resultado

#### Scenario: Reindex forzado
- **WHEN** `rag_index` recibe `force: true`
- **THEN** el índice se reconstruye aunque esté fresco

### Requirement: Chat generativo opcional
El sistema SHALL permitir responder consultas usando el top-k como contexto vía Ollama local, con modelo configurable (env `RAG_MODEL` | `--model` | default `qwen3.8:27b-q4_K_M`).

#### Scenario: Respuesta con citas
- **WHEN** se ejecuta `rag:chat` con una pregunta y Ollama responde
- **THEN** la salida incluye la respuesta y las citas `file:line` de los chunks usados

#### Scenario: Fallback sin generador
- **WHEN** Ollama no responde (fuera de línea, error, timeout)
- **THEN** se muestra un error claro y el retrieval crudo top-k, sin abortar el comando

#### Scenario: REPL
- **WHEN** `rag:chat` se ejecuta sin argumento
- **THEN** se abre un REPL interactivo

### Requirement: Convención de uso
El flujo de trabajo del agente SHALL usar `rag_query` (código + specs) antes de proponer código o tests, y reservar la memoria conversacional a MemPalace.

#### Scenario: Antes de proponer
- **WHEN** el agente está en fase de brainstorming o TDD a punto de proponer implementación
- **THEN** consulta `rag_query` sobre la spec y el código relevante antes de escribir el plan

#### Scenario: Verificación contra spec
- **WHEN** se verifica una tarea completada (fase de cierre)
- **THEN** se contrasta la implementación contra la spec usando `rag_query` sobre esa spec
