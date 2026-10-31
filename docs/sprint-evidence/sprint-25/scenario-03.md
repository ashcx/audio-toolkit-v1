# Scenario 25-03. Download binds to the completed output

The download icon was immediately left of remove and carried the accessible name `Download exported audio for tone.wav`. Its `href` equalled the completed result player's `src`, and that blob URL differed from the original source URL. The script never substituted the source or a preview.

The focused MP3 format check downloaded a complete gain fixture, decoded it with ffmpeg, and compared it with the source. Its waveform error was below the script's tolerance, so the bytes were the processed output rather than the source.

Evidence: `scripts/sprint-25-check.mjs`, `scripts/format-check.mjs`, `result.json`.
