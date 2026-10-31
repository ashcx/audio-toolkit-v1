import type { JobEvent, IsolationDevice } from "../job-events";
import type { InferenceInput, InferenceResult } from "./protocol";

export class InferenceRunner {
  private idle: { worker: Worker; backend: InferenceInput["backend"]; windows: number } | null = null;
  private readonly workerWindows: 1 | 2;
  constructor(workerWindows: 1 | 2 = 1) {
    if (workerWindows !== 1 && workerWindows !== 2) throw new Error("This isolation worker lifetime is unsupported.");
    this.workerWindows = workerWindows;
  }
  private backend: InferenceInput["backend"] = "auto";
  private stopped = false;
  private device: IsolationDevice | null = null;
  private stopReason: unknown = new DOMException("Cancelled", "AbortError");
  private active: { worker: Worker; reject: (reason: unknown) => void } | null = null;
  stop(reason: unknown = new DOMException("Cancelled", "AbortError")) {
    this.stopped = true;this.stopReason = reason;
    this.idle?.worker.terminate();this.idle = null;
    const active = this.active;
    this.active = null;
    active?.worker.terminate();active?.reject(reason);
  }
  async run(planes: Float32Array<ArrayBuffer>[], event: (value: JobEvent) => void) {
    let loads = 0;
    const attempt = (backend: InferenceInput["backend"]) => new Promise<Extract<InferenceResult, { kind: "done" | "error" }>>((resolve, reject) => {
      if (this.stopped) { reject(this.stopReason);return; }
      if (this.active) { reject(new Error("Isolation is already running."));return; }
      event({ kind: "phase", phase: "Loading isolation tools" });
      if (this.stopped) { reject(this.stopReason);return; }
      const idle = this.idle;this.idle = null;
      if (idle && idle.backend !== backend) idle.worker.terminate();
      const retained = idle?.backend === backend ? idle : null;
      if (!retained) loads++;
      const worker = retained?.worker ?? new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "audio-isolation" });
      let separating = false;
      let selectedBackend: "wasm" | "webgpu+wasm" = "wasm";
      let stage: "model" | "session" | "run" = "model";
      let timer: ReturnType<typeof setTimeout>;
      const finish = (successBackend?: "wasm" | "webgpu+wasm") => {
        clearTimeout(timer);
        if (this.active?.worker !== worker) return false;
        this.active = null;
        const windows = (retained?.windows ?? 0) + 1;
        if (successBackend && windows < this.workerWindows) this.idle = { worker, backend: successBackend === "wasm" ? "wasm" : "auto", windows };
        else worker.terminate();
        return true;
      };
      const deadline = (milliseconds: number) => setTimeout(() => {
        if (!finish()) return;
        const message = "Isolation stopped responding. Retry, or try a shorter selection.";
        if (selectedBackend === "webgpu+wasm" && stage !== "model") resolve({ kind: "error", backend: selectedBackend, stage, message });
        else reject(new Error(message));
      }, milliseconds);
      timer = deadline(120_000);
      this.active = { worker, reject: reason => { clearTimeout(timer);reject(reason); } };
      worker.onmessage = ({ data }: MessageEvent<InferenceResult>) => {
        if (this.active?.worker !== worker) return;
        if (data.kind === "backend") {
          selectedBackend = data.backend;
          this.device = selectedBackend === "webgpu+wasm" ? (this.device === "gpu" ? "gpu" : "preparing-gpu") : this.device === "cpu-fallback" ? "cpu-fallback" : "cpu";
          event({ kind: "isolation-device", device: this.device });
        }
        else if (data.kind === "phase" || data.kind === "model-download") {
          if (data.kind === "phase" && data.phase === "Loading model") stage = "session";
          if (data.kind === "phase" && data.phase === "Separating" && !separating) { stage = "run";separating = true;clearTimeout(timer);timer = deadline(300_000); }
          event(data);
        }
        else if (finish(data.kind === "done" ? data.backend : undefined)) resolve(data);
      };
      worker.onerror = error => {
        error.preventDefault();
        if (finish()) reject(new Error("Could not load isolation tools. Check your connection and retry."));
      };
      const copy = planes.map(plane => new Float32Array(plane));
      try { worker.postMessage({ planes: copy, backend } satisfies InferenceInput, copy.map(plane => plane.buffer)); }
      catch (error) { if (finish()) reject(error); }
    });
    let attempts = 1;
    let result = await attempt(this.backend);
    if (result.kind === "error" && result.backend === "webgpu+wasm" && result.stage !== "model") { this.backend = "wasm";this.device = "cpu-fallback";attempts++;
      event({ kind: "isolation-device", device: "cpu-fallback" });
      result = await attempt(this.backend);
    }
    if (result.kind === "error") throw new Error(result.message);
    if (result.backend === "wasm") this.backend = "wasm";
    this.device = result.backend === "webgpu+wasm" ? "gpu" : this.device === "cpu-fallback" ? "cpu-fallback" : "cpu";
    event({ kind: "isolation-device", device: this.device });
    if (this.stopped) throw this.stopReason;
    return { ...result, attempts, loads };
  }
}
