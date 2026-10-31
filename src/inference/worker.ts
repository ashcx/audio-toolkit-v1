import { load, separate } from "../../vendor/neural/neural.js";
import type { InferenceInput, InferenceResult } from "./protocol";
import { ISOLATION_WINDOW } from "../pcm/isolation-window";

const MODEL_BYTES = 13184191;
const MODEL_HASH = "3f049a0e4ce3c08264a6212a50445ba77f02a517cd4c6dc86cbe1ca130176d67";
const report = (message: InferenceResult, transfer: Transferable[] = []) => self.postMessage(message, { transfer });
async function modelBytes(base: URL) {
  const response = await fetch(new URL("scnet.int8.onnx", base));
  if (!response.ok || !response.body) throw new Error("Could not load the isolation model. Check your connection and retry.");
  const bytes = new Uint8Array(MODEL_BYTES), reader = response.body.getReader();
  let received = 0, reported = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (received + value.length > MODEL_BYTES) throw new Error("The isolation model could not be verified. Retry.");
      bytes.set(value, received);received += value.length;
      if (received - reported >= 256 * 1024 || received === MODEL_BYTES) {
        report({ kind: "model-download", loaded: received, total: MODEL_BYTES });reported = received;
      }
    }
  } finally { reader.releaseLock(); }
  if (received !== MODEL_BYTES) throw new Error("The isolation model download is incomplete. Retry.");
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), value => value.toString(16).padStart(2, "0")).join("");
  if (hash !== MODEL_HASH) throw new Error("The isolation model could not be verified. Retry.");
  return bytes;
}
async function usableGpu() {
  const gpu = "gpu" in navigator ? navigator.gpu : null;
  if (!gpu || typeof gpu !== "object" || !("requestAdapter" in gpu) || typeof gpu.requestAdapter !== "function") return false;
  const adapter: unknown = await gpu.requestAdapter().catch(() => null);
  if (!adapter || typeof adapter !== "object") return false;
  const info = "info" in adapter ? adapter.info : null;
  return !(info && typeof info === "object" && (("isFallbackAdapter" in info && info.isFallbackAdapter === true) || ("architecture" in info && info.architecture === "swiftshader")));
}
let retainedBackend: "wasm" | "webgpu+wasm" = "wasm";
let retainedSession: Awaited<ReturnType<typeof load>> | null = null;
self.onmessage = async ({ data }: MessageEvent<InferenceInput>) => {
  let backend: "wasm" | "webgpu+wasm" = "wasm";
  let stage: "model" | "session" | "run" = "model";
  try {
    const frames = data.planes[0]?.length;
    if (!frames || frames > ISOLATION_WINDOW || data.planes.length < 1 || data.planes.length > 2 || data.planes.some(plane => plane.length !== frames)) throw new Error("This isolation window is unsupported.");
    if (retainedSession) backend = retainedBackend;
    else if (data.backend === "auto" && await usableGpu()) backend = "webgpu+wasm";
    report({ kind: "backend", backend });
    const base = new URL(import.meta.env.BASE_URL + "vendor/neural/", self.location.href);
    if (!retainedSession) {
      const bytes = await modelBytes(base);
      report({ kind: "phase", phase: "Loading model" });stage = "session";
      retainedSession = await load(bytes, { backend: backend === "wasm" ? "wasm" : "webgpu", executionProviders: backend === "wasm" ? ["wasm"] : ["webgpu", "wasm"], wasmPaths: base.href, threads: 1, sessionOptions: { enableCpuMemArena: false, enableMemPattern: false } });
      retainedBackend = backend;
    }
    const session = retainedSession;
    const result = await separate(data.planes, {
      sampleRate: 44100, model: "scnet", targets: ["vocals"], step: 1, standardize: false,
      session: async () => {
        stage = "run";report({ kind: "phase", phase: "Separating" });
        return {
          inputs: session.inputs.map(input => ({ name: input.name })), outputs: session.outputs,
          async run(feeds) {
            const values: Parameters<typeof session.run>[0] = {};
            for (const [name, feed] of Object.entries(feeds)) {
              if (feed.type !== "float32") throw new Error("The isolation model input is unsupported.");
              values[name] = { ...feed, type: "float32" };
            }
            const outputs = await session.run(values), result: Record<string, { data: Float32Array; dims: number[] }> = {};
            for (const [name, output] of Object.entries(outputs)) {
              if (!(output.data instanceof Float32Array)) throw new Error("The isolation model output is unsupported.");
              result[name] = { data: output.data, dims: output.dims };
            }
            return result;
          },
        };
      },
    });
    const selected = result.stems.vocals;
    if (selected.length !== 2 || selected.some(plane => plane.length !== frames)) throw new Error("The isolation model returned incomplete audio.");
    const planes = data.planes.length === 1
      ? [Float32Array.from(selected[0], (value, index) => (value + selected[1][index]) / 2)]
      : selected.map(plane => new Float32Array(plane));
    report({ kind: "done", planes, backend }, planes.map(plane => plane.buffer));
  } catch (error) {
    report({ kind: "error", backend, stage, message: error instanceof Error ? error.message : "Voice / music isolation failed." });
  }
};
