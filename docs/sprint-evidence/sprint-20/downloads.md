# Downloads and fallback

Actual Chrome selected2s/4s WAVs and one corrupt input. Recipe Normalize-3dBFS, Gain-6dB and Trim0.25..1.75, after keyboard reorder, exported two successful stereo48kHz outputs. The corrupt input remains an actionable row and is excluded. Native folder cancellation leaves results and existing ZIP intact.

Actual Create ZIP/Download ZIP saved audio-results.zip. Python zipfile testzip passes; exactly two entries are present, both72000frames/stereo48kHz. No corrupt/partial entry. zip-download.json records names and SHA256. Individual Download also remains functional after cancellation. No presets or test-one-file controls remain.

Runtime UI omits Save to folder when secure-context/function capability is missing. Actual current Chrome has the function and exposes the action. A separate genuinely unsupported browser was unavailable under the user's Chrome-only browser routing. Attempted capability-unavailable injection through the supported raw-CDP interface was rejected as unsupported; no override was installed. Actual unsupported-browser UI behavior is NOT VERIFIED, rather than claimed from family support tables. Native cancellation and denied-boundary tests demonstrate retained fallbacks. Existing ZIP implementation is unchanged and normal archive/ZIP tests pass.

2026-10-31: User-assisted native folder selection succeeded after the initial cancellation. Parent verified actual saved files equal ZIP bytes and72000-frame grids; native-folder.json records this separate successful path.
