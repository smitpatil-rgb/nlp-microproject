"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
// @ts-ignore Educational NLP helpers are JavaScript by design.
import { analyzeText } from "../lib/nlp.mjs";

type LangCode = "en" | "hi" | "fr" | "es";
type HistoryEntry = { id:string; original:string; translated:string; sourceLanguage:LangCode; targetLanguage:LangCode; timestamp:number; };

const LANGUAGES: Record<LangCode,string> = { en:"English", hi:"Hindi", fr:"French", es:"Spanish" };
const PAIRS = new Set(["en-hi","hi-en","en-fr","fr-en","en-es","es-en","hi-fr","fr-hi","hi-es","es-hi","fr-es","es-fr"]);

function countWords(text:string) {
  if (!text.trim()) return 0;
  try { const Segmenter = (Intl as any).Segmenter; if (Segmenter) return [...new Segmenter(undefined,{granularity:"word"}).segment(text)].filter((x:any)=>x.isWordLike).length; } catch {}
  return text.trim().split(/\s+/).length;
}
function validPair(source:LangCode,target:LangCode) { return source === target || PAIRS.has(`${source}-${target}`); }
function formatTime(ts:number) { return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(ts); }

export default function Home() {
  const [sourceLanguage,setSourceLanguage] = useState<LangCode>("en");
  const [targetLanguage,setTargetLanguage] = useState<LangCode>("hi");
  const [input,setInput] = useState("");
  const [result,setResult] = useState("");
  const [loading,setLoading] = useState(false);
  const [status,setStatus] = useState<{kind:"error"|"success";message:string}|null>(null);
  const [history,setHistory] = useState<HistoryEntry[]>([]);
  const [drawer,setDrawer] = useState(false);
  const [search,setSearch] = useState("");
  const [filter,setFilter] = useState("all");
  const [swapPulse,setSwapPulse] = useState(false);
  const [copied,setCopied] = useState(false);
  const [analysisOpen,setAnalysisOpen] = useState(false);
  const requestId = useRef(0);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem("linguaflow-history") || "[]"); if (Array.isArray(saved)) setHistory(saved.slice(0,100)); } catch { setHistory([]); }
  }, []);
  useEffect(() => { try { localStorage.setItem("linguaflow-history", JSON.stringify(history.slice(0,100))); } catch {} }, [history]);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e:KeyboardEvent) => { if (e.key === "Escape") setDrawer(false); };
    window.addEventListener("keydown",onKey); drawerRef.current?.focus(); return () => window.removeEventListener("keydown",onKey);
  },[drawer]);

  const analysis = useMemo(() => analyzeText(input, sourceLanguage), [input, sourceLanguage]);
  const chars = input.length;
  const latest = history.slice(0,3);
  const filteredHistory = useMemo(() => history.filter(h => {
    const q = search.toLowerCase(); const matchesSearch = !q || `${h.original} ${h.translated}`.toLowerCase().includes(q);
    return matchesSearch && (filter === "all" || `${h.sourceLanguage}-${h.targetLanguage}` === filter);
  }),[history,search,filter]);
  const filters = Array.from(new Set(history.map(h => `${h.sourceLanguage}-${h.targetLanguage}`)));

  function resetResult() { setResult(""); setStatus(null); setCopied(false); }
  function onSourceChange(value:LangCode) {
    const nextTarget = validPair(value,targetLanguage) ? targetLanguage : (Object.keys(LANGUAGES).find(code => validPair(value,code as LangCode)) as LangCode);
    setSourceLanguage(value); setTargetLanguage(nextTarget as LangCode); resetResult();
  }
  function onTargetChange(value:LangCode) { if (validPair(sourceLanguage,value)) { setTargetLanguage(value); resetResult(); } }
  function swap() {
    setSwapPulse(true); window.setTimeout(()=>setSwapPulse(false),500);
    const hadResult = Boolean(result && input.trim());
    const oldSource = sourceLanguage; setSourceLanguage(targetLanguage); setTargetLanguage(oldSource);
    if (hadResult) { const oldInput = input; setInput(result); setResult(oldInput); } else { resetResult(); }
  }
  async function translate() {
    if (!input.trim()) { setStatus({kind:"error",message:"Enter some text to translate first."}); return; }
    if (chars > 5000) { setStatus({kind:"error",message:"This passage is over the 5,000-character limit. Shorten it before translating."}); return; }
    if (!validPair(sourceLanguage,targetLanguage)) { setStatus({kind:"error",message:"Choose a supported language direction."}); return; }
    const thisRequest = ++requestId.current; setLoading(true); setStatus(null); setCopied(false);
    try {
      const response = await fetch("/api/translate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:input,sourceLanguage,targetLanguage})});
      const data = await response.json(); if (thisRequest !== requestId.current) return;
      if (!response.ok) throw new Error(data.error || "Translation could not be completed.");
      setResult(data.translation); setStatus({kind:"success",message:"Translation complete. Review important text before use."});
      const entry:HistoryEntry = {id:crypto.randomUUID(),original:input,translated:data.translation,sourceLanguage,targetLanguage,timestamp:Date.now()};
      setHistory(prev => [entry,...prev].slice(0,100));
    } catch (error) { if (thisRequest === requestId.current) setStatus({kind:"error",message:error instanceof Error ? error.message : "Something went wrong. Try again."}); }
    finally { if (thisRequest === requestId.current) setLoading(false); }
  }
  function clearAll() { if (history.length && window.confirm("Clear all saved translations from this browser?")) setHistory([]); }
  async function copy(text:string) { try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(()=>setCopied(false),1500); } catch { setStatus({kind:"error",message:"Copy is unavailable in this browser."}); } }
  function applyHistory(item:HistoryEntry) { setSourceLanguage(item.sourceLanguage); setTargetLanguage(item.targetLanguage); setInput(item.original); setResult(item.translated); setDrawer(false); setStatus(null); }

  return <main className="app-shell">
    <div className="ambient" aria-hidden="true"><div className="blob one"/><div className="blob two"/><div className="blob three"/></div>
    <div className="container">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="LinguaFlow home"><span className="brand-mark"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h11M4 17h16" stroke="white" strokeWidth="2.2" strokeLinecap="round"/><circle cx="17.5" cy="12" r="2.2" fill="#dff8ff"/></svg></span><span className="brand-name">Lingua<span>Flow</span></span></a>
        <div className="header-actions"><span className="local-badge">Local NLP</span><button className="pill" onClick={()=>setDrawer(true)} aria-haspopup="dialog"><span aria-hidden="true">◷</span> History <span style={{opacity:.55}}>{history.length}</span></button></div>
      </header>
      <section className="hero" id="top"><span className="eyebrow">Neural translation, thoughtfully presented</span><h1>Translate naturally across languages.</h1><p>English, Hindi, French, and Spanish in every direction.</p></section>
      <section className="translator-card" aria-label="Translator">
        <div className="lang-bar">
          <div><label className="field-label" htmlFor="source-language">From</label><div className="select-wrap"><select id="source-language" value={sourceLanguage} onChange={e=>onSourceChange(e.target.value as LangCode)}>{Object.entries(LANGUAGES).map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></div></div>
          <button className={`swap-button ${swapPulse ? "spin" : ""}`} onClick={swap} aria-label="Swap languages" title="Swap languages"><svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M7 7h12l-3-3M17 17H5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 7l-3 3M5 17l3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>
          <div><label className="field-label" htmlFor="target-language">To</label><div className="select-wrap"><select id="target-language" value={targetLanguage} onChange={e=>onTargetChange(e.target.value as LangCode)}>{Object.entries(LANGUAGES).map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></div></div>
        </div>
        <div className="panels">
          <div className="panel"><div className="panel-head"><strong>Your text</strong><span>{LANGUAGES[sourceLanguage]}</span></div><textarea value={input} maxLength={5000} onChange={e=>{setInput(e.target.value);resetResult();}} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter") translate();}} placeholder={sourceLanguage === "en" ? "Type or paste a passage…" : `Écrivez en ${LANGUAGES[sourceLanguage]}…`} aria-label="Text to translate"/><div className="panel-foot"><span>{countWords(input)} words</span><span className={chars > 5000 ? "status error" : ""}>{chars.toLocaleString()} / 5,000</span></div></div>
          <div className="panel result"><div className="panel-head"><strong>Translation</strong><span>{LANGUAGES[targetLanguage]}</span></div>{result ? <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} className="result-text">{result}</motion.div> : <div className="result-empty"><div className="orb">✦</div><div>Your complete translation<br/>will appear here.</div></div>}<div className="panel-foot"><span>{result ? `${countWords(result)} words` : "Ready when you are"}</span>{result && <button className="text-link" onClick={()=>copy(result)} aria-live="polite">{copied ? "Copied!" : "Copy"}</button>}</div></div>
        </div>
        <div className="actions"><div className="action-group"><button className="primary" onClick={translate} disabled={loading || !input.trim() || chars > 5000}>{loading ? <><span className="loading-dots"><i/><i/><i/></span>Translating…</> : "Translate"}</button><button className="secondary" onClick={()=>{setInput("");resetResult();}} disabled={!input && !result}>Clear</button></div></div>
        {status && <div className={`status ${status.kind}`} role={status.kind === "error" ? "alert" : "status"}>{status.message}</div>}
        <p className="notice">ⓘ Translations may need review for important use.</p>
      </section>

      <section className="section-card nlp-lab" aria-labelledby="nlp-title">
        <div className="section-title"><div><h2 id="nlp-title">NLP Concepts Used</h2><p className="section-kicker">Educational analysis runs locally and never changes the text sent for translation.</p></div><button className="secondary" onClick={()=>setAnalysisOpen(v=>!v)} aria-expanded={analysisOpen}>{analysisOpen ? "Hide analysis" : "Analyze input"}</button></div>
        <div className="concept-pills"><span>Tokenization</span><span>Normalization</span><span>Semantic translation</span><span>Seq2Seq + attention</span><span>Human review</span></div>
        {analysisOpen && <div className="analysis-grid">
          <div><span className="analysis-label">Sentences</span><strong>{analysis.sentences.length}</strong><small>{analysis.sentences.slice(0,3).join(" · ") || "No sentence yet"}</small></div>
          <div><span className="analysis-label">Word tokens</span><strong>{analysis.words.length}</strong><small>{analysis.words.slice(0,18).join(" · ") || "No tokens yet"}</small></div>
          <div><span className="analysis-label">Stopwords</span><strong>{analysis.stopwords.length}</strong><small>{analysis.stopwords.join(" · ") || "None detected"}</small></div>
          <div><span className="analysis-label">Bigrams</span><strong>{analysis.bigrams.length}</strong><small>{analysis.bigrams.slice(0,6).join(" · ") || "No bigrams yet"}</small></div>
          <div><span className="analysis-label">Entities / markers</span><strong>{analysis.entities.length}</strong><small>{analysis.entities.map((entity:any)=>`${entity.type}: ${entity.value}`).join(" · ") || "None detected"}</small></div>
          <div><span className="analysis-label">Bag of Words</span><strong>{Object.keys(analysis.bagOfWords).length}</strong><small>{Object.entries(analysis.bagOfWords).slice(0,8).map(([word,count])=>`${word} ×${count}`).join(" · ") || "No features yet"}</small></div>
        </div>}
        <details><summary>How this maps to the syllabus</summary><p className="notice">LinguaFlow implements validation, Unicode normalization, word and sentence tokenization, n-gram and Bag-of-Words demonstrations, and a real pretrained neural translation call. The installed Argos models supply neural translation and model-specific tokenization; the app does not implement every tokenizer in the syllabus. POS, NER, parsing, topic modeling, retrieval, dialogue systems, and statistical language models are documented as educational or out of scope; the app does not pretend to train them.</p></details>
      </section>
      <div className="below">
        <section className="section-card"><div className="section-title"><h2>Latest translations</h2><button className="text-link" onClick={()=>setDrawer(true)}>View all history</button></div>{latest.length ? <div className="history-list">{latest.map(item=><button className="history-item" key={item.id} onClick={()=>applyHistory(item)} style={{textAlign:"left"}}><div className="history-meta"><span className="history-pair">{LANGUAGES[item.sourceLanguage]} → {LANGUAGES[item.targetLanguage]}</span><span>{formatTime(item.timestamp)}</span></div><div className="history-text">{item.original}</div><div className="history-text" style={{color:"#68718b"}}>{item.translated}</div></button>)}</div> : <div className="empty">Your successful translations will be saved on this device.</div>}</section>
        <section className="section-card"><div className="section-title"><h2>How it works</h2></div><div className="how">{[["1","Choose languages","Pick the language you are translating from and the language you want."],["2","Enter your text","Type or paste the words or sentences you want to translate."],["3","Press Translate","LinguaFlow translates the complete text using a language model on your computer."],["4","Check and use it","Read the result, copy it, or find it later in your history."]].map(([n,title,body])=><div className="how-step" key={n}><div className="step-num">{n}</div><p><strong>{title}</strong>{body}</p></div>)}</div></section>
      </div>
      <p className="footer-note">History is saved in this browser. Text is sent to your local LibreTranslate service when you translate.</p>
    </div>
    <AnimatePresence>{drawer && <><motion.div className="drawer-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setDrawer(false)} /><motion.aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="history-title" tabIndex={-1} ref={drawerRef} initial={{x:30,opacity:.7}} animate={{x:0,opacity:1}} exit={{x:30,opacity:.7}}><div className="drawer-head"><h2 id="history-title">Translation history</h2><button className="icon-button" onClick={()=>setDrawer(false)} aria-label="Close history">×</button></div><div className="history-tools"><input className="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your history…" aria-label="Search history"/><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter history"><option value="all">All language pairs</option>{filters.map(f=><option value={f} key={f}>{LANGUAGES[f.split("-")[0] as LangCode]} → {LANGUAGES[f.split("-")[1] as LangCode]}</option>)}</select><button className="secondary" onClick={clearAll} disabled={!history.length}>Clear all</button></div><div className="history-scroll">{filteredHistory.length ? filteredHistory.map(item=><div className="drawer-item" key={item.id}><div className="history-meta"><span className="history-pair">{LANGUAGES[item.sourceLanguage]} → {LANGUAGES[item.targetLanguage]}</span><span>{formatTime(item.timestamp)}</span></div><div className="history-text" style={{whiteSpace:"normal"}}>{item.original}</div><div className="history-text" style={{whiteSpace:"normal",color:"#68718b"}}>{item.translated}</div><div className="item-actions"><button className="tiny-button" onClick={()=>copy(item.translated)}>{copied ? "Copied!" : "Copy"}</button><button className="tiny-button" onClick={()=>setHistory(prev=>prev.filter(h=>h.id!==item.id))}>Delete</button><button className="tiny-button" onClick={()=>applyHistory(item)}>Use</button></div></div>) : <div className="empty">{history.length ? "No history matches those filters." : "No saved translations yet."}</div>}</div><p className="notice" style={{marginTop:"auto"}}>Older entries are removed once the 100-entry limit is reached.</p></motion.aside></>}</AnimatePresence>
  </main>;
}


