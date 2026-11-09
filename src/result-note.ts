import { copy } from "./copy.ts";
import type { DspStats } from "./pcm/protocol.ts";

/**
 * The one short note a finished export may carry, or null when the result is what was asked for.
 * Clipping comes first because it is audible. A loudness shortfall follows, from the reason that
 * needs the most explanation to the plainest one.
 */
export function resultNote(stats: Readonly<Pick<DspStats,
  "clippedSamples" | "loudnessRequestedLufs" | "loudnessAchievedLufs" | "normalizationLimitedByCeiling" | "limitedNormalizations"
>>): string | null {
  if (stats.clippedSamples > 0) return copy.result.clipped;
  if (stats.loudnessRequestedLufs !== null && stats.loudnessAchievedLufs === null) return copy.result.unmeasurable;
  if (stats.normalizationLimitedByCeiling) return copy.result.peakLimited({ achievedLufs: stats.loudnessAchievedLufs });
  if (stats.limitedNormalizations > 0) return copy.result.tooQuiet;
  return null;
}
