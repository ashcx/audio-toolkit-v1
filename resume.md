# Resume after Sprint 18

Paused at the user's request after Sprint18 design, implementation and independent Terra/Luna review. Wait for an explicit resume. Sprint19 and Sprint20 have not started.

Branch `codex/sprint-18-workspace`; reviewed implementation `47049c9`. [Draft PR20](https://github.com/ashcx/audio-toolkit-v1/pull/20) targets main. The latest branch commit adds this handoff. Earlier draft PRs16–19 contain speech cleanup, acceleration assessment, isolation baseline and retain-baseline disposition. Branches are cumulative; resume from this branch, not bare main. Nothing merged or deployed.

Sprint18 removes presets/test/reuse flow, provides direct Export, compact rows and accessible modal Settings, preserving trim/playback/download/error paths.67 normal tests, production build and static audit pass. Actual Chrome verified mixed-file exports, repeated reprocessing, downloaded PCM lengths, individual trim, playback, light/dark/mobile layout and Escape focus return. Both reviewers' findings were fixed. See [Sprint18 review](docs/sprint-evidence/sprint-18/interrogate.md). Evidence and captures are alongside it.

Remaining acceptance gaps include physical touch/screen-reader/Safari/Android, native exit-prompt behavior and rerunning12 migrated standalone browser drivers. Prior human listening, peak process memory/thermal, forcedCPU comparison, DeepFilterNet weight redistribution clarification and transitive compiled notices remain open. No speed or isolation quality improvement is claimed.

On resume, read [roadmap](TODO.md), `todo/orchestration-plan.md`, `todo/redesign-scrum-plan.md`, and Sprint19/20 plans. Implement Sprint19 sliders/precise fields, segmented choices, accessible pointer/touch/keyboard reordering and visual trim controls. Then Sprint20 supported folder saving, safe collision/failure behavior and ZIP/individual fallback. Continue sequential implementation, at most Terra/Luna independent reviewers, one PR per sprint, no merge/deploy. Key UI files are `src/{recipe-editor,trim-fields,file-row,main,style}`. Consult the [decision trail](docs/sprint-evidence/decisions.tsv).

Use project-local Node22.23.1 via `PATH="$PWD/.artifacts/tooling/node_modules/node/bin:$PATH"`. Chrome file URL access is enabled. Use the codex-chrome skill/runtime. Avoid native confirm dialogs, which can lock browser control. Downloads complete through ordinary clicks even when download-event waiting times out. Private fixtures remain in `.artifacts/`. Preview4184 remains for inspection; verify its process before reuse.

Preserve inherited user changes: deleted `todo/sprint-12-unfinished.md`, untracked root/todo `.DS_Store`. Do not stage them. Historical `todo/RESUME.md` is superseded by this note.
