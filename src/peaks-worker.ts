import { decodePcm } from "./pcm/decode";
import { measurePeaks, type Peaks } from "./peaks";
import type { AudioMetadata } from "./media";
import { errorCode, type ErrorCode } from "./errors.ts";
export type PeaksReply = {kind:"progress";seconds:number} | {kind:"done";peaks:Peaks} | {kind:"error";code:ErrorCode};
self.onmessage = async (event: MessageEvent<{file:File;metadata:AudioMetadata}>) => {
  const controller = new AbortController();
  let last = 0;
  try {
    const {file,metadata} = event.data;
    if (metadata.duration === null) throw new Error("Peaks need a known duration.");
    const stream = decodePcm(file,metadata,controller.signal,{passes:0,maxDecodedFrames:0});
    const peaks = await measurePeaks(stream,metadata.duration,controller.signal,seconds => {
      if (performance.now() - last > 150) { self.postMessage({kind:"progress",seconds} satisfies PeaksReply); last = performance.now(); }
    });
    self.postMessage({kind:"done",peaks} satisfies PeaksReply);
  } catch (error) {
    console.error(error);
    self.postMessage({kind:"error",code:errorCode(error,"levels-failed")} satisfies PeaksReply);
  }
};
