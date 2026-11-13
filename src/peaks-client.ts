import type { Peaks } from "./peaks";
import type { AudioMetadata } from "./media";
import type { PeaksReply } from "./peaks-worker";
import { UserFacingError } from "./errors.ts";
export function analyzePeaks(file: File, metadata: AudioMetadata, signal: AbortSignal): Promise<Peaks> {
  return new Promise((resolve,reject) => {
    signal.throwIfAborted();
    const worker = new Worker(new URL("./peaks-worker.ts",import.meta.url),{type:"module"});
    let timer: ReturnType<typeof setTimeout>;
    let finished = false;
    const finish = (peaks: Peaks | null, error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer); signal.removeEventListener("abort",abort); worker.terminate();
      if (peaks) resolve(peaks); else reject(error);
    };
    const abort = () => finish(null,new DOMException("Analysis cancelled","AbortError"));
    const resetTimer = () => {if (finished) return;clearTimeout(timer);timer=setTimeout(()=>finish(null,new UserFacingError("levels-failed","Waveform analysis stalled.")),30000);};
    signal.addEventListener("abort",abort,{once:true});
    worker.onmessage = (event: MessageEvent<PeaksReply>) => {
      resetTimer();
      if (event.data.kind === "done") finish(event.data.peaks);
      else if (event.data.kind === "error") finish(null,new UserFacingError(event.data.code,`Waveform analysis failed for ${file.name}.`));
    };
    worker.onerror = () => finish(null,new UserFacingError("levels-failed",`Waveform analysis is unavailable for ${file.name}.`));
    resetTimer();
    try {worker.postMessage({file,metadata});} catch {finish(null,new UserFacingError("levels-failed","Could not start waveform analysis."));}
  });
}
