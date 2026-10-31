# Sprint 23 verification

2026-10-31. On-demand preview uses two sequential WAV renders of a maximum 15-second excerpt, starting at the effective per-file trim start. Original and processed audio use the same source clock. Processing retains recipe order and overrides. The comparison is before export encoding. Context-sensitive processing is labelled as an excerpt estimate.

The Preview controller owns a single active task and a retained original/processed pair. Cancellation waits for task cleanup, late results are discarded, recipe/file changes invalidate prior previews, and failed cleanup blocks new work until retried. Export and other new processing are blocked while preview work or cleanup is active. Playback is user-triggered.

## Automated checks

The implementer ran the full 87-test suite before adding the sixth focused preview case, then reran the six focused cases and production build successfully. The sixth case compares real sine PCM after gain against the same original excerpt. The integrated branch still requires its final full-suite run.

Independent Terra and Luna reviews each ran `node --experimental-strip-types --test tests/preview.test.mjs` and observed six passing tests. Luna also ran typecheck. Neither reported a verified finding. Both audited added comments and suppressions and found none. Neither review drove Chrome. The root inspected the controller, hook, plan and worker integration directly.

## Live checks

Pending final integrated Chrome verification. No audible quality, physical-device, latency or speedup claim is established by unit tests.
