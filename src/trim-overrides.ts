import type { FileId } from "./media";
import type { RecipeDraft, TrimRangeDraft } from "./recipe";
/** A file's own range, kept apart from the Trim all step so a gesture on one file never edits another. */
export type TrimOverrides = ReadonlyMap<FileId, TrimRangeDraft>;
export const setOverride = (overrides: TrimOverrides, id: FileId, range: TrimRangeDraft): TrimOverrides => new Map(overrides).set(id, range);
export function resetOverride(overrides: TrimOverrides, id: FileId): TrimOverrides {
  const next = new Map(overrides);
  next.delete(id);
  return next;
}
const WHOLE: TrimRangeDraft = { start: null, end: null };
const sharedRange = (recipe: RecipeDraft) => recipe.steps.find(step => step.kind === "trim")?.range ?? WHOLE;
/** True when an edit moved the Trim all range, so files with a custom range need a decision. */
export function sharedRangeChanged(before: RecipeDraft, after: RecipeDraft): boolean {
  const [a, b] = [sharedRange(before), sharedRange(after)];
  return !Object.is(a.start, b.start) || !Object.is(a.end, b.end);
}
