import { compilePlan } from "./planner.ts";
import { newExport, recipeSchema, snapshotForFile, type ExportDraft, type RecipeDraft } from "./recipe.ts";
import type { FileEntry } from "./media";

export function automaticExport(draft: RecipeDraft, files: readonly FileEntry[]): ExportDraft {
  const encoded = draft.export.format === "original" ? newExport("mp3") : draft.export;
  if (!files.length) return encoded;
  const candidate = recipeSchema.safeParse({...draft,export:newExport("original")});
  if (!candidate.success) return encoded;
  const recipe = candidate.data;
  const eligible = files.every(entry => {
    if (entry.inspection.kind !== "ready" || !entry.inspection.metadata.hasVideo) return false;
    const snapshot = snapshotForFile(recipe,entry);
    return snapshot.kind === "ready" && compilePlan(snapshot.snapshot,entry.inspection.metadata).kind === "copy";
  });
  return eligible ? newExport("original") : encoded;
}
