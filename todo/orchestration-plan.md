# Audio Toolkit orchestration plan

## Authorized outcome

Convert the feature plan into a TODO roadmap and sequential sprint plan. The initial planning run edited records only. On 2026-10-29 the user authorized complete implementation, tests and PR delivery, with no merge or deployment. Preserve lowercase `todo/` paths and historical requirements. The user selected a public `ashcx/audio-toolkit-v1` repository.

## Execute in dependency order

On 2026-10-30 the user authorized three speech-cleanup sprints and a new Voice isolation recipe with Standard (GTCRN) and Detailed (DeepFilterNet3) options for comparison. These are distinct from voice/music separation. Sprint 13 compares models and execution paths, Sprint 14 implements both options, and Sprint 15 pursues acceleration only when measurements justify it. Retain both for user evaluation; the user will decide their final inclusion. All PRs target main and require explicit user permission to merge.

The user added Sprints 16 and 17 for music and vocal separation performance. Sprint 16 compares the existing SCNet pipeline, practical SCNet optimizations, and DTTNet where feasible. Sprint 17 implements only an improvement supported by those results. Speech cleanup and separation research can be prepared independently, but shared runtime and recipe contracts must be coordinated before changes are integrated. Run performance measurements on the Mac one at a time to avoid competing workloads. The user provides Mac and listening observations; absent observations remain not verified. Each sprint has its own PR targeting main.

