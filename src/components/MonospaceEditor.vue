<script setup lang="ts">
import { CodeJar } from "codejar";
import Prism from "prismjs";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import "prismjs/themes/prism.css"; // Default theme
import "prismjs/components/prism-markup-templating"; // Core dependency for templating languages

const props = defineProps<{
	modelValue: string;
	readonly?: boolean;
	placeholder?: string;
	rows?: number | string;
	bgLight?: boolean;
	highlight?: (e: HTMLElement) => void;
	language?: string;
	singleLine?: boolean;
}>();

const emit = defineEmits(["update:modelValue"]);

const editorRef = ref<HTMLElement | null>(null);
let jar: CodeJar | null = null;
const loadedLanguages = new Set<string>();

// --- Dynamic Resource Loading ---

const idFromPath = (path: string, regex: RegExp) => path.match(regex)?.[1];

const importGlob = (
	glob: Record<string, () => Promise<unknown>>,
	regex: RegExp,
) =>
	Object.entries(glob)
		.map(([path, module]) => ({ id: idFromPath(path, regex), path, module }))
		.filter(
			(l): l is { id: string; path: string; module: () => Promise<unknown> } =>
				!!l.id,
		);

const LANGUAGES = importGlob(
	import.meta.glob("../../node_modules/prismjs/components/prism-*.js"),
	/prism-([\w-]+)\.js$/,
);

const ensureLanguageLoaded = async (lang: string) => {
	if (loadedLanguages.has(lang)) return;
	const entry = LANGUAGES.find((l) => l.id === lang);
	if (entry) {
		await entry.module();
		loadedLanguages.add(lang);
	}
};

// --- Editor Logic ---

const defaultHighlight = (e: HTMLElement) => {
	const lang = props.language || "markup";
	const grammar = Prism.languages[lang] || Prism.languages.markup;
	const html = Prism.highlight(e.textContent || "", grammar, lang);
	e.innerHTML = html;
};

const updateHighlighting = async () => {
	if (props.language) {
		await ensureLanguageLoaded(props.language);
	}
	if (jar) {
		jar.updateOptions({}); // Trigger re-highlight
		// Force a re-highlight if needed because updateOptions might not always re-render if options are same
		const el = editorRef.value;
		if (el) defaultHighlight(el);
	}
};

const handleKeyDown = (event: KeyboardEvent) => {
	if (props.singleLine && event.key === "Enter") {
		event.preventDefault();
	}
};

onMounted(async () => {
	if (props.language) {
		await ensureLanguageLoaded(props.language);
	}

	if (editorRef.value) {
		editorRef.value.contentEditable = props.readonly ? "false" : "true";
		jar = CodeJar(editorRef.value, props.highlight || defaultHighlight, {
			tab: "  ",
		});
		jar.onUpdate((code) => {
			if (props.singleLine && code.includes("\n")) {
				const cleaned = code.replace(/\r?\n/g, "");
				jar?.updateCode(cleaned);
				emit("update:modelValue", cleaned);
			} else {
				emit("update:modelValue", code);
			}
		});
		jar.updateCode(props.modelValue);
		editorRef.value.addEventListener("keydown", handleKeyDown);
	}
});

watch(
	() => props.modelValue,
	(newCode) => {
		if (jar && newCode !== jar.toString()) {
			jar.updateCode(newCode);
		}
	},
);

watch(
	() => props.readonly,
	(newReadOnly) => {
		if (editorRef.value) {
			editorRef.value.contentEditable = newReadOnly ? "false" : "true";
		}
	},
);

watch(
	() => props.language,
	async () => {
		await updateHighlighting();
	},
);

onBeforeUnmount(() => {
	if (jar) {
		jar.destroy();
	}
	if (editorRef.value) {
		editorRef.value.removeEventListener("keydown", handleKeyDown);
	}
});
</script>

<template>
  <div
    ref="editorRef"
    :class="[
      'form-control font-monospace editor-container prism-editor',
      bgLight ? 'bg-light' : '',
      singleLine ? 'single-line py-2' : 'p-3 border-0'
    ]"
    :style="{ minHeight: singleLine ? 'auto' : (rows ? `calc(${rows} * 1.5em)` : '480px') }"
    :data-placeholder="placeholder"
  />
</template>

<style scoped>
.editor-container {
  overflow: auto;
  white-space: pre;
  word-wrap: normal;
  outline: none;
  position: relative;
  font-family: var(--bs-font-monospace);
}

.editor-container.single-line {
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
}

.editor-container:empty::before {
  content: attr(data-placeholder);
  color: #6c757d;
  pointer-events: none;
}

/* Prism overrides for CodeJar */
.prism-editor {
  line-height: 1.5;
  tab-size: 2;
}
</style>
