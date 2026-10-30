# Speech cleanup initial feasibility

2026-10-30. On the local Vite development server and Playwright Chromium, `@sapphi-red/gtcrn-wasm@0.0.3` and `@lofcz/deepfilternet-web@0.1.0` each initialized and processed one all-zero frame. The respective frame sizes were 256 samples and 480 samples, and both outputs contained finite values. This is only an initialization smoke check, not a speech-quality, latency, throughput, memory, browser-support or GPU test. The packages were removed after the smoke check and are not application dependencies.

GTCRN's tested package runs mono at 16 kHz internally. DeepFilterNet3's tested package uses mono 48 kHz frames. Source-rate and stereo handling, stream delay, final padding and model flush require a documented and verified contract before either implementation is exposed in the recipe.

Next: establish representative licensed fixtures and independently verify real speech, frame continuity, duration and tail handling for both packages. Measure single-threaded CPU first; assess threaded CPU and actual WebGPU separately with explicit backend profiling. The production GitHub Pages response was observed without cross-origin isolation headers during earlier research, so threaded ONNX Runtime on the live site remains unverified.
