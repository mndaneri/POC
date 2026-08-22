// Ranking BM25 (Okapi) sobre tokens normalizados (token.ts) + boost por
// coincidencia de la query con el símbolo del chunk. Determinista: los
// empates se rompen por path y luego por symbol.

import { Chunk } from './chunk';
import { indexTokens } from './token';

export type Scope = 'code' | 'specs' | 'all';

export interface BM25Options {
  k1?: number; // saturación de TF (default 1.5)
  b?: number; // normalización de longitud (default 0.75)
  symbolBoost?: number; // bonus aditivo si algún token de la query matchea el símbolo (default 1)
}

export interface BM25Result {
  path: string;
  lines: string; // 'startLine-endLine' (1-based, inclusivo)
  symbol: string;
  score: number;
  snippet: string;
}

/** 'specs' = archivos bajo openspec/; el resto es 'code'. */
export function scopeOf(path: string): 'code' | 'specs' {
  const p = path.replace(/\\/g, '/');
  return p.startsWith('openspec/') || p.includes('/openspec/') ? 'specs' : 'code';
}

interface Doc {
  chunk: Chunk;
  tokens: string[];
}

export class BM25 {
  private readonly docs: Doc[];
  private readonly df = new Map<string, number>();
  private readonly n: number;
  private readonly avgdl: number;
  private readonly k1: number;
  private readonly b: number;
  private readonly symbolBoost: number;

  constructor(chunks: Chunk[], opts: BM25Options = {}) {
    this.k1 = opts.k1 ?? 1.5;
    this.b = opts.b ?? 0.75;
    this.symbolBoost = opts.symbolBoost ?? 1;
    this.docs = chunks.map((chunk) => ({ chunk, tokens: indexTokens(chunk.text) }));
    this.n = this.docs.length;
    let totalLen = 0;
    for (const d of this.docs) {
      totalLen += d.tokens.length;
      for (const t of new Set(d.tokens)) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    }
    this.avgdl = this.n > 0 ? totalLen / this.n : 0;
  }

  private idf(term: string): number {
    const f = this.df.get(term) ?? 0;
    // Variante no negativa (estilo Elasticsearch)
    return Math.log(1 + (this.n - f + 0.5) / (f + 0.5));
  }

  private bm25Score(doc: Doc, qTokens: string[]): number {
    const tf = new Map<string, number>();
    for (const t of doc.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    const norm = 1 - this.b + this.b * (doc.tokens.length / (this.avgdl || 1));
    let score = 0;
    for (const t of qTokens) {
      const f = tf.get(t) ?? 0;
      if (!f) continue;
      score += this.idf(t) * ((f * (this.k1 + 1)) / (f + this.k1 * norm));
    }
    return score;
  }

  private symbolMatches(qTokens: string[], chunk: Chunk): boolean {
    const symbols = new Set(indexTokens(chunk.symbol));
    return qTokens.some((t) => symbols.has(t));
  }

  search(query: string, opts: { k?: number; scope?: Scope } = {}): BM25Result[] {
    const k = opts.k ?? 5;
    const scope: Scope = opts.scope ?? 'all';
    const qTokens = [...new Set(indexTokens(query))];
    if (!qTokens.length || this.n === 0) return [];

    const scored = this.docs
      .filter((d) => scope === 'all' || scopeOf(d.chunk.path) === scope)
      .map((d) => ({
        chunk: d.chunk,
        score: this.bm25Score(d, qTokens) + (this.symbolMatches(qTokens, d.chunk) ? this.symbolBoost : 0)
      }))
      .filter((d) => d.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.chunk.path.localeCompare(b.chunk.path) ||
          a.chunk.symbol.localeCompare(b.chunk.symbol)
      );

    return scored.slice(0, k).map((d) => this.toResult(d.chunk, d.score));
  }

  private toResult(chunk: Chunk, score: number): BM25Result {
    return {
      path: chunk.path,
      lines: `${chunk.startLine}-${chunk.endLine}`,
      symbol: chunk.symbol,
      score,
      snippet: chunk.text.replace(/\s+/g, ' ').trim().slice(0, 160)
    };
  }
}