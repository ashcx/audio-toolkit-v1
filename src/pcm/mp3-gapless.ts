export function mp3GaplessHeader(header: Uint8Array, inputFrames: number): Uint8Array {
  const data = new Uint8Array(header), view = new DataView(data.buffer);
  const version = (data[1] >> 3) & 3;
  const mono = data[3] >> 6 === 3;
  const side = version === 3 ? (mono ? 17 : 32) : mono ? 9 : 17;
  const xing = 4 + side;
  const word = new TextDecoder().decode(data.subarray(xing, xing + 4));
  if (!["Xing", "Info"].includes(word)) throw new Error("MP3 timing metadata is unavailable.");
  let flags = view.getUint32(xing + 4);
  const frames = view.getUint32(xing + 8) - 1;
  const delay = 576;
  const padding = frames * (version === 3 ? 1152 : 576) - inputFrames - delay;
  if (frames < 1 || padding < 529 || padding > 4095)
    throw new Error("MP3 gapless timing is outside the supported range.");
  const tagOffset = () => xing + 8 + ((flags & 1) ? 4 : 0) + ((flags & 2) ? 4 : 0) + ((flags & 4) ? 100 : 0) + ((flags & 8) ? 4 : 0);
  if (tagOffset() + 36 > data.length) flags &= ~4;
  const tag = tagOffset();
  if (tag + 36 > data.length) throw new Error("MP3 timing metadata does not fit.");
  view.setUint32(xing + 4, flags);
  view.setUint32(xing + 8, frames);
  data.fill(0, tag, tag + 36);
  data.set(new TextEncoder().encode("LAME3.100"), tag);
  data[tag + 21] = delay >> 4;
  data[tag + 22] = ((delay & 15) << 4) | (padding >> 8);
  data[tag + 23] = padding & 255;
  let crc = 0;
  for (const byte of data.subarray(0, tag + 34)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x8005 : 0)) & 65535;
  }
  view.setUint16(tag + 34, crc);
  return data;
}
