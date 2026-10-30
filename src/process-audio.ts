import { InferenceRunner } from "./inference/runner";
import { cleanupAll } from "./cleanup";
import type { JobEvent } from "./job-events";
import { createOutputStore, type StoredOutput } from "./output-store";
import type {
  DspStats,
  PcmPlan,
  StorageReply,
  StoreOperation,
  WorkerResult,
  WorkerInput,
} from "./pcm/protocol";
type Store = Awaited<ReturnType<typeof createOutputStore>>;
type Entry =
  | { kind: "open"; store: Store }
  | { kind: "closed"; store: Store; output: StoredOutput };
export type ProcessedOutput = { output: StoredOutput; stats: DspStats };
export function processAudio(
  file: File,
  plan: PcmPlan,
  signal: AbortSignal,
  name: string,
  phase: (value: JobEvent) => void = () => undefined,
): Promise<ProcessedOutput> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./pcm-worker.ts", import.meta.url), {
      type: "module",
    });
    const inference = new InferenceRunner();
    let inferenceTask = Promise.resolve();
    let isolating = false;
    const stores = new Map<string, Entry>();
    let serial = Promise.resolve(),
      settled = false;
    const cleanup = async () => {
      await serial;
      await inferenceTask;
      await cleanupAll([...stores.values()].map(entry => () => entry.store.discard()));
      stores.clear();
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
    const handle = async (request: StoreOperation): Promise<StorageReply> => {
      if (request.op === "create") {
        const store = await createOutputStore(request.name, request.mime),
          id = crypto.randomUUID();
        stores.set(id, { kind: "open", store });
        return { op: "create", id };
      }
      const entry = stores.get(request.id);
      if (!entry) throw new Error("Temporary output is unavailable.");
      if (request.op === "discard") {
        await entry.store.discard();
        stores.delete(request.id);
        return { op: "discard" };
      }
      if (entry.kind !== "open")
        throw new Error("Temporary output is already closed.");
      if (request.op === "write") {
        await entry.store.write(request.position, request.data);
        return { op: "write" };
      }
      if (request.op === "truncate") {
        await entry.store.truncate(request.length);
        return { op: "truncate" };
      }
      const output = await entry.store.finish();
      stores.set(request.id, { kind: "closed", store: entry.store, output });
      return { op: "finish", file: output.file };
    };
    worker.onmessage = ({ data }: MessageEvent<WorkerResult>) => {
      if (settled) return;
      if (data.kind === "isolation-progress") { isolating = data.completed < data.total;phase(data); }
      else if (data.kind === "phase" || data.kind === "model-download") {
        if (isolating && data.kind === "phase" && (data.phase === "Processing" || data.phase === "Processing / encoding")) return;
        isolating = false;phase(data);
      }
      else if (data.kind === "inference") {
        inferenceTask = inference.run(data.planes, value => { if (value.kind === "isolation-device" || !isolating) phase(value); }).then(
          reply => { if (!settled) worker.postMessage({ kind: "inference", sequence: data.sequence, reply } satisfies WorkerInput, reply.planes.map(plane => plane.buffer)); },
          error => { if (!settled) worker.postMessage({ kind: "inference", sequence: data.sequence, reply: { kind: "error", message: error instanceof Error ? error.message : "Isolation failed." } } satisfies WorkerInput); },
        );
      } else if (data.kind === "storage") {
        serial = serial.then(async () => {
          let reply: StorageReply;
          try {
            reply = await handle(data.request);
          } catch (error) {
            reply = {
              op: "error",
              message:
                error instanceof DOMException &&
                error.name === "QuotaExceededError"
                  ? "Not enough device storage for this output."
                  : error instanceof Error
                    ? error.message
                    : "Temporary storage failed.",
            };
          }
          if (!settled)
            worker.postMessage({
              kind: "storage",
              sequence: data.sequence,
              reply,
            } satisfies WorkerInput);
        });
      } else if (data.kind === "error") fail(new Error(data.message));
      else {
        const entry = stores.get(data.outputId);
        if (entry?.kind !== "closed") {
          fail(new Error("The output did not finish saving."));
          return;
        }
        settled = true;
        stop();
        stores.delete(data.outputId);
        void cleanup().then(
          () => resolve({ output: entry.output, stats: data.stats }),
          async (error) => {
            await cleanupAll([() => entry.output.release()]);
            reject(error);
          },
        );
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      fail(new Error(event.message || "Audio processing failed."));
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
