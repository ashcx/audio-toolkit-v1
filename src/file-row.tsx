import { useState } from "preact/hooks";
import type { FileEntry } from "./media";
import { formatBytes, describeAudio } from "./format";
import { resolveTrim, type TrimRangeDraft } from "./recipe";
import type { ExecutionPlan } from "./planner";
import type { BatchJob } from "./batch";
import { TrimFields } from "./trim-fields";
export function FileRow({
  entry,
  plan,
  job,
  busy,
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
      <span class="file-name">
        {entry.file.name}
        <small>
          {formatBytes(entry.file.size)}
          {entry.inspection.kind === "ready"
            ? ` · ${describeAudio(entry.inspection.metadata)}`
            : entry.inspection.kind === "failed"
              ? ""
              : ` · ${entry.inspection.kind === "reading" ? "Reading…" : "Waiting"}`}
        </small>
        {entry.inspection.kind === "failed" && (
          <small class="file-error" role="status">
            {entry.inspection.message}
          </small>
        )}
        {plan?.kind === "copy" && (
          <small>Copy · {plan.target.container.toUpperCase()}</small>
        )}
        {plan?.kind === "pcm" && <small title={plan.reason}>Re-encode</small>}
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
          data-remove-file={entry.id}
          aria-label={`Remove ${entry.file.name}`}
          onClick={onRemove}
        >
          ×
        </button>
      </div>
      {exported && (
        <div class="file-result" role="status">
          {previousSettings && <small>Previous settings</small>}
          {exported.kind === "waiting" || exported.kind === "running" || exported.kind === "cancelling" ? (
            <>
              <progress aria-label={`Export ${entry.file.name}`} />
              <span>{exported.kind === "running" ? `${exported.operation}…` : exported.kind === "waiting" ? "Waiting" : "Cancelling…"}</span>
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
              <small>
                {exported.output.name} ·{" "}
                {formatBytes(exported.output.file.size)}
              </small>
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
