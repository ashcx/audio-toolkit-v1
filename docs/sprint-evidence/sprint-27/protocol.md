# Sprint 27 benchmark protocol

This covers the Phase 2 speed measurements behind scenarios 27-02, 27-03, 27-04 and 27-06, plus overlap speed for 27-05. The question is whether browser Demucs v4 separates faster than the SCNet isolation the app ships today, on the same machine, browser and inputs.

## Revision, machine and browser

| Item | Value |
| --- | --- |
| Harness | Committed as `0b5ae16` on `codex/sprint-27-demucs`, on top of `138c6a7`. The 10 s and 60 s warm run used an earlier build of the same harness from before the Demucs worker body moved into `probes/demucs-bench-core.ts`; the timed code is the same. Every later run used the `0b5ae16` build. The only later change is the driver's `BENCH_WARMUP` flag. App sources under `src/` are unchanged from `138c6a7`. |
| Machine | Apple M5, 10 logical cores, 16 GiB unified memory, macOS (Darwin 27.0.0) |
| Browser | Installed Google Chrome 156.0.8078.81, driven by Playwright 1.64.1 (`channel: 'chrome'`, headless, `--enable-unsafe-webgpu`) |
| WebGPU adapter | `apple` / `metal-3`, not a fallback adapter, `timestamp-query` available |
| Runtime | Vendored onnxruntime-web 1.31.1 and @audio/neural-separate 0.7.0, single-thread WASM (`threads: 1`), CPU arena and memory patterns off, as the app's SCNet worker sets them |
| Models | `scnet.int8.onnx` (13184191 bytes, app copy) and `htdemucs_fp16.onnx` (85034606 bytes, SHA-256 `742a4f85…6effd775`, see [provenance.md](provenance.md)) |

## Inputs

The inputs are lawful recordings already pinned in Sprint 16: `live.ogg` (19.04 s, public domain, choir and organ) and `instrumental.ogg` (92.16 s, CC BY 3.0, Kevin MacLeod). The prepare script checks both against `docs/sprint-evidence/sprint-16/fixtures.json` and decodes them to 44.1 kHz stereo float32. Longer inputs repeat live then instrumental and cut at the target length. Repetition does not change speed, because every candidate processes fixed-size windows whose cost does not depend on content. These are not the user's recordings and have no clean reference stems.

| Input | Length | Content |
| --- | --- | --- |
| excerpt10 | 10 s | live 0 to 10 s |
| m60 | 60 s | instrumental 0 to 60 s |
| m180 | 180 s | live, instrumental, repeated |
| m300 | 300 s | same pattern |
| m600 | 600 s | same pattern |

## Candidates

All candidates start from the same decoded planes in the page and end with vocals and accompaniment planes of exactly the input length. The timed region starts at the call and ends when both outputs are in the page. Input fetch, output validation and hashing are outside it.

| Candidate | What runs |
| --- | --- |
| `scnet-app` | The shipped `processAudio` path from a 16-bit WAV file. It decodes, writes checkpoints to OPFS, isolates and encodes a music WAV. This is the user-facing end-to-end time. |
| `scnet-main` | The shipped separation stage. It standardizes like `isolate()`, then runs `isolationWindows` (11 s windows, 50% overlap) with `InferenceRunner(1)`, so each window gets a new `src/inference/worker.ts` worker, model fetch, hash check and session. It ends with restore and music = mix − voice. |
| `scnet-reuse2` | The same stage with `InferenceRunner(2)`, the Sprint 21 two-window session reuse. |
| `demucs-webgpu` | `probes/demucs-bench-worker.ts` gets a new worker per run. It fetches and hash-checks the model, creates one ORT session (`['webgpu','wasm']`), and runs the vendored `separate()` htdemucs path through `demucsHybridSession`. Accompaniment is drums + bass + other. |
| `demucs-wasm` | The same with `['wasm']`, single thread. |

SCNet's backend is the app's own choice. Its worker picks `webgpu+wasm` when a non-fallback adapter exists, which is true here, so every SCNet number here ran on WebGPU.

Demucs computes all four stems whichever outputs are wanted. Its wall time is therefore both the four-stem time and the vocals-and-accompaniment delivery time; the accompaniment sum costs 6 to 20 ms. SCNet computes vocals only.

## Commands

All commands run from the worktree root. `ffmpeg` is the arm64 Homebrew build.

