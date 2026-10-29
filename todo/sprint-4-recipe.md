# Sprint 4 - Configure ordered recipes and per-file trim overrides

## Goal

Configure ordered recipes and per-file trim overrides. Owns feature-plan sections 8,10; cross-cutting requirements remain binding.

Status: In progress. Technical delivery: implemented, tested and independently verified; PR delivery pending. Agent-verified acceptance: NOT VERIFIED until review and PR delivery.

## Entry criteria

- [x] Verify source requirements and actual predecessor artifacts, PR state and independent review.
- [x] Required contracts, fixtures and dependencies exist; automated Chromium/WebKit access is available. User-authorized physical-device checks remain reserved for Sprint 12.
- [x] Recheck any carry-forward independence against this sprint's consumers.

## Depends on

[Sprint 3](sprint-3-intake.md). Verify its exit evidence, interrogate and PR delivery directly. Only an independently verified carry-forward can permit progression with unfinished work.

## Tasks

One-week timebox. First two stories commit 6 SP. Third story is 3 SP required stretch. Re-estimate to at most 7 committed SP before execution; reserve 20–30% review/rework capacity. Points are relative, not hours. Execute sequentially in the main instance.

- [x] **S04-US01 - Freeze the recipe specification**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given processor settings exist, when cards are added reordered expanded or removed, then versioned serializable settings preserve logical order and reject invalid combinations.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Separate terminal export; define duplicate-step rules and keyboard/mobile Move up/down controls.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-4/S04-US01.md`, fixtures/captures and coverage matrix.

- [x] **S04-US02 - Apply source-time trim overrides**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given files inherit shared trim, when a file override changes or resets, then stable IDs retain correct effective ranges and inheritance.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Allow one trim; validate bounds, clamp excessive ends, isolate starts beyond duration and snapshot settings.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-4/S04-US02.md`, fixtures/captures and coverage matrix.

- [x] **S04-US03 - Verify editing recovery**. Priority P1. 3 SP. Required stretch. Owner: main instance.
  - Given parameters or step order are invalid, when users correct settings, then summaries, labels and effective ranges agree with validation.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Capture desktop/mobile expanded/collapsed states and accessible error recovery.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-4/S04-US03.md`, fixtures/captures and coverage matrix.

## Exit criteria

- [x] All required stories including stretch satisfy their acceptance predicates.
- [x] `docs/sprint-evidence/sprint-4/coverage.md` maps every Ready/Done condition and story to exact commands, observations or artifacts, marked VERIFIED, NOT VERIFIED or INCONCLUSIVE.
- [x] Relevant automated/integration checks have exact results; baseline failures are separate. Deterministic suites have no live network calls.
- [x] Affected recipe, planner, lifecycle, storage and user-data contracts are preserved.
- [x] Affected UI is inspected on desktop/mobile, keyboard, touch, labels, themes and recovery states; non-UI exceptions have an explicit reason.
- [x] Separate self-review and affected reruns pass; evidence and decision trail are current.
- [x] Independent interrogate covers the integrated increment, requirements, all acceptance rows, contracts, revisions, captures and unfinished-work claims. Save reproductions, fixes/reruns, dropped claims and verdict in `docs/sprint-evidence/sprint-4/interrogate.md`.
- [x] Relevant audio/listening and resource evidence exists. Physical-device evidence is deferred to Sprint 12 by explicit user authorization; other missing observations stay NOT VERIFIED.

After the preceding gates pass, deliver this sprint's single PR. PR creation is a delivery step, not a prerequisite to reviewing the increment.

- [ ] Commit, push and open/update one sprint PR linking plans, exact checks, captures, evidence, review verdict, gaps and dependency revisions.
- [ ] Verify PR URL and CI state; record URL in References, Execution log and TODO.md, then push bookkeeping.

Complete only when all gates pass. Qualified last-resort exceptions keep boxes unchecked and status In progress with `sprint-4-unfinished.md`. Merge and deployment follow actual authorized scope.

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

### 2026-10-29 - Implementation and self-review

Ready: Sprint 3 base `51da1c8`, PR #4 open/ready, clean refreshed interrogate and exact input matrix inspected. No carry-forward. Contracts and browser fixtures available. Three stories remain 3 SP each, sequential main-instance implementation; review/rework reserved. No meetings or physical-device observations claimed.

The draft is versioned ordered steps plus a separate terminal export. Only validated, deeply frozen per-file snapshots cross the execution boundary. Trim retains source-time bounds and its card position. Settings UI follows the user's minimal-copy direction. Story reports, contracts and coverage are in `docs/sprint-evidence/sprint-4/`.

Exact checks: `npm run build`, `npm run typecheck`, `node --experimental-strip-types --test tests/recipe.test.mjs` (4 passing), `RECIPE_EVIDENCE_DIR=docs/sprint-evidence/sprint-4 node scripts/recipe-check.mjs`, `WORKSPACE_EVIDENCE_DIR=docs/sprint-evidence/sprint-4/workspace-regression node scripts/workspace-check.mjs`, `INTAKE_EVIDENCE_DIR=docs/sprint-evidence/sprint-4/intake-regression node scripts/intake-check.mjs`, `git diff --check`; all passed. Both browser engines exercised desktop, mobile, keyboard and emulated touch; actual devices remain NOT VERIFIED.

Self-review corrected null-start/end-zero validation and made schema objects strict after unit tests exposed both gaps. Cancelled trim removal preserves focus and custom ranges. Checked final mobile dark capture directly. Copy eligibility, DSP and actual exports are later sprint scope. Next: independent integrated interrogate, then PR delivery.

Independent Terra high interrogate found four defects in simultaneous error visibility, repeated-step error identification, reorder focus and per-file error association. Reproduced/confirmed, fixed sequentially and refreshed independently. Final unit4/4 and sequential recipe/workspace/intake suites passed in both engines. No carry-forward. Retrospective: test overlapping invalid states and assert usable focus after movement, not only order. PR delivery follows.
