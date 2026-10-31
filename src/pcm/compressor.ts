import type { Recipe } from "../recipe";
import type { PcmBlock, PcmStream } from "./blocks";

export type CompressorStep = Extract<Recipe["steps"][number], { kind: "compress" }>;
export type CompressorPreset = CompressorStep["preset"];
export type CompressorSettings = Readonly<{
  thresholdDb: number;
  ratio: number;
  attackSeconds: number;
  releaseSeconds: number;
}>;
const PRESETS = {
  speech: { thresholdDb: -24, ratio: 2.5, attackMs: 5, releaseMs: 120 },
  music: { thresholdDb: -18, ratio: 2, attackMs: 15, releaseMs: 200 },
} satisfies Record<CompressorPreset, { thresholdDb: number; ratio: number; attackMs: number; releaseMs: number }>;
const MAX_GAIN_REDUCTION_DB = 60;

export function compressorSettings(preset: CompressorPreset, amount: number): CompressorSettings {
  const base = PRESETS[preset];
  const fraction = Math.max(0, Math.min(100, amount)) / 100;
  return {
    // The preset is the full-amount voicing. Lower amounts raise the threshold
    // and move the ratio toward 1 so only the loudest material is touched.
    thresholdDb: base.thresholdDb + (1 - fraction) * 12,
    ratio: 1 + (base.ratio - 1) * fraction,
    attackSeconds: base.attackMs / 1000,
    releaseSeconds: base.releaseMs / 1000,
  };
}

export class Compressor {
  readonly settings: CompressorSettings;
  private readonly attackCoefficient: number;
  private readonly releaseCoefficient: number;
  private gainReductionDb = 0;
  private maximumGainReductionDb = 0;

  constructor(rate: number, settings: CompressorSettings) {
    this.settings = settings;
    this.attackCoefficient = Math.exp(-1 / (settings.attackSeconds * rate));
    this.releaseCoefficient = Math.exp(-1 / (settings.releaseSeconds * rate));
  }

  get maxGainReductionDb() {
    return this.maximumGainReductionDb;
  }

  process(planes: readonly Float32Array[]): Float32Array[] {
    const frames = planes[0].length;
    const output = planes.map(() => new Float32Array(frames));
    for (let frame = 0; frame < frames; frame++) {
      let detection = 0;
      for (const plane of planes) {
        const value = plane[frame];
        if (!Number.isFinite(value)) throw new Error("The compressor received invalid samples.");
        detection = Math.max(detection, Math.abs(value));
      }
      const levelDb = detection > 0 ? 20 * Math.log10(detection) : -Infinity;
      const targetReduction = Math.min(
        MAX_GAIN_REDUCTION_DB,
        Math.max(0, (levelDb - this.settings.thresholdDb) * (1 - 1 / this.settings.ratio)),
      );
      const coefficient = targetReduction > this.gainReductionDb
        ? this.attackCoefficient
        : this.releaseCoefficient;
      this.gainReductionDb =
        coefficient * this.gainReductionDb + (1 - coefficient) * targetReduction;
      if (this.gainReductionDb > this.maximumGainReductionDb)
        this.maximumGainReductionDb = this.gainReductionDb;
      const gain = 10 ** (-this.gainReductionDb / 20);
      for (let channel = 0; channel < planes.length; channel++)
        output[channel][frame] = planes[channel][frame] * gain;
    }
    return output;
  }
}

export async function* compress(
  source: PcmStream,
  step: CompressorStep,
  options: {
    signal: AbortSignal;
    onGainReduction?: (maximumDb: number) => void;
  },
): PcmStream {
  if (!step.enabled || step.amount <= 0) {
    yield* source;
    return;
  }
  const settings = compressorSettings(step.preset, step.amount);
  let processor: Compressor | null = null;
  for await (const block of source) {
    options.signal.throwIfAborted();
    processor ??= new Compressor(block.rate, settings);
    const planes = processor.process(block.planes);
    yield { ...block, planes };
  }
  if (processor) options.onGainReduction?.(processor.maxGainReductionDb);
}
