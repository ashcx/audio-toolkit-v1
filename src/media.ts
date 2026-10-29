import type { AudioCodec } from "mediabunny";
export type FileId = string & { readonly __brand: "FileId" };
function isFileId(value: string): value is FileId {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
export function createFileId(): FileId {
  const id = crypto.randomUUID();
  if (!isFileId(id)) throw new Error("Could not create a file identity.");
  return id;
}
export type AudioMetadata = {
  container: string;
  codec: AudioCodec;
  duration: number | null;
  startTime: number;
  sampleRate: number | null;
  channels: number | null;
  hasVideo: boolean;
};
export type InspectionResult =
  | { kind: "ready"; metadata: AudioMetadata }
  | { kind: "failed"; message: string };
export type Inspection =
  | { kind: "waiting" }
  | { kind: "reading" }
  | InspectionResult;
export type FileEntry = { id: FileId; file: File; inspection: Inspection };

export async function inspectMedia(
  file: File,
  signal: AbortSignal,
): Promise<InspectionResult> {
  const { Input, BlobSource, ALL_FORMATS, MatroskaInputFormat } = await import(
    "mediabunny"
  );
  signal.throwIfAborted();
  const input = new Input({
    source: new BlobSource(file, {
      maxCacheSize: 1024 * 1024,
      useStreamReader: false,
    }),
    formats: ALL_FORMATS,
  });
  const abort = () => input.dispose();
  signal.addEventListener("abort", abort, { once: true });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track) return { kind: "failed", message: "No audio track." };
    const [
      format,
      codec,
      metadataEnd,
      sampleRate,
      channels,
      video,
      firstTimestamp,
    ] = await Promise.all([
      input.getFormat(),
      track.getCodec(),
      track.getDurationFromMetadata({ skipLiveWait: true }),
      track.getSampleRate(),
      track.getNumberOfChannels(),
      input.getPrimaryVideoTrack(),
      track.getFirstTimestamp(),
    ]);
    signal.throwIfAborted();
    if (codec === null)
      return { kind: "failed", message: "Unsupported audio codec." };
    const duration =
      format instanceof MatroskaInputFormat
        ? await track.computeDuration({ skipLiveWait: true })
        : metadataEnd;
    signal.throwIfAborted();
    const positive = (value: number | null) =>
      value !== null && Number.isFinite(value) && value > 0 ? value : null;
    return {
      kind: "ready",
      metadata: {
        container: format.name,
        codec,
        duration:
          duration === null
            ? null
            : positive(duration - Math.max(0, firstTimestamp)),
        startTime: Number.isFinite(firstTimestamp)
          ? Math.max(0, firstTimestamp)
          : 0,
        sampleRate: positive(sampleRate),
        channels: positive(channels),
        hasVideo: video !== null,
      },
    };
  } catch (error) {
    signal.throwIfAborted();
    return { kind: "failed", message: "Unsupported or unreadable media." };
  } finally {
    signal.removeEventListener("abort", abort);
    input.dispose();
  }
}
