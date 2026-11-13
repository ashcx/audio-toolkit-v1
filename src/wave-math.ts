import type { Peaks } from "./peaks.ts";
import type { TrimRangeDraft } from "./recipe.ts";
export type Handle = "start" | "end";
/** What a pointer is doing on the wave. A drag keeps the range from pointer down (null when the file followed Trim all), so a cancelled drag can put it back. */
export type Gesture =
  | { kind: "idle" }
  | { kind: "seeking"; pointerId: number }
  | { kind: "dragging-handle"; pointerId: number; handle: Handle; origin: TrimRangeDraft | null };
/** Where playback stands, read from the audio element's events and never guessed from a click. */
export type Playback = "idle" | "playing" | "pending";
export type PlaybackEvent = "play" | "playing" | "waiting" | "pause" | "ended" | "error";
export function playbackAfter(state: Playback, event: PlaybackEvent): Playback {
  switch (event) {
    case "play": return "pending";
    case "waiting": return state === "idle" ? "idle" : "pending";
    case "playing": return "playing";
    case "pause":
    case "ended":
    case "error": return "idle";
  }
}
export const clampTime = (time: number, duration: number) => Math.min(duration, Math.max(0, time));
export const timeToX = (time: number, duration: number, width: number) => duration > 0 ? clampTime(time, duration) / duration * width : 0;
export const xToTime = (x: number, duration: number, width: number) => width > 0 ? clampTime(x / width * duration, duration) : 0;
/** The time a key moves a slider to, or null for a key it ignores. Shift takes the larger step. */
export function nudgeTime(key: string, current: number, duration: number, small: number, large: number, shift: boolean): number | null {
  const step = shift ? large : small;
  switch (key) {
    case "ArrowLeft":
    case "ArrowDown": return clampTime(current - step, duration);
    case "ArrowRight":
    case "ArrowUp": return clampTime(current + step, duration);
    case "Home": return 0;
    case "End": return duration;
    default: return null;
  }
}
export const BAR_PITCH = 5;
/** Reduces peak bins to the bars a row of this width can show. Each bar keeps the extremes of its bins, so a short transient still shows. */
export function barExtents(peaks: Peaks, count: number): { min: Float32Array; max: Float32Array } {
  const min = new Float32Array(count), max = new Float32Array(count);
  for (let bar = 0; bar < count; bar++) {
    const from = Math.floor(bar * peaks.bins / count);
    const to = Math.min(peaks.bins, Math.max(from + 1, Math.ceil((bar + 1) * peaks.bins / count)));
    for (let bin = from; bin < to; bin++) {
      if (peaks.min[bin] < min[bar]) min[bar] = peaks.min[bin];
      if (peaks.max[bin] > max[bar]) max[bar] = peaks.max[bin];
    }
  }
  return { min, max };
}
export const LINE_WIDTH = 2;
/** Pixel positions of the two trim lines, kept fully inside the wave, and the regions outside the range that are dimmed. */
export function trimGeometry(range: Readonly<{ start: number; end: number }>, duration: number, width: number) {
  const inside = (x: number) => Math.min(width - LINE_WIDTH / 2, Math.max(LINE_WIDTH / 2, x));
  const start = timeToX(range.start, duration, width), end = timeToX(range.end, duration, width);
  return { startX: inside(start), endX: inside(end), dimmed: [[0, start], [end, width]].filter(([from, to]) => to > from) as [number, number][] };
}
/** Runs `apply` at most once per frame with the latest value. `finish` drops anything pending and applies the exact final value now. */
export function coalesced<T>(apply: (value: T) => void, schedule: (run: () => void) => () => void) {
  let pending: { value: T } | null = null;
  let cancel: (() => void) | null = null;
  const drop = () => { cancel?.(); cancel = null; pending = null; };
  return {
    push(value: T) {
      pending = { value };
      cancel ??= schedule(() => {
        cancel = null;
        const latest = pending;
        pending = null;
        if (latest) apply(latest.value);
      });
    },
    finish(value: T) { drop(); apply(value); },
    cancel: drop,
  };
}
