# Sprint 5 - Extract original audio without encoding

## Goal

Extract original audio without encoding. Owns feature-plan sections 9,14,15; cross-cutting requirements remain binding.

Status: In progress. Technical delivery: implemented, tested and independently verified; PR delivery pending. Agent-verified acceptance: NOT VERIFIED.

## Entry criteria

- [x] Verify source requirements and actual predecessor artifacts, PR state and independent review.
- [x] Required contracts, fixtures and dependencies exist; automated Chromium/WebKit access is available. User-authorized physical-device checks remain reserved for Sprint 12.
- [x] Recheck any carry-forward independence against this sprint's consumers.

## Depends on

[Sprint 4](sprint-4-recipe.md). Verify its exit evidence, interrogate and PR delivery directly. Only an independently verified carry-forward can permit progression with unfinished work.

## Tasks

One-week timebox. First two stories commit 6 SP. Third story is 3 SP required stretch. Re-estimate to at most 7 committed SP before execution; reserve 20–30% review/rework capacity. Points are relative, not hours. Execute sequentially in the main instance.

- [x] **S05-US01 - Compile effective execution plans**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given validated snapshots and detected tracks exist, when each input is planned, then copy eligibility and required PCM work are explicit.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Freeze processor capabilities and planner contracts; preserve step order and eliminate only real no-ops.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-5/S05-US01.md`, fixtures/captures and coverage matrix.

- [x] **S05-US02 - Execute packet copy**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given compatible original audio is selected, when extraction finishes, then one audio-only output retains packets with zero decoder/encoder calls.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Stream demux/remux with correct container, timestamps, extension and MIME; instrument calls.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-5/S05-US02.md`, fixtures/captures and coverage matrix.

