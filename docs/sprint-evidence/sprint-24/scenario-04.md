# Scenario 04. Preview and export consistency

Date: 2026-10-31. Branch: `codex/sprint-24-loudness`.

## Observed in Chrome

`scripts/sprint-24-check.mjs` loaded `tests/fixtures/tone.wav`, added a compressor, moved it before the loudness normalizer, previewed the 2 s file, exported MP3, and separately exported a high-crest fixture to exercise the ceiling.

- Preview panel: `Compressor reduced peaks by up to 1.5 dB in this excerpt.` The preview state carries the processed pass `DspStats`, including `compressorMaxGainReductionDb`.
- MP3 export result: `Loudness target reached. Achieved -14.0 LUFS.` and `Compressor max gain reduction 1.5 dB.`
- High-crest export result: `Peak ceiling limited loudness. Achieved -34.3 LUFS at an estimated -2.0 dBTP.` The requested target was -14 LUFS at a -1 dBTP ceiling, so success is not claimed.
- `pageErrors` is empty. The browser check JSON records the exact strings.

After the review fixes, a 16 kHz burst export at -8 LUFS with a -0.3 dBTP ceiling reported `Peak ceiling limited loudness. Achieved -11.1 LUFS at an estimated -1.3 dBTP.` ffmpeg measured the exported file at -0.4 dBTP, which is 0.1 dB below the requested -0.3 dBTP ceiling; it is not exactly on the ceiling and this file does not prove tighter accuracy. A Normalize then Compressor 100% flow now reads `Loudness target reached at the Normalize step. Achieved -14.0 LUFS. Later steps can change the final level.` ffmpeg measures that file at -19.9 LUFS; the result no longer claims a final loudness. A Normalize then Gain +6 flow is qualified the same way, and a later Channels step is included in the same detection. A 0 dBTP Peak-mode export reads `Peak target applied at the Peak step. Estimated true peak 0.0 dBTP against a 0.0 dBTP target.` ffmpeg measured the saved WAV at -0.0 dBTP, so the target was reached on this fixture. That is one 1 kHz tone file, not a general accuracy bound; the result still labels the peak as an estimate. `scripts/sprint-24-check.mjs` also passes at the fixed head against `http://127.0.0.1:5185/audio-toolkit-v1/`.

## Evidence

- `browser-check.json`
- `captures/04-preview-compressor.png`
- `captures/05-export-result.png`
- `captures/06-ceiling-limited.png`
- `captures/08-peak-result.png`

## Limits

- Excerpt loudness is labeled an estimate because full-track gating can differ. The app does not claim a guaranteed full-track measurement from a 15 s preview.
- MP3 encoder overshoot is not measured by this sprint's UI feedback. The result text is derived from pre-encode PCM statistics.
- No listening check or physical-device acceptance is claimed.
