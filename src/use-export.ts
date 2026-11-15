import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { FileEntry, FileId } from "./media";
import { Batch, batchConcurrency, type BatchSnapshot } from "./batch";
import { runJob } from "./run-job";
import { isAppleMobile } from "./platform";

export function useExport(files: readonly FileEntry[]) {
  const owner = useRef<Batch | null>(null);
  if (!owner.current) owner.current = new Batch(runJob, batchConcurrency({
    threads: navigator.hardwareConcurrency,
    memory: "deviceMemory" in navigator ? navigator.deviceMemory : undefined,
    workers: typeof Worker !== "undefined",
    storage: typeof navigator.storage?.getDirectory === "function",
    appleMobile: isAppleMobile(navigator),
  }));
  const batch = owner.current;
  const [snapshot, setSnapshot] = useState<BatchSnapshot>(() => batch.snapshot);
  const previous = useRef(new Set<FileId>());
  useLayoutEffect(() => {
    const ids = new Set(files.map(file => file.id));
    for (const id of previous.current) if (!ids.has(id)) batch.remove(id);
    previous.current = ids;
  }, [files, batch]);
  const retryable = snapshot.cleanupCount > 0 && !snapshot.cleanupStuck && !snapshot.busy;
  useLayoutEffect(() => {
    if (retryable) void batch.retryCleanup();
  }, [retryable, batch]);
  useLayoutEffect(() => {
    const unsubscribe = batch.subscribe(setSnapshot);
    return () => { unsubscribe(); batch.dispose(); };
  }, [batch]);
  return { ...snapshot, run: batch.start.bind(batch), clear: batch.remove.bind(batch), cancel: batch.cancel.bind(batch), cancelAll: batch.cancelAll.bind(batch), retryCleanup: batch.retryCleanup.bind(batch), retry: batch.retry.bind(batch) };
}
