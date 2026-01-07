<template>
  <div class="container py-4">
    <h2 class="display-6 mb-2">Code Highlighter</h2>
    <p class="text-muted mb-4">
      Generate beautiful syntax-highlighted code snippets using Shiki and download them as PNG
      images.
    </p>

    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Configuration</div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label for="language" class="form-label small text-muted">Language</label>
            <select id="language" v-model="language" class="form-select">
              <option v-for="lang in languages" :key="lang.value" :value="lang.value">
                {{ lang.label }}
              </option>
            </select>
          </div>
          <div class="col-md-4">
            <label for="theme" class="form-label small text-muted">Theme</label>
            <select id="theme" v-model="theme" class="form-select">
              <option
                v-for="themeOption in themes"
                :key="themeOption.value"
                :value="themeOption.value"
              >
                {{ themeOption.label }}
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
        <div class="card h-100 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-semibold">Code</span>
            <span class="text-muted small">Auto-renders with Shiki</span>
          </div>
          <div class="card-body">
            <textarea
              v-model="code"
              class="form-control font-monospace"
              rows="14"
              spellcheck="false"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="card h-100 shadow-sm">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-semibold">Preview</span>
            <button
              class="btn btn-link p-0 small"
              :disabled="isRendering || isDownloading"
              @click="downloadPng"
            >
              {{ isDownloading ? "Preparing..." : "Download PNG" }}
            </button>
          </div>
          <div class="card-body bg-light">
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
	type BundledLanguage,
	type BundledTheme,
	bundledLanguagesInfo,
	bundledThemesInfo,
	codeToTokens,
	type ThemedToken,
} from "shiki";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import LoadingOverlay from "../components/LoadingOverlay.vue";

type LanguageOption = {
	value: BundledLanguage;
	label: string;
};

type ThemeOption = {
	value: BundledTheme;
	label: string;
};

const FONT_STACK =
	'SF Mono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const PADDING = 20;

const languages = computed<LanguageOption[]>(() =>
	bundledLanguagesInfo
		.map((lang) => ({ value: lang.id as BundledLanguage, label: lang.name }))
		.sort((a, b) => a.label.localeCompare(b.label)),
);

const themes = computed<ThemeOption[]>(() =>
	bundledThemesInfo
		.map((themeInfo) => ({
			value: themeInfo.id as BundledTheme,
			label: themeInfo.displayName,
		}))
		.sort((a, b) => a.label.localeCompare(b.label)),
);

const code = ref(
	`function greet(name: string) {
  return 
Hello, 
{name}!
};

greet("Taniguchi");`,
);
const language = ref<BundledLanguage>("typescript");
const theme = ref<BundledTheme>("github-light");
const fontSize = ref(14);
const isRendering = ref(false);
const isDownloading = ref(false);
const error = ref("");
const previewImage = ref("");
let renderTimeout: number | undefined;

const wrapperStyle = computed(() => ({
	fontSize: `${fontSize.value}px`,
}));

const renderToCanvas = (
	tokens: ThemedToken[][],
	bg: string,
	fg: string,
): string => {
	const currentFontSize = fontSize.value;
	const lineHeight = currentFontSize * 1.5;
	const font = `${currentFontSize}px ${FONT_STACK}`;

	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not get canvas context");

	ctx.font = font;

	// Measure width
	let maxWidth = 0;
	for (const line of tokens) {
		let lineWidth = 0;
		for (const token of line) {
			lineWidth += ctx.measureText(token.content).width;
		}
		if (lineWidth > maxWidth) maxWidth = lineWidth;
	}

	const width = Math.ceil(maxWidth + PADDING * 2);
	const height = Math.ceil(tokens.length * lineHeight + PADDING * 2);

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
	for (const line of tokens) {
		let x = PADDING;
		for (const token of line) {
			ctx.fillStyle = token.color || fg;
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
		const result = await codeToTokens(code.value, {
			lang: language.value,
			theme: theme.value,
		});

		// shiki's codeToTokens returns { tokens, bg, fg }
		// Wait, in some versions it returns structure directly, in others it's inside properties
		// Checking docs (implied): codeToTokens returns Promise<{ tokens: ThemedToken[][], bg: string, fg: string, ... }>

		previewImage.value = renderToCanvas(
			result.tokens,
			result.bg || "#ffffff",
			result.fg || "#000000",
		);
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
		link.download = `code-highlight-${language.value}.png`;
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

/* Ensure image doesn't overflow container visually but keeps aspect */
.img-fluid {
  max-width: 100%;
  height: auto;
}
</style>