import type { BatchJob } from "./batch.ts";
import { copy } from "./copy.ts";
import type { ErrorCode } from "./errors.ts";
import { formatTime } from "./format.ts";
import type { FileEntry } from "./media.ts";
import type { EffectiveRecipe } from "./recipe.ts";

export type FileMetadata = Readonly<{ primary: string; secondary?: string }>;

function fullRange(trim: NonNullable<EffectiveRecipe["trim"]>, duration: number | null) {
  if (trim.start !== 0) return false;
  return trim.end === null || (duration !== null && trim.end >= duration - 1e-6);
}

export function fileMetadata(
  entry: FileEntry,
  trim: EffectiveRecipe["trim"] | null,
): FileMetadata {
  const duration = entry.inspection.kind === "ready" ? entry.inspection.metadata.duration : null;
  if (!trim || fullRange(trim, duration)) return { primary: duration === null ? copy.trim.unknownDuration : formatTime(duration) };
  const primary = trim.duration === null ? copy.trim.unknownDuration : formatTime(trim.duration);
  const end = trim.end === null ? copy.trim.end : formatTime(trim.end);
  return { primary, secondary: `${formatTime(trim.start)} ${copy.trim.to} ${end}` };
}

/**
 * Where a bad Trim all range is shown. Only a range that fits the settings but not this file
 * belongs under the file. Every other trim problem is a setting problem and shows once, at the step.
 */
export function trimErrorOwner(code: ErrorCode): "file" | "step" {
  return code === "trim-past-end" ? "file" : "step";
}

export function showsPreview(hasSteps: boolean, hasCurrentExport: boolean): boolean {
  return hasSteps && !hasCurrentExport;
}

/** Progress for a running export. Nothing once work has finished. */
export function exportStatus(jobs: readonly Pick<BatchJob, "state">[]): string {
  let finished = 0, running = 0;
  for (const job of jobs) {
    switch (job.state.kind) {
      case "done":
      case "failed":
      case "cancelled": finished++; break;
      case "waiting":
      case "running":
      case "cancelling": running++; break;
    }
  }
  return running ? copy.export.exporting(Math.min(jobs.length, finished + 1), jobs.length) : "";
}
