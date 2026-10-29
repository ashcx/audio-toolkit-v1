# Sprint 3 - Inspect mixed audio and video batches

## Goal

Inspect mixed audio and video batches. Owns feature-plan sections 6,7; cross-cutting requirements remain binding.

Status: Complete. Technical delivery: Intake implemented and locally verified. Agent-verified acceptance: VERIFIED for inspection scope.

## Entry criteria

- [x] Verify source requirements and actual predecessor artifacts, PR state and independent review.
- [x] Required contracts, fixtures and dependencies exist; automated Chromium/WebKit access is available. User-authorized physical-device checks remain reserved for Sprint 12.
- [x] Recheck any carry-forward independence against this sprint's consumers.

## Depends on

[Sprint 2](sprint-2-workspace.md). Verify its exit evidence, interrogate and PR delivery directly. Only an independently verified carry-forward can permit progression with unfinished work.

## Tasks

One-week timebox. First two stories commit 6 SP. Third story is 3 SP required stretch. Re-estimate to at most 7 committed SP before execution; reserve 20–30% review/rework capacity. Points are relative, not hours. Execute sequentially in the main instance.

- [x] **S03-US01 - Probe media efficiently**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given mixed valid and corrupt files exist, when files are selected or dropped, then metadata is accurate without full PCM decode and failures stay per-file.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Inspect primary audio tracks; distinguish unknown metadata, unsupported codecs and no-audio video.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-3/S03-US01.md`, fixtures/captures and coverage matrix.

- [x] **S03-US02 - Maintain stable file identity**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given duplicates and long filenames exist, when files are added and removed, then IDs, count, total bytes and cleanup remain correct.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Display size, duration, container, codec, channels and sample rate; keep many-file inspection responsive.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-3/S03-US02.md`, fixtures/captures and coverage matrix.

