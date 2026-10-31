import { render } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import "./style.css";
import { useFiles } from "./use-files";
import { FileRow } from "./file-row";
import { useFolderSave } from "./use-folder-save";
import { useArchive } from "./use-archive";
import { usePreview } from "./use-preview";
import { useExport } from "./use-export";
import { compilePlan } from "./planner";
import { automaticExport } from "./export-default";
import { snapshotForFile } from "./recipe";
import { RecipeEditor, ExportEditor } from "./recipe-editor";
import {
  newRecipe,
  recipeSchema,
  type RecipeDraft,
} from "./recipe";
import { exportStatus } from "./file-summary";

type Theme = "system" | "light" | "dark";
function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem("audio-toolkit-theme");
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const { entries: files, add, remove, clear } = useFiles();
  const exports = useExport(files);
  const completed = [...exports.jobs.values()].flatMap(job => job.state.kind === "done" ? [job.state] : []);
  const archive = useArchive(completed.map(result => result.url).join("|"));
  const folder = useFolderSave(completed.map(result => result.url).join("|"));
  const deliveryLocked = exports.busy || archive.busy || folder.busy;
  useLayoutEffect(() => {
    const dismiss = (event: Event) => {
      if (!(event.target instanceof Node)) return;
      for (const menu of document.querySelectorAll<HTMLDetailsElement>(".step-menu[open], .delivery-menu[open]"))
        if (!menu.contains(event.target)) menu.open = false;
    };
    document.addEventListener("pointerdown",dismiss);
    document.addEventListener("focusin",dismiss);
    return () => {document.removeEventListener("pointerdown",dismiss);document.removeEventListener("focusin",dismiss);};
  },[]);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const [recipeDraft, setDraft] = useState<RecipeDraft>(newRecipe);
  const [explicitFormat, setExplicitFormat] = useState(false);
  const [clearing, setClearing] = useState(false);
  const draft = explicitFormat ? recipeDraft : {...recipeDraft, export: automaticExport(recipeDraft,files)};
  const preview = usePreview(JSON.stringify([draft, files.map(entry => [entry.id, entry.inspection])]));
  const locked = deliveryLocked;
  const workLocked = locked || preview.busy;
  const settings = useRef<HTMLDialogElement>(null);
  const exportButton = useRef<HTMLButtonElement>(null);
  const pendingResultFocus = useRef(false);
  const pendingClearFocus = useRef(false);
  const cleanupButton = useRef<HTMLButtonElement>(null);
  const zipCleanupButton = useRef<HTMLButtonElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const parsedRecipe = recipeSchema.safeParse(draft);
  const plans = new Map(
    files.map((entry) => {
      if (!parsedRecipe.success || entry.inspection.kind !== "ready")
        return [entry.id, null] as const;
      const effective = snapshotForFile(
        parsedRecipe.data,
        entry,
      );
      return [
        entry.id,
        effective.kind === "ready"
          ? compilePlan(effective.snapshot, entry.inspection.metadata)
          : effective,
      ] as const;
    }),
  );
  const jobs = files.flatMap((entry) => {
    const plan = plans.get(entry.id);
    return plan &&
      (plan.kind === "copy" ||
        plan.kind === "pcm")
      ? [{ entry, plan }]
      : [];
  });
  const trim = draft.steps.find((step) => step.kind === "trim");
  const previewCleanup = preview.state.kind === "cleanup" ? preview.state : null;
  const changeRecipe = (next: RecipeDraft) => {
    if (locked) return false;
    setDraft(next);
    return true;
  };
  const clearAll = () => {
    if (clearing) return;
    setDraft(current => ({ ...current, export: draft.export }));
    setExplicitFormat(true);
    pendingClearFocus.current = true;
    setClearing(true);
    preview.clear();
    void archive.clear();
    folder.cancel();
    exports.cancelAll();
  };
  useLayoutEffect(() => {
    if (!clearing) return;
    if (preview.busy || archive.busy || folder.busy || exports.busy) return;
    for (const id of exports.jobs.keys()) exports.clear(id);
    clear();
    setClearing(false);
  }, [clearing, preview.busy, archive.busy, folder.busy, exports.busy, exports.cleanupCount]);
  useLayoutEffect(() => {
    if (!completed.length && !exports.busy && !archive.busy && !folder.busy) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault();event.returnValue = ""; };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [completed.length, exports.busy, archive.busy, folder.busy]);
  const picker = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (clearing || !pendingClearFocus.current) return;
    pendingClearFocus.current = false;
    picker.current?.focus();
  }, [clearing, files.length]);
  useLayoutEffect(() => {
    if (!pendingResultFocus.current) return;
    if (archive.state.kind === "cleanup") {pendingResultFocus.current=false;zipCleanupButton.current?.focus();return;}
    if (locked) return;
    pendingResultFocus.current = false;
    if (exports.cleanupCount > 0) {cleanupButton.current?.focus();return;}
    const target = jobs.length ? exportButton.current
      : document.querySelector<HTMLButtonElement>(".step-toggle[aria-describedby*='error-']") ?? picker.current;
    target?.focus();
  },[locked,completed.length,jobs.length,exports.cleanupCount,archive.state.kind]);
  const fileList = useRef<HTMLUListElement>(null);
  const pendingFocus = useRef<number | null>(null);
  const capabilities = {
    workers: typeof Worker !== "undefined",
    storage: typeof navigator.storage?.getDirectory === "function",
    webCodecs: typeof AudioDecoder !== "undefined",
    firefox: /Firefox\/|FxiOS\//.test(navigator.userAgent),
  };
  useLayoutEffect(() => {
    const index = pendingFocus.current;
    if (index === null) return;
    pendingFocus.current = null;
    const buttons = fileList.current?.querySelectorAll<HTMLButtonElement>(
      "button[data-remove-file]",
    );
    const target = buttons?.[Math.min(index, files.length - 1)];
    if (target) target.focus();
    else picker.current?.focus();
  }, [files]);
  useLayoutEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    update();
    media.addEventListener("change", update);
    try {
      localStorage.setItem("audio-toolkit-theme", theme);
    } catch {}
    return () => media.removeEventListener("change", update);
  }, [theme]);
  return (
    <div class="app">
      <header class="header">
        <a
          class="brand"
          href="https://ashcx.github.io/media-toolkit/"
          aria-label="Back to Media Toolkit"
        >
          <h1>Audio Toolkit</h1>
        </a>
        <button ref={settingsButton} type="button" onClick={() => settings.current?.showModal()}>Settings</button>
      </header>
      <main>
        {capabilities.firefox && (
          <p class="notice" role="status">
            Firefox is unsupported. Use Chrome, Edge or Safari.
          </p>
        )}
        {!capabilities.workers && (
          <p class="notice" role="status">
            Audio workers are unavailable. Use a supported browser.
          </p>
        )}
        {!capabilities.storage && (
          <p class="notice" role="status">
            Temporary storage is unavailable. Large files may be limited.
          </p>
        )}
        {!capabilities.webCodecs && (
          <p class="notice" role="status">
            Some formats need a compatibility component. Support is checked
            before processing.
          </p>
        )}
        <div class="workspace">
          <section class="panel files-panel" aria-labelledby="files-title">
            <div class="panel-heading">
              <h2 id="files-title">Files</h2>
              {files.length > 0 && (
                <span class="count">{files.length}</span>
              )}
            </div>
            <label
              class={`dropzone${files.length ? " has-files" : ""}${dragging ? " dropzone-active" : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                dragDepth.current++;
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => {
                dragDepth.current = Math.max(0, dragDepth.current - 1);
                if (!dragDepth.current) setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                dragDepth.current = 0;
                setDragging(false);
                if (!archive.busy && !folder.busy) add(Array.from(event.dataTransfer?.files ?? []));
              }}
            >
              <input
                ref={picker}
                disabled={archive.busy || folder.busy}
                type="file"
                multiple
                accept="audio/*,video/*,.mkv,.flac,.opus,.ogg,.m4a,.aac"
                aria-label="Choose audio or video files"
                onChange={(event) => {
                  add(Array.from(event.currentTarget.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
              <span class="button primary">{files.length ? "Add files" : "Choose files"}</span>
              <small>or drop audio or video</small>
            </label>
            {files.length > 0 && (
              <p class="sr-only" role="status">
                {files.some(
                  (entry) =>
                    entry.inspection.kind === "waiting" ||
                    entry.inspection.kind === "reading",
                )
                  ? "Inspecting files."
                  : "File inspection complete."}
              </p>
            )}
            {files.length > 0 && (
              <ul ref={fileList} class="file-list" aria-label="Selected files">
                {files.map((entry, index) => (
                  <FileRow
                    key={entry.id}
                    entry={entry}
                    trim={trim?.range}
                    plan={plans.get(entry.id) ?? null}
                    job={exports.jobs.get(entry.id)}
                    preview={preview.state.kind !== "idle" && preview.state.fileId === entry.id ? preview.state : undefined}
                    previewDisabled={workLocked || exports.cleanupCount > 0 || !parsedRecipe.success}
                    hasRecipeSteps={draft.steps.length > 0}
                    onPreview={() => {
                      if (workLocked || exports.cleanupCount > 0 || !parsedRecipe.success) return;
                      const effective = snapshotForFile(parsedRecipe.data, entry);
                      if (effective.kind === "ready") preview.start(entry, effective.snapshot);
                    }}
                    onClearPreview={preview.clear}
                    busy={workLocked || exports.cleanupCount > 0}
                    downloadBusy={archive.busy || folder.busy}
                    onCancel={() => exports.cancel(entry.id)}
                    onRetry={() => { if (!preview.busy) exports.retry(entry.id); }}
                    onRemove={() => {
                      pendingFocus.current = index;
                      if (preview.state.kind !== "idle" && preview.state.fileId === entry.id) preview.clear();
                      exports.clear(entry.id);
                      remove(entry.id);
                    }}
                  />
                ))}
              </ul>
            )}
          </section>
          <div class="recipe-column">
          <fieldset class="recipe-lock" disabled={locked}>
          <RecipeEditor
            files={files}
            analysisEnabled={!locked}
            duration={Math.max(0, ...files.flatMap(file => file.inspection.kind === "ready" && file.inspection.metadata.duration !== null ? [file.inspection.metadata.duration] : []))}
            value={draft}
            onChange={changeRecipe}
            error={
              parsedRecipe.success ||
              parsedRecipe.error.issues[0].path[0] === "steps"
                ? undefined
                : parsedRecipe.error.issues[0].message
            }
          />
          </fieldset>
          <ExportEditor value={draft} disabled={locked} onChange={(next,explicit) => {
            const changed = changeRecipe(next);
            if (changed && explicit) setExplicitFormat(true);
            return changed;
          }}>
        <div class="run-actions">
          <div class="run-status" aria-live="polite">
            {clearing && <span>Cancelling and cleaning up before clearing…</span>}
            {previewCleanup && !files.some(entry => entry.id === previewCleanup.fileId) && <>
              <span>{previewCleanup.message}</span><button type="button" class="text-button" onClick={preview.clear}>Retry preview cleanup</button>
            </>}
            {folder.state.kind === "choosing" && <span>Choose a folder for a new batch folder.</span>}
            {folder.state.kind === "saving" && <span>Saving {folder.state.completed} / {folder.state.total}</span>}
            {(folder.state.kind === "choosing" || folder.state.kind === "saving") && <button type="button" class="text-button" onClick={folder.cancel}>Cancel folder save</button>}
            {folder.state.kind === "cancelling" && <span>Cancelling folder save…</span>}
            {folder.state.kind === "failed" && <span>{folder.state.message}</span>}
            {folder.state.kind === "result" && <div class="folder-report">
              <p>{folder.state.report.cancelled ? "Cancelled. " : ""}{folder.state.report.saved.length} saved to {folder.state.report.folder}. {folder.state.report.failed.length} failed, {folder.state.report.remaining} not saved.</p>
              {folder.state.report.failed.map(item => <p>{item.name}: {item.message}</p>)}
            </div>}
            {archive.state.kind === "building" && <>
              <progress aria-label="ZIP progress" value={archive.state.progress.loaded} max={archive.state.progress.total || 1} />
              <span>Creating ZIP</span>
              <button type="button" class="text-button" onClick={archive.cancel}>Cancel ZIP</button>
            </>}
            {(archive.state.kind === "cancelling" || archive.state.kind === "releasing") && <span>Cleaning up ZIP…</span>}
            {(archive.state.kind === "failed" || archive.state.kind === "cleanup") && <span>{archive.state.message}</span>}
            {archive.state.kind === "cleanup" && <button ref={zipCleanupButton} type="button" class="text-button" onClick={() => {pendingResultFocus.current=true;void archive.clear();}}>Retry ZIP cleanup</button>}
            {exports.cleanupCount > 0 && <>
              <span>Temporary files need cleanup.</span>
              <button ref={cleanupButton} type="button" class="text-button" disabled={locked} onClick={() => {pendingResultFocus.current=true;void exports.retryCleanup();}}>Retry cleanup</button>
            </>}
            {exports.jobs.size > 0 && <span class="run-count">{exportStatus([...exports.jobs.values()])}</span>}
            {exports.busy && <button type="button" class="text-button" onClick={exports.cancelAll}>Cancel all</button>}
            {!workLocked && exports.cleanupCount === 0 && [...exports.jobs.values()].some(job => job.state.kind === "failed") &&
              <button type="button" class="text-button" onClick={() => exports.retry()}>Retry failed</button>}
            {completed.length > 0 && !clearing && <small>Clear all removes unsaved exports. Saved downloads stay on your device.</small>}
            {exports.busy && <small>{exports.cleaning ? "Cleaning up…" : "Keep this page open. Cancellation waits for cleanup."}</small>}
          </div>
          <div class="run-actions-group">
            {files.length > 0 && <button
              type="button"
              disabled={clearing}
              title="Removes loaded files and unsaved exports. Files saved to your device stay."
              onClick={clearAll}
            >Clear all</button>}
            {completed.length > 0 && <details class="delivery-menu" onKeyDown={event=>{
              if(event.key === "Escape") {event.currentTarget.open=false;event.currentTarget.querySelector<HTMLElement>("summary")?.focus();}
            }}>
              <summary role="button" class="button">Save to device</summary>
              <div class="delivery-options">
                {archive.state.kind === "ready" ? <a class="button" href={archive.state.url} download={archive.state.output.name}>Download ZIP</a>
                  : <button type="button" disabled={workLocked || exports.cleanupCount > 0} onClick={() => archive.start(completed.map(result => result.output.file))}>Create ZIP</button>}
                {folder.supported && <button type="button" disabled={workLocked || exports.cleanupCount > 0} onClick={event => {
                  event.currentTarget.closest("details")?.removeAttribute("open");
                  void folder.start(completed.map(result => result.output.file));
                }}>Save to folder</button>}
                <button type="button" disabled={locked} onClick={() => {
                  pendingResultFocus.current = true;
                  void archive.clear();
                  for (const id of exports.jobs.keys()) exports.clear(id);
                }}>Clear results</button>
              </div>
            </details>}
            <button
              ref={exportButton}
              class="button primary"
              type="button"
              disabled={workLocked || exports.cleanupCount > 0 || !jobs.length}
              onClick={() => void exports.run(jobs)}
            >
              Export
            </button>
          </div>
        </div>
          </ExportEditor>
          </div>
        </div>
      </main>
      <dialog ref={settings} class="settings-dialog" aria-labelledby="settings-title" onClose={() => settingsButton.current?.focus()}>
        <div class="panel-heading"><h2 id="settings-title">Settings</h2><button type="button" onClick={() => settings.current?.close()}>Close</button></div>
        <fieldset><legend>Appearance</legend><div class="theme-options">
          {([{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }] satisfies { value: Theme; label: string }[]).map(option => <label>
            <input class="sr-only" type="radio" name="appearance" checked={theme === option.value} onChange={() => setTheme(option.value)} />{option.label}
          </label>)}
        </div></fieldset>
        <a href={`${import.meta.env.BASE_URL}third-party/`} target="_blank" rel="noopener">Licenses</a>
      </dialog>
    </div>
  );
}
const root = document.getElementById("app");
if (!root) throw new Error("The audio workspace root is missing.");
render(<App />, root);
