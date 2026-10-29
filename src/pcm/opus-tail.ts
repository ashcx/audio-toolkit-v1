import { packetFrames } from "../opus-duration.ts";
function checksum(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  view.setUint32(22, 0, true);
  let crc = 0;
  for (const byte of data) {
    crc ^= byte << 24;
    for (let bit = 0; bit < 8; bit++) crc = (crc << 1) ^ ((crc & 0x80000000) ? 0x04c11db7 : 0);
  }
  view.setUint32(22, crc >>> 0, true);
}
export function opusTail() {
  let preSkip: number | null = null;
  const heads: { data: Uint8Array; position: number }[] = [];
  const pages: { data: Uint8Array; position: number; before: number; end: number }[] = [];
  let previous = 0;
  return {
    onPage(data: Uint8Array, position: number) {
      const body = 27 + data[26];
      if (new TextDecoder().decode(data.subarray(body, body + 8)) === "OpusHead") {
        preSkip = data[body + 10] | (data[body + 11] << 8);
        heads.push({ data: new Uint8Array(data), position });
      }
      const end = Number(new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(6, true));
      if (end > 0 && end < Number.MAX_SAFE_INTEGER) {
        pages.push({ data: new Uint8Array(data), position, before: previous, end });
        if (pages.length > 4) pages.shift();
        previous = end;
      }
    },
    finish(frames: number, rate: number) {
      if (preSkip === null)
        throw new Error("Opus timing metadata is unavailable.");
      let head: { data: Uint8Array; position: number } | null = null;
      let skip = preSkip;
      if (rate !== 48000 && /Chrome|Chromium|Edg\//.test(navigator.userAgent) && preSkip === 312 * rate / 48000) {
        head = heads[0];
        const body = 27 + head.data[26];
        skip = 312;
        head.data[body + 10] = skip & 255;
        head.data[body + 11] = skip >> 8;
        checksum(head.data);
      }
      const end = Math.round(frames * 48000 / rate) + skip;
      const page = pages.find(page => page.before < end && page.end >= end);
      if (!page)
        throw new Error("The Opus encoder did not flush all audio samples.");
      const { data: original, position } = page;
      if (original[5] & 1) throw new Error("The Opus tail spans an unsupported page continuation.");
      const body = 27 + original[26];
      let bytes = 0, packetStart = body, segments = 0, clock = page.before;
      for (; segments < original[26]; segments++) {
        bytes += original[27 + segments];
        if (original[27 + segments] < 255) {
          clock += packetFrames(original.subarray(packetStart, body + bytes));
          packetStart = body + bytes;
          if (clock >= end) { segments++; break; }
        }
      }
      if (clock < end) throw new Error("The Opus tail is incomplete.");
      const data = new Uint8Array(27 + segments + bytes), view = new DataView(data.buffer);
      data.set(original.subarray(0, 27));
      data[5] |= 4;
      data[26] = segments;
      data.set(original.subarray(27, 27 + segments), 27);
      data.set(original.subarray(body, body + bytes), 27 + segments);
      view.setBigUint64(6, BigInt(end), true);
      checksum(data);
      return { data, position, length: position + data.length, head };
    },
  };
}