| Step | Command | Exit |
| --- | --- | --- |
| Prepare frozen build and inputs | `FFMPEG=/opt/homebrew/bin/ffmpeg BENCH_MUSIC_DIR=<main checkout>/.artifacts/music16 node scripts/demucs-bench-prepare.mjs` | 0 |
| Stride patch identity | `BENCH_MODE=identity BENCH_INPUTS=excerpt10 BENCH_CANDIDATES=demucs-webgpu,demucs-wasm node scripts/demucs-bench.mjs` | 0 |
| Warm, 10 s and 60 s | `BENCH_MODE=warm BENCH_ROUNDS=5 BENCH_INPUTS=excerpt10,m60 BENCH_CANDIDATES=scnet-app,scnet-main,scnet-reuse2,demucs-webgpu,demucs-wasm BENCH_SAVE_OUTPUTS=.artifacts/sprint-27/listening BENCH_REPORT=.artifacts/sprint-27/bench-warm-short.json node scripts/demucs-bench.mjs` | 1 (two harness failures, see scenario-03) |
| Warm, 3 min | `BENCH_MODE=warm BENCH_ROUNDS=5 BENCH_INPUTS=m180 BENCH_CANDIDATES=scnet-main,scnet-reuse2,demucs-webgpu BENCH_REPORT=.artifacts/sprint-27/bench-warm-m180.json node scripts/demucs-bench.mjs` | 0 |
| Overlap speed | `BENCH_MODE=overlap BENCH_ROUNDS=5 BENCH_INPUTS=m60 BENCH_CANDIDATES=demucs-webgpu BENCH_SAVE_OUTPUTS=.artifacts/sprint-27/listening BENCH_REPORT=.artifacts/sprint-27/bench-overlap.json node scripts/demucs-bench.mjs` | 0 |
| Cancellation and fallback | `BENCH_MODE=cancel BENCH_INPUTS=m60 BENCH_REPORT=.artifacts/sprint-27/bench-cancel.json node scripts/demucs-bench.mjs` | 0 |
| Cold start | `BENCH_MODE=cold BENCH_INPUTS=excerpt10 BENCH_CANDIDATES=scnet-main,demucs-webgpu,demucs-wasm BENCH_REPORT=.artifacts/sprint-27/bench-cold.json node scripts/demucs-bench.mjs` | 0 |
| Long inputs | `BENCH_MODE=warm BENCH_WARMUP=0 BENCH_ROUNDS=1 BENCH_INPUTS=m300,m600 BENCH_CANDIDATES=demucs-webgpu,scnet-main BENCH_RUN_LIMIT_MS=1200000 BENCH_REPORT=.artifacts/sprint-27/bench-limits.json node scripts/demucs-bench.mjs` | 0 |
| WASM fallback at 3 min | `BENCH_MODE=warm BENCH_WARMUP=0 BENCH_ROUNDS=1 BENCH_INPUTS=m180 BENCH_CANDIDATES=demucs-wasm BENCH_REPORT=.artifacts/sprint-27/bench-limit-wasm-m180.json node scripts/demucs-bench.mjs` | 0 |
| Types | `npx tsc --noEmit` | 0 |
| Unit tests | `npm test` (127 pass) | 0 |
| Profiles (not reported as timings) | `BENCH_MODE=profile BENCH_INPUTS=m60 BENCH_CANDIDATES=<demucs-webgpu\|demucs-wasm\|scnet-webgpu\|scnet-wasm> BENCH_REPORT=.artifacts/sprint-27/profile-<candidate>.json node scripts/demucs-bench.mjs` | 0 |
| Provider placement | Same profile mode on `excerpt10`, then `node scripts/demucs-placement.mjs .artifacts/sprint-27/profile/<model>-webgpu-excerpt10.placement.txt` | 0 |
| Summary | `node scripts/demucs-bench-summary.mjs docs/sprint-evidence/sprint-27/results.json .artifacts/sprint-27/bench-warm-short.json .artifacts/sprint-27/bench-warm-m180.json .artifacts/sprint-27/bench-overlap.json .artifacts/sprint-27/bench-limit-wasm-m180.json .artifacts/sprint-27/bench-limits.json` | 0 |

Raw reports, logs, CPU profiles and listening WAVs stay under the gitignored `.artifacts/sprint-27/`. The committed summary is [results.json](results.json).

## Run discipline

- **Interleaving.** One warmup round runs each candidate once and is not counted. Rounds 1 to 5 then alternate candidate order forward and backward.
- **Page per run.** Each run gets a new page in one dedicated Chrome profile, so workers and GPU devices from the previous run are gone. The HTTP cache stays warm.
- **Serving.** The local static server sends `Cache-Control: max-age=600`, which mirrors GitHub Pages. "Warm" therefore means model bytes come from Chrome's HTTP cache, while each run still pays for fetch, hash and session creation.
- **Cold runs.** Each cold run uses a fresh profile with an empty cache. The model comes from the local server, so this is a cold cache, not a cold network.
- **Validation.** Every run checks that both outputs have two channels, exactly the input's frame count, finite samples and nonzero energy. Window counts come from the runner (SCNet) or from counting session calls (Demucs). Loads count new workers (SCNet) or sessions created (Demucs). `scnet-app` checks the output WAV byte size only.
- **Memory.** The driver samples the RSS of every process descended from the dedicated Chrome every 250 ms. It reports peak minus the pre-run sample. That is owned by the benchmark browser, but RSS on Apple unified memory does not cover all GPU allocations, so treat these as lower bounds.
- **Background load.** The machine was shared with other agent sessions. The 1-minute load average is recorded per run and reached 34 during some SCNet runs. Interleaving spreads that noise across candidates, but it widens SCNet's ranges.
