import { chunkTypeScript, chunkMarkdown, chunkText, chunkFile, Chunk } from '../src/rag/chunk';

const TS_FIXTURE = `import { x } from './dep';

export function alpha(a: number): number {
  return a * 2;
}

// comentario
export const beta = (b: string) => b.trim();
`;

const MD_FIXTURE = `# Título

Introducción.

## Sección A

Contenido A.

### Sub A

Contenido sub.

## Sección B

Contenido B.
`;

describe('rag chunk', () => {
  describe('chunkTypeScript', () => {
    test('splits a TS file into one chunk per exported symbol', () => {
      const chunks = chunkTypeScript(TS_FIXTURE, 'src/sample.ts');
      const names = chunks.map((c) => c.symbol);
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
    });

    test('keeps exact 1-based line ranges', () => {
      const chunks = chunkTypeScript(TS_FIXTURE, 'src/sample.ts');
      const alpha = chunks.find((c) => c.symbol === 'alpha');
      expect(alpha).toBeDefined();
      expect(alpha!.startLine).toBe(3);
      expect(alpha!.endLine).toBe(5);
      expect(alpha!.text).toContain('a * 2');
    });

    test('chunks carry the file path', () => {
      const chunks = chunkTypeScript(TS_FIXTURE, 'src/sample.ts');
      for (const c of chunks) expect(c.path).toBe('src/sample.ts');
    });
  });

  describe('chunkMarkdown', () => {
    test('splits by heading with heading-path symbols', () => {
      const chunks = chunkMarkdown(MD_FIXTURE, 'openspec/sample.md');
      const names = chunks.map((c) => c.symbol);
      expect(names).toContain('Sección A');
      expect(names).toContain('Sección A > Sub A');
      expect(names).toContain('Sección B');
    });

    test('heading chunk includes its body', () => {
      const chunks = chunkMarkdown(MD_FIXTURE, 'openspec/sample.md');
      const a = chunks.find((c) => c.symbol === 'Sección A');
      expect(a!.text).toContain('Contenido A.');
      expect(a!.text).not.toContain('Contenido B.');
    });
  });

  describe('chunkText / chunkFile', () => {
    test('chunkText produces a single chunk with path and full range', () => {
      const lines = 'a\nb\nc';
      const c = chunkText(lines, 'data/whole.json');
      expect(c).toHaveLength(1);
      expect(c[0].startLine).toBe(1);
      expect(c[0].endLine).toBe(3);
      expect(c[0].text).toBe(lines);
    });

    test('chunkFile dispatches by extension', () => {
      expect(chunkFile('a.ts', TS_FIXTURE).map((x) => x.symbol)).toContain('alpha');
      expect(chunkFile('a.md', MD_FIXTURE).map((x) => x.symbol)).toContain('Sección A');
      expect(chunkFile('a.json', '{"k":1}')).toHaveLength(1);
    });
  });

  describe('Chunk shape', () => {
    test('every chunk has required fields', () => {
      const chunks: Chunk[] = [...chunkTypeScript(TS_FIXTURE, 's.ts'), ...chunkMarkdown(MD_FIXTURE, 's.md')];
      for (const c of chunks) {
        expect(c.path).toBeTruthy();
        expect(c.symbol).toBeTruthy();
        expect(c.startLine).toBeGreaterThanOrEqual(1);
        expect(c.endLine).toBeGreaterThanOrEqual(c.startLine);
        expect(c.text.length).toBeGreaterThan(0);
      }
    });
  });
});
