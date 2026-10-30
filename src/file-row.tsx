import { useState } from "preact/hooks";
import type { FileEntry } from "./media";
import { formatBytes, formatDuration } from "./format";
import { resolveTrim, type TrimRangeDraft } from "./recipe";
import type { ExecutionPlan } from "./planner";
import type { BatchJob } from "./batch";
import type { JobOperation, IsolationDevice } from "./job-events";
import { TrimFields } from "./trim-fields";
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
export function FileRow({
  entry,
  plan,
  job,
  busy,
  downloadBusy,
  onCancel,
  onRetry,
  trim,
  override,
  onOverride,
  onReset,
  onRemove,
}: {
  entry: FileEntry;
  plan: ExecutionPlan | null;
  job: BatchJob | undefined;
  busy: boolean;
  downloadBusy: boolean;
  onCancel: () => void;
  onRetry: () => void;
  trim: TrimRangeDraft | undefined;
  override: TrimRangeDraft | undefined;
  onOverride: (range: TrimRangeDraft) => void;
  onReset: () => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const exported = job?.state;
  const operation = exported?.kind === "running" ? exported.operation : null;
  const progress = operation && operation.kind !== "phase"
    ? { value: operation.kind === "model-download" ? operation.loaded : operation.completed, max: operation.total }
    : {};
  const result =
    trim && entry.inspection.kind === "ready"
      ? resolveTrim(override ?? trim, entry.inspection.metadata.duration)
      : null;
  const previousSettings =
    exported &&
    (!plan || plan.kind === "failed" ||
      JSON.stringify(plan.snapshot.recipe) !== JSON.stringify(job?.spec.plan.snapshot.recipe));
  const errorId =
    result?.kind === "failed" ? `trim-error-${entry.id}` : undefined;
  const effective = result?.kind === "ready" ? result.trim : null;
  const short = (seconds: number) => Number(seconds.toFixed(3));
  return (
    <li data-file-id={entry.id} data-inspection={entry.inspection.kind} data-job-state={exported?.kind}>
      <span class="file-name" title={entry.file.name}>
        {entry.file.name}
        <small>
          {entry.inspection.kind === "ready" ? formatDuration(entry.inspection.metadata.duration) : entry.inspection.kind === "reading" ? "Reading…" : entry.inspection.kind === "waiting" ? "Waiting" : ""}
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
        {effective && (
          <small>
            {short(effective.start)} s to{" "}
            {effective.end === null ? "end" : `${short(effective.end)} s`}
            {effective.duration === null
              ? ""
              : ` · ${short(effective.duration)} s kept`}
            {override ? " · Custom" : ""}
          </small>
        )}
        {result?.kind === "failed" && (
          <small id={errorId} class="file-error" role="status">
            {result.message}
          </small>
        )}
      </span>
      <div class="file-actions">
        {trim && entry.inspection.kind === "ready" && (
          <button
            type="button"
            disabled={busy}
            aria-label={`Trim ${entry.file.name}`}
            aria-describedby={errorId}
            aria-expanded={editing}
            onClick={() => setEditing(!editing)}
          >
            Trim
          </button>
        )}
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
      {exported && (
        <div class="file-result" role="status">
          {previousSettings && <small>Previous settings</small>}
          {job?.device && (exported.kind === "running" || exported.kind === "done") && <span class="device-badge" aria-label="Separation processor" title={DEVICES[job.device].description}>{DEVICES[job.device].label}</span>}
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
              {exported.report.kind === "pcm" &&
                exported.report.stats.limitedNormalizations > 0 && (
                  <small>Normalization limited.</small>
                )}
              {exported.report.kind === "pcm" &&
                exported.report.stats.clippedSamples > 0 && (
                  <small class="file-error">Clipped samples.</small>
                )}
              <a
                class="button"
                href={exported.url}
                download={exported.output.name}
              >
                Download
              </a>
              {document.createElement("audio").canPlayType(exported.output.mime) && <details class="playback"><summary>Listen</summary><audio controls preload="none" src={exported.url} aria-label={`Play ${entry.file.name}`} /></details>}
            </>
          )}
        </div>
      )}
      {trim && editing && (
        <fieldset
          disabled={busy}
          class="file-trim"
          role="group"
          aria-label={`Trim range for ${entry.file.name}`}
        >
          <TrimFields
            errorId={errorId}
            range={override ?? trim}
            prefix={`Trim ${entry.file.name}`}
            onChange={onOverride}
          />
          {override ? (
            <button class="text-button" type="button" onClick={onReset}>
              Use batch range
            </button>
          ) : (
            <small class="range-origin">Batch range</small>
          )}
        </fieldset>
      )}
    </li>
  );
}
