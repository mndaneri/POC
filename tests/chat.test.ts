// chat (sección 8, Ollama) — tests con fetch mockeado: 200 / 500 / timeout / error de red,
// prompt con top-k y citas path:line, resolución de modelo (explícito > RAG_MODEL > default)
// y runChat end-to-end sobre un corpus efímero.

import fs from 'fs';
import os from 'os';
import path from 'path';
import { BM25Result } from '../src/rag/bm25';
import { DEFAULT_MODEL, askOllama, buildPrompt, resolveModel, runChat } from '../src/rag/chat';

const RESULT_A: BM25Result = { path: 'src/ready.ts', lines: '1-3', symbol: 'readyStatus', score: 4.2, snippet: 'return "ok";' };
const RESULT_B: BM25Result = { path: 'src/other.ts', lines: '5-9', symbol: 'otherThing', score: 2.1, snippet: 'otra cosa' };

function makeCorpus(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-chat-'));
  fs.writeFileSync(path.join(dir, 'ready.ts'), 'export function readyStatus(): string {\n  return "ok";\n}\n');
  return dir;
}

interface FetchCall {
  url: string;
  init: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal };
}

type OkRes = { ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<unknown> };

function okResponse(): OkRes {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({ message: { content: 'respuesta del modelo citando src/ready.ts:1-3' } })
  };
}

function mockFetch(responder: (url: string, init: FetchCall['init']) => unknown = () => okResponse()): {
  fn: (url: string, init?: FetchCall['init']) => Promise<unknown>;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  const fn = async (url: string, init: FetchCall['init'] = {}): Promise<unknown> => {
    calls.push({ url, init });
    return responder(url, init);
  };
  return { fn, calls };
}

function userContent(body: string): string {
  const parsed = JSON.parse(body) as { messages: Array<{ role: string; content: string }> };
  const user = parsed.messages.find(m => m.role === 'user');
  if (!user) throw new Error('el body no contiene mensaje user');
  return user.content;
}

