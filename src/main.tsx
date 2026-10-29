import { render } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import "./style.css";
import { useFiles } from "./use-files";
import { formatBytes, describeAudio } from "./format";

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
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const [format, setFormat] = useState("mp3");
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
    const buttons = fileList.current?.querySelectorAll("button");
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
                  <li
                    key={entry.id}
                    data-file-id={entry.id}
                    data-inspection={entry.inspection.kind}
                  >
                    <span class="file-name">
                      {entry.file.name}
                      <small>
                        {formatBytes(entry.file.size)}
                        {entry.inspection.kind === "ready"
                          ? ` · ${describeAudio(entry.inspection.metadata)}`
                          : entry.inspection.kind === "failed"
                            ? ""
                            : ` · ${entry.inspection.kind === "reading" ? "Reading…" : "Waiting"}`}
                      </small>
                      {entry.inspection.kind === "failed" && (
                        <small class="file-error" role="status">
                          {entry.inspection.message}
                        </small>
                      )}
                    </span>
                    <button
                      class="icon-button"
                      aria-label={`Remove ${entry.file.name}`}
                      onClick={() => {
                        pendingFocus.current = index;
                        remove(entry.id);
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section class="panel recipe-panel" aria-labelledby="recipe-title">
            <div class="panel-heading">
              <h2 id="recipe-title">Recipe</h2>
            </div>
            <p class="panel-description">Applied to all files.</p>
            <div class="export-card">
              <h3>Export</h3>
              <label class="field">
                Format
                <select
                  value={format}
                  onChange={(event) => setFormat(event.currentTarget.value)}
                >
                  <option value="mp3">MP3</option>
                  <option value="m4a">M4A · AAC</option>
                  <option value="wav">WAV</option>
                  <option value="flac">FLAC</option>
                  <option value="opus">OGG · Opus</option>
                  <option value="original">Original audio</option>
                </select>
              </label>
            </div>
          </section>
        </div>
      </main>
      <footer>
        <span>Files stay on your device. Tools download when needed.</span>
        <a href="https://ashcx.github.io/image-compressor-v1/">Image Toolkit</a>
      </footer>
    </div>
  );
}
const root = document.getElementById("app");
if (!root) throw new Error("The audio workspace root is missing.");
render(<App />, root);
