import { ImageMagick, Magick, MagickFormat, initializeImageMagick } from "@imagemagick/magick-wasm";
import * as Comlink from "comlink";

const wasmUrl = new URL(
  "../../node_modules/@imagemagick/magick-wasm/dist/magick.wasm",
  import.meta.url,
);

export type FormatOption = {
  format: MagickFormat;
  label: string;
  extension: string;
  mimeType: string;
};

export const requestedFormats: FormatOption[] = [
  { format: MagickFormat.Png, label: "PNG", extension: "png", mimeType: "image/png" },
  { format: MagickFormat.Jpeg, label: "JPEG", extension: "jpg", mimeType: "image/jpeg" },
  { format: MagickFormat.WebP, label: "WebP", extension: "webp", mimeType: "image/webp" },
  { format: MagickFormat.Avif, label: "AVIF", extension: "avif", mimeType: "image/avif" },
  { format: MagickFormat.Heic, label: "HEIC", extension: "heic", mimeType: "image/heic" },
  { format: MagickFormat.Heif, label: "HEIF", extension: "heif", mimeType: "image/heif" },
  { format: MagickFormat.Gif, label: "GIF", extension: "gif", mimeType: "image/gif" },
  { format: MagickFormat.Bmp, label: "BMP", extension: "bmp", mimeType: "image/bmp" },
  { format: MagickFormat.Tiff, label: "TIFF", extension: "tiff", mimeType: "image/tiff" },
  { format: MagickFormat.Ico, label: "ICO", extension: "ico", mimeType: "image/x-icon" },
  { format: MagickFormat.Jp2, label: "JP2", extension: "jp2", mimeType: "image/jp2" },
  { format: MagickFormat.Jxl, label: "JXL", extension: "jxl", mimeType: "image/jxl" },
  { format: MagickFormat.Pbm, label: "PBM", extension: "pbm", mimeType: "image/x-portable-bitmap" },
  {
    format: MagickFormat.Pgm,
    label: "PGM",
    extension: "pgm",
    mimeType: "image/x-portable-graymap",
  },
  { format: MagickFormat.Ppm, label: "PPM", extension: "ppm", mimeType: "image/x-portable-pixmap" },
  { format: MagickFormat.Tga, label: "TGA", extension: "tga", mimeType: "image/x-targa" },
  { format: MagickFormat.Exr, label: "EXR", extension: "exr", mimeType: "image/x-exr" },
  { format: MagickFormat.Pdf, label: "PDF", extension: "pdf", mimeType: "application/pdf" },
];

let initializePromise: Promise<void> | null = null;

const ensureImageMagickInitialized = async () => {
  if (!initializePromise) {
    initializePromise = (async () => {
      const response = await fetch(wasmUrl);
      const wasm = await response.arrayBuffer();
      await initializeImageMagick(wasm);
    })();
  }
  return initializePromise;
};

const imagemagickWorker = {
  async getWritableFormatOptions(): Promise<FormatOption[]> {
    await ensureImageMagickInitialized();
    const writableFormats = new Set(
      Magick.supportedFormats
        .filter((format) => format.supportsWriting && format.supportsReading)
        .map((format) => format.format),
    );
    return requestedFormats.filter((candidate) => writableFormats.has(candidate.format));
  },

  async convert(data: Uint8Array, format: MagickFormat): Promise<Uint8Array> {
    await ensureImageMagickInitialized();
    return ImageMagick.read(data, (image) =>
      image.write(format, (converted) => new Uint8Array(converted)),
    );
  },

  async readMetadata(
    data: Uint8Array,
  ): Promise<{ width: number; height: number; format: MagickFormat }> {
    await ensureImageMagickInitialized();
    return ImageMagick.read(data, (image) => ({
      width: image.width,
      height: image.height,
      format: image.format,
    }));
  },
};

export type ImagemagickWorker = typeof imagemagickWorker;

Comlink.expose(imagemagickWorker);