describe('chat Ollama (sección 8) — fetch mockeado', () => {
  afterEach(() => {
    delete process.env.RAG_MODEL;
  });

  test('200 → respuesta del modelo, fallback=false, POST /api/chat con model por defecto', async () => {
    const { fn, calls } = mockFetch();
    const out = await askOllama({ question: '¿quién valida /api/ready?', results: [RESULT_A], fetchImpl: fn });
    expect(out.fallback).toBe(false);
    expect(out.error).toBeUndefined();
    expect(out.answer).toContain('respuesta del modelo');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toMatch(/localhost:11434\/api\/chat$/);
    expect(calls[0].init.method).toBe('POST');
    const body = JSON.parse(calls[0].init.body!) as { model: string; stream: boolean };
    expect(body.model).toBe(DEFAULT_MODEL);
    expect(body.model).toBe('qwen3.8:27b-q4_K_M');
    expect(body.stream).toBe(false);
  });

  test('200 → por defecto usa el fetch global (sin fetchImpl)', async () => {
    const { fn } = mockFetch();
    const original = globalThis.fetch;
    (globalThis as any).fetch = fn;
    try {
      const out = await askOllama({ question: 'q', results: [RESULT_A] });
      expect(out.fallback).toBe(false);
      expect(out.answer).toContain('respuesta del modelo');
    } finally {
      if (original) (globalThis as any).fetch = original;
      else delete (globalThis as any).fetch;
    }
  });

  test('500 → fallback=true con top-k crudo (citas path:lines) y error HTTP', async () => {
    const { fn } = mockFetch(() => ({
      ok: false,
      status: 500,
      text: () => Promise.resolve('boom'),
      json: () => Promise.reject(new Error('no hay json'))
    }));
    const out = await askOllama({ question: 'q', results: [RESULT_A], fetchImpl: fn });
    expect(out.fallback).toBe(true);
    expect(out.error).toMatch(/HTTP 500/);
    expect(out.answer).toContain('src/ready.ts');
    expect(out.answer).toContain('1-3');
  });


  test('timeout (abort) → fallback=true, sin excepciones, reason de timeout', async () => {
    const fn = async (_url: string, init?: FetchCall['init']): Promise<unknown> =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const e = new Error('The operation was aborted');
          e.name = 'AbortError';
          reject(e);
        });
      });
    const out = await askOllama({ question: 'q', results: [RESULT_A], fetchImpl: fn, timeoutMs: 50 });
    expect(out.fallback).toBe(true);
    expect(out.error).toMatch(/timeout/i);
    expect(out.answer).toContain('src/ready.ts');
  });

  test('error de red (ECONNREFUSED) → fallback=true con reason, sin excepciones', async () => {
    const fn = async (): Promise<unknown> => {
      throw new Error('fetch failed: connect ECONNREFUSED 127.0.0.1:11434');
    };
    const out = await askOllama({ question: 'q', results: [RESULT_A], fetchImpl: fn });
    expect(out.fallback).toBe(true);
    expect(out.error).toMatch(/red|ECONNREFUSED/i);
    expect(out.answer).toContain('src/ready.ts');
  });

  test('prompt incluye la pregunta, el top-k y las citas path:line', () => {
    const prompt = buildPrompt('¿quién valida /api/ready?', [RESULT_A, RESULT_B]);
    expect(prompt).toContain('¿quién valida /api/ready?');
    expect(prompt).toContain('src/ready.ts:1-3');
    expect(prompt).toContain('src/other.ts:5-9');
    expect(prompt).toContain('readyStatus');
  });

  test('k=1 → el prompt solo incluye el primer resultado', async () => {
    const { fn, calls } = mockFetch();
    await askOllama({ question: 'q', results: [RESULT_A, RESULT_B], k: 1, fetchImpl: fn });
    const user = userContent(calls[0].init.body!);
    expect(user).toContain('src/ready.ts:1-3');
    expect(user).not.toContain('src/other.ts');
  });

  test('resolución de modelo: explícito > RAG_MODEL > default', () => {
    process.env.RAG_MODEL = 'llama3:8b';
    expect(resolveModel({})).toBe('llama3:8b');
    expect(resolveModel({ model: 'qwen3:4b' })).toBe('qwen3:4b');
    delete process.env.RAG_MODEL;
    expect(resolveModel({})).toBe(DEFAULT_MODEL);
  });

  describe('runChat (end-to-end sobre corpus efímero)', () => {
    let logs: string[];
    let errors: string[];
    let logSpy: jest.SpyInstance;
    let errSpy: jest.SpyInstance;
    let corpus: string;

    beforeEach(() => {
      logs = [];
      errors = [];
      logSpy = jest.spyOn(console, 'log').mockImplementation((...c: unknown[]) => { logs.push(c.map(String).join(' ')); });
      errSpy = jest.spyOn(console, 'error').mockImplementation((...c: unknown[]) => { errors.push(c.map(String).join(' ')); });
      corpus = makeCorpus();
      process.env.RAG_ROOT = corpus;
    });

    afterEach(() => {
      logSpy.mockRestore();
      errSpy.mockRestore();
      delete process.env.RAG_ROOT;
      delete (globalThis as any).fetch;
      fs.rmSync(corpus, { recursive: true, force: true });
    });

    const flush = (): Promise<void> => new Promise(r => setImmediate(r));

    test('Ollama 200 → exit 0 e imprime la respuesta del modelo', async () => {
      (globalThis as any).fetch = mockFetch().fn;
      expect(runChat({ question: 'ready endpoint' })).toBe(0);
      await flush();
      expect(logs.join('\n')).toContain('respuesta del modelo');
    });

    test('Ollama caído (503) → exit 0, warn y fallback crudo citando el corpus', async () => {
      (globalThis as any).fetch = mockFetch(() => ({
        ok: false,
        status: 503,
        text: () => Promise.resolve(''),
        json: () => Promise.reject(new Error('no json'))
      })).fn;
      expect(runChat({ question: 'ready endpoint' })).toBe(0);
      await flush();
      expect(logs.join('\n')).toContain('ready.ts');
      expect(logs.join('\n')).toContain('1-3');
      expect(errors.join('\n')).toMatch(/Ollama/);
    });

    test('sin pregunta → exit 2 con mensaje de uso', () => {
      expect(runChat({ question: '   ' })).toBe(2);
      expect(errors.join('\n')).toMatch(/pregunta/i);
    });
  });
});

