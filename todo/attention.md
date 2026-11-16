# Attention

What needs the user. Newest first.

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
