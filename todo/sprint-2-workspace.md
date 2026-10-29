# Sprint 2 - Open a responsive accessible audio workspace

## Goal

Open a responsive accessible audio workspace. Owns feature-plan sections 2,5,22; cross-cutting requirements remain binding.

Status: Complete. Technical delivery: Workspace implemented and locally checked. Agent-verified acceptance: VERIFIED for workspace scope.

## Entry criteria

- [x] Verify source requirements and actual predecessor artifacts, PR state and independent review.
- [x] Required contracts, fixtures and dependencies exist; automated Chromium/WebKit access is available. User-authorized physical-device checks remain reserved for Sprint 12.
- [x] Recheck any carry-forward independence against this sprint's consumers.

## Depends on

[Sprint 1](sprint-1-feasibility.md). Verify its exit evidence, interrogate and PR delivery directly. Only an independently verified carry-forward can permit progression with unfinished work.

## Tasks

One-week timebox. First two stories commit 6 SP. Third story is 3 SP required stretch. Re-estimate to at most 7 committed SP before execution; reserve 20–30% review/rework capacity. Points are relative, not hours. Execute sequentially in the main instance.

- [x] **S02-US01 - Establish the static build**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given feasibility passes, when the production build opens at /audio-toolkit-v1/, then assets and workers resolve on navigation and reload.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Choose TypeScript/Vite; evaluate Preact against the existing image app; establish build/type/check commands.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-2/S02-US01.md`, fixtures/captures and coverage matrix.

- [x] **S02-US02 - Match the visual family**. Priority P0. 3 SP. Committed. Owner: main instance.
  - Given current image styles are inspected read-only, when desktop and mobile users open the workspace, then typography, themes, controls and layout are coherent and accessible, and a keyboard/touch-accessible Media Toolkit link points to https://ashcx.github.io/media-toolkit/.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Build batch, stacked recipe and result regions and the audio-side link back to the Media Toolkit hub; capture focus, labels, keyboard, touch and themes. Verify the link target without claiming the sibling site is deployed.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-2/S02-US02.md`, fixtures/captures and coverage matrix.

- [x] **S02-US03 - Report capabilities and privacy**. Priority P1. 3 SP. Required stretch. Owner: main instance.
  - Given browser capabilities differ, when the app loads, then unsupported Firefox and feature limitations receive accurate notices.
  - [x] Ground affected sources, capture a baseline and freeze prerequisite contracts.
  - [x] Check capabilities rather than user-agent alone; explain local media and first-use asset downloads.
  - [x] Drive the actual artifact and run meaningful acceptance checks.
  - [x] Perform separate self-review, resolve findings, rerun affected checks and log exact results before advancing.
  - Evidence: `docs/sprint-evidence/sprint-2/S02-US03.md`, fixtures/captures and coverage matrix.

## Exit criteria

- [x] All required stories including stretch satisfy their acceptance predicates.
- [x] `docs/sprint-evidence/sprint-2/coverage.md` maps every Ready/Done condition and story to exact commands, observations or artifacts, marked VERIFIED, NOT VERIFIED or INCONCLUSIVE.
- [x] Relevant automated/integration checks have exact results; baseline failures are separate. Deterministic suites have no live network calls.
- [x] Affected recipe, planner, lifecycle, storage and user-data contracts are preserved.
- [x] Affected UI is inspected on desktop/mobile, keyboard, touch, labels, themes and recovery states; non-UI exceptions have an explicit reason.
- [x] Separate self-review and affected reruns pass; evidence and decision trail are current.
- [x] Independent interrogate covers the integrated increment, requirements, all acceptance rows, contracts, revisions, captures and unfinished-work claims. Save reproductions, fixes/reruns, dropped claims and verdict in `docs/sprint-evidence/sprint-2/interrogate.md`.
- [x] Relevant audio/listening and resource evidence exists. Physical-device evidence is deferred to Sprint 12 by explicit user authorization; other missing observations stay NOT VERIFIED.

