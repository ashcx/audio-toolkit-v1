# Sprint 9 - Keep voice or music locally in the recipe

## Goal

Keep voice or music locally in the recipe. Owns feature-plan sections 13,15,19,22; cross-cutting requirements remain binding.

Status: In progress. Bounded isolation is implemented; current WebKit product checks and 39 deterministic checks pass after a block-boundary correction. Current inherited regressions and independent CPU/numerical review pass. Complete GPU-path evidence and real listening remain open.

## Entry criteria

- [x] Verify source requirements and actual predecessor artifacts, PR state and independent review.
- [x] Required contracts, fixtures and dependencies exist; automated Chromium/WebKit access is available. User-authorized physical-device checks remain reserved for Sprint 12.
- [x] Recheck any carry-forward independence against this sprint's consumers.

## Depends on

[Sprint 8](sprint-8-batch.md). Verify its exit evidence, interrogate and PR delivery directly. Only an independently verified carry-forward can permit progression with unfinished work.

## Tasks

One-week timebox. First two stories commit 6 SP. Third story is 3 SP required stretch. Re-estimate to at most 7 committed SP before execution; reserve 20–30% review/rework capacity. Points are relative, not hours. Execute sequentially in the main instance.

- [ ] **S09-US01 - Load licensed inference lazily**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given an isolation recipe is requested, when runtime and weights load, then progress and failures are accurate and media remains local.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Adapt verified SCNet/ONNX integration; allow one global inference job and proven GPU/CPU paths.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-9/S09-US01.md`, fixtures/captures and coverage matrix.

- [ ] **S09-US02 - Reconstruct one continuous output**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given music speech-over-music and live fixtures exist, when keep voice or keep music runs, then one requested track has correct duration without chunk gaps or repeats.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Implement bounded overlap, resampling and tail reconstruction; discard unwanted stem and release resources.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-9/S09-US02.md`, fixtures/captures and coverage matrix.

