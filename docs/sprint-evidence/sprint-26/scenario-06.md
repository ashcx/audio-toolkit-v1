# Scenario 26-06. Final playback and excerpt estimate

The completed export row rendered `Exported audio` and a direct player. The player `src` equalled the download `href`, and the downloaded file decoded to the advertised codec, duration and channel count. The player therefore plays the encoded output, not the source or a WAV preview.

The recipe preview remains a WAV excerpt comparison and is labelled as an estimate when normalization or isolation is present. No-recipe Preview stays hidden after changing the output format or Opus mode; `scripts/sprint-26-check.mjs` asserts this before each export.

Evidence: `result.json`, `scripts/sprint-26-check.mjs`, `captures/08-encoded-player.png`, `captures/01-opus-cbr.png`, `captures/02-opus-vbr.png`.
