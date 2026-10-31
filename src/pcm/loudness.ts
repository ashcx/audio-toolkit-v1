export type BiquadCoefficients = Readonly<{
  b: readonly [number, number, number];
  a: readonly [number, number, number];
}>;
export type KWeighting = Readonly<{
  shelf: BiquadCoefficients;
  highPass: BiquadCoefficients;
}>;
export type LoudnessMeasurement = Readonly<{
  integratedLufs: number | null;
  samplePeak: number;
  truePeak: number;
  short: boolean;
}>;

const SHELF_FREQUENCY = 1681.974450955533;
const SHELF_GAIN_DB = 3.999843853973347;
const SHELF_Q = 0.7071752369554196;
const HIGH_PASS_FREQUENCY = 38.13547087602444;
const HIGH_PASS_Q = 0.5003270373238773;
// The BS.1770 loudness offset. Gates are applied to the resulting LUFS values.
const LOUDNESS_OFFSET = -0.691;
const ABSOLUTE_GATE_LUFS = -70;
const RELATIVE_GATE_LU = -10;
const HOP_SECONDS = 0.1;
const BLOCK_HOPS = 4;

export function kWeightingCoefficients(rate: number): KWeighting {
  if (!Number.isFinite(rate) || rate <= 0)
    throw new Error("Loudness measurement needs a positive sample rate.");
  const shelfK = Math.tan((Math.PI * SHELF_FREQUENCY) / rate);
  const shelfVh = 10 ** (SHELF_GAIN_DB / 20);
  const shelfVb = shelfVh ** 0.4996667741545416;
  const shelfA0 = 1 + shelfK / SHELF_Q + shelfK * shelfK;
  const highPassK = Math.tan((Math.PI * HIGH_PASS_FREQUENCY) / rate);
  const highPassA0 = 1 + highPassK / HIGH_PASS_Q + highPassK * highPassK;
  return {
    shelf: {
      b: [
        (shelfVh + (shelfVb * shelfK) / SHELF_Q + shelfK * shelfK) / shelfA0,
        (2 * (shelfK * shelfK - shelfVh)) / shelfA0,
        (shelfVh - (shelfVb * shelfK) / SHELF_Q + shelfK * shelfK) / shelfA0,
      ],
      a: [
        1,
        (2 * (shelfK * shelfK - 1)) / shelfA0,
        (1 - shelfK / SHELF_Q + shelfK * shelfK) / shelfA0,
      ],
    },
    highPass: {
      b: [1, -2, 1],
      a: [
        1,
        (2 * (highPassK * highPassK - 1)) / highPassA0,
        (1 - highPassK / HIGH_PASS_Q + highPassK * highPassK) / highPassA0,
      ],
    },
  };
}

type FilterState = { shelf1: number; shelf2: number; highPass1: number; highPass2: number };
const newFilterState = (): FilterState => ({ shelf1: 0, shelf2: 0, highPass1: 0, highPass2: 0 });

function shelf(state: FilterState, coefficients: BiquadCoefficients, value: number) {
  const [b0, b1, b2] = coefficients.b;
  const [, a1, a2] = coefficients.a;
  const output = b0 * value + state.shelf1;
  state.shelf1 = b1 * value - a1 * output + state.shelf2;
  state.shelf2 = b2 * value - a2 * output;
  return output;
}
function highPass(state: FilterState, coefficients: BiquadCoefficients, value: number) {
  const [b0, b1, b2] = coefficients.b;
  const [, a1, a2] = coefficients.a;
  const output = b0 * value + state.highPass1;
  state.highPass1 = b1 * value - a1 * output + state.highPass2;
  state.highPass2 = b2 * value - a2 * output;
  return output;
}
// BS.1770-5 Annex 2 true-peak FIR: 4 phases, 12 taps per phase.
// Phase-major coefficients operate on a 12-sample causal history with the
// newest sample at index 11, so phase 0 is the sample-aligned phase.
const TRUE_PEAK_PHASES: readonly (readonly number[])[] = [
  [0.0017089843750, 0.0109863281250, -0.0196533203125, 0.0332031250000, -0.0594482421875, 0.1373291015625, 0.9721679687500, -0.1022949218750, 0.0476074218750, -0.0266113281250, 0.0148925781250, -0.0083007812500],
  [-0.0291748046875, 0.0292968750000, -0.0517578125000, 0.0891113281250, -0.1665039062500, 0.4650878906250, 0.7797851562500, -0.2003173828125, 0.1015625000000, -0.0582275390625, 0.0330810546875, -0.0189208984375],
  [-0.0189208984375, 0.0330810546875, -0.0582275390625, 0.1015625000000, -0.2003173828125, 0.7797851562500, 0.4650878906250, -0.1665039062500, 0.0891113281250, -0.0517578125000, 0.0292968750000, -0.0291748046875],
  [-0.0083007812500, 0.0148925781250, -0.0266113281250, 0.0476074218750, -0.1022949218750, 0.9721679687500, 0.1373291015625, -0.0594482421875, 0.0332031250000, -0.0196533203125, 0.0109863281250, 0.0017089843750],
];
const TRUE_PEAK_TAPS = 12;
const TRUE_PEAK_FLUSH = TRUE_PEAK_TAPS - 1;
function truePeakAt(history: readonly number[]) {
  let peak = 0;
  for (const phase of TRUE_PEAK_PHASES) {
    let value = 0;
    for (let tap = 0; tap < TRUE_PEAK_TAPS; tap++)
      value += phase[tap] * history[TRUE_PEAK_TAPS - 1 - tap];
    peak = Math.max(peak, Math.abs(value));
  }
  return peak;
}

