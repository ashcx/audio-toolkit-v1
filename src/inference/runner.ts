import { UserFacingError } from "../errors.ts";
import type { JobEvent, IsolationDevice } from "../job-events";
import type { InferenceBackend, InferenceInput, InferenceResult } from "./protocol";

type Outcome = Extract<InferenceResult, { kind: "done" | "error" }>;

/** How long a worker may stay silent while downloading or loading the model before it is stopped. */
export const LOAD_WATCHDOG_MS = 120_000;
/** How long one window may take to separate before the worker is stopped. */
export const SEPARATE_WATCHDOG_MS = 300_000;

export class InferenceRunner {
  private retained: { worker: Worker; backend: InferenceInput["backend"] } | null = null;
  private backend: InferenceInput["backend"] = "auto";
  private stopped = false;
  private device: IsolationDevice | null = null;
  private stopReason: unknown = new DOMException("Cancelled", "AbortError");
  private active: { reject: (reason: unknown) => void } | null = null;
  stop(reason: unknown = new DOMException("Cancelled", "AbortError")) {
    this.stopped = true;this.stopReason = reason;
    this.retained?.worker.terminate();this.retained = null;
    const active = this.active;
    this.active = null;
    active?.reject(reason);
  }
  private setDevice(device: IsolationDevice, event: (value: JobEvent) => void) {
    this.device = device;
    event({ kind: "isolation-device", device });
  }
  async run(planes: Float32Array<ArrayBuffer>[], event: (value: JobEvent) => void) {
    let loads = 0;
    const attempt = (backend: InferenceInput["backend"]) => new Promise<Outcome>((resolve, reject) => {
      if (this.stopped) { reject(this.stopReason);return; }
      if (this.active) { reject(new Error("The splitter is already running."));return; }
      if (this.retained?.backend !== backend) {
        this.retained?.worker.terminate();this.retained = null;
        event({ kind: "phase", phase: "Loading isolation tools" });
        if (this.stopped) { reject(this.stopReason);return; }
        this.retained = { worker: new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "audio-isolation" }), backend };
        loads++;
      }
      const { worker } = this.retained;
      let selected: InferenceBackend = "wasm", stage: "model" | "session" | "run" = "model", timer: ReturnType<typeof setTimeout>;
      const finish = (keep: boolean) => {
        clearTimeout(timer);
        if (!this.active || this.retained?.worker !== worker) return false;
        this.active = null;
        if (!keep) { worker.terminate();this.retained = null; }
        return true;
      };
      const arm = (milliseconds: number) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (!finish(false)) return;
          if (selected === "webgpu+wasm" && stage !== "model") resolve({ kind: "error", backend: selected, stage, code: "split-stalled" });
          else reject(new UserFacingError("split-stalled", "The splitter stopped responding."));
        }, milliseconds);
      };
      arm(LOAD_WATCHDOG_MS);
      this.active = { reject: reason => { clearTimeout(timer);reject(reason); } };
      worker.onmessage = ({ data }: MessageEvent<InferenceResult>) => {
        if (!this.active || this.retained?.worker !== worker) return;
        if (data.kind === "backend") {
          selected = data.backend;
          if (this.device === null) this.setDevice(selected === "wasm" ? "cpu" : "preparing-gpu", event);
        }
        else if (data.kind === "model-download") { arm(LOAD_WATCHDOG_MS);event(data); }
        else if (data.kind === "phase") {
          if (data.phase === "Loading model") { stage = "session";arm(LOAD_WATCHDOG_MS); }
          if (data.phase === "Separating") { stage = "run";arm(SEPARATE_WATCHDOG_MS); }
          event(data);
        }
        else if (finish(data.kind === "done")) resolve(data);
      };
      worker.onerror = error => {
        error.preventDefault();
        if (finish(false)) reject(new UserFacingError("model-download-failed", `The splitter worker failed to load. ${error.message}`));
      };
      const copy = planes.map(plane => new Float32Array(plane));
      try { worker.postMessage({ planes: copy, backend } satisfies InferenceInput, copy.map(plane => plane.buffer)); }
      catch (error) { if (finish(false)) reject(error); }
    });
    let result = await attempt(this.backend);
    if (result.kind === "error" && result.backend === "webgpu+wasm" && result.stage !== "model") {
      this.backend = "wasm";
      this.setDevice("cpu-fallback", event);
      result = await attempt(this.backend);
    }
    if (result.kind === "error") throw new UserFacingError(result.code);
    if (this.stopped) throw this.stopReason;
    const backend: InferenceBackend = result.backend === "webgpu+wasm" && result.gpuDispatches > 0 ? "webgpu+wasm" : "wasm";
    if (result.backend === "webgpu+wasm") this.setDevice(backend === "wasm" ? "cpu" : "gpu", event);
    return { kind: "done" as const, stems: result.stems, backend, loads };
  }
}
