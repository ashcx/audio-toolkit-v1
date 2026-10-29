export type StoredOutput = Readonly<{
  file: File;
  name: string;
  mime: string;
  release: () => Promise<void>;
}>;
export async function createOutputStore(name: string, mime: string) {
  if (!navigator.storage?.getDirectory)
    throw new Error("Temporary storage is unavailable in this browser.");
  let directory: FileSystemDirectoryHandle;
  try {
    const root = await navigator.storage.getDirectory();
    directory = await root.getDirectoryHandle("audio-toolkit-v1", {
      create: true,
    });
  } catch {
    throw new Error(
      "Temporary storage is unavailable. Try a non-private browser window.",
    );
  }
  const key = crypto.randomUUID();
  const handle = await directory.getFileHandle(key, { create: true });
  let removed = false;
  const remove = async () => {
    if (removed) return;
    await directory.removeEntry(key);
    removed = true;
  };
  let writer: FileSystemWritableFileStream;
  try {
    writer = await handle.createWritable();
  } catch (error) {
    await remove();
    throw error;
  }
  let closed = false;
  return {
    async write(position: number, data: Uint8Array<ArrayBuffer>) {
      await writer.write({ type: "write", position, data });
    },
    async finish(): Promise<StoredOutput> {
      await writer.close();
      closed = true;
      const file = new File([await handle.getFile()], name, { type: mime });
      return Object.freeze({ file, name, mime, release: remove });
    },
    async discard() {
      if (!closed) {
        await writer.abort().catch(() => undefined);
        closed = true;
      }
      await remove();
    },
  };
}
