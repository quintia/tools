<script setup lang="ts">
import * as gifenc from "gifenc";
import type { Movie, MP4BoxBuffer, Sample } from "mp4box";
import * as MP4Box from "mp4box";
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

const extractVideoSamples = async (arrayBuffer: ArrayBuffer) => {
	const mp4boxfile = MP4Box.createFile();

	let videoTrack: Movie["videoTracks"][number] | undefined;
	let trackBox: unknown | null = null;
	const samples: Sample[] = [];
	let samplesResolved = false;
	let resolveSamples!: (value: Sample[]) => void;
	let rejectSamples!: (reason?: string) => void;

	const samplesPromise = new Promise<Sample[]>((resolve, reject) => {
		resolveSamples = (value) => {
			if (samplesResolved) return;
			samplesResolved = true;
			resolve(value);
		};
		rejectSamples = (reason) => {
			if (samplesResolved) return;
			samplesResolved = true;
			reject(reason);
		};
	});

	const infoPromise = new Promise<Movie>((resolve, reject) => {
		mp4boxfile.onError = (e: string) => {
			reject(e);
			rejectSamples(e);
		};
		mp4boxfile.onReady = (info: Movie) => {
			videoTrack = info.videoTracks[0];
			if (!videoTrack) {
				const err = "No video track found.";
				reject(err);
				rejectSamples(err);
				return;
			}
			trackBox = mp4boxfile.getTrackById(videoTrack.id);
			mp4boxfile.setExtractionOptions(videoTrack.id, null, {
				nbSamples: 100000,
			});
			mp4boxfile.start();
			resolve(info);
		};
	});

	mp4boxfile.onSamples = (_id, _user, newSamples) => {
		samples.push(...newSamples);
		if (
			videoTrack &&
			videoTrack.nb_samples > 0 &&
			samples.length >= videoTrack.nb_samples
		) {
			resolveSamples(samples);
		}
	};

	(arrayBuffer as MP4BoxBuffer).fileStart = 0;
	mp4boxfile.appendBuffer(arrayBuffer as MP4BoxBuffer);
	mp4boxfile.flush();

	const info = await infoPromise;
	const resolvedTrack = videoTrack ?? info.videoTracks[0];
	if (!resolvedTrack) throw new Error("No video track found.");

	await new Promise((r) => setTimeout(r, 0));
	if (!samplesResolved) resolveSamples(samples);
	const extractedSamples = await samplesPromise;

	return { track: resolvedTrack, trackBox, samples: extractedSamples };
};

const convertToGif = async () => {
	if (!file.value) return;
	processing.value = true;
	error.value = "";
	progress.value = 0;
	status.value = "Initializing...";
	resultUrl.value = "";

	try {
		const arrayBuffer = await file.value.arrayBuffer();

		status.value = "Extracting samples...";
		const { track, trackBox, samples } = await extractVideoSamples(arrayBuffer);

		const canvas = document.createElement("canvas");

		const ctx = canvas.getContext("2d", { willReadFrequently: true });

		if (!ctx) throw new Error("Could not get canvas context");

		const gifWidth = Math.min(track.track_width, 480);

		const gifHeight = Math.round(
			(gifWidth / track.track_width) * track.track_height,
		);

		canvas.width = gifWidth;

		canvas.height = gifHeight;

		const writer = gifenc.GIFEncoder();

		const frames: VideoFrame[] = [];

		const decoder = new VideoDecoder({
			output: (frame) => {
				const timestamp = frame.timestamp / 1000000;

				if (timestamp >= startTime.value && timestamp <= endTime.value) {
					frames.push(frame);
				} else {
					frame.close();
				}
			},

			error: (e) => {
				error.value = `Decoding error: ${e.message}`;
			},
		});

		const config = {
			codec: track.codec,

			codedWidth: track.track_width,

			codedHeight: track.track_height,

			description: getTrackDescription(trackBox),
		};

		decoder.configure(config as VideoDecoderConfig);

		for (const sample of samples) {
			if (sample.data) {
				decoder.decode(
					new EncodedVideoChunk({
						type: sample.is_sync ? "key" : "delta",

						timestamp: (sample.cts * 1000000) / sample.timescale,

						duration: (sample.duration * 1000000) / sample.timescale,

						data: sample.data,
					}),
				);
			}
		}

		await decoder.flush();

		status.value = `Processing ${frames.length} frames...`;

		const totalFrames = frames.length;

		if (totalFrames === 0) {
			const sampleCount = samples.length;

			const firstSampleTime =
				samples.length > 0
					? (samples[0].cts * 1000000) / samples[0].timescale / 1000000
					: "N/A";

			throw new Error(
				`No frames were decoded from the selected range. (Samples: ${sampleCount}, Start: ${startTime.value}, End: ${endTime.value}, First Sample: ${firstSampleTime}s). Try checking the console for more details.`,
			);
		}

		for (let i = 0; i < frames.length; i++) {
			const frame = frames[i];
			ctx.drawImage(frame, 0, 0, gifWidth, gifHeight);
			const imageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
			const rgba = imageData.data;

			// Quantize and apply palette for each frame
			const palette = gifenc.quantize(rgba, 256);
			const index = gifenc.applyPalette(rgba, palette);

			writer.writeFrame(index, gifWidth, gifHeight, {
				palette,
				delay: 100, // 100ms
				transparent: false,
			});

			frame.close();
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

const getTrackDescription = (track: unknown) => {
	if (!track) return undefined;
	const t = track as {
		mdia: {
			minf: {
				stbl: {
					stsd: {
						entries: {
							avcC?: { write: (stream: MP4Box.DataStream) => void };
							hvcC?: { write: (stream: MP4Box.DataStream) => void };
							vpcC?: { write: (stream: MP4Box.DataStream) => void };
							av1C?: { write: (stream: MP4Box.DataStream) => void };
						}[];
					};
				};
			};
		};
	};
	const entry = t.mdia.minf.stbl.stsd.entries[0];
	const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C;
	if (box) {
		const stream = new MP4Box.DataStream();
		stream.endianness = MP4Box.Endianness.BIG_ENDIAN;
		box.write(stream);
		return (stream as { buffer: ArrayBuffer }).buffer.slice(8);
	}
	return undefined;
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
