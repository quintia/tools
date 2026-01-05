import { getSupportedFormats, convertFormat, readMetadata } from "./image-magick-core";

self.onmessage = async (e) => {
  const { type, id, data } = e.data;

  try {
    if (type === "GET_WRITABLE_FORMATS") {
      const writableFormats = await getSupportedFormats();
      self.postMessage({ type: "RESULT", id, data: writableFormats });
    } else if (type === "CONVERT") {
      const { bytes, format } = data;
      const result = await convertFormat(bytes, format);
      self.postMessage({ type: "RESULT", id, data: result }, [result.buffer] as any);
    } else if (type === "READ_METADATA") {
      const { bytes } = data;
      const result = await readMetadata(bytes);
      self.postMessage({ type: "RESULT", id, data: result });
    }
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      id,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
