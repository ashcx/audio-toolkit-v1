# Scenario 01. Independent loudness and true-peak reference

Date: 2026-10-31. Base: `32356a4` (`origin/main`). Branch: `codex/sprint-24-loudness`.

## Method

- K-weighting uses the libebur128/BS.1770 analog prototypes at the source rate. At 48 kHz the shelf and high-pass coefficients match the published BS.1770 values within `1e-6` in `tests/loudness.test.mjs`.
- Integrated loudness uses 400 ms blocks at a 100 ms hop, a -70 LUFS absolute gate, and a -10 LU relative gate. Audio shorter than 400 ms uses one estimated block and sets `short`.
- True peak uses the BS.1770-5 Annex 2 4-phase, 12-tap-per-phase FIR with a 12-sample causal history and 11 zero flushes at finish. Loudness ceiling decisions keep a documented 1.0 dB meter guard; peak-mode targets aim at the requested dBTP directly. Reported peaks remain the measured value.
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

Tolerance: 0.5 dB for true peak and 0.5 LU for integrated loudness, except the 0.3 LU rows where the reference runner applies 0.3. The intersample row reads 0.39 dB below the ffmpeg estimate. That is a difference from ffmpeg, not proof of a consistent absolute under-read: a phase sweep near Nyquist made this meter read up to 0.64 dB above ffmpeg. The 1.0 dB guard covers a few tenths of a dB of disagreement in either direction, and can be conservative or insufficient against another meter. With a -0.3 dBTP ceiling the exported file measured -0.4 dBTP by ffmpeg, 0.1 dB below the requested ceiling. That is inside the ceiling, but it is not an exact ceiling hit.

Final runner output: `PASS: all independent loudness/true-peak tolerances met.`

## Review fix

The first implementation compared the source true peak with the ceiling before applying the requested gain. A quiet, high-crest source targeted upward therefore bypassed the ceiling. The reviewer reproduced it in Chrome: the transient fixture at -8 LUFS with a -0.3 dBTP ceiling reported `Loudness target reached. Achieved -8.0 LUFS.` and `Clipped samples.`

The comparison now uses `guardedTruePeak * gainFactor`, so it judges the peak after gain. A regression test builds a quiet burst signal whose source peak is below the ceiling but whose requested gain would exceed it; it fails against the old comparison and passes now. A 16 kHz burst export at -8 LUFS with a -0.3 dBTP ceiling reported `Peak ceiling limited loudness. Achieved -11.1 LUFS at an estimated -1.3 dBTP.` ffmpeg measured the exported file at -0.4 dBTP, 0.1 dB below the requested ceiling, and no clipped samples were reported. The export stays inside the ceiling, but the margin is not tighter than 0.1 dB on this fixture. The full suite is 123 passing tests.

## Unit-level checks

`tests/loudness.test.mjs` covers the 48 kHz coefficient fixture, a 1 kHz stereo -20 dBFS sine near -20 LUFS (two equal channels add 3 dB over mono), silence, 100 ms short audio, gated tone plus silence, the 4x intersample fixture, loudness-ceiling limiting including the gain-pushed quiet-source case, true-peak peak mode with the guard, silence feedback, and legacy sample-peak compatibility.

## Gaps

- Lossy decoded exports were not measured with ffmpeg. Report feedback is computed from pre-encode PCM stats; an encoded MP3 can overshoot.
- Listening and physical-device acceptance were not performed and are not claimed.
