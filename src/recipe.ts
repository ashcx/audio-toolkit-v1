import { z } from "zod";
import { copy } from "./copy.ts";
import { GENERIC_ERROR, failure, internalIssue, isErrorCode, type Failure } from "./errors.ts";
import type { AudioMetadata, FileEntry, FileId } from "./media";

const sourceSeconds = z
  .number({ error: "time-invalid" })
  .finite("time-invalid")
  .nonnegative("time-negative")
  .brand<"SourceSeconds">();
export const trimRangeSchema = z
  .strictObject({
    start: sourceSeconds.nullable(),
    end: sourceSeconds.nullable(),
  })
  .superRefine((range, context) => {
    if (range.end !== null && (range.start ?? 0) >= range.end)
      context.addIssue({
        code: "custom",
        message: "trim-order",
        path: ["end"],
      });
  })
  .readonly();
const stepId = z.string().uuid().brand<"StepId">();
const rate = z.union([
  z.literal("original"),
  z.literal(16000),
  z.literal(24000),
  z.literal(32000),
  z.literal(44100),
  z.literal(48000),
]);
export const CHANNEL_SOURCES = ["both", "left", "right"] as const;
export type ChannelSource = (typeof CHANNEL_SOURCES)[number];
export const stepSchema = z
  .discriminatedUnion("kind", [
    z.strictObject({
      id: stepId,
      kind: z.literal("trim"),
      range: trimRangeSchema,
    }),
    z.strictObject({
      id: stepId,
      kind: z.literal("gain"),
      db: z
        .number({ error: "number-invalid" })
        .finite("number-invalid")
        .min(-12, "gain-range")
        .max(12, "gain-range")
        .brand<"GainDb">(),
    }),
    z
      .strictObject({
        id: stepId,
        kind: z.literal("normalize"),
        mode: z.enum(["loudness", "peak"]).default("peak"),
        targetDbfs: z
          .number({ error: "number-invalid" })
          .finite("number-invalid")
          .min(-60, "peak-range")
          .max(0, "peak-range")
          .brand<"PeakTargetDbfs">()
          .optional(),
        targetDbtp: z
          .number({ error: "number-invalid" })
          .finite("number-invalid")
          .min(-6, "true-peak-range")
          .max(0, "true-peak-range")
          .refine(
            (value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9,
            "true-peak-step",
          )
          .brand<"TruePeakTargetDbtp">()
          .optional(),
        targetLufs: z
          .number({ error: "number-invalid" })
          .finite("number-invalid")
          .min(-30, "loudness-range")
          .max(-8, "loudness-range")
          .refine(
            (value) => Math.abs(value * 2 - Math.round(value * 2)) < 1e-9,
            "loudness-step",
          )
          .brand<"LoudnessTargetLufs">()
          .optional(),
        ceilingDbtp: z
          .number({ error: "number-invalid" })
          .finite("number-invalid")
          .min(-6, "ceiling-range")
          .max(0, "ceiling-range")
          .refine(
            (value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9,
            "ceiling-step",
          )
          .brand<"TruePeakCeilingDbtp">()
          .optional(),
      })
      .superRefine((step, context) => {
        const reject = (field: "targetDbfs" | "targetDbtp" | "targetLufs" | "ceilingDbtp", message: string) =>
          context.addIssue({ code: "custom", message, path: [field] });
        if (step.mode === "loudness") {
          if (step.targetLufs === undefined)
            reject("targetLufs", internalIssue("Loudness mode requires a loudness target."));
          if (step.ceilingDbtp === undefined)
            reject("ceilingDbtp", internalIssue("Loudness mode requires a true-peak ceiling."));
          if (step.targetDbfs !== undefined)
            reject("targetDbfs", internalIssue("Loudness mode cannot also use a peak target."));
          if (step.targetDbtp !== undefined)
            reject("targetDbtp", internalIssue("Loudness mode cannot also use a true-peak target."));
        } else {
          if (step.targetDbtp !== undefined && step.targetDbfs !== undefined)
            reject("targetDbfs", internalIssue("Peak mode cannot use both sample peak and true peak."));
          if (step.targetDbtp === undefined && step.targetDbfs === undefined)
            reject("targetDbtp", internalIssue("Peak mode requires a peak target."));
          if (step.targetLufs !== undefined)
            reject("targetLufs", internalIssue("Peak mode cannot also use a loudness target."));
          if (step.ceilingDbtp !== undefined)
            reject("ceilingDbtp", internalIssue("Peak mode cannot also use a true-peak ceiling."));
        }
      }),
    z.strictObject({
      id: stepId,
      kind: z.literal("compress"),
      enabled: z.boolean(),
      amount: z
        .number({ error: "number-invalid" })
        .finite()
        .min(0, "compression-range")
        .max(100, "compression-range"),
      preset: z.enum(["speech", "music"]),
    }),
    z.strictObject({
      id: stepId,
      kind: z.literal("channels"),
      channels: z.enum(["original", "mono", "stereo"]),
      source: z.enum(CHANNEL_SOURCES).default("both"),
    }),
    z.strictObject({ id: stepId, kind: z.literal("resample"), rateHz: rate }),
    z.strictObject({ id: stepId, kind: z.literal("speech"), model: z.enum(["standard", "detailed"]) }),
    z.strictObject({
      id: stepId,
      kind: z.literal("isolation"),
      keep: z.enum(["voice", "music"]),
    }),
  ])
  .readonly();
export const exportSchema = z
  .discriminatedUnion("format", [
    z.strictObject({ format: z.literal("original") }),
    z.strictObject({ format: z.literal("wav") }),
    z.strictObject({ format: z.literal("flac") }),
    z.strictObject({
      format: z.literal("mp3"),
      mode: z.literal("cbr").default("cbr"),
      bitrateKbps: z.union([
        z.literal(128),
        z.literal(192),
        z.literal(256),
        z.literal(320),
      ]),
    }),
    z.strictObject({
      format: z.literal("m4a"),
      mode: z.literal("vbr").default("vbr"),
      bitrateKbps: z.union([z.literal(128), z.literal(192), z.literal(256)]),
    }),
    z.strictObject({
      format: z.literal("opus"),
      mode: z.enum(["cbr", "vbr"]).default("cbr"),
      bitrateKbps: z.union([
        z.literal(64),
        z.literal(96),
        z.literal(128),
        z.literal(160),
        z.literal(192),
      ]),
    }),
  ])
  .readonly();
export const recipeSchema = z
  .strictObject({
    version: z.literal(1),
    steps: z.array(stepSchema).readonly(),
    export: exportSchema,
  })
  .superRefine((recipe, context) => {
    const seen = new Set<string>();
    let trim = false,
      isolation = false,
      speech = false;
    recipe.steps.forEach((step, index) => {
      const issue = (message: string) =>
        context.addIssue({ code: "custom", message, path: ["steps", index] });
      if (seen.has(step.id)) issue(internalIssue("Each step needs a unique identity."));
      seen.add(step.id);
      if (step.kind === "trim") {
        if (trim) issue(internalIssue("Use only one Trim all step."));
        trim = true;
      }
      if (step.kind === "speech") {
        if (speech) issue(internalIssue("Use only one Voice isolation step."));
        speech = true;
      }
      if (step.kind === "isolation") {
        if (isolation) issue(internalIssue("Use only one voice/music isolation step."));
        isolation = true;
      }
    });
  })
  .readonly()
  .brand<"ValidatedRecipe">();
export type RecipeDraft = z.input<typeof recipeSchema>;
export type Recipe = z.output<typeof recipeSchema>;
export type StepDraft = z.input<typeof stepSchema>;
export type StepKind = StepDraft["kind"];
export type TrimRangeDraft = z.input<typeof trimRangeSchema>;
export type ExportDraft = z.input<typeof exportSchema>;
export type ExportFormat = ExportDraft["format"];
export const STEP_NAMES: Readonly<Record<StepKind, string>> = copy.steps.names;
export const FORMAT_NAMES: Readonly<Record<ExportFormat, string>> = copy.export.formats;
export function isStepKind(value: string): value is StepKind {
  return Object.hasOwn(STEP_NAMES, value);
}
export function isExportFormat(value: string): value is ExportFormat {
  return Object.hasOwn(FORMAT_NAMES, value);
}
export function newExport(format: ExportFormat): ExportDraft {
  switch (format) {
    case "mp3":
      return { format, mode: "cbr", bitrateKbps: 192 };
    case "m4a":
      return { format, mode: "vbr", bitrateKbps: 192 };
    case "opus":
      return { format, mode: "cbr", bitrateKbps: 128 };
    case "original":
    case "wav":
    case "flac":
      return { format };
    default: {
      const unreachable: never = format;
      return unreachable;
    }
  }
}
export function newRecipe(): RecipeDraft {
  return { version: 1, steps: [], export: newExport("mp3") };
}
export function newStep(kind: StepKind): StepDraft {
  const id = crypto.randomUUID();
  switch (kind) {
    case "trim":
      return { id, kind, range: { start: null, end: null } };
    case "gain":
      return { id, kind, db: 0 };
    case "normalize":
      return {
        id,
        kind,
        mode: "loudness",
        targetLufs: -14,
        ceilingDbtp: -0.3,
      };
    case "compress":
      return { id, kind, enabled: true, amount: 50, preset: "speech" };
    case "channels":
      return { id, kind, channels: "original", source: "both" };
    case "resample":
      return { id, kind, rateHz: "original" };
    case "isolation":
      return { id, kind, keep: "voice" };
    case "speech":
      return { id, kind, model: "standard" };
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}
export function moveStep(
  recipe: RecipeDraft,
  from: number,
  to: number,
): RecipeDraft {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= recipe.steps.length ||
    to >= recipe.steps.length
  )
    return recipe;
  const steps = [...recipe.steps];
  const [step] = steps.splice(from, 1);
  steps.splice(to, 0, step);
  return { ...recipe, steps };
}
export type EffectiveRecipe = Readonly<{
  fileId: FileId;
  recipe: Recipe;
  sourceStartTime: number;
  source: Readonly<AudioMetadata>;
  trim: Readonly<{
    start: number;
    end: number | null;
    duration: number | null;
  }> | null;
}>;
export type SnapshotResult =
  | { kind: "ready"; snapshot: EffectiveRecipe }
  | ({ kind: "failed" } & Failure);
export function snapshotForFile(
  recipe: Recipe,
  entry: FileEntry,
): SnapshotResult {
  if (entry.inspection.kind !== "ready")
    return entry.inspection.kind === "failed"
      ? { kind: "failed", code: entry.inspection.code, message: entry.inspection.message }
      : { kind: "failed", ...failure(GENERIC_ERROR) };
  const meta = entry.inspection.metadata;
  const trim = recipe.steps.find((step) => step.kind === "trim");
  if (!trim)
    return {
      kind: "ready",
      snapshot: Object.freeze({
        fileId: entry.id,
        recipe,
        sourceStartTime: meta.startTime,
        source: Object.freeze({ ...meta }),
        trim: null,
      }),
    };
  const resolved = resolveTrim(trim.range, meta.duration);
  if (resolved.kind === "failed") return resolved;
  const { start, end } = resolved.trim;
  const perFile = recipeSchema.parse({
    ...recipe,
    steps: recipe.steps.map((step) =>
      step.kind === "trim" ? { ...step, range: { start, end } } : step,
    ),
  });
  return {
    kind: "ready",
    snapshot: Object.freeze({
      fileId: entry.id,
      recipe: perFile,
      sourceStartTime: meta.startTime,
      source: Object.freeze({ ...meta }),
      trim: resolved.trim,
    }),
  };
}

export function resolveTrim(
  range: TrimRangeDraft,
  sourceDuration: number | null,
):
  | { kind: "ready"; trim: NonNullable<EffectiveRecipe["trim"]> }
  | ({ kind: "failed" } & Failure) {
  const parsed = trimRangeSchema.safeParse(range);
  if (!parsed.success) {
    const code = parsed.error.issues.map((issue) => issue.message).find(isErrorCode) ?? "time-invalid";
    return { kind: "failed", ...failure(code) };
  }
  const start = parsed.data.start ?? 0;
  const end =
    sourceDuration === null
      ? parsed.data.end
      : Math.min(parsed.data.end ?? sourceDuration, sourceDuration);
  if (end !== null && start >= end)
    return { kind: "failed", ...failure("trim-past-end") };
  return {
    kind: "ready",
    trim: Object.freeze({
      start,
      end,
      duration: end === null ? null : end - start,
    }),
  };
}
