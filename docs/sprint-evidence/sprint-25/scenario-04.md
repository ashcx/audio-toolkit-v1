# Scenario 25-04. Compact metadata

Ordinary rows showed only the filename and duration. `tone.wav` read `00:02`. After Trim all 00:00 to 00:01 the row read `00:01 · 00:00 to 00:01`. The original duration was not repeated on a second line. A full-range trim keeps the duration-only line; `tests/workspace-layout.test.mjs` covers the no-op and changed cases, including a 02:47 file and an open end.

The per-file Trim button and editor are gone. The only trim control is the recipe `Trim all` step, with the sentence "Applies to all files. Files shorter than the selected start cannot be exported." `resolveTrim` clamps the end to each file duration; a start at or after the clamped end leaves that file's error visible and excludes it from export.

Evidence: `result.json`, `tests/workspace-layout.test.mjs`, `tests/recipe.test.mjs`, `captures/04-export-desktop.png`.
