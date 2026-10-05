# LinguaFlow

LinguaFlow is a local NLP translation workspace. It uses a self-hosted LibreTranslate service backed by Argos Translate instead of a paid cloud translation API.

## Run locally for free

1. Install Node.js 18.18+.
2. Install LibreTranslate/Argos Translate and the six required language models (English↔Hindi, English↔French, English↔Spanish) using the current upstream instructions.
3. Start the local LibreTranslate server on port 5000.
4. Copy `.env.example` to `.env.local`:

```env
LIBRETRANSLATE_URL=http://localhost:5000
LIBRETRANSLATE_API_KEY=
```

5. Install dependencies with `npm install`.
6. Start LinguaFlow with `npm run dev` and open `http://localhost:3000`.

The browser talks only to LinguaFlow's `/api/translate` route. The route talks to the local service, so text stays on the machine when LibreTranslate runs on localhost. No Google API key, per-request translation fee, or cloud account is required. You still need disk space, CPU/RAM, and a running local service. A publicly hosted site needs a machine or server running LibreTranslate and may have hosting costs.

If the local service is unavailable, LinguaFlow shows an error and does not fabricate output. There is no Demo mode and no hardcoded translation fallback.

## Supported behavior

Only these directions are accepted:

- English ↔ Hindi
- English ↔ French
- English ↔ Spanish

Input is limited to 5,000 characters. Complete passages are sent as plain text so paragraphs, lists, punctuation, names, numbers, dates, URLs, email addresses, and placeholders can remain understandable. Unusual words, slang, technical terms, and idioms may need human review.

Successful real translations are saved locally in the browser, newest first, with a maximum of 100 entries. History supports search, pair filters, copy, delete, and clear-all confirmation. History is never sent to LibreTranslate.

## NLP syllabus alignment

The UI includes an NLP analysis panel for Unicode normalization, word and sentence tokenization, stopword examples, stemming demonstrations, n-grams, Bag-of-Words features, and protected-marker detection. These are educational analyses and never alter the text sent to the translator.

Argos supplies the pretrained neural translation model. Its internals may use subword tokenization, embeddings, sequence-to-sequence processing, attention, and encoder-decoder architectures. LinguaFlow does not train Word2Vec, GloVe, FastText, NMT, HMM, CRF, POS, NER, parser, topic-model, retrieval, or dialogue models. See [`docs/nlp-syllabus-mapping.md`](docs/nlp-syllabus-mapping.md) for the full implemented/educational/out-of-scope mapping.

## Tests and evaluation

Run:

```bash
npm run build
npm test
```

The automated tests cover language-pair rules, multilingual tokenization, normalization, n-grams, Bag-of-Words features, protected markers, and input-limit contracts. Live translation uses the configured local Argos runtime; LibreTranslate can be used as a local HTTP fallback. Translation-quality evaluation is documented in [`docs/nlp-evaluation.md`](docs/nlp-evaluation.md); software tests cannot prove perfect semantic accuracy.

## Windows local startup (configured workspace)

The local runtime is installed under `work/libretranslate-venv`; language models and caches stay under `work/argos-*`. These large machine-local files are ignored by Git and excluded from the source archive.

Start the translator in one PowerShell terminal from the project folder:

```powershell
./scripts/start-translator.ps1
```

Leave it running. In another terminal start the website:

```powershell
npm run dev -- -p 3003
```

Open http://localhost:3003. The service at port 5000 is API-only; use the website on port 3003. `.env.local` must contain `LIBRETRANSLATE_URL=http://127.0.0.1:5000`. Restart the website after changing configuration. The first translator startup downloads models and needs internet access; later inference uses installed local models.

For a fresh Windows checkout, install the runtime first:

```powershell
python -m venv work/libretranslate-venv
./work/libretranslate-venv/Scripts/python.exe -m pip install libretranslate==1.9.6
Copy-Item .env.example .env.local
./scripts/start-translator.ps1
```
