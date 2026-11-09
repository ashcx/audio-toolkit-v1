import { useLayoutEffect, useState } from "preact/hooks";
import type { FileEntry } from "./media";
import { resolveTrim, type TrimRangeDraft } from "./recipe";
import { fileMetadata, showsPreview } from "./file-summary";
import type { ExecutionPlan } from "./planner";
import type { BatchJob } from "./batch";
import type { PreviewState } from "./preview";
import { copy } from "./copy";
import { actionFor } from "./errors";
import { resultNote } from "./result-note";
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
    <small>{copy.files.original}</small>
    {playable
      ? <audio controls preload="none" src={url} aria-label={copy.files.playOriginal(entry.file.name)} onPlay={pauseOthers} />
      : <small class="file-note">{copy.files.sourceUnplayable}</small>}
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
  trimErrorId,
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
  /** The id of the message the Trim all step already shows, when that step is the one at fault. */
  trimErrorId: string | undefined;
  onRemove: () => void;
}) {
  const exported = job?.state;
  const pcmStats = exported?.kind === "done" && exported.report.kind === "pcm"
    ? exported.report.stats
    : null;
  const note = pcmStats ? resultNote(pcmStats) : null;
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
  const trimFailed = result?.kind === "failed" ? result : null;
  // A bad range is shown once. The step owns it unless the range only fails against this file.
  const fileOwnsTrimError = trimFailed?.code === "trim-past-end";
  const fileErrorId = fileOwnsTrimError ? `trim-error-${entry.id}` : undefined;
  const errorId = fileOwnsTrimError ? fileErrorId : trimFailed ? trimErrorId : undefined;
  const effective = result?.kind === "ready" ? result.trim : null;
  const metadata = entry.inspection.kind === "ready" ? fileMetadata(entry, effective) : null;
  const currentExport = exported?.kind === "done" && !previousSettings;
  const previewVisible = showsPreview(hasRecipeSteps, currentExport);
  const exportedPlayable = exported?.kind === "done" &&
    document.createElement("audio").canPlayType(exported.output.mime) !== "";
  const downloadLabel = previousSettings
    ? copy.result.downloadOlder(entry.file.name)
    : copy.result.download(entry.file.name);
  const playLabel = previousSettings
    ? copy.result.playOlder(entry.file.name)
    : copy.result.play(entry.file.name);
  const failedAction = exported?.kind === "failed" ? actionFor(exported.code) : null;
  return (
    <li data-file-id={entry.id} data-inspection={entry.inspection.kind} data-job-state={exported?.kind}>
      <span class="file-name" title={entry.file.name}>
        {entry.file.name}
        <small>
          {entry.inspection.kind === "ready" && metadata
            ? `${metadata.primary}${metadata.secondary ? ` · ${metadata.secondary}` : ""}`
            : entry.inspection.kind === "reading" ? copy.files.reading
              : entry.inspection.kind === "waiting" ? copy.files.waiting : ""}
        </small>
        {entry.inspection.kind === "failed" && (
          <small class="file-error" role="status">
            {entry.inspection.message}
          </small>
        )}
        {plan?.kind === "failed" && !trimFailed && (
          <small class="file-error" role="status">
            {plan.message}
          </small>
        )}
        {fileOwnsTrimError && trimFailed && (
          <small id={fileErrorId} class="file-error" role="status">
            {trimFailed.message}
          </small>
        )}
      </span>
      <div class="file-actions">
        {previewVisible && entry.inspection.kind === "ready" &&
          <button type="button" disabled={previewDisabled || trimFailed !== null}
            aria-label={copy.preview.buttonLabel(entry.file.name)} aria-describedby={errorId} onClick={onPreview}>{copy.preview.button}</button>}
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
          aria-label={copy.files.removeLabel(entry.file.name)}
          onClick={onRemove}
        >
          ×
        </button>
      </div>
      {entry.inspection.kind === "ready" && !preview && <SourcePlayer entry={entry} />}
      {preview && <div class="file-preview" data-preview-state={preview.kind}>
        {preview.kind === "ready" ? <>
          <small>{copy.preview.heading}</small>
          {preview.estimate && <small>{copy.preview.estimate}</small>}
          <label>{copy.preview.before}<audio controls preload="none" src={preview.original} aria-label={copy.preview.beforeLabel(entry.file.name)} onPlay={pauseOthers} /></label>
          <label>{copy.preview.after}<audio controls preload="none" src={preview.processed} aria-label={copy.preview.afterLabel(entry.file.name)} onPlay={pauseOthers} /></label>
          <button type="button" onClick={onClearPreview}>{copy.preview.close}</button>
        </> : preview.kind === "running" ? <>
          <span role="status">{copy.progress.preview(preview.operation)}</span>
          <button type="button" onClick={onClearPreview}>{copy.preview.cancel}</button>
        </> : preview.kind === "cleanup" ? preview.attempts >= 2 && <>
          <span role="status">{preview.message}</span><button type="button" onClick={onClearPreview}>{copy.actions["try-again"]}</button>
        </> : preview.kind === "failed" ? <span role="status">{preview.message}</span>
          : preview.kind === "cancelling" ? <span role="status">{copy.preview.cancelling}</span> : null}
      </div>}
      {exported && (
        <div class="file-result" role="status">
          {exported.kind === "waiting" || exported.kind === "running" || exported.kind === "cancelling" ? (
            <>
              <progress aria-label={copy.files.progressLabel(entry.file.name)} {...progress} />
              <span>{operation ? copy.progress.label(operation) : exported.kind === "waiting" ? copy.files.waiting : copy.files.cancelling}</span>
              {exported.kind !== "cancelling" && <button type="button" aria-label={copy.files.cancelLabel(entry.file.name)} onClick={onCancel}>{copy.files.cancel}</button>}
            </>
          ) : exported.kind === "failed" || exported.kind === "cancelled" ? (
            <>
              <span>{exported.kind === "failed" ? exported.message : copy.files.cancelled}</span>
              {failedAction === "remove"
                ? <button type="button" disabled={downloadBusy} aria-label={copy.files.removeLabel(entry.file.name)} onClick={onRemove}>{copy.actions.remove}</button>
                : <button type="button" disabled={busy} aria-label={copy.files.retryLabel(entry.file.name)} onClick={onRetry}>{copy.actions.retry}</button>}
            </>
          ) : (
            <>
              <small>{previousSettings ? copy.result.olderLabel : copy.result.label}</small>
              {exportedPlayable
                ? <audio controls preload="none" src={exported.url} aria-label={playLabel} onPlay={pauseOthers} />
                : <small class="file-note">{copy.files.resultUnplayable}</small>}
              {note && <small>{note}</small>}
            </>
          )}
        </div>
      )}
    </li>
  );
}
