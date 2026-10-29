# Audio Toolkit orchestration plan

## Authorized outcome

Convert the feature plan into a TODO roadmap and sequential sprint plan. The initial planning run edited records only. On 2026-10-29 the user authorized complete implementation, tests and PR delivery, with no merge or deployment. Preserve lowercase `todo/` paths and historical requirements. The user selected a public `ashcx/audio-toolkit-v1` repository.

## Execute in dependency order

Follow [TODO.md](../TODO.md), one sprint, story and task at a time in the main instance. Verify predecessor artifacts directly. No parallel implementation. Each sprint has one PR. Downstream PRs target their actual unmerged predecessor where needed. Record base/head and refresh affected verification after base changes. Green checks grant no merge/deployment authority.

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
| 11 | Result storage, ZIP naming and measured cleanup/resource limits | 12 |

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
