import { useEffect, useState } from "preact/hooks";
import { combineLevels, type AudioLevels } from "./levels";
import { analyzeLevels } from "./levels-client";
import type { FileEntry } from "./media";
const measured = new WeakMap<File, AudioLevels>();
type LevelsState = {kind:"idle"} | {kind:"loading";key:string;completed:number;total:number} | {kind:"ready";key:string;levels:AudioLevels;count:number} | {kind:"failed";key:string;message:string};
export function useLevels(files: readonly FileEntry[], enabled: boolean) {
  const ready = files.flatMap(entry => entry.inspection.kind === "ready" ? [{file:entry.file,metadata:entry.inspection.metadata,id:entry.id}] : []);
  const key = ready.map(entry=>entry.id).join("|");
  const [state,setState] = useState<LevelsState>({kind:"idle"});
  useEffect(() => {
    if (!enabled || !ready.length) {setState({kind:"idle"});return;}
    const controller = new AbortController();
    setState({kind:"loading",key,completed:0,total:ready.length});
    void (async () => {
      const values: AudioLevels[] = [];
      try {
        for (const entry of ready) {
          controller.signal.throwIfAborted();
          const value = measured.get(entry.file) ?? await analyzeLevels(entry.file,entry.metadata,controller.signal);
          controller.signal.throwIfAborted();
          measured.set(entry.file,value);values.push(value);
          setState({kind:"loading",key,completed:values.length,total:ready.length});
        }
        setState({kind:"ready",key,levels:combineLevels(values),count:values.length});
      } catch (error) {
        if (!controller.signal.aborted) setState({kind:"failed",key,message:error instanceof Error ? error.message : "Could not measure audio levels."});
      }
    })();
    return () => controller.abort();
  },[key,enabled]);
  return state.kind !== "idle" && state.key !== key ? {kind:"idle"} as const : state;
}
