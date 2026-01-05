import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePdfProgress,
  formatOcrResult,
  isLanguageSupported,
} from "./ocr";

test("calculatePdfProgress calculations", () => {
  // Page 1 of 2, 50% done with that page
  // (0 + 0.5) / 2 = 0.25
  assert.strictEqual(calculatePdfProgress(0, 2, 0.5), 0.25);

  // Page 2 of 2, 100% done
  // (1 + 1.0) / 2 = 1.0
  assert.strictEqual(calculatePdfProgress(1, 2, 1.0), 1.0);

  // Invalid total pages
  assert.strictEqual(calculatePdfProgress(0, 0, 0.5), 0);
});

test("formatOcrResult formatting", () => {
  const pages = [
    { pageNumber: 1, text: "Hello" },
    { pageNumber: 2, text: "World" },
  ];
  const expected = "--- Page 1 ---\nHello\n\n--- Page 2 ---\nWorld";
  assert.strictEqual(formatOcrResult(pages), expected);
});

test("isLanguageSupported validation", () => {
  const supported = [{ code: "eng" }, { code: "jpn" }];
  assert.strictEqual(isLanguageSupported("eng", supported), true);
  assert.strictEqual(isLanguageSupported("fra", supported), false);
});
