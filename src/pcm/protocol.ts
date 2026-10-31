import type { IsolationOverlap } from "./isolation-window";
import type { InferenceRequest, InferenceReply } from "../inference/protocol";
import type { JobOperation } from "../job-events";
import type { ExecutionPlan } from "../planner";
export type PcmPlan = Extract<ExecutionPlan, { kind: "pcm" }>;
export type StoreOperation =
  | { op: "create"; name: string; mime: string }
  | { op: "write"; id: string; position: number; data: Uint8Array<ArrayBuffer> }
  | { op: "truncate"; id: string; length: number }
  | { op: "finish"; id: string }
  | { op: "discard"; id: string };
export type StorageReply =
  | { op: "create"; id: string }
  | { op: "write" }
  | { op: "truncate" }
  | { op: "finish"; file: File }
  | { op: "discard" }
  | { op: "error"; message: string };
export type StorageRequest = {
  kind: "storage";
  sequence: number;
  request: StoreOperation;
};
export type DspStats = {
  encoder: "pcm" | "native" | "wasm";
  decodePasses: number;
  maxDecodedFrames: number;
  maxBlockFrames: number;
  encodedFrames: number;
  terminalEncoders: number;
  isolationPasses: number;
  isolationWindows: number;
  maxIsolationFrames: number;
  isolationLoads: number;
  isolationBackends: ("wasm" | "webgpu+wasm")[];
  normalizationPasses: number;
  limitedNormalizations: number;
  clippedSamples: number;
};
export type WorkerResult =
  | StorageRequest
  | InferenceRequest
  | JobOperation
  | { kind: "done"; outputId: string; stats: DspStats }
  | { kind: "error"; message: string };
export type IsolationExperiment = { overlap?: IsolationOverlap; workerWindows?: 1 | 2 };
export type WorkerInput =
  | { kind: "start"; file: File; plan: PcmPlan; name: string; isolation?: Pick<IsolationExperiment, "overlap"> }
  | { kind: "storage"; sequence: number; reply: StorageReply }
  | { kind: "inference"; sequence: number; reply: InferenceReply };
