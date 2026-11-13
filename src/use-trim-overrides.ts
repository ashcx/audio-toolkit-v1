import { useState } from "preact/hooks";
import type { FileId } from "./media";
import type { TrimRangeDraft } from "./recipe";
import { resetOverride, setOverride, type TrimOverrides } from "./trim-overrides";
export function useTrimOverrides() {
  const [overrides, setOverrides] = useState<TrimOverrides>(new Map());
  return {
    overrides,
    set: (id: FileId, range: TrimRangeDraft) => setOverrides(current => setOverride(current, id, range)),
    reset: (id: FileId) => setOverrides(current => resetOverride(current, id)),
    clear: () => setOverrides(new Map()),
  };
}
