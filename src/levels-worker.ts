import { decodePcm } from "./pcm/decode";
import { measureLevels, type AudioLevels } from "./levels";
import type { AudioMetadata } from "./media";
export type LevelsReply = {kind:"progress";seconds:number} | {kind:"done";levels:AudioLevels} | {kind:"error";message:string};
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
    self.postMessage({kind:"error",message:error instanceof Error ? error.message : "Could not measure this audio."} satisfies LevelsReply);
  }
};
