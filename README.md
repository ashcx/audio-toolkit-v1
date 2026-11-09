# Audio Toolkit

Process audio and video soundtracks entirely in your browser. Nothing is uploaded — no account, no server, no waiting on a queue. Your files stay on your machine.

**[Open the live app →](https://ashcx.github.io/audio-toolkit-v1/)**

## What it does

Load a batch of audio or video files and run them through one shared list of steps:

- **Extract** audio from a video, or keep the original audio untouched
- **Trim** with a single two-handle rail and clock-formatted start and end fields
- **Gain** and **normalize** with sliders, including loudness and true-peak targets
- **Compressor** to even out loud and quiet parts
- **Change** channel layout or sample rate
- **Voice / music splitter** keeps only the voice or only the music
- **Remove background noise** from speech
- **Preview** the real processed output before exporting
- **Export** to MP3, M4A, WAV, FLAC, Opus (.ogg), or Keep original (no re-encoding)
- **Save** results one by one, as a ZIP, or into a folder you pick

Steps run in the order you place them. Each file keeps its own trim override, playback and download.

## How to use it

1. Open **[the live app](https://ashcx.github.io/audio-toolkit-v1/)**.
2. Choose or drop your audio and video files.
3. Add steps in the order you want them to run. Drag to reorder.
4. Pick an output format.
5. Press **Export**. One export processes the current batch.
6. Download files individually, or open **Save to device** for a ZIP or a chosen folder.

Save your downloads before closing the tab. There is no session restore and no background processing.

## Supported formats

| | |
| --- | --- |
| **Input** | MP3, AAC/M4A, WAV, FLAC, Ogg Vorbis/Opus, MP4, MOV, WebM, Matroska |
| **Output** | MP3, M4A, WAV, FLAC, Opus (.ogg), Keep original (no re-encoding) |

Input support still depends on what your browser can decode. A codec may export correctly while refusing to play back natively.

## What works today

Sprints 1–26 are merged, and the app runs live at the link above.

- File intake, workspace, ordered steps and per-file trim
- Trim, gain, normalization with loudness and true peak, and compression
- Channel and sample-rate conversion
- All five export formats plus Keep original
- Batch processing with cancellation, retry and per-file fault isolation
- Preview of the actual processed output
- Individual downloads, stored ZIP and folder saving
- Voice / music splitter (HTDemucs v4 on WebGPU, slower on the CPU when there is no GPU) and Remove background noise

## What is not done yet

- **Real-device testing.** Automated checks cover Linux Chromium and Playwright WebKit only. Branded Chrome on macOS, Safari on iPhone and iPad, and Android are not verified.
- **Listening acceptance.** Isolation and loudness quality has not been signed off by ear.
- **Firefox is unsupported.**
- **Sprint 27 is implemented on its branch, not merged.** Demucs replaced SCNet. Its separation quality has not been judged by ear, and the model weights' license is unresolved.
- **Sprint 28 is implemented on its branch, not merged.** Plain wording, quiet success and short errors. Physical-device, screen-reader and listening checks are still open.
- **Sprint 29 is planned, not built:** waveform playback with per-track trimming.
- **Long files and huge batches** are measured only for specific synthetic workloads, not proven in general.

[TODO.md](TODO.md) tracks sprint-by-sprint status and every open gate.

## Run it locally

Requires Node.js 22.12 or newer (Vite rejects older releases) and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173/audio-toolkit-v1/ .

For a production build:

```sh
npm run build
npm run preview -- --port 4184
```

Open http://127.0.0.1:4184/audio-toolkit-v1/ .

### Checks

```sh
npm test              # unit tests
npm run typecheck     # TypeScript
npm run verify:static # static audit
```

Browser checks need Playwright and FFmpeg/ffprobe:

```sh
npx playwright install chromium webkit
APP_URL=http://127.0.0.1:4184/audio-toolkit-v1/ npm run verify:browser
```

The browser command runs the workspace, intake, recipe, copy, DSP, format, batch, cleanup, download, privacy, ui-states and keyboard suites in order. It stops on the first failure and writes `.artifacts/release-check/results.json`. Rebuilds need a fresh full run. Set `ENGINES=chromium` on a machine without WebKit installed. Chromium runs as the installed Chrome.

`scripts/ui-states-check.mjs` drives every interface state in Chrome (empty, files, each step, each format, Settings, success, cancel, each failure it can trigger, preview, Save menu, phone widths and dark mode) and fails if any state shows a banned term (`tests/support/banned-terms.mjs`), overflows, or hides content under the floating Export button. It also runs axe-core when it can find it. axe is not a dependency. Install it anywhere and point `AXE_PATH` at its `axe.min.js`:

```sh
npm install --prefix "$TMPDIR/audio-toolkit-axe" axe-core
AXE_PATH="$TMPDIR/audio-toolkit-axe/node_modules/axe-core/axe.min.js" node scripts/ui-states-check.mjs
```

`scripts/keyboard-check.mjs` walks the interface with the keyboard only and counts what the live regions would announce during an export of three files. Screenshots from these runs go under `.artifacts/` and are never committed.

## Privacy

Everything runs in your browser tab. No audio, filenames or results are sent anywhere. Nothing persists between sessions, and folder permission is not retained.

See [privacy notes](docs/privacy.md) for the details.

## More documentation

- [Formats and measured limits](docs/formats-and-limits.md)
- [Architecture](docs/architecture.md)
- [Privacy](docs/privacy.md)
- [Release acceptance](docs/release-acceptance.md)
- [Feature requirements](todo/audio-toolkit-plan.md)
- [Third-party licenses](THIRD_PARTY_LICENSES.md)

## License

MIT — see [LICENSE](LICENSE).
