# Sprint 8 independent interrogate

Intent is a cancellable fault-isolated browser-local batch with frozen retries, retained successful outputs, bounded jobs and minimal controls. Baseline main38ca16e through reviewed-code.sha256, all requirements16/19, Ready/Done/story predicates, architecture/ownership, captures, audio/resource evidence, decision trail and predecessor records are in scope.

Fresh dispatch hit the runtime thread limit. One completed non-implementing independent reviewer was reused through the runtime follow-up action under poteto's explicit exception. Model gpt-6.1-terra high. These refresh rounds count as one reviewer, with no fresh-agent or multi-model diversity claim.

## Findings and corrections

S08-F01 reproduced independently and by parent: exactly one injected deletion failure left Cancelled with3 stores and only1 deletion attempt, starting from0 stores and4 active entries. Cleanup now attempts every owner, retaining failed callbacks in a CleanupFailure. Batch surfaces a failed cleanup state and Retry cleanup, owns callbacks even after removal and blocks new exports until recovery succeeds. Persistent failure stays visible.

S08-F02 reproduced independently and by parent: removal of a completed file with deletion held left Export enabled and permitted another running job. Active retained-output deletion now participates in busy/cleaning; errors are remembered before clearing busy. Recipe/trim/export controls remain locked through it.

S08-F03 reproduced independently and by parent: after a one-time replacement deletion error, successful recovery cleared pending ownership but Retry rethrew a stale rejected prerequisite, keeping runner count1. Recovery now resolves that job's prerequisite; unit/browser checks require a new successful run.

Exact parent commands and outputs are in findings.md. No finding is waived or carried forward. Initial and first-refresh verdicts FAIL are preserved. The final independent cleanup driver passed six engine/case combinations, all27 unit tests and the reviewed-code hash manifest. Final independent batch suite exited0 in Chromium/WebKit, including mixed MP3, cancellation, five-stage faults/retries, frozen settings, one/two top-level PCM slots and keyboard/touch. All27 unit checks and reviewed-code hashes pass. Final scoped technical verdict PASS. All three findings are resolved, not dropped. No new proven behavioral findings. Reviewer inspected all four final desktop/mobile captures, contracts, stories, requirements and decision trail.

## Dropped hypotheses and comment lens

A synthetic worker sent done while retaining an extra unfinished store and exposed a potential handoff rejection concern. No real-worker path was shown because real normalization awaits checkpoint discard. It is labelled unproven, not a verified integrated finding. No other dropped claim currently recorded. The reviewer found no scoped comments/suppressions to delete, restore, hold or encode; final refresh confirmed the same zero-count lens.

## Limits

This sprint validates named job-slot/storage/cleanup/audio/UI cases. Full RSS/retention/ZIP workload limits, total nested codec threads, physical devices, isolation listening and the final transitive license audit retain later gates. Abrupt page termination and background completion are not promised. Main/Pages delivery is recorded separately after this technical verdict.

Delivery observed after final technical verdict: main312c673, Pages40927620132 success, actual live cancellation/retry and two valid MP3 downloads, HTTP200/matching asset. Metadata-only closure preserves reviewed-code hashes.
