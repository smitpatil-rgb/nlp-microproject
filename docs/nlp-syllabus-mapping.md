# NLP syllabus mapping

LinguaFlow is a machine-translation application with an educational analysis panel. The table distinguishes application code from techniques supplied by the pretrained Argos model or explained for study.

| Syllabus area | Status | Evidence or boundary |
|---|---|---|
| NLP tasks, applications, pipeline, NLU challenges | Implemented / explained | Translation workflow, validation, context, ambiguity, idioms, negation, and human-review notes. |
| Word and sentence tokenization | Implemented | `Intl.Segmenter`-based analysis panel. |
| Unicode normalization | Implemented | NFC normalization is shown without changing translation input. |
| Stopword removal, lowercasing, stemming, lemmatization, spelling correction | Educational | Demonstrated or explained only; never applied destructively to translation input. |
| BPE, WordPiece, SentencePiece | Provider/internal + explained | Tokenizer internals belong to the installed pretrained model. |
| Bag of Words, TF-IDF, hashing, n-grams | Educational | N-grams and Bag-of-Words are computed for the current input; TF-IDF and hashing are explained. |
| Word2Vec, GloVe, FastText | Explained | No custom embedding model is trained. |
| Morphology, lexicon, syntax, semantics | Explained | Used to explain why context matters; no parser changes the translation. |
| Unigram/bigram/trigram models, smoothing, perplexity | Explained / out of scope | Not used as the translation engine. |
| NER | Educational | Protected-marker detection is heuristic and is not a trained NER model. |
| LDA, NMF, topic coherence | Out of scope | Not needed for translation. |
| Vector-space retrieval, cosine similarity, ranked retrieval | Out of scope | Not needed for translation. |
| POS, HMM, CRF, BiLSTM, Penn Treebank | Explained | Not used to alter the provider request. |
| Constituency/dependency parsing, CKY, shift-reduce | Explained | Not implemented in the product path. |
| Text classification, sentiment, summarization | Out of scope | Separate NLP tasks. |
| Machine translation | Implemented | Server route calls local LibreTranslate/Argos. |
| Seq2Seq, attention, encoder-decoder, RNN/LSTM/GRU | Provider/internal + explained | Argos supplies the pretrained translation model. |
| Precision, recall, F1, BLEU, confusion matrices | Evaluation documentation | Metrics belong to controlled evaluation fixtures, not live confidence claims. |
| Intent, context, slots, entity linking, dialogue systems | Out of scope | LinguaFlow is a translator, not a conversational agent. |
| Integrated pipeline and error analysis | Implemented / documented | Validation → analysis → local translation → response checks → local history. |

LinguaFlow does not claim to train an NLP model. It provides the interface, safe request handling, educational analysis, response checks, and local history around a pretrained local translator.
