import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { FileEntry, FileId } from "./media";
import { outputName, type ExecutionPlan } from "./planner";
import type { Recipe } from "./recipe";
import type { StoredOutput } from "./output-store";

import type { DspStats } from "./pcm/protocol";

export type ExportResult = { recipe: Recipe } & (
  | { kind: "running"; operation: "Copying" | "Processing" }
  | { kind: "failed"; message: string }
  | {
      kind: "done";
      output: StoredOutput;
      url: string;
      report: { kind: "copy" } | { kind: "pcm"; stats: DspStats };
    }
);
type Completed = Extract<ExportResult, { kind: "done" }>;
export function useExport(files: readonly FileEntry[]) {
  const [results, setResults] = useState(new Map<FileId, ExportResult>());
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const mounted = useRef(true);
  const fileIds = useRef(new Set(files.map((file) => file.id)));
  const retained = useRef(new Map<FileId, Completed>());
  const active = useRef<{ id: FileId; controller: AbortController } | null>(
    null,
  );
  const release = async (id: FileId) => {
    const previous = retained.current.get(id);
    if (!previous) return;
    retained.current.delete(id);
    URL.revokeObjectURL(previous.url);
    await previous.output.release();
  };
  useLayoutEffect(() => {
    fileIds.current = new Set(files.map((file) => file.id));
  }, [files]);
  useLayoutEffect(
    () => () => {
      mounted.current = false;
      active.current?.controller.abort();
      for (const id of retained.current.keys())
        void release(id).catch(() => undefined);
    },
    [],
  );
  const clear = (id: FileId) => {
    if (active.current?.id === id) active.current.controller.abort();
    void release(id).catch(() => undefined);
    setResults((previous) => {
      const next = new Map(previous);
      next.delete(id);
      return next;
    });
  };
  const run = async (
    jobs: readonly {
      entry: FileEntry;
      plan: Exclude<ExecutionPlan, { kind: "failed" }>;
    }[],
  ) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    const update = (id: FileId, result: ExportResult) => {
      if (mounted.current && fileIds.current.has(id))
        setResults((previous) => new Map(previous).set(id, result));
    };
    const usedNames = new Set<string>();
    const namedJobs = jobs.map((job) => ({
      ...job,
      name: outputName(
        job.entry.file.name,
        job.plan.kind === "copy" ? job.plan.target.container : "wav",
        usedNames,
      ),
    }));
    try {
      for (const { entry, plan, name } of namedJobs) {
        if (!mounted.current) break;
        if (!fileIds.current.has(entry.id)) continue;
        const controller = new AbortController();
        active.current = { id: entry.id, controller };
        update(entry.id, {
          kind: "running",
          operation: plan.kind === "copy" ? "Copying" : "Processing",
          recipe: plan.snapshot.recipe,
        });
        try {
          await release(entry.id);
          const completed =
            plan.kind === "copy"
              ? {
                  output: await import("./copy-audio").then(({ copyAudio }) =>
                    copyAudio(entry.file, plan, controller.signal, name),
                  ),
                  report: { kind: "copy" as const },
                }
              : await import("./process-audio").then(
                  async ({ processAudio }) => {
                    const result = await processAudio(
                      entry.file,
                      plan,
                      controller.signal,
                      name,
                    );
                    return {
                      output: result.output,
                      report: { kind: "pcm" as const, stats: result.stats },
                    };
                  },
                );
          const { output, report } = completed;
          if (
            !mounted.current ||
            !fileIds.current.has(entry.id) ||
            controller.signal.aborted
          ) {
            await output.release();
            continue;
          }
          const result: Completed = {
            kind: "done",
            report,
            recipe: plan.snapshot.recipe,
            output,
            url: URL.createObjectURL(output.file),
          };
          retained.current.set(entry.id, result);
          update(entry.id, result);
        } catch (error) {
          if (!controller.signal.aborted)
            update(entry.id, {
              kind: "failed",
              recipe: plan.snapshot.recipe,
              message:
                error instanceof Error ? error.message : "Audio export failed.",
            });
        } finally {
          active.current = null;
        }
      }
    } catch {
      for (const { entry, plan } of jobs)
        update(entry.id, {
          kind: "failed",
          recipe: plan.snapshot.recipe,
          message: "The audio tools could not load. Try again.",
        });
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return { results, busy, run, clear };
}
