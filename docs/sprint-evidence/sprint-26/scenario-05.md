# Scenario 26-05. Size and time

Single Chrome run, 20 s tone fixture, gain -6 dB. Times are end-to-end UI export times and include decode, gain, encode and save. No isolation step ran.

| Format | Mode | Size (bytes) | End-to-end ms |
| --- | --- | ---: | ---: |
| Opus 128 | CBR | 323,484 | 329 |
| Opus 128 | VBR | 324,806 | 237 |
| MP3 128 | CBR | 320,808 | 325 |
| AAC 128 | adaptive | 252,714 | 317 |
| WAV | lossless | 3,840,044 | 227 |
| FLAC | lossless | 1,070,690 | 221 |

This is not a benchmark and no speed claim is made. The meaningful size evidence is the silence case: Opus CBR 323,484 bytes against VBR 4,221 bytes with the same duration. AAC also adapts sharply, from 252,714 bytes for the tone to 10,298 for silence at the same target. The sprint does not claim a faster music-isolation path because no neural step was involved.

Evidence: `result.json`.
