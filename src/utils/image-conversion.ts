import { MagickFormat } from "@imagemagick/magick-wasm";
import { type FormatOption, requestedFormats } from "./image-magick-core";

export type { FormatOption };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

const getWorker = () => {
  if (!worker) {
    worker = new Worker(new URL("./image-magick-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e) => {
      const { type, id, data, message } = e.data;
      const promise = pending.get(id);
      if (!promise) return;
      pending.delete(id);

      if (type === "RESULT") {
        promise.resolve(data);
      } else {
        promise.reject(new Error(message || "Worker error"));
      }
    };
    worker.onerror = (e) => {
      console.error("Worker error", e);
    };
  }
  return worker;
};

const callWorker = <T>(type: string, data?: any, transfer?: Transferable[]): Promise<T> => {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ type, id, data }, transfer || []);
  });
};

export const getWritableFormatOptions = async (): Promise<FormatOption[]> => {
  const supportedFormats = await callWorker<MagickFormat[]>("GET_WRITABLE_FORMATS");
  const writableFormats = new Set(supportedFormats);
  return requestedFormats.filter((candidate) => writableFormats.has(candidate.format));
};

export const convertImageFormat = async (
  data: ArrayBuffer | Uint8Array,
  format: MagickFormat,
): Promise<Uint8Array> => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return callWorker<Uint8Array>("CONVERT", { bytes, format });
};

export const readImageMetadata = async (
  data: ArrayBuffer | Uint8Array,
): Promise<{ width: number; height: number; format: MagickFormat }> => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return callWorker<{ width: number; height: number; format: MagickFormat }>("READ_METADATA", {
    bytes,
  });
};

export const findFormatByValue = (value: MagickFormat) =>
  requestedFormats.find((format) => format.format === value);

