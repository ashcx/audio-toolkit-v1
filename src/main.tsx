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
import { RecipeEditor, ExportEditor, stepProblem } from "./recipe-editor";
import {
  newRecipe,
  recipeSchema,
  type RecipeDraft,
} from "./recipe";
import { exportStatus } from "./file-summary";
import { validationMessage, messageFor } from "./errors";
import { copy } from "./copy";

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
  const trimErrorId = trim ? stepProblem(trim)?.id : undefined;
  const previewCleanup = preview.state.kind === "cleanup" && preview.state.attempts >= 2 ? preview.state : null;
  const zipProblem = archive.state.kind === "failed" || (archive.state.kind === "cleanup" && archive.state.attempts >= 2) ? archive.state : null;
  const zipStuck = zipProblem?.kind === "cleanup";
  const exportText = exportStatus([...exports.jobs.values()]);
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
    if (zipStuck) {pendingResultFocus.current=false;zipCleanupButton.current?.focus();return;}
    if (locked) return;
    if (exports.cleanupCount > 0 && !exports.cleanupStuck) return;
    pendingResultFocus.current = false;
    if (exports.cleanupCount > 0) {cleanupButton.current?.focus();return;}
    const target = jobs.length ? exportButton.current
      : document.querySelector<HTMLButtonElement>(".step-toggle[aria-describedby*='error-']") ?? picker.current;
    target?.focus();
  },[locked,completed.length,jobs.length,exports.cleanupCount,exports.cleanupStuck,zipStuck]);
  const fileList = useRef<HTMLUListElement>(null);
  const pendingFocus = useRef<number | null>(null);
  const capabilities = {
    workers: typeof Worker !== "undefined",
    storage: typeof navigator.storage?.getDirectory === "function",
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
          href="https://ashcx.github.io/tools/"
          aria-label={copy.app.backToTools}
        >
          <h1>{copy.app.title}</h1>
        </a>
        <button ref={settingsButton} type="button" onClick={() => settings.current?.showModal()}>{copy.settings.open}</button>
      </header>
      <main>
        {capabilities.firefox && <p class="notice" role="status">{copy.banners.firefox}</p>}
        {!capabilities.workers && <p class="notice" role="status">{copy.banners.workers}</p>}
        {!capabilities.storage && <p class="notice" role="status">{copy.banners.storage}</p>}
        <div class="workspace">
          <section class="panel files-panel" aria-labelledby="files-title">
            <div class="panel-heading">
              <h2 id="files-title">{copy.files.heading}</h2>
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
                aria-label={copy.files.pickerLabel}
                onChange={(event) => {
                  add(Array.from(event.currentTarget.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
              <span class="button primary">{files.length ? copy.files.add : copy.files.choose}</span>
              <small>{copy.files.drop}</small>
            </label>
            {files.length > 0 && (
              <p class="sr-only" role="status">
                {files.some(
                  (entry) =>
                    entry.inspection.kind === "waiting" ||
                    entry.inspection.kind === "reading",
                )
                  ? copy.files.inspecting
                  : copy.files.inspected}
              </p>
            )}
            {files.length > 0 && (
              <ul ref={fileList} class="file-list" aria-label={copy.files.listLabel}>
                {files.map((entry, index) => (
                  <FileRow
                    key={entry.id}
                    entry={entry}
                    trim={trim?.range}
                    trimErrorId={trimErrorId}
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
                : validationMessage(parsedRecipe.error.issues)
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
            {clearing && <span>{copy.export.clearing}</span>}
            {previewCleanup && !files.some(entry => entry.id === previewCleanup.fileId) && <>
              <span>{previewCleanup.message}</span><button type="button" class="text-button" onClick={preview.clear}>{copy.actions["try-again"]}</button>
            </>}
            {folder.state.kind === "choosing" && <span>{copy.delivery.chooseFolder}</span>}
            {folder.state.kind === "saving" && <span>{copy.delivery.savingProgress(folder.state.completed, folder.state.total)}</span>}
            {(folder.state.kind === "choosing" || folder.state.kind === "saving") && <button type="button" class="text-button" onClick={folder.cancel}>{copy.delivery.cancel}</button>}
            {folder.state.kind === "cancelling" && <span>{copy.delivery.finishing}</span>}
            {folder.state.kind === "failed" && <span>{folder.state.message}</span>}
            {folder.state.kind === "result" && <div class="folder-report">
              <p>{copy.delivery.folderResult({ saved: folder.state.report.saved.length, failed: folder.state.report.failed.length, folder: folder.state.report.folder, cancelled: folder.state.report.cancelled })}</p>
              {folder.state.report.failed.filter(item => item.message !== messageFor("folder-cancelled")).map(item => <p>{item.message}</p>)}
            </div>}
            {archive.state.kind === "building" && <>
              <progress aria-label={copy.delivery.zipProgress} value={archive.state.progress.loaded} max={archive.state.progress.total || 1} />
              <span>{copy.delivery.creatingZip}</span>
              <button type="button" class="text-button" onClick={archive.cancel}>{copy.delivery.cancel}</button>
            </>}
            {(archive.state.kind === "cancelling" || archive.state.kind === "releasing") && <span>{copy.delivery.finishing}</span>}
            {zipProblem && <span>{zipProblem.message}</span>}
            {zipStuck && <button ref={zipCleanupButton} type="button" class="text-button" onClick={() => {pendingResultFocus.current=true;void archive.clear();}}>{copy.actions["try-again"]}</button>}
            {exports.cleanupStuck && <>
              <span>{messageFor("storage-stuck")}</span>
              <button ref={cleanupButton} type="button" class="text-button" disabled={locked} onClick={() => {pendingResultFocus.current=true;void exports.retryCleanup();}}>{copy.actions["try-again"]}</button>
            </>}
            {exportText && <span class="run-count">{exportText}</span>}
            {exports.busy && <button type="button" class="text-button" onClick={exports.cancelAll}>{copy.export.cancelAll}</button>}
            {!workLocked && exports.cleanupCount === 0 && [...exports.jobs.values()].some(job => job.state.kind === "failed") &&
              <button type="button" class="text-button" onClick={() => exports.retry()}>{copy.export.retryFailed}</button>}
            {exportText && <small>{copy.export.keepOpen}</small>}
          </div>
          <div class="run-actions-group">
            {files.length > 0 && <button
              type="button"
              disabled={clearing}
              title={copy.export.clearAllTooltip}
              onClick={clearAll}
            >{copy.export.clearAll}</button>}
            {completed.length > 0 && <details class="delivery-menu" onToggle={event => { if (event.currentTarget.open) event.currentTarget.scrollIntoView({ block: "nearest" }); }} onKeyDown={event=>{
              if(event.key === "Escape") {event.currentTarget.open=false;event.currentTarget.querySelector<HTMLElement>("summary")?.focus();}
            }}>
              <summary role="button" class="button">{copy.delivery.saveToDevice}</summary>
              <div class="delivery-options">
                {archive.state.kind === "ready" ? <a class="button" href={archive.state.url} download={archive.state.output.name}>{copy.delivery.downloadZip}</a>
                  : <button type="button" disabled={workLocked || exports.cleanupCount > 0} onClick={() => archive.start(completed.map(result => result.output.file))}>{copy.delivery.createZip}</button>}
                {folder.supported && <button type="button" disabled={workLocked || exports.cleanupCount > 0} onClick={event => {
                  event.currentTarget.closest("details")?.removeAttribute("open");
                  void folder.start(completed.map(result => result.output.file));
                }}>{copy.delivery.saveToFolder}</button>}
                <button type="button" disabled={locked} onClick={() => {
                  pendingResultFocus.current = true;
                  void archive.clear();
                  for (const id of exports.jobs.keys()) exports.clear(id);
                }}>{copy.delivery.discard}</button>
              </div>
            </details>}
            <button
              ref={exportButton}
              class="button primary"
              type="button"
              disabled={workLocked || exports.cleanupCount > 0 || !jobs.length}
              onClick={() => void exports.run(jobs)}
            >
              {copy.export.exportButton}
            </button>
          </div>
        </div>
          </ExportEditor>
          </div>
        </div>
      </main>
      <dialog ref={settings} class="settings-dialog" aria-labelledby="settings-title" onClose={() => settingsButton.current?.focus()}>
        <div class="panel-heading"><h2 id="settings-title">{copy.settings.heading}</h2><button type="button" onClick={() => settings.current?.close()}>{copy.settings.close}</button></div>
        <fieldset><legend>{copy.settings.theme}</legend><div class="theme-options">
          {(Object.keys(copy.settings.themes) as Theme[]).map(value => <label>
            <input class="sr-only" type="radio" name="appearance" checked={theme === value} onChange={() => setTheme(value)} />{copy.settings.themes[value]}
          </label>)}
        </div></fieldset>
        <a href={`${import.meta.env.BASE_URL}third-party/`} target="_blank" rel="noopener">{copy.settings.licenses}</a>
      </dialog>
    </div>
  );
}
const root = document.getElementById("app");
if (!root) throw new Error("The audio workspace root is missing.");
render(<App />, root);
