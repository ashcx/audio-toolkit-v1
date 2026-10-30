# Sprint 20 - Deliver ZIP and supported folder saving

## Goal

Let users download individual outputs or ZIPs and save successful outputs to a chosen folder where supported.

Status: Not started. Technical delivery and acceptance: NOT VERIFIED.

## Entry criteria

- [ ] Verify Sprint 19 evidence, independent review, PR delivery, and any carry-forward independence.
- [ ] Inspect current source, relevant predecessor contracts and actual image-compressor UI; capture baseline and freeze affected contracts before consumers.
- [ ] Confirm suitable fixtures, browser capabilities and an evidence plan without assuming physical-device coverage.

## Depends on

Sprint 19, its acceptance and PR gates, and the processing, storage and recipe contracts it uses. Earlier UI requirements superseded by [section 28](audio-toolkit-plan.md#28-redesign-direction-2026-10-30) are historical.

## Tasks

Execute stories sequentially. For each story, freeze prerequisite contracts; implement; run meaningful checks and actual user journeys; self-review and resolve findings; then log evidence before advancing.

- [ ] **S20-US01 - Reliable folder saving**. P0, 3 points; owner: main instance. Given completed results and a supported browser, when the user chooses Save to folder and grants access, then successful outputs are saved with safe unique names without silently overwriting existing files. Cancellation, denied access, collisions, write errors and partial success preserve existing results and report outcomes. Freeze naming, write and cleanup contracts before implementation. Evidence: `docs/sprint-evidence/sprint-20/folder.md`.
- [ ] **S20-US02 - ZIP and fallback**. P0, 3 points; owner: main instance. Given any supported or unsupported folder capability and mixed batch results, when the user downloads individually or as ZIP, then successful outputs remain retrievable and failed or partial outputs are excluded. The unsupported folder option is clearly unavailable or omitted, with ZIP available. Verify browser support in the actual environments rather than assuming it. Evidence: `docs/sprint-evidence/sprint-20/downloads.md`.
- [ ] **S20-US03 - Integrated redesign acceptance**. P1, 3 points, required stretch; owner: main instance. Given mixed files and a recipe, when users select files, edit/reorder steps, export and deliver results, then desktop/mobile light/dark and keyboard/touch journeys meet sections 28 and 18 with accurate output, privacy, recovery and no obsolete presets or test control. Record actual device limitations honestly. Evidence: `docs/sprint-evidence/sprint-20/integrated.md`.

## Exit criteria

- [ ] All stories and sequential tasks pass with evidence, including preserved processing, result, and cleanup contracts.
- [ ] Relevant automated checks and actual desktop/mobile, light/dark, keyboard and touch journeys are recorded with captures. Physical-device or screen-reader evidence not obtained remains NOT VERIFIED.
- [ ] Coverage matrix, decision trail, separate self-review, and independent interrogate against the integrated sprint are recorded; proven findings are resolved and rerun.
- [ ] One sprint PR targeting main is created after implementation and review pass, linked here and in the roadmap with evidence and any unfinished record. No merge or deployment without explicit permission.

## Scrum details

One-week timebox; 6 committed points and 3 required stretch. Reserve 20–30% for review and rework. Main-instance work is sequential. Follow the Scrum policy for the bounded independent review, recorded planning, daily syncs, review, retrospective, and recovery timebox. Do not claim events or evidence that did not occur.

## Out of scope

Changes to the image compressor, external hub, deployment, or audio-processing semantics beyond the stated outcome.

## References

[Roadmap](../TODO.md), [orchestration](orchestration-plan.md), [Scrum policy](redesign-scrum-plan.md), [redesign requirements](audio-toolkit-plan.md#28-redesign-direction-2026-10-30).

## Execution log

2026-10-30: Planned at the user's request. No implementation, verification, review, or PR is claimed.
