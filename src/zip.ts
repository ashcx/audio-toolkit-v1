import { createOutputStore, type StoredOutput } from "./output-store.ts";
import { cleanupAll } from "./cleanup.ts";

export type ZipProgress = Readonly<{ loaded: number; total: number }>;
export const ZIP_CHUNK = 1024 * 1024;
type Sink = (position: number, data: Uint8Array<ArrayBuffer>) => Promise<void>;
const encoder = new TextEncoder();
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function header(length: number) {
  const bytes = new Uint8Array(length);
  const view = new DataView(bytes.buffer);
  return { bytes, u16: (offset: number, value: number) => view.setUint16(offset, value, true), u32: (offset: number, value: number) => view.setUint32(offset, value, true), u64: (offset: number, value: number) => view.setBigUint64(offset, BigInt(value), true) };
}
// ZIP64 permits stored entries and offsets beyond 4 GiB without buffering them.
export async function writeStoredZip(files: readonly File[], write: Sink, signal: AbortSignal, progress: (value: ZipProgress) => void) {
  let position = 0, loaded = 0;
  const total = files.reduce((size, file) => size + file.size, 0);
  if (!Number.isSafeInteger(total)) throw new Error("These files are too large for a ZIP.");
  const entries: { name: Uint8Array<ArrayBuffer>; size: number; offset: number; crc: number }[] = [];
  const names = new Set<string>();
  const put = async (bytes: Uint8Array<ArrayBuffer>) => {
    signal.throwIfAborted();
    if (!Number.isSafeInteger(position + bytes.length)) throw new Error("This ZIP is too large.");
    await write(position, bytes);
    position += bytes.length;
    signal.throwIfAborted();
  };
  for (const file of files) {
    const name = encoder.encode(file.name);
    if (!name.length || name.length > 65535 || /[\\/\x00-\x1f\x7f]/.test(file.name) || /^\.+$/.test(file.name) || names.has(file.name.normalize("NFC").toLowerCase())) throw new Error("ZIP filenames must be safe and unique.");
    names.add(file.name.normalize("NFC").toLowerCase());
    const offset = position;
    const local = header(30 + name.length + 20);
    local.u32(0, 0x04034b50); local.u16(4, 45); local.u16(6, 0x0808); local.u16(12, 33);
    local.u32(18, 0xffffffff); local.u32(22, 0xffffffff); local.u16(26, name.length); local.u16(28, 20); local.bytes.set(name, 30);
    const extra = 30 + name.length;
    local.u16(extra, 1); local.u16(extra + 2, 16); local.u64(extra + 4, file.size); local.u64(extra + 12, file.size);
    await put(local.bytes);
    let crc = 0xffffffff;
    for (let start = 0; start < file.size; start += ZIP_CHUNK) {
      signal.throwIfAborted();
      const bytes = new Uint8Array(await file.slice(start, start + ZIP_CHUNK).arrayBuffer());
      for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
      await put(bytes); loaded += bytes.length; progress({ loaded, total });
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const descriptor = header(24);
    descriptor.u32(0, 0x08074b50); descriptor.u32(4, crc); descriptor.u64(8, file.size); descriptor.u64(16, file.size);
    await put(descriptor.bytes); entries.push({ name, size: file.size, offset, crc });
  }
  const centralOffset = position;
  for (const entry of entries) {
    const central = header(46 + entry.name.length + 28);
    central.u32(0, 0x02014b50); central.u16(4, 45); central.u16(6, 45); central.u16(8, 0x0808); central.u16(14, 33); central.u32(16, entry.crc);
    central.u32(20, 0xffffffff); central.u32(24, 0xffffffff); central.u16(28, entry.name.length); central.u16(30, 28); central.u32(42, 0xffffffff); central.bytes.set(entry.name, 46);
    const extra = 46 + entry.name.length;
    central.u16(extra, 1); central.u16(extra + 2, 24); central.u64(extra + 4, entry.size); central.u64(extra + 12, entry.size); central.u64(extra + 20, entry.offset);
    await put(central.bytes);
  }
  const centralSize = position - centralOffset, endOffset = position;
  const end = header(56); end.u32(0, 0x06064b50); end.u64(4, 44); end.u16(12, 45); end.u16(14, 45); end.u64(24, entries.length); end.u64(32, entries.length); end.u64(40, centralSize); end.u64(48, centralOffset); await put(end.bytes);
  const locator = header(20); locator.u32(0, 0x07064b50); locator.u64(8, endOffset); locator.u32(16, 1); await put(locator.bytes);
  const legacy = header(22); legacy.u32(0, 0x06054b50); legacy.u16(8, 65535); legacy.u16(10, 65535); legacy.u32(12, 0xffffffff); legacy.u32(16, 0xffffffff); await put(legacy.bytes);
}
export async function createZip(files: readonly File[], signal: AbortSignal, progress: (value: ZipProgress) => void): Promise<StoredOutput> {
  const store = await createOutputStore("audio-results.zip", "application/zip");
  try {
    await writeStoredZip(files, store.write, signal, progress);
    signal.throwIfAborted();
    return await store.finish();
  } catch (error) {
    await cleanupAll([store.discard]);
    throw error;
  }
}
