# Sprint 21 verification

Two-window session reuse is faster in the scoped Chrome diagnostic. It remains experimental. Production defaults continue to use 11-second windows, 50% overlap and a fresh worker for every window.

## Repeated comparison

Actual Mac Chrome 155 completed five interleaved warm music-export runs per profile on the full live fixture lasting 19.043265 seconds. Processing time includes decode, checkpoints, inference, overlap reconstruction and PCM16 WAV encode. Fixture fetch/source inspection and decoded-output validation are excluded. The first observed baseline is separately labelled round 0. It is not a controlled OS-cold run.

| Profile | Median seconds | Range seconds | Change against fresh-worker control | Windows / loads |
| --- | ---: | ---: | ---: | ---: |
| 50% overlap, fresh worker |30.932|30.175–31.284|Control|5 /5|
| 55% overlap, fresh worker |35.966|35.406–37.681|16.3% longer|6 /6|
| 50% overlap, two-window reuse |26.012|25.853–26.698|15.9% lower|5 /3|
| 55% overlap, two-window reuse |29.731|29.065–30.125|3.9% lower|6 /3|

Every export decodes to exactly 839808 frames at 44100 Hz, stereo, with finite samples and nonzero energy. The PCM16 WAV file is byte-identical between fresh and reused sessions at each overlap. The 55% result differs from 50% and has not been accepted by listening. A separate real voice export also passes its finite, nonzero and exact-grid checks. Maximum simultaneous inference workers is 1; all are terminated after each case.

The first observed baseline trace, excluded from the warm comparison, allocates 11.623 seconds to ONNX session setup and 18.140 seconds to separation out of 31.245 seconds total. This identifies repeated setup as a material cost alongside neural computation, at `load()` in the inference worker. It is a phase trace, not a native kernel placement or CPU/GPU utilization profile. Setup cannot explain more than its measured share of total time. The measured reuse difference is within that bound. An OS observation found the active renderer using about 200% CPU; provider negotiation does not establish all-GPU inference. Background system activity is recorded in load-before.txt and remained uncontrolled.

The control uses the experiment runtime's fresh-worker lifetime. The worker now defers session disposal to worker termination instead of also invoking the vendor session free method before posting completion. Thus this is not a byte-for-byte unchanged production-source benchmark. It establishes the comparison between one-window and two-window worker lifetimes in the frozen experimental build.

## Larger model-window constraint

Actual ONNX Runtime rejects a 15-second spectral input with 646 frames and a 22-second input with 948 frames. Both errors require 476 frames. This is evidence of unsupported larger neural windows, not a slow or fast result. Increasing outer buffers without changing that model axis would not establish a larger neural window and is not adopted.

## Longer reliability and cancellation

A second frozen harness adds explicit post-release storage observations. Both paths completed the full instrumental fixture lasting 92.16 seconds, with 4064256 stereo frames at 44100 Hz. Each completed 18 actual windows. Fresh workers used 18 loads in 115.894 seconds; reuse2 used 9 loads in 99.471 seconds. Their WAV hashes are identical, all decoded samples are finite, and remaining temporary files are 0 for both. These are one run per variant for reliability; their elapsed times are not a repeatable full-song speed estimate.

A third diagnostic cancels immediately after the first window completes while one retained worker still exists. Actual Chrome cleanup finishes in 12 ms, with 0 active workers and 0 temporary files. This is a single cancellation observation, not a latency percentile. Failure, timer and sticky CPU fallback behavior also pass the runner's deterministic tests.

## Limits and final checks

The host sampler records all user Chrome processes, including unrelated tabs and the later UI-verification pause. The observed active renderer also may serve other localhost tabs. These samples cannot establish this job's owned peak memory or a 10% per-profile memory-growth bound. The historical WebKit reused-session failure remains relevant. No default promotion is made without owned-memory and supported-engine evidence.

Affected-passage listening, artifact classification, clean-stem metrics, native kernel profiling,3/10/30 minute recordings, thermal behavior and actual Safari/mobile reuse remain open. The public evaluation fixtures are not a replacement for the user's affected excerpt. This work does not claim audible-artifact improvement.

All 87 unit tests pass. Production build, pinned AAC/model asset verification, worker-import audit, static audit, whitespace check and comparator positive/five negative controls pass. The system Node 22.11.0 produces Vite's existing supported-version warning; the production bundle builds and executes in actual Chrome. Terra and Luna independently reviewed the runtime changes and passed 15 targeted tests without verified findings. Runtime source was unchanged after those reviews.
