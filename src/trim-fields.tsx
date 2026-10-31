import { useEffect, useRef, useState } from "preact/hooks";
import { formatClock, parseClock } from "./format";
import { trimHandles, changeTrimHandle } from "./trim-control";
import type { TrimRangeDraft } from "./recipe";
function TimeField({ value, placeholder, label, errorId, onChange }: {
  value: number | null; placeholder: string; label: string; errorId?: string;
  onChange: (value: number | null) => void;
}) {
  const [text, setText] = useState(value === null ? "" : formatClock(value));
  const emitted = useRef(value);
  useEffect(() => {
    if (!Object.is(value, emitted.current)) {
      emitted.current = value;
      setText(value === null ? "" : formatClock(value));
    }
  }, [value]);
  return <input type="text" aria-label={label} aria-invalid={!!errorId}
    aria-describedby={errorId} placeholder={placeholder} value={text}
    onInput={event => { const raw = event.currentTarget.value; setText(raw); const next = parseClock(raw); emitted.current = next; onChange(next); }}
    onBlur={() => { const next = parseClock(text); if (next !== null && Number.isFinite(next)) setText(formatClock(next)); }} />;
}
export function TrimFields({ range, prefix, onChange, errorId, duration, scope }: {
  duration?: number | null; scope?: string; range: TrimRangeDraft; prefix: string; errorId?: string;
  onChange: (range: TrimRangeDraft) => void;
}) {
  const bound = duration && Number.isFinite(duration) && duration > 0 ? duration : null;
  const {start,end} = bound === null ? {start:0,end:0} : trimHandles(range,bound);
  const edit = (handle: "start" | "end", value: number) => {
    if (bound === null) return;
    onChange(changeTrimHandle(range,bound,handle,Math.round(value * 1000) / 1000));
  };
  const keys = (event: KeyboardEvent, handle: "start" | "end") => {
    if (bound === null) return;
    const value = handle === "start" ? start : end;
    const step = event.shiftKey ? .01 : 1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? bound
      : event.key === "ArrowLeft" || event.key === "ArrowDown" ? value-step
      : event.key === "ArrowRight" || event.key === "ArrowUp" ? value+step : null;
    if (next === null) return;
    event.preventDefault(); edit(handle,next);
  };
  return <div class="trim-control">
    <div class="trim-times">
      <label>Start<TimeField value={range.start} placeholder="0:00" label={`${prefix} start (time)`} errorId={errorId} onChange={start => onChange({...range,start})} /></label>
      <span class="trim-connector" aria-hidden="true">to</span>
      <label>End<TimeField value={range.end} placeholder={bound === null ? "End" : formatClock(bound)} label={`${prefix} end (time)`} errorId={errorId} onChange={end => onChange({...range,end})} /></label>
    </div>
    {bound !== null && <div class="dual-range" onPointerDown={event => {
      if (event.target instanceof HTMLInputElement || event.currentTarget.closest("fieldset:disabled")) return;
      const box = event.currentTarget.getBoundingClientRect();
      const value = Math.max(0,Math.min(bound,(event.clientX-box.left-12)/(box.width-24)*bound));
      edit(Math.abs(value-start) < Math.abs(value-end) ? "start" : "end",value);
    }} style={{"--range-start":`${start / bound * 100}%`,"--range-end":`${end / bound * 100}%`}}>
      <div class="dual-range-track"><div /></div>
      <input type="range" min="0" max={bound} step="any" value={start} style={{zIndex:start / bound > .5 ? 3 : 1}}
        aria-label={`${prefix} start handle`} aria-valuetext={formatClock(start)}
        onKeyDown={event => keys(event,"start")}
        onInput={event => edit("start",event.currentTarget.valueAsNumber)} />
      <input type="range" min="0" max={bound} step="any" value={end}
        aria-label={`${prefix} end handle`} aria-valuetext={formatClock(end)}
        onKeyDown={event => keys(event,"end")}
        onInput={event => edit("end",event.currentTarget.valueAsNumber)} />
    </div>}
    <div class="trim-scale"><span>0:00</span><span>{bound === null ? "Duration unknown" : formatClock(bound)}</span></div>
    {scope && <small class="trim-scope">{scope}</small>}
  </div>;
}