- [ ] **S09-US03 - Verify fallback and listening quality**. Priority P1. 3 SP. Required stretch. Owner: main instance.
  - Given supported device paths are available, when isolation completes or cancels, then continuity, resource cleanup and limitations match observations.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [ ] Record lawful listening tests, cancellation, actual memory and fallback results; unavailable required paths block acceptance.
  - [ ] Drive the actual artifact and run meaningful acceptance checks.
  - [ ] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-9/S09-US03.md`, fixtures/captures and coverage matrix.

## Exit criteria

- [ ] All required stories including stretch satisfy their acceptance predicates.
- [x] `docs/sprint-evidence/sprint-9/coverage.md` maps every Ready/Done condition and story to exact commands, observations or artifacts, marked VERIFIED, NOT VERIFIED or INCONCLUSIVE.
- [x] Relevant automated/integration checks have exact results; baseline failures are separate. Deterministic suites have no live network calls.
- [x] Affected recipe, planner, lifecycle, storage and user-data contracts are preserved on named verified CPU paths; hardware GPU completion remains explicitly unverified.
- [x] Affected UI is inspected on desktop/mobile, keyboard, touch, labels, themes and recovery states; non-UI exceptions have an explicit reason.
- [x] Separate self-review and affected reruns pass; evidence and decision trail are current.
- [x] Independent interrogate covers the integrated increment, requirements, all acceptance rows, contracts, revisions, captures and unfinished-work claims. Save reproductions, fixes/reruns, dropped claims and verdict in `docs/sprint-evidence/sprint-9/interrogate.md`.
- [ ] Relevant audio/listening and resource evidence exists. Physical-device evidence is deferred to Sprint 12 by explicit user authorization; other missing observations stay NOT VERIFIED.

Current delivery instruction, 2026-10-30: the user explicitly requested the Sprint 9 PR with its remaining acceptance observations disclosed. Commit and push the working branch and open a PR targeting main. Do not merge or deploy without explicit user permission. PR delivery does not mark the unfinished stories or overall sprint complete.

- [x] Commit and push the reviewed Sprint 9 implementation to its PR branch, retaining plans, exact checks, captures, evidence, review verdict, gaps and starting/ending revisions.
- [x] Verify the PR branch/head and open PR targeting main; record the actual URL/status. Merge and Pages deployment remain separate, unauthorized actions.

Complete only when all gates pass. Qualified last-resort exceptions keep boxes unchecked and status In progress with `sprint-9-unfinished.md`. Merge and deployment follow actual authorized scope.

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
- Sprint PR: [#9](https://github.com/ashcx/audio-toolkit-v1/pull/9), open against main from codex/sprint-9-isolation. Listening/GPU observations remain open; no merge or deployment.

## Execution log

### 2026-10-29 - Planning draft

Stories and initial estimates drafted from requirements. No implementation, Ready verification, tests, device observations or sprint review occurred. Next action is to verify Entry criteria after an implementation instruction.

### 2026-10-30 - Entry and architecture

Verified predecessor maine9aef30/312c673, independent review, Pages/live smoke and contracts. Synthetic fixtures and pinned runtime/model exist; lawful listening observations are an explicit US03 exit gate, with an asynchronous material preference question pending. No carry-forward. Read actual npm0.7.0/0.2.0 source and upstream worker; whole-input API needs bounded adaptation. Sequential design comparison under thread-limit exploration fallback selects bounded API windows plus global-statistics OPFS replay. Contracts and first resource/session checkpoint are in docs/sprint-evidence/sprint-9/architecture.md. No inference-quality or device claim yet.

### 2026-10-30 - Implementation and numerical/resource correction

Implemented typed lazy pinned inference, main-owned per-window workers, exclusive batch scheduling, explicit checkpoint replay, global conditioning, bounded overlap/tails, source-rate residual and actual model progress/errors. Current39 deterministic tests and build pass. WebKit full product check passes under the unchanged memory budget after an indexed subtraction-loop correction; original failures and exact localization are retained in findings.md. Source/unit independent partial review found no verified defect; parent subsequently reproduced and fixed the browser integration finding. Current changed-behavior independent refresh remains required. Real-material listening was requested through the local preview; no observations yet. No Done, carry-forward or delivery claim.

### 2026-10-30 - Current verified checkpoint and factual hold

Parent39 unit checks/build, both browser full CPU isolation drivers, four order cases, DSP58, copy14sources per engine, format96, batch/cleanup and workspace/intake/recipe regressions pass. Current desktop/mobile captures are readable. The reused independent Terra high reviewer verified source hashes,39 tests and the full actual WebKit journey, including the corrected first-sample subtraction; no new proven finding. Scoped CPU/numerical verdict PASS; overall S9 remains NOT DONE. Report and exact observations are in interrogate.md and independent-isolation/.

A forced unsupported SwiftShader adapter dispatched native GPU work but exceeded the declared memory guard before completed inference. Normal product auto excludes that adapter; real GPU completion remains unverified. User physical-device deferral to Sprint12 is preserved and supplies no invented GPU result. Real music/live listening was requested through the local preview; no observations yet. Required story/outcome and audio/resource exit boxes remain unchecked. No exception, main commit/push or deployment. Next action: collect actual listening observations and resolve the remaining supported-GPU evidence/deferred-device scope before progressing.

### 2026-10-30 - User-requested PR delivery

The user replaced the direct-main Git workflow with working branches and PRs targeting main, prohibited merging without explicit permission, and explicitly requested this Sprint 9 PR. Deliver the reviewed CPU implementation with its current evidence and remaining real-listening/GPU observations visible. This request overrides withholding PR creation until overall sprint acceptance. It does not establish missing observations or mark Sprint 9 Done. No product code changed after the reviewed source snapshot.

### 2026-10-30 - PR opened and verified

Implementation a6ecb1a5722824c8dc7fb1a39958cf788a98786c pushed to codex/sprint-9-isolation. [PR #9](https://github.com/ashcx/audio-toolkit-v1/pull/9) is OPEN, non-draft, targeting main. GitHub readback confirms the branch/head. No PR CI checks are configured by the existing main-only Pages workflow; local verification and independent review are recorded separately. Reviewed product/source hashes remain unchanged. Sprint9 remains In progress for real listening and complete GPU-path observations. No merge or deployment performed. This bookkeeping change is documentation only.
