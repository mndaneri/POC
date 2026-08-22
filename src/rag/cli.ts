// cli.ts — CLI del RAG interno (BM25, cero deps de runtime).
// Uso:
//   rag index [--force]                        Indexa el corpus en .rag/index.json
//   rag query <q...> [--k N] [--scope code|specs|all]
//   rag chat [pregunta...] [--model M]         (sección 8: Ollama)
//   rag status                                 Estado del índice
//   rag help
// La raíz del corpus es process.cwd() (o RAG_ROOT si está definida).

import path from 'path';
import { Store, EmptyCorpusError } from './store';

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

const VALUE_FLAGS = new Set(['k', 'scope', 'model']);

export function parseArgs(argv: string[]): ParsedArgs {
  const [command = 'help', ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith('--')) {
      const name = a.slice(2);
      if (name === 'force') flags.force = true;
      else if (VALUE_FLAGS.has(name) && i + 1 < rest.length) flags[name] = rest[++i];
    } else {
      positional.push(a);
    }
  }
  return { command, positional, flags };
}

const USAGE = [
  'Uso: rag <comando> [opciones]',
  '',
  'Comandos:',
  '  index [--force]                    Indexa el corpus en .rag/index.json',
  '  query <q...> [--k N] [--scope s]   Búsqueda BM25 top-k (scope: code|specs|all)',
  '  chat [pregunta...] [--model M]     Chat RAG vía Ollama (sección 8)',
  '  status                             Estado del índice (versión, frescura, contadores)',
  '  help                               Muestra esta ayuda',
  '',
  'Variables: RAG_ROOT (raíz del corpus, default: directorio actual), RAG_MODEL (modelo Ollama)'
].join('\n');

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function optK(flags: Record<string, string | boolean>): number | undefined {
  if (typeof flags.k !== 'string') return undefined;
  const n = Number(flags.k);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function optScope(flags: Record<string, string | boolean>): 'code' | 'specs' | 'all' | undefined {
  const s = flags.scope;
  return s === 'code' || s === 'specs' || s === 'all' ? s : undefined;
}

/** Cablea `chat` a la sección 8 (chat.ts) vía require perezoso: el CLI carga
 *  aunque ese módulo aún no exista. Devuelve el código de salida. */
function runChat(positional: string[], flags: Record<string, string | boolean>): number {
  let chat: { runChat?: (opts: unknown) => number };
  try {
    chat = require('./chat');
  } catch {
    console.error('El comando `chat` aún no está disponible (sección 8: Ollama).');
    return 2;
  }
  if (typeof chat.runChat !== 'function') {
    console.error('chat.ts no expone runChat.');
    return 2;
  }
  return chat.runChat({ question: positional.join(' '), model: typeof flags.model === 'string' ? flags.model : undefined, k: optK(flags) });
}

export function run(argv: string[]): number {
  const { command, positional, flags } = parseArgs(argv);
  const root = process.env.RAG_ROOT ? path.resolve(process.env.RAG_ROOT) : process.cwd();
  const store = new Store(root);
  try {
    switch (command) {
      case 'index': {
        printJson(store.build({ force: flags.force === true }));
        return 0;
      }
      case 'query': {
        const query = positional.join(' ').trim();
        if (!query) {
          console.error('Faltan los términos de búsqueda.');
          console.error(USAGE);
          return 2;
        }
        printJson(store.query(query, { k: optK(flags), scope: optScope(flags) }));
        return 0;
      }
      case 'status': {
        printJson(store.status());
        return 0;
      }
      case 'chat': {
        return runChat(positional, flags);
      }
      case 'help': {
        console.log(USAGE);
        return 0;
      }
      default: {
        console.error(`Comando desconocido: ${command}`);
        console.error(USAGE);
        return 2;
      }
    }
  } catch (e) {
    if (e instanceof EmptyCorpusError) {
      console.error(`Error: ${e.message}`);
      return 1;
    }
    console.error(`Error: ${(e as Error).message}`);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = run(process.argv.slice(2));
}