# Sprint 13 independent review

Intent. Complete Sprints 13–15 while retaining GTCRN and DeepFilterNet3 for the user's later comparison. Review scope is the Sprint 13 research checkpoint, not a completed speech-cleanup feature.

Base e9d68cc on codex/sprint-13-speech-evaluation. Reviewed uncommitted scripts/prepare-speech-evaluation.mjs, scripts/speech-evaluation.html, docs/sprint-evidence/sprint-13, Sprint 13 checklist and decision trail. No production application code changed. The inherited deletion of todo/sprint-12-unfinished.md and .DS_Store are excluded. No reviewer modified the checkout or ran shared builds.

Terra high reviewed correctness, contracts, privacy and provenance. Luna high reviewed journeys, coverage and maintainability. Both independently checked the sprint's Ready/Done and story gates and audited the decision trail and comments. Neither counts this as accepted Sprint 13 or authorizes Sprint 14 entry.

Verified finding. Terra executed the actual inline harness in an isolated Node VM with mocked browser/model boundaries and a longer reference than mixture. The previous code reported status executed with inputSnr null. The parent ran the reproduction after adding equal-length/nonempty/finite-grid validation and finite metric validation. `node /tmp/s13-review-repro.cjs | head -n 28` now reports each model failed with `Reference and mixture must contain equal nonempty finite sample grids`. Terra independently reran it and confirmed resolution. The scratch reproduction is not a durable regression suite.

Fixture identity finding. Both reviewers checked the actual local fixture digests. The source URLs were mutable and no digests were recorded. cpu.md now records matching SHA-256 values. Both reviewers confirmed the documentation fix. Runtime archives were already hash-pinned.

Parent reran the valid fixture in Chrome after the code change. chrome-speech.json contains ten successful executions with finite metrics and the same observed sample delays. This rerun does not establish quality, performance ranking or broader fixtures.

Dropped hypotheses. The recorded metrics are not presented as audible quality, standardized quality or a performance winner. Both reviewers found the explicit limitations consistent. No source comments needed deletion. Neither reviewer reported further verified behavior defects.

Final verdict. The research checkpoint is accurately scoped after the fixes. Full Sprint 13 remains NOT VERIFIED. Representative corpus, actual listening, end-to-end timing, peak memory and complete source/model licensing audit remain open. Acceleration is explicitly unverified, not falsely claimed. Both reviewers reject dependent progression. No last-resort carry-forward is established. The parent subsequently verified a clean locked build with supported project-local Node 22.23.1, recorded in locked-build.txt; this corrects the earlier build gap without changing model code. Coverage/roadmap bookkeeping records this result without broadening the review verdict.
