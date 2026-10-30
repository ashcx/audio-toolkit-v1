import { z } from "zod";
import { newExport, type RecipeDraft } from "./recipe.ts";

export const presetSchema = z.enum(["original", "mp3", "speech", "voice", "karaoke"]);
export const PRESETS = {
  original: "Extract original audio",
  mp3: "High quality MP3",
  speech: "Speech",
  voice: "Isolate voice",
  karaoke: "Karaoke",
} satisfies Record<z.infer<typeof presetSchema>, string>;

export function presetRecipe(preset: z.infer<typeof presetSchema>, current: RecipeDraft): RecipeDraft {
  const trim = current.steps.find(step => step.kind === "trim");
  const steps: RecipeDraft["steps"] = preset !== "original" && trim ? [trim] : [];
  switch (preset) {
    case "original": return { version: 1, steps, export: newExport("original") };
    case "mp3": return { version: 1, steps, export: newExport("mp3") };
    case "speech": return { version: 1, steps: [...steps, { id: crypto.randomUUID(), kind: "channels", channels: "mono" }, { id: crypto.randomUUID(), kind: "normalize", targetDbfs: -1 }], export: { format: "mp3", bitrateKbps: 128 } };
    case "voice": return { version: 1, steps: [...steps, { id: crypto.randomUUID(), kind: "isolation", keep: "voice" }, { id: crypto.randomUUID(), kind: "normalize", targetDbfs: -1 }], export: newExport("mp3") };
    case "karaoke": return { version: 1, steps: [...steps, { id: crypto.randomUUID(), kind: "isolation", keep: "music" }], export: newExport("mp3") };
  }
}
