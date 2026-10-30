import { cleanupAll, CleanupFailure } from "./cleanup.ts";
import type { StoredOutput } from "./output-store.ts";
import type { ZipProgress } from "./zip.ts";
export type ArchiveState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "building"; progress: ZipProgress }>
  | Readonly<{ kind: "cancelling" | "releasing" }>
  | Readonly<{ kind: "ready"; url: string; output: StoredOutput }>
  | Readonly<{ kind: "failed" | "cleanup"; message: string }>;
export type ArchiveBuilder = (files: readonly File[], signal: AbortSignal, progress: (value: ZipProgress) => void) => Promise<StoredOutput>;
export class Archive {
  state: ArchiveState = { kind: "idle" };
  private listeners = new Set<(state: ArchiveState) => void>();
  private active: { controller: AbortController; done: Promise<void> } | null = null;
  private output: StoredOutput | null = null;
  private url: string | null = null;
  private cleanup: CleanupFailure | null = null;
  private clearing: Promise<void> | null = null;
  private disposed = false;
  private build: ArchiveBuilder;
  constructor(build: ArchiveBuilder) { this.build = build; }
  get busy() { return this.active !== null || this.clearing !== null || this.cleanup !== null; }
  subscribe(listener: (state: ArchiveState) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private set(state: ArchiveState) { this.state = state; for (const listener of this.listeners) listener(state); }
  private async release() {
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
    const output = this.output; this.output = null;
    const retry = this.cleanup; this.cleanup = null;
    await cleanupAll([...(output ? [output.release] : []), ...(retry ? [retry.recover] : [])]);
  }
  start(files: readonly File[]) {
    if (this.busy || this.disposed || !files.length) return;
    const controller = new AbortController();
    let finish!: () => void;
    const done = new Promise<void>(resolve => { finish = resolve; });
    this.active = { controller, done };
    this.set({ kind: "building", progress: { loaded: 0, total: files.reduce((total, file) => total + file.size, 0) } });
    void (async () => {
      let result: StoredOutput | null = null;
      try {
        await this.release(); controller.signal.throwIfAborted();
        result = await this.build(files, controller.signal, progress => {
          if (!controller.signal.aborted) this.set({ kind: "building", progress });
        });
        if (controller.signal.aborted || this.disposed) {
          await cleanupAll([result.release]); result = null;
          this.set({ kind: "idle" });
        } else {
          this.output = result;
          this.url = URL.createObjectURL(result.file);
          this.set({ kind: "ready", output: result, url: this.url });
        }
      } catch (error) {
        if (error instanceof CleanupFailure) {
          this.cleanup = error; this.set({ kind: "cleanup", message: error.message });
        } else this.set(controller.signal.aborted ? { kind: "idle" } : { kind: "failed", message: error instanceof DOMException && error.name === "QuotaExceededError" ? "Not enough temporary storage for the ZIP. Download files individually or free space and retry." : "ZIP could not be saved. Download files individually or retry." });
      } finally { this.active = null; finish(); this.set(this.state); }
    })();
  }
  cancel() { if (this.active) { this.active.controller.abort(); this.set({ kind: "cancelling" }); } }
  clear(): Promise<void> {
    if (this.clearing) return this.clearing;
    this.cancel();
    const pending = this.active?.done;
    let finish!: () => void;
    this.clearing = new Promise<void>(resolve => { finish = resolve; });
    const task = this.clearing;
    this.set({ kind: "releasing" });
    void (async () => {
      try { await pending; await this.release(); this.set({ kind: "idle" }); }
      catch (error) {
        if (error instanceof CleanupFailure) this.cleanup = error;
        this.set({ kind: "cleanup", message: "Temporary ZIP could not be removed. Retry cleanup." });
      } finally { this.clearing = null; finish(); this.set(this.state); }
    })();
    return task;
  }
  dispose() { this.disposed = true; this.listeners.clear(); void this.clear(); }
}
