# Scenario 01. Independent loudness and true-peak reference

Date: 2026-10-31. Base: `4d4395a` (`origin/main`). Branch: `codex/sprint-24-loudness`.

## Method

- K-weighting uses the libebur128/BS.1770 analog prototypes at the source rate. At 48 kHz the shelf and high-pass coefficients match the published BS.1770 values within `1e-6` in `tests/loudness.test.mjs`.
- Integrated loudness uses 400 ms blocks at a 100 ms hop, a -70 LUFS absolute gate, and a -10 LU relative gate. Audio shorter than 400 ms uses one estimated block and sets `short`.
- True peak uses the BS.1770-5 Annex 2 4-phase, 12-tap-per-phase FIR with a 12-sample causal history and 11 zero flushes at finish. Ceiling decisions keep a documented 0.4 dB meter guard; reported peaks remain the measured value.
- The channel weights are 1 for mono and stereo.

## Independent reference

Reference tool: ffmpeg `ebur128=peak=true`, recorded by the reviewer at `/Users/macbook/Documents/test/audio-toolkit-v1/.artifacts/loudness-reference.mjs`.

Command run from the main checkout (read-only for this worktree):

```
node --experimental-strip-types .artifacts/loudness-reference.mjs
```

| Fixture | Reference I (LUFS) | Measured I | Reference TP (dBTP) | Measured TP | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| sine-1k-minus20.wav | -20.0 | -19.99 | -20.0 | -19.99 | pass |
| gate-tone-silence.wav | -20.9 | -20.89 | -20.0 | -19.99 | pass |
| intersample.wav | 2.4 | 2.44 | -0.3 | -0.69 | pass (0.39 dB) |
| mono.wav | -23.0 | -23.00 | -20.0 | -19.99 | pass |
| transient.wav | -19.3 | -19.34 | -1.5 | -1.53 | pass |
| silence.wav | null | null | null | null | pass |
| short.wav | null (informational) | -23.0 | -20.0 | -19.99 | informational, `short = true` |

Tolerance: 0.5 dB for true peak and 0.5 LU for integrated loudness, except the 0.3 LU rows where the reference runner applies 0.3. The intersample row is the important one for the ceiling: the FIR under-reads the ffmpeg estimate by 0.39 dB, inside the 0.5 dB budget. The 0.4 dB ceiling guard covers that documented tolerance, so the measured output peak stays at or below the requested ceiling.

Final runner output: `PASS: all independent loudness/true-peak tolerances met.`

## Review fix

The first implementation compared the source true peak with the ceiling before applying the requested gain. A quiet, high-crest source targeted upward therefore bypassed the ceiling. The reviewer reproduced it in Chrome: the transient fixture at -8 LUFS with a -0.3 dBTP ceiling reported `Loudness target reached. Achieved -8.0 LUFS.` and `Clipped samples.`

The comparison now uses `guardedTruePeak * gainFactor`, so it judges the peak after gain. A regression test builds a quiet burst signal whose source peak is below the ceiling but whose requested gain would exceed it; it fails against the old comparison and passes now. The same Chrome flow at the fixed head reports `Peak ceiling limited loudness. Achieved -18.5 LUFS at -0.7 dBTP.` with no clipped samples. The full suite is 117 passing tests.

## Unit-level checks

`tests/loudness.test.mjs` covers the 48 kHz coefficient fixture, a 1 kHz stereo -20 dBFS sine near -20 LUFS (two equal channels add 3 dB over mono), silence, 100 ms short audio, gated tone plus silence, the 4x intersample fixture, loudness-ceiling limiting including the gain-pushed quiet-source case, and peak mode reaching its sample-peak target.

## Gaps

- Lossy decoded exports were not measured with ffmpeg. Report feedback is computed from pre-encode PCM stats; an encoded MP3 can overshoot.
- Listening and physical-device acceptance were not performed and are not claimed.
