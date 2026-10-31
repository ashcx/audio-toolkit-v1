# Sprint 26 verification

2026-10-31. Sprint 26 exposes only the encoding modes measured on the real backend. MP3 remains constant bitrate. AAC adapts to content and exposes no mode control. Opus exposes CBR and VBR. WAV, FLAC and direct stream copy expose no mode or bitrate control.

## Commands

- `npm test` from `/private/tmp/audio-sprint26`: 104 tests, 104 pass, 0 fail.
- `npm run build`: pass. Vite reports only its Node 22.11 and chunk-size warnings.
- `APP_URL=http://127.0.0.1:4175/audio-toolkit-v1/ node scripts/sprint-26-check.mjs`: 13 real exports pass. Opus CBR had one packet size, Opus VBR had 74, MP3 had one, AAC varied with content.
- `PATH=/opt/homebrew/bin:$PATH FORMAT_CHECK_ENGINE=chromium FORMAT_CHECK_FORMAT=opus APP_URL=http://127.0.0.1:4175/audio-toolkit-v1/ node scripts/format-check.mjs`: 11 Opus downloads plus invalid-setting recovery pass, including the VBR path.
- The LAME adapter receives a bitrate only, with no VBR flag in the path. MP3 therefore shows CBR only, and its export produced a single packet size of 384 bytes. Opus CBR produced fixed 320-byte packets; VBR produced 74 sizes from 259 to 510 bytes. AAC's content-dependent bitrate still varied, so the UI calls it adaptive rather than CBR.

## Observed

- Export controls: MP3 shows a constant-bitrate note and no mode select. M4A shows an adaptive variable-bitrate note and a target bitrate. Opus shows CBR/VBR; VBR relabels the bitrate as a target. WAV and FLAC show Format only. Stream copy shows Format only.
- Legacy recipes without `mode` parse as CBR for MP3/Opus and adaptive VBR for M4A. Invalid combinations fail validation.
- No-recipe Preview stays hidden after selecting a format or mode.
- The completed player uses the encoded output; player `src` and download `href` match.
- Captures and `result.json` are in this folder.

## Limits

- Only Chromium on macOS was driven. WebKit/Safari and the vendored AAC fallback were not exercised.
- No real speech or music fixtures were available. The audit used a synthetic tone, silence and transient-heavy audio.
- Times are single end-to-end runs, not interleaved benchmarks. No speed claim is made.
- The AAC claim is content-dependent: the encoded bitrate varies with the fixture at the same target. It is not a fixed file-size promise.
- Listening and physical-device acceptance were not performed.