export class LoudnessMeter {
  private readonly channels: number;
  private readonly hopFrames: number;
  private readonly blockFrames: number;
  private readonly coefficients: KWeighting;
  private readonly filterStates: FilterState[];
  private readonly subEnergy: Float64Array;
  private readonly recent: { energy: Float64Array; frames: number }[] = [];
  private readonly blockLoudness: number[] = [];
  private readonly truePeakHistory: number[][];
  private subFrames = 0;
  private totalFrames = 0;
  private samplePeakValue = 0;
  private truePeakValue = 0;

  constructor(rate: number, channels: number) {
    if (!Number.isInteger(channels) || channels < 1 || channels > 2)
      throw new Error("Loudness measurement supports mono and stereo audio.");
    this.channels = channels;
    this.hopFrames = Math.max(1, Math.round(rate * HOP_SECONDS));
    this.blockFrames = this.hopFrames * BLOCK_HOPS;
    this.coefficients = kWeightingCoefficients(rate);
    this.filterStates = Array.from({ length: channels }, newFilterState);
    this.subEnergy = new Float64Array(channels);
    this.truePeakHistory = Array.from(
      { length: channels },
      () => new Array<number>(TRUE_PEAK_TAPS).fill(0),
    );
  }

  push(planes: readonly Float32Array[]): void {
    if (planes.length !== this.channels)
      throw new Error("The audio channel count changed during loudness measurement.");
    const frames = planes[0]?.length ?? 0;
    if (planes.some((plane) => plane.length !== frames))
      throw new Error("The audio channels have inconsistent lengths.");
    for (let frame = 0; frame < frames; frame++) {
      for (let channel = 0; channel < this.channels; channel++) {
        const value = planes[channel][frame];
        if (!Number.isFinite(value))
          throw new Error("Loudness measurement received invalid samples.");
        const magnitude = Math.abs(value);
        if (magnitude > this.samplePeakValue) this.samplePeakValue = magnitude;
        const state = this.filterStates[channel];
        const weighted = highPass(
          state,
          this.coefficients.highPass,
          shelf(state, this.coefficients.shelf, value),
        );
        this.subEnergy[channel] += weighted * weighted;
        const history = this.truePeakHistory[channel];
        history.shift();
        history.push(value);
        const peak = truePeakAt(history);
        if (peak > this.truePeakValue) this.truePeakValue = peak;
      }
      this.subFrames++;
      this.totalFrames++;
      if (this.subFrames === this.hopFrames) this.commitHop();
    }
  }

  finish(): LoudnessMeasurement {
    if (this.totalFrames === 0)
      return { integratedLufs: null, samplePeak: 0, truePeak: 0, short: false };
    for (let flush = 0; flush < TRUE_PEAK_FLUSH; flush++) {
      for (let channel = 0; channel < this.channels; channel++) {
        const history = this.truePeakHistory[channel];
        history.shift();
        history.push(0);
        const peak = truePeakAt(history);
        if (peak > this.truePeakValue) this.truePeakValue = peak;
      }
    }
    const short = this.totalFrames < this.blockFrames;
    let powers = this.blockLoudness.map(loudnessPower);
    if (!powers.length) {
      const energy =
        this.recent.reduce((total, part) => total + sumEnergy(part.energy), 0) +
        sumEnergy(this.subEnergy);
      powers = [energy / this.totalFrames];
    }
    const integratedLufs = gatedLoudness(powers);
    return {
      integratedLufs,
      samplePeak: this.samplePeakValue,
      truePeak: Math.max(this.truePeakValue, this.samplePeakValue),
      short,
    };
  }

  private commitHop() {
    this.recent.push({ energy: this.subEnergy.slice(), frames: this.subFrames });
    this.subEnergy.fill(0);
    this.subFrames = 0;
    if (this.recent.length > BLOCK_HOPS) this.recent.shift();
    if (this.recent.length === BLOCK_HOPS) {
      const frames = this.recent.reduce((total, part) => total + part.frames, 0);
      const energy = this.recent.reduce(
        (total, part) => total + sumEnergy(part.energy),
        0,
      );
      this.blockLoudness.push(loudnessOf(energy / frames));
    }
  }
}

function sumEnergy(values: Float64Array) {
  let total = 0;
  for (const value of values) total += value;
  return total;
}
function loudnessOf(power: number) {
  return power > 0 ? LOUDNESS_OFFSET + 10 * Math.log10(power) : -Infinity;
}
function loudnessPower(loudness: number) {
  return Number.isFinite(loudness) ? 10 ** ((loudness - LOUDNESS_OFFSET) / 10) : 0;
}
function gatedLoudness(powers: readonly number[]) {
  const audible = powers.map((power) => loudnessOf(power)).filter(
    (loudness) => loudness > ABSOLUTE_GATE_LUFS,
  );
  if (!audible.length) return null;
  const ungatedPower =
    audible.reduce((total, loudness) => total + loudnessPower(loudness), 0) /
    audible.length;
  const relativeGate = loudnessOf(ungatedPower) + RELATIVE_GATE_LU;
  const gated = audible.filter((loudness) => loudness > relativeGate);
  if (!gated.length) return null;
  const power =
    gated.reduce((total, loudness) => total + loudnessPower(loudness), 0) /
    gated.length;
  return loudnessOf(power);
}
