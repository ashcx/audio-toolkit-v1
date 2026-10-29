# Sprint 8 batch ownership

## Ground

Baseline main38ca16e includes merged pause PR8 and reviewed Sprint7. useExport currently owns a serial for-loop, a single controller, retained output URLs and UI updates. It marks only the active file; queued and cancelled files have no explicit lifecycle. processAudio owns its worker and all temporary OPFS stores, serializes storage RPCs and terminates on abort before waiting for outstanding writes and discarding stores. copyAudio checks abort between bounded writes/packets and disposes its input. File IDs and compiled effective plans already freeze recipe/source metadata.

## Design exploration

The prior read-only Terra low candidate separates batch ownership from the UI hook. A new Luna low dispatch on resume hit the thread limit. Per poteto's exploration fallback, the parent provides a labelled sequential alternative: keep a queue, attempts map, retained map and run loop inside useExport, exposing cancel/retry closures. This is fewer modules but couples state updates, async ownership and hook lifetime; concurrent cleanup requires keeping several refs synchronized. No second independent model or judge is claimed.

Score criteria are one resource owner, stale-result safety, frozen retries, bounded concurrency and readable extension. The standalone owner wins ownership and extension; both can freeze retries and bound concurrency. Select one batch owner with a small subscribe/start/cancel/retry/remove/dispose API. Graft the hook alternative's minimal UI integration. No additional policy/service layer. Main instance alone implements.

## Frozen contract

Each job holds its FileEntry, compiled plan, allocated output name and state. States are waiting, running with an AbortController attempt identity and operation, cancelling with that same attempt, done with one retained output/URL, failed with an error, and cancelled. A completion/event is accepted only for the same current record and active attempt, not aborted or disposed. A stale output is released. A slot remains occupied until runner cleanup resolves, including cancelled/removed jobs. Retry uses the stored job spec and fresh attempt. New settings start a distinct run. One owner revokes URLs and releases retained outputs; runner owns temporary data until returning success.

Allocate names against other retained/queued job names. Failure is per job. Cancel-all marks waiting jobs cancelled before aborting active jobs so no new work dispatches. Removing a file removes its record and aborts its attempt; cleanup still occupies a slot. Recipe and per-file trim inputs stay locked through active cleanup; downloads and removal remain usable.

Start at one slot when memory/CPU capability is absent or conservative; permit two only with at least8 reported logical CPUs and8GB deviceMemory, workers and OPFS. This is a policy bound, not a measured large-file guarantee. Isolation remains unavailable until Sprint9 and must then reserve one global inference slot. PCM blocks and output backpressure remain unchanged. No reliable percentage exists; show current operation and overall terminal/waiting/active counts.

PCM feeding overlaps decode/process/encode. Emit real boundaries, use Processing / encoding during streaming and Encoding for final flush, Normalizing when checkpoint analysis starts, Saving for final store close. Copy uses Reading, Extracting and Saving as applicable. Cancellation terminates a PCM worker immediately, then waits for outstanding storage cleanup; copy stops between chunks/packets. While cleanup remains, show Cancelling and a short contextual explanation. No background execution promise; the active-run hint says to keep the page open.

## Throughput checkpoint

First prove a real mixed batch, bounded slots and unchanged downloaded audio. Then cancel waiting/active/all, inject stage failures and delayed completion, retry frozen settings, remove/unmount, inspect OPFS/worker cleanup and responsive desktop/mobile controls. All required stories remain unverified until those checks and independent review pass.

Architect phases Ground, Sketch and Agree complete with reduced exploration noted. Implement then verify; Scrap only if ownership invariants cannot hold. Arena Frame/Fan out/Pick/Graft records are above; Cross-judge skipped because a third opinion adds little to the narrow ownership choice and capacity is exhausted. Verify remains open.

## Accepted correction S08-F01

Independent review and parent exact reproduction found cancellation reported Cancelled with3 remaining stores after one deletion error, and only1 deletion attempt. Sequential cleanup stopped early and the batch discarded the cleanup error because its signal was aborted. This violates terminal ownership. Extend the frozen contract with a CleanupFailure recovery capability retaining only failed discard actions. Always attempt every owned store. Batch retains failed cleanup even if the file was removed, reports a failure plus a global Retry cleanup action, and blocks new exports/retries until cleanup succeeds. Successful unrelated outputs stay available. Recovery retries only failed actions; a persistent error stays visible. This is an accepted parent correction to resource ownership, not a carry-forward. The queue/runner ownership design remains; no second scheduler is added.

S08-F02/F03 extend that correction. Track every retained-output deletion in busy/cleaning, including removed files; failed ownership is retained before clearing busy. Successful recovery clears a rejected per-file readiness prerequisite so retry can run. Initial operation Preparing covers prerequisite cleanup/tool setup rather than claiming the source is already being read. Export keeps its stable label; actual job phases and cleanup text describe current work. Parent accepted these narrow fixes after exact reproductions, without changing scheduler ownership.
