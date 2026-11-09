import type { ErrorCode } from "../errors.ts";
import type { JobOperation } from "../job-events";
import type { Stems } from "./demucs-model";
export type InferenceBackend = "wasm" | "webgpu+wasm";
export type InferenceInput = {
  planes: Float32Array<ArrayBuffer>[];
  backend: "auto" | "wasm";
};
export type InferenceResult =
  | Extract<JobOperation, { kind: "phase" | "model-download" }>
  | { kind: "backend"; backend: InferenceBackend }
  | { kind: "done"; stems: Stems; backend: InferenceBackend; gpuDispatches: number }
  | { kind: "error"; code: ErrorCode; stage: "model" | "session" | "run"; backend: InferenceBackend };
export type InferenceRequest = { kind: "inference"; sequence: number; planes: Float32Array<ArrayBuffer>[] };
export type InferenceDone = { kind: "done"; stems: Stems; backend: InferenceBackend; loads: number };
export type InferenceReply = InferenceDone | { kind: "error"; code: ErrorCode };
