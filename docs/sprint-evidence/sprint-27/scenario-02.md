# Scenario 27-02. Compare current SCNet, SCNet reuse and Demucs on the same device and inputs

Status is met for speed and not met for quality. Demucs on WebGPU separates 3.7 to 4.9 times faster than the SCNet path the app ships, on inputs of 60 s or longer. On a 10 s excerpt the gain is 12%, because fixed setup dominates there. Demucs on single-thread WASM, the CPU fallback, is slower than shipped SCNet. No listening comparison has been made. "Optimized Demucs" was tested only for overlap (scenario-04). No other optimization was benchmarked, for the reasons under Limiters below.

Method, revision, browser and commands are in [protocol.md](protocol.md). The summary rows are in [results.json](results.json).

## Headline

Medians of five interleaved warm runs, except where the run count says otherwise. The 10 s and 60 s rows come from one interleaved session (`bench-warm-short.json`), and the 3 min row from another (`bench-warm-m180.json`). RTF is seconds of audio separated per wall-clock second, so higher is faster.

| Input | SCNet app, end to end | SCNet shipped stage | SCNet two-window reuse | Demucs WebGPU | Demucs WASM, 1 thread |
| --- | --- | --- | --- | --- | --- |
| 10 s | 3.78 s, RTF 2.65 (4 runs) | 3.50 s, RTF 2.86 | 3.57 s, RTF 2.80 | **3.07 s, RTF 3.26** | 15.37 s, RTF 0.65 |
| 60 s | 56.08 s, RTF 1.07 (4 runs) | 53.66 s, RTF 1.12 | 47.66 s, RTF 1.26 | **13.28 s, RTF 4.52** | 81.35 s, RTF 0.74 |
| 3 min | not run | 130.63 s, RTF 1.38 | 134.51 s, RTF 1.34 | **35.60 s, RTF 5.06** | 237.6 s, RTF 0.76 (1 run) |
| 5 min | not run | 261.7 s, RTF 1.15 (1 run) | not run | **53.8 s, RTF 5.58 (1 run)** | not run |
| 10 min | not run | 790.7 s, RTF 0.76 (1 run, see scenario-04) | not run | **119.6 s, RTF 5.02 (1 run)** | not run |

Ranges are in scenario-03. On 60 s and 3 min inputs the slowest Demucs WebGPU run (13.61 s, 39.39 s) beats the fastest SCNet run (43.06 s, 119.22 s) by roughly 3x. The difference is far larger than run-to-run spread.

| Input | Shipped SCNet stage ÷ Demucs WebGPU | Note |
| --- | --- | --- |
| 10 s | 1.14x | Demucs pays 1.1 s of session setup and runs two 7.8 s windows for 10 s of audio |
| 60 s | 4.0x | |
| 3 min | 3.7x | |
| 5 min | 4.9x | one run each |

## Output scope

- **SCNet.** Computes vocals only. Accompaniment is mix − vocals, so vocals + accompaniment equals the mix to 3e-8.
- **Demucs.** Computes four stems on every window. Vocals are its vocals stem, and accompaniment is drums + bass + other, computed in 6 to 20 ms. Demucs stems do not sum to the mix, so vocals + accompaniment differs from it by up to 0.022 (10 s) and 0.057 (60 s) in sample value. The four-stem time and the vocals-and-accompaniment delivery time are the same measurement, because the summing step is all that separates them.
- **Like for like.** The SCNet stage and Demucs are compared from the same decoded planes to the same two outputs, with model fetch, hash check and session creation inside the timed region for both.
- **App path.** `scnet-app` adds decode, OPFS checkpoints and WAV encoding. Its median time outside isolation was 0.23 s at 10 s and 0.63 s at 60 s, so the stage comparison covers almost all of the user's wait.

## Did the work happen

