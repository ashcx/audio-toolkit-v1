# Responsive default expansion, before and after

Real app, Chromium only (WebKit not run: not installed). Light scheme, fine pointer. Viewport heights: 700 (320), 812 (375), 900 (600, 601 and 1440), 1024 (768), 768 (1024). Each cell is the base build at `1fd1cbc` (built in a throwaway worktree and served from a copy of its `dist`), then the build with this change. Both sides run the same flow: three files (`tone-20.wav`, a 60-character name, `tone-15.wav`), a Trim all step of 2 to 10 s, Export, then (in a fresh page) a Trim all step and a Gain step added with no further tap. Numbers are `getBoundingClientRect` heights. Dark gives the same numbers (see `responsive-heights-now.json`).

Mobile means a viewport of at most 600px. At 601px and up nothing changes in the Steps panel (the Gain step is open, as before), and the Files rows start expanded.

| Measure in px, base 1fd1cbc to now | 320 | 375 | 600 | 601 | 768 | 1024 | 1440 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Steps panel with Trim all and Gain added | 517 to 274 | 517 to 274 | 517 to 274 | 517 to 517 | 517 to 517 | 517 to 517 | 517 to 517 |
| Files panel with 3 finished tracks | 260 to 260 | 260 to 260 | 260 to 260 | 260 to 578 | 260 to 578 | 268 to 586 | 268 to 586 |
| Finished rows (3 tracks, as first shown) | 61/61/56 to 61/61/56 | 61/61/56 to 61/61/56 | 61/61/56 to 61/61/56 | 61/61/56 to 167/167/162 | 61/61/56 to 167/167/162 | 61/61/56 to 167/167/162 | 61/61/56 to 167/167/162 |

Regenerate: `ENGINES=chromium node scripts/sprint-30-check.mjs --heights now` (or `--heights before` with `APP_URL` set to a preview of the base build). The full `--task T10` run also rewrites `responsive-heights-now.json`.

How to read it.

- Steps panel at 375px: 517 to 274, a saving of 243px. On a phone the Gain step no longer opens by itself, so the "Your audio" readout and the slider are one tap away.
- Files panel with 3 finished tracks: unchanged on mobile (260px, rows collapsed as before). At 601px and up the rows now start expanded, so the panel grows from 260 or 268px to 578 or 586px. That is the requested default, and the rows are still under the 176px ceiling (167, 167 and 162px).
