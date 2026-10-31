import type { AudioCodec } from "mediabunny";
import type { AudioMetadata } from "./media";
import type { EffectiveRecipe, Recipe } from "./recipe";
import { exportShapeError, wavSizeError } from "./export-format.ts";

export type CopyTarget = Readonly<{
  container: "m4a" | "mp3" | "ogg" | "flac" | "wav";
  mime: string;
}>;
const COPY_TARGETS: Partial<Record<AudioCodec, CopyTarget>> = {
  aac: { container: "m4a", mime: "audio/mp4" },
  mp3: { container: "mp3", mime: "audio/mpeg" },
  opus: { container: "ogg", mime: "audio/ogg" },
  vorbis: { container: "ogg", mime: "audio/ogg" },
  flac: { container: "flac", mime: "audio/flac" },
  "pcm-s16": { container: "wav", mime: "audio/wav" },
  "pcm-s24": { container: "wav", mime: "audio/wav" },
  "pcm-s32": { container: "wav", mime: "audio/wav" },
  "pcm-f32": { container: "wav", mime: "audio/wav" },
  "pcm-f64": { container: "wav", mime: "audio/wav" },
  "pcm-u8": { container: "wav", mime: "audio/wav" },
};
export type CopyPlan = Readonly<{
  kind: "copy";
  snapshot: EffectiveRecipe;
  codec: AudioCodec;
  target: CopyTarget;
}>;
export type ExecutionPlan =
  | CopyPlan
  | Readonly<{
      kind: "pcm";
      snapshot: EffectiveRecipe;
      steps: readonly Recipe["steps"][number][];
      reason: string;
    }>
  | Readonly<{ kind: "failed"; message: string }>;

function changesSignal(
  step: Recipe["steps"][number],
  source: AudioMetadata,
): boolean {
  switch (step.kind) {
    case "trim":
      return (
        (step.range.start ?? 0) !== 0 ||
        (step.range.end !== null && step.range.end !== source.duration)
      );
    case "gain":
      return step.db !== 0;
    case "channels":
      return (
        step.channels !== "original" &&
        (step.channels === "mono" ? 1 : 2) !== source.channels
      );
    case "resample":
      return step.rateHz !== "original" && step.rateHz !== source.sampleRate;
    case "normalize":
    case "speech":
    case "isolation":
      return true;
    case "compress":
      return step.enabled && step.amount > 0;
    default: {
      const unreachable: never = step;
      return unreachable;
    }
  }
}
const PCM_REASONS = {
  trim: "Accurate trimming requires re-encoding.",
  gain: "Gain requires re-encoding.",
  normalize: "Normalization requires re-encoding.",
  compress: "Compression requires re-encoding.",
  channels: "Changing channels requires re-encoding.",
  resample: "Changing sample rate requires re-encoding.",
  isolation: "Voice / music isolation requires re-encoding.",
  speech: "Voice isolation requires re-encoding.",
} satisfies Record<Recipe["steps"][number]["kind"], string>;
export function compilePlan(
  snapshot: EffectiveRecipe,
  source: AudioMetadata,
): ExecutionPlan {
  const current = { ...source };
  const steps = snapshot.recipe.steps.filter((step) => {
    const changed = changesSignal(step, current);
    if (step.kind === "channels" && step.channels !== "original")
      current.channels = step.channels === "mono" ? 1 : 2;
    if (step.kind === "resample" && step.rateHz !== "original")
      current.sampleRate = step.rateHz;
    return changed;
  });
  if (snapshot.recipe.export.format === "original") {
    if (steps.length)
      return {
        kind: "failed",
        message: `${PCM_REASONS[steps[0].kind]} Choose another format.`,
      };
    const target = COPY_TARGETS[source.codec];
    if (!target)
      return {
        kind: "failed",
        message:
          "This codec has no supported stream-copy container. Choose another format.",
      };
    return Object.freeze({
      kind: "copy",
      snapshot,
      codec: source.codec,
      target,
    });
  }
  const invalidRate = exportShapeError(snapshot.recipe.export, { rate: current.sampleRate, channels: current.channels });
  if (invalidRate) return { kind: "failed", message: invalidRate };
  const duration = snapshot.trim?.duration ?? source.duration;
  if (snapshot.recipe.export.format === "wav" && duration !== null && current.sampleRate !== null && current.channels !== null) {
    const invalidSize = wavSizeError(Math.round(duration * current.sampleRate), current.channels);
    if (invalidSize) return { kind: "failed", message: invalidSize };
  }
  return Object.freeze({
    kind: "pcm",
    snapshot,
    steps: Object.freeze(steps),
    reason: steps.length
      ? PCM_REASONS[steps[0].kind]
      : "Selected format requires encoding.",
  });
}

export function outputName(
  fileName: string,
  extension: string,
  used: Set<string>,
): string {
  const clean = new TextDecoder().decode(new TextEncoder().encode(fileName)).normalize("NFC")
    .replace(/[<>:"/\\|?*\x00-\x1f\x7f]/g, "_").replace(/^\.+/, "").replace(/[. ]+$/, "");
  let stem = clean.replace(/\.[^.]+$/, "") || "audio";
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(stem)) stem = `_${stem}`;
  let bytes = 0;
  stem = Array.from(stem).filter(character => { bytes += new TextEncoder().encode(character).length; return bytes <= 180; }).join("");
  const occupied = new Set([...used].map(name => name.normalize("NFC").toLowerCase()));
  let name = `${stem}.audio.${extension}`;
  let count = 2;
  while (occupied.has(name.toLowerCase()))
    name = `${stem}.audio (${count++}).${extension}`;
  used.add(name.toLowerCase());
  return name;
}
