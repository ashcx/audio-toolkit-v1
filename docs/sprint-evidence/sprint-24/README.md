# Sprint 24 evidence. Loudness, true peak and compression

Base `32356a4`. Branch `codex/sprint-24-loudness`. All evidence was produced in the worktree `/private/tmp/audio-sprint24`.

| Requirement | Artifact | State |
| --- | --- | --- |
| Gated integrated loudness and K-weighting | `scenario-01.md`, `tests/loudness.test.mjs` | verified against ffmpeg reference |
| True peak with BS.1770 FIR and loudness ceiling guard | `scenario-01.md`, `tests/loudness.test.mjs` | verified; 0.39 dB ffmpeg delta on the intersample fixture, 1.0 dB guard on the loudness ceiling only, phase sweep shows up to +0.64 dB over-read near Nyquist |
| Peak-mode target honesty | `scenario-03.md`, `scenario-04.md`, `captures/08-peak-result.png` | verified; a 0 dBTP target exports at -0.0 dBTP on the tone fixture and the result reports the estimate |
| Legacy peak recipes, new loudness defaults and true-peak peak mode | `scenario-03.md`, `tests/recipe.test.mjs`, `tests/loudness.test.mjs` | verified; new Peak is -6..0 dBTP, legacy sample peak preserved |
| Nonlinear loudness rail, marks and magnet | `scenario-02.md`, `tests/ui-controls.test.mjs`, `captures/01-loudness-rail.png`, `captures/07-mobile-loudness.png` | verified in Chrome and unit tests |
| Compressor bypass, ordering, linked detection and bounds | `scenario-05.md`, `tests/compressor.test.mjs` | verified |
| Preview and export feedback | `scenario-04.md`, `browser-check.json`, `captures/04-preview-compressor.png`, `captures/05-export-result.png`, `captures/06-ceiling-limited.png` | verified in Chrome; step-local claims are qualified |
| Listening and physical-device acceptance | none | unavailable, not claimed |
| Lossy decoded export peak measurement | none | open gap |
