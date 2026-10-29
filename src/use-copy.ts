import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { FileEntry, FileId } from "./media";
import { copyOutputName, type CopyPlan } from "./planner";
import type { Recipe } from "./recipe";
import type { StoredOutput } from "./output-store";

export type CopyResult = { recipe: Recipe } & (
  | { kind: "copying" }
  | { kind: "failed"; message: string }
  | { kind: "done"; output: StoredOutput; url: string }
);
type Completed = Extract<CopyResult, { kind: "done" }>;
export function useCopy(files: readonly FileEntry[]) {
  const [results, setResults] = useState(new Map<FileId, CopyResult>());
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
  const run = async (jobs: readonly { entry: FileEntry; plan: CopyPlan }[]) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    const update = (id: FileId, result: CopyResult) => {
      if (mounted.current && fileIds.current.has(id))
        setResults((previous) => new Map(previous).set(id, result));
    };
    const usedNames = new Set<string>();
    const namedJobs = jobs.map((job) => ({
      ...job,
      name: copyOutputName(job.entry.file.name, job.plan, usedNames),
    }));
    try {
      const { copyAudio } = await import("./copy-audio");
      for (const { entry, plan, name } of namedJobs) {
        if (!mounted.current) break;
        if (!fileIds.current.has(entry.id)) continue;
        const controller = new AbortController();
        active.current = { id: entry.id, controller };
        update(entry.id, { kind: "copying", recipe: plan.snapshot.recipe });
        try {
          await release(entry.id);
          const output = await copyAudio(
            entry.file,
            plan,
            controller.signal,
            name,
          );
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
