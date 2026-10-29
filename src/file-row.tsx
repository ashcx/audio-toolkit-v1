import { useState } from "preact/hooks";
import type { FileEntry } from "./media";
import { formatBytes, describeAudio } from "./format";
import { resolveTrim, type TrimRangeDraft } from "./recipe";
import { TrimFields } from "./trim-fields";
export function FileRow({
  entry,
  trim,
  override,
  onOverride,
  onReset,
  onRemove,
}: {
  entry: FileEntry;
  trim: TrimRangeDraft | undefined;
  override: TrimRangeDraft | undefined;
  onOverride: (range: TrimRangeDraft) => void;
  onReset: () => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const result =
    trim && entry.inspection.kind === "ready"
      ? resolveTrim(override ?? trim, entry.inspection.metadata.duration)
      : null;
  const errorId =
    result?.kind === "failed" ? `trim-error-${entry.id}` : undefined;
  const effective = result?.kind === "ready" ? result.trim : null;
  const short = (seconds: number) => Number(seconds.toFixed(3));
  return (
    <li data-file-id={entry.id} data-inspection={entry.inspection.kind}>
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
      {trim && editing && (
        <div
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
        </div>
      )}
    </li>
  );
}
