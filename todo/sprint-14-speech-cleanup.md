# Sprint 14 - Add speech cleanup to ordered recipes

## Goal

Offer a separate Voice isolation recipe step with Standard (GTCRN) and Detailed (DeepFilterNet3) so the user can compare both on speech without music.

Status: In progress. Technical candidate implemented; release and physical/listening gates remain open.

## Entry criteria

- [ ] Verify Sprint 13 artifacts, model rights and frozen processing contracts.
- [x] Confirm an executable, reproducible CPU path for each model.
- [x] Preserve existing voice/music isolation and recipe compatibility.

## Depends on

[Sprint 13](sprint-13-speech-model-evaluation.md), existing batch, PCM, storage, preview and export contracts.

## Tasks

One-week timebox; 6 committed points, 3 required stretch; reserve 20–30% for review and rework. Main-instance implementation.

- [x] **S14-US01 - Configure speech cleanup**. P0, 3 points. Given a recipe, when Voice isolation is added, then Standard and Detailed select the correct model and retain ordered execution. Evidence: `docs/sprint-evidence/sprint-14/recipe.md`.
- [ ] **S14-US02 - Process and export**. P0, 3 points. Given speech, when either option runs, then local bounded processing preserves duration and supports cancellation, error recovery and export. Evidence: `docs/sprint-evidence/sprint-14/processing.md`.
- [ ] **S14-US03 - Verify user journeys**. P1, 3 points, required stretch. Given desktop and mobile layouts, when a user tests or exports each option, then controls, progress, download and accessibility work. Evidence: `docs/sprint-evidence/sprint-14/coverage.md` and captures.

## Exit criteria

- [ ] Both options execute actual models with reproducible checks; speed and quality labels are substantiated or revised.
- [ ] Privacy, licensing, sample rate, channels, length, tails and resource limits are verified or explicitly reported.
- [ ] Independent interrogate and coverage matrix recorded; verified findings resolved.
- [ ] PR targeting main created and recorded; no merge without explicit permission.

## Scrum details

Execute sequentially. Preserve physical-device and listening checks as real evidence gates.

## Out of scope

Removing an option without the user's decision, music-stem separation changes, and unverified accelerator claims.

## References

[Roadmap](../TODO.md), [orchestration](orchestration-plan.md), [requirements](audio-toolkit-plan.md).

## Execution log

2026-10-30: User requested both options for evaluation. No implementation yet.

2026-10-30: Implemented strict Standard/Detailed recipe choices and bounded per-channel streaming with exact source-grid restoration.68unit tests and build pass. Actual production-build Chrome exports and independently parsed downloaded WAVs pass the tested1second stereo44.1kHz case. Desktop/mobile-width captures are recorded. Actual UI cancellation reaches Cancelled/Retry. Terra findings on sub-model-sample trim and duplicate speech model states were reproduced and fixed. See Sprint14 coverage for unresolved model rights/transitive notices and unobserved human/physical acceptance.

2026-10-30: Technical candidate [PR16](https://github.com/ashcx/audio-toolkit-v1/pull/16) opened as draft at f6d349a targeting main, with no merge/deployment. Full-interview Detailed retry after cancellation completed in the real workspace. Remaining factual/release gates stay unchecked.
