# Scenario 05. Optional compressor

Date: 2026-10-31. Branch: `codex/sprint-24-loudness`.

## Processor

- Linked stereo detection uses the maximum absolute sample across channels, so both channels receive the same gain.
- Feed-forward gain reduction with attack/release smoothing, no automatic makeup gain.
- Speech preset starts at -24 dB, 2.5:1, 5 ms attack, 120 ms release. Music starts at -18 dB, 2:1, 15 ms attack, 200 ms release. Amount scales the ratio toward 1 and raises the threshold toward 12 dB less compression.
- Gain reduction is clamped to 60 dB and state is carried across block boundaries. Output is finite for finite input.
- Disabled or amount 0 is an exact bypass.

## Automated checks

`tests/compressor.test.mjs` covers:

- preset values and amount scaling;
- exact bypass for disabled and zero amount;
- gain reduction on a loud section and release into a quiet section;
- stereo-linked identical gain on both channels;
- identical output for 17-frame and 4096-frame chunking;
- finite, bounded output on a clipped square wave;
- abort cancellation before the first block;
- maximum gain reduction bounded to 60 dB.

`tests/preview.test.mjs` also checks that a ready preview carries `compressorMaxGainReductionDb` from the processed pass and reports 0 for a bypassed compressor.

## Control surface

Captures: `captures/03-compressor-controls.png`, `captures/04-preview-compressor.png`.

The UI exposes only an enable checkbox, one amount slider, and a speech/music preset select. No threshold, ratio, attack, release or makeup controls are exposed. The helper text recommends compressor before normalization and states that explicit order is respected.

## Not verified

Listening for pumping, distortion and speech clarity was not performed. This sprint does not claim audible acceptance or physical-device coverage.
