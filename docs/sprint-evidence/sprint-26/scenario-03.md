# Scenario 26-03. Real encoded output

Chrome exported 13 files from synthetic 20 s stereo 48 kHz fixtures: tone, silence and transient-heavy. All decoded with ffprobe, retained stereo 48 kHz, and reported a duration within 0.04 s of 20 s.

| Fixture | Format | Mode | Codec | Packets | Packet sizes |
| --- | --- | --- | --- | --- | --- |
| tone | Opus | CBR | opus | 1001 | one size, 320 |
| tone | Opus | VBR | opus | 1001 | 74 sizes, 259 to 510 |
| tone | MP3 | CBR | mp3 | 835 | one size, 384 |
| tone | M4A | adaptive | aac | 941 | 67 sizes, 6 to 363; 101 kbps |
| silence | M4A | adaptive | aac | 941 | one size, 6; 4.1 kbps |
| transient | M4A | adaptive | aac | 941 | 49 sizes, 6 to 372; 27.8 kbps |
| tone | WAV | lossless | pcm_s16le | 235 | block sizes |
| tone | FLAC | lossless | flac | 235 | 21 frame sizes |
| silence | Opus | CBR | opus | 1001 | one size, 320 |
| silence | Opus | VBR | opus | 1001 | one size, 3 |
| transient | Opus | CBR | opus | 1001 | one size, 320 |
| transient | Opus | VBR | opus | 1001 | 98 sizes, 187 to 496 |

AAC is adaptive. The content-dependent bitrate is the evidence; packet variance alone is not. Opus VBR is the positive packet-level evidence.

Evidence: `result.json`, `scripts/sprint-26-check.mjs`.
