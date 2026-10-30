# Sprint 19 - Modernize recipe and trim interactions

## Goal

Make recipe editing direct and accessible while preserving audio behavior and precise settings.

Status: Technical implementation and verification recorded. Independent review corrections applied and checked; [Draft PR21](https://github.com/ashcx/audio-toolkit-v1/pull/21) submitted. Physical-device/screen-reader and full standalone matrix acceptance remain open.

## Entry criteria

- [x] Verify Sprint 18 evidence, independent review, PR delivery, and any carry-forward independence.
- [x] Inspect current source, relevant predecessor contracts and actual image-compressor UI; capture baseline and freeze affected contracts before consumers.
- [x] Confirm suitable fixtures, browser capabilities and an evidence plan without assuming physical-device coverage.

## Depends on

Sprint 18, its acceptance and PR gates, and the processing, storage and recipe contracts it uses. Earlier UI requirements superseded by [section 28](audio-toolkit-plan.md#28-redesign-direction-2026-10-30) are historical.

## Tasks

Execute stories sequentially. For each story, freeze prerequisite contracts; implement; run meaningful checks and actual user journeys; self-review and resolve findings; then log evidence before advancing.

- [x] **S19-US01 - Direct parameter controls**. P0, 3 points; owner: main instance. Given gain or peak normalization, when a slider is adjusted, then its live dB value and supported range are clear; optional numeric entry preserves existing precision and validation. Show meaningful clipping feedback. Use segmented controls for appropriate short choices. Evidence: `docs/sprint-evidence/sprint-19/parameters.md`.
- [x] **S19-US02 - Recipe cards and ordering**. P0, 3 points; owner: main instance. Given multiple steps, when the grip is dragged by mouse or long-pressed and dragged by touch, then a visible insertion marker and resulting order match the executed recipe. A discoverable non-drag action works with keyboard and touch, retains focus, and announces changes. Cards show summary and expand; an add menu opens the new step. Evidence: `docs/sprint-evidence/sprint-19/reordering.md`.
- [x] **S19-US03 - Visual trim controls**. P1, 3 points, required stretch; owner: main instance. Given batch or per-file trim, when the user adjusts start/end handles or precise time fields, then the effective range and scope are clear and output boundaries remain accurate. Assess feasible bounded timeline rendering; do not promise waveform generation without evidence. Evidence: `docs/sprint-evidence/sprint-19/trim.md`.

## Exit criteria

- [ ] All stories and sequential tasks pass with evidence, including preserved processing, result, and cleanup contracts.
- [ ] Relevant automated checks and actual desktop/mobile, light/dark, keyboard and touch journeys are recorded with captures. Physical-device or screen-reader evidence not obtained remains NOT VERIFIED.
- [x] Coverage matrix, decision trail, separate self-review, and independent interrogate against the integrated sprint are recorded; proven findings are resolved and rerun.
- [x] One sprint PR targeting main is created after implementation and review pass, linked here and in the roadmap with evidence and any unfinished record. No merge or deployment without explicit permission.

## Scrum details

One-week timebox; 6 committed points and 3 required stretch. Reserve 20–30% for review and rework. Main-instance work is sequential. Follow the Scrum policy for the bounded independent review, recorded planning, daily syncs, review, retrospective, and recovery timebox. Do not claim events or evidence that did not occur.

## Out of scope

Changes to the image compressor, external hub, deployment, or audio-processing semantics beyond the stated outcome.

## References

[Roadmap](../TODO.md), [orchestration](orchestration-plan.md), [Scrum policy](redesign-scrum-plan.md), [redesign requirements](audio-toolkit-plan.md#28-redesign-direction-2026-10-30).

## Execution log

2026-10-30: Planned at the user's request. No implementation, verification, review, or PR is claimed.

2026-10-30: User explicitly resumed18–20. Main instance implemented/verified sequential parameter, ordering and trim stories.67 normal tests, build/static and migrated driver syntax pass. Actual Chrome output grids/peaks and desktop/mobile input evidence are in [coverage](../docs/sprint-evidence/sprint-19/coverage.md). Independent review found invalid range display, unrelated-pointer cleanup, invalid slider aria text and zero-length handle ranges; parent reproduced and corrected each. Physical touch/screen-reader and full standalone matrix remain open.

2026-10-31: Final endpoint correction independently checked by Terra, including sub-ms ranges. [Interrogate](../docs/sprint-evidence/sprint-19/interrogate.md) records both panel rounds, fixes, dropped inherited-user-deletion finding and bounded technical verdict. All code work is sequential; no merge/deploy.

2026-10-31: Draft [PR21](https://github.com/ashcx/audio-toolkit-v1/pull/21) targets main with implementation1647def. No full acceptance/merge/deploy claim. Sprint20 technical work is independently eligible with the recorded gaps.
