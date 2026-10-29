export type Mp3Presentation = Readonly<{
  delay: number;
  frames: number;
  rate: number;
}>;
export async function readMp3Presentation(
  file: File,
  signal: AbortSignal,
): Promise<Mp3Presentation | null> {
  let offset = 0;
  for (let tag = 0; tag < 16; tag++) {
    signal.throwIfAborted();
    const header = new Uint8Array(
      await file.slice(offset, offset + 10).arrayBuffer(),
    );
    if (
      header.length < 10 ||
      header[0] !== 73 ||
      header[1] !== 68 ||
      header[2] !== 51
    )
      break;
    if (header.subarray(6).some((value) => value >= 128)) return null;
    const length =
      header[6] * 2097152 + header[7] * 16384 + header[8] * 128 + header[9];
    offset += 10 + length + (header[3] === 4 && header[5] & 16 ? 10 : 0);
  }
  signal.throwIfAborted();
  const bytes = new Uint8Array(
    await file.slice(offset, offset + 4096).arrayBuffer(),
  );
  const view = new DataView(bytes.buffer);
  const text = (start: number, length: number) =>
    new TextDecoder().decode(bytes.subarray(start, start + length));
  for (let start = 0; start + 64 < bytes.length; start++) {
    if (bytes[start] !== 255 || (bytes[start + 1] & 224) !== 224) continue;
    const version = (bytes[start + 1] >> 3) & 3;
    const layer = (bytes[start + 1] >> 1) & 3;
    const rateIndex = (bytes[start + 2] >> 2) & 3;
    if (version === 1 || layer !== 1 || rateIndex === 3) continue;
    const mono = bytes[start + 3] >> 6 === 3;
    const side = version === 3 ? (mono ? 17 : 32) : mono ? 9 : 17;
    const xing = start + 4 + side;
    if (!["Xing", "Info"].includes(text(xing, 4))) continue;
    const flags = view.getUint32(xing + 4);
    if (!(flags & 1)) return null;
    const encodedFrames = view.getUint32(xing + 8);
    let encoder = xing + 12;
    if (flags & 2) encoder += 4;
    if (flags & 4) encoder += 100;
    if (flags & 8) encoder += 4;
    if (
      encoder + 24 > bytes.length ||
      !["LAME", "Lavc", "Lavf"].includes(text(encoder, 4))
    )
      return null;
    const delay = (bytes[encoder + 21] << 4) | (bytes[encoder + 22] >> 4);
    const padding = ((bytes[encoder + 22] & 15) << 8) | bytes[encoder + 23];
    const frames =
      encodedFrames * (version === 3 ? 1152 : 576) - delay - padding;
    if (frames <= 0 || padding < 529) return null;
    const rate =
      [44100, 48000, 32000][rateIndex] /
      (version === 3 ? 1 : version === 2 ? 2 : 4);
    return Object.freeze({ delay: delay + 529, frames, rate });
  }
  return null;
}
