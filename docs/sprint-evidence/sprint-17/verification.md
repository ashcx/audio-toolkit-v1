# Retained-path verification

The full normal unit suite and build were rerun for this retained candidate; exact results are in unit.txt and build.txt. Existing scheduler exclusivity, stale attempts, output naming, cancellation, cleanup retry, inference deadlines/sticky fallback, overlap reconstruction and media-format checks remain present. Unit results are not a substitute for actual physical fallback or resource evidence.

The actual Mac browser proof is the unchanged implementation's four full-file cases from Sprint16, with its27matched runtime file identities, exact source/output duration/rate/channel checks, completed mixed WebGPU/WASM sessions and recorded post-run storage count0. Those observations are reused because no product behavior changed; no new browser run, CPU-only comparison, peak measurement or before/after gain is claimed here.

Without an eligible changed implementation there is no valid before/after speed comparison. Required repeated matched timings, profiler limiter, process/device memory peak, Mac CPU-fallback recreation, thermal behavior and broader long workloads remain NOT VERIFIED. Keep future optimization behind those checks rather than introducing a cache/lifetime/window change based on intuition.
