function packetFrames(data: Uint8Array): number {
  if (!data.length) throw new Error("Empty Opus packet.");
  const config = data[0] >> 3;
  const code = data[0] & 3;
  const count = code === 0 ? 1 : code === 3 ? (data[1] ?? 0) & 63 : 2;
  const milliseconds =
    config < 12
      ? [10, 20, 40, 60][config % 4]
      : config < 16
        ? 10 * 2 ** (config % 2)
        : 2.5 * 2 ** (config % 4);
  if (!count || count * milliseconds > 120)
    throw new Error("Invalid Opus packet duration.");
  return Math.round(milliseconds * 48 * count);
}
export async function opusDuration(
  packets: AsyncIterable<{ data: Uint8Array; duration: number }>,
  preSkip: number,
  signal: AbortSignal,
): Promise<number> {
  let frames = 0;
  let last: { data: Uint8Array; duration: number } | null = null;
  for await (const packet of packets) {
    signal.throwIfAborted();
    if (last) frames += packetFrames(last.data);
    last = packet;
  }
  if (!last) throw new Error("The audio track contains no packets.");
  const complete = packetFrames(last.data);
  frames +=
    last.duration > 0
      ? Math.min(complete, Math.round(last.duration * 48000))
      : complete;
  return Math.max(0, frames - preSkip) / 48000;
}
