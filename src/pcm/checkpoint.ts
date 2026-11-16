import { BLOCK_FRAMES, type PcmCheckpoint, type PcmBlock, type PcmStream } from "./blocks.ts";
import type { StorageClient } from "./storage-client";
const HEADER_BYTES = 32;
const READ_WINDOW_BYTES = 4 * 1024 * 1024;
/** Short recordings stay in memory, longer ones spill to storage so memory stays bounded. */
const CHECKPOINT_MEMORY_BYTES = 128 * 1024 * 1024;
async function* replay(file: File): PcmStream {
  let window = new Uint8Array(0),
    windowStart = 0;
  const bytes = async (position: number, length: number) => {
    if (position < windowStart || position + length > windowStart + window.length) {
      windowStart = position;
      window = new Uint8Array(await file.slice(position, position + Math.max(length, READ_WINDOW_BYTES)).arrayBuffer());
    }
    return window.subarray(position - windowStart, position - windowStart + length);
  };
  for (let position = 0; position < file.size; ) {
    const header = await bytes(position, HEADER_BYTES);
    if (header.length !== HEADER_BYTES)
      throw new Error("The temporary audio is incomplete.");
    const view = new DataView(header.buffer, header.byteOffset, HEADER_BYTES),
      origin = view.getFloat64(0, true),
      offset = view.getFloat64(8, true),
      rate = view.getUint32(16, true),
      count = view.getUint32(20, true),
      frames = view.getUint32(24, true);
    if (
      !Number.isFinite(origin) ||
      !Number.isSafeInteger(offset) ||
      !rate ||
      count < 1 ||
      count > 2 ||
      frames < 1 ||
      frames > BLOCK_FRAMES
    )
      throw new Error("The temporary audio is invalid.");
    const length = count * frames * 4;
    const payload = await bytes(position + HEADER_BYTES, length);
    if (payload.length !== length)
      throw new Error("The temporary audio is incomplete.");
    const samples = payload.slice().buffer;
    const planes = Array.from(
      { length: count },
      (_, index) => new Float32Array(samples, index * frames * 4, frames),
    );
    yield { origin, offset, rate, planes };
    position += HEADER_BYTES + length;
  }
}
const copyOf = (block: PcmBlock): PcmBlock => ({
  origin: block.origin,
  offset: block.offset,
  rate: block.rate,
  planes: block.planes.map((plane) => new Float32Array(plane)),
});
export async function checkpoint(
  client: StorageClient,
  memoryLimit = CHECKPOINT_MEMORY_BYTES,
): Promise<PcmCheckpoint> {
  let held: PcmBlock[] | null = [],
    heldBytes = 0,
    id: string | null = null,
    position = 0;
  const write = async (block: PcmBlock) => {
    const frames = block.planes[0].length;
    const record = new Uint8Array(HEADER_BYTES + block.planes.length * frames * 4),
      view = new DataView(record.buffer);
    view.setFloat64(0, block.origin, true);
    view.setFloat64(8, block.offset, true);
    view.setUint32(16, block.rate, true);
    view.setUint32(20, block.planes.length, true);
    view.setUint32(24, frames, true);
    block.planes.forEach((plane, index) =>
      new Float32Array(record.buffer, HEADER_BYTES + index * frames * 4, frames).set(plane),
    );
    await client.write(id!, position, record);
    position += record.length;
  };
  return {
    async append(block: PcmBlock) {
      if (held) {
        const size = block.planes.length * block.planes[0].length * 4;
        if (heldBytes + size <= memoryLimit) {
          held.push(copyOf(block));
          heldBytes += size;
          return;
        }
        id = await client.create("normalize.pcm", "application/octet-stream");
        const spilled = held;
        held = null;
        for (const earlier of spilled) await write(earlier);
      }
      await write(block);
    },
    async seal() {
      if (held) {
        const blocks = held;
        return {
          read: async function* () {
            for (const block of blocks) yield copyOf(block);
          },
        };
      }
      const file = await client.finish(id!);
      return { read: () => replay(file) };
    },
    async discard() {
      held = null;
      if (id !== null) await client.discard(id);
    },
  };
}
