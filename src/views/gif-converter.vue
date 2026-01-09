<script setup lang="ts">
import * as gifenc from "gifenc";
import { onUnmounted, ref } from "vue";
import FilePicker from "../components/FilePicker.vue";
import ToolHeader from "../components/ToolHeader.vue";

const file = ref<File | null>(null);
const videoUrl = ref<string>("");
const videoElement = ref<HTMLVideoElement | null>(null);
const duration = ref(0);
const startTime = ref(0);
const endTime = ref(0);
const processing = ref(false);
const progress = ref(0);
const status = ref("");
const resultUrl = ref("");
const error = ref("");
const resultSize = ref(0);

const formatTime = (seconds: number) => {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	const ms = Math.floor((seconds % 1) * 100);
	return `${h.toString().padStart(2, "0")}:${m
		.toString()
		.padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms
		.toString()
		.padStart(2, "0")}`;
};

const handleFileChange = (event: Event) => {
	const target = event.target as HTMLInputElement;
	if (target.files && target.files.length > 0) {
		file.value = target.files[0];
		if (videoUrl.value) URL.revokeObjectURL(videoUrl.value);
		videoUrl.value = URL.createObjectURL(file.value);
		resultUrl.value = "";
		error.value = "";
		progress.value = 0;
		status.value = "";
	}
};

const onMetadataLoaded = () => {
	if (videoElement.value) {
		duration.value = videoElement.value.duration;
		startTime.value = 0;
		endTime.value = Math.min(duration.value, 5); // Default 5 seconds
	}
};

const setStartToCurrent = () => {
	if (videoElement.value) startTime.value = videoElement.value.currentTime;
};

const setEndToCurrent = () => {
	if (videoElement.value) endTime.value = videoElement.value.currentTime;
};

onUnmounted(() => {
	if (videoUrl.value) URL.revokeObjectURL(videoUrl.value);
	if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
});

const waitForEvent = (target: EventTarget, event: string) =>
	new Promise<void>((resolve) => {
		const handler = () => {
			target.removeEventListener(event, handler);
			resolve();
		};
		target.addEventListener(event, handler, { once: true });
	});

const seekTo = async (video: HTMLVideoElement, time: number) => {
	const clamped = Math.min(Math.max(time, 0), video.duration || time);
	if (Math.abs(video.currentTime - clamped) < 0.001) {
		return;
	}
	const seeked = waitForEvent(video, "seeked");
	video.currentTime = clamped;
	await seeked;
	await new Promise((r) => requestAnimationFrame(() => r(undefined)));
};

