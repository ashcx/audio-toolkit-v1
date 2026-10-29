# Sprint 12 - Verify the complete static audio product

## Goal

Verify the complete static audio product. Owns feature-plan sections 3,4,20,22,25,26,27; cross-cutting requirements remain binding.

Status: Not started. Technical delivery: Not started. Agent-verified acceptance: NOT VERIFIED.

## Entry criteria

- [ ] Verify source requirements and actual predecessor artifacts, PR state and independent review.
- [ ] Required contracts, fixtures, dependencies and browser/device access exist.
- [ ] Recheck any carry-forward independence against this sprint's consumers.

## Depends on

[Sprint 11](sprint-11-downloads-limits.md). Verify its exit evidence, interrogate and PR delivery directly. Only an independently verified carry-forward can permit progression with unfinished work.

## Tasks

One-week timebox. First two stories commit 6 SP. Third story is 3 SP required stretch. Re-estimate to at most 7 committed SP before execution; reserve 20–30% review/rework capacity. Points are relative, not hours. Execute sequentially in the main instance.

- [ ] **S12-US01 - Close cross-browser journeys**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given all predecessor gates pass, when full journeys run on target browsers, then desktop Chrome Edge macOS Safari iOS/iPadOS Safari and Android Chrome have real evidence.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Verify intake trim preview batch isolation recovery and download on recorded versions/devices; unavailable evidence blocks release claims.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-12/S12-US01.md`, fixtures/captures and coverage matrix.

- [ ] **S12-US02 - Audit privacy licenses and static assets**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given the integrated production build exists, when network and assets are inspected, then media/filenames remain local and model/worker paths and notices are correct.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Run production preview under Pages base path; document architecture setup formats privacy limitations and dependency provenance.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-12/S12-US02.md`, fixtures/captures and coverage matrix.

- [ ] **S12-US03 - Prepare release and sibling handoff**. Priority P1. 3 SP. Required stretch. Owner: main instance.
  - Given audio evidence is complete, when release records are assembled, then local validation, PR delivery and deployment are separately stated.
  - [ ] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Verify intended navigation and provide hub/image handoff; live production checks stay NOT VERIFIED until deployment is authorized and observed.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-12/S12-US03.md`, fixtures/captures and coverage matrix.

## Exit criteria

- [ ] All required stories including stretch satisfy their acceptance predicates.
- [ ] `docs/sprint-evidence/sprint-12/coverage.md` maps every Ready/Done condition and story to exact commands, observations or artifacts, marked VERIFIED, NOT VERIFIED or INCONCLUSIVE.
- [ ] Relevant automated/integration checks have exact results; baseline failures are separate. Deterministic suites have no live network calls.
- [ ] Affected recipe, planner, lifecycle, storage and user-data contracts are preserved.
- [ ] Affected UI is inspected on desktop/mobile, keyboard, touch, labels, themes and recovery states; non-UI exceptions have an explicit reason.
- [ ] Separate self-review and affected reruns pass; evidence and decision trail are current.
- [ ] Independent interrogate covers the integrated increment, requirements, all acceptance rows, contracts, revisions, captures and unfinished-work claims. Save reproductions, fixes/reruns, dropped claims and verdict in `docs/sprint-evidence/sprint-12/interrogate.md`.
- [ ] Relevant real-device, audio/listening and resource evidence exists. Missing observations stay NOT VERIFIED.

After the preceding gates pass, commit and push this increment directly to main under the updated user instructions. Record the resulting automatic Pages deployment separately from technical acceptance.

- [ ] Commit and push verified changes to main, retaining plans, exact checks, captures, evidence, review verdict, gaps and starting/ending revisions.
- [ ] Verify the main commit and Pages workflow status; record observed URLs/status in References, Execution log and TODO.md.

Complete only when all gates pass. Qualified last-resort exceptions keep boxes unchecked and status In progress with `sprint-12-unfinished.md`. Merge and deployment follow actual authorized scope.

## Scrum details

Planning up to 60 minutes. Daily written sync up to 15 minutes per working day. Review and retrospective up to 45 minutes each. Record actual agent-run events, never invented meetings. At expiry record remaining work and a recovery timebox. Read the shared Scrum policy for review and progression rules.

## Out of scope

Source sections 23–24 deferred features and exclusions. Hub/image implementation. Unrequested merge or production release.

## References

- [Roadmap](../TODO.md).
- [Orchestration](orchestration-plan.md).
- [Scrum policy](redesign-scrum-plan.md).
- [Feature requirements](audio-toolkit-plan.md).
- Decision trail: `docs/sprint-evidence/decisions.tsv`.
- Sprint PR: not created.

## Execution log

### 2026-10-29 - Planning draft

Stories and initial estimates drafted from requirements. No implementation, Ready verification, tests, device observations or sprint review occurred. Next action is to verify Entry criteria after an implementation instruction.
