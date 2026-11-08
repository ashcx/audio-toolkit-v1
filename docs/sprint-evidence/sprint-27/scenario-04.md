# Scenario 27-04. Short, 3, 5 and 10 minute inputs, with limits recorded

Status is met for completion on this machine. Every length from 10 s to 10 min completed on Demucs WebGPU and shipped SCNet without a failure or a browser crash. The 5 and 10 minute rows are single runs, recorded as completion and resource evidence, not as repeatable speed figures. This file also records the Demucs overlap speed comparison that scenario 27-05 asks for. Quality at each overlap is unjudged.

## Length sweep

| Input | Candidate | Runs | Wall | RTF | Windows | Peak +MiB | Peak total MiB | Renderer peak MiB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3 min | demucs-wasm | 1 | 237.6 s | 0.76 | 31 | 1463 | 2745 | 2236 |
| 5 min | demucs-webgpu | 1 | 53.8 s | 5.58 | 52 | 958 | 2362 | 1868 |
| 5 min | scnet-main | 1 | 261.7 s | 1.15 | 56 | 3814 | 4991 | 4675 |
| 10 min | demucs-webgpu | 1 | 119.6 s | 5.02 | 103 | 2913 | 4180 | 3835 |
| 10 min | scnet-main | 1 | 790.7 s | 0.76 | 111 | 3895 | 5099 | not split |

Every output had exactly the input's frame count on both channels, with finite and non-silent samples.

The 10 min SCNet run took about 7.1 s per window, against 3.6 s at 3 min and 4.7 s at 5 min. Its first 55 windows averaged 8.4 s and the rest 5.9 s. It started right after the 10 min Demucs run, with load averages between 7 and 23. I cannot separate thermal state from background load here, so this figure is not a speed claim. Use the 3 min ratio instead.

## Limits found

- **Demucs memory grows with track length.** The vendored `separate()` keeps whole-track buffers for every stem. These are a Float64 accumulator per stem and channel (64 bytes per frame), a weight array, the normalized input, and the four Float32 output stems. The renderer peaked at 1.9 GiB for 5 min and 3.8 GiB for 10 min. A 20 min input would need roughly 7 to 8 GiB by the same slope (extrapolated). That is past a safe tab on many machines and unsafe on 8 GiB devices. Phase 3 needs a length cap, or a streaming adapter that keeps only the windows in flight. The app's SCNet path already streams through OPFS checkpoints.
- **SCNet peaks in this harness are not the app's.** The `scnet-main` stage holds whole-track arrays in the page, and per-window workers release ORT heaps lazily. That produced 4 to 5 GiB peaks. Through `processAudio` the 60 s peak was 3.5 GiB median. That is still large, and it comes from worker churn, not from the model.
- **GPU memory is not visible here.** RSS leaves out most Metal allocations, so these peaks undercount GPU-resident tensors for both engines.
- **No early stop was needed.** Every planned length completed, so no hard limit was hit on this 16 GiB Apple M5. Lower-memory devices were not tested.

## Overlap speed (Demucs WebGPU, 60 s input)

Each row has five interleaved runs plus a warmup. The only variable is the hybrid stride, set through the stride-patched `neural.js`. That patch was shown byte-identical to the vendored file at 25%.

| Overlap | Stride | Windows | Median s | Range s | Median RTF | Relative to 25% |
| --- | --- | --- | --- | --- | --- | --- |
| 10% | 309582 | 9 | 13.10 | 11.74 to 14.44 | 4.58 | −14% |
| 25% (reference default) | 257985 | 11 | 15.17 | 13.49 to 18.36 | 3.95 | 0 |
| 40% | 206388 | 13 | 18.00 | 15.71 to 19.80 | 3.33 | +19% |
| 50% | 171990 | 16 | 21.16 | 18.65 to 24.77 | 2.84 | +39% |

Wall time follows the window count (9, 11, 13, 16) on top of a fixed 1.3 s of fetch and session. Per-window inference stayed at 850 to 890 ms and transforms at 366 to 406 ms across overlaps. The 10% gain is close to this session's spread, since the 10% and 25% ranges overlap. Dropping to 10% saves at most about two windows per minute of audio, and lower overlap means fewer windows to average across each join. The listening files are under `.artifacts/sprint-27/listening/m60.demucs-webgpu.o*.wav`. Until someone listens to the joins, 25% stays the default.
