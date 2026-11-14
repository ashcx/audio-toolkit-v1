import { openStoreDirectory } from "../output-store";
import type { StoreNotice } from "./protocol";
type SyncHandle = {
  write(data: Uint8Array, options: { at: number }): number;
  truncate(length: number): void;
  flush(): void;
  close(): void;
};
type SyncFileHandle = FileSystemFileHandle & { createSyncAccessHandle(): Promise<SyncHandle> };
type Slot = { key: string; name: string; mime: string; file: SyncFileHandle; handle: SyncHandle | null };
/** Writes temporary and output files from the worker itself, so no file byte crosses the main thread. */
export class StorageClient {
  private slots = new Map<string, Slot>();
  private directory: Promise<FileSystemDirectoryHandle> | null = null;
  constructor(private notify: (notice: StoreNotice) => void) {}
  private open() {
    return (this.directory ??= openStoreDirectory());
  }
  private slot(id: string) {
    const slot = this.slots.get(id);
    if (!slot) throw new Error("The worker referred to an output that does not exist.");
    return slot;
  }
  private writable(id: string) {
    const { handle } = this.slot(id);
    if (!handle) throw new Error("The worker wrote to an output that was already closed.");
    return handle;
  }
  async create(name: string, mime: string) {
    const directory = await this.open();
    const key = crypto.randomUUID();
    const file = (await directory.getFileHandle(key, { create: true })) as SyncFileHandle;
    this.notify({ kind: "store", op: "opened", id: key });
    const slot: Slot = { key, name, mime, file, handle: null };
    this.slots.set(key, slot);
    slot.handle = await file.createSyncAccessHandle();
    return key;
  }
  async write(id: string, position: number, data: Uint8Array) {
    const handle = this.writable(id);
    for (let written = 0; written < data.length; ) {
      const count = handle.write(data.subarray(written), { at: position + written });
      if (count < 1) throw new DOMException("The file could not be written.", "QuotaExceededError");
      written += count;
    }
  }
  async truncate(id: string, length: number) {
    this.writable(id).truncate(length);
  }
  async finish(id: string) {
    const slot = this.slot(id);
    const handle = this.writable(id);
    handle.flush();
    handle.close();
    slot.handle = null;
    return new File([await slot.file.getFile()], slot.name, { type: slot.mime });
  }
  async discard(id: string) {
    const slot = this.slots.get(id);
    if (!slot) return;
    try { slot.handle?.close(); } catch { /* already closed */ }
    slot.handle = null;
    await (await this.open()).removeEntry(slot.key);
    this.slots.delete(id);
    this.notify({ kind: "store", op: "removed", id });
  }
  /** The final output stays in storage; its release moves to the main thread. */
  handOver(id: string) {
    this.slots.delete(id);
    this.notify({ kind: "store", op: "removed", id });
  }
}
