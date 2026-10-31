import { useLayoutEffect, useState } from "preact/hooks";
import type { FileEntry } from "./media";
import { formatBytes, formatTime } from "./format";
import { resolveTrim, type TrimRangeDraft } from "./recipe";
import { fileMetadata, showsPreview } from "./file-summary";
import type { ExecutionPlan } from "./planner";
import type { BatchJob } from "./batch";
import type { JobOperation, IsolationDevice } from "./job-events";
import type { PreviewState } from "./preview";
const DEVICES: Record<IsolationDevice, { label: string; description: string }> = {
  "preparing-gpu": { label: "Trying GPU", description: "Checking GPU-assisted separation. Processing has not succeeded yet." },
  gpu: { label: "GPU + CPU", description: "GPU-assisted mode with CPU support. This does not measure GPU utilization." },
  cpu: { label: "CPU", description: "Separation is using CPU mode." },
  "cpu-fallback": { label: "CPU · switched from GPU", description: "GPU processing failed or stopped responding. Separation switched to CPU mode." },
};
function operationLabel(operation: JobOperation) {
  switch (operation.kind) {
    case "phase": return `${operation.phase}…`;
    case "model-download": return `Loading model ${formatBytes(operation.loaded)} / ${formatBytes(operation.total)}`;
    case "isolation-progress": return `Separating ${operation.completed} / ${operation.total}`;
  }
}
const pauseOthers = (event: Event) => {
  const current = event.currentTarget;
  for (const audio of document.querySelectorAll("audio"))
    if (audio !== current) audio.pause();
};
function SourcePlayer({ entry }: { entry: FileEntry }) {
  const [url] = useState(() => URL.createObjectURL(entry.file));
  const [playable] = useState(() => {
    const audio = document.createElement("audio");
    return entry.file.type !== "" && audio.canPlayType(entry.file.type) !== "";
  });
  useLayoutEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <div class="file-player">
    <small>Original</small>
    {playable
      ? <audio controls preload="none" src={url} aria-label={`Play original ${entry.file.name}`} onPlay={pauseOthers} />
      : <small class="file-note">This source cannot play in the browser. Export it to hear the result.</small>}
  </div>;
}
export function FileRow({
  entry,
  plan,
  job,
  busy,
  downloadBusy,
  onCancel,
  onRetry,
  trim,
  onRemove,
  preview,
  previewDisabled,
  hasRecipeSteps,
  onPreview,
  onClearPreview,
}: {
  preview: Exclude<PreviewState, { kind: "idle" }> | undefined;
  previewDisabled: boolean;
  hasRecipeSteps: boolean;
  onPreview: () => void;
  onClearPreview: () => void;
  entry: FileEntry;
  plan: ExecutionPlan | null;
  job: BatchJob | undefined;
  busy: boolean;
  downloadBusy: boolean;
  onCancel: () => void;
  onRetry: () => void;
  trim: TrimRangeDraft | undefined;
  onRemove: () => void;
}) {
  const exported = job?.state;
  const operation = exported?.kind === "running" ? exported.operation : null;
  const progress = operation && operation.kind !== "phase"
    ? { value: operation.kind === "model-download" ? operation.loaded : operation.completed, max: operation.total }
    : {};
  const result =
    trim && entry.inspection.kind === "ready"
      ? resolveTrim(trim, entry.inspection.metadata.duration)
      : null;
  const previousSettings =
    exported &&
    (!plan || plan.kind === "failed" ||
      JSON.stringify(plan.snapshot.recipe) !== JSON.stringify(job?.spec.plan.snapshot.recipe));
  const errorId =
    result?.kind === "failed" ? `trim-error-${entry.id}` : undefined;
  const effective = result?.kind === "ready" ? result.trim : null;
  const metadata = entry.inspection.kind === "ready" ? fileMetadata(entry, effective) : null;
  const currentExport = exported?.kind === "done" && !previousSettings;
  const previewVisible = showsPreview(hasRecipeSteps, currentExport);
  const exportedPlayable = exported?.kind === "done" &&
    document.createElement("audio").canPlayType(exported.output.mime) !== "";
  const downloadLabel = previousSettings
    ? `Download previous export for ${entry.file.name}`
    : `Download exported audio for ${entry.file.name}`;
  return (
    <li data-file-id={entry.id} data-inspection={entry.inspection.kind} data-job-state={exported?.kind}>
      <span class="file-name" title={entry.file.name}>
        {entry.file.name}
        <small>
          {entry.inspection.kind === "ready" && metadata
            ? `${metadata.primary}${metadata.secondary ? ` · ${metadata.secondary}` : ""}`
            : entry.inspection.kind === "reading" ? "Reading…"
              : entry.inspection.kind === "waiting" ? "Waiting" : ""}
        </small>
        {entry.inspection.kind === "failed" && (
          <small class="file-error" role="status">
            {entry.inspection.message}
          </small>
        )}
        {plan?.kind === "failed" && result?.kind !== "failed" && (
          <small class="file-error" role="status">
            {plan.message}
          </small>
        )}
        {result?.kind === "failed" && (
          <small id={errorId} class="file-error" role="status">
            {result.message}
          </small>
        )}
      </span>
      <div class="file-actions">
        {previewVisible && entry.inspection.kind === "ready" &&
          <button type="button" disabled={previewDisabled || result?.kind === "failed"}
            aria-label={`Preview ${entry.file.name}`} aria-describedby={errorId} onClick={onPreview}>Preview</button>}
        {exported?.kind === "done" &&
          <a class="icon-button download-button" href={exported.url} download={exported.output.name}
            aria-label={downloadLabel} title={`${downloadLabel} (${exported.output.name})`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 19h16" />
            </svg>
          </a>}
        <button
          class="icon-button"
          type="button"
          disabled={downloadBusy} data-remove-file={entry.id}
          aria-label={`Remove ${entry.file.name}`}
          onClick={onRemove}
        >
          ×
        </button>
      </div>
      {entry.inspection.kind === "ready" && !preview && <SourcePlayer entry={entry} />}
      {preview && <div class="file-preview" data-preview-state={preview.kind}>
        {preview.kind === "ready" ? <>
          <small>Preview · {formatTime(preview.range.start)} to {formatTime(preview.range.end)} · WAV comparison</small>
          {preview.estimate && <small>Excerpt estimate. Normalization and isolation may differ with full-track context.</small>}
          <label>Original excerpt<audio controls preload="none" src={preview.original} aria-label={`Original preview ${entry.file.name}`} onPlay={pauseOthers} /></label>
          <label>Processed preview<audio controls preload="none" src={preview.processed} aria-label={`Processed preview ${entry.file.name}`} onPlay={pauseOthers} /></label>
          <button type="button" onClick={onClearPreview}>Close preview</button>
        </> : preview.kind === "running" ? <>
          <span role="status">Preview · {preview.stage === "original" ? "Preparing original" : "Processing excerpt"} · {preview.operation.kind === "isolation-device" ? DEVICES[preview.operation.device].label : operationLabel(preview.operation)}</span>
          <button type="button" onClick={onClearPreview}>Cancel preview</button>
        </> : preview.kind === "cleanup" ? <>
          <span role="status">{preview.message}</span><button type="button" onClick={onClearPreview}>Retry preview cleanup</button>
        </> : <span role="status">{preview.kind === "failed" ? preview.message : preview.kind === "cancelling" ? "Cancelling preview…" : "Cleaning up preview…"}</span>}
      </div>}
      {exported && (
        <div class="file-result" role="status">
          {job?.device && exported.kind === "running" && <span class="device-badge" aria-label="Separation processor" title={DEVICES[job.device].description}>{DEVICES[job.device].label}</span>}
          {exported.kind === "waiting" || exported.kind === "running" || exported.kind === "cancelling" ? (
            <>
              <progress aria-label={`Export ${entry.file.name}`} {...progress} />
              <span>{operation ? operationLabel(operation) : exported.kind === "waiting" ? "Waiting" : "Cancelling…"}</span>
              {exported.kind !== "cancelling" && <button type="button" aria-label={`Cancel ${entry.file.name}`} onClick={onCancel}>Cancel</button>}
            </>
          ) : exported.kind === "failed" || exported.kind === "cancelled" ? (
            <>
              <span>{exported.kind === "failed" ? exported.message : "Cancelled"}</span>
              <button type="button" disabled={busy} aria-label={`Retry ${entry.file.name}`} onClick={onRetry}>Retry</button>
            </>
          ) : (
            <>
              <small>{previousSettings ? "Previous export" : "Exported audio"}</small>
              {job?.spec.plan.kind === "copy" && <small>No re-encoding.</small>}
              {exportedPlayable
                ? <audio controls preload="none" src={exported.url} aria-label={`Play exported audio ${entry.file.name}`} onPlay={pauseOthers} />
                : <small class="file-note">This exported format cannot play here. Download it to listen.</small>}
              {exported.report.kind === "pcm" &&
                exported.report.stats.limitedNormalizations > 0 && (
                  <small>Normalization limited.</small>
                )}
              {exported.report.kind === "pcm" &&
                exported.report.stats.clippedSamples > 0 && (
                  <small class="file-error">Clipped samples.</small>
                )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
