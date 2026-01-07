import * as Comlink from "comlink";
import * as mupdf from "mupdf";

const mupdfWorker = {
	async rasterizePdf(pdfData: Uint8Array): Promise<Uint8Array> {
		const doc = mupdf.Document.openDocument(pdfData, "application/pdf");
		try {
			const pageCount = doc.countPages();
			if (pageCount === 0) {
				throw new Error("PDF has no pages");
			}
			const page = doc.loadPage(0);
			const pixmap = page.toPixmap(
				mupdf.Matrix.identity,
				mupdf.ColorSpace.DeviceRGB,
				false,
			);
			return pixmap.asPNG();
		} finally {
			doc.destroy();
		}
	},

	async imageToPdf(
		imageData: Uint8Array,
		mimeType: string,
	): Promise<Uint8Array> {
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
	},

	async extractPages(
		pdfData: Uint8Array,
		pageIndices: number[],
	): Promise<Uint8Array> {
		const srcDoc = mupdf.Document.openDocument(
			pdfData,
			"application/pdf",
		).asPDF();
		if (!srcDoc) throw new Error("Could not open source PDF");
		const outDoc = new mupdf.PDFDocument();
		try {
			for (const index of pageIndices) {
				outDoc.graftPage(-1, srcDoc, index);
			}
			return outDoc.saveToBuffer().asUint8Array();
		} finally {
			outDoc.destroy();
			srcDoc.destroy();
		}
	},

	async mergePdfs(pdfBuffers: Uint8Array[]): Promise<Uint8Array> {
		const outDoc = new mupdf.PDFDocument();
		try {
			for (const data of pdfBuffers) {
				const srcDoc = mupdf.Document.openDocument(
					data,
					"application/pdf",
				).asPDF();
				if (srcDoc) {
					const pageCount = srcDoc.countPages();
					for (let i = 0; i < pageCount; i++) {
						outDoc.graftPage(-1, srcDoc, i);
					}
					srcDoc.destroy();
				}
			}
			return outDoc.saveToBuffer().asUint8Array();
		} finally {
			outDoc.destroy();
		}
	},

	async resizePdf(
		pdfData: Uint8Array,
		width: number,
		height: number,
	): Promise<Uint8Array> {
		const srcDoc = mupdf.Document.openDocument(
			pdfData,
			"application/pdf",
		).asPDF();
		if (!srcDoc) throw new Error("Could not open source PDF");
		const outDoc = new mupdf.PDFDocument();
		try {
			const pageCount = srcDoc.countPages();
			for (let i = 0; i < pageCount; i++) {
				outDoc.graftPage(-1, srcDoc, i);
				const outPage = outDoc.loadPage(i);
				outPage.setPageBox("MediaBox", [0, 0, width, height]);
			}
			return outDoc.saveToBuffer().asUint8Array();
		} finally {
			outDoc.destroy();
			srcDoc.destroy();
		}
	},

	async getFonts(pdfData: Uint8Array) {
		const doc = mupdf.Document.openDocument(pdfData, "application/pdf");
		try {
			const pageCount = doc.countPages();
			interface FontEntry {
				name: string;
				isBold: boolean;
				isItalic: boolean;
				isSerif: boolean;
				isMono: boolean;
				count: number;
				pageSet: Set<number>;
			}
			const fonts = new Map<string, FontEntry>();

			for (let i = 0; i < pageCount; i++) {
				const page = doc.loadPage(i);
				const stext = page.toStructuredText();

				stext.walk({
					onChar(_c: unknown, _origin: unknown, font: mupdf.Font) {
						const name = font.getName();
						let entry = fonts.get(name);
						if (!entry) {
							entry = {
								name,
								isBold: font.isBold(),
								isItalic: font.isItalic(),
								isSerif: font.isSerif(),
								isMono: font.isMono(),
								count: 0,
								pageSet: new Set<number>(),
							};
							fonts.set(name, entry);
						}
						entry.count += 1;
						entry.pageSet.add(i + 1);
					},
				});
				stext.destroy();
			}

			return Array.from(fonts.values()).map(({ pageSet, ...rest }) => ({
				...rest,
				pages: (Array.from(pageSet) as number[]).sort((a, b) => a - b),
			}));
		} finally {
			doc.destroy();
		}
	},

	async extractText(pdfData: Uint8Array): Promise<string> {
		const doc = mupdf.Document.openDocument(pdfData, "application/pdf");
		try {
			const pageCount = doc.countPages();
			let combinedText = "";
			for (let i = 0; i < pageCount; i++) {
				const page = doc.loadPage(i);
				const stext = page.toStructuredText();
				const lines = [`--- Page ${i + 1} --\n`, stext.asText(), "\n\n"];
				combinedText += lines.join("");
				stext.destroy();
			}
			return combinedText;
		} finally {
			doc.destroy();
		}
	},

	async getPageCount(pdfData: Uint8Array): Promise<number> {
		const doc = mupdf.Document.openDocument(pdfData, "application/pdf");
		try {
			return doc.countPages();
		} finally {
			doc.destroy();
		}
	},

	async renderThumbnails(pdfData: Uint8Array, scale: number = 0.5) {
		const doc = mupdf.Document.openDocument(pdfData, "application/pdf");
		try {
			const count = doc.countPages();
			const thumbnails = [];

			for (let i = 0; i < count; i++) {
				const page = doc.loadPage(i);
				const matrix = mupdf.Matrix.scale(scale, scale);
				const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, true);

				thumbnails.push({
					index: i,
					width: pixmap.getWidth(),
					height: pixmap.getHeight(),
					pixels: pixmap.getPixels(), // Transferable
				});

				pixmap.destroy();
				page.destroy();
			}
			return thumbnails;
		} finally {
			doc.destroy();
		}
	},

	async getPageAsImage(
		pdfData: Uint8Array,
		pageIndex: number,
	): Promise<{ width: number; height: number; pixels: Uint8ClampedArray }> {
		const doc = mupdf.Document.openDocument(pdfData, "application/pdf");
		try {
			const page = doc.loadPage(pageIndex);
			const pixmap = page.toPixmap(
				mupdf.Matrix.identity,
				mupdf.ColorSpace.DeviceRGB,
				true,
			);
			const result = {
				width: pixmap.getWidth(),
				height: pixmap.getHeight(),
				pixels: pixmap.getPixels(),
			};
			pixmap.destroy();
			return result;
		} finally {
			doc.destroy();
		}
	},
};

export type MupdfWorker = typeof mupdfWorker;

Comlink.expose(mupdfWorker);
