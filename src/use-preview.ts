import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { Preview, previewBusy } from "./preview";
import type { processAudio } from "./process-audio";
const run: typeof processAudio = async (...args) => (await import("./process-audio")).processAudio(...args);
export function usePreview(revision: string) {
  const owner = useRef<Preview | null>(null);
  if (!owner.current) owner.current = new Preview(run);
  const preview = owner.current;
  const [state, setState] = useState(preview.state);
  useLayoutEffect(() => {
    const unsubscribe = preview.subscribe(setState);
    return () => { unsubscribe(); preview.dispose(); };
  }, [preview]);
  useLayoutEffect(() => { preview.clear(); }, [preview, revision]);
  return { state, busy: previewBusy(state), start: preview.start.bind(preview), clear: preview.clear.bind(preview) };
}
