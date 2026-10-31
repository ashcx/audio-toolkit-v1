import type { BatchJob } from "./batch.ts";
import { formatDuration, formatTime } from "./format.ts";
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
  if (!trim || fullRange(trim, duration)) return { primary: formatDuration(duration) };
  const primary = trim.duration === null ? "Duration unknown" : formatTime(trim.duration);
  const end = trim.end === null ? "end" : formatTime(trim.end);
  return { primary, secondary: `${formatTime(trim.start)} to ${end}` };
}

export function showsPreview(hasSteps: boolean, hasCurrentExport: boolean): boolean {
  return hasSteps && !hasCurrentExport;
}

export function exportStatus(jobs: readonly Pick<BatchJob, "state">[]): string {
  const total = jobs.length;
  if (!total) return "";
  let done = 0, active = 0, failed = 0, cancelled = 0, waiting = 0;
  for (const job of jobs) {
    switch (job.state.kind) {
      case "done": done++; break;
      case "waiting": waiting++; break;
      case "running":
      case "cancelling": active++; break;
      case "failed": failed++; break;
      case "cancelled": cancelled++; break;
    }
  }
  const parts: string[] = [];
  const processing = active + waiting;
  if (processing) parts.push(`${processing}/${total} processing`);
  if (done) parts.push(`${done}/${total} done`);
  if (failed) parts.push(`${failed}/${total} failed`);
  if (cancelled) parts.push(`${cancelled}/${total} cancelled`);
  return parts.join(" · ");
}
