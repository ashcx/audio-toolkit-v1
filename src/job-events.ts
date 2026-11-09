export type JobPhase = "Preparing" | "Reading" | "Extracting" | "Decoding" | "Processing" | "Normalizing" | "Separating" | "Processing / encoding" | "Encoding" | "Saving" | "Analyzing for isolation" | "Loading isolation tools" | "Loading model";
export type JobOperation = { kind: "phase"; phase: JobPhase } | { kind: "model-download"; loaded: number; total: number } | { kind: "isolation-progress"; completed: number; total: number };

/**
 * Once separation reports its own percent, the engine's stage changes must not replace that line.
 * The model download and the model start still may, because they come before the first percent is real.
 */
export function showsDuringSeparation(operation: JobOperation): boolean {
  return operation.kind === "model-download" || (operation.kind === "phase" && operation.phase === "Loading model");
}
