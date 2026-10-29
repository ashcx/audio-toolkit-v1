import {
  WavOutputFormat,
  Mp3OutputFormat,
  Mp4OutputFormat,
  FlacOutputFormat,
  OggOutputFormat,
  Quality,
  canEncodeAudio,
  type AudioEncodingConfig,
  type Mp3OutputFormatOptions,
  type OggOutputFormatOptions,
} from "mediabunny";
import type { Recipe } from "../recipe";
import { exportShapeError } from "../export-format";

export function encoderSettings(
  settings: Recipe["export"],
  events: Pick<Mp3OutputFormatOptions, "onXingFrame"> & Pick<OggOutputFormatOptions, "onPage"> = {},
) {
  const quality =
    "bitrateKbps" in settings
      ? new Quality({ bitrate: settings.bitrateKbps * 1000, bitrateMode: "constant" })
      : undefined;
  const config = (codec: AudioEncodingConfig["codec"]) => ({ codec, quality });
  switch (settings.format) {
    case "wav":
      return { format: new WavOutputFormat(), config: config("pcm-s16") };
    case "mp3":
      return { format: new Mp3OutputFormat(events), config: config("mp3") };
    case "m4a":
      return { format: new Mp4OutputFormat({ fastStart: false }), config: config("aac") };
    case "flac":
      return { format: new FlacOutputFormat(), config: config("flac") };
    case "opus":
      return { format: new OggOutputFormat({ onPage: events.onPage }), config: config("opus") };
    case "original":
      throw new Error("Original audio uses the copy pipeline.");
    default: {
      const unreachable: never = settings;
      throw new Error(String(unreachable));
    }
  }
}

export async function prepareEncoder(
  settings: Recipe["export"],
  shape: { rate: number; channels: number },
): Promise<"pcm" | "native" | "wasm"> {
  const invalidRate = exportShapeError(settings, shape);
  if (invalidRate) throw new Error(invalidRate);
  const { config } = encoderSettings(settings);
  const options = { sampleRate: shape.rate, numberOfChannels: shape.channels, quality: config.quality };
  let backend: "pcm" | "native" | "wasm" = settings.format === "wav" ? "pcm" : "native";
  if (settings.format === "mp3") {
    (await import("@mediabunny/mp3-encoder")).registerMp3Encoder();
    backend = "wasm";
  } else if (settings.format === "flac") {
    (await import("@mediabunny/flac-encoder")).registerFlacEncoder();
    backend = "wasm";
  } else if (settings.format === "m4a") {
    const webkit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg\//.test(navigator.userAgent);
    if (webkit || !(await canEncodeAudio("aac", options))) {
      (await import("../../vendor/aac/encoder.mjs")).registerAacEncoder();
      backend = "wasm";
    }
  }
  if (!(await canEncodeAudio(config.codec, options)))
    throw new Error("This format cannot encode the selected rate and channels. Try another format or sample rate.");
  return backend;
}

