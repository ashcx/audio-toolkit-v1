# Speech threaded-CPU assessment

A temporary server on127.0.0.1:4195 adds COOP same-origin and COEP require-corp for research only. No production headers, OS settings or GitHub Pages configuration changed. Chrome reports crossOriginIsolated=true and SharedArrayBuffer available. The normal server reports false for both. Both models execute finite frames in each environment.

Observed linear memories after model initialization and one frame are17498112bytes for GTCRN and30343168bytes for DeepFilterNet3. Both buffers are ordinary unshared ArrayBuffers in both environments. These are sampled per-instance WASM linear-memory sizes, not process memory, peak memory, total JS memory, stereo totals or stable maximum limits. The observer reads actual WebAssembly.Memory objects after construction. No inference timing is captured in this probe.

The production entry points expose no thread count, pthread pool or provider setting. Existing worker execution protects the UI but does not demonstrate multi-threaded model inference. Cross-origin isolation alone does not transform these compiled binaries into threaded kernels. Actual threaded CPU inference, speedup and thread counts are NOT VERIFIED. Separate channel workers or alternative runtime builds remain possible untested candidates; no gain is inferred from core count. Retain the verified existing CPU path.

Reproduce by preparing the pinned packages with scripts/prepare-speech-evaluation.mjs, copying scripts/speech-acceleration-check.html into .artifacts/speech-upstream/acceleration.html, and running `python3 scripts/serve-speech-isolated.py` from the repository root. Open http://127.0.0.1:4195/acceleration.html and click Check actual speech backends. A normal localhost server of the same directory supplies the control. No source media is uploaded or needed for this one-frame capability check.

The probe is one-shot. Its button disables on first execution, and it rejects an unobserved memory rather than passing an empty memory list. Reload before another measurement because DeepFilter caches its module in the page. Both saved browser records were regenerated after that correction and each observes one memory per runtime.
