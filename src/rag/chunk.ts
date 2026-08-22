// Chunking ligero para RAG: TS/JS por símbolos exportados, Markdown por
// encabezados (con ruta de ancestros), y resto de archivos como chunk único.

export interface Chunk {
  path: string;
  symbol: string;
  startLine: number; // 1-based, inclusivo
  endLine: number; // 1-based, inclusivo
  text: string;
}

// ---------- utilidades de ruta (sin dependencias) ----------

function basename(p: string): string {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return i === -1 ? p : p.slice(i + 1);
}

function extname(p: string): string {
  const b = basename(p);
  const i = b.lastIndexOf('.');
  return i <= 0 ? '' : b.slice(i).toLowerCase();
}

// ---------- TypeScript / JavaScript: un chunk por símbolo exportado ----------

const DECL_RE = /^export\s+(?:default\s+)?(?:async\s+)?(?:abstract\s+)?(?:function|class|const|let|var|enum|type|interface)\s*([A-Za-z_$][\w$]*)?/;

/**
 * Localiza el fin (índice de línea) del cuerpo de una declaración:
 * - Si abre llaves: hasta que la profundidad vuelva a 0.
 * - Si no: hasta el ; de fin de declaración.
 * `stopBefore` acota el escaneo al inicio de la siguiente declaración.
 */
function findEndLine(lines: string[], start: number, stopBefore: number): number {
  let depth = 0;
  let sawBrace = false;
  const limit = Math.min(stopBefore, lines.length);
  for (let i = start; i < limit; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (ch === '{') sawBrace = true;
    }
    if (sawBrace && depth === 0) return i;
    if (!sawBrace && lines[i].trimEnd().endsWith(';')) return i;
  }
  return limit - 1;
}

/** Divide un archivo TS/JS en chunks: preámbulo (imports) + un chunk por export. */
export function chunkTypeScript(source: string, path: string): Chunk[] {
  const lines = source.split('\n');
  const starts: { idx: number; name: string }[] = [];
  lines.forEach((line, idx) => {
    const m = line.match(DECL_RE);
    if (m) starts.push({ idx, name: m[1] || 'default' });
  });
  if (starts.length === 0) return chunkText(source, path);

  const chunks: Chunk[] = [];
  const preamble = lines.slice(0, starts[0].idx).join('\n').trim();
  if (preamble) {
    chunks.push({ path, symbol: basename(path), startLine: 1, endLine: starts[0].idx, text: preamble });
  }
  starts.forEach((s, i) => {
    const stopBefore = i + 1 < starts.length ? starts[i + 1].idx : lines.length;
    const end = findEndLine(lines, s.idx, stopBefore);
    chunks.push({
      path,
      symbol: s.name,
      startLine: s.idx + 1,
      endLine: end + 1,
      text: lines.slice(s.idx, end + 1).join('\n')
    });
  });
  return chunks;
}

// ---------- Markdown: un chunk por encabezado ----------

const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const FENCE_RE = /^\s*(?:```|~~~)/;

/**
 * Divide un documento Markdown por encabezados. El `symbol` de un heading
 * es su ruta de ancestros a partir del nivel 2
 * (ej. "Sección A > Sub A"); el nivel 1 usa solo su título.
 */
export function chunkMarkdown(source: string, path: string): Chunk[] {
  const lines = source.split('\n');
  const chunks: Chunk[] = [];
  let inFence = false;
  let start = 0;
  let lastAt: Record<number, string> = {}; // último título visto por nivel (>=2)

  const flush = (endIdx: number, symbol: string) => {
    const text = lines.slice(start, endIdx).join('\n').trim();
    if (text) chunks.push({ path, symbol, startLine: start + 1, endLine: endIdx, text });
  };

  let current: { start: number; symbol: string } | null = null;
  for (let i = 0; i < lines.length; i++) {
    if (FENCE_RE.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    const m = inFence ? null : lines[i].match(HEADING_RE);
    if (!m) continue;
    if (current) flush(i, current.symbol);
    const level = m[1].length;
    if (level === 1) {
      lastAt = {};
      current = { start: i, symbol: m[2].trim() };
    } else {
      for (const k of Object.keys(lastAt)) if (Number(k) >= level) delete lastAt[Number(k)];
      lastAt[level] = m[2].trim();
      const parts = [];
      for (let l = level - 1; l >= 2; l--) {
        if (lastAt[l]) parts.unshift(lastAt[l]);
      }
      parts.push(m[2].trim());
      current = { start: i, symbol: parts.join(' > ') };
    }
  }
  if (current) flush(lines.length, current.symbol);
  else flush(lines.length, basename(path));
  return chunks;
}

// ---------- genérico + dispatch por extensión ----------

/** Chunk único con el rango completo (JSON, YAML, txt, etc.). */
export function chunkText(text: string, path: string): Chunk[] {
  const lineCount = text.length === 0 ? 1 : text.split('\n').length;
  return [{ path, symbol: basename(path), startLine: 1, endLine: lineCount, text }];
}

const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts']);
const MD_EXT = new Set(['.md', '.mdx']);

/** Elige la estrategia de chunking según la extensión del archivo. */
export function chunkFile(path: string, content: string): Chunk[] {
  const ext = extname(path);
  if (CODE_EXT.has(ext)) return chunkTypeScript(content, path);
  if (MD_EXT.has(ext)) return chunkMarkdown(content, path);
  return chunkText(content, path);
}