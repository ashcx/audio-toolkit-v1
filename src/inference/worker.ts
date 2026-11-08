import { load } from "../../vendor/neural/neural.js";
import type { InferenceBackend, InferenceInput, InferenceResult, Stems } from "./protocol";
import { DEMUCS_MODEL, fetchModelBytes } from "./demucs-model";
import { separateSegment } from "./demucs-segment";
import { usableGpu } from "./gpu";

const report = (message: InferenceResult, transfer: Transferable[] = []) => self.postMessage(message, { transfer });
// ORT can create a "webgpu" session that runs every kernel on CPU when no adapter exists, so GPU use is
// judged by compute dispatches actually issued, not by the provider that was requested.
let dispatches = 0;
if (typeof GPUComputePassEncoder !== "undefined") {
  const dispatch = GPUComputePassEncoder.prototype.dispatchWorkgroups;
  GPUComputePassEncoder.prototype.dispatchWorkgroups = function (...args) { dispatches++;return dispatch.apply(this, args); };
}

let retained: { backend: InferenceBackend; session: Awaited<ReturnType<typeof load>> } | null = null;
self.onmessage = async ({ data }: MessageEvent<InferenceInput>) => {
  let backend: InferenceBackend = "wasm";
  let stage: "model" | "session" | "run" = "model";
  try {
    if (data.planes.length < 1 || data.planes.length > 2 || data.planes.some(plane => plane.length !== DEMUCS_MODEL.segment)) throw new Error("This isolation window is unsupported.");
    if (retained) backend = retained.backend;
    else if (data.backend === "auto" && (await usableGpu()).usable) backend = "webgpu+wasm";
    report({ kind: "backend", backend });
    if (!retained) {
      const base = new URL(import.meta.env.BASE_URL + "vendor/neural/", self.location.href);
      const bytes = await fetchModelBytes(new URL(DEMUCS_MODEL.file, base), (loaded, total) => report({ kind: "model-download", loaded, total }));
      report({ kind: "phase", phase: "Loading model" });stage = "session";
      const session = await load(bytes, { backend: backend === "wasm" ? "wasm" : "webgpu", executionProviders: backend === "wasm" ? ["wasm"] : ["webgpu", "wasm"], wasmPaths: base.href, threads: 1, sessionOptions: { enableCpuMemArena: false, enableMemPattern: false } });
      retained = { backend, session };
    }
    const { session } = retained;
    stage = "run";report({ kind: "phase", phase: "Separating" });
    const before = dispatches, [left, right = left] = data.planes;
    const stems = await separateSegment([left, right], async feeds => {
      const outputs = await session.run(feeds), result: Record<string, { data: Float32Array; dims: number[] }> = {};
      for (const [name, output] of Object.entries(outputs)) if (output.data instanceof Float32Array) result[name] = { data: output.data, dims: output.dims };
      return result;
    });
    const planes: Stems = data.planes.length === 1 ? stems.map(([l, r]) => [Float32Array.from(l, (value, index) => (value + r[index]) / 2)]) : stems;
    report({ kind: "done", stems: planes, backend, gpuDispatches: dispatches - before }, planes.flat().map(plane => plane.buffer));
  } catch (error) {
    report({ kind: "error", backend, stage, message: error instanceof Error ? error.message : "Voice / music isolation failed." });
  }
};
