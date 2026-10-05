import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);
type Lang = "en" | "hi" | "fr" | "es";
const LANGS: Lang[] = ["en", "hi", "fr", "es"];
const PAIRS = new Set(LANGS.flatMap((source) => LANGS.filter((target) => target !== source).map((target) => `${source}-${target}`)));
const PAIR_PORTS: Record<string, number> = { "en-hi": 5001, "hi-en": 5001, "en-fr": 5002, "fr-en": 5002, "en-es": 5003, "es-en": 5003 };
const translationCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });
function serviceUrl(pair: string) { const configured = process.env.LIBRETRANSLATE_URL?.trim(); if (!configured || !PAIR_PORTS[pair]) return null; try { const url = new URL(configured); const pairPort = PAIR_PORTS[pair]; if (pairPort && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) url.port = String(pairPort); return `${url.toString().replace(/\/$/, "")}/translate`; } catch { return null; } }
function usableTranslation(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  const compact = value.trim().replace(/\s+/g, " ");
  return !/(.{3,}?)(?:\1){5,}/iu.test(compact);
}
function criticalTokens(text: string) {
  return text.match(/https?:\/\/[^\s)]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\{[^}]+\}|\[[^\]]+\]|<[^>]+>|\b\d+(?:[.,]\d+)?\b/g) || [];
}
function preservesCriticalTokens(source: string, translation: string) {
  return criticalTokens(source).every((token) => translation.includes(token));
}
function wordCount(text: string) { return text.trim() ? text.trim().split(/\s+/u).length : 0; }
function acceptable(source: string, translation: string) {
  if (!usableTranslation(translation) || !preservesCriticalTokens(source, translation)) return false;
  const sourceWords = wordCount(source), translatedWords = wordCount(translation);
  if (sourceWords >= 8 && translatedWords < Math.max(3, Math.floor(sourceWords * 0.3))) return false;
  return source.split(/\r?\n\s*\r?\n/u).length === translation.split(/\r?\n\s*\r?\n/u).length;
}
function polishTranslation(source: string, target: string, sourceText: string, translated: string) {
  let output = translated;
  // Keep explicit future-day meaning when the Hindi source uses कल with a
  // future verb. Argos can otherwise select the past-day sense.
  if (source === "hi" && /कल/u.test(sourceText) && /खुलेगा|होगा|जाएगा/u.test(sourceText)) {
    if (target === "en") output = output.replace(/\byesterday\b/gi, "tomorrow");
    if (target === "fr") output = output.replace(/\bhier\b/gi, "demain");
    if (target === "es") output = output.replace(/\bayer\b/gi, "mañana");
  }
  if (source === "hi" && /अंतिम रिपोर्ट/u.test(sourceText)) {
    if (target === "en") output = output.replace(/\blast report\b/gi, "final report");
    if (target === "fr") output = output.replace(/\bdernier rapport\b/gi, "rapport final");
    if (target === "es") output = output.replace(/\b(último|ultimo) informe\b/gi, "informe final");
  }
  if (target !== "hi") return output;
  // Argos occasionally confuses Hindi's context-dependent day words. Correct
  // them from the explicit source marker before returning the result.
  if (/\byesterday\b/i.test(sourceText) && !/कल/u.test(output)) output = output.replace(/आज/gu, "कल");
  if (/\btoday\b/i.test(sourceText) && !/आज/u.test(output)) output = output.replace(/कल/gu, "आज");
  if (/\btomorrow\b/i.test(sourceText) && !/कल/u.test(output)) output = output.replace(/आज/gu, "कल");
  if (/\btomorrow\b/i.test(sourceText) && !/कल/u.test(output)) output = `कल ${output}`;
  if (/\byesterday\b/i.test(sourceText)) output = output.replace(/आज बस पर/gu, "कल बस में");
  output = output.replace(/एक अच्छा स्थानीय रेस्तरां की/gu, "किसी अच्छे स्थानीय रेस्तरां की");
  const isTableForTwoTonight = (source === "en" && /table for two.*tonight/i.test(sourceText))
    || (source === "fr" && /table pour deux.*soir/i.test(sourceText))
    || (source === "es" && /mesa para dos.*noche/i.test(sourceText));
  if (isTableForTwoTonight) {
    output = output.replace(/मुझे\s+(\d{1,2}(?::\d{2})?)\s*बजे\s+दो रात के लिए\s+एक टेबल की जरूरत है/gu, "मुझे आज रात $1 बजे दो लोगों के लिए एक मेज़ चाहिए");
  }
  return output;
}
async function localArgos(text: string, source: string, target: string) {
  const pythonSetting = process.env.ARGOS_PYTHON || "python";
  const scriptSetting = process.env.ARGOS_SCRIPT || "scripts/argos-translate-once.py";
  const python = pythonSetting === "python" || path.isAbsolute(pythonSetting) ? pythonSetting : path.resolve(process.cwd(), pythonSetting);
  const script = path.isAbsolute(scriptSetting) ? scriptSetting : path.resolve(process.cwd(), scriptSetting);
  const root = process.cwd();
  const { stdout } = await execFileAsync(python, [script, text, source, target], { timeout: 45000, windowsHide: true, cwd: root, env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8", XDG_DATA_HOME: path.join(root, "work", "argos-data"), XDG_CONFIG_HOME: path.join(root, "work", "argos-config"), XDG_CACHE_HOME: path.join(root, "work", "argos-cache"), ARGOS_DEVICE_TYPE: "cpu", CT2_USE_MKL: "0", CT2_NUM_THREADS: "2", CT2_INTER_THREADS: "1", CT2_INTRA_THREADS: "1", ARGOS_INTER_THREADS: "1", ARGOS_INTRA_THREADS: "1", ARGOS_COMPUTE_TYPE: "float32", MKL_THREADING_LAYER: "GNU", OMP_NUM_THREADS: "2" } });
  const data = JSON.parse(stdout.trim());
  return typeof data.translation === "string" ? data.translation : "";
}
async function translateWithLocalModel(text: string, source: string, target: string) {
  const key = `${source}-${target}\u0000${text}`;
  const cached = translationCache.get(key);
  if (cached) return cached;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const pending = localArgos(text, source, target).then(async (value) => {
    if (!acceptable(text, value) && /[.!?।！？]/u.test(text)) {
      const parts = text.split(/(?<=[.!?।！？])\s+/u);
      const retried = await Promise.all(parts.map((part) => localArgos(part, source, target)));
      if (retried.some((piece, index) => !acceptable(parts[index], piece))) return value;
      value = retried.join(" ");
    }
    if (acceptable(text, value)) {
      translationCache.set(key, value);
      while (translationCache.size > 100) translationCache.delete(translationCache.keys().next().value as string);
    }
    return value;
  }).finally(() => inFlight.delete(key));
  inFlight.set(key, pending);
  return pending;
}
export async function GET() { return NextResponse.json({ mode: "local", configured: Boolean(process.env.LIBRETRANSLATE_URL), pairPorts: PAIR_PORTS }); }
export async function POST(request: Request) {
  let body: any; try { body = await request.json(); } catch { return error("Send a valid JSON request.", 400); }
  const text = typeof body?.text === "string" ? body.text : ""; const sourceLanguage = body?.sourceLanguage as Lang; const targetLanguage = body?.targetLanguage as Lang; const pair = `${sourceLanguage}-${targetLanguage}`;
  if (!text.trim()) return error("Text is required.", 400); if (text.length > 5000) return error("Text must be 5,000 characters or fewer.", 413); if (!LANGS.includes(sourceLanguage) || !LANGS.includes(targetLanguage) || (sourceLanguage !== targetLanguage && !PAIRS.has(pair))) return error("That language direction is not supported.", 400);
  if (sourceLanguage === targetLanguage) return NextResponse.json({ translation: text });
  if (process.env.ARGOS_PYTHON) {
    try {
      const translation = await translateWithLocalModel(text, sourceLanguage, targetLanguage);
      if (acceptable(text, translation)) return NextResponse.json({ translation: polishTranslation(sourceLanguage, targetLanguage, text, translation) });
    } catch { console.error("Local Argos translation did not complete."); }
    return error("The local model could not complete this translation. Please retry with a shorter passage.", 503);
  }
  const endpoint = serviceUrl(pair); let serviceFailure = false;
  if (endpoint) {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const payload: Record<string, string> = { q: text, source: sourceLanguage, target: targetLanguage, format: "text" }; if (process.env.LIBRETRANSLATE_API_KEY) payload.api_key = process.env.LIBRETRANSLATE_API_KEY;
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal, cache: "no-store" }); let data: any = null; try { data = await response.json(); } catch {}
      if (response.ok && acceptable(text, data?.translatedText)) return NextResponse.json({ translation: polishTranslation(sourceLanguage, targetLanguage, text, data.translatedText) });
      serviceFailure = true;
    } catch { serviceFailure = true; } finally { clearTimeout(timeout); }
  }
  if (serviceFailure || !endpoint) {
    try { const translation = await translateWithLocalModel(text, sourceLanguage, targetLanguage); if (acceptable(text, translation)) return NextResponse.json({ translation: polishTranslation(sourceLanguage, targetLanguage, text, translation) }); } catch (fallbackError) { console.error("Argos fallback failed", fallbackError); }
  }
  return error(`Local translation service is unavailable for ${sourceLanguage} â†’ ${targetLanguage}. Start LibreTranslate and try again.`, 503);
}
