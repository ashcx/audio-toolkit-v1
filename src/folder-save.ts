export type FolderReport = Readonly<{
  folder: string;
  saved: readonly string[];
  failed: readonly { name: string; message: string }[];
  remaining: number;
  cancelled: boolean;
}>;
export type DirectoryPicker = () => Promise<FileSystemDirectoryHandle>;
export type FolderState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "choosing" | "cancelling" }>
  | Readonly<{ kind: "saving"; completed: number; total: number }>
  | Readonly<{ kind: "result"; report: FolderReport }>
  | Readonly<{ kind: "failed"; message: string }>;

function namedError(error: unknown, name: string) {
  return error instanceof DOMException && error.name === name;
}
async function exists(directory: FileSystemDirectoryHandle, name: string) {
  try { await directory.getFileHandle(name); return true; }
  catch (error) {
    if (namedError(error, "NotFoundError")) return false;
    if (namedError(error, "TypeMismatchError")) return true;
    throw error;
  }
}
function validateNames(files: readonly File[]) {
  const used = new Set<string>();
  for (const file of files) {
    const name = file.name.normalize("NFC").toLowerCase();
    if (!name || /[<>:"/\\|?*\x00-\x1f\x7f]/.test(name) || /[. ]$/.test(name) || /^\.+$/.test(name) || used.has(name))
      throw new Error("Output names must be safe and unique. Download individually instead.");
    used.add(name);
  }
}
async function freshDirectory(parent: FileSystemDirectoryHandle, signal: AbortSignal) {
  for (let attempt = 0; attempt < 8; attempt++) {
    signal.throwIfAborted();
    const name = `Audio Toolkit ${crypto.randomUUID()}`;
    if (await exists(parent, name)) continue;
    const directory = await parent.getDirectoryHandle(name, { create: true });
    for await (const _entry of directory.values())
      throw new Error("The new batch folder is already occupied. Try saving again.");
    return directory;
  }
  throw new Error("Could not create a new batch folder. Try saving again.");
}
export async function saveFilesToFolder(
  files: readonly File[], parent: FileSystemDirectoryHandle, signal: AbortSignal,
  progress: (completed: number) => void,
): Promise<FolderReport> {
  validateNames(files);
  signal.throwIfAborted();
  const directory = await freshDirectory(parent, signal);
  const saved: string[] = [];
  const failed: { name: string; message: string }[] = [];
  let attempted = 0;
  for (const file of files) {
    if (signal.aborted) break;
    let writable: FileSystemWritableFileStream | null = null;
    let created = false;
    try {
      if (await exists(directory, file.name)) throw new Error("Name already exists; existing file was kept.");
      signal.throwIfAborted();
      const handle = await directory.getFileHandle(file.name, { create: true });
      created = true;
      writable = await handle.createWritable();
      for (let start = 0; start < file.size; start += 1024 * 1024) {
        signal.throwIfAborted();
        const bytes = await file.slice(start, start + 1024 * 1024).arrayBuffer();
        signal.throwIfAborted();
        await writable.write(bytes);
      }
      signal.throwIfAborted();
      await writable.close();
      writable = null;
      saved.push(file.name);
    } catch (error) {
      let partial = false;
      if (writable) {
        try { await writable.abort(); } catch { partial = true; }
      }
      if (created) {
        try { await directory.removeEntry(file.name); partial = false; } catch { partial = true; }
      }
      failed.push({ name: file.name, message: partial
        ? `A partial file may remain in ${directory.name}/${file.name}. Original download is available.`
        : signal.aborted ? "Cancelled; original download is available."
        : namedError(error, "NotAllowedError") ? "Folder access denied; original download is available."
        : namedError(error, "QuotaExceededError") ? "Not enough space; original download is available."
        : error instanceof Error ? error.message : "Could not save; original download is available." });
    }
    attempted++;
    progress(attempted);
  }
  return { folder: `${parent.name}/${directory.name}`, saved, failed, remaining: files.length - attempted, cancelled: signal.aborted };
}
export class FolderSave {
  state: FolderState = { kind: "idle" };
  private listeners = new Set<(state: FolderState) => void>();
  private active: AbortController | null = null;
  private disposed = false;
  private pick: DirectoryPicker;
  constructor(pick: DirectoryPicker) { this.pick = pick; }
  get busy() { return this.active !== null; }
  subscribe(listener: (state: FolderState) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private set(state: FolderState) { this.state = state; for (const listener of this.listeners) listener(state); }
  async start(files: readonly File[]) {
    if (this.busy || this.disposed || !files.length) return;
    const controller = new AbortController();
    this.active = controller;
    this.set({ kind: "choosing" });
    try {
      const directory = await this.pick();
      controller.signal.throwIfAborted();
      this.set({ kind: "saving", completed: 0, total: files.length });
      const report = await saveFilesToFolder(files, directory, controller.signal, completed => {
        if (!controller.signal.aborted) this.set({ kind: "saving", completed, total: files.length });
      });
      this.set({ kind: "result", report });
    } catch (error) {
      this.set({ kind: "failed", message: controller.signal.aborted || namedError(error, "AbortError")
        ? "Folder saving cancelled. Downloads are still available."
        : namedError(error, "NotAllowedError") ? "Folder access denied. Download individually or create a ZIP."
        : error instanceof Error ? error.message : "Folder could not be saved. Downloads are still available." });
    } finally { this.active = null; this.set(this.state); }
  }
  resetReport() { if (!this.busy) this.set({ kind: "idle" }); }
  cancel() { if (this.active) { this.active.abort(); this.set({ kind: "cancelling" }); } }
  dispose() { this.listeners.clear(); this.disposed = true; this.cancel(); }
}
