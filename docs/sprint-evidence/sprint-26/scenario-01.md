# Scenario 26-01. Encoder capability audit

2026-10-31. Chrome 143 on macOS, system Chrome through Playwright. The authority is the measured output, not the shared mediabunny type.

| Format and backend | CBR | VBR | ABR | Evidence |
| --- | --- | --- | --- | --- |
| MP3, LAME wasm | yes | no | no | 835 packets, all 384 bytes at 128 kbps in the final UI audit. A worker-level audit with `bitrateMode: "variable"` produced the same 833 packets of 384 bytes and the same file size. The adapter passes only a bitrate to LAME. |
| M4A/AAC, native WebCodecs | yes | no | no | 941 packets, 67 sizes, mean 263.6 bytes at a 128 kbps target. A worker-level audit with `bitrateMode: "variable"` produced byte-identical size and packet distribution. No mode control is shown. |
| Opus, native WebCodecs | yes | yes | no | CBR: 1001 packets, all 320 bytes. VBR: 1001 packets, 74 sizes, 259 to 510 bytes, median 334. Silence VBR was 4,221 bytes against 323,484 for CBR. |
| WAV, PCM s16 | n/a | n/a | n/a | No bitrate or mode control. |
| FLAC, wasm | n/a | n/a | n/a | No bitrate or mode control. |
| Original stream copy | n/a | n/a | n/a | No mode or bitrate control. |

ABR has no verified encoder path, so it is absent. Variable AAC packet sizes alone are not treated as VBR evidence. The native AAC path is the only one Chrome used; the vendored fallback was not exercised in this run.

Evidence: `result.json`, `scripts/sprint-26-check.mjs`, `scripts/format-check.mjs`.
