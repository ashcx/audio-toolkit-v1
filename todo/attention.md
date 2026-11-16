# Attention

What needs the user. Newest first.

## 2026-11-16 — Responsive defaults for the file list and the steps

Two changes on `feat/responsive-default-expansion`, one commit each plus a checks commit, not pushed. Finished rows now start expanded above 600px and collapsed at or below it, and recipe steps start closed on mobile (600px or less). Tablet and desktop steps behave as before.

- Decided without asking: on mobile a step with a validation error opens so its fields stay reachable, but if the user closes it the error text stays shown and the step stays closed. A step you opened by hand stays open after the error clears. A row you toggled by hand keeps its state across a resize, and untouched rows follow the viewport.
- Measured: Steps panel with Trim all and Gain at 375px, 517px to 274px. Three finished tracks on a tablet or desktop are now 578 to 586px tall (260 to 268px before), by design.
- A viewport change that collapses a row showing the Original switches it to the Result, as collapsing by hand does.
- Not run: WebKit, real devices and rotation, `axe`, and the seven older drivers already known stale. Port 4173 was held by another session, so a preview ran on 4183.

## 2026-11-16 — Sprint 30 follow-up round

Four approved changes are in, one commit each on the PR branch, not pushed. Toggle B for Original and Result, notes above the player, the meta line `00:02 / 03:02 · Trimmed to 02:10` (Result view `00:00 / 02:10 · Trimmed`), and no control styled as a link. Details: `docs/sprint-evidence/sprint-30/interrogate.md` (Follow-up round) and the sprint Log.

- The user's "Clear all appears as a link" report: reproduced. `Cancel all` and `Retry failed` were underlined green link text beside the buttons, and a disabled Clear all lost its border. Both are fixed: every action in the Export pane is a bordered 44px button in one row.
- Decided without asking: the Result view reads its trim from the job's frozen plan, the header brand stays a plain title link, a result that cannot play no longer shows a visible `Result` label beside its note, the older-settings name is spoken and in a tooltip only.
- Seven older drivers (`batch-check`, `copy-check`, `dsp-check`, `format-check`, `isolation-check`, `sprint-24-check`, `sprint-26-check`) still assert the old visible text or `.file-result`. They are outside the required list and were not run or migrated.
- Not run: WebKit, iOS Safari, Android, a screen reader, `axe`.

## 2026-11-16 — Sprint 30 open items

Built and in a PR for your review. Not merged. The gate is incomplete.

- Lane E, the regression comparison against the base build, did not finish, so exported file bytes and the recipe and Export panels were not compared trunk against head.
- The four low issues are fixed, one commit each, with a check that failed before: no live position for a playable file of unknown duration (`e9b00b7`), a lost position on a rapid double switch (`4000f67`), a brief `--:--` when collapsing from Original (`fba619c`), and an invisible collapsed progress line in forced-colors mode (`6dbd580`). Checks are the T8 section of `scripts/sprint-30-check.mjs`. One older assertion in `intake-check` was migrated (see the sprint Log).
- Not run: WebKit, iOS Safari, Android, `axe`, real OS drag and drop.
- Details and the process issues faced: `docs/sprint-evidence/sprint-30/interrogate.md`.

## 2026-11-16 — Sprint 30 is planned and waiting for your go

[Sprint 30](sprint-30-compact-track-list.md) is written and not started. It does not run until you say so.

Defaults applied. Each can be reversed before the sprint starts:

| Call | Default | Alternative |
| --- | --- | --- |
| Download | Stays in the row header, so a collapsed row keeps it | Move it beside the Result, which hides it on collapsed rows |
| Preview | Stays in the header, names ellipsise to one line | Move it to a second control row (+44px) or an overflow menu |
| Remove | Stays a visible 44px button | Overflow menu or swipe to delete (saves about 44px of header width) |
| Duration | The live position replaces the static duration in the file line | Keep both, or show the position inside the player row |
| Finished rows | Collapsed by default, running, failed and previewing rows stay expanded | Expanded by default, the user collapses |
| Original and Result | One player with a switch that keeps the position | Two inline players, Original behind a toggle |
| Size | One sprint, 7 tasks, one PR | Split T5 and T6 into a stacked Sprint 31 |

The repo-wide `check-sprints.mjs` cannot pass here because the legacy sprint files (1–29) and `orchestration-plan.md` predate the scrum-mode frontmatter. The new sprint file was validated in an isolated root. See the Log in the sprint file.
