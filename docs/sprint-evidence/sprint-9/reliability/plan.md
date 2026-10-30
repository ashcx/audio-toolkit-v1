# Isolation reliability investigation

User reports Chrome on Mac gets hot and alternates Separating / Loading model without a usable result. Goal: complete real full-song voice/music exports, monotonic understandable progress, bounded ownership, cancellation/retry, no private song content in GitHub. Physical Mac hardware claims require that surface; connected Playwright currently reports Linux Chrome.

- [x] Ignore test_songs before inspection; verify zero tracked songs. Keep private inputs, outputs and raw diagnostics under ignored paths.
- [x] Reproduce on the deployed site through Playwright and record actual model loads, completion/failure, output validity and resource behavior on anonymous full-length song aliases.
- [x] Binary-search repeated session initialization, missing overall progress, backend retry/liveness and numerical/cleanup faults. Test sustained-session memory under a declared 2 GiB owned-browser aggregate RSS guard before choosing a replacement.
- [x] Plan and implement only demonstrated root fixes, with explicit inference-session/request/progress state and conservative platform behavior. Compare distinct lifetime designs before crossing contracts.
- [x] Verify original full-song flows, both modes, supported exports/recipe order, cancellation at each meaningful phase, retries, mixed batches, corrupt/missing model/runtime, invalid/silent/short input, storage failures and download validity. Preserve exact pass/fail/NOT VERIFIED rows rather than claim every hypothetical combination.
- [x] Independent interrogate challenges the integrated product fix with executable reproductions and current source hashes; parent reproduces findings. Later test-driver additions are parent-executed; physical Mac and subjective listening remain unverified.
- [ ] Commit and open a fix PR against main without merging. Recheck test_songs and ignored private outputs immediately before push.

Throughput checkpoint: first real-song baseline and a five-window sustained-session feasibility probe. Continue only with observable forward progress and independent decoded output; do not label cycles a reload or hardware GPU failure without evidence. No speedup percentage is claimed from these probes. Normal browser GPU diagnostics and thermal behavior are distinct from the reported Mac device.
