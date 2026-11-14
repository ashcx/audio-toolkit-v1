import type { ErrorCode } from "../errors.ts";
import type { InferenceBackend, InferenceRequest, InferenceReply } from "../inference/protocol";
import type { JobOperation } from "../job-events";
import type { ExecutionPlan } from "../planner";
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
