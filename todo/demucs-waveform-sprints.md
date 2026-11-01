# Plan optimized Demucs separation and waveform editing

Prepared 2026-10-31. Research and planning only. The user explicitly requested sprints rather than immediate implementation. No app code, model download, model execution or performance benchmark is part of this pass. Existing Sprints 24–26 remain planned. Add Sprints 27–29 below; the speed investigation can be prioritized before the other planned work.

## Research findings

### Use OBRA as a concrete browser reference

[OBRA](https://obra.art/tools/stems) describes Fast as four-stem Demucs v4 using ONNX Runtime Web with WebGPU and a CPU fallback. Its page advertises an approximately 85 MB model and local processing. The user's preferred sound and reported speed are user observations, not a controlled benchmark produced by this project.

Read-only inspection of public assets observed in actual Chrome identifies the following configuration on 2026-10-31. This corrects the earlier uncertainty about which artifact its page selects.

| Item | Observed configuration |
| --- | --- |
| Model | `htdemucs_fp16.onnx` from `Ryan5453/unblend` |
| Immutable model revision | `30b749fd691312b1e4b3f8fe79df0b51cde836cd` |
| Expected bytes | 85034606 |
| Expected SHA-256 | `742a4f8594a48d6306da303b8b2dd8be2b54389b88557db034408b436effd775` |
| Sample rate and segment | 44100 Hz, 343980 samples, calculated as 7.8 seconds |
| Core default overlap | 0.25, subject to a validated caller override |
| Model lifecycle | Session initialized in a worker and used for repeated separation calls/windows, with explicit release/disposal paths |
| Browser runtime adapter | ONNX Runtime Web 1.30.0; prefers WebGPU with WASM fallback; Fast requests graph optimization |
| CPU threads | Uses cross-origin isolation and available core count to select up to four threads; otherwise one |

These are source/configuration observations, not proof of actual GPU kernel placement, owned peak memory, final runtime overrides or matched performance. No private source, hidden application state or user audio was accessed. Public minified implementation code was read but is not copied into the app.

The [artifact model card](https://huggingface.co/Ryan5453/unblend) says the HTDemucs FP16 file stores eligible weights in half precision and casts for FP32 computation. File size does not establish half-precision arithmetic or faster inference. The card distinguishes source-code licensing from weight terms and reports no explicit weight license grant identified. Verify upstream provenance and applicable distribution terms before packaging a model; do not infer them from a library's MIT license.

### Candidate integration paths

The first candidate is the exact pinned OBRA-selected artifact, using a verified adapter that matches its metadata and preprocessing. [Unblend's browser API](https://github.com/Ryan5453/unblend/blob/main/web/unblend/README.md) exposes worker-owned WebGPU/WASM separation and cancellation, with reusable separator instances. It is a candidate for evaluation, not proof that OBRA uses the current published package without changes.

[Unblend's export notes](https://github.com/Ryan5453/unblend/blob/main/onnx.md) describe fixed model-length input, external transform/normalization requirements and stem metadata. Incorrect framing, scaling or source order can produce plausible but damaged outputs. Match these contracts before tuning speed. Do not carry SCNet's preprocessing into Demucs unchanged.

[StemSplit's browser guide](https://github.com/StemSplit/demucs-onnx/blob/main/docs/browser.md) provides another ONNX/browser integration candidate, including a single standard HTDemucs model for all four outputs. Its artifacts are not assumed equivalent to OBRA's. Pin and compare them only if the first path has a concrete compatibility or correctness problem. Avoid a broad model search before running the strongest existing reference.

[ONNX Runtime performance guidance](https://onnxruntime.ai/docs/tutorials/web/performance-diagnosis.html) recommends diagnosing provider placement, threading and GPU transfers. Graph capture is conditional on static shapes and all kernels running on WebGPU. Do not enable it blindly in a mixed GPU/CPU graph. Native CUDA/TensorRT benchmark numbers do not establish browser or Apple-device performance.

### Render waveform peaks without retaining whole tracks

The reference image uses compact horizontal bars, a central baseline, colored played/unplayed regions and aligned stem rows. It is an amplitude waveform rather than a spectrogram. Compute real peak summaries from audio; do not draw decorative random bars.

[WaveSurfer](https://wavesurfer.xyz/) supports interactive waveforms and region overlays. Its [project documentation](https://github.com/katspaugh/wavesurfer.js#questions) warns that full-browser decoding can exhaust memory on large files and recommends predecoded peaks. Evaluate it using supplied peaks against a small Canvas renderer backed by the existing audio playback element. Neither choice should require a second whole-file decode just to show the exported waveform.

Drawing bars from cached peaks is modest work. Producing accurate source peaks still requires reading/decoding the relevant audio, and synchronized multi-stem playback and trim interaction need verification. Do not promise that waveform generation is free or instantaneous.

## Sprint 27. Evaluate and optimize browser Demucs v4

The detailed authoritative sprint file is [sprint-27-demucs-runtime.md](sprint-27-demucs-runtime.md). It contains scope, entry criteria, task checklists, acceptance scenarios, evidence and PR delivery requirements.

## Sprint 28. Select and export four stems or instrumentals

The detailed authoritative sprint file is [sprint-28-stem-selection.md](sprint-28-stem-selection.md). It contains scope, entry criteria, task checklists, acceptance scenarios, evidence and PR delivery requirements.

## Sprint 29. Add waveform playback and individual-track trimming

The detailed authoritative sprint file is [sprint-29-waveform-trimming.md](sprint-29-waveform-trimming.md). It contains scope, entry criteria, task checklists, acceptance scenarios, evidence and PR delivery requirements.

## Research source records

OBRA assets can change after this date. Reinspect them before implementation. Public script hashes below identify this observation without copying their implementation into the repository.

| Public asset | SHA-256 |
| --- | --- |
| [Tool/model configuration](https://obra.art/_next/static/chunks/24739.a01e1644217ef5e8.js) | `762d4374bed6b4c9771566200408c3c5b9f7c2012dbdc23d1bdc3103a62879e5` |
| [Worker adapter](https://obra.art/_next/static/chunks/16137.33654f03e033ec20.js) | `7468470134552e9ef14f6e62367f8dceab19b7ed806ff5aad72b336b314beb9d` |
| [ORT worker bootstrap](https://obra.art/_next/static/chunks/7227.0c9f2f8cef1f17d8.js) | `c7395baf682f7c143c06eddc930c282b67381bdf4a88138994edbdf89fb4d06a` |
| [Separation core](https://obra.art/_next/static/chunks/44225.11061c685b32ca7d.js) | `01af00814b49f953e1efd24ae8fc79aa23ee2a1a2fe5e091dd48dc9791ad1afb` |

No model weights were fetched or executed. No audio was submitted to OBRA. Runtime compatibility, speed, owned memory and audible quality remain execution-sprint questions. Do not transfer native CUDA acceleration claims to browser WebGPU or call the fastest published model the fastest on this Mac.

## Delivery

One branch and one PR per sprint. No merge or deployment without user authorization. Preserve the existing plans and unrelated working changes. If a child targets an unmerged parent, retarget it to main after the parent lands and before merging the child. Start implementation only after a separate user instruction.
