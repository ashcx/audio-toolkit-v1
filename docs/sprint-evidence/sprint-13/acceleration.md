# Acceleration evaluation

The tested wrappers expose single-threaded CPU WebAssembly interfaces. Chrome smoke and speech runs execute without cross-origin isolation. Neither wrapper exposes a WebGPU execution provider or configurable inference thread count. No GPU, threaded CPU, placement, fallback, acceleration or speedup claim is made.

GPU and isolated-host threaded CPU execution are NOT VERIFIED. A browser GPU adapter alone cannot move these compiled C/Rust models to the GPU. Alternate ONNX artifacts and equivalent STFT/state handling would require a separate reproducibility and numerical comparison before they can replace these runtimes. No hosting or OS configuration was changed.

Sprint 15 remains dependent on a verified Sprint 14 integration and controlled end-to-end CPU baselines. CPU execution in the research harness is not an application fallback test.
