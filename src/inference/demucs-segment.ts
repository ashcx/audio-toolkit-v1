import { DEMUCS_MODEL } from "./demucs-model.ts";

const { segment: DEMUCS_SEGMENT, sources } = DEMUCS_MODEL, SOURCES = sources.length;
const N = 4096, HOP = 1024, BINS = N / 2, FRAMES = Math.ceil(DEMUCS_SEGMENT / HOP), PAD = 1536, TRIM = 2;
const PADDED = FRAMES * HOP + 2 * PAD, CENTERED = PADDED + N, OUTPUT_START = N / 2 + PAD;
const SCALE = 1 / Math.sqrt(N);
const WINDOW = Float64Array.from({ length: N }, (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / N));
const ENVELOPE = Float64Array.from({ length: HOP }, (_, index) => {
  let sum = 0;
  for (let frame = 0; frame < N / HOP; frame++) sum += WINDOW[index + frame * HOP] ** 2;
  return sum;
});
const COS = Float64Array.from({ length: N / 2 }, (_, index) => Math.cos((2 * Math.PI * index) / N));
const SIN = Float64Array.from({ length: N / 2 }, (_, index) => Math.sin((2 * Math.PI * index) / N));
const REVERSED = Uint16Array.from({ length: N }, (_, index) => {
  let reversed = 0;
  for (let bit = 1, value = index; bit < N; bit <<= 1, value >>= 1) reversed = (reversed << 1) | (value & 1);
  return reversed;
});

function fft(re: Float64Array, im: Float64Array, inverse: boolean) {
  for (let index = 0; index < N; index++) {
    const swap = REVERSED[index];
    if (swap > index) {
      const r = re[index], i = im[index];
      re[index] = re[swap]; im[index] = im[swap]; re[swap] = r; im[swap] = i;
    }
  }
  const sign = inverse ? 1 : -1;
  for (let size = 2; size <= N; size <<= 1) {
    const half = size >> 1, step = N / size;
    for (let start = 0; start < N; start += size) {
      for (let k = 0; k < half; k++) {
        const c = COS[k * step], s = sign * SIN[k * step], a = start + k, b = a + half;
        const tr = re[b] * c - im[b] * s, ti = re[b] * s + im[b] * c;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
  }
}

const reflect = (index: number, length: number) => index < 0 ? -index : index >= length ? 2 * (length - 1) - index : index;

/** HTDemucs._spec: reflect pad to whole hops, centered normalized periodic-Hann STFT, frames 2..337, Nyquist dropped. Layout [channel][bin][frame]. */
export function demucsSpectrogram(planes: readonly [Float32Array, Float32Array]) {
  const real = new Float32Array(2 * BINS * FRAMES), imag = new Float32Array(2 * BINS * FRAMES);
  const centered = planes.map(plane => Float64Array.from({ length: CENTERED }, (_, index) => plane[reflect(reflect(index - N / 2, PADDED) - PAD, DEMUCS_SEGMENT)]));
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let frame = 0; frame < FRAMES; frame++) {
    const from = (frame + TRIM) * HOP;
    for (let index = 0; index < N; index++) {
      re[index] = centered[0][from + index] * WINDOW[index];
      im[index] = centered[1][from + index] * WINDOW[index];
    }
    fft(re, im, false);
    for (let bin = 0; bin < BINS; bin++) {
      const mirror = (N - bin) % N, left = bin * FRAMES + frame, right = (BINS + bin) * FRAMES + frame;
      real[left] = ((re[bin] + re[mirror]) / 2) * SCALE;
      imag[left] = ((im[bin] - im[mirror]) / 2) * SCALE;
      real[right] = ((im[bin] + im[mirror]) / 2) * SCALE;
      imag[right] = ((re[mirror] - re[bin]) / 2) * SCALE;
    }
  }
  return { real, imag };
}

/** HTDemucs._ispec plus the time branch: per source and channel, the iSTFT of the model's spectrogram added to its waveform. */
export function demucsWaveforms(outReal: Float32Array, outImag: Float32Array, outWave: Float32Array) {
  const re = new Float64Array(N), im = new Float64Array(N);
  const overlap = [new Float64Array(CENTERED), new Float64Array(CENTERED)];
  return Array.from({ length: SOURCES }, (_, source) => {
    overlap.forEach(plane => plane.fill(0));
    const left = source * 2 * BINS * FRAMES, right = left + BINS * FRAMES;
    for (let frame = 0; frame < FRAMES; frame++) {
      re.fill(0); im.fill(0);
      re[0] = outReal[left + frame]; im[0] = outReal[right + frame];
      for (let bin = 1; bin < BINS; bin++) {
        const lr = outReal[left + bin * FRAMES + frame], li = outImag[left + bin * FRAMES + frame];
        const rr = outReal[right + bin * FRAMES + frame], ri = outImag[right + bin * FRAMES + frame];
        re[bin] = lr - ri; im[bin] = li + rr;
        re[N - bin] = lr + ri; im[N - bin] = rr - li;
      }
      fft(re, im, true);
      const from = (frame + TRIM) * HOP;
      for (let index = 0; index < N; index++) {
        overlap[0][from + index] += re[index] * SCALE * WINDOW[index];
        overlap[1][from + index] += im[index] * SCALE * WINDOW[index];
      }
    }
    return overlap.map((plane, channel) => {
      const wave = outWave.subarray((source * 2 + channel) * DEMUCS_SEGMENT, (source * 2 + channel + 1) * DEMUCS_SEGMENT);
      return Float32Array.from({ length: DEMUCS_SEGMENT }, (_, index) => {
        const position = OUTPUT_START + index;
        return plane[position] / ENVELOPE[position % HOP] + wave[index];
      });
    });
  });
}

type Tensor = { data: Float32Array; dims: number[] };
export type DemucsRun = (feeds: Record<"spec_real" | "spec_imag" | "audio", Tensor & { type: "float32" }>) => Promise<Record<string, Tensor | undefined>>;

function output(outputs: Record<string, Tensor | undefined>, name: string, dims: number[]) {
  const value = outputs[name];
  if (!value || value.dims.join() !== dims.join()) throw new Error(`The isolation model returned ${name} with an unsupported shape.`);
  return value.data;
}

/** One htdemucs_fp16.onnx segment: stereo window in, four stems out in model order (drums, bass, other, vocals). */
export async function separateSegment(planes: readonly [Float32Array, Float32Array], run: DemucsRun) {
  const { real, imag } = demucsSpectrogram(planes), audio = new Float32Array(2 * DEMUCS_SEGMENT);
  audio.set(planes[0]); audio.set(planes[1], DEMUCS_SEGMENT);
  const spec = [1, 2, BINS, FRAMES], outputs = await run({
    spec_real: { data: real, dims: spec, type: "float32" },
    spec_imag: { data: imag, dims: spec, type: "float32" },
    audio: { data: audio, dims: [1, 2, DEMUCS_SEGMENT], type: "float32" },
  });
  const outSpec = [1, SOURCES, 2, BINS, FRAMES];
  return demucsWaveforms(output(outputs, "out_spec_real", outSpec), output(outputs, "out_spec_imag", outSpec), output(outputs, "out_wave", [1, SOURCES, 2, DEMUCS_SEGMENT]));
}