- [x] **S05-US03 - Prove mixed-codec paths**. Priority P1. 3 SP. Required stretch. Owner: main instance.
  - Given AAC MP3 Opus Vorbis and FLAC fixtures exist, when copy is requested, then supported paths preserve payloads and incompatible paths never silently transcode.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Compare encoded packets and independently inspect playback, duration and per-file output containers.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-5/S05-US03.md`, fixtures/captures and coverage matrix.

## Exit criteria

- [x] All required stories including stretch satisfy their acceptance predicates.
- [x] `docs/sprint-evidence/sprint-5/coverage.md` maps every Ready/Done condition and story to exact commands, observations or artifacts, marked VERIFIED, NOT VERIFIED or INCONCLUSIVE.
- [x] Relevant automated/integration checks have exact results; baseline failures are separate. Deterministic suites have no live network calls.
- [x] Affected recipe, planner, lifecycle, storage and user-data contracts are preserved.
- [x] Affected UI is inspected on desktop/mobile, keyboard, touch, labels, themes and recovery states; non-UI exceptions have an explicit reason.
- [x] Separate self-review and affected reruns pass; evidence and decision trail are current.
- [x] Independent interrogate covers the integrated increment, requirements, all acceptance rows, contracts, revisions, captures and unfinished-work claims. Save reproductions, fixes/reruns, dropped claims and verdict in `docs/sprint-evidence/sprint-5/interrogate.md`.
- [x] Relevant audio/listening and resource evidence exists. Physical-device evidence is deferred to Sprint 12 by explicit user authorization; other missing observations stay NOT VERIFIED.

After the preceding gates pass, deliver this sprint's single PR. PR creation is a delivery step, not a prerequisite to reviewing the increment.

- [ ] Commit, push and open/update one sprint PR linking plans, exact checks, captures, evidence, review verdict, gaps and dependency revisions.
- [ ] Verify PR URL and CI state; record URL in References, Execution log and TODO.md, then push bookkeeping.

Complete only when all gates pass. Qualified last-resort exceptions keep boxes unchecked and status In progress with `sprint-5-unfinished.md`. Merge and deployment follow actual authorized scope.

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

### 2026-10-29 - Ready and contract freeze

Sprint 4 final34e102c and reviewed implementation6c22ac9, PR #5 open/ready with no configured checks. All exits and refreshed interrogate inspected; no carry-forward. Existing fixtures and local two-engine driver available. Sequential stories at3SP,6 committed plus3 required stretch; review/rework reserved.

Reuse the independently compared engine architecture from Sprint1: discriminated copy/PCM plans, bounded packet/source iteration and browser-backed output retention. No new competing engine architecture. First throughput checkpoint: planner unit cases and actual packet copy for five compressed codec families before UI breadth. Source-time nontrivial trim always needs PCM for accurate boundaries; no front-loading.

Storage probe: ordinary ephemeral WebKit context getDirectory throws UnknownError, while a persistent WebKit context in ignored scratch creates/writes/reads/removes an OPFS file successfully. Chromium ephemeral also succeeds. Use persistent WebKit for storage integration checks and report failed storage clearly; do not equate API presence with usability. No unbounded in-memory output fallback.

### 2026-10-29 - Sequential implementation and self-review

S05-US01 data contract: typed copy/PCM/failed plan with ordered validated snapshots. Five planner unit tests pass, including a reproduced/fixed return-to-source shape bug. No-op stages alone disappear.

S05-US02 primary packet copy and bounded OPFS output integrated in the actual UI; single-track compatible audio retains native bytes to preserve gapless metadata. Per-file status, download, errors and exact names use compact labels. Storage failure/quota/retry/owned cleanup tested. No whole-file output buffer.

S05-US03 independently inspected14fixtures per engine. Packet/access-unit hashes and decoding configuration match; ffprobe reports one audio stream; FFmpeg float PCM hashes match the documented references exactly (13 direct source comparisons and the laced fixture’s original Opus golden source). The first comparison exposed lost Matroska Opus tail padding648samples; investigated pinned demuxer and applied reproducible source/ESM patch. Transport headers/comments/checksums are distinguished from decoding configuration, never silently re-encoded. Persistent WebKit context required for Linux storage checks; real devices remain NOT VERIFIED.

Exact checks: npm ci and guarded/idempotent postinstall, npm run build/typecheck,11unit tests, copy-check in both engines, inherited recipe/workspace/intake browser checks using new evidence paths, git diff --check. Review and final delivery pending. No carry-forward or remote CI claim.

### 2026-10-29 - Independent review fixes

First Terra high review reproduced unmarked previous outputs after edits and loss of tail padding through laced-block expansion. Parent reran both reproductions. Results now retain the immutable recipe and show Previous settings only when different; final copy suite checks edits during an artificially paused write. Patch preserves discard padding on the last expanded lace; new valid laced fixture plus fixed/Xiph/EBML method checks pass. Fixture generation initially encoded positive padding with a signed high bit; corrected before acceptance. FFmpeg6.1.1 itself trims each lace, confirmed in source and actual packet side data, so the laced fixture's golden decode is the original tone.opus frames. No mismatch hidden by relaxed tolerance.

Fresh integrated reviewer independently passed11unit tests and14fixtures per engine, inspected lifecycle, planner, patch, actual laced fixture/golden and compact mobile capture; no remaining verified behavior defect. Two evidence findings: missing per-processor streaming/cost freeze table and incorrect unit command/count. Added explicit capability table with future implementation claims NOT VERIFIED; corrected exact command and fixture count. Copy-only relevant audio proof is exact decoded-sample identity; actual listening NOT VERIFIED and isolation listening remains required Sprint9. Limited per-write/cleanup evidence does not imply full long-file memory readiness. Final evidence review and delivery pending.


Independent evidence-only Terra high refresh verified both remaining documentation gates: six-processor capabilities table and exact11test/14fixture records. No further discrepancy. All technical gates pass within stated scope; actual listening NOT VERIFIED, with exact decoded copy identity as relevant audio evidence. Retrospective: independently decode copied audio rather than trusting encoded-byte preservation alone; retain golden source construction when a reference demux has a proven defect. PR delivery next.
