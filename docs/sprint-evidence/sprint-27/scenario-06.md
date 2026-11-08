# Scenario 27-06. Cancellation, GPU failure, CPU fallback and resource release

Status is partially met for the benchmark's Demucs runner. Cancellation and injected GPU failures behave correctly. A real GPU-unavailable browser exposed a silent CPU fallback that Phase 3 must guard against. This tests the probe runner (`probes/demucs-bench.ts` with `probes/demucs-bench-worker.ts`), not an app integration.

The runner terminates the worker on cancel and rejects with `AbortError`. If a WebGPU attempt fails after the model fetch (at session creation or during a run), it retries once with a new WASM worker. This mirrors `InferenceRunner`'s policy for SCNet.

Command: `BENCH_MODE=cancel BENCH_INPUTS=m60 BENCH_REPORT=.artifacts/sprint-27/bench-cancel.json node scripts/demucs-bench.mjs` (exit 0). Each case uses a fresh Chrome profile and the 60 s input. After each case the same page runs an uncancelled retry. Memory is the dedicated browser's RSS total, sampled before the run, at peak, 3 s after the outcome, and 3 s after the retry.

| Case | Outcome | Stop to rejection | Memory MiB: before / peak / 3 s later / after retry | Retry |
| --- | --- | --- | --- | --- |
| Cancel during model fetch (at 34 ms) | AbortError | 0.1 ms | 1177 / 1189 / 1204 / 1253 | completed, WebGPU, 12.1 s |
| Cancel during session creation (at 188 ms) | AbortError | 0.1 ms | 1174 / 1234 / 1245 / 1344 | completed, WebGPU, 12.8 s |
| Cancel after the first WebGPU window (at 2.8 s) | AbortError | 0.1 ms | 1174 / 2586 / 1430 / 1814 | completed, WebGPU, 11.3 s |
| Cancel after the first WASM window (at 8.5 s) | AbortError | 0.1 ms | 1173 / 2662 / 1545 / 1065 | completed, WASM, 80.5 s |
| Injected WebGPU session failure | Fell back at 175 ms, completed on WASM, 2 attempts | n/a | 1177 / 2895 / 1065 / 1018 | completed, WebGPU, 11.9 s |
| Injected WebGPU run failure | Fell back at 1.84 s, completed on WASM, 2 attempts | n/a | 1177 / 3063 / 1381 / 1679 | completed, WebGPU, 12.4 s |
| Chrome with `--disable-gpu --disable-software-rasterizer` | Completed in 82.0 s, reported as WebGPU | n/a | 1190 / 3031 / 1496 / 1379 | completed, reported as WebGPU, 81.4 s |

## Findings

- **Cancellation.** Cancelling at any stage rejects at once, because `worker.terminate()` is synchronous from the page. Within 3 s, memory falls from a 1.4 to 1.5 GiB increase to 0.26 to 0.37 GiB above the pre-run level. After the next completed run it is back near baseline (1065 MiB after the WASM case). No growth accumulated across cases. The GPU process's share cannot be seen through RSS.
- **GPU failure fallback.** An injected failure at session creation or during a run falls back to WASM and produces complete outputs. The run then takes about 81 s instead of about 13 s on 60 s of audio.
- **Silent CPU fallback.** With GPU disabled, `navigator.gpu.requestAdapter()` returned null. Yet ORT created the "webgpu" session without error and ran it at WASM speed: 82.0 s against WASM's 81 s median and WebGPU's 13 s. The provider label alone would have shown a GPU badge for CPU work. I infer that ORT placed every node on its CPU provider, from the timing and the null adapter. The dispatch count was not recorded in this mode. Phase 3 must check the adapter before choosing WebGPU, as `usableGpu()` in `src/inference/worker.ts` does, including the fallback-adapter and SwiftShader checks. Its device badge must come from verified placement or dispatch evidence, not the requested provider.
- **Not covered.** Retry after a network failure, storage-quota exhaustion, a GPU device lost mid-run, concurrent jobs, and other browsers were not tested.
