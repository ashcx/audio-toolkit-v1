import type { TrimRangeDraft } from "./recipe";
export function trimHandles(range: TrimRangeDraft, bound: number) {
  const gap = Math.min(0.001, bound);
  const end = Math.max(gap, Math.min(bound, Number.isFinite(range.end) ? range.end ?? bound : bound));
  const start = Math.max(0, Math.min(end - gap, Number.isFinite(range.start) ? range.start ?? 0 : 0));
  return {start,end,gap};
}
export function changeTrimHandle(range: TrimRangeDraft, bound: number, handle: "start" | "end", value: number): TrimRangeDraft {
  const {start,end,gap} = trimHandles(range,bound);
  if (handle === "start") {
    const next = Math.max(0,Math.min(value,end-gap));
    return {start:next,end:range.end === null || (Number.isFinite(range.end) && range.end > next) ? range.end : end};
  }
  const next = Math.min(bound,Math.max(value,start+gap));
  return {start:range.start === null || (Number.isFinite(range.start) && range.start >= 0 && range.start < next) ? range.start : start,end:next};
}
