import { recipeSchema, type EffectiveRecipe } from "./recipe.ts";
import type { PcmPlan } from "./pcm/protocol.ts";
import { frameTime, trim, type PcmStream } from "./pcm/blocks.ts";
export type PreviewRange = Readonly<{ start: number; end: number }>;
export function previewPlans(snapshot: EffectiveRecipe) {
  const start = snapshot.trim?.start ?? 0;
  const end = Math.min(start + 15, snapshot.trim?.end ?? snapshot.source.duration ?? Infinity);
  const range: PreviewRange = { start, end };
  const previewSnapshot = { ...snapshot, recipe: recipeSchema.parse({ ...snapshot.recipe, export: { format: "wav" } }) };
  const processed: PcmPlan = { kind: "pcm", snapshot: previewSnapshot, steps: previewSnapshot.recipe.steps, reason: "Excerpt preview", previewRange: range };
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
