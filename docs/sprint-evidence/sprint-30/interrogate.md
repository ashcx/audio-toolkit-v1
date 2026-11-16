# Sprint 30 gate record

## Intent

Make the Files panel far more compact at every width (phone, tablet, desktop) with no loss of function and no touch target under 44px. Add files moves into the panel heading. The play button, waveform and Trim share one row. The duration shows once as a live position. A finished file has one player with an Original and Result switch that keeps the position, and finished rows collapse to one line.

## Scope reviewed

- Base `3c6ae13` (origin/main). Code-ready head `8242747`.
- Five independent Sonnet workers on the built app in Chromium, each unable to edit the repo, each writing its own scripts under `.artifacts/gate/` (not committed). WebKit is not installed, so nothing was run in WebKit.
- The coordinator reran each reported issue from the lane's own script on the same head.

| Lane | Slice | Result |
| --- | --- | --- |
| A | Add files button, panel drop target, compact rows | PASS, no issues |
| B | One-row player, seek, live position, trim editing | 1 low issue |
| C | Original and Result switch, position carry | 1 low issue |
| D | Collapsed rows, per-state defaults, keyboard, accessibility | 4 minor issues |
| E | Regression against the base build | Not completed. See below. |

## Verified findings (all low, all open)

The user reviewed the findings and decided they are fine for this PR. None is fixed in it.

1. **Unknown duration shows no live position (lane B).** A playable file whose length the inspection could not read, such as `tone.aac`, keeps the text `Duration unknown` in the file line while it plays. The slider text reads `00:01 of 00:02`. Reproduced with `node .artifacts/gate/laneB/p2.mjs`. The base showed a live readout in the player. Cause: the row only passes the readout target when the inspected duration is known, and `intake-check` asserts the `Duration unknown` text.
2. **A very fast double switch loses the position (lane C).** Two Original/Result switches with 1ms between clicks lose the carried time. Reproduced with `node .artifacts/gate/laneC/p2b.mjs` (playing, 1ms gap: 6.0s instead of about 13.5s). With 4 to 12ms gaps it passed in my rerun, and from 20ms up it passed in every run. A person cannot click that fast. The window grows only if a result's metadata is slow to load. Cause: the second switch reads the player's time before the new source has loaded.
3. **`--:--` flash when collapsing from Original (lane D).** For under 100ms the collapsed line reads `00:00 / --:--` before the Result's metadata loads. Reproduced with `node .artifacts/gate/laneD/p5.mjs`.
4. **Collapsed progress line is invisible in forced-colors mode (lane D).** The 2px line and its track both compute to white. Reproduced with `node .artifacts/gate/laneD/p6.mjs`. A collapsed row has no other progress indicator besides the time text. The reviewer read computed colors only and did not look at the screenshot.

## Known behavior, not defects

- Tab order in a collapsed row is name, download, remove, play, while play is shown first. The `<audio>` stays mounted so playback survives a toggle, and moving it in the DOM would pause it.
- The collapsed toggle has no `aria-controls`, and a collapsed row has no scrub control or spoken position. The "done" announcement is still spoken.
- A row showing a result from older settings is 78 to 83px collapsed, above the 64px target, because that notice stays visible. Download, Remove and Play stay reachable.
- Preview is available only on unexported rows. That is unchanged from the base.

## Not run, and gaps

- **Lane E (regression against trunk) did not finish.** The user ended the work before it reported. It had run flows on the base build and a few on the head, with no comparison produced, so there is no byte-for-byte check of exported files, no trunk-versus-head diff of the recipe and Export panels, and no 30-file performance comparison. Regression coverage rests instead on the existing drivers and the `ui-states-check` run described below. The swarm box in the Exit criteria is therefore left unticked.
- **WebKit, iOS Safari and Android** were not run.
- A result with a genuinely different duration (a different sample rate), Retry from a failed export, and real OS drag and drop were not exercised.
- `axe` was skipped (not installed, no network).

## Process issues faced

