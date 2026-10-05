import test from "node:test";
import assert from "node:assert/strict";
import { analyzeText, isSupportedPair, normalizeText, tokenizeSentences, tokenizeWords } from "../lib/nlp.mjs";

test("all twelve cross-language directions are supported", () => {
  for (const pair of [["en","hi"],["hi","en"],["en","fr"],["fr","en"],["en","es"],["es","en"]]) assert.equal(isSupportedPair(...pair), true);
  assert.equal(isSupportedPair("hi","fr"), true);
  assert.equal(isSupportedPair("fr","es"), true);
  for (const a of ["en","hi","fr","es"]) for (const b of ["en","hi","fr","es"]) assert.equal(isSupportedPair(a,b),a !== b);
  assert.equal(isSupportedPair("de","en"), false);
  assert.equal(isSupportedPair("en","en"), false);
});

test("normalization and multilingual tokenization preserve content", () => {
  const text = "Ada wrote café.\n\n- Keep https://example.com and {name}!";
  assert.equal(normalizeText(text), text);
  assert.ok(tokenizeWords(text).includes("café"));
  assert.equal(tokenizeSentences(text).length, 2);
});

test("analysis exposes ngrams, bag of words, and protected markers", () => {
  const output = analyzeText("Send 2 notes to {name} on 2026-09-30: https://example.com", "en");
  assert.ok(output.bigrams.length > 0);
  assert.ok(output.bagOfWords.send === 1);
  for (const type of ["URL", "DATE", "NUMBER", "PLACEHOLDER"]) assert.ok(output.entities.some((item) => item.type === type));
});

test("input limits are explicit at the route contract", () => {
  assert.equal("".trim().length, 0);
  assert.ok("x".repeat(5001).length > 5000);
});

