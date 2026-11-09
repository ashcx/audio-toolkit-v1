import { recipeSchema, type EffectiveRecipe } from "./recipe.ts";
import type { PcmPlan } from "./pcm/protocol.ts";
import { frameTime, trim, type PcmStream } from "./pcm/blocks.ts";
export type PreviewRange = Readonly<{ start: number; end: number }>;
type TrimBounds = Readonly<{ start: number; end: number | null }>;
/** How much of a file a preview renders. */
export const PREVIEW_SECONDS = 15;
export function previewRange(trim: TrimBounds | null, duration: number | null): PreviewRange {
  const start = trim?.start ?? 0;
  return { start, end: Math.min(start + PREVIEW_SECONDS, trim?.end ?? duration ?? Infinity) };
}
/** The excerpt length to name on screen, or null when the preview covers the whole selection or the length is unknown. */
export function previewCutSeconds(trim: TrimBounds | null, duration: number | null): number | null {
  const end = trim?.end ?? duration;
  if (end === null) return null;
  return end - (trim?.start ?? 0) > PREVIEW_SECONDS ? PREVIEW_SECONDS : null;
}
export function previewPlans(snapshot: EffectiveRecipe) {
  const range = previewRange(snapshot.trim, snapshot.source.duration);
  const previewSnapshot = { ...snapshot, recipe: recipeSchema.parse({ ...snapshot.recipe, export: { format: "wav" } }) };
  const processed: PcmPlan = { kind: "pcm", snapshot: previewSnapshot, steps: previewSnapshot.recipe.steps, previewRange: range };
  const original: PcmPlan = { ...processed, steps: [] };
  const estimate = snapshot.recipe.steps.some(step => step.kind === "normalize" || step.kind === "isolation" || step.kind === "speech");
  return { original, processed, range, estimate };
}
export async function* previewExcerpt(source: PcmStream, range: PreviewRange): PcmStream {
  const bounded = async function* () {
    for await (const block of source) {
      if (frameTime(block) >= range.end) return;
      yield block;
      if (frameTime(block, block.planes[0].length) >= range.end) return;
    }
  };
  yield* trim(bounded(), range.start, range.end);
}
