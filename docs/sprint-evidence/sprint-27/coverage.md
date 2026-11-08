# Sprint 27 coverage

Status is implemented on `codex/sprint-27-demucs`, not merged. HTDemucs v4 is now the only isolation engine; SCNet was removed by the user's later instruction. Separation quality is unjudged: no one has listened to the outputs. The weights' license is unresolved (metadata says `unlicensed`) and the model is bundled by the user's decision.

Measured on one Apple M5 (16 GiB) in Chrome 156 through Playwright, headless. No other device or browser was tested.

## Scenarios

| Scenario | Status | Evidence |
| --- | --- | --- |
| 27-01 Model bytes, preprocessing and outputs against a reference | Met for the vendored adapter at `196122b` (Phase 1; raw output removed, conclusions in the scenario) and for the shipped streaming pipeline (Phase 3). The ORT-Web gap on near-silent windows stays open. | [scenario-01.md](scenario-01.md), [pipeline-check.json](pipeline-check.json) |
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
| Recipe compatibility | The isolation step takes only `keep`; an unknown key is rejected like on every other step. No `engine` key ever shipped (`git log --all -S"engine" -- src/recipe.ts` matches only this branch's `86b6c67`), so nothing needs migrating. | `tests/recipe.test.mjs` |
| Results report how separation ran | "Separated with Demucs on the GPU / CPU" | app-gpu-done.png, app-cpu-done.png |
| No third-party requests | Only same-origin, blob and data URLs observed during the GPU journey | app-check.json |
| SCNet removed | Code, model, pins, license files and SCNet-only drivers removed; the vendored `neural.js` bundle, its type file and the upstream NOTICE still name SCNet | commits `ca58b5f`, `0d1daea` |

## Commands

Run from the worktree root. The first six rows were rerun on the review-fix head (after `66a47ab`, with the pipeline check's expected stems adjusted for the single-mean DC rule); output went to the ignored `.artifacts/final/`.

| Command | Exit |
| --- | --- |
| `npm test` (130 tests) | 0 |
| `npx tsc --noEmit` | 0 |
| `npm run build` | 0 |
| `npm run verify:static` | 0 |
| `node scripts/demucs-check.mjs` (WASM and WebGPU, numpy reference) | 0 |
| `node scripts/isolation-check.mjs` (real Chrome, GPU and CPU journeys) | 0 |
| `ISOLATION_LONG_SECONDS=600 node scripts/isolation-check.mjs` | 0 at `8ba5361`, not repeated on the review-fix head |

## Independent review

Two independent reviews of the branch, run by agents that did not write it, covered `8ba5361` (per the hand-off; their transcripts are not in the repo). Neither found a high or medium defect. Each finding and its disposition:

| Finding | Disposition |
| --- | --- |
| Investigation and benchmark tooling and eight raw JSON dumps shipped with the PR | Fixed in `87d2336` |
| Model size, hash, segment and stride copied into several files, and a hardcoded ffmpeg path in the driver | Fixed in `14aff67` and `9d1cc64`: one `src/inference/demucs-model.ts`, with `fetchModelBytes` unit-tested for overflow, truncation, hash mismatch, progress and success; the driver reads `FFMPEG` and `FFPROBE` |
| Isolation step tolerated an `engine` key that never shipped | Fixed in `82ee5e8` |
| Keep music carried three times the source's DC offset (mean added once per summed stem) | Fixed in `4cdd087`: music adds the mean once, voice adds none; a nonzero-DC test fails on the old code |
| Unused `attempts` field, `Stems` and `DemucsStems` duplicates, two `done` reply shapes, `protocol.ts` importing `Recipe`, `WindowStats` out-parameter, inline watchdog limits | Fixed in `e04291c`. The window count and largest window are now counted in `isolate.ts` from its own infer callback, so `isolationWindows` and `maxIsolationFrames` are still observed values |
| Leftover "The faster engine returned..." error text | Not applicable at this head: no such string remains; model errors already read "The isolation model returned..." |
| `docs/architecture.md` said "about 1.4 s" of history | Fixed in `66a47ab`: 601,965 frames per channel (13.65 s Float32) plus Float64 accumulators of 343,980 frames |
| `docs/formats-and-limits.md` did not say Keep music is band-limited at the model rate | Fixed in `66a47ab` |
| "The browser keeps the model" in the editor and `docs/privacy.md` overstated cache behavior | Fixed in `66a47ab`: the browser may reuse its cached copy, no cache headers are set, and every job re-verifies the hash |
| `*.onnx` not marked binary | Fixed in `4abe816` |
| `demucsWindows` takes one source list, so several stems cannot stream out; mono is averaged inside the worker | Deferred to Sprint 28 on purpose |
| Chrome driver covers Chromium on macOS only | Deferred; WebKit and non-macOS stay open under "Other devices and browsers" |
| Vendored `vendor/neural/neural.js` still contains a SCNet preset | Deferred: verbatim hash-pinned upstream; rebuilding it from the runtime package alone was not requested |

## Open

- Listening (27-05) on vocals and accompaniment, joins, reverb tails, cymbals, bass and transients.
- Other devices and browsers, including integrated GPUs, Safari and low-memory machines.
- Independent review of the final head. The two reviews below covered `8ba5361`; the fixes were not re-reviewed.
- Weight license.
- An interaction recording; only screenshots were saved.

## Final re-review of the fix round

A third independent review of `8ba5361..HEAD` found no high or medium defects. Applied: `pipeline-check.json` refreshed from a run at the final head, and `fetchModelBytes` now cancels the response body when a download is refused (with a test). Known gap, not fixed: the synthetic fixtures have a mix mean near 1e-4, so the numpy pipeline check cannot confirm the single-mean DC rule on its long and segment fixtures. That rule is covered end to end only by the unit test `voice plus music carries the input DC offset exactly once`. A fixture with a clear DC offset, or a `voice + music` check in `scripts/isolation-check.mjs`, is the follow-up.
