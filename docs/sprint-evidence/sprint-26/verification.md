# Sprint 26 verification

2026-10-31. Sprint 26 exposes only the encoding modes measured on the real backend. MP3 and AAC remain constant bitrate. Opus exposes CBR and VBR. WAV, FLAC and direct stream copy expose no mode or bitrate control.

## Commands

- `npm test` from `/private/tmp/audio-sprint26`: 104 tests, 104 pass, 0 fail.
- `npm run build`: pass. Vite reports only its Node 22.11 and chunk-size warnings.
- `APP_URL=http://127.0.0.1:5184/audio-toolkit-v1/ node scripts/sprint-26-check.mjs`: 11 real exports pass. Opus CBR had one packet size, Opus VBR had 74, MP3 had one.
- `PATH=/opt/homebrew/bin:$PATH FORMAT_CHECK_ENGINE=chromium FORMAT_CHECK_FORMAT=opus APP_URL=http://127.0.0.1:5184/audio-toolkit-v1/ node scripts/format-check.mjs`: 11 Opus downloads plus invalid-setting recovery pass, including the VBR path.
- The earlier worker-level audit at `.artifacts/encode-audit` compared `bitrateMode` constant and variable. MP3 and AAC were unchanged; Opus changed from fixed 320-byte packets to 259-452-byte packets.

## Observed

- Export controls: MP3 and M4A show a constant-bitrate note and no mode select. Opus shows CBR/VBR. VBR relabels the bitrate as a target. WAV and FLAC show Format only. Stream copy shows Format only.
- Legacy recipes without `mode` parse as CBR. Invalid mode combinations fail validation.
- No-recipe Preview stays hidden after selecting a format or mode.
- The completed player uses the encoded output; player `src` and download `href` match.
- Captures and `result.json` are in this folder.

## Limits

- Only Chromium on macOS was driven. WebKit/Safari and the vendored AAC fallback were not exercised.
- No real speech or music fixtures were available. The audit used a synthetic tone, silence and transient-heavy audio.
- Times are single end-to-end runs, not interleaved benchmarks. No speed claim is made.
- Listening and physical-device acceptance were not performed.
