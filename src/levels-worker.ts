import { decodePcm } from "./pcm/decode";
import { measureLevels, type AudioLevels } from "./levels";
import type { AudioMetadata } from "./media";
import { errorCode, type ErrorCode } from "./errors.ts";
export type LevelsReply = {kind:"progress";seconds:number} | {kind:"done";levels:AudioLevels} | {kind:"error";code:ErrorCode};
self.onmessage = async (event: MessageEvent<{file:File;metadata:AudioMetadata}>) => {
  const controller = new AbortController();
  let last = 0;
  try {
    const stream = decodePcm(event.data.file,event.data.metadata,controller.signal,{passes:0,maxDecodedFrames:0});
    const levels = await measureLevels(stream,controller.signal,seconds => {
      if (performance.now() - last > 150) { self.postMessage({kind:"progress",seconds} satisfies LevelsReply); last = performance.now(); }
    });
    self.postMessage({kind:"done",levels} satisfies LevelsReply);
  } catch (error) {
    console.error(error);
    self.postMessage({kind:"error",code:errorCode(error,"levels-failed")} satisfies LevelsReply);
  }
};
