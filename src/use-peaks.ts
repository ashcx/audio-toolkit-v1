import { useEffect, useState } from "preact/hooks";
import { inspectMedia, type AudioMetadata } from "./media";
import { analyzePeaks } from "./peaks-client";
import type { Peaks } from "./peaks";
/** A File is read directly. A URL is an output the page only holds a link to, so its bytes are fetched first. */
export type PeakSource = {file: File; metadata?: AudioMetadata} | {url: string};
export type PeaksState = {kind:"pending"} | {kind:"ready";peaks:Peaks} | {kind:"failed"};
const measured = new WeakMap<File, Peaks>();
// One waveform at a time, so peak work never stacks up behind itself or beside an export.
let tail: Promise<unknown> = Promise.resolve();
function enqueue<T>(signal: AbortSignal, job: () => Promise<T>): Promise<T> {
  const run = tail.then(() => { signal.throwIfAborted(); return job(); });
  tail = run.catch(() => undefined);
  return run;
}
async function measure(source: PeakSource, signal: AbortSignal): Promise<{file: File; peaks: Peaks}> {
  let file: File, metadata: AudioMetadata | undefined;
  if ("file" in source) ({file, metadata} = source);
  else {
    const response = await fetch(source.url,{signal});
    file = new File([await response.blob()],"output");
  }
  if (!metadata) {
    const inspected = await inspectMedia(file,signal);
    if (inspected.kind !== "ready") throw new Error("This audio cannot be inspected.");
    metadata = inspected.metadata;
  }
  return {file,peaks:await analyzePeaks(file,metadata,signal)};
}
const initial = (source: PeakSource): PeaksState => {
  const peaks = "file" in source ? measured.get(source.file) : undefined;
  return peaks ? {kind:"ready",peaks} : {kind:"pending"};
};
/** Peaks for one audio. Nothing runs until `active`, and a change of file or URL starts over. */
export function usePeaks(source: PeakSource, active: boolean): PeaksState {
  const key = "file" in source ? source.file : source.url;
  const [slot,setSlot] = useState<{key: File | string; state: PeaksState}>(() => ({key,state:initial(source)}));
  const state = slot.key === key ? slot.state : initial(source);
  useEffect(() => {
    if (state.kind !== "pending" || !active) return;
    const controller = new AbortController();
    enqueue(controller.signal,() => measure(source,controller.signal)).then(({file,peaks}) => {
      if (controller.signal.aborted) return;
      if ("file" in source) measured.set(file,peaks);
      setSlot({key,state:{kind:"ready",peaks}});
    },error => {
      if (!controller.signal.aborted) { console.error(error); setSlot({key,state:{kind:"failed"}}); }
    });
    return () => controller.abort();
  },[key,active,state.kind]);
  return state;
}
