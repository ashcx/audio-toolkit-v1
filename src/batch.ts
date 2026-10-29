import { cleanupAll, CleanupFailure } from "./cleanup.ts";
import type { FileEntry, FileId } from "./media";
import { outputName, type ExecutionPlan } from "./planner.ts";
import { exportDescriptor } from "./export-format.ts";
import type { StoredOutput } from "./output-store";
import type { DspStats } from "./pcm/protocol";

export type JobPhase = "Preparing" | "Reading" | "Extracting" | "Decoding" | "Processing" | "Normalizing" | "Separating" | "Processing / encoding" | "Encoding" | "Saving";
export type JobSpec = Readonly<{
  entry: FileEntry;
  plan: Exclude<ExecutionPlan, { kind: "failed" }>;
  name: string;
}>;
export type JobOutput = {
  output: StoredOutput;
  report: { kind: "copy" } | { kind: "pcm"; stats: DspStats };
};
type Attempt = Readonly<{ controller: AbortController }>;
export type JobState =
  | { kind: "waiting" }
  | { kind: "running"; attempt: Attempt; operation: JobPhase }
  | { kind: "cancelling"; attempt: Attempt }
  | { kind: "cancelled" }
  | { kind: "failed"; message: string }
  | ({ kind: "done"; url: string } & JobOutput);
type OwnedJob = { readonly spec: JobSpec; state: JobState; ready: Promise<void> };
export type BatchJob = Readonly<Pick<OwnedJob, "spec" | "state">>;
export type BatchSnapshot = { jobs: ReadonlyMap<FileId, BatchJob>; busy: boolean; cleanupCount: number; cleaning: boolean };
export type JobRunner = (spec: JobSpec, signal: AbortSignal, phase: (value: JobPhase) => void) => Promise<JobOutput>;

export function batchConcurrency(capabilities: {
  cores: number;
  memory: unknown;
  workers: boolean;
  storage: boolean;
}): 1 | 2 {
  return capabilities.workers && capabilities.storage && capabilities.cores >= 8 &&
    typeof capabilities.memory === "number" && capabilities.memory >= 8 ? 2 : 1;
}

