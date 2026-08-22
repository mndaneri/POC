import { tokenize, stem, indexTokens } from '../src/rag/token';

describe('rag token (tokenizer)', () => {
  describe('tokenize', () => {
    test('splits camelCase identifiers into words', () => {
      expect(tokenize('apiReadinessEndpoint')).toEqual(['api', 'readiness', 'endpoint']);
    });

    test('splits acronyms from camelCase', () => {
      expect(tokenize('getReadyResponse')).toEqual(['get', 'ready', 'response']);
    });

    test('lowercases and strips accents', () => {
      expect(tokenize('Café API')).toEqual(['cafe', 'api']);
    });

    test('removes Spanish and English stopwords', () => {
      expect(tokenize('el servidor the of a for')).toEqual(['servidor']);
    });

    test('splits on punctuation and hyphens', () => {
      expect(tokenize('add-internal-rag-mcp')).toEqual(['add', 'internal', 'rag', 'mcp']);
    });

    test('returns empty array for empty or punctuation-only input', () => {
      expect(tokenize('')).toEqual([]);
      expect(tokenize('!!! ???')).toEqual([]);
    });

    test('keeps digits attached to words', () => {
      expect(tokenize('port8080')).toEqual(['port8080']);
    });
  });

  describe('stem', () => {
    test('strips English plural s', () => {
      expect(stem('classes')).toBe('class');
    });

    test('strips Spanish plural es', () => {
      expect(stem('servidores')).toBe('servidor');
    });

    test('keeps short words intact', () => {
      expect(stem('api')).toBe('api');
      expect(stem('bus')).toBe('bus');
    });

    test('keeps words ending in ss', () => {
      expect(stem('process')).toBe('process');
    });
  });

  describe('indexTokens', () => {
    test('applies tokenization and stemming', () => {
      expect(indexTokens('los servidores API list')).toEqual(['servidor', 'api', 'list']);
    });
  });
});
