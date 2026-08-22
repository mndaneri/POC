import fs from 'fs';
import os from 'os';
import path from 'path';
import { createStore, EmptyCorpusError } from '../src/rag/store';

// Crean una raíz efímera (fuera del repo) con archivos { 'rel/path': contenido }
function makeRoot(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-store-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return root;
}

function indexPath(root: string): string {
  return path.join(root, '.rag', 'index.json');
}

describe('rag store (índice y frescura)', () => {
  test('build → persiste .rag/index.json con la forma esperada y devuelve resumen', () => {
    const root = makeRoot({
      'src/ready.ts': 'export function apiReadinessEndpoint() { return { ready: true, endpoint: "/api/ready" }; }',
      'openspec/specs/rag-mcp/spec.md': '# Spec\n\n## Ranking BM25\n\nEl sistema SHALL rankear chunks con BM25.'
    });
    const summary = createStore(root).build();

    expect(summary.files).toBe(2);
    expect(summary.chunks).toBeGreaterThan(0);
    expect(summary.tokens).toBeGreaterThan(0);
    expect(summary.ms).toBeGreaterThanOrEqual(0);

    const raw = JSON.parse(fs.readFileSync(indexPath(root), 'utf8'));
    expect(raw.version).toBeTruthy();
    expect(raw.builtAt).toBeTruthy();
    expect(raw.files).toHaveLength(2);
    for (const f of raw.files) {
      expect(f).toHaveProperty('path');
      expect(f).toHaveProperty('mtime');
      expect(f).toHaveProperty('hash');
    }
    expect(Array.isArray(raw.chunks)).toBe(true);
    expect(raw.chunks.length).toBe(summary.chunks);
  });

  test('build → persist → reload: otra instancia responde sin reindexar', () => {
    const root = makeRoot({
      'src/ready.ts': 'export function readyEndpoint() { return "ready endpoint"; }'
    });
    createStore(root).build();

    const reloaded = createStore(root);
    expect(reloaded.isStale()).toBe(false);
    const res = reloaded.query('ready endpoint');
    expect(res.indexStale).toBe(false);
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results[0]).toMatchObject({
      path: 'src/ready.ts',
      lines: expect.stringMatching(/^\d+-\d+$/),
      symbol: expect.any(String),
      score: expect.any(Number),
      snippet: expect.any(String)
    });
  });

  test('mtime alterado → stale=true y query auto-reindexa marcando indexStale', () => {
    const root = makeRoot({ 'src/ready.ts': 'export function readyEndpoint() { return "ready"; }' });
    createStore(root).build();

    const file = path.join(root, 'src', 'ready.ts');
    const future = new Date(Date.now() + 3600_000);
    fs.utimesSync(file, future, future);

    const store = createStore(root);
    expect(store.isStale()).toBe(true);

    const res = store.query('ready endpoint');
    expect(res.indexStale).toBe(true);
    expect(store.isStale()).toBe(false); // tras el auto-reindex
  });

  test('contenido cambiado (hash distinto) → stale', () => {
    const root = makeRoot({ 'src/ready.ts': 'export function readyEndpoint() { return "ready"; }' });
    createStore(root).build();

    fs.writeFileSync(path.join(root, 'src', 'ready.ts'), 'export function readyEndpoint() { return "changed ready endpoint"; }');
    expect(createStore(root).isStale()).toBe(true);
  });

  test('force: true reconstruye aunque el índice esté fresco', () => {
    const root = makeRoot({ 'src/ready.ts': 'export function readyEndpoint() { return "ready"; }' });
    const store = createStore(root);
    store.build();
    expect(store.isStale()).toBe(false);

    const summary = store.build({ force: true });
    expect(summary.files).toBe(1);
    expect(store.isStale()).toBe(false);
    const raw = JSON.parse(fs.readFileSync(indexPath(root), 'utf8'));
    expect(raw.builtAt).toBeTruthy();
  });

  describe('corpus vacío / exclusiones', () => {
    test('directorio sin archivos elegibles → EmptyCorpusError sin índice corrupto', () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-empty-'));
      expect(() => createStore(root).build()).toThrow(EmptyCorpusError);
      expect(fs.existsSync(indexPath(root))).toBe(false);
    });

    test('solo excluidos (node_modules, binarios) → EmptyCorpusError', () => {
      const root = makeRoot({
        'node_modules/pkg/index.js': 'export const ready = true;',
        'docs/binary.bin': 'ready ready ready ready',
        'img.png': 'ready'
      });
      expect(() => createStore(root).build()).toThrow(EmptyCorpusError);
      expect(fs.existsSync(indexPath(root))).toBe(false);
    });

    test('excluye node_modules y binarios, indexa código y specs', () => {
      const root = makeRoot({
        'src/app.ts': 'export const ready = true;\nexport function endpoint() { return ready; }',
        'node_modules/pkg/index.js': 'export const ready = true;',
        'docs/binary.bin': 'ready ready ready ready ready',
        'openspec/notes.md': '# notes\n\nready endpoint aqui'
      });
      const summary = createStore(root).build();
      expect(summary.files).toBe(2);

      const raw = JSON.parse(fs.readFileSync(indexPath(root), 'utf8'));
      for (const f of raw.files) {
        expect(f.path).not.toContain('node_modules');
        expect(f.path).not.toMatch(/\.bin|\.png/);
      }
    });
  });

  describe('status y query', () => {
    test('status() reporta { indexVersion, builtAt, chunks, files, stale, corpusRoot }', () => {
      const root = makeRoot({ 'src/ready.ts': 'export function readyEndpoint() { return "ready"; }' });
      const store = createStore(root);
      store.build();
      const st = store.status();
      expect(st).toHaveProperty('indexVersion');
      expect(st).toHaveProperty('builtAt');
      expect(typeof st.chunks).toBe('number');
      expect(typeof st.files).toBe('number');
      expect(st.stale).toBe(false);
      expect(typeof st.corpusRoot).toBe('string');
      expect(st.corpusRoot.length).toBeGreaterThan(0);
    });

    test('scope=specs solo devuelve chunks de openspec/, scope=code el resto', () => {
      const root = makeRoot({
        'src/ready.ts': 'export function readyEndpoint() { return "ready endpoint"; }',
        'openspec/specs/rag-mcp/spec.md': '# S\n\n## BM25\n\nready endpoint ranking'
      });
      const store = createStore(root);
      store.build();

      const specs = store.query('ready endpoint', { scope: 'specs' });
      expect(specs.results.length).toBeGreaterThan(0);
      for (const r of specs.results) expect(r.path).toMatch(/openspec\//);

      const code = store.query('ready endpoint', { scope: 'code' });
      expect(code.results.length).toBeGreaterThan(0);
      for (const r of code.results) expect(r.path).not.toMatch(/openspec\//);
    });

    test('query sin matches → results: [] (sin error)', () => {
      const root = makeRoot({ 'src/ready.ts': 'export function readyEndpoint() { return "ready"; }' });
      const store = createStore(root);
      store.build();
      expect(store.query('zzqqxv').results).toEqual([]);
    });
  });
});