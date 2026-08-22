// chat.ts — Sección 8: chat RAG vía Ollama (cero deps de runtime; fetch global de Node).
// Flujo: pregunta → Store.query (top-k BM25) → prompt con citas path:line → POST /api/chat.
// Si Ollama falla (HTTP no 2xx, timeout, error de red) degrada a "crudo": top-k formateado.
// Modelo: --model > RAG_MODEL > DEFAULT_MODEL. Endpoint: OLLAMA_HOST > http://localhost:11434.

import path from 'path';
import { BM25Result } from './bm25';
import { Store } from './store';

export const DEFAULT_MODEL = 'qwen3.8:27b-q4_K_M';
export const DEFAULT_TIMEOUT_MS = 30_000;
const SYSTEM_PROMPT =
  'Eres un asistente RAG de un repositorio. Responde usando SOLO el contexto recuperado y ' +
  'cita siempre las fuentes como path:line. Si la respuesta no está en el contexto, dilo.';

export interface ChatOutcome {
  answer: string;
  fallback: boolean;
  error?: string;
}

type FetchImpl = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<any>;

export interface AskOptions {
  question: string;
  results: BM25Result[];
  model?: string;
  url?: string;
  k?: number;
  timeoutMs?: number;
  fetchImpl?: FetchImpl;
}

export interface RunChatOptions {
  question?: string;
  model?: string;
  k?: number;
  root?: string;
  url?: string;
  timeoutMs?: number;
}

/** Modelo a usar: explícito > RAG_MODEL > default. */
export function resolveModel(opts: { model?: string } = {}): string {
  if (opts.model && opts.model.trim()) return opts.model.trim();
  if (process.env.RAG_MODEL && process.env.RAG_MODEL.trim()) return process.env.RAG_MODEL.trim();
  return DEFAULT_MODEL;
}

/** Endpoint Ollama: OLLAMA_HOST > http://localhost:11434 (siempre /api/chat). */
export function resolveUrl(): string {
  const host = (process.env.OLLAMA_HOST || 'http://localhost:11434').replace(/\/+$/, '');
  return `${host}/api/chat`;
}

/** Prompt con el top-k recuperado (citas path:line) y la pregunta. */
export function buildPrompt(question: string, results: BM25Result[]): string {
  const context = results.length
    ? results
        .map((r, i) => `${i + 1}. ${r.path}:${r.lines} (símbolo: ${r.symbol}, score: ${r.score})\n${r.snippet}`)
        .join('\n\n')
    : '(sin coincidencias en el corpus)';
  return [
    'Contexto recuperado del repositorio (top-k; usa SOLO estas fuentes):',
    context,
    '',
    `Pregunta: ${question}`,
    '',
    'Responde en español, de forma concisa, citando siempre path:line de las fuentes recuperadas.'
  ].join('\n');
}

function rawFallback(reason: string, topK: BM25Result[]): ChatOutcome {
  const lines = topK.map(
    (r, i) => `${i + 1}. ${r.path}:${r.lines} — ${r.symbol} (score ${r.score})\n   ${r.snippet}`
  );
  const answer = [
    `(Ollama no respondió: ${reason}). Resultados crudos de la búsqueda:`,
    lines.length ? lines.join('\n') : '(sin coincidencias en el corpus)'
  ].join('\n');
  return { answer, fallback: true, error: reason };
}


/** Pregunta al modelo con el top-k como contexto; ante cualquier fallo, fallback crudo. */
export async function askOllama(opts: AskOptions): Promise<ChatOutcome> {
  const topK = opts.k && opts.k > 0 ? opts.results.slice(0, opts.k) : opts.results;
  const fetchImpl =
    opts.fetchImpl ??
    (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined);
  if (!fetchImpl) return rawFallback('fetch no disponible en este Node', topK);

  const model = resolveModel({ model: opts.model });
  const url = opts.url ?? resolveUrl();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const body = JSON.stringify({
    model,
    stream: false,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildPrompt(opts.question, topK) }
    ]
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal
    });
    if (!res.ok) {
      let detail = '';
      try {
        if (typeof res.text === 'function') detail = await res.text();
      } catch {
        // sin detalle
      }
      return rawFallback(`HTTP ${res.status}${detail ? `: ${detail.trim()}` : ''}`, topK);
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return rawFallback('respuesta no válida (JSON) del modelo', topK);
    }
    const content = (data as { message?: { content?: unknown } })?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      return rawFallback('respuesta vacía del modelo', topK);
    }
    return { answer: content.trim(), fallback: false };
  } catch (e) {
    const aborted =
      controller.signal.aborted || (e as Error)?.name === 'AbortError' || (e as Error)?.name === 'TimeoutError';
    const reason = aborted ? `timeout tras ${timeoutMs} ms` : `error de red (${(e as Error).message})`;
    return rawFallback(reason, topK);
  } finally {
    clearTimeout(timer);
  }
}

/** Entrada del CLI (`rag chat`): pregunta → top-k → Ollama (o crudo). Devuelve código de salida. */
export function runChat(opts: RunChatOptions = {}): number {
  const question = (opts.question ?? '').trim();
  if (!question) {
    console.error('Falta la pregunta. Uso: rag chat <pregunta> [--k N] [--model M]');
    return 2;
  }
  const root = opts.root ?? (process.env.RAG_ROOT ? path.resolve(process.env.RAG_ROOT) : process.cwd());
  let results: BM25Result[];
  try {
    results = new Store(root).query(question, { k: opts.k }).results;
  } catch (e) {
    console.error(`Error: ${(e as Error).message}`);
    return 1;
  }
  askOllama({ question, results, model: opts.model, url: opts.url, k: opts.k, timeoutMs: opts.timeoutMs })
    .then(out => {
      if (out.fallback) console.error(`[warn] Ollama no disponible: ${out.error}`);
      console.log(out.answer);
    })
    .catch(e => {
      console.error(`Error: ${(e as Error).message}`);
      process.exitCode = 1;
    });
  return 0;
}
