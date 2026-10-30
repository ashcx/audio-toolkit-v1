import { resolveTrim, type TrimRangeDraft } from "./recipe";
export function TrimFields({
  range,
  prefix,
  onChange,
  errorId,
  duration,
  scope,
}: {
  duration?: number | null;
  scope?: string;
  range: TrimRangeDraft;
  prefix: string;
  errorId?: string;
  onChange: (range: TrimRangeDraft) => void;
}) {
  const read = (input: HTMLInputElement) =>
    input.value === "" && !input.validity.badInput ? null : input.valueAsNumber;
  const bound = duration && Number.isFinite(duration) && duration > 0 ? duration : null;
  const gap = Math.min(0.001, bound ?? 0.001);
  const resolved = bound === null ? null : resolveTrim(range, bound);
  const start = resolved?.kind === "ready" ? resolved.trim.start : 0;
  const end = resolved?.kind === "ready" ? resolved.trim.end ?? bound ?? 0 : 0;
  return (
    <div class="range-fields">
      {bound !== null && resolved?.kind === "ready" && <div class="trim-timeline">
        <small>{scope ?? "File timeline"} · {bound.toFixed(3)} s</small>
        <div class="trim-track"><div style={{left:`${start / bound * 100}%`,width:`${(end-start) / bound * 100}%`}} /></div>
        <label class="field">Start handle<input type="range" min="0" max={bound} step="0.001" value={start}
          aria-label={`${prefix} start handle`} aria-valuetext={`${start} seconds`}
          onInput={event=>onChange({...range,start:Math.min(event.currentTarget.valueAsNumber,Math.max(0,end-gap))})} /></label>
        <label class="field">End handle<input type="range" min="0" max={bound} step="0.001" value={end}
          aria-label={`${prefix} end handle`} aria-valuetext={`${end} seconds`}
          onInput={event=>onChange({...range,end:Math.max(event.currentTarget.valueAsNumber,Math.min(bound,start+gap))})} /></label>
        <output>{start.toFixed(3)} s to {end.toFixed(3)} s</output>
      </div>}
      {bound !== null && resolved?.kind === "failed" && <small class="timeline-unavailable">Timeline unavailable for this range.</small>}
      <label class="field">
        Start (s)
        <input
          aria-invalid={!!errorId}
          aria-describedby={errorId}
          type="number"
          min="0"
          step="any"
          placeholder="0"
          aria-label={`${prefix} start (seconds)`}
          value={Number.isFinite(range.start) ? (range.start ?? "") : ""}
          onInput={(event) =>
            onChange({ ...range, start: read(event.currentTarget) })
          }
        />
      </label>
      <label class="field">
        End (s)
        <input
          aria-invalid={!!errorId}
          aria-describedby={errorId}
          type="number"
          min="0"
          step="any"
          placeholder="End of file"
          aria-label={`${prefix} end (seconds)`}
          value={Number.isFinite(range.end) ? (range.end ?? "") : ""}
          onInput={(event) =>
            onChange({ ...range, end: read(event.currentTarget) })
          }
        />
      </label>
    </div>
  );
}
