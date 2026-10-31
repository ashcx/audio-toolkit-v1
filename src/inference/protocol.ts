import type { Recipe } from "../recipe";
import type { JobEvent } from "../job-events";
export type IsolationMode = Extract<Recipe["steps"][number], { kind: "isolation" }>["keep"];
export type InferenceInput = {
  planes: Float32Array<ArrayBuffer>[];
  backend: "auto" | "wasm";
};
export type InferenceResult =
  | Extract<JobEvent, { kind: "phase" | "model-download" }>
  | { kind: "backend"; backend: "wasm" | "webgpu+wasm" }
  | { kind: "done"; planes: Float32Array<ArrayBuffer>[]; backend: "wasm" | "webgpu+wasm" }
  | { kind: "error"; message: string; stage: "model" | "session" | "run"; backend: "wasm" | "webgpu+wasm" };
export type InferenceRequest = { kind: "inference"; sequence: number; planes: Float32Array<ArrayBuffer>[] };
export type InferenceReply =
  | { kind: "done"; planes: Float32Array<ArrayBuffer>[]; backend: "wasm" | "webgpu+wasm"; attempts: number; loads?: number }
  | { kind: "error"; message: string };
