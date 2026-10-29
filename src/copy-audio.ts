import {
  ALL_FORMATS,
  Mp3InputFormat,
  FlacInputFormat,
  OggInputFormat,
  WaveInputFormat,
  Mp4InputFormat,
  Input,
  BlobSource,
  Output,
  StreamTarget,
  EncodedPacketSink,
  EncodedAudioPacketSource,
  Mp4OutputFormat,
  Mp3OutputFormat,
  OggOutputFormat,
  FlacOutputFormat,
  WavOutputFormat,
} from "mediabunny";
import type { CopyPlan, CopyTarget } from "./planner";
import { createOutputStore, type StoredOutput } from "./output-store";

function outputFormat(container: CopyTarget["container"]) {
  switch (container) {
    case "m4a":
      return new Mp4OutputFormat({ fastStart: "fragmented" });
    case "mp3":
      return new Mp3OutputFormat();
    case "ogg":
      return new OggOutputFormat();
    case "flac":
      return new FlacOutputFormat();
    case "wav":
      return new WavOutputFormat({ large: true });
    default: {
      const unreachable: never = container;
      return unreachable;
    }
  }
}
export async function copyAudio(
  file: File,
  plan: CopyPlan,
  signal: AbortSignal,
  name: string,
): Promise<StoredOutput> {
  signal.throwIfAborted();
  const store = await createOutputStore(name, plan.target.mime);
  const input = new Input({
    source: new BlobSource(file, {
      maxCacheSize: 1024 * 1024,
      useStreamReader: false,
    }),
    formats: ALL_FORMATS,
  });
  const output = new Output({
    format: outputFormat(plan.target.container),
    target: new StreamTarget(
      new WritableStream({
        async write(chunk) {
          signal.throwIfAborted();
          await store.write(chunk.position, chunk.data);
        },
      }),
      { chunked: true, chunkSize: 1024 * 1024 },
    ),
  });
  const abort = () => input.dispose();
  signal.addEventListener("abort", abort, { once: true });
  let finished = false;
  try {
    signal.throwIfAborted();
    const track = await input.getPrimaryAudioTrack();
    if (!track || (await track.getCodec()) !== plan.codec)
      throw new Error("The source audio no longer matches the recipe.");
    if (!(await new EncodedPacketSink(track).getFirstPacket()))
      throw new Error("The audio track contains no packets.");
    const format = await input.getFormat();
    const sameContainer =
      (plan.target.container === "mp3" && format instanceof Mp3InputFormat) ||
      (plan.target.container === "flac" && format instanceof FlacInputFormat) ||
      (plan.target.container === "ogg" && format instanceof OggInputFormat) ||
      (plan.target.container === "wav" && format instanceof WaveInputFormat) ||
      (plan.target.container === "m4a" && format instanceof Mp4InputFormat);
    if (
      sameContainer &&
      (await input.getTracks()).length === 1 &&
      plan.snapshot.sourceStartTime === 0
    ) {
      for (let offset = 0; offset < file.size; offset += 1024 * 1024) {
        signal.throwIfAborted();
        await store.write(
          offset,
          new Uint8Array(
            await file.slice(offset, offset + 1024 * 1024).arrayBuffer(),
          ),
        );
      }
      signal.throwIfAborted();
      const result = await store.finish();
      signal.throwIfAborted();
      finished = true;
      return result;
    }
    const config = await track.getDecoderConfig();
    if (!config)
      throw new Error("Original audio configuration is unavailable.");
    const source = new EncodedAudioPacketSource(plan.codec);
    output.addAudioTrack(source);
    await output.start();
    let packets = 0;
    for await (const packet of new EncodedPacketSink(track).packets()) {
      signal.throwIfAborted();
      await source.add(
        packet.clone({
          timestamp: packet.timestamp - plan.snapshot.sourceStartTime,
        }),
        packets === 0 ? { decoderConfig: config } : undefined,
      );
      packets++;
    }
    if (!packets) throw new Error("The audio track contains no packets.");
    source.close();
    await output.finalize();
    signal.throwIfAborted();
    const result = await store.finish();
    signal.throwIfAborted();
    finished = true;
    return result;
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof DOMException && error.name === "QuotaExceededError")
      throw new Error("Not enough device storage for this output.");
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
    input.dispose();
    if (!finished) {
      await output.cancel().catch(() => undefined);
      await store.discard();
    }
  }
}
