# Audio Toolkit

Local audio processing with an ordered recipe: extract original audio, trim, adjust gain, normalize peaks, change channels or sample rate, and isolate voice/music. Export MP3, AAC/M4A, WAV, FLAC or Opus/OGG. Test one file, then export the batch and download individual results or a stored ZIP.

The integrated branch has automated Chromium/WebKit evidence. Physical Mac/Safari/iPhone/iPad/Android and listening acceptance remain open. PR delivery and production deployment are separate; this branch has not been merged or deployed.

## Develop and verify

Requires Node.js 22+, npm, FFmpeg/ffprobe and Playwright browser dependencies for browser checks.

```sh
npm ci
npx playwright install chromium webkit
npm test
npm run verify:static
npm run build
npm run preview -- --port 4184
```

Open http://127.0.0.1:4184/audio-toolkit-v1/ . In a second terminal:

```sh
APP_URL=http://127.0.0.1:4184/audio-toolkit-v1/ npm run verify:browser
```

The browser command runs workspace, intake, recipe, copy, DSP, format, batch, cleanup, preview, download and privacy checks sequentially, stops on failure and writes an ignored `.artifacts/release-check/results.json`. The production preview must serve the matching build and stay unchanged during the suites. To rerun a failed stage, `RELEASE_CHECK_FROM=privacy` (or another stage name) checks preceding successes and URL only; it does not verify build contents. Rebuilds require a fresh full run. Linux WebKit may need `npx playwright install-deps webkit`. Browser contexts and servers bind locally. Synthetic fixtures are checked in; regenerate with `node scripts/generate-fixtures.mjs`. Private `test_songs/`, generated media, profiles and upstream checkout are ignored.

Large synthetic workload commands: `node scripts/download-check.mjs` includes 50 ten-second clips; `PCM_ONLY=1 node scripts/download-limits.mjs` checks one ten-minute WAV conversion. The full limits driver also verifies 20 synthetic one-hour AAC/M4A sources (about 1.7 MB each) using matching-container original-audio byte copying. It does not establish hour-long re-encoding or video remux limits. These are measurements of specified workloads, not unlimited-file claims.

## Use

Choose audio/video files, choose an editable preset or build a recipe, and select an output format. Trim ranges can be overridden per file. Test one file uses that file's complete current recipe; a matching result is reused once when exporting the batch. Changed settings require a new result. Native playback depends on the browser's supported codecs.

Download completed files individually or choose Create ZIP and then Download ZIP. Failed files do not enter the archive. Cancel waits for temporary writes and cleanup. If storage cleanup fails, use its retry control before starting more work. Clear results releases this tab's outputs. Save downloads before closing: there is no session restoration or background-processing promise.

See [formats and limits](docs/formats-and-limits.md), [architecture](docs/architecture.md), [privacy](docs/privacy.md) and [release acceptance](docs/release-acceptance.md).

## Development records

[TODO.md](TODO.md) tracks sprint delivery and open gates. [Feature requirements](todo/audio-toolkit-plan.md) own scope. [Third-party provenance](THIRD_PARTY_LICENSES.md) records pinned libraries, source/rebuild links, notices and remaining audit boundaries. [Sprint 12 evidence](docs/sprint-evidence/sprint-12/coverage.md) separates actual automation from unverified devices.

AudioTools.dev was inspected as an ignored reference. The image compressor is a read-only design reference, not a build dependency. This workspace supplies a navigation handoff; it does not implement changes in the media hub or image app.
