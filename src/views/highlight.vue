<template>
  <div class="container py-4">
    <ToolHeader
      title="Highlight"
      description="Generate syntax-highlighted code snippets using Prism.js and download them as PNG images."
    />

    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Configuration</div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label for="language" class="form-label small text-muted">Language</label>
            <select id="language" v-model="language" class="form-select">
              <option v-for="lang in LANGUAGES" :key="lang.id" :value="lang.id">
                {{ lang.name }}
              </option>
            </select>
          </div>
          <div class="col-md-4">
            <label for="theme" class="form-label small text-muted">Theme</label>
            <select id="theme" v-model="theme" class="form-select">
              <option v-for="(t, id) in THEMES" :key="id" :value="id">
                {{ t.name }}
              </option>
            </select>
          </div>
          <div class="col-md-4">
            <label for="fontSize" class="form-label small text-muted">Font Size</label>
            <div class="input-group">
              <input
                id="fontSize"
                v-model.number="fontSize"
                type="number"
                class="form-control"
                min="10"
                max="32"
                step="1"
              />
              <span class="input-group-text">px</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-lg-6">
        <ToolCard title="Code" class="h-100" no-padding>
          <template #header-actions>
            <span class="text-muted small">Auto-renders with Prism</span>
          </template>
          <MonospaceEditor
            v-model="code"
            :language="language"
            :rows="14"
            placeholder="Paste your code here..."
          />
        </ToolCard>
      </div>

      <div class="col-lg-6">
        <ToolCard title="Preview" class="h-100" no-padding>
          <template #header-actions>
            <button
              class="btn btn-link p-0 small"
              :disabled="isRendering || isDownloading"
              @click="downloadPng"
            >
              {{ isDownloading ? "Preparing..." : "Download PNG" }}
            </button>
          </template>
          <div class="card-body bg-light h-100">
            <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
            <div v-else class="code-wrapper font-monospace preview-surface" :style="wrapperStyle">
              <LoadingOverlay v-if="isRendering" :loading="true" message="Rendering..." />
              <img
                v-else-if="previewImage"
                :src="previewImage"
                class="img-fluid rounded shadow-sm"
                alt="Highlighted code preview"
              />
              <div v-else class="text-muted small">Preview will appear here.</div>
            </div>
          </div>
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Prism from "prismjs";
import { computed, onMounted, ref, watch } from "vue";
import LoadingOverlay from "../components/LoadingOverlay.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";

const LANGUAGES = [
	{ id: "javascript", name: "JavaScript" },
	{ id: "typescript", name: "TypeScript" },
	{ id: "json", name: "JSON" },
	{ id: "css", name: "CSS" },
	{ id: "scss", name: "SCSS" },
	{ id: "less", name: "Less" },
	{ id: "markup", name: "HTML/XML" },
	{ id: "yaml", name: "YAML" },
	{ id: "markdown", name: "Markdown" },
	{ id: "graphql", name: "GraphQL" },
	{ id: "handlebars", name: "Handlebars" },
	{ id: "latex", name: "LaTeX" },
	{ id: "regex", name: "Regex" },
	{ id: "bnf", name: "BNF" },
	{ id: "dot", name: "Graphviz DOT" },
	{ id: "mermaid", name: "Mermaid" },
];

const THEMES = {
	light: {
		name: "Light",
		bg: "#ffffff",
		fg: "#000000",
		colors: {
			keyword: "#0077aa",
			comment: "#708090",
			punctuation: "#999",
			operator: "#9a6e3a",
			string: "#669900",
			number: "#990055",
			function: "#DD4A68",
			class: "#DD4A68",
			variable: "#e90",
			tag: "#0077aa",
			attr: "#669900",
		},
	},
	dark: {
		name: "Dark",
		bg: "#2d2d2d",
		fg: "#ccc",
		colors: {
			keyword: "#cc99cd",
			comment: "#999",
			punctuation: "#ccc",
			operator: "#67cdcc",
			string: "#7ec699",
			number: "#f08d49",
			function: "#f08d49",
			class: "#f08d49",
			variable: "#e2777a",
			tag: "#e2777a",
			attr: "#f8c555",
		},
	},
} as const;

const FONT_STACK =
	'SF Mono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const PADDING = 20;