- **Outputs.** Every counted run produced two channels at exactly the input's frame count, all finite and non-silent.
- **Window counts** match the geometry. SCNet used 1, 12, 34 and 56 windows of 11 s at 50% overlap. Demucs used 2, 11, 31, 52 and 103 windows of 7.8 s at a 5.85 s stride.
- **Loads.** SCNet created one worker and session per window (12, 34 and 56), or half that with reuse. Demucs created one session per run.
- **Determinism.** Each candidate gave one vocals hash across all its runs on an input.
- **Real GPU work.** Demucs WebGPU issued 1363 compute dispatches per window and WASM issued none.
- **Patch check.** The stride-patched copy of `neural.js` used for the overlap experiment gives byte-identical outputs to the vendored copy at 25% overlap on both providers (`identity` mode).

## Limiters

These come from separate profiling runs that are not counted in the timings: a CPU profile of the separation thread, ORT verbose session logs and dispatch counts (`profile-*.json`, `.artifacts/sprint-27/profile/`).

**Demucs WebGPU is GPU-compute bound, with JS transforms second.** On 60 s it spent 7.2 s in ORT `run` (about 660 to 850 ms per window across sessions) and 2.2 s in single-threaded JS for normalization, STFT, iSTFT and overlap-add (about 200 to 310 ms per window). Session setup took 1.2 s. The separation thread was idle for 6.9 s of the 10.6 s, waiting on the GPU. ORT's own node placement puts 1677 nodes on WebGPU and 714 on CPU. All 92 Conv, 8 ConvTranspose, 54 MatMul, 10 Gemm, 74 InstanceNormalization, 26 LayerNormalization and 10 Softmax nodes are on WebGPU. The CPU nodes are shape bookkeeping (Gather 191, Unsqueeze 160, Concat 122, Slice 53 and so on), plus 19 host-to-GPU copies. The ORT wasm code took 1.24 s on that thread, session creation included.

Why the gain is not double: the transforms run serially between GPU calls on one thread, and the GPU work per window is fixed. Hiding the transforms behind the next window's GPU call could save at most the ~25% they take. That is a hypothesis; it was not built.

**Shipped SCNet is GPU-dispatch bound per window.** ORT places all 1018 SCNet nodes on WebGPU, including its 12 LSTMs. One 11 s window issues 6193 dispatches and takes about 3.0 s in ORT `run`. That breaks down into 1.84 s of native renderer time ("(program)" in the profile, where Dawn command submission is attributed), 1.13 s idle waiting on the GPU, and 0.38 s of wasm. Per window it pays about 3.6 s of separation, 0.2 s of session creation and 0.04 s of worker start and cached fetch. That is why two-window reuse saves 11% at 60 s and nothing measurable at 3 min. Session creation is about 5% of SCNet's time, and the per-window GPU work is the rest. I infer from the dispatch count and the native time that SCNet's recurrent layers cost it many small GPU submissions. I did not verify this per kernel, because ORT's WebGPU kernel profiler produced no output in this build.

**Demucs WASM is CPU-inference bound.** 75.5 s of its 77.5 s separation ran inside ORT wasm on one thread, about 7.1 s per 7.8 s window. It runs slower than real time.

## Not compared

- **OBRA Fast** was not run on this machine, so there is no direct reference comparison.
- **ORT versions.** No newer ORT version and no true reduced-precision candidate were tried. No concrete hypothesis came out of profiling that a version change would address.
- **Threaded WASM** was not measured. GitHub Pages cannot send the COOP/COEP headers that `SharedArrayBuffer` threads need, so production cannot use threads. No service-worker workaround was added.
- **Other browsers and devices.** Safari, Firefox and integrated or low-end GPUs were not measured. These results hold for one Apple M5 in Chrome 156.

## Quality evidence that is missing

No one has listened to these outputs, and the inputs have no reference stems. The listening files for 27-05 are under `.artifacts/sprint-27/listening/`: the 10 s and 60 s outputs of every candidate, plus Demucs at four overlaps.

One objective proxy is available, and it is not a quality verdict. On the 60 s instrumental, which has no singing, Demucs's vocal stem is 62.7 dB below its accompaniment, against 51.9 dB for SCNet. Demucs puts about 11 dB less energy into vocals where there are none. On the choir excerpt both put similar energy in vocals (−13.5 dB and −13.1 dB). Scenario-01's ORT-Web disagreement on near-silent windows still applies, most strongly on WASM.
