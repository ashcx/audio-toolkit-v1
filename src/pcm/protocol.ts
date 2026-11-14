import type { ErrorCode } from "../errors.ts";
import type { InferenceBackend, InferenceRequest, InferenceReply } from "../inference/protocol";
import type { JobOperation } from "../job-events";
import type { ExecutionPlan } from "../planner";
import type { Recipe } from "../recipe";
export type PcmPlan = Extract<ExecutionPlan, { kind: "pcm" }> & Readonly<{ previewRange?: import("../preview-plan").PreviewRange }>;
export type StoreNotice = { kind: "store"; op: "opened" | "removed"; id: string };
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
  isolationBackends: InferenceBackend[];
  normalizationPasses: number;
  limitedNormalizations: number;
  normalizationLimitedByCeiling: boolean;
  loudnessMeasuredLufs: number | null;
  loudnessRequestedLufs: number | null;
  loudnessAchievedLufs: number | null;
  truePeakDbtp: number | null;
  peakTargetDbtp: number | null;
  compressorMaxGainReductionDb: number;
  clippedSamples: number;
};
export type WorkerResult =
  | StoreNotice
  | InferenceRequest
  | JobOperation
  | { kind: "done"; outputId: string; file: File; stats: DspStats }
  | { kind: "error"; code: ErrorCode };
export type WorkerInput =
  | { kind: "start"; file: File; plan: PcmPlan; name: string }
  | { kind: "inference"; sequence: number; reply: InferenceReply };
export type EncodeStats = Pick<DspStats, "encoder" | "encodedFrames" | "terminalEncoders" | "maxBlockFrames" | "clippedSamples">;
export type EncodeInput =
  | { kind: "start"; settings: Recipe["export"]; name: string }
  | { kind: "block"; origin: number; offset: number; rate: number; planes: Float32Array[] }
  | { kind: "end" };
export type EncodeResult =
  | StoreNotice
  | Extract<JobOperation, { kind: "phase" }>
  | { kind: "consumed" }
  | { kind: "done"; outputId: string; file: File; stats: EncodeStats }
  | { kind: "error"; code: ErrorCode };
