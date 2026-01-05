import Tesseract from "tesseract.js";
import * as Comlink from "comlink";

const tesseractWorker = {
  async recognize(
    image: Tesseract.ImageLike,
    language: string,
    onProgress?: (m: Tesseract.LoggerMessage) => void
  ): Promise<string> {
    const worker = await Tesseract.createWorker(language, 1, {
      workerPath: new URL("/tesseract/worker.min.js", self.location.origin).href,
      corePath: new URL("/tesseract/", self.location.origin).href,
      langPath: new URL("/tesseract/lang/", self.location.origin).href,
      workerBlobURL: false,
      logger: onProgress ? Comlink.proxy(onProgress) : undefined,
    });

    try {
      const {
        data: { text },
      } = await worker.recognize(image);
      return text;
    } finally {
      await worker.terminate();
    }
  },
};

export type TesseractWorker = typeof tesseractWorker;

Comlink.expose(tesseractWorker);
