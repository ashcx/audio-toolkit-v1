import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { Archive, type ArchiveState } from "./archive";
import { createZip } from "./zip";
export function useArchive(sourceKey: string) {
  const owner = useRef<Archive | null>(null);
  if (!owner.current) owner.current = new Archive(createZip);
  const archive = owner.current;
  const [state, setState] = useState<ArchiveState>(archive.state);
  useLayoutEffect(() => archive.subscribe(setState), [archive]);
  useLayoutEffect(() => { void archive.clear(); }, [archive, sourceKey]);
  useLayoutEffect(() => () => archive.dispose(), [archive]);
  return { state, busy: archive.busy, start: archive.start.bind(archive), cancel: archive.cancel.bind(archive), clear: archive.clear.bind(archive) };
}
