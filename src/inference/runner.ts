import type { JobEvent } from "../job-events";
import type { InferenceInput, InferenceResult } from "./protocol";

export class InferenceRunner {
  private backend: InferenceInput["backend"] = "auto";
  private stopped = false;
  private stopReason: unknown = new DOMException("Cancelled", "AbortError");
  private active: { worker: Worker; reject: (reason: unknown) => void } | null = null;
  stop(reason: unknown = new DOMException("Cancelled", "AbortError")) {
    this.stopped = true;this.stopReason = reason;
    const active = this.active;
    this.active = null;
    active?.worker.terminate();active?.reject(reason);
  }
  async run(planes: Float32Array<ArrayBuffer>[], event: (value: JobEvent) => void) {
    const attempt = (backend: InferenceInput["backend"]) => new Promise<Extract<InferenceResult, { kind: "done" | "error" }>>((resolve, reject) => {
      if (this.stopped) { reject(this.stopReason);return; }
      if (this.active) { reject(new Error("Isolation is already running."));return; }
      event({ kind: "phase", phase: "Loading isolation tools" });
      if (this.stopped) { reject(this.stopReason);return; }
      const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "audio-isolation" });
      let separating = false;
      let selectedBackend: "wasm" | "webgpu+wasm" = "wasm";
      let stage: "model" | "session" | "run" = "model";
      let timer: ReturnType<typeof setTimeout>;
      const finish = () => {
        clearTimeout(timer);
        if (this.active?.worker !== worker) return false;
        this.active = null;worker.terminate();return true;
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
        if (data.kind === "backend") selectedBackend = data.backend;
        else if (data.kind === "phase" || data.kind === "model-download") {
          if (data.kind === "phase" && data.phase === "Loading model") stage = "session";
          if (data.kind === "phase" && data.phase === "Separating" && !separating) { stage = "run";separating = true;clearTimeout(timer);timer = deadline(300_000); }
          event(data);
        }
        else if (finish()) resolve(data);
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
    if (result.kind === "error" && result.backend === "webgpu+wasm" && result.stage !== "model") { this.backend = "wasm";attempts++;result = await attempt(this.backend); }
    if (result.kind === "error") throw new Error(result.message);
    if (result.backend === "wasm") this.backend = "wasm";
    return { ...result, attempts };
  }
}
