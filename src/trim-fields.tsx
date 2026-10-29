import type { TrimRangeDraft } from "./recipe";
export function TrimFields({
  range,
  prefix,
  onChange,
  errorId,
}: {
  range: TrimRangeDraft;
  prefix: string;
  errorId?: string;
  onChange: (range: TrimRangeDraft) => void;
}) {
  const read = (input: HTMLInputElement) =>
    input.value === "" && !input.validity.badInput ? null : input.valueAsNumber;
  return (
    <div class="range-fields">
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
