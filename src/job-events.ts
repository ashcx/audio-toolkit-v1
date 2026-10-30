export type JobPhase = "Preparing" | "Reading" | "Extracting" | "Decoding" | "Processing" | "Normalizing" | "Separating" | "Processing / encoding" | "Encoding" | "Saving" | "Analyzing for isolation" | "Loading isolation tools" | "Loading model";
export type JobOperation = { kind: "phase"; phase: JobPhase } | { kind: "model-download"; loaded: number; total: number } | { kind: "isolation-progress"; completed: number; total: number };

export type IsolationDevice = "preparing-gpu" | "gpu" | "cpu" | "cpu-fallback";
export type JobEvent = JobOperation | { kind: "isolation-device"; device: IsolationDevice };
