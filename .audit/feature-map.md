# Audio Toolkit feature map (Sprints 24-26)

Recorded 2026-10-31 against `origin/main` at `4d4395a`. The main checkout is on the older
`codex/ui-redesign` branch, so all sprint work happens in worktrees cut from `origin/main`.

## Runtime shape

The app is a static Preact 11 single page built by Vite. Everything runs locally. There is no
server, no persistence of the recipe, and no upload.

- `src/main.tsx` owns the workspace: file list, recipe draft, per-file plans, preview, batch
  export, ZIP and folder delivery. It compiles a plan per file with `compilePlan` and builds
  the job list only from plans that are `copy` or `pcm`.
- `src/use-files.ts` owns intake. `src/media.ts` inspects a file with mediabunny and returns
  duration, codec, sample rate, channels, video presence and start time.
- `src/recipe.ts` owns the recipe schema (zod), defaults, step names, `snapshotForFile`,
  `resolveTrim` and recipe ordering. A trim range is shared by all files and clamped to each
  file duration. A per-file override map exists only in `main.tsx`.
- `src/recipe-editor.tsx` owns the recipe card, the ordered step cards, per-step fields and
  the Export card (`ExportEditor`). `src/trim-fields.tsx` owns the two-handle trim rail.
- `src/planner.ts` turns a per-file snapshot into `original` stream copy, a `pcm` job, or a
  failure. It also owns output naming.
- `src/process-audio.ts` starts a module worker, brokers temporary-storage writes and neural
  inference, and resolves one `StoredOutput`. `src/pcm-worker.ts` is the DSP graph.
- `src/pcm/blocks.ts` owns the streaming primitives: `gain`, `trim`, `channels`, `normalize`.
  A normalize is a two-pass checkpoint: append every block, seal, then replay with a gain.
- `src/pcm/encode.ts` builds the mediabunny output format and encoder config. MP3 and FLAC
  use wasm adapters, AAC uses native or the vendored FFmpeg adapter, Opus uses the native
  encoder, WAV is PCM.
- `src/batch.ts` owns job lifecycle, cancellation, retry, cleanup and one-at-a-time neural
  work. `src/preview.ts` owns a separate two-output excerpt lifecycle.
- `src/use-archive.ts`, `src/archive.ts`, `src/use-folder-save.ts` and `src/folder-save.ts`
  own ZIP and folder delivery.
- `src/style.css` is the single style sheet. The shell is a two-column grid (Files left,
  Recipe right, Export under Recipe), collapsing to one column at 800 px.

## Current evidence (what the app can already do)

- Intake inspects audio and video, rejects unsupported media, and supports long file names.
- Recipes are ordered and validated. Trim is shared; per-file overrides are supported.
- Export writes original stream copy, WAV, FLAC, MP3, M4A/AAC and OGG/Opus. MP3 has gapless
  metadata; Opus has tail/page handling; AAC has a reproducible vendored fallback.
- Preview renders a 15 s original and processed WAV excerpt, with cancellation and cleanup.
- Batch export is fault isolated, cancellable and cleanup-aware. ZIP and folder save work.
- Levels for gain and normalize readouts are measured on demand in a worker.
- The shell has light/dark themes, keyboard focus, 320 px support and reduced motion.

## Gaps the three sprints own

- Sprint 24: normalize is sample-peak only. There is no gated integrated loudness, no true
  peak, no ceiling, and no compressor.
- Sprint 25: no original play bar; Preview is shown with no recipe; completed exports use a
  `Listen` disclosure; "Save results" hides Clear; file rows repeat duration and trim lines;
  a standalone per-file Trim editor competes with the shared Trim step; the status and action
  groups share one right-aligned row.
- Sprint 26: every encoded format shows a raw `Bitrate (kbps)` selector and the encoder is
  always built with `bitrateMode: "constant"`. The UI does not distinguish a target bitrate
  from a quality level or a real CBR guarantee, and it does not record which backend honors
  the mode.

## Test and verification surfaces

- `npm test` runs `node --experimental-strip-types --test tests/*.test.mjs`.
- `npm run build` runs AAC and neural artifact checks, TypeScript, Vite and worker import
  checks.
- Playwright scripts drive the real app: `scripts/workspace-check.mjs`,
  `scripts/format-check.mjs`, `scripts/format-probe.mjs`, `scripts/release-check.mjs`.
- Fixtures live in `tests/fixtures/`: `tone.wav` (2 s stereo), `tone.mp3`, `video.mkv`,
  `long-video.webm`, plus generated reference signals in the scripts.
- A browser baseline is captured under `.artifacts/baseline/` in the main checkout.

## Sprint touch points

Sprint 24 (DSP plus controls): `src/recipe.ts`, `src/recipe-editor.tsx`, `src/planner.ts`,
`src/pcm-worker.ts`, `src/pcm/blocks.ts`, new `src/pcm/loudness.ts` and
`src/pcm/compressor.ts`, `src/pcm/protocol.ts`, `src/file-row.tsx`, tests.

Sprint 25 (workspace and playback): `src/main.tsx`, `src/file-row.tsx`,
`src/recipe-editor.tsx`, `src/recipe.ts`, `src/export-default.ts`, `src/style.css`,
`src/use-files.ts`, `src/batch.ts`, `src/preview.ts`, tests and browser scripts.

Sprint 26 (encoding modes): `src/recipe.ts`, `src/recipe-editor.tsx`, `src/pcm/encode.ts`,
`src/export-format.ts`, encoder adapters, `scripts/format-check.mjs`, tests.
