# Scenario 04. Preview and export consistency

Date: 2026-10-31. Branch: `codex/sprint-24-loudness`.

## Observed in Chrome

`scripts/sprint-24-check.mjs` loaded `tests/fixtures/tone.wav`, added a compressor, moved it before the loudness normalizer, previewed the 2 s file, exported MP3, and separately exported a high-crest fixture to exercise the ceiling.

- Preview panel: `Compressor reduced peaks by up to 1.5 dB in this excerpt.` The preview state carries the processed pass `DspStats`, including `compressorMaxGainReductionDb`.
- MP3 export result: `Loudness target reached. Achieved -14.0 LUFS.` and `Compressor max gain reduction 1.5 dB.`
- High-crest export result: `Peak ceiling limited loudness. Achieved -33.7 LUFS at -1.4 dBTP.` The requested target was -14 LUFS at a -1 dBTP ceiling, so success is not claimed.
- `pageErrors` is empty. The browser check JSON records the exact strings.

## Evidence

- `browser-check.json`
- `captures/04-preview-compressor.png`
- `captures/05-export-result.png`
- `captures/06-ceiling-limited.png`

## Limits

- Excerpt loudness is labeled an estimate because full-track gating can differ. The app does not claim a guaranteed full-track measurement from a 15 s preview.
- MP3 encoder overshoot is not measured by this sprint's UI feedback. The result text is derived from pre-encode PCM statistics.
- No listening check or physical-device acceptance is claimed.
