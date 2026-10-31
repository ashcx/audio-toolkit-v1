import { useEffect, useRef, useState } from "preact/hooks";
import { formatTrimTime, parseClock } from "./format";
import { trimHandles, changeTrimHandle } from "./trim-control";
import type { TrimRangeDraft } from "./recipe";
function TimeField({ value, placeholder, label, errorId, onChange }: {
  value: number | null; placeholder: string; label: string; errorId?: string;
  onChange: (value: number | null) => void;
}) {
  const [text, setText] = useState(value === null ? "" : formatTrimTime(value));
  const emitted = useRef(value);
  const edited = useRef(false);
  useEffect(() => {
    if (!Object.is(value, emitted.current)) {
      emitted.current = value;
      setText(value === null ? "" : formatTrimTime(value));
    }
  }, [value]);
  return <input type="text" aria-label={label} aria-invalid={!!errorId}
    aria-describedby={errorId} placeholder={placeholder} value={text}
    onInput={event => { const raw = event.currentTarget.value; edited.current = true; setText(raw); const next = parseClock(raw); emitted.current = next; onChange(next); }}
    onBlur={() => { if (!edited.current) return; edited.current = false; const next = parseClock(text); if (next !== null && Number.isFinite(next)) setText(formatTrimTime(next)); }} />;
}
export function TrimFields({ range, prefix, onChange, errorId, duration, scope }: {
  duration?: number | null; scope?: string; range: TrimRangeDraft; prefix: string; errorId?: string;
  onChange: (range: TrimRangeDraft) => void;
}) {
  const gesture = useRef<{ pointer: number; handle: "start" | "end" } | null>(null);
  const bound = duration && Number.isFinite(duration) && duration > 0 ? duration : null;
  const {start,end} = bound === null ? {start:0,end:0} : trimHandles(range,bound);
  const edit = (handle: "start" | "end", value: number) => {
    if (bound === null) return;
    onChange(changeTrimHandle(range,bound,handle,value));
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
      <label>Start<TimeField value={range.start} placeholder="00:00" label={`${prefix} start (time)`} errorId={errorId} onChange={start => onChange({...range,start})} /></label>
      <span class="trim-connector" aria-hidden="true">to</span>
      <label>End<TimeField value={range.end} placeholder={bound === null ? "End" : formatTrimTime(bound)} label={`${prefix} end (time)`} errorId={errorId} onChange={end => onChange({...range,end})} /></label>
    </div>
    {bound !== null && <div class="dual-range" onPointerDown={event => {
      if (event.button !== 0 || gesture.current || event.currentTarget.closest("fieldset:disabled")) return;
      const box = event.currentTarget.getBoundingClientRect();
      const value = Math.max(0,Math.min(bound,(event.clientX-box.left-12)/(box.width-24)*bound));
      const handle = event.target instanceof HTMLInputElement
        ? event.target.dataset.handle === "start" ? "start" : "end"
        : Math.abs(value-start) < Math.abs(value-end) ? "start" : "end";
      event.preventDefault();
      gesture.current = {pointer:event.pointerId,handle};
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.querySelector<HTMLInputElement>(`[data-handle="${handle}"]`)?.focus();
      edit(handle,value);
    }} onPointerMove={event => {
      if (gesture.current?.pointer !== event.pointerId || event.currentTarget.closest("fieldset:disabled")) return;
      const box = event.currentTarget.getBoundingClientRect();
      edit(gesture.current.handle,(event.clientX-box.left-12)/(box.width-24)*bound);
    }} onPointerUp={event => {
      if (gesture.current?.pointer !== event.pointerId) return;
      gesture.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }} onPointerCancel={() => {gesture.current = null;}}
    onLostPointerCapture={() => {gesture.current = null;}} style={{"--range-start":`${start / bound * 100}%`,"--range-end":`${end / bound * 100}%`}}>
      <div class="dual-range-track"><div /></div>
      <input data-handle="start" type="range" min="0" max={bound} step="any" value={start} style={{zIndex:start / bound > .5 ? 3 : 1}}
        aria-label={`${prefix} start handle`} aria-valuetext={formatTrimTime(start)}
        onKeyDown={event => keys(event,"start")}
        onInput={event => edit("start",event.currentTarget.valueAsNumber)} />
      <input data-handle="end" type="range" min="0" max={bound} step="any" value={end}
        aria-label={`${prefix} end handle`} aria-valuetext={formatTrimTime(end)}
        onKeyDown={event => keys(event,"end")}
        onInput={event => edit("end",event.currentTarget.valueAsNumber)} />
    </div>}
    <div class="trim-scale"><span>00:00</span><span>{bound === null ? "Duration unknown" : formatTrimTime(bound)}</span></div>
    {scope && <small class="trim-scope">{scope}</small>}
  </div>;
}
