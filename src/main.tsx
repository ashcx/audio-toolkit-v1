import { render } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import "./style.css";

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
  const [files, setFiles] = useState<File[]>([]);
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
              {files.length > 0 && <span class="count">{files.length}</span>}
            </div>
            <label class="dropzone">
              <input
                ref={picker}
                type="file"
                multiple
                accept="audio/*,video/*,.mkv,.flac,.opus,.ogg,.m4a,.aac"
                aria-label="Choose audio or video files"
                onChange={(event) => {
                  setFiles(Array.from(event.currentTarget.files ?? []));
                  event.currentTarget.value = "";
                }}
              />
              <span class="button primary">Choose files</span>
              <small>Audio and video</small>
            </label>
            {files.length > 0 && (
              <ul ref={fileList} class="file-list" aria-label="Selected files">
                {files.map((file, index) => (
                  <li key={index}>
                    <span class="file-name">
                      {file.name}
                      <small>{(file.size / 1024 / 1024).toFixed(1)} MB</small>
                    </span>
                    <button
                      class="icon-button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => {
                        pendingFocus.current = index;
                        setFiles((previous) =>
                          previous.filter((_, i) => i !== index),
                        );
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
