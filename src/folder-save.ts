import { copy } from "./copy.ts";
import { UserFacingError, failure, failureOf, messageFor, type ErrorCode, type Failure } from "./errors.ts";
/** `code` is the catalogue entry behind `message`, or null for the per-file sentences that name the file. */
export type FailedItem = Readonly<{ name: string; code: ErrorCode | null; message: string }>;
export type FolderReport = Readonly<{
  folder: string;
  saved: readonly string[];
  failed: readonly FailedItem[];
  remaining: number;
  cancelled: boolean;
}>;
export type DirectoryPicker = () => Promise<FileSystemDirectoryHandle>;
export type FolderState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "choosing" | "cancelling" }>
  | Readonly<{ kind: "saving"; completed: number; total: number }>
  | Readonly<{ kind: "result"; report: FolderReport }>
  | Readonly<{ kind: "failed" } & Failure>;

function namedError(error: unknown, name: string) {
  return error instanceof DOMException && error.name === name;
}
class AlreadyExists extends Error {}
function blockedCode(error: unknown): "folder-blocked" | "folder-no-space" | null {
  if (namedError(error, "NotAllowedError")) return "folder-blocked";
  if (namedError(error, "QuotaExceededError")) return "folder-no-space";
  return null;
}
/** The one sentence for a file that did not make it into the folder. */
function itemFailure(error: unknown, name: string, cancelled: boolean, partial: boolean): FailedItem {
  const unfinished = { name, code: null, message: copy.delivery.folderUnfinished(name) };
  if (partial) return unfinished;
  const code = cancelled ? "folder-cancelled" : blockedCode(error);
  if (code) return { name, code, message: messageFor(code) };
  if (error instanceof AlreadyExists) return { name, code: null, message: copy.delivery.folderSkipped(name) };
  console.error(error);
  return unfinished;
}
function folderFailure(error: unknown): Failure {
  const code = blockedCode(error);
  return code ? failure(code) : failureOf(error, "folder-blocked");
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
      throw new UserFacingError("names-unsafe", "Output names must be safe and unique.");
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
      throw new UserFacingError("folder-blocked", "The new batch folder is already occupied.");
    return directory;
  }
  throw new UserFacingError("folder-blocked", "Could not create a new batch folder.");
}
export async function saveFilesToFolder(
  files: readonly File[], parent: FileSystemDirectoryHandle, signal: AbortSignal,
  progress: (completed: number) => void,
): Promise<FolderReport> {
  validateNames(files);
  signal.throwIfAborted();
  const directory = await freshDirectory(parent, signal);
  const saved: string[] = [];
  const failed: FailedItem[] = [];
  let attempted = 0;
  for (const file of files) {
    if (signal.aborted) break;
    let writable: FileSystemWritableFileStream | null = null;
    let created = false;
    try {
      if (await exists(directory, file.name)) throw new AlreadyExists("Name already exists; existing file was kept.");
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
      failed.push(itemFailure(error, file.name, signal.aborted, partial));
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
      this.set({ kind: "failed", ...(controller.signal.aborted || namedError(error, "AbortError") ? failure("folder-cancelled") : folderFailure(error)) });
    } finally { this.active = null; this.set(this.state); }
  }
  resetReport() { if (!this.busy) this.set({ kind: "idle" }); }
  cancel() { if (this.active) { this.active.abort(); this.set({ kind: "cancelling" }); } }
  dispose() { this.listeners.clear(); this.disposed = true; this.cancel(); }
}
