import type { JobEvent } from "../job-events";
import type { InferenceInput, InferenceResult } from "./protocol";

export class InferenceRunner {
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
      const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "audio-isolation" });
      this.active = { worker, reject };
      worker.onmessage = ({ data }: MessageEvent<InferenceResult>) => {
        if (this.active?.worker !== worker) return;
        if (data.kind === "phase" || data.kind === "model-download") event(data);
        else { this.active = null;worker.terminate();resolve(data); }
      };
      worker.onerror = error => {
        error.preventDefault();
        if (this.active?.worker === worker) { this.active = null;worker.terminate();reject(new Error("Could not load isolation tools. Check your connection and retry.")); }
      };
      const copy = planes.map(plane => new Float32Array(plane));
      worker.postMessage({ planes: copy, backend } satisfies InferenceInput, copy.map(plane => plane.buffer));
    });
    let attempts = 1;
    let result = await attempt("auto");
    if (result.kind === "error" && result.backend === "webgpu+wasm" && result.stage !== "model") { attempts++;result = await attempt("wasm"); }
    if (result.kind === "error") throw new Error(result.message);
    return { ...result, attempts };
  }
}
