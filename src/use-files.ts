import { useEffect, useRef, useState } from "preact/hooks";
import {
  createFileId,
  inspectMedia,
  type FileEntry,
  type FileId,
  type Inspection,
} from "./media";

export function useFiles() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const active = useRef(new Map<FileId, AbortController>());
  const mounted = useRef(true);
  const update = (id: FileId, inspection: Inspection) => {
    if (mounted.current)
      setEntries((previous) =>
        previous.map((entry) =>
          entry.id === id ? { ...entry, inspection } : entry,
        ),
      );
  };
  useEffect(() => {
    for (const entry of entries) {
      if (active.current.size >= 2) break;
      if (entry.inspection.kind !== "waiting" || active.current.has(entry.id))
        continue;
      const controller = new AbortController();
      active.current.set(entry.id, controller);
      update(entry.id, { kind: "reading" });
      void inspectMedia(entry.file, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) update(entry.id, result);
        })
        .catch(() => {
          if (!controller.signal.aborted)
            update(entry.id, {
              kind: "failed",
              message: "Could not inspect this file.",
            });
        })
        .finally(() => {
          active.current.delete(entry.id);
          if (mounted.current) setEntries((previous) => [...previous]);
        });
    }
  }, [entries]);
  useEffect(
    () => () => {
      mounted.current = false;
      for (const controller of active.current.values()) controller.abort();
      active.current.clear();
    },
    [],
  );
  return {
    entries,
    add(files: File[]) {
      const added: FileEntry[] = files.map((file) => ({
        id: createFileId(),
        file,
        inspection: { kind: "waiting" },
      }));
      setEntries((previous) => [...previous, ...added]);
    },
    remove(id: FileId) {
      active.current.get(id)?.abort();
      setEntries((previous) => previous.filter((entry) => entry.id !== id));
    },
    clear() {
      for (const controller of active.current.values()) controller.abort();
      active.current.clear();
      setEntries([]);
    },
  };
}
