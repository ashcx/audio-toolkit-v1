import { copy } from "./copy.ts";
import type { StepDraft } from "./recipe.ts";

/** The one line shown under a step title, whether the step is open or not. */
export function stepSummary(step: StepDraft): string {
  switch (step.kind) {
    case "trim": return copy.trim.summary(step.range);
    case "gain": return copy.gain.summary(step.db);
    case "normalize": return copy.normalize.summary(step);
    case "compress": return copy.compressor.summary(step);
    case "channels": return copy.channels.summary[step.channels];
    case "resample": return copy.sampleRate.summary(step.rateHz);
    case "speech": return copy.noise.summary[step.model];
    case "isolation": return copy.splitter.summary[step.keep];
    default: {
      const unreachable: never = step;
      return unreachable;
    }
  }
}
