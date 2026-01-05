<script setup lang="ts">
import { MagickFormat } from "@imagemagick/magick-wasm";
import { ref, computed, watch, onBeforeUnmount } from "vue";
import ToolCard from "../components/ToolCard.vue";
import FilePicker from "../components/FilePicker.vue";
import ToolHeader from "../components/ToolHeader.vue";
import DownloadLink from "../components/DownloadLink.vue";
import LoadingOverlay from "../components/LoadingOverlay.vue";
import {
  convertImageFormat,
  getWritableFormatOptions,
  readImageMetadata,
  type FormatOption,
} from "../utils/image-conversion";

const availableFormats = ref<FormatOption[]>([]);
const targetFormat = ref<MagickFormat | null>(null);
const loadingFormats = ref(false);

const sourceBytes = ref<Uint8Array | null>(null);
const sourcePreview = ref<string>("");
const sourceName = ref<string>("");
const sourceDetails = ref<{ width: number; height: number; format: MagickFormat } | null>(null);
const sourceError = ref("");

const converting = ref(false);
const result = ref<{
  option: FormatOption;
  blobUrl: string;
  width: number;
  height: number;
  size: number;
} | null>(null);
const conversionError = ref("");

const loadFormats = async () => {
  loadingFormats.value = true;
  try {
    const writable = await getWritableFormatOptions();
    availableFormats.value = writable;
    if (writable.length > 0) {
      targetFormat.value = writable[0].format;
    }
  } catch (error) {
    console.error("Failed to load formats", error);
  } finally {
    loadingFormats.value = false;
  }
};

const readFile = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  sourceError.value = "";
  if (result.value?.blobUrl) URL.revokeObjectURL(result.value.blobUrl);
  result.value = null;

  const buffer = new Uint8Array(await file.arrayBuffer());
  sourceBytes.value = buffer;
  sourceName.value = file.name;

  if (sourcePreview.value) URL.revokeObjectURL(sourcePreview.value);
  sourcePreview.value = URL.createObjectURL(
    new Blob([buffer], { type: file.type || "application/octet-stream" }),
  );

  try {
    sourceDetails.value = await readImageMetadata(buffer);
  } catch (error) {
    sourceDetails.value = null;
    sourceError.value = error instanceof Error ? error.message : "Unable to read the image.";
  }
};

const convert = async () => {
  if (!sourceBytes.value || !targetFormat.value || converting.value) return;
  converting.value = true;
  conversionError.value = "";

  const option = availableFormats.value.find((f) => f.format === targetFormat.value);
  if (!option) {
    converting.value = false;
    return;
  }

  try {
    const converted = await convertImageFormat(sourceBytes.value, targetFormat.value);
    const metadata = await readImageMetadata(converted);

    if (result.value?.blobUrl) URL.revokeObjectURL(result.value.blobUrl);

    const blob = new Blob([converted] as any, { type: option.mimeType });
    result.value = {
      option,
      blobUrl: URL.createObjectURL(blob),
      width: metadata.width,
      height: metadata.height,
      size: blob.size,
    };
  } catch (error) {
    conversionError.value = error instanceof Error ? error.message : "Conversion failed.";
  } finally {
    converting.value = false;
  }
};

onBeforeUnmount(() => {
  if (sourcePreview.value) URL.revokeObjectURL(sourcePreview.value);
  if (result.value?.blobUrl) URL.revokeObjectURL(result.value.blobUrl);
});

const formatSize = (bytes: number) => {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

loadFormats();
</script>

<template>
  <div class="container py-4">
    <ToolHeader
      title="Image Format Converter"
      description="Convert images between dozens of formats using ImageMagick WebAssembly."
    />

    <ToolCard title="Configuration" class="mb-4">
      <div class="row g-3 align-items-end">
        <div class="col-md-6">
          <FilePicker label="Input Image" accept="image/*" @change="readFile" />
        </div>
        <div class="col-md-4">
          <label class="form-label fw-bold small">Target Format</label>
          <select
            v-model="targetFormat"
            class="form-select"
            :disabled="loadingFormats || converting"
          >
            <option v-if="loadingFormats" value="">Detecting formats…</option>
            <option v-for="option in availableFormats" :key="option.format" :value="option.format">
              {{ option.label }} (.{{ option.extension }})
            </option>
          </select>
        </div>
        <div class="col-md-2">
          <button
            class="btn btn-primary w-100"
            type="button"
            :disabled="!sourceBytes || converting"
            @click="convert"
          >
            <span
              v-if="converting"
              class="spinner-border spinner-border-sm me-1"
              role="status"
            ></span>
            Convert
          </button>
        </div>
      </div>
    </ToolCard>

    <div class="row">
      <div class="col-lg-6 mb-4">
        <ToolCard title="Original" class="h-100">
          <div
            class="bg-light text-center p-3 d-flex align-items-center justify-content-center rounded"
            style="min-height: 300px"
          >
            <div v-if="sourcePreview">
              <img
                :src="sourcePreview"
                class="img-fluid mb-2 rounded shadow-sm"
                style="max-height: 400px"
              />
              <div v-if="sourceDetails" class="text-muted small font-monospace">
                {{ sourceDetails.width }} × {{ sourceDetails.height }} px |
                {{ formatSize(sourceBytes?.length || 0) }}
              </div>
            </div>
            <div v-else class="text-muted small">Upload an image to see preview</div>
          </div>
          <p v-if="sourceError" class="text-danger small mt-2 mb-0">{{ sourceError }}</p>
        </ToolCard>
      </div>
      <div class="col-lg-6 mb-4">
        <ToolCard title="Converted" class="h-100">
          <template #header-actions v-if="result">
            <DownloadLink
              :href="result.blobUrl"
              :filename="`converted.${result.option.extension}`"
            />
          </template>
          <div
            class="bg-light text-center p-3 d-flex align-items-center justify-content-center rounded"
            style="min-height: 300px"
          >
            <div v-if="result">
              <img
                :src="result.blobUrl"
                class="img-fluid mb-2 rounded shadow-sm"
                style="max-height: 400px"
              />
              <div class="text-muted small font-monospace">
                {{ result.width }} × {{ result.height }} px | {{ formatSize(result.size) }}
              </div>
            </div>
            <LoadingOverlay v-else-if="converting" :loading="converting" message="Converting..." />
            <div v-else class="text-muted small">Converted image will appear here</div>
          </div>
          <p v-if="conversionError" class="text-danger small mt-2 mb-0">{{ conversionError }}</p>
        </ToolCard>
      </div>
    </div>
  </div>
</template>