On 2026-10-30 the user requested planning only for a UI redesign after Sprint 17. Sprints 18, 19, and 20 respectively simplify the workspace, modernize recipe controls, and add folder delivery with an accessible ZIP fallback. The new [requirements](audio-toolkit-plan.md#28-redesign-direction-2026-10-30) supersede conflicting earlier UI requirements without changing historical evidence. No redesign execution is authorized by this planning request. Verify each predecessor and its review evidence before beginning a dependent sprint.

Follow [TODO.md](../TODO.md), one sprint, story and task at a time in the main instance. Verify predecessor artifacts directly. No parallel implementation. The latest user instructions restore PR delivery. Create working branches for reviewed sprint PRs targeting main. Do not commit/push directly to main or merge without explicit user permission. Pages deployment follows an authorized merge, not branch delivery. Record starting/ending revisions and refresh affected verification after changes. Independent technical review and truthful acceptance gates remain binding.

## Freeze contracts before consumers

| Owning sprint | Contract freeze | Consumers |
| --- | --- | --- |
| 1 | Upstream/license/capability matrix, fixture protocol, audio tolerances and initial browser/device targets | 2–12 |
| 2 | Build asset/base-path and capability reporting | 3–12 |
| 3 | Stable file IDs and probe metadata | 4–12 |
| 4 | Versioned recipe, source-time trim and effective snapshot | 5–12 |
| 5 | Processor capabilities and per-file execution plan | 6–12 |
| 6 | Bounded PCM chunks, backpressure, source-time mapping, analysis passes and minimal PCM16 WAV output | 7–12 |
| 7 | Encoder/output properties and terminal flush | 8–12 |
| 8 | Job lifecycle, attempt identity, cancellation and resource ownership | 9–12 |
| 9 | Isolation runtime, overlap reconstruction and global single-job limit | 10–12 |
| 10 | Test-result identity, lifetime and reuse invalidation | 11–12 |
| 11 | Result storage, ZIP naming and measured cleanup/resource limits | 12, 20 |
| 18 | Compact file states, settings location and export-only flow | 19–20 |
| 19 | Recipe ordering, parameter controls and trim interactions | 20 |
| 20 | Folder permission, safe output naming and partial-failure semantics | Final redesign acceptance |

Record concrete schemas and pass predicates before dependent implementation. No API or performance claim has been validated by this plan.

## Resolve proposed defaults

Use peak-only normalization initially; proper LUFS and true peak remain deferred under source sections 11/23. Use one source-time trim, omitted bounds as file start/end, recipe editing locked during runs and retry from frozen snapshots. Start with no processors and MP3 at 192 kbps export. Presets preserve stable-ID overrides when trim remains present; explain and confirm before clearing incompatible overrides. Start WAV at PCM16 and Opus at 64/96/128/160/192 kbps. Reject unsupported multichannel conversion until a documented mapping is verified. These are proposed defaults, revisable before the owning freeze.

Sprint 1 selects actual browser/OS minimums, available devices, numeric audio tolerances, source/model revisions and viable hosting/fallback paths. Sprint 11 establishes measured workload limits. No invented unlimited-file or background-execution promise.

## Keep cross-project work separate

Source section 4 is a coordination requirement. Record hub/image handoff and audio navigation here. Read existing design sources as needed. Modify sibling workspaces only under separate authorization. Their delivery never follows from an audio PR.

## Progress with evidence

Use [Scrum policy](redesign-scrum-plan.md). Keep unfinished tasks in the owning sprint. Only an independently reviewed last-resort record permits independent later work. Recheck independence at each entry. Missing independent review, core correctness, safety or contracts cannot qualify.

## 2026-10-29 - Authorized device-gate adjustment

The user explicitly authorized automated Chromium/WebKit checks in early sprints, leaving real Safari/Android claims unverified until user device testing at final acceptance. Apply this to early entry/exit checks without claiming physical-device support. Sprint 12 retains the real-device gate. This does not waive licensing, correctness, resource or independent review requirements.

The user also explicitly authorized synthetic early isolation feasibility, with real music/live listening in the isolation sprint before final acceptance. Early tests must still establish bounded candidate execution and honest quality/reference budgets; actual listening remains a required later gate.

## 2026-10-29 - Minimal interface direction

The user explicitly requested the image compressor's low-copy approach. Keep concise action/field labels and only necessary context. Remove decorative icons, promotional headings, repeated privacy statements, redundant badges and empty result explanations. Show contextual help when a setting or failure needs it. Results appear when outputs exist. Apply this direction to all later audio UI.

## 2026-10-29 - Resume on live main

The user integrated the earlier branches, enabled Pages and resumed work. Starting main3c29c0f includes checkpoint3f7e408. Deployment40858999659 succeeded; live page returned200. Follow the replacement AGENTS workflow directly on main. Earlier no-deploy and one-PR-per-sprint statements describe historical scope; current verified main pushes intentionally trigger the user's Pages workflow. Do not treat hosting success as processor or device acceptance.

## 2026-10-30 - Authorized Sprints 10 through 12

The user explicitly requested continuation and one PR per sprint after receiving the isolation reliability result. Continue technical work from reliability PR #10, retaining its unverified Mac GPU, thermal and listening observations in Sprint 12. This instruction authorizes progression despite those disclosed observations; it does not mark Sprint 9 Done or waive final release evidence. Each sprint has a branch and a PR targeting main. Later sprint branches include earlier open dependencies; document merge order as PR #10, Sprint 10, Sprint 11, Sprint 12. No merge or deployment is authorized.

Sprint 10 freezes a single Batch owner for both tests and exports, with successful matching test outputs reusable once. File object and effective plan identity govern eligibility. Settings changes invalidate eligibility without deleting the previous downloadable result. Presets preserve trim and stable-file overrides, except original extraction which clears incompatible trim only through the existing confirmation path.

### 2026-10-30 - Sprints10–12 technical delivery

Sprint10 PR11 and Sprint11 PR12 target main; Sprint12 is prepared on codex/sprint-12-release-readiness based on98f1020. Independent Terra high review became available and reviewed all three increments; previous Sprint10 capacity block is resolved for technical review. Eleven integrated automated suites and58 unit tests pass; device/listening acceptance remains open. This advances the user's explicitly requested dependent technical work against frozen interfaces without declaring earlier missing acceptance Done. No PR merged or candidate deployed. See Sprint12 coverage and unfinished acceptance record.
