import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { FolderSave, type DirectoryPicker, type FolderState } from "./folder-save";
export function useFolderSave(sourceKey: string) {
  const picker = (window as Window & { showDirectoryPicker?: (options: {mode: "readwrite"}) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker;
  const supported = window.isSecureContext && typeof picker === "function";
  const owner = useRef<FolderSave | null>(null);
  if (!owner.current) {
    const choose: DirectoryPicker = () => supported
      ? picker.call(window, { mode: "readwrite" })
      : Promise.reject(new Error("Folder saving is unavailable. Download individually or create a ZIP."));
    owner.current = new FolderSave(choose);
  }
  const folder = owner.current;
  const [state, setState] = useState<FolderState>(folder.state);
  useLayoutEffect(() => folder.subscribe(setState), [folder]);
  useLayoutEffect(() => folder.resetReport(), [folder, sourceKey]);
  useLayoutEffect(() => () => folder.dispose(), [folder]);
  return { supported, state, busy: folder.busy, start: folder.start.bind(folder), cancel: folder.cancel.bind(folder) };
}
