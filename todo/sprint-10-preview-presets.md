# Sprint 10 - Test one file and reuse the result in the batch

## Goal

Test one file and reuse the result in the batch. Owns feature-plan sections 17; cross-cutting requirements remain binding.

Status: In progress. Technical delivery: implemented and tested; PR preparation. Agent-verified acceptance: NOT VERIFIED, independent Terra high review blocked by runtime capacity.

## Entry criteria

- [ ] Verify source requirements and actual predecessor artifacts, PR state and independent review.
- [ ] Required contracts, fixtures and dependencies exist; automated Chromium/WebKit access is available. User-authorized physical-device checks remain reserved for Sprint 12.
- [ ] Recheck any carry-forward independence against this sprint's consumers.

## Depends on

[Sprint 9](sprint-9-isolation.md). Verify its exit evidence, interrogate and PR delivery directly. Only an independently verified carry-forward can permit progression with unfinished work.

## Tasks

One-week timebox. First two stories commit 6 SP. Third story is 3 SP required stretch. Re-estimate to at most 7 committed SP before execution; reserve 20–30% review/rework capacity. Points are relative, not hours. Execute sequentially in the main instance.

- [ ] **S10-US01 - Test through the same engine**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given a file has an effective recipe, when Test on one file runs, then playable/downloadable output uses the batch engine and trim override.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Select first or chosen file and show steps, actual size and final format.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-10/S10-US01.md`, fixtures/captures and coverage matrix.

- [ ] **S10-US02 - Reuse only matching test outputs**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given a successful test exists, when the rest of the batch starts or settings change, then matching output is reused once and changed settings/input invalidate reuse.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Freeze effective recipe/input identity and result lifetime; exercise retry and cancellation interactions.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-10/S10-US02.md`, fixtures/captures and coverage matrix.

- [ ] **S10-US03 - Offer editable presets**. Priority P1. 3 SP. Required stretch. Owner: main instance.
  - Given a recipe and trim overrides exist, when a preset is applied, then summary and actual settings match with explicit override behavior.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Provide original extraction, 192 kbps MP3, speech, voice and karaoke recipes with honest peak-normalization labels.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-10/S10-US03.md`, fixtures/captures and coverage matrix.

## Exit criteria

- [ ] All required stories including stretch satisfy their acceptance predicates.
- [ ] `docs/sprint-evidence/sprint-10/coverage.md` maps every Ready/Done condition and story to exact commands, observations or artifacts, marked VERIFIED, NOT VERIFIED or INCONCLUSIVE.
- [ ] Relevant automated/integration checks have exact results; baseline failures are separate. Deterministic suites have no live network calls.
- [ ] Affected recipe, planner, lifecycle, storage and user-data contracts are preserved.
- [ ] Affected UI is inspected on desktop/mobile, keyboard, touch, labels, themes and recovery states; non-UI exceptions have an explicit reason.
- [ ] Separate self-review and affected reruns pass; evidence and decision trail are current.
- [ ] Independent interrogate covers the integrated increment, requirements, all acceptance rows, contracts, revisions, captures and unfinished-work claims. Save reproductions, fixes/reruns, dropped claims and verdict in `docs/sprint-evidence/sprint-10/interrogate.md`.
- [ ] Relevant audio/listening and resource evidence exists. Physical-device evidence is deferred to Sprint 12 by explicit user authorization; other missing observations stay NOT VERIFIED.

Deliver the verified increment on its own working branch with a PR targeting main. Record dependencies on earlier open PRs. The user has authorized PR delivery, not merging or deployment.

- [ ] Commit and push verified changes to the sprint PR branch, retaining plans, exact checks, captures, evidence, review verdict, gaps and starting/ending revisions.
- [ ] Verify the sprint PR head and target; keep deployment NOT VERIFIED and record observed URLs/status in References, Execution log and TODO.md.

Complete only when all gates pass. Qualified last-resort exceptions keep boxes unchecked and status In progress with `sprint-10-unfinished.md`. Merge and deployment follow actual authorized scope.

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

### 2026-10-30 - Technical increment

Implemented and verified in the main instance.50 unit checks and both-engine browser journeys pass, including native playback, trim override, one-time reuse, settings revert invalidation, cancellation/retry, preset confirmations and cleanup. Chromium additionally performed actual isolation Test plus batch with two model calls for two files. Required Terra high review is blocked by runtime agent capacity. No Done, merge or deployment claim. See coverage.md and interrogate.md under sprint10 evidence.
