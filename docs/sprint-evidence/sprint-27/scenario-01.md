# Scenario 27-01. Verify the Demucs model and preprocessing against a reference

Status is partially met. The adapter, framing, normalization, source order and endings are verified. ORT-Web's float32 kernels disagree with native ORT more than rounding explains. The gap is small on full-length inputs and large on near-silent windows. It stays open below.

Tested code revision is `196122b` on `codex/sprint-27-demucs`, branched from main `3f5a2b6`. Measured on this Mac in Chrome 156.0.8078.81 (Playwright `channel: 'chrome'`, headless). WebGPU used a real Apple `metal-3` adapter, not a fallback adapter. Model provenance, hash and license status are in [provenance.md](provenance.md).

Raw dumps removed. The investigation scripts and their bulky JSON output were deleted in the independent-review round because the shipped pipeline no longer uses them. This file keeps their conclusions. Each is reproducible from git history: the numpy diagnostics (`demucs-framing-check.py`, `demucs-sensitivity.py`, `demucs-node-probe.py`, `demucs-norm-conditioning.py`) were added in `bf967c7`; the vendored-adapter browser checks (`demucs-check.html`, `demucs-node-check.html`) in `196122b`; and the raw outputs `framing-check.json`, `sensitivity.json`, `node-bisection-*.json`, `norm-conditioning-*.json`, `optimization-disabled.json` and `browser-check.json` in `138c6a7`. Check them out of those commits to rerun or inspect them.

These checks use synthetic mixtures: a bass line, noise-burst percussion, a formant-shaped lead and a sustained pad. They prove numeric agreement, framing and source order. They say nothing about separation quality on music. No lawful recordings were available on this machine.

## Commands

All commands run from the worktree root. The Python venv is `/private/tmp/claude-501/venv27` (onnx 1.23.2, onnxruntime 1.31.1, numpy 2.4.6). Fixtures and reference stems are written under the gitignored `.artifacts/sprint-27/`.

| Step | Command | Exit |
| --- | --- | --- |
| Fixtures | `venv27/bin/python scripts/demucs-fixtures.py` | 0 |
| Reference | `venv27/bin/python scripts/demucs-reference.py .artifacts/models/htdemucs_fp16.onnx .artifacts/sprint-27/fixtures .artifacts/sprint-27/reference` | 0 |
| Window tensors | `venv27/bin/python scripts/demucs-tensors.py .artifacts/models/htdemucs_fp16.onnx .artifacts/sprint-27/fixtures <tiny\|short> .artifacts/sprint-27/tensors` | 0 |
| Pipeline check | `node scripts/demucs-check.mjs` (writes `.artifacts/sprint-27/pipeline-check.json`) | 0 |
| Types | `npx tsc --noEmit` | 0 |
| Unit tests | `npm test` | 0 |

The framing, float32 sensitivity, optimizer-off, node-fingerprint, node-bisection and norm-conditioning rows ran at `bf967c7`, `196122b` and `138c6a7` with scripts that are no longer in the tree (see the note above). The optimizer-off run exited 1 on the old tolerance assertion; its numbers were recorded.

`node scripts/demucs-check.mjs` drives `scripts/demucs-pipeline-check.html`, which runs the app's `isolate()` on ORT-Web and compares vocals and drums + bass + other with the numpy reference. It passes when every output is finite and as long as its input, the SNR clears the per-fixture floor in the script, and the first-window feeds match the reference tensors within float32 rounding (120 dB floor). The result is in [pipeline-check.json](pipeline-check.json).

## Fixtures

| Fixture | Frames | Purpose | Model windows |
| --- | --- | --- | --- |
| tiny | 4000 | Far shorter than a segment | 1 |
| short | 100000 | Shorter than a segment | 1 |
| segment | 343980 | Exactly one segment | 2 (stride 257985 starts a second window) |
| long | 1323001 | Several overlaps and a 33076-sample final window | 6 |

## Model bytes and metadata

The reference and the browser page both refuse to run unless the file is 85034606 bytes with SHA-256 `742a4f85…6effd775`. Both checks passed. The reference also asserts every metadata value it depends on: sources, rate, channels, segment, FFT, hop, window, normalization, pad 1536 and frame trim 2. Running the graph gives `out_spec_real`/`out_spec_imag` `[1,4,2,2048,336]` and `out_wave` `[1,4,2,343980]`. The reference asserts these shapes.

## Reference implementation

`scripts/demucs-reference.py` follows upstream Demucs, not the vendored code. It normalizes the whole track by the mono mix's mean and unbiased standard deviation. It reflect-pads by 1536 on the left and 1620 on the right (1536 plus 84 to reach 336 whole hops). It applies a centered, normalized periodic-Hann STFT (4096/1024), keeps frames 2 to 338, and drops the Nyquist bin. The inverse adds back the zero bin and two zero frames per side, then trims 1536. Windows step by 257985 (25% overlap) with demucs's triangular weight. A short window is centered with real neighboring audio and zeros past the ends.

