import { render } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import "./style.css";
import { useFiles } from "./use-files";
import { FileRow } from "./file-row";
import { useFolderSave } from "./use-folder-save";
import { useArchive } from "./use-archive";
import { useExport } from "./use-export";
import { compilePlan } from "./planner";
import { snapshotForFile } from "./recipe";
import { RecipeEditor } from "./recipe-editor";
import {
  newRecipe,
  recipeSchema,
  type RecipeDraft,
  type TrimRangeDraft,
} from "./recipe";
import type { FileId } from "./media";

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
  const { entries: files, add, remove } = useFiles();
  const exports = useExport(files);
  const completed = [...exports.jobs.values()].flatMap(job => job.state.kind === "done" ? [job.state] : []);
  const archive = useArchive(completed.map(result => result.url).join("|"));
  const folder = useFolderSave(completed.map(result => result.url).join("|"));
  const locked = exports.busy || archive.busy || folder.busy;
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
  const [draft, setDraft] = useState<RecipeDraft>(newRecipe);
  const [overrides, setOverrides] = useState(new Map<FileId, TrimRangeDraft>());
  const settings = useRef<HTMLDialogElement>(null);
  const exportButton = useRef<HTMLButtonElement>(null);
  const pendingResultFocus = useRef(false);
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
        overrides.get(entry.id),
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
  const changeRecipe = (next: RecipeDraft) => {
    if (locked) return false;
    if (trim && !next.steps.some((step) => step.kind === "trim")) {
      if ((overrides.size > 0 || trim.range.start !== null || trim.range.end !== null) && !confirm("Remove trim and individual ranges?"))
        return false;
      setOverrides(new Map());
    }

    setDraft(next);
    return true;
  };
  useLayoutEffect(() => {
    if (!completed.length && !exports.busy && !archive.busy && !folder.busy) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault();event.returnValue = ""; };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [completed.length, exports.busy, archive.busy, folder.busy]);
  const picker = useRef<HTMLInputElement>(null);
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
                    busy={locked || exports.cleanupCount > 0}
                    downloadBusy={archive.busy || folder.busy}
                    onCancel={() => exports.cancel(entry.id)}
                    onRetry={() => exports.retry(entry.id)}
                    override={overrides.get(entry.id)}
                    onOverride={(range) => {

                      setOverrides((previous) =>
                        new Map(previous).set(entry.id, range),
                      );
                    }}
                    onReset={() => {

                      setOverrides((previous) => {
                        const next = new Map(previous);
                        next.delete(entry.id);
                        return next;
                      });
                    }}
                    onRemove={() => {
                      pendingFocus.current = index;
                      exports.clear(entry.id);
                      remove(entry.id);
                      setOverrides((previous) => {
                        const next = new Map(previous);
                        next.delete(entry.id);
                        return next;
                      });
                    }}
                  />
                ))}
              </ul>
            )}
          </section>
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
        </div>
        <div class="run-actions">
          {completed.length > 0 && <details class="delivery-menu" onKeyDown={event=>{
            if(event.key === "Escape") {event.currentTarget.open=false;event.currentTarget.querySelector<HTMLElement>("summary")?.focus();}
          }}>
            <summary role="button" class="button">Save results</summary>
            <div class="delivery-options">
              {archive.state.kind === "ready" ? <a class="button" href={archive.state.url} download={archive.state.output.name}>Download ZIP</a>
                : <button type="button" disabled={locked || exports.cleanupCount > 0} onClick={() => archive.start(completed.map(result => result.output.file))}>Create ZIP</button>}
              {folder.supported && <button type="button" disabled={locked || exports.cleanupCount > 0} onClick={event => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                void folder.start(completed.map(result => result.output.file));
              }}>Save to folder</button>}
              <button type="button" disabled={locked} onClick={() => {
                pendingResultFocus.current = true;
                void archive.clear(); for (const id of exports.jobs.keys()) exports.clear(id);
              }}>Clear results</button>
            </div>
          </details>}
          {folder.state.kind === "choosing" && <span role="status">Choose a folder for a new batch folder.</span>}
          {folder.state.kind === "saving" && <span role="status">Saving {folder.state.completed} / {folder.state.total}</span>}
          {(folder.state.kind === "choosing" || folder.state.kind === "saving") && <button type="button" onClick={folder.cancel}>Cancel folder save</button>}
          {folder.state.kind === "cancelling" && <span role="status">Cancelling folder save…</span>}
          {folder.state.kind === "failed" && <span role="status">{folder.state.message}</span>}
          {folder.state.kind === "result" && <div class="folder-report" role="status">
            <p>{folder.state.report.cancelled ? "Cancelled. " : ""}{folder.state.report.saved.length} saved to {folder.state.report.folder}. {folder.state.report.failed.length} failed, {folder.state.report.remaining} not saved.</p>
            {folder.state.report.failed.map(item => <p>{item.name}: {item.message}</p>)}
          </div>}
          {archive.state.kind === "building" && <><progress aria-label="ZIP progress" value={archive.state.progress.loaded} max={archive.state.progress.total || 1} /><button type="button" onClick={archive.cancel}>Cancel ZIP</button></>}
          {(archive.state.kind === "cancelling" || archive.state.kind === "releasing") && <span role="status">Cleaning up ZIP…</span>}
          {(archive.state.kind === "failed" || archive.state.kind === "cleanup") && <span role="status">{archive.state.message}</span>}
          {archive.state.kind === "cleanup" && <button ref={zipCleanupButton} type="button" onClick={() => {pendingResultFocus.current=true;void archive.clear();}}>Retry ZIP cleanup</button>}
          <button
            ref={exportButton}
            class="button primary"
            type="button"
            disabled={locked || exports.cleanupCount > 0 || !jobs.length}
            onClick={() => void exports.run(jobs)}
          >
            Export
          </button>
          {exports.busy && <button type="button" onClick={exports.cancelAll}>Cancel all</button>}
          {!locked && exports.cleanupCount === 0 && [...exports.jobs.values()].some(job => job.state.kind === "failed") &&
            <button type="button" onClick={() => exports.retry()}>Retry failed</button>}
          {exports.cleanupCount > 0 && <>
            <span role="status">Temporary files need cleanup.</span>
            <button ref={cleanupButton} type="button" disabled={locked} onClick={() => {pendingResultFocus.current=true;void exports.retryCleanup();}}>Retry cleanup</button>
          </>}
          {exports.jobs.size > 0 && <span role="status">{[
            ["done", "done"], ["running", "active"], ["waiting", "waiting"],
            ["cancelling", "cancelling"], ["failed", "failed"], ["cancelled", "cancelled"],
          ].flatMap(([kind, label]) => {
            const count = [...exports.jobs.values()].filter(job => job.state.kind === kind).length;
            return count ? [`${count} ${label}`] : [];
          }).join(" · ")}</span>}
          {exports.busy && <small>{exports.cleaning ? "Cleaning up…" : "Keep this page open. Cancellation waits for cleanup."}</small>}
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
