import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { FileEntry, FileId } from "./media";
import { Batch, batchConcurrency, type BatchSnapshot, type JobRunner } from "./batch";

const runJob: JobRunner = async (spec, signal, phase) => {
  if (spec.plan.kind === "copy") {
    const { copyAudio } = await import("./copy-audio");
    return { output: await copyAudio(spec.entry.file, spec.plan, signal, spec.name, phase), report: { kind: "copy" } };
  }
  const { processAudio } = await import("./process-audio");
  const result = await processAudio(spec.entry.file, spec.plan, signal, spec.name, phase);
  return { output: result.output, report: { kind: "pcm", stats: result.stats } };
};
export function useExport(files: readonly FileEntry[]) {
  const owner = useRef<Batch | null>(null);
  if (!owner.current) owner.current = new Batch(runJob, batchConcurrency({
    cores: navigator.hardwareConcurrency,
    memory: "deviceMemory" in navigator ? navigator.deviceMemory : undefined,
    workers: typeof Worker !== "undefined",
    storage: typeof navigator.storage?.getDirectory === "function",
  }));
  const batch = owner.current;
  const [snapshot, setSnapshot] = useState<BatchSnapshot>(() => batch.snapshot);
  const previous = useRef(new Set<FileId>());
  useLayoutEffect(() => {
    const ids = new Set(files.map(file => file.id));
    for (const id of previous.current) if (!ids.has(id)) batch.remove(id);
    previous.current = ids;
  }, [files, batch]);
  useLayoutEffect(() => {
    const unsubscribe = batch.subscribe(setSnapshot);
    return () => { unsubscribe(); batch.dispose(); };
  }, [batch]);
  return { ...snapshot, run: batch.start.bind(batch), clear: batch.remove.bind(batch), cancel: batch.cancel.bind(batch), cancelAll: batch.cancelAll.bind(batch), retryCleanup: batch.retryCleanup.bind(batch), retry: batch.retry.bind(batch) };
}
