import * as mupdf from "mupdf";

/**
 * Rasterizes the first page of a PDF into a PNG image.
 */
export const rasterizePdf = async (pdfData: Uint8Array): Promise<Uint8Array> => {
  const doc = mupdf.Document.openDocument(pdfData, "application/pdf");
  try {
    const pageCount = doc.countPages();
    if (pageCount === 0) {
      throw new Error("PDF has no pages");
    }
    const page = doc.loadPage(0);
    const pixmap = page.toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, false);
    const png = pixmap.asPNG();
    return png;
  } finally {
    doc.destroy();
  }
};

/**
 * Creates a PDF document containing the given image.
 * MuPDF can often open image files directly and convert them to PDF.
 */
export const imageToPdf = async (imageData: Uint8Array, mimeType: string): Promise<Uint8Array> => {
  // MuPDF can open various image formats (PNG, JPEG, TIFF, etc.)
  const doc = mupdf.Document.openDocument(imageData, mimeType);
  try {
    const pdfDoc = doc.asPDF();
    if (!pdfDoc) {
      throw new Error("Failed to convert image to PDF document structure");
    }
    return pdfDoc.saveToBuffer().asUint8Array();
  } finally {
    doc.destroy();
  }
};