export class Batch {
  private jobs = new Map<FileId, OwnedJob>();
  private listeners = new Set<(snapshot: BatchSnapshot) => void>();
  private occupied = 0;
  private disposed = false;
  private cleaning = false;
  private releasing = 0;
  private pendingCleanup = new Map<FileId, { failure: CleanupFailure; cancelled: boolean }>();
  private runner: JobRunner;
  private concurrency: 1 | 2;
  constructor(runner: JobRunner, concurrency: 1 | 2) {
    this.runner = runner;
    this.concurrency = concurrency;
  }
  get snapshot(): BatchSnapshot {
    return { jobs: new Map(this.jobs), cleanupCount: this.pendingCleanup.size, cleaning: this.cleaning || this.releasing > 0, busy: this.cleaning || this.releasing > 0 || this.occupied > 0 || [...this.jobs.values()].some(job => job.state.kind === "waiting") };
  }
  subscribe(listener: (snapshot: BatchSnapshot) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  private emit() {
    const snapshot = this.snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }
  private async release(id: FileId, state: JobState): Promise<void> {
    if (state.kind !== "done") return;
    URL.revokeObjectURL(state.url);
    this.releasing++;
    this.emit();
    try {
      await cleanupAll([() => state.output.release()]);
    } catch (error) {
      if (error instanceof CleanupFailure) this.pendingCleanup.set(id, { failure: error, cancelled: true });
      throw error;
    } finally {
      this.releasing--;
      this.emit();
    }
  }
  start(inputs: readonly Omit<JobSpec, "name">[]) {
    if (this.disposed || this.snapshot.busy || this.pendingCleanup.size) return;
    const replacing = new Set(inputs.map(input => input.entry.id));
    const names = new Set([...this.jobs.values()].filter(job => !replacing.has(job.spec.entry.id)).map(job => job.spec.name));
    for (const input of inputs) {
      const previous = this.jobs.get(input.entry.id);
      const ready = previous ? this.release(input.entry.id, previous.state) : Promise.resolve();
      void ready.catch(() => undefined);
      const extension = input.plan.kind === "copy" ? input.plan.target.container : exportDescriptor(input.plan.snapshot.recipe.export).extension;
      const name = outputName(input.entry.file.name, extension, names);
      this.jobs.set(input.entry.id, { spec: Object.freeze({ ...input, name }), state: { kind: "waiting" }, ready });
    }
    this.pump();
  }
  cancel(id: FileId) {
    const job = this.jobs.get(id);
    if (!job) return;
    if (job.state.kind === "waiting") job.state = { kind: "cancelled" };
    else if (job.state.kind === "running") {
      const attempt = job.state.attempt;
      job.state = { kind: "cancelling", attempt };
      attempt.controller.abort();
    }
    this.emit();
  }
  cancelAll() {
    for (const job of this.jobs.values()) if (job.state.kind === "waiting") job.state = { kind: "cancelled" };
    for (const id of this.jobs.keys()) this.cancel(id);
    this.emit();
  }
  retry(id?: FileId) {
    if (this.disposed || this.snapshot.busy || this.pendingCleanup.size) return;
    for (const [key, job] of this.jobs) {
      if ((id === undefined || key === id) &&
        (job.state.kind === "failed" || (id !== undefined && job.state.kind === "cancelled"))) job.state = { kind: "waiting" };
    }
    this.pump();
  }
  remove(id: FileId) {
    const job = this.jobs.get(id);
    if (!job) return;
    this.cancel(id);
    this.jobs.delete(id);
    void this.release(id, job.state).catch(() => undefined);
    this.emit();
  }
  async retryCleanup() {
    if (this.snapshot.busy || this.disposed) return;
    this.cleaning = true;
    this.emit();
    try {
      for (const [id, pending] of this.pendingCleanup) {
        try {
          await pending.failure.recover();
          this.pendingCleanup.delete(id);
          const job = this.jobs.get(id);
          if (job) job.ready = Promise.resolve();
          if (job?.state.kind === "failed") job.state = pending.cancelled ? { kind: "cancelled" } : { kind: "failed", message: "Audio export failed. Retry this file." };
        } catch (error) {
          if (error instanceof CleanupFailure) pending.failure = error;
        }
      }
    } finally {
      this.cleaning = false;
      this.emit();
    }
  }
  dispose() {
    this.disposed = true;
    this.listeners.clear();
    this.cancelAll();
    for (const id of this.jobs.keys()) this.remove(id);
  }
  private pump() {
    if (!this.disposed) {
      for (const job of this.jobs.values()) {
        if (this.occupied >= this.concurrency) break;
        if (job.state.kind !== "waiting") continue;
        const attempt = { controller: new AbortController() };
        job.state = { kind: "running", attempt, operation: "Preparing" };
        this.occupied++;
        void this.execute(job, attempt);
      }
    }
    this.emit();
  }
  private async execute(job: OwnedJob, attempt: Attempt) {
    const signal = attempt.controller.signal;
    const current = () => !this.disposed && this.jobs.get(job.spec.entry.id) === job &&
      (job.state.kind === "running" || job.state.kind === "cancelling") && job.state.attempt === attempt;
    try {
      await job.ready;
      signal.throwIfAborted();
      const completed = await this.runner(job.spec, signal, operation => {
        if (current() && !signal.aborted) {
          job.state = { kind: "running", attempt, operation };
          this.emit();
        }
      });
      if (!current() || signal.aborted) await cleanupAll([() => completed.output.release()]);
      else job.state = { kind: "done", ...completed, url: URL.createObjectURL(completed.output.file) };
    } catch (error) {
      if (error instanceof CleanupFailure) {
        this.pendingCleanup.set(job.spec.entry.id, { failure: error, cancelled: signal.aborted });
        if (current()) job.state = { kind: "failed", message: error.message };
      } else if (current()) job.state = signal.aborted ? { kind: "cancelled" } : {
        kind: "failed", message: error instanceof Error ? error.message : "Audio export failed.",
      };
    } finally {
      if (current() && signal.aborted) job.state = { kind: "cancelled" };
      this.occupied--;
      this.pump();
    }
  }
}