const convertToGif = async () => {
	if (!file.value) return;
	processing.value = true;
	error.value = "";
	progress.value = 0;
	status.value = "Initializing...";
	resultUrl.value = "";

	try {
		const video = videoElement.value;
		if (!video) throw new Error("Video element not ready.");
		if (video.readyState < 1) {
			await waitForEvent(video, "loadedmetadata");
		}
		if (!video.videoWidth || !video.videoHeight) {
			throw new Error("Unable to read video dimensions.");
		}
		const selectedStart = Math.max(0, startTime.value);
		const selectedEnd = Math.min(
			endTime.value,
			video.duration || endTime.value,
		);
		if (selectedEnd <= selectedStart) {
			throw new Error("End time must be greater than start time.");
		}

		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) throw new Error("Could not get canvas context");

		const gifWidth = Math.min(video.videoWidth, 480);
		const gifHeight = Math.round(
			(gifWidth / video.videoWidth) * video.videoHeight,
		);
		canvas.width = gifWidth;
		canvas.height = gifHeight;

		const writer = gifenc.GIFEncoder();
		const framesPerSecond = 10;
		const totalFrames = Math.max(
			1,
			Math.ceil((selectedEnd - selectedStart) * framesPerSecond),
		);
		const frameStep = (selectedEnd - selectedStart) / totalFrames;
		const delay = Math.max(20, Math.round(1000 / framesPerSecond));

		status.value = `Processing ${totalFrames} frames...`;

		for (let i = 0; i < totalFrames; i++) {
			const time = selectedStart + i * frameStep;
			await seekTo(video, time);

			const frame = new VideoFrame(video);
			ctx.drawImage(frame, 0, 0, gifWidth, gifHeight);
			frame.close();

			const imageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
			const rgba = imageData.data;
			const palette = gifenc.quantize(rgba, 256);
			const index = gifenc.applyPalette(rgba, palette);

			writer.writeFrame(index, gifWidth, gifHeight, {
				palette,
				delay,
				transparent: false,
			});

			progress.value = Math.round(((i + 1) / totalFrames) * 100);
			if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
		}

		writer.finish();
		const gifBytes = writer.bytesView();

		if (gifBytes.length === 0) {
			throw new Error("Generated GIF is empty.");
		}

		const blob = new Blob([gifBytes], {
			type: "image/gif",
		});
		resultUrl.value = URL.createObjectURL(blob);
		resultSize.value = blob.size;
		status.value = "Done!";
		const a = document.createElement("a");
		a.href = resultUrl.value;
		a.download = `converted-${file.value?.name.replace(/\.[^/.]+$/, "") || "video"}.gif`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	} catch (err: unknown) {
		console.error(err);
		error.value = err instanceof Error ? err.message : String(err);
	} finally {
		processing.value = false;
	}
};
</script>

<template>
  <div class="container py-4">
    <ToolHeader
      title="GIF Converter"
      description="Convert video files to animated GIFs using WebCodecs and gifenc."
    />

    <div class="row g-4">
      <div class="col-12">
        <div class="card shadow-sm">
          <div class="card-body">
            <FilePicker
              label="Select Video"
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/*"
              @change="handleFileChange"
              :disabled="processing"
            />

            <div v-if="videoUrl" class="mt-4">
              <div class="ratio ratio-16x9 bg-black rounded mb-3">
                <video
                  ref="videoElement"
                  :src="videoUrl"
                  controls
                  @loadedmetadata="onMetadataLoaded"
                  class="w-100 h-100"
                ></video>
              </div>

              <div class="row g-3 align-items-end">
                <div class="col-md-5">
                  <label class="form-label">Start Time</label>
                  <div class="input-group">
                    <input
                      type="number"
                      class="form-control"
                      v-model.number="startTime"
                      :max="endTime"
                      min="0"
                      step="0.1"
                      :disabled="processing"
                    />
                    <button class="btn btn-outline-secondary" type="button" @click="setStartToCurrent" :disabled="processing">
                      Use Current
                    </button>
                  </div>
                  <div class="form-text">{{ formatTime(startTime) }}</div>
                </div>

                <div class="col-md-5">
                  <label class="form-label">End Time</label>
                  <div class="input-group">
                    <input
                      type="number"
                      class="form-control"
                      v-model.number="endTime"
                      :min="startTime"
                      :max="duration"
                      step="0.1"
                      :disabled="processing"
                    />
                    <button class="btn btn-outline-secondary" type="button" @click="setEndToCurrent" :disabled="processing">
                      Use Current
                    </button>
                  </div>
                  <div class="form-text">{{ formatTime(endTime) }}</div>
                </div>

                <div class="col-md-2">
                  <button
                    class="btn btn-primary w-100"
                    @click="convertToGif"
                    :disabled="processing || !videoUrl"
                  >
                    Convert to GIF
                  </button>
                </div>
              </div>

              <div v-if="processing" class="mt-4">
                <div class="progress mb-2">
                  <div
                    class="progress-bar progress-bar-striped progress-bar-animated"
                    role="progressbar"
                    :style="{ width: progress + '%' }"
                  ></div>
                </div>
                <p class="text-center text-muted small">{{ status }}</p>
              </div>

              <div v-if="error" class="alert alert-danger mt-3">
                {{ error }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
