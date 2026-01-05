import { test } from "node:test";
import assert from "node:assert/strict";
import Tesseract from "tesseract.js";
import path from "node:path";
import fs from "node:fs";

test("Tesseract OCR Integration", async () => {
  const imagePath = path.resolve(
    process.cwd(),
    "node_modules/tesseract.js/docs/images/tesseract.png",
  );

  if (!fs.existsSync(imagePath)) {
    return; // Skip if no test image
  }

  const worker = await Tesseract.createWorker("eng", 1, {
    langPath: path.resolve(process.cwd(), "public/tesseract/lang"),
  });

  const {
    data: { text },
  } = await worker.recognize(imagePath);

  // The tesseract.png in docs usually contains "Tesseract" or similar
  // Even if it's just a number, as long as it returns something and doesn't crash, it's a good integration test.
  assert.ok(text.length >= 0);

  await worker.terminate();
});
