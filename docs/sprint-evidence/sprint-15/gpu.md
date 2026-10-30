# Speech GPU assessment

The actual Mac Chrome155 browser exposes an Apple Metal3 WebGPU adapter. Both normal and temporarily isolated localhost tests observe it. See normal-chrome.json and isolated-chrome.json. Adapter availability is not model placement.

Both pinned speech entry points execute compiled CPU WASM, with fixed-frame PCM interfaces and no WebGPU execution-provider option. The isolated probe instantiates each actual model, processes one frame and records finite output. No GPU model execution occurred. The probe never requests a device or submits model work to a GPU queue. Actual speech GPU placement, numerical comparison, memory and end-to-end speed are NOT VERIFIED.

A verified candidate must preserve exact output grid/channels, matched-reference RMSE at most1e-5, cancellation/error cleanup, and measured peak memory no greater than1.25times the matched baseline; it must improve median end-to-end decode/process/encode time by at least20percent over five alternating runs with no failures, with a profiler-derived limiter. These are prospective acceptance thresholds, not measured results. No eligible GPU implementation was found in the selected compiled wrappers, so no timing comparison or GPU optimization is shipped. Re-exporting equivalent ONNX graphs and STFT/state paths is additional unverified research rather than a provider flag.
