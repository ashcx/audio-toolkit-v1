# Release acceptance and handoff

Delivery is a stack of open PRs targeting main: reliability #10, Sprint 10 #11, Sprint 11#12, Sprint 12 #13. Review and merge in that order. No merge or deployment was requested in this workflow. Existing main-based Pages deployment does not publish these branches until separately authorized merges occur.

## Required user device observations

Use the candidate branch preview/build whose commit is recorded in Sprint 12 evidence. Save a short lawful voice+music clip; private test files must remain ignored. Record device, OS/browser version, candidate commit, source duration/format, steps, result and any failure.

| Device | Check | Status |
| --- | --- | --- |
| Chrome on the user's Mac | Both isolation modes complete; progress advances across windows; cancel/retry; listen to exports; observe heat and responsiveness | NOT VERIFIED |
| Edge on desktop | Mixed inputs, ordered recipe, direct batch export, playback, individual/ZIP download, cancel/retry | NOT VERIFIED |
| Actual Safari on Mac | Same journey, WAV/MP3/AAC/FLAC/Opus save and supported native preview, ZIP extraction | NOT VERIFIED |
| iPhone and iPad Safari | File picker, trim/override, touch/reorder, theme, preview/save, cancellation and quota recovery; background/suspend and return | NOT VERIFIED |
| Android Chrome | Same mobile journey, save/ZIP, background/suspend and return | NOT VERIFIED |
| Human listening | Voice/music on lawful music and event/live material, leakage, boundaries, clipping, stereo and timing | NOT VERIFIED |

Real-device and subjective acceptance cannot be replaced by emulated viewports or synthetic frequency/reconstruction tests. A failure must carry its reproduction and be fixed/rerun before closing release acceptance. Do not assume suspended jobs finish.

## Static and sibling handoff

Expected hub destination: `https://ashcx.github.io/tools/`. Expected image destination: `https://ashcx.github.io/image-compressor-v1/`. Audio route: `/audio-toolkit-v1/`. Local link attributes and the license/source assets are checked; no sibling repository was edited or its deployment claimed. Hub maintainers can link to the audio route once the candidate is approved and actually deployed.

After explicit merge/deployment authorization, check the deployed commit, Pages action, base path, model/worker responses and a real exported download. Keep deployment separate from passing local automation. Open provenance boundaries and device/listening rows remain release gates; see THIRD_PARTY_LICENSES.md and Sprint 12 coverage.

## Sprint18–20 technical redesign candidate

Sprint18 PR20 and Sprint19 PR21 deliver the compact workspace and recipe controls. Sprint20 adds optional folder delivery. Actual Mac Chrome verifies native folder selection with user assistance, two saved files matching ZIP bytes, and preservation of the existing sentinel. Native picker cancellation and real browser OPFS writes/cancellation are separately observed. These do not replace the physical/assistive technology and listening rows above. New evidence is in `docs/sprint-evidence/sprint-19/coverage.md` and `docs/sprint-evidence/sprint-20/coverage.md`. Unsupported-browser UI and full standalone matrix remain unverified. No merge/deployment or final release acceptance follows from these technical PRs.
