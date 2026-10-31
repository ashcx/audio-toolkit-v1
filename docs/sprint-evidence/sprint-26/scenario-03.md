# Scenario 26-03. Real encoded output

Chrome exported 11 files from synthetic 20 s stereo 48 kHz fixtures: tone, silence and transient-heavy. All decoded with ffprobe, retained stereo 48 kHz, and reported a duration within 0.04 s of 20 s.

| Fixture | Format | Mode | Codec | Packets | Packet sizes |
| --- | --- | --- | --- | --- | --- |
| tone | Opus | CBR | opus | 1001 | one size, 320 |
| tone | Opus | VBR | opus | 1001 | 74 sizes, 259 to 510 |
| tone | MP3 | CBR | mp3 | 835 | one size, 384 |
| tone | M4A | CBR | aac | 941 | 67 sizes, 6 to 363 |
| tone | WAV | lossless | pcm_s16le | 235 | block sizes |
| tone | FLAC | lossless | flac | 235 | 21 frame sizes |
| silence | Opus | CBR | opus | 1001 | one size, 320 |
| silence | Opus | VBR | opus | 1001 | one size, 3 |
| transient | Opus | CBR | opus | 1001 | one size, 320 |
| transient | Opus | VBR | opus | 1001 | 98 sizes, 187 to 496 |

The AAC row is not used to claim VBR. The mode was ignored by both AAC paths in the worker audit. The Opus VBR row is the positive packet-level evidence.

Evidence: `result.json`, `scripts/sprint-26-check.mjs`.
