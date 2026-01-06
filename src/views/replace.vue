<script setup lang="ts">
import { computed, ref } from "vue";
import { EmulatedRegExp, toRegExpDetails, type ToRegExpOptions } from "oniguruma-to-es";
import ToolHeader from "../components/ToolHeader.vue";
import ToolCard from "../components/ToolCard.vue";
import CopyButton from "../components/CopyButton.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import { DiffModeEnum, DiffView } from "@git-diff-view/vue";
import { generateDiffFile } from "@git-diff-view/file";

type CompiledOniguruma = ReturnType<typeof toRegExpDetails>;

function compileOnigurumaRegex(pattern: string, options: { flags?: string; target?: string } = {}) {
  if (pattern.trim() === "") return { compiled: null, error: null };
  const rawFlags = options.flags?.replace(/\s+/g, "").trim();
  const toRegExpOptions: ToRegExpOptions = {
    global: true,
    target: (options.target as any) ?? "auto",
  };
  if (rawFlags) toRegExpOptions.flags = rawFlags;
  try {
    const details = toRegExpDetails(pattern, toRegExpOptions);
    return { compiled: details, error: null };
  } catch (error) {
    return { compiled: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function createOnigurumaRegExp(compiled: CompiledOniguruma): RegExp {
  if (compiled.options) {
    return new EmulatedRegExp(compiled.pattern, compiled.flags, compiled.options);
  }
  return new RegExp(compiled.pattern, compiled.flags);
}

function replaceMatches(text: string, compiled: CompiledOniguruma, replacement: string): string {
  const regex = createOnigurumaRegExp(compiled);
  return text.replace(regex, replacement);
}

const text = ref("The year is 2025. The next year will be 2026. My favorite numbers are 7 and 42.");
const replaceText = ref("[year]");
const search = ref("\\d{4}");
const flags = ref("");

const compileResult = computed(() =>
  compileOnigurumaRegex(search.value, { flags: flags.value, target: "auto" }),
);

const result = computed(() => {
  try {
    if (!search.value || !compileResult.value.compiled) return text.value;
    return replaceMatches(text.value, compileResult.value.compiled, replaceText.value);
  } catch {
    return text.value;
  }
});

const diffFile = computed(() => {
  let oldText = (text.value || "").replace(/\r\n/g, "\n");
  let newText = (result.value || "").replace(/\r\n/g, "\n");
  if (oldText === newText) return null;

  if (oldText && !oldText.endsWith("\n")) oldText += "\n";
  if (newText && !newText.endsWith("\n")) newText += "\n";

  const file = generateDiffFile("Deleted", oldText, "Added", newText, "plaintext", "plaintext");
  file.initRaw();
  return file;
});
</script>

<template>
  <div>
    <ToolHeader
      title="Replace"
      description="Search and replace text using Oniguruma-style regular expressions with a side-by-side diff preview."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3">
        <div class="col-md-6">
          <label for="search" class="form-label fw-bold small">Oniguruma Pattern</label>
          <input id="search" v-model="search" class="form-control" placeholder="e.g., \d+" />
          <div class="form-text">
            Supports Oniguruma syntax like <span class="font-monospace">\h</span> and inline
            modifiers.
          </div>
        </div>
        <div class="col-md-6">
          <label for="replace" class="form-label fw-bold small">Replacement Text</label>
          <input
            id="replace"
            v-model="replaceText"
            class="form-control"
            placeholder="e.g., [number]"
          />
        </div>
        <div class="col-md-6">
          <label for="flags" class="form-label fw-bold small">Flags</label>
          <input
            id="flags"
            v-model="flags"
            class="form-control font-monospace"
            placeholder="i, m, x, D, S, W, y{g}"
          />
        </div>
        <div class="col-md-6">
          <label class="form-label fw-bold small">Compiled</label>
          <div class="form-control font-monospace bg-light">
            {{
              compileResult.compiled
                ? `/${compileResult.compiled.pattern}/${compileResult.compiled.flags}`
                : "—"
            }}
          </div>
        </div>
        <div v-if="compileResult.error" class="col-12">
          <div class="alert alert-danger mb-0">{{ compileResult.error }}</div>
        </div>
      </div>
    </ToolCard>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Input" class="h-100" no-padding>
          <MonospaceEditor v-model="text" :rows="20" />
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="Output" class="h-100" no-padding>
          <template #header-actions>
            <CopyButton :content="result" />
          </template>
          <MonospaceEditor :model-value="result" bg-light readonly :rows="20" />
        </ToolCard>
      </div>
    </div>
    <div v-if="diffFile" class="row">
      <div class="col-12 mb-4">
        <ToolCard title="Visual Diff" no-padding>
          <DiffView :diff-file="diffFile" :diff-view-mode="DiffModeEnum.Split" />
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-monospace {
  font-family: var(--bs-font-monospace);
}
</style>
