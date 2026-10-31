# Sprint 25 verification

2026-10-31. The workspace keeps Files left and Recipe right. Ordinary rows show the filename and duration only. A changed Trim all range adds one line such as `00:01 · 00:00 to 00:01`. The original player appears after intake and does not start processing. Preview appears only when the recipe has a step and no completed export matches it. Completed exports render a direct player, a `Previous export` label after a recipe edit, and an icon download bound to the same completed output. Actions read Clear all, Save to device, Export.

## Commands

- `npm test` from `/private/tmp/audio-sprint25`: 100 tests, 100 pass, 0 fail.
- `npm run build`: pass. Vite reports only its Node 22.11 and chunk-size warnings.
- `npm run verify:static`: pass, including AAC and isolation hashes.
- `APP_URL=http://127.0.0.1:5183/audio-toolkit-v1/ node scripts/sprint-25-check.mjs`: pass. It recreated the captures and `result.json`, including preview cancellation, Clear all during preview, cleanup retry, automatic-format retention, focus recovery and the 320 long-token check.
- `RECIPE_CHECK_ENGINE=chromium APP_URL=http://127.0.0.1:5183/audio-toolkit-v1/ node scripts/recipe-check.mjs`: pass for shared Trim all, validation recovery, keyboard and drag reorder, trim removal and mobile order.
- `PATH=/opt/homebrew/bin:$PATH FORMAT_CHECK_ENGINE=chromium FORMAT_CHECK_FORMAT=mp3 APP_URL=http://127.0.0.1:5183/audio-toolkit-v1/ node scripts/format-check.mjs`: 12 downloaded MP3 checks pass, including a gain fixture whose decoded waveform differs from the source.

## Observed in Chrome

`scripts/sprint-25-check.mjs` drives system Chrome with `chromium.launch({channel:'chrome'})`. It loaded `tone.wav` and `tone.mp3`, applied Trim all 00:00 to 00:01 and Gain, previewed, exported, edited Gain, then cleared all.

- Empty recipe row: `tone.wav`, `00:02`, original player, no Preview button.
- Trim all row: `tone.wav`, `00:01 · 00:00 to 00:01`, Preview, original player.
- Preview ready: `Original excerpt` and `Processed preview`, no duplicate ordinary original player. Playing the second paused the first. Exactly one of two players was playing.
- Export: `2/2 done`, `Exported audio` player, no `Listen`. The download icon and the player shared the same blob URL, and that URL differed from the source blob.
- Edited recipe: `Previous export`, `Download previous export for tone.wav`, Preview returned.
- Clear all: file list empty, Trim all and Gain retained, format still MP3, temporary storage count 0.
- Clear all during a 60 s export: file list empty, storage count 0, recipe retained.
- Unsupported playback type: explanation shown, no broken player.
- Stream copy of `video.mkv`: `Exported audio`, `No re-encoding.`
- 320 px dark and 390 px light and dark had no horizontal overflow. The export footer stacked status above actions and the buttons wrapped in order.

`result.json` records the exact strings. `captures/` holds the screenshots.

## Limits

- WebKit/Safari was not run. The Chromium path is verified.
- Physical-device and listening acceptance were not performed and are not claimed.
- WebKit/Safari, physical-device and listening acceptance, and Save to folder were not exercised. The focused Chromium checks are the verified surface.
- The full four-format matrix was not rerun. A focused MP3 format check passed.
- `Clear results` remains inside Save to device as a distinct action. It clears results while keeping files. Clear all is the new top-level action.

## Residual

The batch Save to device path (ZIP and folder) still includes retained previous outputs and has no batch-level Previous marker. Per-file playback and download are correctly labeled. This is a follow-up outside the per-file download contract verified here.
