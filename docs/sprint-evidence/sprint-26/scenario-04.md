# Scenario 26-04. Migration, stream copy and lossless controls

- A legacy Opus recipe without `mode` parses as `cbr`. MP3 and M4A legacy recipes also parse as `cbr`. New exports keep CBR, so no existing file changes meaning.
- `{format: "mp3", mode: "vbr", bitrateKbps: 192}` and `{format: "opus", mode: "abr", bitrateKbps: 128}` fail validation. A valid Opus VBR recipe parses.
- WAV and FLAC expose no bitrate or mode control. Direct stream copy exposes neither.
- The stream-copy test exported a 20 s WAV source without re-encoding. The result labelled it `Exported audio` and `No re-encoding.` The output decoded as `pcm_s16le`, 20 s, stereo.

Evidence: `tests/encoding-modes.test.mjs`, `tests/recipe.test.mjs`, `captures/05-wav-controls.png`, `captures/06-flac-controls.png`, `captures/07-stream-copy.png`, `result.json`.
