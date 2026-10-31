# Sprint 26 evidence. Verified encoding modes

Base `codex/sprint-25-playback` at `f1ae301`. Branch `codex/sprint-26-encoding`. The PR records the exact head. This sprint is stacked on Sprint 25 because it consumes the Export card.

| Requirement | Artifact | State |
| --- | --- | --- |
| Audited MP3, AAC and Opus capability | `scenario-01.md`, `result.json` | verified on Chrome |
| Encoding mode only where alternatives are real | `scenario-02.md`, `captures/01-opus-cbr.png`, `captures/02-opus-vbr.png` | verified |
| Real Opus CBR/VBR and adaptive AAC output | `scenario-03.md`, `result.json` | verified with ffprobe packets and content-dependent bitrate |
| Legacy mode migration, invalid combinations, lossless hiding | `scenario-04.md`, `tests/encoding-modes.test.mjs` | verified |
| Size and time recorded separately from neural work | `scenario-05.md`, `result.json` | recorded, not a speed claim |
| Encoded play bar and WAV excerpt estimate | `scenario-06.md` | verified |
| WebKit/Safari, AAC fallback, real speech/music | none | unavailable or not run, recorded as gaps |
