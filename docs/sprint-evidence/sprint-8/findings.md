# S08-F01 cancellation cleanup stops at the first deletion error

Status: resolved by parent and final independent executable checks.

Independent reviewer and parent ran `node .artifacts/s8-review/cleanup-failure.mjs` against the original Sprint8 dist. Both observed initial stores0, active stores4, state cancelled, idle stores3, deletion attempts1 after exactly one injected removeEntry failure. This violates US03 and terminal ownership. The failure is retained, not dropped or carried forward.

processAudio cleanup iterated owned stores with an early throwing await. Batch then treated any rejection after an abort as cancelled. The correction attempts every discard and raises a CleanupFailure that retains only failed actions. Batch remembers that recovery capability even for removed jobs, shows a truthful failed cleanup state, blocks new work until cleanup succeeds, and exposes Retry cleanup. Persistent failure remains visible; success clears only recovered ownership. Copy and stale-success release use the same rule. The corrected contract is recorded in architecture.md.

Executable coverage is scripts/cleanup-check.mjs in Chromium/WebKit, tests/batch.test.mjs and the full integrated batch/copy regressions. Final cleanup6-case, batch2-engine,27-unit and hash checks pass independently. See interrogate.md.

# S08-F02 removed completed output cleanup is not busy

Status: resolved by parent and final independent executable checks. Parent reproduced `node .artifacts/s8-refresh/remove-pending.mjs`: held cleanup left Export disabled false, and another export entered running. Batch now tracks in-flight retained-output releases in busy/cleaning state, locks recipe/trim/export, and shows Cleaning up until deletion settles. Errors enter retained recovery ownership before busy can clear. Unit regression holds a real output-release promise and requires no new job to start. Browser regression holds OPFS removal and checks controls and cleanup.

# S08-F03 recovered replacement keeps a rejected prerequisite

Status: resolved by parent and final independent executable checks. Parent reproduced `node .artifacts/s8-refresh/retry-prerequisite.mjs`: after cleanup pending0, retry returned to failed/pending1 with runner count still1. Successful recovery now replaces that file's rejected readiness prerequisite with a resolved promise before retry. Unit regression requires runner count2 and done; browser regression replaces a completed output, injects deletion failure, recovers then retries the actual audio export.

# Dropped completion-handoff hypothesis

A synthetic worker could send done while retaining an extra unfinished store and trigger a promise-handoff concern. The real worker awaits checkpoint discard before sending done; no actual path was demonstrated. Reviewer labelled the synthetic sequence unproven for the integrated artifact. It is not counted as a proven finding or hidden as a successful real-worker test.
