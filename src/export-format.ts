import type { Recipe } from "./recipe";

export type EncodedExport = Exclude<Recipe["export"], { format: "original" }>;
const DESCRIPTORS = {
  mp3: { extension: "mp3", mime: "audio/mpeg" },
  m4a: { extension: "m4a", mime: "audio/mp4" },
  wav: { extension: "wav", mime: "audio/wav" },
  flac: { extension: "flac", mime: "audio/flac" },
  opus: { extension: "ogg", mime: "audio/ogg" },
} satisfies Record<EncodedExport["format"], { extension: string; mime: string }>;

export function exportDescriptor(settings: Recipe["export"]) {
  if (settings.format === "original")
    throw new Error("Original audio uses the copy pipeline.");
  return DESCRIPTORS[settings.format];
}

export function exportShapeError(
  settings: Recipe["export"],
  { rate, channels }: { rate: number | null; channels: number | null },
) {
  if (
    settings.format === "opus" &&
    rate !== null &&
    ![8000, 12000, 16000, 24000, 48000].includes(rate)
  )
    return "Opus needs 16, 24 or 48 kHz. Add a sample rate step.";
  if (settings.format === "mp3" && rate !== null && rate < 32000 && settings.bitrateKbps > 160)
    return "At this sample rate, choose MP3 at 128 kbps or increase the sample rate.";
  if (settings.format === "m4a" && rate !== null && channels !== null && settings.bitrateKbps * 1000 > 6 * rate * channels)
    return "AAC bitrate is too high for this rate and channel count. Lower the bitrate or increase the sample rate.";
  return null;
}

export function wavSizeError(frames: number, channels: number) {
  return frames * channels * 2 + 4096 >= 0xffffffff
    ? "Processed WAV output must be smaller than 4 GB."
    : null;
}
