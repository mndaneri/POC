// server MCP (JSON-RPC 2.0 sobre stdio) — tests in-process del handler:
// handshake (initialize → tools/list con 3 tools → tools/call rag_index/rag_query/rag_status)
// y errores JSON-RPC bienformados (parámetros inválidos, método/tool desconocidos, payload inválido).

import fs from 'fs';
import os from 'os';
import path from 'path';
import { Store } from '../src/rag/store';
import { McpServer } from '../src/rag/server';

function makeCorpus(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-server-'));
  fs.writeFileSync(
    path.join(dir, 'README.md'),
    ['# Prueba1 API', '', '## Ready', '', 'El endpoint /api/ready valida la salud del servicio.', '', '## Config', '', 'Configura con variables de ambiente.'].join('\n')
  );
  fs.writeFileSync(path.join(dir, 'ready.ts'), 'export function readyStatus(): string {\n  return "ok";\n}\n');
  return dir;
}

function rpc(id: number, method: string, params?: unknown): Record<string, unknown> {
  const req: Record<string, unknown> = { jsonrpc: '2.0', id, method };
  if (params !== undefined) req.params = params;
  return req;
}

describe('server MCP stdio (JSON-RPC 2.0, in-process)', () => {
  let corpus: string;
  let server: McpServer;

  beforeEach(() => {
    corpus = makeCorpus();
    server = new McpServer(new Store(corpus));
  });

  afterEach(() => {
    fs.rmSync(corpus, { recursive: true, force: true });
  });

  test('initialize → protocolVersion + capabilities.tools + serverInfo', () => {
    const res = server.handle(rpc(1, 'initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '0' } })) as any;
    expect(res).not.toBeNull();
    expect(res.jsonrpc).toBe('2.0');
    expect(res.id).toBe(1);
    expect(res.result.protocolVersion).toEqual(expect.any(String));
    expect(res.result.capabilities.tools).toBeDefined();
    expect(res.result.serverInfo.name).toBe('prueba1-rag');
    expect(res.result.serverInfo.version).toEqual(expect.any(String));
    expect(res.error).toBeUndefined();
  });

  test('tools/list expone las 3 tools con description e inputSchema', () => {
    const res = server.handle(rpc(2, 'tools/list')) as any;
    expect(res.id).toBe(2);
    const names = res.result.tools.map((t: any) => t.name).sort();
    expect(names).toEqual(['rag_index', 'rag_query', 'rag_status']);
    for (const t of res.result.tools) {
      expect(t.description).toEqual(expect.any(String));
      expect(t.inputSchema).toBeDefined();
      expect(t.inputSchema.type).toBe('object');
    }
  });

  test('tools/call: rag_index → rag_query devuelve top-k con cita file:line', () => {
    const idx = server.handle(rpc(3, 'tools/call', { name: 'rag_index', arguments: {} })) as any;
    expect(idx.error).toBeUndefined();
    const built = JSON.parse(idx.result.content[0].text);
    expect(built).toMatchObject({ files: expect.any(Number), chunks: expect.any(Number) });

    const q = server.handle(rpc(4, 'tools/call', { name: 'rag_query', arguments: { query: 'ready endpoint' } })) as any;
    expect(q.error).toBeUndefined();
    const payload = JSON.parse(q.result.content[0].text);
    expect(payload.indexStale).toBe(false);
    expect(payload.results.length).toBeGreaterThan(0);
    expect(payload.results[0]).toEqual(
      expect.objectContaining({ path: expect.any(String), lines: expect.any(String), symbol: expect.any(String), score: expect.any(Number), snippet: expect.any(String) })
    );
  });

  test('tools/call rag_status → estado del índice', () => {
    const res = server.handle(rpc(8, 'tools/call', { name: 'rag_status', arguments: {} })) as any;
    expect(res.error).toBeUndefined();
    const payload = JSON.parse(res.result.content[0].text);
    expect(payload).toMatchObject({ indexVersion: expect.any(String), builtAt: expect.any(Number), chunks: expect.any(Number), files: expect.any(Number), stale: expect.any(Boolean) });
  });

  test('tools/call rag_query sin query → error JSON-RPC -32602 descriptivo', () => {
    const res = server.handle(rpc(5, 'tools/call', { name: 'rag_query', arguments: {} })) as any;
    expect(res.id).toBe(5);
    expect(res.error.code).toBe(-32602);
    expect(res.error.message).toMatch(/query/);
    expect(res.result).toBeUndefined();
  });

  test('tools/call con tool desconocida → error -32601', () => {
    const res = server.handle(rpc(6, 'tools/call', { name: 'nope', arguments: {} })) as any;
    expect(res.id).toBe(6);
    expect(res.error.code).toBe(-32601);
    expect(res.error.message).toMatch(/nope/);
  });

  test('método desconocido con id → error -32601; notificación → sin respuesta', () => {
    const res = server.handle(rpc(7, 'wibble')) as any;
    expect(res.id).toBe(7);
    expect(res.error.code).toBe(-32601);

    const notif = server.handle({ jsonrpc: '2.0', method: 'notifications/initialized' });
    expect(notif).toBeNull();
  });

  test('payload inválido (sin method) → error -32600', () => {
    const res = server.handle({ jsonrpc: '2.0', id: 9 }) as any;
    expect(res.id).toBe(9);
    expect(res.error.code).toBe(-32600);
    expect(res.result).toBeUndefined();
  });
});