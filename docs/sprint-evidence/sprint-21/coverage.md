# Sprint 21 coverage

The implemented result is an opt-in isolation experiment, with production default window, overlap and worker lifetime preserved. It addresses the user's speed priority and the requested first comparison of 55% overlap and larger processing windows. It does not close the reported audible-artifact defect.

| Requirement | Evidence | Status |
| --- | --- | --- |
| Actual current-path baseline and matched candidates | chrome-comparison.json, frozen-comparison-build.json, protocol.md | Five interleaved warm music runs per variant on the full 19.043265 second fixture; initial observed baseline is separate |
| 55% overlap versus 50%, unchanged strength/model | comparison-summary.json, streaming window tests | Implemented opt-in; slower on this excerpt; changed output awaits listening |
| Larger actual model windows | Chrome shapeResult in chrome-comparison.json, probes/isolation-shape-worker.ts |15 s and 22 s actual ONNX inputs rejected by fixed 476 frame time axis |
| Session setup reduction with bounded retention | src/inference/runner.ts, src/inference/worker.ts, actual load counts | Two-window worker/session reuse only; measured scoped diagnostic improvement |
| Quality guardrail for session-only reuse | Exact PCM16 WAV SHA-256 equality across each matching-overlap group | Byte-identical on the evaluation fixture; not an audible-artifact fix |
| Voice and music output grids | Additional actual voice run plus all music runs; deterministic isolate tests | Finite, nonzero, exact source frame/rate/channel grid |
| Failure, cancellation and sticky CPU fallback | InferenceRunner behavioral tests; production baseline retained | Live retained-worker cancellation passed in 12 ms with workers/temp files zero; forced fallback remains unit-verified |
| Model/resource lifetime | maxActive 1, active 0 after every completed actual case; lifecycle tests | At most one inference worker and at most two calls per experimental worker |
| Browser memory | chrome-host-samples.jsonl | Whole-user-Chrome diagnostic only; cannot establish owned peak or 10% per-profile growth |
| Supported engine safety | Historical Sprint 9 reused-session WebKit result | Cross-browser production promotion remains closed |
| Long recordings and affected passages | The 92.16-second full song passed baseline and reuse2; affected-passage user listening is still needed |3/10/30 minute, thermal and affected-passage acceptance remain open |
| Independent review | Parent's Terra and Luna review of frozen runtime source | Both passed 15 targeted tests with no verified findings; no runtime changes afterward |

The comparator refuses missing warm rounds, changed sample grids, mismatched per-overlap output hashes, missing actual worker work and recorded failures. Its positive control and five negative controls pass. The experiment remains a diagnostic page, not a new user-facing production setting.
