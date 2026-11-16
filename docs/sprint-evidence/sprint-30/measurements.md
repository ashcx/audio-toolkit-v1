# Sprint 30 measurements, before and after

Real app, Chromium only (WebKit not run: not installed). Each cell is the baseline at the base head `3c6ae13` (built in a throwaway worktree and driven by the same script), then the value now at `b14d11b`. Both sides run the same flow at each viewport: the fixtures `tone-20.wav` (20 s), `field-recording-with-a-very-long-descriptive-name-take-7.wav` (12 s, a 60-character name) and `tone-15.wav` (15 s), light scheme, fine pointer, a Trim all step of 2 to 10 s, then Export. Numbers are `getBoundingClientRect` heights in px.

Regenerate the table with `ENGINES=chromium node scripts/sprint-30-check.mjs --task T7` (writes `measurements.json`) and `node scripts/sprint-30-check.mjs --table`. Baseline data: `three-baseline.json` (run with `SPRINT30_BASE=3c6ae13 APP_URL=<base preview> ... --three`). Earlier single-file baseline: `baseline-measurements.json`.

| Measure in px, baseline to now | 320x700 | 375x812 | 768x1024 | 1024x768 | 1440x900 |
| --- | --- | --- | --- | --- | --- |
| Finished row as first shown (tallest of 3) | 270 to 61 | 270 to 61 | 235 to 61 | 249 to 61 | 235 to 61 |
| Collapsed finished row (tallest of 3) | none to 61 | none to 61 | none to 61 | none to 61 | none to 61 |
| Expanded finished row (tallest of 3) | 270 to 172 | 270 to 172 | 235 to 157 | 249 to 157 | 235 to 157 |
| Unprocessed row, no steps and no Preview (tallest of 3) | 216 to 109 | 195 to 109 | 181 to 109 | 195 to 109 | 181 to 109 |
| Unprocessed row with a Trim all step and Preview (tallest of 3) | 259 to 146 | 238 to 146 | 203 to 131 | 217 to 131 | 203 to 131 |
| First-row offset from the panel top | 135 to 69 | 135 to 69 | 135 to 69 | 135 to 73 | 135 to 73 |
| Empty-state box, fine pointer | 220 to 160 | 220 to 160 | 220 to 160 | 240 to 160 | 240 to 160 |
| Waveform width in an expanded finished row | 218 to 148 | 273 to 203 | 666 to 596 | 402 to 324 | 514 to 436 |
| Rows that fit in 812px of list (812 divided by the tallest finished row, rounded down) | 3 to 13 | 3 to 13 | 3 to 13 | 3 to 13 | 3 to 13 |
| Total height of 3 finished tracks | 733 to 178 | 733 to 178 | 698 to 178 | 712 to 178 | 698 to 178 |

How to read it.

- A row says "tallest of 3" because the rows differ. At 320 and 375 the base head's tallest finished row is 270px, and `baseline-measurements.json` recorded 263px for the long-name file there, so the long name is the likely cause (inferred). Now the name is one ellipsised line. The 235px there is the same app with a short name.
- The baseline has no collapsed state, so its finished row is also its expanded row. The sprint ceilings are collapsed at most 64px, expanded at most 176px not counting a result note, unprocessed at most 120px without Preview, first-row offset at most 80px. Now: 61px, 172px at 320 and 375 and 157px at 768 and up, 109px, 69px at 320 to 768 and 73px at 1024 and 1440. All pass at every viewport in light, dark, a reduced-motion pass and (at 768 and below) a touch pass.
- With a Trim all step the unprocessed row shows the Preview button and grows to 146px at 320 and 375 and 131px at 768 and up. That is over the 120px figure, which the sprint states for rows without Preview, so it is reported here and not asserted.
- A row open in Trim editing is 388px at 320 and 373px at 375 and up (the 130px editor, its start and end fields and the switch row). The sprint sets no ceiling for it and the baseline editing row was not measured.
- The waveform in an expanded finished row is 148px at 320 and 203px at 375, which meets the 140px and 190px minimums, and is 70px (at 320, 375 and 768) to 78px (at 1024 and 1440) narrower than the baseline because it now shares the row with the play button and Trim.
- The empty-state box is 160px with a fine pointer at every width (112px with a coarse pointer, measured in `t7.txt`).
- "Rows that fit in 812px of list" is 812 divided by the tallest finished row, a calculation and not a measured screen. A count of rows visible without scrolling was dropped because it depends on where the page happened to scroll.
- Total height of 3 finished tracks is the sum of the three row heights, which is the height the rows take up when no inner scroll applies.
