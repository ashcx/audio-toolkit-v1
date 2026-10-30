# Sprint 13 independent review

Intent. Complete Sprints 13–15 while retaining GTCRN and DeepFilterNet3 for the user's later comparison. Review scope is the Sprint 13 research checkpoint, not a completed speech-cleanup feature.

Base e9d68cc on codex/sprint-13-speech-evaluation. Reviewed uncommitted scripts/prepare-speech-evaluation.mjs, scripts/speech-evaluation.html, docs/sprint-evidence/sprint-13, Sprint 13 checklist and decision trail. No production application code changed. The inherited deletion of todo/sprint-12-unfinished.md and .DS_Store are excluded. No reviewer modified the checkout or ran shared builds.

Terra high reviewed correctness, contracts, privacy and provenance. Luna high reviewed journeys, coverage and maintainability. Both independently checked the sprint's Ready/Done and story gates and audited the decision trail and comments. Neither counts this as accepted Sprint 13 or authorizes Sprint 14 entry.

Verified finding. Terra executed the actual inline harness in an isolated Node VM with mocked browser/model boundaries and a longer reference than mixture. The previous code reported status executed with inputSnr null. The parent ran the reproduction after adding equal-length/nonempty/finite-grid validation and finite metric validation. `node /tmp/s13-review-repro.cjs | head -n 28` now reports each model failed with `Reference and mixture must contain equal nonempty finite sample grids`. Terra independently reran it and confirmed resolution. The scratch reproduction is not a durable regression suite.

Fixture identity finding. Both reviewers checked the actual local fixture digests. The source URLs were mutable and no digests were recorded. cpu.md now records matching SHA-256 values. Both reviewers confirmed the documentation fix. Runtime archives were already hash-pinned.

Parent reran the valid fixture in Chrome after the code change. chrome-speech.json contains ten successful executions with finite metrics and the same observed sample delays. This rerun does not establish quality, performance ranking or broader fixtures.

Dropped hypotheses. The recorded metrics are not presented as audible quality, standardized quality or a performance winner. Both reviewers found the explicit limitations consistent. No source comments needed deletion. Neither reviewer reported further verified behavior defects.

Final verdict. The research checkpoint is accurately scoped after the fixes. Full Sprint 13 remains NOT VERIFIED. Representative corpus, actual listening, end-to-end timing, peak memory and complete source/model licensing audit remain open. Acceleration is explicitly unverified, not falsely claimed. Both reviewers reject dependent progression. No last-resort carry-forward is established. The parent subsequently verified a clean locked build with supported project-local Node 22.23.1, recorded in locked-build.txt; this corrects the earlier build gap without changing model code. Coverage/roadmap bookkeeping records this result without broadening the review verdict.

## YouTube extension review, 2026-10-30

Scope is base 5ad0f28 through the added YouTube downloader, evaluation page, fixture manifest, offline test and evidence. Fresh Terra high and Luna high reviewers ran read-only. They checked the source hashes and the final40-record Chrome evidence, which has no failed run, mismatched frame count or clipped sample. No production code changed.

Terra identified missing visible/exported attribution in the initial page. The parent added source/creator/license/modification text and a downloadable attribution note. Terra independently confirmed the fix. Terra also corrected the metadata description: Orton lacks a license field, while Deverell explicitly reports Creative Commons Attribution. The parent checked youtube-fixtures.json and fixed youtube.md accordingly.

Luna reproduced failed verification leaving invalid audio at the fixture destination. The downloader now uses a temporary directory, verifies bytes, and promotes only verified audio. The parent and both reviewers ran `node --test tests/speech-fixtures.test.mjs`; it passes and verifies previous-file preservation, failed-download cleanup and successful promotion. The test uses an isolated fake downloader and never requests live network access.

Luna noted that announcing full accumulating JSON would overwhelm screen-reader users. The parent moved polite status announcements into a short progress paragraph and retained JSON outside the live region. Parent Chrome accessibility inspection verified source links, license, attribution download, labeled run button and Ready status on the final page. This markup-only change leaves the recorded model loops unchanged. Both reviewers found no scoped comment or suppression issues and found the decision trail consistent. No additional performance or listening claim follows from their review.

Limitations remain. Fixed delay is assumed on the new excerpts. Different sample rates limit direct comparisons. Natural recording noise characteristics, intelligibility, audible artifacts, actual memory and speed remain unverified. The sample acquisition expands the research corpus but does not establish completed Sprint13 acceptance, production integration, or Sprint14/15 progression. An attempted browser save of an audition WAV timed out; no saved downloadable-WAV verification is claimed. Playback controls and WAV links were observed in the completed evaluation page, but actual playback/listening remains unverified.
