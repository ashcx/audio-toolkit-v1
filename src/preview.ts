import type { FileEntry, FileId } from "./media.ts";
import type { EffectiveRecipe } from "./recipe.ts";
import type { JobOperation } from "./job-events.ts";
import type { StoredOutput } from "./output-store.ts";
import type { processAudio } from "./process-audio.ts";
import type { DspStats } from "./pcm/protocol.ts";
import { previewPlans, type PreviewRange } from "./preview-plan.ts";
import { UserFacingError, failure, failureOf, type Failure } from "./errors.ts";
export type PreviewState =
  | { kind: "idle" }
  | { kind: "running"; fileId: FileId; operation: JobOperation; stage: "original" | "processed" }
  | { kind: "cancelling" | "releasing"; fileId: FileId }
  | ({ kind: "failed"; fileId: FileId } & Failure)
  | ({ kind: "cleanup"; fileId: FileId; attempts: number } & Failure)
  | { kind: "ready"; fileId: FileId; original: string; processed: string; range: PreviewRange; estimate: boolean; stats: DspStats };
export function previewBusy(state: PreviewState) {
  return state.kind === "running" || state.kind === "cancelling" || state.kind === "releasing" || state.kind === "cleanup";
}
export class Preview {
  state: PreviewState = { kind: "idle" };
  private listeners = new Set<(state: PreviewState) => void>();
  private outputs = new Set<StoredOutput>();
  private urls = new Set<string>();
  private controller: AbortController | null = null;
  private task: Promise<void> | null = null;
  private cleanupFailures = 0;
  private run: typeof processAudio;
  private objectUrls: { create: (file: File) => string; revoke: (url: string) => void };
  constructor(run: typeof processAudio, objectUrls = { create: URL.createObjectURL.bind(URL), revoke: URL.revokeObjectURL.bind(URL) }) { this.run = run; this.objectUrls = objectUrls; }
  subscribe(listener: (state: PreviewState) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  private publish(state: PreviewState) {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }
  private async release() {
    for (const url of this.urls) this.objectUrls.revoke(url);
    this.urls.clear();
    const failures: unknown[] = [];
    for (const output of this.outputs) {
      try { await output.release(); this.outputs.delete(output); }
      catch (error) { failures.push(error); }
    }
    if (failures.length) throw new UserFacingError("storage-stuck", "Preview files could not be removed.");
    this.cleanupFailures = 0;
  }
  private stuck(fileId: FileId): PreviewState {
    return { kind: "cleanup", fileId, attempts: ++this.cleanupFailures, ...failure("storage-stuck") };
  }
  start(entry: FileEntry, snapshot: EffectiveRecipe) {
    if (this.task || this.state.kind === "cleanup") return;
    const controller = new AbortController();
    this.controller = controller;
    this.publish({ kind: "releasing", fileId: entry.id });
    this.task = this.execute(entry, snapshot, controller).finally(() => { this.task = null; this.controller = null; });
  }
  private async execute(entry: FileEntry, snapshot: EffectiveRecipe, controller: AbortController) {
    let thrown: unknown;
    try {
      await this.release();
      controller.signal.throwIfAborted();
      const plans = previewPlans(snapshot);
      const urls: string[] = [];
      let processedStats: DspStats | null = null;
      for (const stage of ["original", "processed"] satisfies ("original" | "processed")[]) {
        controller.signal.throwIfAborted();
        this.publish({ kind: "running", fileId: entry.id, stage, operation: { kind: "phase", phase: "Preparing" } });
        const result = await this.run(entry.file, plans[stage], controller.signal, `${stage}.preview.wav`, operation => {
          if (!controller.signal.aborted) this.publish({ kind: "running", fileId: entry.id, stage, operation });
        });
        this.outputs.add(result.output);
        if (stage === "processed") processedStats = result.stats;
        controller.signal.throwIfAborted();
        const url = this.objectUrls.create(result.output.file);
        this.urls.add(url);
        urls.push(url);
      }
      if (!processedStats) throw new Error("The processed preview did not report DSP statistics.");
      this.publish({ kind: "ready", fileId: entry.id, original: urls[0], processed: urls[1], range: plans.range, estimate: plans.estimate, stats: processedStats });
      return;
    } catch (error) { thrown = error; }
    try { await this.release(); }
    catch {
      this.publish(this.stuck(entry.id));
      return;
    }
    this.publish(controller.signal.aborted ? { kind: "idle" } : { kind: "failed", fileId: entry.id, ...failureOf(thrown, "preview-failed") });
  }
  clear() {
    const state = this.state;
    if (state.kind === "idle") return;
    if (this.task) {
      this.controller?.abort(new DOMException("Preview cancelled.", "AbortError"));
      this.publish({ kind: "cancelling", fileId: state.fileId });
      return;
    }
    this.publish({ kind: "releasing", fileId: state.fileId });
    this.task = this.release().then(
      () => this.publish({ kind: "idle" }),
      () => this.publish(this.stuck(state.fileId)),
    ).finally(() => { this.task = null; });
  }
  dispose() { this.listeners.clear(); this.clear(); }
}
