const STOPWORDS = {
  en: new Set(["a","an","the","and","or","but","if","to","of","in","on","for","is","are","was","were","with"]),
  fr: new Set(["le","la","les","un","une","des","et","ou","mais","de","du","dans","pour","est","sont","avec"]),
  es: new Set(["el","la","los","las","un","una","y","o","pero","de","del","en","para","es","son","con"]),
  hi: new Set(["और","या","के","की","का","एक","में","से","पर","है","हैं","को","के लिए"]),
};
export const SUPPORTED_PAIRS = new Set(["en", "hi", "fr", "es"].flatMap(source => ["en", "hi", "fr", "es"].filter(target => target !== source).map(target => `${source}-${target}`)));
export const isSupportedPair = (source, target) => source !== target && SUPPORTED_PAIRS.has(`${source}-${target}`);
export function normalizeText(text) { return text.normalize("NFC"); }
export function tokenizeWords(text) {
  try { const Segmenter = Intl.Segmenter; if (Segmenter) return [...new Segmenter(undefined, { granularity: "word" }).segment(text)].filter((part) => part.isWordLike).map((part) => part.segment); } catch {}
  return text.trim() ? text.trim().split(/\s+/) : [];
}
export function tokenizeSentences(text) {
  try { const Segmenter = Intl.Segmenter; if (Segmenter) return [...new Segmenter(undefined, { granularity: "sentence" }).segment(text)].map((part) => part.segment.trim()).filter(Boolean); } catch {}
  return text.split(/(?<=[.!?।！？])\s+/u).map((part) => part.trim()).filter(Boolean);
}
export function ngrams(tokens, size = 2) { const output = []; for (let index = 0; index <= tokens.length - size; index += 1) output.push(tokens.slice(index, index + size).join(" ")); return output; }
export function bagOfWords(tokens) { return tokens.reduce((counts, token) => { const key = token.toLocaleLowerCase(); counts[key] = (counts[key] || 0) + 1; return counts; }, {}); }
export function stem(token) { const lower = token.toLocaleLowerCase(); return lower.replace(/(ing|ed|es|s)$/i, "").replace(/(ing|ées|er|ez)$/i, "") || lower; }
export function detectEntities(text) {
  const patterns = [["URL", /https?:\/\/[^\s]+/g], ["EMAIL", /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g], ["DATE", /\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g], ["NUMBER", /\b\d+(?:[.,]\d+)?\b/g], ["PLACEHOLDER", /\{[^}]+\}|\[[^\]]+\]|<[^>]+>/g]];
  return patterns.flatMap(([type, pattern]) => [...text.matchAll(pattern)].map((match) => ({ type, value: match[0] })));
}
export function analyzeText(text, language = "en") {
  const normalized = normalizeText(text); const words = tokenizeWords(normalized); const sentences = tokenizeSentences(normalized); const stopwords = STOPWORDS[language] || STOPWORDS.en; const lowercase = words.map((word) => word.toLocaleLowerCase()); const filtered = lowercase.filter((word) => !stopwords.has(word));
  return { normalized, words, sentences, stopwords: lowercase.filter((word) => stopwords.has(word)), stems: filtered.slice(0, 24).map(stem), bigrams: ngrams(filtered, 2).slice(0, 12), bagOfWords: bagOfWords(filtered), entities: detectEntities(text) };
}
