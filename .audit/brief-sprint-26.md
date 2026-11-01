# Sprint 26 owner brief

Worktree: `/private/tmp/audio-sprint26`, branch `codex/sprint-26-encoding`, base the
tip of `codex/sprint-25-playback`. Read the Sprint 26 file and the audit evidence in
`/Users/macbook/Documents/test/audio-toolkit-v1/.artifacts/encode-audit-constant/`
and `.artifacts/encode-audit/`.

## Measured capability

- Opus native: CBR is 320-byte fixed frames at 128 kbps; VBR is 259-452 bytes, median
  334, unique 73. Both modes are real.
- MP3 LAME wasm: 384-byte fixed frames, mode ignored by the adapter. CBR only.
- AAC native and the vendored fallback: output unchanged between modes; mode ignored.
  CBR only. Variable packet sizes alone are not VBR evidence.
- WAV, FLAC and original: no bitrate mode.

## Shape and UI

- Add `src/encoding-modes.ts` as the authority:
  `mp3: [cbr]`, `m4a: [cbr]`, `opus: [cbr, vbr]`, and no modes for wav/flac/original.
- Add `mode` to mp3, m4a and opus export schemas. Legacy recipes without `mode` parse
  as `cbr`. Reject invalid combinations.
- New exports keep the current CBR behavior for every format. Opus exposes an
  `Encoding mode` select with Constant bitrate (CBR) and Variable bitrate (VBR).
  MP3 and AAC show no mode select and a short constant-bitrate note. WAV and FLAC show
  no bitrate or mode controls. Stream copy shows no mode.
- Label the Opus VBR bitrate as `Target bitrate (kbps)` and explain that it is a target,
  not a fixed file size. CBR keeps `Bitrate (kbps)`.
- `encoderSettings` passes `bitrateMode: "variable"` only for Opus VBR; every other
  format stays constant. `prepareEncoder` rejects a mode the backend cannot provide.
- Do not change the no-recipe Preview rule from Sprint 25. The completed export player
  must play the encoded output; the recipe preview stays a WAV excerpt estimate.

## Verification

- Add tests for the capability table, legacy parsing, valid/invalid combinations and
  encoder settings. Keep the full suite and build green.
- Update `scripts/format-check.mjs` for the Opus mode control and new bitrate label.
- Run real exports for Opus CBR and VBR, MP3 and AAC. Record encoder configuration,
  packet behavior, decodability, duration, channels, size and encoding time separately
  from any neural processing. Use ffprobe from `/opt/homebrew/bin/ffprobe`; the stacher
  binary is x86_64 and cannot run.
- Drive system Chrome on port 5184. Capture the Export card for each format, the Opus
  modes, a no-recipe state, and the encoded-output player. Save captures under
  `docs/sprint-evidence/sprint-26/captures/`.
- Commit in small ordered commits. No push or PR. Report commands, results and gaps.
