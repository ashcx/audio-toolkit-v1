# Audio Toolkit

Process audio and video soundtracks entirely in your browser. Nothing is uploaded — no account, no server, no waiting on a queue. Your files stay on your machine.

**[Open the live app →](https://ashcx.github.io/audio-toolkit-v1/)**

## What it does

Load a batch of audio or video files and run them through one shared recipe:

- **Extract** audio from a video, or keep the compressed stream untouched
- **Trim** with a single two-handle rail and clock-formatted start and end fields
- **Gain** and **normalize** with sliders, including loudness and true-peak targets
- **Reduce loud/quiet differences** with compression
- **Change** channel layout or sample rate
- **Isolate** voice from music into two stems
- **Clean up** speech with a local voice-isolation model
- **Preview** the real processed output before exporting
- **Export** to MP3, M4A (AAC), WAV, FLAC, OGG (Opus), or a direct stream copy
- **Save** results one by one, as a ZIP, or into a folder you pick

Steps run in the order you place them. Each file keeps its own trim override, playback and download.

## How to use it

1. Open **[the live app](https://ashcx.github.io/audio-toolkit-v1/)**.
2. Choose or drop your audio and video files.
3. Add recipe steps in the order you want them to run. Drag to reorder.
4. Pick an output format.
5. Press **Export**. One export processes the current batch.
6. Download files individually, or open **Save results** for a ZIP or a chosen folder.

Save your downloads before closing the tab. There is no session restore and no background processing.

## Supported formats

| | |
| --- | --- |
| **Input** | MP3, AAC/M4A, WAV, FLAC, Ogg Vorbis/Opus, MP4, MOV, WebM, Matroska |
| **Output** | MP3, M4A (AAC), WAV, FLAC, OGG (Opus), direct stream copy |

Input support still depends on what your browser can decode. A codec may export correctly while refusing to play back natively.

## What works today

Sprints 1–26 are merged, and the app runs live at the link above.

- File intake, workspace, ordered recipes and per-file trim
- Trim, gain, normalization with loudness and true peak, and compression
- Channel and sample-rate conversion
- All five export formats plus direct stream copy
- Batch processing with cancellation, retry and per-file fault isolation
- Preview of the actual processed output
- Individual downloads, stored ZIP and folder saving
- Voice/music isolation (two stems, HTDemucs v4 on WebGPU, slower CPU fallback) and speech cleanup

## What is not done yet

- **Real-device testing.** Automated checks cover Linux Chromium and Playwright WebKit only. Branded Chrome on macOS, Safari on iPhone and iPad, and Android are not verified.
- **Listening acceptance.** Isolation and loudness quality has not been signed off by ear.
- **Firefox is unsupported.**
- **Sprint 27 is implemented on its branch, not merged.** Demucs replaced SCNet. Its separation quality has not been judged by ear, and the model weights' license is unresolved.
- **Sprints 28–29 are planned, not built:** four-stem export and waveform playback with per-track trimming.
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

The browser command runs the workspace, intake, recipe, copy, DSP, format, batch, cleanup, download and privacy suites in order. It stops on the first failure and writes `.artifacts/release-check/results.json`. Rebuilds need a fresh full run.

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
