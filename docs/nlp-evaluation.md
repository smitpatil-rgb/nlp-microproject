# NLP evaluation

## Functional fixtures

Use the 10 multilingual reference sentence sets supplied with the project brief to exercise all six supported directions:

- English → Hindi
- Hindi → English
- English → French
- French → English
- English → Spanish
- Spanish → English

Functional tests should use mocked LibreTranslate responses only in the test suite. The application itself must always call the configured local service and must never use hardcoded translations.

## Checks

Verify empty input, the 5,000-character limit, unsupported pairs, paragraphs, lists, punctuation, names, numbers, dates, URLs, email addresses, placeholders, local-service timeouts, missing models, empty responses, stale responses, swapping, real-history saving, copy, clear, search, filtering, and deletion.

## Translation quality

BLEU can compare candidate strings with reference translations in a controlled fixture, but it is not a proof of semantic correctness. Precision, recall, F1, and confusion matrices apply to labeled classification or sequence tasks and should not be invented for a translation result without a defined evaluation design. Human review remains necessary for tone, idioms, names, negation, tense, naturalness, and localized formatting.

Passing software tests proves request and interface behavior. It does not prove that Argos preserves every meaning or translates every rare word correctly.
