import type { load } from "../../vendor/neural/neural.js";

export const DEMUCS_MODEL = {
  file: "htdemucs_fp16.onnx",
  bytes: 85034606,
  sha256: "742a4f8594a48d6306da303b8b2dd8be2b54389b88557db034408b436effd775",
  segment: 343980,
  sources: ["drums", "bass", "other", "vocals"],
} as const;

type RuntimeSession = Awaited<ReturnType<typeof load>>;
type Feed = { data: Float32Array; dims: number[]; type: string };
type Output = { data: Float32Array; dims: number[] };

function float32(output: { data: unknown; dims: number[] } | undefined, name: string): Output {
  if (!output || !(output.data instanceof Float32Array)) throw new Error(`Demucs output ${name} is missing or not float32.`);
  return { data: output.data, dims: output.dims };
}

/** Planar [re, im] pairs per row (complex-as-channels) to separate real and imaginary blocks, or back. */
function splitPairs(cac: Float32Array, rows: number, plane: number) {
  const real = new Float32Array(rows * plane), imag = new Float32Array(rows * plane);
  for (let row = 0; row < rows; row++) {
    real.set(cac.subarray(2 * row * plane, (2 * row + 1) * plane), row * plane);
    imag.set(cac.subarray((2 * row + 1) * plane, (2 * row + 2) * plane), row * plane);
  }
  return { real, imag };
}

function joinPairs(real: Float32Array, imag: Float32Array, rows: number, plane: number) {
  const cac = new Float32Array(2 * rows * plane);
  for (let row = 0; row < rows; row++) {
    cac.set(real.subarray(row * plane, (row + 1) * plane), 2 * row * plane);
    cac.set(imag.subarray(row * plane, (row + 1) * plane), (2 * row + 1) * plane);
  }
  return cac;
}

/**
 * Presents htdemucs_fp16.onnx (spec_real, spec_imag, audio in; out_spec_real, out_spec_imag, out_wave out)
 * as the vendored separate()'s 'hybrid' contract (mix [1,C,L] and complex-as-channels mix_spec in, spec and wave out).
 */
export function demucsHybridSession(session: RuntimeSession) {
  return {
    inputs: [{ name: "mix", dims: [1, 2, DEMUCS_MODEL.segment] }, { name: "mix_spec" }],
    outputs: [{ name: "spec" }, { name: "wave" }],
    async run(feeds: Record<string, Feed>): Promise<Record<string, Output>> {
      const { mix, mix_spec: spec } = feeds;
      if (!mix || !spec || spec.dims.length !== 4 || spec.dims[1] % 2) throw new Error("Demucs input is unsupported.");
      const [, pairs, bins, frames] = spec.dims, channels = pairs / 2, plane = bins * frames;
      const { real, imag } = splitPairs(spec.data, channels, plane);
      const outputs = await session.run({
        spec_real: { data: real, dims: [1, channels, bins, frames], type: "float32" },
        spec_imag: { data: imag, dims: [1, channels, bins, frames], type: "float32" },
        audio: { data: mix.data, dims: mix.dims, type: "float32" },
      });
      const outReal = float32(outputs.out_spec_real, "out_spec_real"), outImag = float32(outputs.out_spec_imag, "out_spec_imag");
      const wave = float32(outputs.out_wave, "out_wave");
      const [, sources, outChannels, outBins, outFrames] = outReal.dims;
      if (outChannels !== channels || outBins !== bins || outFrames !== frames || sources !== DEMUCS_MODEL.sources.length) throw new Error(`Demucs output shape ${outReal.dims} is unsupported.`);
      return {
        spec: { data: joinPairs(outReal.data, outImag.data, sources * channels, plane), dims: [1, sources, pairs, bins, frames] },
        wave,
      };
    },
    free: () => session.free(),
  };
}
