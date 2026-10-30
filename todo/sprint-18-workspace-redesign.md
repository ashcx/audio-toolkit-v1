# Sprint 18 - Simplify the workspace and file results

## Goal

Deliver a compact, low-copy workspace with direct batch export, concise file rows, and a settings panel.

Status: Not started. Technical delivery and acceptance: NOT VERIFIED.

## Entry criteria

- [ ] Verify Sprint 17 evidence, independent review, PR delivery, and any carry-forward independence.
- [ ] Inspect current source, relevant predecessor contracts and actual image-compressor UI; capture baseline and freeze affected contracts before consumers.
- [ ] Confirm suitable fixtures, browser capabilities and an evidence plan without assuming physical-device coverage.

## Depends on

Sprint 17, its acceptance and PR gates, and the processing, storage and recipe contracts it uses. Earlier UI requirements superseded by [section 28](audio-toolkit-plan.md#28-redesign-direction-2026-10-30) are historical.

## Tasks

Execute stories sequentially. For each story, freeze prerequisite contracts; implement; run meaningful checks and actual user journeys; self-review and resolve findings; then log evidence before advancing.

- [ ] **S18-US01 - Compact workspace and files**. P0, 3 points; owner: main instance. Given selected files, when the user views the workspace on desktop or mobile, then rows show filename, useful duration and concise state/actions, without size, format, codec, sample rate, re-encode labels, or redundant result details. Preserve trim, playback, download, actionable errors and clipping warnings. Evidence: `docs/sprint-evidence/sprint-18/workspace.md`.
- [ ] **S18-US02 - Export-only flow**. P0, 3 points; owner: main instance. Given a configured batch, when Export is used, then the normal batch runs without presets or a separate test-one-file control or workflow; existing successful, failed and cancelled result paths remain correct. Remove obsolete UI, logic and tests where appropriate. Evidence: `docs/sprint-evidence/sprint-18/export.md`.
- [ ] **S18-US03 - Settings and low-copy shell**. P1, 3 points, required stretch; owner: main instance. Given the settings control, when opened, then appearance and license access are available in an accessible panel inspired by the image compressor. Remove the named persistent footer and save-results text, while preserving license notices and contextual protection against loss of unsaved results. Evidence: `docs/sprint-evidence/sprint-18/settings.md`.

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
