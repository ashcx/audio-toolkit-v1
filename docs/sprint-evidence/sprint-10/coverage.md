# Sprint 10 verification

Base `047afb7` includes reliability PR #10. This increment remains review-blocked and is not release acceptance.

| Acceptance | Evidence | Status |
| --- | --- | --- |
| Predecessor runtime, input snapshots, lifecycle and reviewed CPU path available | PR #10 and sprint-9/reliability | VERIFIED for technical dependency; physical acceptance open |
| Default first or chosen test file and effective trim | scripts/preview-check.mjs, both engines, selected .2–.9 s result decoded to .7 s | VERIFIED |
| Same engine, actual size/format, native playback and download | both-engine driver, native audio time advances, ffprobe duration | VERIFIED |
| Matching result reused once with same owned URL, no duplicate model work | tests/batch.test.mjs; browser retains URL; Chromium two actual isolation calls for two files | VERIFIED |
| Changed settings including revert, File identity, retry/cancellation, duplicate names and cleanup | batch tests and browser driver; exact identity/release assertions, cancel/retry followed by reuse | VERIFIED |
| Editable original, 192 kbps MP3, mono/peak/128 speech, voice/peak/MP3, karaoke/MP3 recipes | tests/presets.test.mjs and browser preset controls/summary/confirmation | VERIFIED |
| Preserve conversion trims/overrides; confirm original extraction range removal | browser cancel and accept confirmation in both engines | VERIFIED |
| Build and deterministic regression | npm run build; node --experimental-strip-types --test tests/*.test.mjs, 50 passed | VERIFIED |
| Desktop/mobile, light/dark, keyboard and native playback | browser driver and committed captures; no horizontal overflow at390px | VERIFIED for automation; physical touch deferred |
| Resource ownership | same Batch owner, no preview copies, model call count, zero OPFS files after removal | VERIFIED lifecycle; process RSS increment not separately measured |
| Separate self-review | diff/type checks, ownership and identity cases | VERIFIED |
| Required Terra high independent interrogate | agent capacity prevented a new reviewer; Terra low design check cannot substitute | NOT VERIFIED |
| Physical-device and subjective listening acceptance | retained in Sprint12 | NOT VERIFIED |

The initial browser script used an exact text label for a bitrate select whose option text participates in label matching. A partial label fixed the driver; no product change was needed. Native playback is validated by media time advancing, not a claim that a person listened.
