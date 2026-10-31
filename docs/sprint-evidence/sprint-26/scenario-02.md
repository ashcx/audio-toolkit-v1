# Scenario 26-02. Mode-dependent Export controls

- MP3 shows Format and Bitrate only, with a constant-bitrate note. No Encoding mode select is rendered.
- M4A shows Format and Target bitrate. The note reads "Variable bitrate. The AAC encoder adapts the bitrate to the content; the bitrate is a target, not a fixed size." No Encoding mode select is rendered because there is no alternative.
- Opus shows Format, Encoding mode and Bitrate. The select offers `Constant bitrate (CBR)` and `Variable bitrate (VBR)`. CBR keeps the label `Bitrate (kbps)`. VBR changes it to `Target bitrate (kbps)` and states that the bitrate is a target, not a fixed file size.
- WAV and FLAC show Format only. No bitrate or mode control appears.
- Direct stream copy shows Format only and the existing no-re-encoding explanation.
- The schema rejects `{format: "mp3", mode: "vbr"}`, `{format: "opus", mode: "abr"}` and missing bitrates. Legacy `{format: "opus", bitrateKbps: 128}` parses as CBR.
- `prepareEncoder` checks `canEncodeAudio` before work starts and gives a mode-aware error if the browser cannot provide the selected Opus mode.

Evidence: `captures/01-opus-cbr.png`, `captures/02-opus-vbr.png`, `captures/03-mp3-cbr.png`, `captures/04-aac-adaptive.png`, `captures/05-wav-controls.png`, `captures/06-flac-controls.png`, `captures/07-stream-copy.png`, `tests/encoding-modes.test.mjs`.
