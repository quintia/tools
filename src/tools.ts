import type { Component } from "vue";

export interface Tool {
	path: string;
	name: string;
	icon: string;
	description: string;
	component: () => Promise<{ default: Component }>;
	category:
		| "Text & Coding"
		| "Math & LaTeX"
		| "Graphics & Images"
		| "PDF Tools"
		| "Utilities";
}

export const tools: Tool[] = [
	// Text & Coding
	{
		path: "/replace",
		name: "Replace",
		icon: "🔁",
		description: "Batch replace text with advanced options.",
		component: () => import("./views/replace.vue"),
		category: "Text & Coding",
	},
	{
		path: "/prettier",
		name: "Prettier Formatter",
		icon: "🎨",
		description: "Format JSON, YAML, and code snippets instantly.",
		component: () => import("./views/prettier-format.vue"),
		category: "Text & Coding",
	},
	{
		path: "/diff",
		name: "Diff",
		icon: "🔍",
		description: "Compare two texts side by side and highlight changes.",
		component: () => import("./views/diff.vue"),
		category: "Text & Coding",
	},
	{
		path: "/regex-finder",
		name: "Regex Finder",
		icon: "🧭",
		description: "Search content using powerful regular expressions.",
		component: () => import("./views/regex-finder.vue"),
		category: "Text & Coding",
	},
	{
		path: "/regex-cheat-sheet",
		name: "Regex Cheat Sheet",
		icon: "📚",
		description: "Quickly reference regex tokens and examples.",
		component: () => import("./views/regex-cheat-sheet.vue"),
		category: "Text & Coding",
	},
	{
		path: "/context-free-grammar",
		name: "Context-Free Grammar",
		icon: "📚",
		description: "Generate context-free grammar from text.",
		component: () => import("./views/context-free-grammar.vue"),
		category: "Text & Coding",
	},
	{
		path: "/word-count",
		name: "Word Count",
		icon: "📝",
		description: "Count words, characters, and reading time.",
		component: () => import("./views/word-count.vue"),
		category: "Text & Coding",
	},
	{
		path: "/fold-strings",
		name: "Fold Strings",
		icon: "📂",
		description: "Wrap long strings or code at your preferred width.",
		component: () => import("./views/fold-strings.vue"),
		category: "Text & Coding",
	},
	{
		path: "/code-highlight",
		name: "Code Highlighter",
		icon: "💡",
		description: "Highlight syntax for dozens of programming languages.",
		component: () => import("./views/code-highlight.vue"),
		category: "Text & Coding",
	},
	{
		path: "/encoding-converter",
		name: "Encoding Converter",
		icon: "🔡",
		description: "Convert uploaded text files between popular character sets.",
		component: () => import("./views/encoding-converter.vue"),
		category: "Text & Coding",
	},
	// Math & LaTeX
	{
		path: "/unicode-latex",
		name: "Unicode → LaTeX",
		icon: "🔣",
		description: "Convert Unicode math symbols to LaTeX markup.",
		component: () => import("./views/unicode-latex.vue"),
		category: "Math & LaTeX",
	},
	{
		path: "/latex-unicode",
		name: "LaTeX → Unicode",
		icon: "🧮",
		description: "Turn LaTeX expressions into readable Unicode.",
		component: () => import("./views/latex-unicode.vue"),
		category: "Math & LaTeX",
	},
	{
		path: "/math-preview",
		name: "Math Preview",
		icon: "♾️",
		description: "Preview rendered math expressions in real time.",
		component: () => import("./views/math-preview.vue"),
		category: "Math & LaTeX",
	},
	{
		path: "/statistics",
		name: "Statistics",
		icon: "📊",
		description: "Calculate descriptive statistics from your dataset.",
		component: () => import("./views/statistics.vue"),
		category: "Math & LaTeX",
	},
	// Graphics & Images
	{
		path: "/image-resize",
		name: "Image Resize",
		icon: "🖼️",
		description: "Resize images while keeping quality in check.",
		component: () => import("./views/image-resize.vue"),
		category: "Graphics & Images",
	},
	{
		path: "/image-format-converter",
		name: "Image Format Converter",
		icon: "🔄",
		description: "Convert between PNG, JPEG, WebP, AVIF, HEIC, and more.",
		component: () => import("./views/image-format-converter.vue"),
		category: "Graphics & Images",
	},
	{
		path: "/ocr",
		name: "OCR",
		icon: "👁️",
		description: "Extract text from images using OCR.",
		component: () => import("./views/ocr.vue"),
		category: "Graphics & Images",
	},
	{
		path: "/svg-png",
		name: "SVG → PNG",
		icon: "🖼️",
		description: "Export SVG artwork to high-quality PNG files.",
		component: () => import("./views/svg-png.vue"),
		category: "Graphics & Images",
	},
	{
		path: "/mermaid",
		name: "Mermaid",
		icon: "🧜‍♀️",
		description: "Generate diagrams from Mermaid markdown.",
		component: () => import("./views/mermaid.vue"),
		category: "Graphics & Images",
	},
	{
		path: "/bg-remover",
		name: "BG Remover",
		icon: "✂️",
		description: "Remove backgrounds from images automatically.",
		component: () => import("./views/bg-remover.vue"),
		category: "Graphics & Images",
	},
	// PDF Tools
	{
		path: "/pdf-viewer",
		name: "PDF Viewer",
		icon: "📄",
		description: "View PDF documents directly in the browser.",
		component: () => import("./views/pdf-viewer.vue"),
		category: "PDF Tools",
	},
	{
		path: "/pdf-merge",
		name: "PDF Merge",
		icon: "🔗",
		description: "Combine multiple PDFs into a single file.",
		component: () => import("./views/pdf-merge.vue"),
		category: "PDF Tools",
	},
	{
		path: "/pdf-extract",
		name: "PDF Extract",
		icon: "✂️",
		description: "Extract specific pages from a PDF.",
		component: () => import("./views/pdf-extract.vue"),
		category: "PDF Tools",
	},
	{
		path: "/pdf-resize",
		name: "PDF Resize",
		icon: "📏",
		description: "Adjust page sizes and margins for PDFs.",
		component: () => import("./views/pdf-resize.vue"),
		category: "PDF Tools",
	},
	{
		path: "/pdf-sort",
		name: "PDF Sort",
		icon: "🔃",
		description: "Reorder PDF pages with drag-and-drop ease.",
		component: () => import("./views/pdf-sort.vue"),
		category: "PDF Tools",
	},
	{
		path: "/pdf-text",
		name: "PDF → Text",
		icon: "📝",
		description: "Convert PDF content into editable text.",
		component: () => import("./views/pdf-text.vue"),
		category: "PDF Tools",
	},
	{
		path: "/pdf-fonts",
		name: "PDF Fonts",
		icon: "🔤",
		description: "Inspect and list fonts embedded in PDFs.",
		component: () => import("./views/pdf-fonts.vue"),
		category: "PDF Tools",
	},
	// Utilities
	{
		path: "/pomodoro",
		name: "Pomodoro",
		icon: "⏱️",
		description: "Track focus sessions with the Pomodoro timer.",
		component: () => import("./views/pomodoro.vue"),
		category: "Utilities",
	},
];