| Check | Result (measured) |
| --- | --- |
| STFT then iSTFT of two sines, interior | max abs error 1.5e-12 |
| Same over the full window | Not identity at the outer 2 frames and Nyquist. This is Demucs's own framing, which leaves those to the model. |
| Output length | Equals input length for all four fixtures |
| Stems finite | All fixtures |

### The model confirms the framing

The framing check (`framing-check.json` at `138c6a7`) reruns `short` with one deliberate deviation at a time. It scores how closely the four stems sum back to the mix, and how well the bass stem tracks the synthesized bass.

| Variant | Stem-sum SNR | Bass correlation |
| --- | --- | --- |
| Metadata framing | 28.76 dB | 0.99932 |
| Real and imaginary swapped | 7.11 dB | 0.99863 |
| Frames shifted one hop | 6.85 dB | 0.99889 |
| STFT left unnormalized (scaled back after) | 28.76 dB | 0.99932 |
| No track normalization | 28.76 dB | 0.99932 |

Swapping or shifting the spectrogram costs about 22 dB of reconstruction, so the model clearly responds to the metadata framing. Unnormalized STFT scaling and skipping track normalization change nothing measurable. I infer the graph normalizes its inputs internally (it has `ReduceMean`/`Sqrt`/`Div` at its entry, which the node bisection shows). External normalization still follows upstream and the metadata flag.

### Stems against the mixture

Demucs does not force stems to sum to the mix. These numbers are the model's own reconstruction, not an adapter tolerance.

| Fixture | Stem-sum SNR | Max abs error |
| --- | --- | --- |
| long | 29.74 dB | 0.497 |
| segment | 29.21 dB | 0.522 |
| short | 28.76 dB | 0.222 |
| tiny | 7.89 dB | 2.731 |

### Source order

On `long` and `segment`, each output's correlation with its own synthesized component is 0.991 to 1.000. Its largest correlation with any other component is at most 0.014. That confirms drums, bass, other, vocals, the metadata order. On `short` the formant lead lands mostly in `other` (0.895), and on `tiny` the stems are mixed. That is separation behavior on synthetic input, not an order fault: the same order holds on the longer fixtures.

## Endings and short inputs

Every stem from both the reference and the browser has exactly as many frames as its input, on every fixture. Tail RMS over the last 0.1 s is non-zero wherever the input has energy there. On `long`, for example, it is drums 0.0032, bass 0.2615, other 0.0521 and vocals 0.1656, against a mix tail of 0.3199. On every non-tiny fixture, the browser tail RMS is within 1e-4 of the reference. The `segment` fixture runs two windows by design, because demucs starts a window every 257985 samples.

Short inputs run, but the model reconstructs the tiny input poorly (7.9 dB stem sum). That is native ORT behavior on a window that is 98.8% zeros, before any browser difference.

## Vendored preset against this file

The vendored `separate()` with `model: 'htdemucs'` does not run this file unchanged. It feeds the graph's first two declared inputs as `mix` `[1,C,L]` and a complex-as-channels spectrogram `[1,2C,F,T]`. It also reads output 0 as a complex-as-channels spectrogram and output 1 as the waveform. This file declares `spec_real`, `spec_imag`, `audio` and three outputs. Measured: the call fails with `input 'audio' is missing in 'feeds'.`

Everything else in the vendored hybrid path matches this file's metadata. Read from the pretty-printed bundle, it uses reflect pad 1536 (`hop/2*3`), 336 frames from `ceil(L/hop)`, a two-frame trim, the dropped Nyquist bin, normalized periodic Hann, track mono mean and unbiased std (it adds 1e-8; upstream Demucs adds none; unblend adds 1e-5 to std), a 0.75 stride, demucs's triangular weight indexed from 0 for the last window, centered short-window padding, and source order drums, bass, other, vocals. The first-window comparison measures this directly. The tensors the vendored code builds through `demucsHybridSession` match the numpy reference's at 144.6 to 145.9 dB SNR, with max abs differences of 2.4e-7 to 1.9e-6. That is float32 rounding.

The adapter was `demucsHybridSession` in `src/inference/demucs-session.ts` at `196122b`; it is removed, because the shipped pipeline feeds the model directly. It declared `mix` (with the 343980 segment) and `mix_spec` inputs. It splits the complex-as-channels feed into `spec_real`/`spec_imag`, passes `mix` as `audio`, and rejoins `out_spec_real`/`out_spec_imag` into complex-as-channels order. It also checks output shapes. No DSP is duplicated.

## Browser against reference

