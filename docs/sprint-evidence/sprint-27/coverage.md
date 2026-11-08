# Sprint 27 coverage

Status is implemented on `codex/sprint-27-demucs`, not merged. HTDemucs v4 is now the only isolation engine; SCNet was removed by the user's later instruction. Separation quality is unjudged: no one has listened to the outputs. The weights' license is unresolved (metadata says `unlicensed`) and the model is bundled by the user's decision.

Measured on one Apple M5 (16 GiB) in Chrome 156 through Playwright, headless. No other device or browser was tested.

## Scenarios

| Scenario | Status | Evidence |
| --- | --- | --- |
| 27-01 Model bytes, preprocessing and outputs against a reference | Met for the vendored adapter (Phase 1) and for the shipped streaming pipeline (Phase 3). The ORT-Web gap on near-silent windows stays open. | [scenario-01.md](scenario-01.md), [browser-check.json](browser-check.json), [pipeline-check.json](pipeline-check.json) |
| 27-02 SCNet, SCNet reuse, initial and optimized Demucs on the same device | Met for speed, not for quality. OBRA Fast not run. | [scenario-02.md](scenario-02.md), [results.json](results.json) |
| 27-03 Five interleaved warm trials, cold setup separate | Met | [scenario-03.md](scenario-03.md), [protocol.md](protocol.md) |
| 27-04 Short, 3, 5 and 10 minute inputs, limits recorded | Met. Phase 3 adds a 10 min app export with bounded memory. | [scenario-04.md](scenario-04.md), [app-check.json](app-check.json) |
| 27-05 Lower-overlap joins and the user's distracting passages, by ear | **OPEN.** Listening files exist under `.artifacts/sprint-27/listening/` and `.artifacts/sprint-27/app-check/`; nobody has listened. 25% overlap stays the default. | none yet |
| 27-06 Cancellation, GPU failure, CPU fallback, retry, bounded memory, release | Met in the app on this machine: cancel, truncated model download with retry, CPU-only browser. GPU failure fallback and the silent-CPU label are unit-tested only. | [scenario-06.md](scenario-06.md), [app-check.json](app-check.json), `tests/inference-runner.test.mjs` |

## Phase 3 requirements

| Requirement | Result | Evidence |
| --- | --- | --- |
| Model hosted same-origin, size and SHA-256 checked at build and before use | `public/vendor/neural/htdemucs_fp16.onnx`, pinned in `vendor/neural/provenance.json`, checked by `scripts/verify-neural.mjs` and `src/inference/worker.ts`. A truncated download is refused and retry recovers. | commit `fdd2606`; app-check.json |
| Bounded memory | Streaming windows reproduce the reference, so no length cap. Sampled browser RSS rose 717 MiB for a 2 min export and 992 to 1014 MiB for 10 min across two runs (Phase 2's whole-track path: 2913 MiB at 10 min). The difference between 2 and 10 min is in line with the 106 MB source and output WAV files, not the model buffers. | [decisions.tsv](decisions.tsv) row 10; app-check.json `long` |
| 25% overlap, segment 343980 | `DEMUCS_STRIDE = floor(0.75 * 343980)`; window geometry unit-tested against whole-track apply_model | `tests/demucs-window.test.mjs` |
| One session per job | `isolationLoads` is 1 for every export, 103 windows on 10 min | app-check.json |
| Four stems at the worker boundary | Worker and runner return drums, bass, other and vocals; accompaniment is summed in `demucsWindows` | `src/inference/protocol.ts`; runner test |
| Adapter check and evidence-based device label | Missing, fallback or SwiftShader adapters select WASM. The GPU label needs GPU dispatches; a WebGPU session without dispatches is labelled and recorded as CPU. | `src/inference/gpu.ts`; runner test; app-gpu-running.png, app-cpu-done.png |
| CPU path and user warning | Without WebGPU the editor states CPU is slower than real time and that first use downloads 85 MB; export completes labelled CPU | app-cpu-editor.png, app-cpu-done.png |
| Preview and export use the same path | Preview isolates on the GPU through the same worker | app-gpu-preview.png |
| Recipe compatibility | Isolation steps with or without an `engine` key parse; the key is dropped | `tests/recipe.test.mjs` |
| Results report how separation ran | "Separated with Demucs on the GPU / CPU" | app-gpu-done.png, app-cpu-done.png |
| No third-party requests | Only same-origin, blob and data URLs observed during the GPU journey | app-check.json |
| SCNet removed | Code, model, pins, license files and SCNet-only drivers removed; the vendored `neural.js` bundle, its type file and the upstream NOTICE still name SCNet | commits `ca58b5f`, `0d1daea` |

## Commands

Run from the worktree root on the final revision.

| Command | Exit |
| --- | --- |
| `npm test` (124 tests) | 0 |
| `npx tsc --noEmit` | 0 |
| `npm run build` | 0 |
| `npm run verify:static` | 0 |
| `DEMUCS_PIPELINE=app node scripts/demucs-check.mjs` (WASM and WebGPU) | 0 |
| `ISOLATION_LONG_SECONDS=600 node scripts/isolation-check.mjs` | 0 |

## Open

- Listening (27-05) on vocals and accompaniment, joins, reverb tails, cymbals, bass and transients.
- Other devices and browsers, including integrated GPUs, Safari and low-memory machines.
- Independent review.
- Weight license.
- An interaction recording; only screenshots were saved.
