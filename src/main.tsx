import { render } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import "./style.css";
import { useFiles } from "./use-files";
import { formatBytes } from "./format";
import { FileRow } from "./file-row";
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
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const [draft, setDraft] = useState<RecipeDraft>(newRecipe);
  const [overrides, setOverrides] = useState(new Map<FileId, TrimRangeDraft>());
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
        (plan.kind === "pcm" &&
          !plan.steps.some((step) => step.kind === "isolation")))
      ? [{ entry, plan }]
      : [];
  });
  const trim = draft.steps.find((step) => step.kind === "trim");
  const changeRecipe = (next: RecipeDraft) => {
    if (exports.busy) return false;
    if (trim && !next.steps.some((step) => step.kind === "trim")) {
      if (overrides.size > 0 && !confirm("Remove trim and individual ranges?"))
        return false;
      setOverrides(new Map());
    }
    setDraft(next);
    return true;
  };
  const picker = useRef<HTMLInputElement>(null);
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
        <select
          aria-label="Appearance"
          value={theme}
          onChange={(event) => {
            const value = event.currentTarget.value;
            if (value === "system" || value === "light" || value === "dark")
              setTheme(value);
          }}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
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
                <span class="count">
                  {files.length} ·{" "}
                  {formatBytes(
                    files.reduce((total, entry) => total + entry.file.size, 0),
                  )}
                </span>
              )}
            </div>
            <label
              class={`dropzone${dragging ? " dropzone-active" : ""}`}
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
                add(Array.from(event.dataTransfer?.files ?? []));
              }}
            >
              <input
                ref={picker}
                type="file"
                multiple
                accept="audio/*,video/*,.mkv,.flac,.opus,.ogg,.m4a,.aac"
                aria-label="Choose audio or video files"
                onChange={(event) => {
                  add(Array.from(event.currentTarget.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
              <span class="button primary">Choose files</span>
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
                    busy={exports.busy || exports.cleanupCount > 0}
                    onCancel={() => exports.cancel(entry.id)}
                    onRetry={() => exports.retry(entry.id)}
                    override={overrides.get(entry.id)}
                    onOverride={(range) =>
                      setOverrides((previous) =>
                        new Map(previous).set(entry.id, range),
                      )
                    }
                    onReset={() =>
                      setOverrides((previous) => {
                        const next = new Map(previous);
                        next.delete(entry.id);
                        return next;
                      })
                    }
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
          <fieldset class="recipe-lock" disabled={exports.busy}>
          <RecipeEditor
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
          <button
            class="button primary"
            type="button"
            disabled={exports.busy || exports.cleanupCount > 0 || !jobs.length}
            onClick={() => void exports.run(jobs)}
          >
            Export
          </button>
          {exports.busy && <button type="button" onClick={exports.cancelAll}>Cancel all</button>}
          {!exports.busy && exports.cleanupCount === 0 && [...exports.jobs.values()].some(job => job.state.kind === "failed") &&
            <button type="button" onClick={() => exports.retry()}>Retry failed</button>}
          {exports.cleanupCount > 0 && <>
            <span role="status">Temporary files need cleanup.</span>
            <button type="button" disabled={exports.busy} onClick={() => void exports.retryCleanup()}>Retry cleanup</button>
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
      <footer>
        <span>Files stay on your device. Tools download when needed.</span>
        <a href={`${import.meta.env.BASE_URL}third-party/`}>Licenses</a>
        <a href="https://ashcx.github.io/image-compressor-v1/">Image Toolkit</a>
      </footer>
    </div>
  );
}
const root = document.getElementById("app");
if (!root) throw new Error("The audio workspace root is missing.");
render(<App />, root);
