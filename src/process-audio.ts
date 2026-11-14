import { InferenceRunner } from "./inference/runner";
import { cleanupAll } from "./cleanup";
import { UserFacingError, failureOf } from "./errors.ts";
import { showsDuringSeparation, type JobOperation } from "./job-events";
import { removeStoreEntry, type StoredOutput } from "./output-store";
import type {
  DspStats,
  PcmPlan,
  WorkerResult,
  WorkerInput,
} from "./pcm/protocol";
export type ProcessedOutput = { output: StoredOutput; stats: DspStats };
export function processAudio(
  file: File,
  plan: PcmPlan,
  signal: AbortSignal,
  name: string,
  phase: (value: JobOperation) => void = () => undefined,
): Promise<ProcessedOutput> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./pcm-worker.ts", import.meta.url), {
      type: "module",
    });
    const inference = new InferenceRunner();
    let inferenceTask = Promise.resolve();
    let isolating = false;
    const stored = new Set<string>();
    let settled = false;
    const cleanup = async () => {
      await inferenceTask;
      const keys = [...stored];
      stored.clear();
      await cleanupAll(keys.map(key => () => removeStoreEntry(key)));
    };
    const stop = () => {
      worker.terminate();
      inference.stop(signal.reason);
      signal.removeEventListener("abort", abort);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      stop();
      void cleanup().then(() => reject(error), reject);
    };
    const abort = () => fail(signal.reason);
    worker.onmessage = ({ data }: MessageEvent<WorkerResult>) => {
      if (settled) return;
      if (data.kind === "isolation-progress") {
        if (data.completed === 0) return;
        isolating = data.completed < data.total;phase(data);
      }
      else if (data.kind === "phase" || data.kind === "model-download") {
        if (isolating && data.kind === "phase" && (data.phase === "Processing" || data.phase === "Processing / encoding")) return;
        isolating = false;phase(data);
      }
      else if (data.kind === "inference") {
        inferenceTask = inference.run(data.planes, value => { if (!isolating || showsDuringSeparation(value)) phase(value); }).then(
          reply => { if (!settled) worker.postMessage({ kind: "inference", sequence: data.sequence, reply } satisfies WorkerInput, reply.stems.flat().map(plane => plane.buffer)); },
          error => { if (!settled) worker.postMessage({ kind: "inference", sequence: data.sequence, reply: { kind: "error", code: failureOf(error, "split-failed").code } } satisfies WorkerInput); },
        );
      } else if (data.kind === "store") {
        if (data.op === "opened") stored.add(data.id);
        else stored.delete(data.id);
      } else if (data.kind === "error") fail(new UserFacingError(data.code));
      else {
        settled = true;
        stop();
        const { outputId, file, stats } = data;
        const output: StoredOutput = Object.freeze({ file, name: file.name, mime: file.type, release: () => removeStoreEntry(outputId) });
        void cleanup().then(
          () => resolve({ output, stats }),
          async (error) => {
            await cleanupAll([() => output.release()]);
            reject(error);
          },
        );
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      fail(new Error(event.message || "The audio worker failed."));
    };
    signal.addEventListener("abort", abort, { once: true });
    worker.postMessage({
      kind: "start",
      file,
      plan,
      name,
    } satisfies WorkerInput);
  });
}