Full-length stems against the numpy reference, all four sources, measured with the vendored adapter at `196122b` (`browser-check.json` at `138c6a7`, removed). The shipped pipeline's numbers are in [pipeline-check.json](pipeline-check.json).

| Fixture | WASM SNR (min to max over stems) | WebGPU SNR | WASM max abs | WebGPU max abs |
| --- | --- | --- | --- | --- |
| long | 60.0 to 81.3 dB | 82.1 to 92.1 dB | 4.5e-4 | 1.3e-4 |
| segment | 61.0 to 83.8 dB | 83.8 to 96.3 dB | 3.4e-4 | 6.3e-5 |
| short | 48.8 to 67.7 dB | 68.4 to 83.6 dB | 2.3e-3 | 1.9e-4 |
| tiny | -0.8 to 10.9 dB | 22.0 to 32.6 dB | 1.40 | 0.092 |

Over the final second of `long`, the stems agree at 53.8 to 74.2 dB on WASM and 74.3 to 89.4 dB on WebGPU. The WebGPU session issued 1363 compute dispatches per window and WASM issued none, which shows WebGPU really ran. Chrome logged ORT's warning that some nodes were not assigned to the preferred provider, which ORT says includes shape ops placed on CPU. Exact per-node placement is not established; that is Phase 2 work.

## Why ORT-Web differs

Native ORT is stable on these inputs. On `tiny`, rerunning it with one thread, with graph optimizations off, or with 1e-7 relative input noise keeps every stem within 73.8 to 111 dB of baseline. On `short` the same variants stay within 90.3 to 138.7 dB. Flushing denormals to zero changes nothing (bit-identical). So the browser gap is not runtime rounding amplified by the model.

Feeding the reference's exact window tensors to ORT-Web gives raw outputs at the following SNR against native (measured):

| Window | WASM out_spec / out_wave | WebGPU out_spec / out_wave |
| --- | --- | --- |
| short | 61.5 to 62.2 / 65.4 dB | 82.3 to 82.7 / 80.5 dB |
| tiny | 19.4 to 20.0 / 5.0 dB | 39.0 to 39.4 / 27.4 dB |

Node bisection (`node-bisection-*.json` at `138c6a7`) fingerprints 506 compute-node outputs on both runtimes. The first non-silent divergence is the same on both windows and both providers.

| Node | tiny WASM | tiny WebGPU | short WASM | short WebGPU |
| --- | --- | --- | --- | --- |
| Input normalization ReduceMean over the 2.75M-element spectrogram | 79.8 dB | 103.3 dB | 62.0 dB | 79.8 dB |
| First time-encoder Conv | 129.5 dB | 137.4 dB | 94.4 dB | 115.0 dB |
| Its pointwise Conv (input of the next node) | 129.9 dB | 131.3 dB | 93.3 dB | 113.6 dB |
| First InstanceNormalization (GroupNorm over 515970 elements) | 55.3 dB | 78.6 dB | 62.6 dB | 75.3 dB |
| Final ConvTranspose | 3.3 dB | 31.9 dB | 64.9 dB | 80.0 dB |

Given an input that matches native to 93 to 131 dB, ORT-Web's InstanceNormalization output matches to only 55 to 79 dB. The error then compounds through the graph's 100 normalization nodes (74 InstanceNormalization, 26 LayerNormalization). The near-silent tiny window has a far higher error gain, which is why it diverges. I infer, but have not proven, that ORT-Web's reductions accumulate long float32 sums less precisely than native ORT. Supporting that: normalization inputs are well conditioned (mean²/variance at most 0.77, `norm-conditioning-*.json` at `138c6a7`), so variance cancellation is ruled out.

Setting `graphOptimizationLevel: 'disabled'` gave bit-identical WASM numbers on `tiny`. I did not confirm that the vendored `load()` delivered the option to ORT, so the optimizer is not ruled in or out.

## Unresolved gaps

- ORT-Web agrees with native ORT at 60 to 97 dB on full-length synthetic stems but diverges on near-silent windows (tiny: down to -0.8 dB on WASM, 22 dB on WebGPU). Which runtime is closer to exact arithmetic is not established. A float64 run of the graph would settle it. Real music with silent intros, fades or very short files must be checked in Phase 2 listening tests before WASM is trusted there.
- WebGPU agrees with native better than WASM on every measure here. That is measured agreement, not speed.
- No separation-quality evidence; only synthetic mixtures were used.
- The `segment` fixture runs two windows, as upstream demucs does for an exact segment. A one-window path for exact-length input would be a deliberate change, not a bug fix.
- Per-node provider placement on WebGPU is not recorded.
- The license and distribution status of the weights is unresolved upstream. The user's decision to bundle is recorded in [provenance.md](provenance.md).
- No independent Terra or Luna review yet.
