import type { AudioLevels } from "./levels";
import type { AudioMetadata } from "./media";
import type { LevelsReply } from "./levels-worker";
export function analyzeLevels(file: File, metadata: AudioMetadata, signal: AbortSignal): Promise<AudioLevels> {
  return new Promise((resolve,reject) => {
    signal.throwIfAborted();
    const worker = new Worker(new URL("./levels-worker.ts",import.meta.url),{type:"module"});
    let timer: ReturnType<typeof setTimeout>;
    let finished = false;
    const finish = (levels: AudioLevels | null, error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer); signal.removeEventListener("abort",abort); worker.terminate();
      if (levels) resolve(levels); else reject(error);
    };
    const abort = () => finish(null,new DOMException("Analysis cancelled","AbortError"));
    const resetTimer = () => {if (finished) return;clearTimeout(timer);timer=setTimeout(()=>finish(null,new Error("Level analysis stalled. Reopen this step to retry.")),30000);};
    signal.addEventListener("abort",abort,{once:true});
    worker.onmessage = (event: MessageEvent<LevelsReply>) => {
      resetTimer();
      if (event.data.kind === "done") finish(event.data.levels);
      else if (event.data.kind === "error") finish(null,new Error(`${file.name}: ${event.data.message}`));
    };
    worker.onerror = () => finish(null,new Error(`Level analysis is unavailable for ${file.name}.`));
    resetTimer();
    try {worker.postMessage({file,metadata});} catch {finish(null,new Error("Could not start level analysis."));}
  });
}
