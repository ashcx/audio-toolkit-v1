import { BLOCK_FRAMES, type PcmCheckpoint, type PcmBlock } from "./blocks.ts";
import type { StorageClient } from "./storage-client";
async function* replay(file: File) {
  for (let position = 0; position < file.size; ) {
    const header = await file.slice(position, position + 32).arrayBuffer();
    if (header.byteLength !== 32)
      throw new Error("The temporary audio is incomplete.");
    const view = new DataView(header),
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
    const payload = await file
      .slice(position + 32, position + 32 + length)
      .arrayBuffer();
    if (payload.byteLength !== length)
      throw new Error("The temporary audio is incomplete.");
    const planes = Array.from(
      { length: count },
      (_, index) => new Float32Array(payload, index * frames * 4, frames),
    );
    yield { origin, offset, rate, planes };
    position += 32 + length;
  }
}
export async function checkpoint(
  client: StorageClient,
): Promise<PcmCheckpoint> {
  const id = await client.create("normalize.pcm", "application/octet-stream");
  let position = 0;
  return {
    async append(block: PcmBlock) {
      const frames = block.planes[0].length;
      const record = new Uint8Array(32 + block.planes.length * frames * 4),
        view = new DataView(record.buffer);
      view.setFloat64(0, block.origin, true);
      view.setFloat64(8, block.offset, true);
      view.setUint32(16, block.rate, true);
      view.setUint32(20, block.planes.length, true);
      view.setUint32(24, frames, true);
      block.planes.forEach((plane, index) =>
        new Float32Array(record.buffer, 32 + index * frames * 4, frames).set(
          plane,
        ),
      );
      await client.write(id, position, record);
      position += record.length;
    },
    async seal() {
      return replay(await client.finish(id));
    },
    async discard() {
      await client.discard(id);
    },
  };
}
