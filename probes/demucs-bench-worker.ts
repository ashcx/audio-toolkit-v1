import { runDemucs, type DemucsBenchReply, type DemucsBenchRequest } from "./demucs-bench-core";

self.onmessage = ({ data }: MessageEvent<DemucsBenchRequest>) =>
  runDemucs(data, (message: DemucsBenchReply, transfer: Transferable[] = []) => self.postMessage(message, { transfer }));
