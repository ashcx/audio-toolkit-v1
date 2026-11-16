export type View = "original" | "result";

export const viewsOf = (playable: Readonly<Record<View, boolean>>): readonly View[] =>
  (["original", "result"] as const).filter(view => playable[view]);

export function shownView(views: readonly View[], chosen: View | null, editing: boolean): View | null {
  if (editing && views.includes("original")) return "original";
  if (chosen && views.includes(chosen)) return chosen;
  return views.includes("result") ? "result" : views[0] ?? null;
}

export function carryPosition({ from, to, time, trimStart, resultDuration }: Readonly<{
  from: View; to: View; time: number; trimStart: number; resultDuration: number;
}>): number {
  if (from === to) return time;
  return to === "result"
    ? Math.min(resultDuration, Math.max(0, time - trimStart))
    : time + trimStart;
}

export type Carry = Readonly<{ view: View; time: number; play: boolean }>;

export function retarget(at: Carry, next: View, trimStart: number, resultDuration: number): Carry {
  return next === at.view ? at : { view: next, time: carryPosition({ from: at.view, to: next, time: at.time, trimStart, resultDuration }), play: at.play };
}
