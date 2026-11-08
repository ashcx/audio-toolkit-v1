import type { Recipe } from "../recipe";
import type { JobEvent } from "../job-events";
export type IsolationMode = Extract<Recipe["steps"][number], { kind: "isolation" }>["keep"];
export type InferenceBackend = "wasm" | "webgpu+wasm";
/** Stems in model order (drums, bass, other, vocals), each with one plane per input channel. */
export type Stems = Float32Array<ArrayBuffer>[][];
export type InferenceInput = {
  planes: Float32Array<ArrayBuffer>[];
  backend: "auto" | "wasm";
};
export type InferenceResult =
  | Extract<JobEvent, { kind: "phase" | "model-download" }>
  | { kind: "backend"; backend: InferenceBackend }
  | { kind: "done"; stems: Stems; backend: InferenceBackend; gpuDispatches: number }
  | { kind: "error"; message: string; stage: "model" | "session" | "run"; backend: InferenceBackend };
export type InferenceRequest = { kind: "inference"; sequence: number; planes: Float32Array<ArrayBuffer>[] };
export type InferenceReply =
  | { kind: "done"; stems: Stems; backend: InferenceBackend; attempts: number; loads: number }
  | { kind: "error"; message: string };
