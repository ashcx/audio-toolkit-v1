# Sprint 29 coverage

Tested revision: the head of the Sprint 29 branch when this file was committed. Evidence was produced by `node scripts/sprint-29-check.mjs` (NN checks, exit 0, real Chrome). The check can run against the dev server or a preview build, and it was run against the dev server and by interactive driving of the same build in the in-app browser. Results and raw check list are in `sprint-29-check.json`. Screenshots are in `captures/`.

## Scenarios

| Scenario | Result | Evidence |
| --- | --- | --- |
| 29-01 Renderer comparison | Decision recorded, no prototype. Canvas was chosen because peaks come from our own worker, no dependency is added, and bars, trim marks and the playhead share one coordinate system. WaveSurfer was not measured. | This file |
| 29-02 Peak position, stereo, silence, long files | Unit tests (`tests/peaks.test.mjs`) place a known impulse in the right bin for any block size, cover stereo, silence, abort, invalid samples and a bin count that does not grow with input length. Browser check confirms real peaks are drawn for source, preview and result players. Exported cut boundaries are checked by `tests/trim-overrides.test.mjs` on the PCM and by the exported length shown in the browser. Long recordings and VBR timing were not run. | `tests/peaks.test.mjs`, `tests/trim-overrides.test.mjs`, `captures/01`, `captures/05` |
| 29-03 Seek, pointer capture, cancel, keyboard, precision, source trim | Passed in Chrome with a real mouse. Scrubbing while playing gave zero pause events, several seeks, a monotonic seek sequence and a final position at the release point. Handle drags, pointer cancel reverting to where the gesture began, arrow-key nudging, Reset, Done, Trim all conflict (Keep and Replace) all pass. Stored values are exact. Fields and tags show tenths of a second. Touch input was not tested (see gaps). | `sprint-29-check.json`, `captures/02` to `04` |
| 29-04 Cache invalidation | Peaks are cached per File object, outputs per URL, and a new file or URL starts over. Removal, Clear all and re-export were exercised only as far as the export flow in the check. Stale URL release was not separately measured. | `use-peaks.ts`, `captures/05` |
| 29-05 First-play latency, separation time, memory | Not measured. Peak work is paused while an export or preview runs and is queued one file at a time, but its cost against isolation was not benchmarked. | None |
| 29-06 Synchronized stem audition | Out of scope. The stem-selection sprint was withdrawn. | Sprint file decisions |

## Requirements from the 2026-11-13 decisions

| Requirement | Result |
| --- | --- |
| Option B: compact rows that expand to trim, one row at a time, handles only in edit mode | Passed. Compact 44 px, editing 130 px, other rows stay 44 px, no handles in compact mode. |
| Full-height contrast start and end lines, distinct from the playhead | Passed. Pixel check finds two full-height lines in the contrast colour. Lines are 2 px brackets, the playhead is a thin accent line with a round head. In compact rows the lines show only when the range is not the whole file. |
| Files that follow Trim all show the shared range | Passed (`captures/01`, `captures/04`). |
| Scrubbing keeps playback in step | Passed for mouse. |
| Waveform on original, before and after preview, and exported result | Passed. Result players are labelled Result and drawn from the exported audio. |
| Trim all asks before replacing custom ranges | Passed, non-blocking, with Replace and Keep. |
| 320 px and both themes | No horizontal scroll, controls inside the list, 44 px touch targets in light desktop, light 320 and dark 320 (`captures/06` to `08`). Dark desktop is in `captures/01` to `05`. |

## Gaps

- Touch input, real `touch-action` behaviour and screen readers were not tested. Everything was driven with a mouse and keyboard.
- Safari and Firefox were not tested. WebKit is not installed in this environment.
- No memory, isolation-speed or first-play measurements were taken (scenario 29-05).
- Waveform generation for before and after previews takes several seconds in the dev server, because each output is fetched, inspected and decoded one at a time. Until then the row shows a plain seek rail.
- Stereo peaks use the largest extreme of any channel per bin, so a hard-panned or out-of-phase channel draws at full height. A mono-compatible mix and a one-sided mix look alike.
- Other browser scripts that need a WebKit install, a Demucs model download or a production build were not rerun. `sprint-24-check`, `sprint-25-check` and `sprint-26-check` pass against the new UI. `ui-states-check` was updated for the new player markup but not rerun to completion because its model-download scenarios time out here.
- `scripts/sprint-25-check.mjs` asserted that no per-file trim button exists. Sprint 29 restores per-file trim on the waveform, so that assertion now expects the button.
- Idle and played bar contrast in the light theme is 1.71:1, and the dark trim line against played bars is 1.98:1. The halo, the bracket shape and the playhead mitigate this, and the colours were left as they are.
- Shift means a finer step in the Trim all fields but a coarser step on the waveform handles.
- `peaks-client` and `peaks-worker` duplicate `levels-client` and `levels-worker`.
- No screen reader (VoiceOver) pass was done.
