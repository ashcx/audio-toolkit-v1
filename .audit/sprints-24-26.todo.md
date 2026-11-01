# Sprints 24-26 execution

Feature playbook steps, copied in order.

- [ ] how over the affected subsystem
- [ ] architect for parallel design exploration
- [ ] write the throughput checkpoint as four todo items
- [ ] delegate code-writing to a fresh owner in an exclusive worktree
- [ ] verify on the matching surface
- [ ] rebase into small, ordered commits
- [ ] interrogate before shipping if the design is contested
- [ ] run Opening a PR for each sprint

Task-specific:

- [ ] Sprint 24. Loudness, true peak and compression. Implement, verify, review, PR.
- [ ] Sprint 25. Compact workspace and playback. Implement, verify, review, PR.
- [ ] Sprint 26. Verified encoding modes. Stack on 25, implement, verify, review, PR.
- [ ] Record honest evidence under `docs/sprint-evidence/sprint-24..26/`.
- [ ] Keep the main checkout's unrelated planning files untouched.

## Throughput checkpoint

- **Blocking first steps.** Verify `origin/main` includes Sprints 21-23, read each sprint, capture the baseline UI, and freeze the shared contracts (recipe schema, plan shape, worker stats, export card) before fan-out. Done for 24 and 25; 26 waits on 25's Export card.
- **Independent workstreams.** Sprints 24 and 25 use separate worktrees and branches. Sprint 26 stacks on 25. Review and PR creation are serialized in sprint order.
- **Shared mutable state.** The main checkout is never written by a sprint owner. `recipe.ts`, `file-row.tsx`, `recipe-editor.tsx` and `style.css` overlap between 24 and 25, so each owner has an exclusive worktree and the root will run a combined merge check before the 25 PR. No two owners write the same tree.
- **Smallest safe decomposition.** One owner per sprint. Each sprint spans schema, worker/UI and tests, so splitting it across workers would serialize on the same files anyway. Sprint 26 is one owner on top of 25.
