import { BM25, BM25Result, scopeOf } from '../src/rag/bm25';
import { Chunk } from '../src/rag/chunk';

// Corpus fijo: textos elegidos para que el orden esperado sea inequívoco.
const CHUNKS: Chunk[] = [
  {
    path: 'src/ready.ts',
    symbol: 'apiReadinessEndpoint',
    startLine: 3,
    endLine: 9,
    text: 'ready ready ready endpoint'
  },
  {
    path: 'tests/ready.test.ts',
    symbol: 'readyTest',
    startLine: 5,
    endLine: 15,
    text: 'ready endpoint'
  },
  {
    path: 'src/server.ts',
    symbol: 'createServer',
    startLine: 1,
    endLine: 20,
    text: 'express app listen port'
  },
  {
    path: 'openspec/specs/rag-mcp/spec.md',
    symbol: 'Ranking BM25',
    startLine: 26,
    endLine: 39,
    text: 'rankear chunks con bm25 ranking'
  }
];

describe('rag bm25 (ranking)', () => {
  test('ranks a fixed corpus deterministically by relevance', () => {
    const index = new BM25(CHUNKS);
    const res = index.search('ready endpoint', { k: 5 });
    expect(res.map((r) => r.path)).toEqual(['src/ready.ts', 'tests/ready.test.ts']);
  });

  test('returns identical results across repeated searches', () => {
    const index = new BM25(CHUNKS);
    expect(index.search('ready endpoint', { k: 5 })).toEqual(index.search('ready endpoint', { k: 5 }));
  });

  test('scores are non-increasing', () => {
    const res = new BM25(CHUNKS).search('ready endpoint', { k: 5 });
    for (let i = 1; i < res.length; i++) {
      expect(res[i].score).toBeLessThanOrEqual(res[i - 1].score);
    }
  });

  test('boosts chunks whose symbol matches the query over identical text', () => {
    const index = new BM25([
      { path: 'a.ts', symbol: 'utils', startLine: 1, endLine: 2, text: 'ready' },
      { path: 'b.ts', symbol: 'readyEndpoint', startLine: 1, endLine: 2, text: 'alpha beta' }
    ]);
    const res = index.search('ready', { k: 5 });
    expect(res.map((r) => r.path)).toEqual(['b.ts', 'a.ts']);
  });

  test('limits results to k', () => {
    const many: Chunk[] = ['a.ts', 'b.ts', 'c.ts'].map((p, i) => ({
      path: p,
      symbol: `s${i}`,
      startLine: 1,
      endLine: 2,
      text: 'ready'
    }));
    const res = new BM25(many).search('ready', { k: 2 });
    expect(res).toHaveLength(2);
    // empates se rompen de forma determinista por path
    expect(res.map((r) => r.path)).toEqual(['a.ts', 'b.ts']);
  });

  test('matches across stemming (endpoints -> endpoint)', () => {
    const res = new BM25([{ path: 'a.ts', symbol: 'x', startLine: 1, endLine: 1, text: 'endpoint' }]).search('endpoints');
    expect(res).toHaveLength(1);
  });

  describe('scope', () => {
    test('scopeOf classifies paths', () => {
      expect(scopeOf('src/ready.ts')).toBe('code');
      expect(scopeOf('tests/ready.test.ts')).toBe('code');
      expect(scopeOf('openspec/specs/rag-mcp/spec.md')).toBe('specs');
      expect(scopeOf('openspec\\changes\\x\\tasks.md')).toBe('specs');
    });

    test('filters by scope', () => {
      const index = new BM25([
        { path: 'src/ready.ts', symbol: 'a', startLine: 1, endLine: 1, text: 'ready' },
        { path: 'openspec/specs/rag-mcp/spec.md', symbol: 'b', startLine: 1, endLine: 1, text: 'ready' }
      ]);
      expect(index.search('ready', { scope: 'specs' }).map((r) => r.path)).toEqual(['openspec/specs/rag-mcp/spec.md']);
      expect(index.search('ready', { scope: 'code' }).map((r) => r.path)).toEqual(['src/ready.ts']);
      expect(index.search('ready', { scope: 'all' })).toHaveLength(2);
    });
  });

  describe('sin coincidencias', () => {
    test('query sin matches devuelve [] (sin error)', () => {
      expect(new BM25(CHUNKS).search('zzqqxv')).toEqual([]);
    });

    test('query vacía o solo puntuación devuelve []', () => {
      expect(new BM25(CHUNKS).search('')).toEqual([]);
      expect(new BM25(CHUNKS).search('!!! ???')).toEqual([]);
    });

    test('corpus vacío devuelve []', () => {
      expect(new BM25([]).search('ready')).toEqual([]);
    });
  });

  describe('forma del resultado', () => {
    test('cada hit incluye path, lines, symbol, score y snippet', () => {
      const res: BM25Result[] = new BM25(CHUNKS).search('ready endpoint', { k: 5 });
      for (const r of res) {
        expect(r.path).toBeTruthy();
        expect(r.symbol).toBeTruthy();
        expect(r.lines).toMatch(/^\d+-\d+$/);
        expect(r.score).toBeGreaterThan(0);
        expect(r.snippet.length).toBeGreaterThan(0);
      }
      expect(res[0].lines).toBe('3-9');
    });
  });
});