const code = ref(
	`function greet(name: string) {
  return \`Hello, \${name}!\`;
}

greet("Taniguchi");`,
);
const language = ref("typescript");
const theme = ref<keyof typeof THEMES>("light");
const fontSize = ref(14);
const isRendering = ref(false);
const isDownloading = ref(false);
const error = ref("");
const previewImage = ref("");
let renderTimeout: number | undefined;

const wrapperStyle = computed(() => ({
	fontSize: `${fontSize.value}px`,
}));

type SimpleToken = {
	content: string;
	color: string;
};

const flattenTokens = (
	tokens: (string | Prism.Token)[],
	colors: Record<string, string>,
	defaultColor: string,
): SimpleToken[] => {
	const result: SimpleToken[] = [];

	const process = (
		token: string | Prism.Token | (string | Prism.Token)[],
		inheritedColor: string,
	) => {
		if (typeof token === "string") {
			result.push({ content: token, color: inheritedColor });
		} else if (Array.isArray(token)) {
			for (const child of token) {
				process(child, inheritedColor);
			}
		} else {
			const color = colors[token.type] || inheritedColor;
			process(token.content, color);
		}
	};

	for (const token of tokens) {
		process(token, defaultColor);
	}

	return result;
};

const renderToCanvas = (tokens: SimpleToken[], bg: string): string => {
	const currentFontSize = fontSize.value;
	const lineHeight = currentFontSize * 1.5;
	const font = `${currentFontSize}px ${FONT_STACK}`;

	const lines = [];
	let currentLine: SimpleToken[] = [];
	for (const token of tokens) {
		const parts = token.content.split("\n");
		for (let i = 0; i < parts.length; i++) {
			if (parts[i]) {
				currentLine.push({ content: parts[i], color: token.color });
			}
			if (i < parts.length - 1) {
				lines.push(currentLine);
				currentLine = [];
			}
		}
	}
	lines.push(currentLine);

	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not get canvas context");

	ctx.font = font;

	// Measure width
	let maxWidth = 0;
	for (const line of lines) {
		let lineWidth = 0;
		for (const token of line) {
			lineWidth += ctx.measureText(token.content).width;
		}
		if (lineWidth > maxWidth) maxWidth = lineWidth;
	}

	const width = Math.ceil(maxWidth + PADDING * 2);
	const height = Math.ceil(lines.length * lineHeight + PADDING * 2);

	// High DPI support
	const pixelRatio = 2;
	canvas.width = width * pixelRatio;
	canvas.height = height * pixelRatio;
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;

	ctx.scale(pixelRatio, pixelRatio);

	// Draw background
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, width, height);

	// Draw text
	ctx.font = font;
	ctx.textBaseline = "top";

	let y = PADDING;
	for (const line of lines) {
		let x = PADDING;
		for (const token of line) {
			ctx.fillStyle = token.color;
			ctx.fillText(token.content, x, y);
			x += ctx.measureText(token.content).width;
		}
		y += lineHeight;
	}

	return canvas.toDataURL("image/png");
};

const renderHighlight = async () => {
	error.value = "";
	isRendering.value = true;
	try {
		const grammar = Prism.languages[language.value] || Prism.languages.markup;
		const tokens = Prism.tokenize(code.value, grammar);
		const currentTheme = THEMES[theme.value];
		const flatTokens = flattenTokens(
			tokens,
			currentTheme.colors,
			currentTheme.fg,
		);

		previewImage.value = renderToCanvas(flatTokens, currentTheme.bg);
	} catch (renderError) {
		error.value =
			renderError instanceof Error
				? renderError.message
				: "Failed to render code.";
		previewImage.value = "";
		console.error(renderError);
	} finally {
		isRendering.value = false;
	}
};

const scheduleRender = () => {
	if (renderTimeout) {
		window.clearTimeout(renderTimeout);
	}

	renderTimeout = window.setTimeout(renderHighlight, 200);
};

watch([code, language, theme, fontSize], scheduleRender, { immediate: true });

onMounted(() => {
	renderHighlight();
});

const downloadPng = () => {
	if (!previewImage.value) return;

	isDownloading.value = true;
	try {
		const link = document.createElement("a");
		link.href = previewImage.value;
		link.download = `highlight-${language.value}.png`;
		link.click();
	} catch (downloadError) {
		error.value = "Unable to download the image.";
	} finally {
		isDownloading.value = false;
	}
};
</script>

<style scoped>
.code-wrapper {
  min-height: 320px;
  padding: 1rem;
}

.preview-surface {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.img-fluid {
  max-width: 100%;
  height: auto;
}
</style>
