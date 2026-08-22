// Tokenizer ligero para RAG: normalización + split camelCase + stopwords (es/en) + stemming trivial.

const STOPWORDS_ES_EN: ReadonlySet<string> = new Set([
  // inglés
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'has', 'have', 'i',
  'in', 'into', 'is', 'it', 'its', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was',
  'we', 'were', 'what', 'when', 'where', 'which', 'who', 'will', 'with',
  // español
  'a', 'al', 'algo', 'algunas', 'algunos', 'antes', 'aquel', 'aquella', 'aquello', 'aquí',
  'aqui', 'así', 'asi', 'auch', 'bien', 'cada', 'como', 'con', 'contra', 'cuál', 'cual',
  'cuales', 'cuando', 'cuyo', 'de', 'del', 'demás', 'demas', 'desde', 'donde', 'dos',
  'durante', 'e', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre', 'era', 'es', 'esa',
  'esas', 'ese', 'esos', 'eso', 'está', 'esta', 'están', 'estas', 'esto', 'hasta',
  'la', 'las', 'le', 'les', 'lo', 'los', 'más', 'mas', 'me', 'mi', 'mis', 'muy',
  'no', 'nos', 'nuestra', 'nuestro', 'o', 'os', 'otra', 'otras', 'otro', 'otros',
  'para', 'pero', 'poco', 'puede', 'que', 'qué', 'que', 'quien', 'se', 'ser',
  'sin', 'soy', 'su', 'sus', 'también', 'tambien', 'te', 'ti', 'tiene', 'todo',
  'tras', 'tu', 'tus', 'un', 'una', 'uno', 'unos', 'usted', 'ustedes', 'van',
  'y', 'ya', 'yo'
]);

/**
 * Normaliza texto: divide camelCase/acrónimos, baja a minúsculas, quita acentos
 * y separa por no-alfanuméricos. No quita stopwords.
 */
export function splitTokens(text: string): string[] {
  const camel = text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  const lower = camel
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return lower.split(/[^a-z0-9]+/).filter(Boolean);
}

/** Tokeniza y elimina stopwords. */
export function tokenize(text: string): string[] {
  return splitTokens(text).filter((t) => !STOPWORDS_ES_EN.has(t));
}

/** Stemming trivial (es/en): plurales -es / -s. */
export function stem(word: string): string {
  if (word.length > 4 && word.endsWith('es')) {
    return word.slice(0, -2);
  }
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
}

/** Pipeline completo para indexación/query: tokenize + stem. */
export function indexTokens(text: string): string[] {
  return tokenize(text).map(stem);
}
