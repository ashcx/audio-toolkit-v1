# Sprint 23 verification

2026-10-31. On-demand preview uses two sequential WAV renders of a maximum 15-second excerpt, starting at the effective per-file trim start. Original and processed audio use the same source clock. Processing retains recipe order and overrides. The comparison is before export encoding. Context-sensitive processing is labelled as an excerpt estimate.

The Preview controller owns a single active task and a retained original/processed pair. Cancellation waits for task cleanup, late results are discarded, recipe/file changes invalidate prior previews, and failed cleanup blocks new work until retried. Export and other new processing are blocked while preview work or cleanup is active. Playback is user-triggered.

## Automated checks

The implementer ran the full 87-test suite before adding the sixth focused preview case, then reran the six focused cases and production build successfully. The sixth case compares real sine PCM after gain against the same original excerpt. The integrated branch still requires its final full-suite run.

Independent Terra and Luna reviews each ran `node --experimental-strip-types --test tests/preview.test.mjs` and observed six passing tests. Luna also ran typecheck. Neither reported a verified finding. Both audited added comments and suppressions and found none. Neither review drove Chrome. The root inspected the controller, hook, plan and worker integration directly.

## Live checks

Actual Chrome processed a synthetic 30-second WAV with gain into original and processed 15-second WAV previews. Both native players reported duration 15 seconds and readyState 4. Playback was user-triggered through native controls. Starting Processed paused Original after the play event. No export job or download was created.

Editing gain invalidated both retained players. With batch trim 10–28 seconds, the preview displayed 00:10–00:25 and both players again reported 15 seconds. Preview preparation disabled Export. Cancelling preparation returned to idle with Export enabled. An actual 320 CSS-pixel viewport had document scrollWidth 320. Desktop, trimmed and narrow screenshots are saved alongside this report. The viewport override was reset.

The integrated 91-test suite and production build passed. Terra's follow-up review of the automatic-export integration and player CSS passed eight focused tests with no verified regressions. A roughly 30-second actual Chrome screencast records on-demand preview generation, closure, recipe editing and regeneration in interaction.mp4.

Physical devices, subjective listening acceptance and context-sensitive full-file equivalence remain unverified. Excerpt estimation is explicitly labelled. No audio-quality or speedup claim is established by these UI checks.
