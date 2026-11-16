import type { RefObject } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { AudioMetadata, FileEntry } from "./media";
import { resolveTrim, type TrimRangeDraft } from "./recipe";
import { fileMetadata, showsPreview, trimErrorOwner } from "./file-summary";
import type { ExecutionPlan } from "./planner";
import type { BatchJob } from "./batch";
import type { PreviewState } from "./preview";
import { copy } from "./copy";
import { actionFor } from "./errors";
import { formatTime } from "./format";
import { resultNote } from "./result-note";
import { previewCutSeconds } from "./preview-plan";
import { WavePlayer, type TrimEdit } from "./wave-player";
import { carryPosition, shownView, viewsOf, type View } from "./view-position";
const canPlay = (mime: string) => mime !== "" && document.createElement("audio").canPlayType(mime) !== "";
type PlayableResult = Readonly<{ url: string; file: File; label: string }>;
function useViewCarry(view: View | null, trimStart: number, onPick: (view: View) => void) {
  const audio = useRef<HTMLAudioElement>(null);
  const carried = useRef<{ time: number; play: boolean } | null>(null);
  const resultLength = useRef(Infinity);
  const choose = (next: View) => {
    const element = audio.current;
    if (element && view && next !== view) {
      if (view === "result" && Number.isFinite(element.duration)) resultLength.current = element.duration;
      carried.current = { time: carryPosition({ from: view, to: next, time: element.currentTime, trimStart, resultDuration: resultLength.current }), play: !element.paused };
    }
    onPick(next);
  };
  useLayoutEffect(() => {
    const element = audio.current, moment = carried.current;
    if (!element || !moment) return;
    carried.current = null;
    const resume = () => { element.currentTime = moment.time; if (moment.play) void element.play().catch(() => {}); };
    if (element.readyState >= HTMLMediaElement.HAVE_METADATA) resume();
    else element.addEventListener("loadedmetadata", resume, { once: true });
  }, [view]);
  return { audio, choose };
}
const choices: readonly (readonly [View, string])[] = [["original", copy.files.original], ["result", copy.result.label]];
function FilePlayer({ entry, metadata, result, view, switchable, compact, audioRef, paused, trim, readoutTarget, onChoose }: {
  entry: FileEntry; metadata: AudioMetadata; result: PlayableResult | null; view: View; switchable: boolean; compact: boolean;
  audioRef: RefObject<HTMLAudioElement | null>; paused: boolean; trim: TrimEdit; readoutTarget?: RefObject<HTMLElement | null>; onChoose: (view: View) => void;
}) {
  const [sourceUrl] = useState(() => URL.createObjectURL(entry.file));
  useLayoutEffect(() => () => URL.revokeObjectURL(sourceUrl), [sourceUrl]);
  const showsResult = view === "result" && result !== null;
  return <div class="file-player" data-view={view}>
    <WavePlayer layout="row" compact={compact} audioRef={audioRef} src={showsResult ? result.url : sourceUrl}
      source={showsResult ? { file: result.file } : { file: entry.file, metadata }}
      label={showsResult ? result.label : copy.files.original} name={entry.file.name}
      duration={showsResult ? null : metadata.duration} preload={showsResult || result ? "metadata" : "none"} paused={paused}
      trim={showsResult ? { ...trim, range: null, custom: false, follows: false, onToggle: () => { onChoose("original"); trim.onToggle(); } } : trim}
      readoutTarget={readoutTarget} />
    {switchable && !compact && !trim.editing && <div class="view-switch" role="radiogroup" aria-label={copy.files.viewLabel(entry.file.name)}>
      {choices.map(([option, text]) => <label key={option}>
        <input type="radio" name={`view-${entry.id}`} tabIndex={view === option ? 0 : -1} checked={view === option} onChange={() => onChoose(option)} />
        <span>{text}</span>
      </label>)}
    </div>}
  </div>;
}
export function FileRow({
  entry,
  plan,
  job,
  busy,
  trimLocked,
  downloadBusy,
  onCancel,
  onRetry,
  trim,
  override,
  editing,
  onEdit,
  onOverride,
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
  /** Narrower than busy: a preview that is releasing already yields to the edit, so it must not block it. */
  trimLocked: boolean;
  downloadBusy: boolean;
  onCancel: () => void;
  onRetry: () => void;
  trim: TrimRangeDraft | undefined;
  /** This file's own range, which replaces the Trim all range for this file only. */
  override: TrimRangeDraft | undefined;
  editing: boolean;
  onEdit: () => void;
  onOverride: (range: TrimRangeDraft | null) => void;
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
  const draft = override ?? trim;
  const result =
    draft && entry.inspection.kind === "ready"
      ? resolveTrim(draft, entry.inspection.metadata.duration)
      : null;
  const previousSettings =
    exported &&
    (!plan || plan.kind === "failed" ||
      JSON.stringify(plan.snapshot.recipe) !== JSON.stringify(job?.spec.plan.snapshot.recipe));
  const trimFailed = result?.kind === "failed" ? result : null;
  const fileOwnsTrimError = trimFailed !== null && (override !== undefined || trimErrorOwner(trimFailed.code) === "file");
  const fileErrorId = fileOwnsTrimError ? `trim-error-${entry.id}` : undefined;
  const errorId = fileOwnsTrimError ? fileErrorId : trimFailed ? trimErrorId : undefined;
  const effective = result?.kind === "ready" ? result.trim : null;
  const duration = entry.inspection.kind === "ready" ? entry.inspection.metadata.duration : null;
  const metadata = entry.inspection.kind === "ready" ? fileMetadata(entry, effective) : null;
  // The shared range does not fit this file, so the editor starts from the whole file and the first edit gives the file its own range.
  const unfixable = trimFailed !== null && override === undefined;
  const currentExport = exported?.kind === "done" && !previousSettings;
  const previewVisible = showsPreview(hasRecipeSteps, currentExport);
  const cutSeconds = previewCutSeconds(effective, duration);
  const exportedPlayable = exported?.kind === "done" && canPlay(exported.output.mime);
  const resultUrl = exported?.kind === "done" ? exported.url : null;
  const [picked, setPicked] = useState<{ result: string | null; view: View } | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const views = viewsOf({ original: entry.inspection.kind === "ready" && !preview && canPlay(entry.file.type), result: exportedPlayable });
  const shown = shownView(views, picked?.result === resultUrl ? picked.view : null, editing);
  const { audio, choose } = useViewCarry(shown, job?.spec.plan.snapshot.trim?.start ?? 0, view => setPicked({ result: resultUrl, view }));
  const collapsible = exported?.kind === "done" && !preview && !editing;
  const expanded = !collapsible || opened === resultUrl;
  const toggleExpanded = () => {
    if (expanded && shown === "original" && views.includes("result")) choose("result");
    setOpened(expanded ? null : resultUrl);
  };
  const position = useRef<HTMLSpanElement>(null);
  const positionLive = shown !== null;
  const totalText = duration === null ? copy.trim.unknownDuration : formatTime(duration);
  const resultLabel = previousSettings ? copy.result.olderLabel : copy.result.label;
  const downloadLabel = previousSettings
    ? copy.result.downloadOlder(entry.file.name)
    : copy.result.download(entry.file.name);
  const failedAction = exported?.kind === "failed" ? actionFor(exported.code) : null;
  const spoken = !exported ? ""
    : exported.kind === "waiting" ? copy.files.waiting
    : exported.kind === "running" ? copy.progress.stage(exported.operation)
    : exported.kind === "cancelling" ? copy.files.cancelling.replace("…", "")
    : exported.kind === "cancelled" ? copy.files.cancelled
    : exported.kind === "failed" ? exported.message
    : note ? `${copy.files.done}. ${note}` : copy.files.done;
  const previewSpoken = !preview ? ""
    : preview.kind === "running" ? copy.preview.announceRunning(entry.file.name)
    : preview.kind === "ready" ? copy.preview.announceReady(entry.file.name)
    : preview.kind === "cancelling" ? copy.preview.cancelling
    : preview.kind === "failed" || (preview.kind === "cleanup" && preview.attempts >= 2) ? preview.message : "";
  return (
    <li data-file-id={entry.id} data-inspection={entry.inspection.kind} data-job-state={exported?.kind} data-collapsed={expanded ? undefined : ""}>
      <span class="file-name" title={entry.file.name}>
        <span class="file-name-text">{entry.file.name}</span>
        <small class="file-meta">
          {entry.inspection.kind === "ready" && metadata
            ? <>
              <span class="file-position" ref={position} aria-hidden={positionLive ? "true" : undefined}>
                {positionLive && duration !== null ? `${formatTime(0)} / ${totalText}` : totalText}
              </span>
              {expanded && metadata.primary && !(shown === "result" && !previousSettings) && ` · ${metadata.primary}`}{expanded && metadata.secondary && ` · ${metadata.secondary}`}
            </>
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
        {collapsible && <button type="button" class="file-toggle" aria-expanded={expanded} aria-label={copy.files.detailsLabel(entry.file.name)} onClick={toggleExpanded} />}
      </span>
      <div class="file-actions">
        {expanded && previewVisible && entry.inspection.kind === "ready" &&
          <button type="button" disabled={previewDisabled || trimFailed !== null}
            aria-label={copy.preview.buttonLabel(entry.file.name, cutSeconds)} aria-describedby={errorId} onClick={onPreview}>{copy.preview.button(cutSeconds)}</button>}
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
      <span class="sr-only" role="status">{[spoken && copy.files.announce(entry.file.name, spoken), previewSpoken].filter(Boolean).join(" ")}</span>
      {entry.inspection.kind === "ready" && shown && <FilePlayer entry={entry} metadata={entry.inspection.metadata} view={shown} switchable={views.length > 1} compact={!expanded} audioRef={audio}
        result={exported?.kind === "done" && exportedPlayable ? { url: exported.url, file: exported.output.file, label: resultLabel } : null}
        paused={busy} readoutTarget={positionLive ? position : undefined}
        onChoose={choose} trim={{
          range: duration === null ? null : unfixable ? { start: 0, end: duration } : trimFailed ? null : { start: effective?.start ?? 0, end: effective?.end ?? duration },
          draft: unfixable ? { start: null, end: null } : draft ?? { start: null, end: null },
          custom: override !== undefined,
          follows: trim !== undefined,
          editing, locked: trimLocked, onToggle: () => { setOpened(resultUrl); onEdit(); }, onChange: onOverride,
        }} />}
      {entry.inspection.kind === "ready" && !preview && !shown && <div class="file-player"><small class="file-note">{copy.files.sourceUnplayable}</small></div>}
      {preview && <div class="file-preview" data-preview-state={preview.kind}>
        {preview.kind === "ready" ? <>
          <small>{copy.preview.heading(cutSeconds)}</small>
          {preview.estimate && <small>{copy.preview.estimate}</small>}
          <WavePlayer layout="labelled" src={preview.original} source={{ url: preview.original }} label={copy.preview.before} name={entry.file.name}
            duration={preview.range.end - preview.range.start} preload="metadata" paused={busy} />
          <WavePlayer layout="labelled" src={preview.processed} source={{ url: preview.processed }} label={copy.preview.after} name={entry.file.name}
            duration={preview.range.end - preview.range.start} preload="metadata" paused={busy} />
          <button type="button" onClick={onClearPreview}>{copy.preview.close}</button>
        </> : preview.kind === "running" ? <>
          <span>{copy.progress.preview(preview.operation)}</span>
          <button type="button" onClick={onClearPreview}>{copy.preview.cancel}</button>
        </> : preview.kind === "cleanup" ? preview.attempts >= 2 && <>
          <span>{preview.message}</span><button type="button" onClick={onClearPreview}>{copy.actions["try-again"]}</button>
        </> : preview.kind === "failed" ? <span>{preview.message}</span>
          : preview.kind === "cancelling" ? <span>{copy.preview.cancelling}</span> : null}
      </div>}
      {exported && (exported.kind !== "done" || !exportedPlayable || previousSettings || (expanded && note)) && (
        <div class="file-result">
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
              {(previousSettings || !exportedPlayable) && <small>{resultLabel}</small>}
              {!exportedPlayable && <small class="file-note">{copy.files.resultUnplayable}</small>}
              {expanded && note && <small>{note}</small>}
            </>
          )}
        </div>
      )}
    </li>
  );
}
