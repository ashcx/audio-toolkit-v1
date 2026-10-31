# Scenario 26-05. Size and time

Single Chrome run, 20 s tone fixture, gain -6 dB. Times are end-to-end UI export times and include decode, gain, encode and save. No isolation step ran.

| Format | Mode | Size (bytes) | End-to-end ms |
| --- | --- | ---: | ---: |
| Opus 128 | CBR | 323,484 | 506 |
| Opus 128 | VBR | 324,806 | 215 |
| MP3 128 | CBR | 320,808 | 319 |
| AAC 128 | CBR | 252,714 | 316 |
| WAV | lossless | 3,840,044 | 212 |
| FLAC | lossless | 1,070,690 | 321 |

This is not a benchmark and no speed claim is made. The CBR Opus run was first and includes page warm-up. The meaningful size evidence is the silence case: Opus CBR 323,484 bytes against VBR 4,221 bytes with the same duration. The sprint does not claim a faster music-isolation path because no neural step was involved.

Evidence: `result.json`.
