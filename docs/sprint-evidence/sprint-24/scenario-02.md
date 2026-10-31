# Scenario 02. Loudness rail and normalize controls

Date: 2026-10-31. Branch: `codex/sprint-24-loudness`.

## Interaction

- The rail is a custom `role="slider"` with pointer capture, Arrow/Home/End/PageUp/PageDown keys, and 0.5 LUFS quantization. It uses a monotonic piecewise-linear anchor map, not a logarithm of a negative value.
- Anchors: -30 at 0, -23 at 0.18, -16 at 0.44, -14 at 0.55, -9.5 at 0.8, -8 at 1. Every 0.5 LUFS value round-trips through `positionForLufs` and `lufsForPosition`.
- Magnetic attraction applies within 0.012 of a mark's rail position. The next pointer position is computed from the raw pointer coordinate each time, so moving away escapes the mark. `tests/ui-controls.test.mjs` checks -14 attraction and escape at +0.05 and +0.1.
- The true-peak ceiling and peak target use native range sliders at 0.1 dB steps. Peak mode hides the loudness rail and states that the loudness target is not used.

## Reference marks and classification decision

| Mark | Label | Class |
| --- | --- | --- |
| -23 LUFS | EBU R 128 delivery | formal delivery target |
| -16 LUFS | Podcast reference | reference, not a formal standard |
| -14 LUFS | Streaming playback | generic playback reference |
| -9.5 LUFS | Loud playback | playback reference |
| -8 LUFS | Tool maximum | control limit |

Only -23 LUFS is classified as a formal delivery target. No YouTube, Spotify or TikTok labels were added because no primary source was cited here. The note under the rail says: "Only -23 LUFS is a formal delivery target here. Other marks are references, not platform guarantees."

## Browser evidence

`scripts/sprint-24-check.mjs` drives system Chrome (`chromium.launch({ channel: 'chrome' })`) against `http://127.0.0.1:5181/audio-toolkit-v1/`. It asserts the default -14 LUFS and -0.3 dBTP values, mark text and the single delivery mark, ArrowRight/ArrowLeft/Home/End transitions, 0.5-step movement back to -14, both normalize modes, and that Peak mode removes the loudness rail.

Captures: `captures/01-loudness-rail.png`, `captures/02-peak-mode.png`, `captures/07-mobile-loudness.png`. The mobile capture at 390 px asserts no horizontal overflow.