- [x] **S03-US03 - Prove input targets**. Priority P1. 3 SP. Required stretch. Owner: main instance.
  - Given the fixture matrix names actual codec/container pairs, when required fixtures are inspected, then every advertised pair has evidence and unsupported pairs fail clearly.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Cover WAV MP3 AAC M4A FLAC Vorbis Opus WebM audio and MP4 MOV MKV WebM video.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-3/S03-US03.md`, fixtures/captures and coverage matrix.

## Exit criteria

- [x] All required stories including stretch satisfy their acceptance predicates.
- [x] `docs/sprint-evidence/sprint-3/coverage.md` maps every Ready/Done condition and story to exact commands, observations or artifacts, marked VERIFIED, NOT VERIFIED or INCONCLUSIVE.
- [x] Relevant automated/integration checks have exact results; baseline failures are separate. Deterministic suites have no live network calls.
- [x] Affected recipe, planner, lifecycle, storage and user-data contracts are preserved.
- [x] Affected UI is inspected on desktop/mobile, keyboard, touch, labels, themes and recovery states; non-UI exceptions have an explicit reason.
- [x] Separate self-review and affected reruns pass; evidence and decision trail are current.
- [x] Independent interrogate covers the integrated increment, requirements, all acceptance rows, contracts, revisions, captures and unfinished-work claims. Save reproductions, fixes/reruns, dropped claims and verdict in `docs/sprint-evidence/sprint-3/interrogate.md`.
- [x] Relevant audio/listening and resource evidence exists. Physical-device evidence is deferred to Sprint 12 by explicit user authorization; other missing observations stay NOT VERIFIED.

After the preceding gates pass, deliver this sprint's single PR. PR creation is a delivery step, not a prerequisite to reviewing the increment.

- [x] Commit, push and open/update one sprint PR linking plans, exact checks, captures, evidence, review verdict, gaps and dependency revisions.
- [x] Verify PR URL and CI state; record URL in References, Execution log and TODO.md, then push bookkeeping.

Complete only when all gates pass. Qualified last-resort exceptions keep boxes unchecked and status In progress with `sprint-3-unfinished.md`. Merge and deployment follow actual authorized scope.

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
- Sprint PR: [#4](https://github.com/ashcx/audio-toolkit-v1/pull/4).

## Execution log

### 2026-10-29 - Planning draft

Stories and initial estimates drafted from requirements. No implementation, Ready verification, tests, device observations or sprint review occurred. Next action is to verify Entry criteria after an implementation instruction.

### 2026-10-29 - Planning, tasks and self-review

Verified predecessor Sprint 2 exits, independent verdict and open/ready PR #3 directly, baseeefe899. No carry-forward. Metadata contract uses a stable UUID FileId, original File, and waiting/reading/ready/failed union. Ready means inspected, not a promise that every codec is decodable. Unknown metadata remains nullable. Audio codec type derives from Mediabunny. Positive track start time is retained as source-time origin and removed from displayed duration; accurate execution validation remains in the engine.

US01 added lazy content probing with a 1 MiB BlobSource cache, no full PCM decode, primary-track selection and guaranteed input disposal. US02 added two-slot inspection scheduling, append/drop, duplicate identities, removal/abort with late-result suppression, compact metadata and scroll-bounded rows. US03 generated lawful local sine/black-video fixtures and compared codec/rate/channels against ffprobe references for every required initial format/container.

Exact checks: `npm run build` and typecheck passed. `INTAKE_EVIDENCE_DIR=docs/sprint-evidence/sprint-3 node scripts/intake-check.mjs` passed Chromium/WebKit with 16 initial cases, isolated corrupt/no-audio failures, wrong-extension detection, unknown-duration distinction, timestamp-offset handling, duplicate drop/append/removal and 40 additional stress files with five removals. Observed maximum reading rows was two in both engines; decoder/audio-context constructions zero. This is inspection evidence, not long-file processing/memory safety. `WORKSPACE_EVIDENCE_DIR=docs/sprint-evidence/sprint-3/workspace-regression node scripts/workspace-check.mjs` passed inherited theme/keyboard/capability/privacy checks. Desktop and mobile dark captures inspected.

Self-review fixed duration rounding near whole seconds and positive media-start timestamps. Added an offset fixture/reference and actual acceptance checks. Kept metadata units together and constrained the file-list scroll area so recipe controls remain reachable on mobile. Regression harnesses now default to ignored .artifacts paths, with explicit evidence destinations, preserving historical sprint captures. `git diff --check` passed. Next action is independent interrogate before PR delivery.

### 2026-10-29 - Independent review fixes

Terra high review reproduced an unrecognized WMA track marked ready, a 2-second audio track in 10-second WebM displayed as 10 seconds, and missing touch evidence. Parent reran both actual fixture journeys and observed those failures. Root cause: null codec treated as ordinary metadata, and upstream Matroska getDurationFromMetadata returns segment end time. Now unrecognized codec yields a clear per-file failure and Matroska/WebM uses encoded audio-track packet duration without PCM decode. Other missing metadata remains distinct from invalid input.

Added generated unsupported-WMA and unequal-audio/video fixtures with independent references. Refreshed build and intake checks passed both engines for 18 initial cases, including these regressions. Added actual emulated touch file-chooser and removal journeys on both engines, preserving the real-device deferral. Next action is refreshed independent review.

### 2026-10-29 - Review and retrospective

Refreshed independent review ran the full intake check successfully and found no outstanding verified defects. Current source/fixtures/contracts satisfy inspected acceptance. Retrospective: per-track APIs can still return container-level values; include unequal-track fixtures. Viewport tests do not prove touch interaction; exercise actual tap/file-chooser journeys. Next action is the single sprint PR.

### 2026-10-29 - PR delivery

PR #4 is open/ready, stacked on PR #3 at eefe899. Reviewed snapshot committed as49e91b2. No configured GitHub checks exist; no remote CI pass is claimed. Final bookkeeping preserves reviewed behavior. All inspection gates pass; no unfinished carry-forward. Next eligible sprint is 4.
