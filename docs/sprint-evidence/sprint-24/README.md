# Sprint 24 evidence. Loudness, true peak and compression

Base `4d4395a`. Branch `codex/sprint-24-loudness`. All evidence was produced in the worktree `/private/tmp/audio-sprint24`.

| Requirement | Artifact | State |
| --- | --- | --- |
| Gated integrated loudness and K-weighting | `scenario-01.md`, `tests/loudness.test.mjs` | verified against ffmpeg reference |
| True peak with BS.1770 FIR and ceiling guard | `scenario-01.md`, `tests/loudness.test.mjs` | verified; 0.39 dB reference delta, 0.4 dB guard |
| Legacy peak recipes and new loudness defaults | `scenario-03.md`, `tests/recipe.test.mjs` | verified |
| Nonlinear loudness rail, marks and magnet | `scenario-02.md`, `tests/ui-controls.test.mjs`, `captures/01-loudness-rail.png`, `captures/07-mobile-loudness.png` | verified in Chrome and unit tests |
| Compressor bypass, ordering, linked detection and bounds | `scenario-05.md`, `tests/compressor.test.mjs` | verified |
| Preview and export feedback | `scenario-04.md`, `browser-check.json`, `captures/04-preview-compressor.png`, `captures/05-export-result.png`, `captures/06-ceiling-limited.png` | verified in Chrome |
| Listening and physical-device acceptance | none | unavailable, not claimed |
| Lossy decoded export peak measurement | none | open gap |