- Plan review found that `intake-check` and `sprint-25-check` need a running preview server and `ENGINES=chromium`. WebKit is not installed. The Entry criteria were rewritten with the exact forms.
- The first launch of the T5 to T6 owner went out with a cut-off brief and a wrong path. It was stopped before it changed anything and relaunched with the full brief.
- `ui-states-check` takes over an hour. It was killed twice during T1 to T4, then run in full once in T7 against a copy of `dist`. Result: 11 FAIL lines against 16 at the base, all in the base list (blob `ERR_ABORTED` console lines and storage-full timeouts). One extra failure appeared only while another check ran at the same time and passed on four reruns. The base failures that no longer recur were most likely matching the old time readout. Not rerun on the base to confirm.
- A pause and resume checkpoint was published. Reading it first returned a stale earlier checkpoint that pointed at a changed `TODO.md`. Republishing fixed it.
- One `ps` listing printed environment variables, and one looked like an API key. It was not used or recorded.
- The Bash safety check errored intermittently and a retry worked.
- Owner and reviewer reports were delivered more than once.
- The repo-wide `check-sprints.mjs` cannot pass, because sprints 1 to 29 predate its frontmatter. The sprint file was validated in an isolated root.

## Verdict

**Gate incomplete.** Lanes A to D ran on the code-ready head and found four low issues, all reproduced and all accepted by the user as open. Lane E, the regression lane, did not complete. This is not a claim of full independent review. The sprint stays `in-progress` and the swarm box stays unticked. The PR is for the user to review, and it is not merged.

## Resolved

The four open issues were fixed afterwards by a fresh owner on head `caef2b5`, one commit each, each with a check that failed on the old code and passes now. All checks are in `scripts/sprint-30-check.mjs` section T8 (`ENGINES=chromium node scripts/sprint-30-check.mjs --task T8`, `--issue N` for one issue). Chromium only, WebKit not run.

| Issue | Commit | Proving check |
| --- | --- | --- |
| 1. Unknown duration shows no live position | `e9b00b7` | T8 "unknown duration": the line is the unknown text until the length is known, then equals the slider position and total while playing, after pause, seek and end, for tone.aac with and without a mime type. Unplayable source and a file still being read keep the static text. |
| 2. A very fast double switch loses the position | `4000f67` | T8 "rapid switches": source load delayed 300ms, 0, 1 and 4ms gaps, 2, 3, 4 and 11 switches, 5 repetitions each, with and without a trim, playing and paused. Unit tests for the pure `retarget` in `tests/view-position.test.mjs`. |
| 3. `--:--` flash when collapsing from Original | `fba619c` | T8 "no --:--": a requestAnimationFrame sampler of `.file-position` through expand, switches and collapse in both directions, with and without a trim, with the source load delayed 300ms and no waveform. No sample contains `--:--` and the result total shows from the first frame. |
| 4. Collapsed progress line invisible in forced colors | `6dbd580` | T8 "collapsed progress line": with forced colors active at 320, 375 and 1440, light and dark, the track and the fill differ, the fill differs from Canvas, the fill width follows playback, and the normal-mode colors are unchanged. Screenshots `captures/t8-forced-colors-*.png`. |

Details that matter:

- Issue 1: Chrome loads the metadata of a blob source even with `preload="none"`, so the unknown text now lasts only until `loadedmetadata`. `intake-check` asserted the unknown text on a row that can already have measured the file, so that assertion now accepts the unknown text or the live total. The strict unknown-text check moved to T8, where the source load is delayed.
- Issue 3 also changes what shows while the length is unknown: the line reads `Duration unknown`, never `--:--`.
- Issue 4 in the Chromium forced-colors emulation: light track `rgb(96, 0, 0)` with fill `rgba(5, 0, 73, 0.8)`, dark track `rgb(63, 242, 63)` with fill `rgba(26, 235, 255, 0.8)`. In the light emulation the two are both dark and differ mainly in hue, so they read as distinct but not high contrast.
- Still open and unchanged: lane E (regression against trunk) did not run, and the not-run list above (WebKit, iOS Safari, Android, `axe`, real OS drag and drop, a result with a genuinely different duration, Retry from a failed export).
