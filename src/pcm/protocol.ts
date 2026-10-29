import type { ExecutionPlan } from "../planner";
export type PcmPlan = Extract<ExecutionPlan, { kind: "pcm" }>;
export type StoreOperation =
  | { op: "create"; name: string; mime: string }
  | { op: "write"; id: string; position: number; data: Uint8Array<ArrayBuffer> }
  | { op: "finish"; id: string }
  | { op: "discard"; id: string };
export type StorageReply =
  | { op: "create"; id: string }
  | { op: "write" }
  | { op: "finish"; file: File }
  | { op: "discard" }
  | { op: "error"; message: string };
export type StorageRequest = {
  kind: "storage";
  sequence: number;
  request: StoreOperation;
};
export type DspStats = {
  decodePasses: number;
  maxDecodedFrames: number;
  maxBlockFrames: number;
  encodedFrames: number;
  terminalEncoders: number;
  normalizationPasses: number;
  limitedNormalizations: number;
  clippedSamples: number;
};
export type WorkerResult =
  | StorageRequest
  | { kind: "done"; outputId: string; stats: DspStats }
  | { kind: "error"; message: string };
export type WorkerInput =
  | { kind: "start"; file: File; plan: PcmPlan; name: string }
  | { kind: "storage"; sequence: number; reply: StorageReply };