After the preceding gates pass, deliver this sprint's single PR. PR creation is a delivery step, not a prerequisite to reviewing the increment.

- [x] Commit, push and open/update one sprint PR linking plans, exact checks, captures, evidence, review verdict, gaps and dependency revisions.
- [x] Verify PR URL and CI state; record URL in References, Execution log and TODO.md, then push bookkeeping.

Complete only when all gates pass. Qualified last-resort exceptions keep boxes unchecked and status In progress with `sprint-2-unfinished.md`. Merge and deployment follow actual authorized scope.

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
- Sprint PR: [#3](https://github.com/ashcx/audio-toolkit-v1/pull/3).

## Execution log

### 2026-10-29 - Planning draft

Stories and initial estimates drafted from requirements. No implementation, Ready verification, tests, device observations or sprint review occurred. Next action is to verify Entry criteria after an implementation instruction.

### 2026-10-29 - Planning and implementation

Verified Sprint 1 source, all checked exits, independent verdict and open/ready PR #2 directly. No carry-forward exists. Implementation base is 34fc333. Retained TypeScript/Vite and selected Preact to match sibling tooling without a source/build dependency on its checkout. UI state is theme preference, selected File list and terminal export-format selection. App shell owns layout and browser capability guidance; no engine, recipe execution or upload path is introduced.

Read image-app typography, tokens and control styling read-only. Added warm neutral and dark themes, stacked mobile panels, accessible hub link, basic file picker/removal and a terminal export region. The full recipe, metadata and processing implementations belong to later sprints.

`npm run build`, `npm run typecheck`, `node scripts/workspace-check.mjs` and `git diff --check` passed. The browser script exercised Chromium and Linux WebKit at 1440/390px, light/dark/system including live media changes and reload, long filenames, keyboard removal, export selection, missing-capability/Firefox notices, and no external/eager-model requests. Captured eight states and inspected desktop light and mobile dark visually. Initial test assumed a synchronous Preact effect; corrected it to await observed theme application. Disabled screenshot animations to capture settled colors. No product behavior was changed to satisfy that timing check.

Next action is independent interrogate of the integrated workspace increment. Actual devices and real listening remain NOT VERIFIED under their later gates.

### 2026-10-29 - User-directed simplification and review fixes

The user requested minimal copy following the image compressor, removing redundant text and random icons. Removed the promotional hero, numbered labels, decorative waveform/music/upload icons, badges, duplicate privacy instructions and empty results panel. Keep Files, Recipe, one shared-settings hint, Export/Format, file-type guidance and one privacy line. Results will appear when outputs exist. Capability warnings are concise and conditional. This direct instruction supersedes the draft empty-results layout.

Independent review also reproduced keyboard-focus loss after removal and missed FxiOS detection. Parent checked the reported causes in source and reran the reported journeys after fixing them. Removal now retains next/previous remove-button focus or returns to the file picker when empty, and detection recognizes both Firefox/FxiOS. Browser checks now assert focus recovery and iOS Firefox notice. Build and refreshed Chromium/WebKit desktop/mobile checks passed. Final captures replace the draft's verbose layout and were visually inspected again. Next action is full refreshed independent review.

### 2026-10-29 - Independent review and retrospective

Independent Terra high review found focus/FxiOS issues and, after minimal-copy redesign, a missing required first-use download disclosure. Fixed all three and reran the actual affected journeys. Full and affected review refreshes found no outstanding verified findings. Retain the single short footer disclosure, avoiding duplicate paragraphs. Final build/type/browser checks passed. Retrospective: start with action labels and add context only when needed; preserve keyboard focus after list mutations. Next action is the one sprint PR.

### 2026-10-29 - PR delivery

PR #3 open/ready, stacked on Sprint 1 PR #2 at34fc333. Reviewed implementation committed as fd223d0. GitHub shows no configured checks, not passing remote CI. Bookkeeping preserves reviewed behavior. No merge/deployment. Next eligible work is Sprint 3.
