// server.ts — server MCP JSON-RPC 2.0 sobre stdio, implementado a mano (sin SDK).
// Testeable in-process: McpServer.handle(request) → respuesta | null (notificaciones).
// Ejecutado como script (`tsx src/rag/server.ts`) lee JSON por líneas de stdin y
// escribe respuestas JSON por línea en stdout.

import path from 'path';
import { Store } from './store';

export const PROTOCOL_VERSION = '2025-03-26';
export const SERVER_INFO = { name: 'prueba1-rag', version: '1.0.0' };

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: object;
}

export const TOOLS: McpTool[] = [
  {
    name: 'rag_index',
    description: 'Indexa el corpus de texto del repo en .rag/index.json (o lo reconstruye con force).',
    inputSchema: {
      type: 'object',
      properties: { force: { type: 'boolean', description: 'Reconstruir aunque el índice esté fresco.' } },
      additionalProperties: false
    }
  },
  {
    name: 'rag_query',
    description: 'Búsqueda BM25 top-k sobre código y specs, con cita file:line, símbolo, score y snippet.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Términos de búsqueda (obligatorio).' },
        k: { type: 'number', description: 'Máximo de resultados (default 5).' },
        scope: { type: 'string', enum: ['code', 'specs', 'all'], description: 'Limitar a código o a specs (default all).' }
      },
      required: ['query'],
      additionalProperties: false
    }
  },
  {
    name: 'rag_status',
    description: 'Estado del índice: versión, fecha, contadores, frescura y raíz del corpus.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false }
  }
];

/** Error de protocolo JSON-RPC con código estándar (lanzado desde los handlers). */
class JsonRpcError extends Error {
  constructor(public readonly code: number, message: string) {
    super(message);
    this.name = 'JsonRpcError';
  }
}

function numberOr(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;
}

function scopeOr(v: unknown): 'code' | 'specs' | 'all' | undefined {
  return v === 'code' || v === 'specs' || v === 'all' ? v : undefined;
}

type ToolHandler = (args: Record<string, unknown>) => unknown;

export class McpServer {
  private readonly handlers: Record<string, ToolHandler>;

  constructor(private readonly store: Store) {
    this.handlers = {
      rag_index: (args) => this.store.build({ force: args.force === true }),
      rag_query: (args) => {
        if (typeof args.query !== 'string' || args.query.trim() === '') {
          throw new JsonRpcError(-32602, 'Invalid params: rag_query requiere el argumento "query" (string no vacío)');
        }
        return this.store.query(args.query, { k: numberOr(args.k), scope: scopeOr(args.scope) });
      },
      rag_status: () => this.store.status()
    };
  }

  /** Procesa una petición JSON-RPC 2.0; devuelve `null` para notificaciones (sin respuesta). */
  handle(req: JsonRpcRequest): JsonRpcResponse | null {
    if (!req || typeof req !== 'object' || typeof req.method !== 'string') {
      return this.error(req && typeof req === 'object' ? (req as JsonRpcRequest).id ?? null : null, -32600, 'Invalid Request: "method" (string) es obligatorio');
    }
    const id = req.id ?? null;
    try {
      const result = this.dispatch(req.method, req.params);
      if (id === null) return null; // notificación: nunca responde
      return { jsonrpc: '2.0', id, result };
    } catch (e) {
      if (e instanceof JsonRpcError) return this.error(id, e.code, e.message);
      return this.error(id, -32603, `Internal error: ${(e as Error).message}`);
    }
  }

  private dispatch(method: string, params: Record<string, unknown> | undefined): unknown {
    switch (method) {
      case 'initialize':
        return { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO };
      case 'notifications/initialized':
      case 'notifications/cancelled':
        return null;
      case 'tools/list':
        return { tools: TOOLS };
      case 'tools/call':
        return this.callTool(params);
      default:
        throw new JsonRpcError(-32601, `Method not found: ${method}`);
    }
  }

  private callTool(params?: Record<string, unknown>): unknown {
    const name = params?.name;
    if (typeof name !== 'string' || !this.handlers[name]) {
      throw new JsonRpcError(-32601, `Unknown tool: ${String(name)}`);
    }
    const args = ((params as Record<string, unknown>).arguments ?? {}) as Record<string, unknown>;
    const result = this.handlers[name](args);
    return { content: [{ type: 'text', text: JSON.stringify(result) }], isError: false };
  }

  private error(id: number | string | null, code: number, message: string): JsonRpcResponse {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }
}

/** Bucle stdio: JSON por línea en stdin → JSON por línea en stdout. */
function runStdio(server: McpServer): void {
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let req: JsonRpcRequest;
      try {
        req = JSON.parse(line) as JsonRpcRequest;
      } catch {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error: JSON inválido' } }) + '\n');
        continue;
      }
      const res = server.handle(req);
      if (res) process.stdout.write(JSON.stringify(res) + '\n');
    }
  });
  process.stdin.on('end', () => process.exit(0));
}

if (require.main === module) {
  const root = process.env.RAG_ROOT ? path.resolve(process.env.RAG_ROOT) : process.cwd();
  const store = new Store(root);
  runStdio(new McpServer(store));
}