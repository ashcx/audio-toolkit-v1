import { InferenceRunner } from "./runner.ts";
/** Holds at most one loaded model between consecutive isolation jobs so a batch pays the model start once. */
export class InferencePool {
  private parked: InferenceRunner | null = null;
  take(): InferenceRunner {
    const runner = this.parked ?? new InferenceRunner();
    this.parked = null;
    return runner;
  }
  give(runner: InferenceRunner) {
    if (!runner.reusable) { runner.stop(); return; }
    this.parked?.stop();
    this.parked = runner;
  }
  dispose() {
    this.parked?.stop();
    this.parked = null;
  }
}
export type ModelLease = Readonly<{ models: InferencePool; keepModels: () => boolean }>;
