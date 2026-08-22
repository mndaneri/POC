// store.ts — walk del corpus, índice persistente (.rag/index.json) y frescura
// (mtime + sha256 por archivo). Delega el ranking en BM25. Solo built-ins de Node
// (fs, path, crypto) y los módulos de rag.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Chunk, chunkFile } from './chunk';
import { BM25, BM25Result, Scope } from './bm25';
import { indexTokens } from './token';

const INDEX_VERSION = '1';
const INDEX_DIR = '.rag';
const INDEX_FILE = 'index.json';
const EXCLUDED_DIRS = new Set(['node_modules', '.git', '.rag', 'dist', 'build', 'coverage']);
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.json', '.md', '.mdx', '.txt']);

/** Corpus sin archivos elegibles: error explícito, nunca un índice corrupto. */
export class EmptyCorpusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmptyCorpusError';
  }
}

interface FileMeta { path: string; mtime: number; hash: string }
interface IndexDoc { version: string; builtAt: number; files: FileMeta[]; chunks: Chunk[] }
export interface BuildSummary { chunks: number; files: number; tokens: number; ms: number }
export interface StoreStatus { indexVersion: string; builtAt: number; chunks: number; files: number; stale: boolean; corpusRoot: string }
export interface QueryOutcome { results: BM25Result[]; indexStale: boolean }

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/** Recorre `dir` (recursivo) y devuelve rutas relativas 'a/b.ts' de archivos de texto elegibles. */
function walk(dir: string, root: string, out: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (EXCLUDED_DIRS.has(e.name) || e.name.startsWith('.')) continue;
      walk(path.join(dir, e.name), root, out);
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (!TEXT_EXT.has(ext)) continue;
      const rel = path.relative(root, path.join(dir, e.name)).split(path.sep).join('/');
      out.push(rel);
    }
  }
}

export class Store {
  private readonly root: string;
  private readonly indexPath: string;
  private chunks: Chunk[] = [];
  private files: FileMeta[] = [];
  private indexVersion = INDEX_VERSION;
  private builtAt = 0;
  private engine: BM25 | null = null;

  constructor(root: string = process.cwd()) {
    this.root = path.resolve(root);
    this.indexPath = path.join(this.root, INDEX_DIR, INDEX_FILE);
    this.load();
  }

  private load(): void {
    if (!fs.existsSync(this.indexPath)) return;
    try {
      const doc = JSON.parse(fs.readFileSync(this.indexPath, 'utf8')) as IndexDoc;
      if (doc && typeof doc.version === 'string' && Array.isArray(doc.chunks)) {
        this.indexVersion = doc.version;
        this.builtAt = Number(doc.builtAt) || 0;
        this.files = Array.isArray(doc.files) ? doc.files : [];
        this.chunks = doc.chunks;
      }
    } catch {
      // Índice corrupto o ilegible: se trata como ausente (rebuild).
      this.chunks = [];
      this.files = [];
    }
  }

  /** Indexa el corpus y persiste. Con force, reconstruye aunque esté fresco. */
  build(opts: { force?: boolean } = {}): BuildSummary {
    const t0 = Date.now();
    if (!opts.force && fs.existsSync(this.indexPath) && !this.isStale()) {
      return this.summary(t0);
    }
    const rels: string[] = [];
    walk(this.root, this.root, rels);
    rels.sort();
    if (rels.length === 0) {
      throw new EmptyCorpusError(`corpus vacío: no hay archivos de texto indexables en ${this.root}`);
    }

    const files: FileMeta[] = [];
    const chunks: Chunk[] = [];
    for (const rel of rels) {
      const abs = path.join(this.root, ...rel.split('/'));
      const st = fs.statSync(abs);
      const content = fs.readFileSync(abs, 'utf8');
      files.push({ path: rel, mtime: Math.floor(st.mtimeMs), hash: sha256(content) });
      chunks.push(...chunkFile(rel, content));
    }
    this.files = files;
    this.chunks = chunks;
    this.builtAt = Date.now();
    this.indexVersion = INDEX_VERSION;
    this.engine = null; // se reconstruye de forma perezosa

    fs.mkdirSync(path.dirname(this.indexPath), { recursive: true });
    const doc: IndexDoc = { version: INDEX_VERSION, builtAt: this.builtAt, files, chunks };
    fs.writeFileSync(this.indexPath, JSON.stringify(doc));
    return this.summary(t0);
  }

  private summary(t0: number): BuildSummary {
    let tokens = 0;
    for (const c of this.chunks) tokens += indexTokens(c.text).length;
    return { chunks: this.chunks.length, files: this.files.length, tokens, ms: Date.now() - t0 };
  }

  /** Stale si falta el índice, algún archivo cambió (mtime o hash) o el corpus cambió de tamaño. */
  isStale(): boolean {
    if (!fs.existsSync(this.indexPath)) return true;
    for (const f of this.files) {
      const abs = path.join(this.root, ...f.path.split('/'));
      let st: fs.Stats;
      try {
        st = fs.statSync(abs);
      } catch {
        return true; // archivo eliminado
      }
      if (Math.floor(st.mtimeMs) !== f.mtime) return true;
      if (sha256(fs.readFileSync(abs, 'utf8')) !== f.hash) return true;
    }
    const rels: string[] = [];
    walk(this.root, this.root, rels);
    return rels.length !== this.files.length;
  }

  /** Busca en el índice; si está stale, auto-reindexa y responde con indexStale=true. */
  query(text: string, opts: { k?: number; scope?: Scope } = {}): QueryOutcome {
    const wasStale = this.isStale();
    if (wasStale) this.build();
    return { results: this.engineNow().search(text, opts), indexStale: wasStale };
  }

  status(): StoreStatus {
    return {
      indexVersion: this.indexVersion,
      builtAt: this.builtAt,
      chunks: this.chunks.length,
      files: this.files.length,
      stale: this.isStale(),
      corpusRoot: this.root
    };
  }

  private engineNow(): BM25 {
    if (!this.engine) this.engine = new BM25(this.chunks);
    return this.engine;
  }
}

export function createStore(root?: string): Store {
  return new Store(root);
}