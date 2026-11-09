import type { ErrorCode } from "./errors.ts";
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

/** Sample rates the Opus encoder accepts. Any other rate is converted to the fallback before encoding. */
export const OPUS_RATES: readonly number[] = [8000, 12000, 16000, 24000, 48000];
const OPUS_FALLBACK_RATE = 48000;

/** The rate the encoder receives for audio that arrives at `rate`. Equal to `rate` unless the format cannot take it. */
export function encoderRate(settings: Recipe["export"], rate: number): number {
  return settings.format === "opus" && !OPUS_RATES.includes(rate) ? OPUS_FALLBACK_RATE : rate;
}

/** A rate or channel layout the chosen format cannot take, as an error code, or null when it fits. */
export function exportShapeError(
  settings: Recipe["export"],
  { rate, channels }: { rate: number | null; channels: number | null },
): ErrorCode | null {
  if (settings.format === "mp3" && rate !== null && rate < 32000 && settings.bitrateKbps > 160)
    return "mp3-bitrate";
  if (settings.format === "m4a" && rate !== null && channels !== null && settings.bitrateKbps * 1000 > 6 * rate * channels)
    return "aac-bitrate";
  return null;
}

export function wavSizeError(frames: number, channels: number): ErrorCode | null {
  return frames * channels * 2 + 4096 >= 0xffffffff ? "wav-too-large" : null;
}
