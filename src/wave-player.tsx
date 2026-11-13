import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { copy } from "./copy";
import { messageFor } from "./errors";
import { formatTime, formatTrimTime } from "./format";
import type { TrimRangeDraft } from "./recipe";
import { changeTrimHandle } from "./trim-control";
import { TimeField } from "./trim-fields";
import { usePeaks, type PeakSource } from "./use-peaks";
import type { Peaks } from "./peaks";
import {
  BAR_PITCH, LINE_WIDTH, barExtents, clampTime, coalesced, nudgeTime, playbackAfter, timeToX, trimGeometry, xToTime,
  type Gesture, type Handle, type Playback, type PlaybackEvent,
} from "./wave-math";

export const pauseOthers = (event: Event) => {
  const current = event.currentTarget;
  for (const audio of document.querySelectorAll("audio"))
    if (audio !== current) audio.pause();
};
/** Only the original has this. It carries the range this file would export and the ways to change it. */
export type TrimEdit = Readonly<{
  range: Readonly<{ start: number; end: number }> | null;
  draft: TrimRangeDraft;
  custom: boolean;
  follows: boolean;
  editing: boolean;
  locked: boolean;
  onToggle: () => void;
  /** A range makes the file custom. Null goes back to following Trim all. */
  onChange: (range: TrimRangeDraft | null) => void;
}>;
type Palette = Readonly<Record<"idle" | "out" | "played" | "line" | "halo", string>>;
const raf = (run: () => void) => { const id = requestAnimationFrame(run); return () => cancelAnimationFrame(id); };
const readPalette = (): Palette => {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return { idle: read("--wave-idle"), out: read("--wave-out"), played: read("--accent"), line: read("--trim-line"), halo: read("--surface") };
};
const FLAG = 8, SERIF = 5;
function mark(g: CanvasRenderingContext2D, x: number, height: number, inward: 1 | -1, palette: Palette) {
  const left = x - LINE_WIDTH / 2, right = x + LINE_WIDTH / 2;
  const parts = [
    [left, 0, LINE_WIDTH, height],
    [inward > 0 ? left : right - FLAG, 0, FLAG, 4],
    [inward > 0 ? left : right - SERIF, height - 2, SERIF, 2],
  ] as const;
  g.fillStyle = palette.halo;
  for (const [a, b, c, d] of parts) g.fillRect(a - 1, b - 1, c + 2, d + 2);
  g.fillStyle = palette.line;
  for (const [a, b, c, d] of parts) g.fillRect(a, b, c, d);
}
function drawWave(g: CanvasRenderingContext2D, width: number, height: number, total: number, at: number, peaks: Peaks | null, range: Readonly<{ start: number; end: number }> | null, palette: Palette) {
  const lines = range ? trimGeometry(range, total, width) : null;
  const low = range ? timeToX(range.start, total, width) : 0, high = range ? timeToX(range.end, total, width) : width;
  const playedTo = timeToX(at, total, width);
  if (peaks) {
    const count = Math.max(1, Math.floor(width / BAR_PITCH)), pitch = width / count, thickness = pitch * 0.6;
    const { min, max } = barExtents(peaks, count);
    const played = new Path2D(), idle = new Path2D(), out = new Path2D();
    for (let bar = 0; bar < count; bar++) {
      const centre = (bar + 0.5) * pitch, half = Math.max(1.5, Math.max(-min[bar], max[bar]) * height / 2 * 0.94);
      (centre < low || centre > high ? out : centre < playedTo ? played : idle).roundRect(centre - thickness / 2, height / 2 - half, thickness, half * 2, thickness / 2);
    }
    for (const [path, colour] of [[out, palette.out], [idle, palette.idle], [played, palette.played]] as const) { g.fillStyle = colour; g.fill(path); }
  } else {
    const top = height / 2 - 2;
    g.fillStyle = palette.idle; g.fillRect(0, top, width, 4);
    g.fillStyle = palette.played; g.fillRect(low, top, Math.max(0, Math.min(playedTo, high) - low), 4);
    g.fillStyle = palette.out;
    for (const [from, to] of lines?.dimmed ?? []) g.fillRect(from, top, to - from, 4);
  }
  if (lines) { mark(g, lines.startX, height, 1, palette); mark(g, lines.endX, height, -1, palette); }
}
const wholeFile = (range: Readonly<{ start: number; end: number }>, total: number) => range.start < 1e-6 && range.end > total - 1e-6;
let fieldCount = 0;
export function WavePlayer({ src, source, label, name, duration, preload, paused, trim }: {
  src: string; source: PeakSource; label: string; name: string;
  /** Known length in seconds, or null when only the file itself can tell. */
  duration: number | null; preload: "none" | "metadata";
  /** True while an export or preview runs, so the waveform is not generated beside it. */
  paused: boolean; trim?: TrimEdit;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const playhead = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const palette = useRef<Palette | null>(null);
  const gesture = useRef<Gesture>({ kind: "idle" });
  const dragTime = useRef(0);
  const [playback, setPlayback] = useState<Playback>("idle");
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [fieldId] = useState(() => `wave-error-${++fieldCount}`);
  const peaks = usePeaks(source, visible && !paused);
  const ready = peaks.kind === "ready" ? peaks.peaks : null;
  const total = ready?.duration ?? duration ?? mediaDuration;
  const range = trim?.range && total && (trim.editing || !wholeFile(trim.range, total)) ? trim.range : null;
  const live = useRef({ trim, total });
  live.current = { trim, total };
  const [seek] = useState(() => coalesced<number>(time => { if (audio.current) audio.current.currentTime = time; }, raf));
  const [reshape] = useState(() => coalesced<{ handle: Handle; value: number }>(({ handle, value }) => {
    const { trim: latest, total: length } = live.current;
    if (latest && length) latest.onChange(changeTrimHandle(latest.draft, length, handle, value));
  }, raf));
  const paint = () => {
    const host = track.current, surface = canvas.current, element = audio.current, marker = playhead.current;
    if (!host || !surface || !element || !marker) return;
    const width = host.clientWidth, height = host.clientHeight, ratio = devicePixelRatio || 1;
    if (surface.width !== Math.round(width * ratio) || surface.height !== Math.round(height * ratio)) {
      surface.width = Math.round(width * ratio);
      surface.height = Math.round(height * ratio);
    }
    const g = surface.getContext("2d");
    if (!g) return;
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.clearRect(0, 0, width, height);
    const length = total ?? 0;
    const at = clampTime(gesture.current.kind === "seeking" ? dragTime.current : element.currentTime, length);
    palette.current ??= readPalette();
    if (length && width) drawWave(g, width, height, length, at, ready, range, palette.current);
    marker.style.display = length ? "" : "none";
    marker.style.transform = `translateX(${timeToX(at, length, width)}px)`;
    const whole = length ? formatTime(length) : "--:--";
    const text = `${formatTime(at)} / ${whole}`;
    if (readout.current && readout.current.textContent !== text) readout.current.textContent = text;
    const spoken = copy.wave.position(formatTime(at), length ? whole : copy.trim.unknownDuration);
    if (host.getAttribute("aria-valuetext") !== spoken) {
      host.setAttribute("aria-valuetext", spoken);
      host.setAttribute("aria-valuenow", String(Math.floor(at)));
    }
  };
  const painter = useRef(paint);
  painter.current = paint;
  useLayoutEffect(paint);
  useEffect(() => {
    const host = track.current, element = root.current;
    if (!host || !element) return;
    const resize = new ResizeObserver(() => painter.current());
    resize.observe(host);
    const theme = new MutationObserver(() => { palette.current = null; painter.current(); });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const view = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => setVisible(entries[entries.length - 1].isIntersecting));
    if (view) view.observe(element); else setVisible(true);
    return () => { resize.disconnect(); theme.disconnect(); view?.disconnect(); seek.cancel(); reshape.cancel(); };
  }, []);
  useEffect(() => {
    if (playback === "idle") return;
    let frame = requestAnimationFrame(function tick() { painter.current(); frame = requestAnimationFrame(tick); });
    return () => cancelAnimationFrame(frame);
  }, [playback]);
  useEffect(() => {
    setFieldError(null);
    // Ending the edit unmounts a handle that may hold a drag, and nothing else would clear it.
    if (!trim?.editing && gesture.current.kind === "dragging-handle") { gesture.current = { kind: "idle" }; reshape.cancel(); }
  }, [trim?.editing]);
  const on = (event: PlaybackEvent) => setPlayback(state => playbackAfter(state, event));
  const toggle = () => {
    const element = audio.current;
    if (!element) return;
    if (element.paused) void element.play().catch(() => {}); else element.pause();
  };
  const timeAt = (event: PointerEvent) => {
    const box = track.current?.getBoundingClientRect();
    return box ? xToTime(event.clientX - box.left, total ?? 0, box.width) : 0;
  };
  const endSeek = (pointerId: number, time: number) => {
    const current = gesture.current;
    if (current.kind !== "seeking" || current.pointerId !== pointerId) return;
    gesture.current = { kind: "idle" };
    seek.finish(time);
    paint();
  };
  const moveSeek = (event: PointerEvent) => {
    const current = gesture.current;
    if (current.kind !== "seeking" || current.pointerId !== event.pointerId) return;
    dragTime.current = timeAt(event);
    seek.push(dragTime.current);
    paint();
  };
  const handle = (which: Handle) => {
    if (!trim?.range || !total) return null;
    const value = trim.range[which];
    const dragging = (event: PointerEvent) => {
      const current = gesture.current;
      return current.kind === "dragging-handle" && current.pointerId === event.pointerId ? current : null;
    };
    return <div class="wave-handle" role="slider" tabIndex={0} data-handle={which}
      aria-label={which === "start" ? copy.trim.startHandle(name) : copy.trim.endHandle(name)}
      aria-valuemin={0} aria-valuemax={total} aria-valuenow={Number(value.toFixed(3))} aria-valuetext={formatTrimTime(value)} aria-disabled={trim.locked}
      style={{ left: `${value / total * 100}%` }}
      onPointerDown={event => {
        if (event.button !== 0 || gesture.current.kind !== "idle" || trim.locked) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.current = { kind: "dragging-handle", pointerId: event.pointerId, handle: which, origin: trim.custom ? trim.draft : null };
      }}
      onPointerMove={event => { if (dragging(event)) reshape.push({ handle: which, value: timeAt(event) }); }}
      onPointerUp={event => {
        if (!dragging(event)) return;
        gesture.current = { kind: "idle" };
        reshape.finish({ handle: which, value: timeAt(event) });
      }}
      onPointerCancel={event => {
        const current = dragging(event);
        if (current?.kind !== "dragging-handle") return;
        gesture.current = { kind: "idle" };
        reshape.cancel();
        trim.onChange(current.origin);
      }}
      onLostPointerCapture={event => { if (dragging(event)) { gesture.current = { kind: "idle" }; reshape.cancel(); } }}
      onKeyDown={event => {
        const next = trim.locked ? null : nudgeTime(event.key, value, total, 0.1, 1, event.shiftKey);
        if (next === null) return;
        event.preventDefault();
        trim.onChange(changeTrimHandle(trim.draft, total, which, Math.round(next * 1000) / 1000));
      }}>
      <i class="wave-knob" aria-hidden="true" />
      <b class="wave-tag" aria-hidden="true">{formatTrimTime(value)}</b>
    </div>;
  };
  const setField = (which: Handle, value: number | null) => {
    if (!trim?.range || !total) return;
    if (value !== null && !Number.isFinite(value)) return setFieldError(messageFor("time-invalid"));
    const next = value ?? (which === "start" ? 0 : total), other = trim.range[which === "start" ? "end" : "start"];
    if (which === "start" ? next >= other : next <= other) return setFieldError(messageFor("trim-order"));
    setFieldError(null);
    trim.onChange(changeTrimHandle(trim.draft, total, which, next));
  };
  const playing = playback !== "idle";
  return <div class="wave-player" ref={root} data-editing={trim?.editing ? "" : undefined} data-playback={playback}>
    <div class="wave-head">
      <button type="button" class="wave-play" aria-label={(playing ? copy.wave.pause : copy.wave.play)(label, name)} onClick={toggle}>
        <svg viewBox="0 0 16 16" aria-hidden="true">{playing ? <path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" /> : <path d="M4 2.5v11l9-5.5z" />}</svg>
      </button>
      <span class="wave-label">{label}</span>
      <span class="wave-time" ref={readout} aria-hidden="true" />
      {trim && <button type="button" class="wave-trim" disabled={trim.locked && !trim.editing}
        aria-label={trim.editing ? copy.wave.doneLabel(name) : copy.wave.trimLabel(name)} onClick={trim.onToggle}>{trim.editing ? copy.wave.done : copy.wave.trim}</button>}
    </div>
    <div class="wave-track" ref={track} role="slider" tabIndex={total ? 0 : -1} aria-label={copy.wave.seek(label, name)}
      aria-valuemin={0} aria-valuemax={total ?? 0} aria-disabled={!total}
      onPointerDown={event => {
        if (event.button !== 0 || gesture.current.kind !== "idle" || !total) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.current = { kind: "seeking", pointerId: event.pointerId };
        dragTime.current = timeAt(event);
        seek.push(dragTime.current);
        paint();
      }}
      onPointerMove={moveSeek}
      onPointerUp={event => endSeek(event.pointerId, timeAt(event))}
      onPointerCancel={event => endSeek(event.pointerId, dragTime.current)}
      onLostPointerCapture={event => endSeek(event.pointerId, dragTime.current)}
      onKeyDown={event => {
        const element = audio.current;
        if (event.target !== event.currentTarget || !element || !total) return;
        if (event.key === " ") { event.preventDefault(); toggle(); return; }
        const next = nudgeTime(event.key, element.currentTime, total, 1, 5, event.shiftKey);
        if (next === null) return;
        event.preventDefault();
        element.currentTime = next;
        paint();
      }}>
      <canvas ref={canvas} aria-hidden="true" />
      {trim?.editing && handle("start")}
      {trim?.editing && handle("end")}
      <div class="wave-playhead" ref={playhead} aria-hidden="true" />
    </div>
    {trim?.editing && trim.range && total && <div class="wave-fields">
      <label>{copy.trim.start}<TimeField value={trim.range.start} placeholder="00:00" label={copy.trim.startField(name)} errorId={fieldError ? fieldId : undefined} onChange={value => setField("start", value)} /></label>
      <label>{copy.trim.end}<TimeField value={trim.range.end} placeholder={formatTrimTime(total)} label={copy.trim.endField(name)} errorId={fieldError ? fieldId : undefined} onChange={value => setField("end", value)} /></label>
      {fieldError && <p id={fieldId} class="validation-error" role="alert">{fieldError}</p>}
    </div>}
    {trim && (trim.custom || trim.follows) && <div class="wave-status">
      {trim.custom
        ? <><span class="wave-badge">{copy.wave.custom}</span>
          <button type="button" class="text-button" disabled={trim.locked} aria-label={copy.wave.resetLabel(name)} onClick={() => trim.onChange(null)}>{copy.wave.reset}</button></>
        : <span>{copy.wave.follows}</span>}
    </div>}
    <audio ref={audio} preload={preload} src={src}
      onPlay={event => { pauseOthers(event); on("play"); }} onPlaying={() => on("playing")} onWaiting={() => on("waiting")}
      onPause={() => on("pause")} onEnded={() => on("ended")} onError={() => on("error")} onSeeked={paint}
      onLoadedMetadata={event => setMediaDuration(Number.isFinite(event.currentTarget.duration) && event.currentTarget.duration > 0 ? event.currentTarget.duration : null)} />
  </div>;
}
