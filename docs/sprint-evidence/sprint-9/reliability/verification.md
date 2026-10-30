# Isolation reliability follow-up

Date: 2026-10-30. Base: main `5044472`. User goal: complete reliable voice and music exports on Chrome for Mac without an apparent restart loop. Private songs and outputs remain outside Git.

The full-song voice-plus-music reconstruction passed all 18,671,616 samples, with maximum error 0.000031025 and no saturated samples. Peak aggregate owned-browser RSS was 1,945,878,528 bytes. The eight-excerpt matrix peaked at 1,927,233,536 bytes. These are test-host resource observations, not Mac thermal claims. Anonymized results are in [results.json](results.json).

## Reproduced behavior

Playwright controlled the deployed GitHub Pages app and exported an anonymous 211.7-second MP3 with the default voice isolation and MP3 output. The export completed after 40 fresh model workers. Browser-decoded output contained 9,335,808 stereo frames at 44.1 kHz, all finite. RMS was 0.055486 and peak was 0.449119. The document did not reload. The browser was Linux HeadlessChrome 152, not a Mac.

The original status alternated between model initialization and separation on every window. A completed window did not advance a file-level progress bar. A worker that stopped responding had no deadline. A GPU error triggered a CPU retry for that window, then the next window attempted GPU again. These are verified source and executable lifecycle findings. The Mac's exact GPU failure or thermal cause has not been observed here.

## Changes

- PCM owns completed-window progress. Encoder startup and repeated worker initialization do not replace that progress.
- A GPU session or inference failure switches the rest of the file to CPU. A known GPU stall gets the same single fallback.
- Initialization stops after 120 seconds without completion. Inference stops after 300 seconds. CPU stalls fail visibly and release the worker. These are conservative per-window failure deadlines, not speed guarantees for slower devices.
- Cancellation from a progress callback cannot start a worker afterward. Cancellation and timeout ignore late results.
- The isolation hint states that processing may take several minutes.
- `/test_songs/` and browser automation downloads are ignored. No private audio is tracked.

Fresh model workers remain intentional. A five-call reused Chromium session with CPU memory arenas enabled stayed below the declared 2 GiB aggregate browser RSS guard. The same WebKit configuration exceeded the guard at 2,177,388,544 bytes after one completed call. This rejects a universal persistent-session change. These are single-run resource observations, not a speed comparison, physical memory measurement, or phone support claim.

## Verification matrix

| Check | Result |
| --- | --- |
| Build, model provenance, worker import check | PASS |
| All unit tests, including GPU fallback, deadlines, cancellation, silence, empty audio, frame grids, late-window failure cleanup | PASS, 46 tests |
| Known GPU and CPU stalls in Chromium, accelerated page clock, real model fallback or manual retry, store cleanup | PASS, 2 cases |
| Missing model and WASM runtime assets in Chromium, real model retry and store cleanup | PASS, 2 cases |
| WebKit CPU voice and music with 13-second overlapping and tail windows | PASS, both modes, exact frame counts and source reconstruction |
| WebKit corrupt-model verification failure, retry, cancel during download and inference | PASS |
| WebKit short-run aggregate browser RSS | PASS, 2,114,543,616 bytes under 2 GiB guard |
| Chromium isolation before and after trim, mono, resample, normalization | PASS, 2 cases |
| WebKit isolation before and after those operations | PASS, 2 cases |
| Browser storage cleanup failures and recovery | PASS, 6 cases across Chromium and WebKit |
| Downloaded export formats and invalid-setting recovery | PASS, 96 cases across Chromium and WebKit |
| Latest-build full anonymous MP3, voice and music, downloaded WAV decoding, progress and cleanup | PASS, both modes, 40 windows each and 9,335,808 stereo frames per export |
| Latest-build middle excerpts from all eight private songs, both modes | PASS, 16 exports, finite samples and exact decoded WAV frames, progress and cleanup |
| Eight excerpt voice-plus-music waveform reconstruction checks | PASS, maximum error 0.000030518 across 2,115,670 checked samples; 1,130 saturated output samples excluded and counted |
| Playwright tool control of updated desktop and mobile interface, voice, music, normalization, MP3 decode and result removal | PASS; normalized music peak 0.869774, exact 3-second decoded duration, zero remaining stores |
| Physical Mac Chrome, hardware GPU completion, heat, real-device Safari and Android | NOT VERIFIED |
| Subjective voice and music listening quality on the supplied recordings | NOT VERIFIED |

An earlier updated full-song run reached 25 of 40 windows before the browser session was interrupted. It is not counted as a pass. A new test harness initially matched both file and recipe removal buttons. Its selector was corrected before restarting the full-song checks. Neither infrastructure failure is an audio correctness result.

The full-song voice-plus-music reconstruction passed all 18,671,616 samples, with maximum error 0.000031025 and no saturated samples. Peak aggregate owned-browser RSS was 1,945,878,528 bytes. The eight-excerpt matrix peaked at 1,927,233,536 bytes. These are test-host resource observations, not Mac thermal claims. Anonymized results are in [results.json](results.json).

## Reproduce

Run `npm run build` and serve the build with `npm run preview`. Set `APP_URL` explicitly for every browser driver.

- `node --experimental-strip-types --test tests/*.test.mjs`
- `node scripts/isolation-recovery-check.mjs`
- `ISOLATION_CHECK_ENGINE=webkit node scripts/isolation-check.mjs`
- `node scripts/isolation-order-check.mjs`
- `node scripts/cleanup-check.mjs`
- `node scripts/format-check.mjs`
- `ISOLATION_SONG=.artifacts/private-alias.mp3 node scripts/isolation-song-check.mjs`

The song driver accepts comma-separated anonymous private paths. It downloads and decodes actual outputs, checks finite samples and exact WAV frame counts, observes the rendered progress labels, requires one active model worker at most, removes the result, and verifies storage cleanup. A separate browser-process monitor enforces the declared 2 GiB aggregate RSS guard. Private inputs, outputs, captures, and raw logs stay under ignored `.artifacts/`.

Run `node scripts/isolation-compare-check.mjs SOURCE VOICE.wav MUSIC.wav .artifacts/comparison.json` to compare decoded sample grids and voice-plus-music reconstruction. The tolerance is `1e-4`. Saturated 16-bit output samples are counted and excluded from this reconstruction assertion. Some supplied excerpts produce peaks above the output range after isolation. The existing clipping warning appears, and peak normalization after isolation removes it in the checked real excerpt. This is distinct from a stall or model restart.

## Independent interrogate

A Terra high reviewer reproduced a callback-cancellation fault. The parent reproduced it, fixed the worker startup boundary, and added a regression test. The updated reproduction returns `AbortError` with zero workers. A second integrated Terra high review reported no verified findings and passed 16 targeted tests plus the diff check. Reviewers did not claim Mac or thermal coverage. No comments were introduced in the product diff.

Fix Root Causes kept the fix at the worker lifetime and progress ownership boundaries. Model the Domain made completed isolation work a distinct event instead of another loading phase. Prove It Works requires actual downloads and decoded audio before a full-song pass.
