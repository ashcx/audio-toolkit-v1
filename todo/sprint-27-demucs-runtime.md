# Sprint 27. Evaluate and optimize browser Demucs v4

Status is implemented on branch `codex/sprint-27-demucs`, not merged. Updated 2026-11-08. By the user's later instruction Demucs replaced SCNet as the only isolation engine. Listening (27-05), physical-device checks and independent review remain open. Evidence and the requirement coverage table are in [coverage.md](../docs/sprint-evidence/sprint-27/coverage.md). Do not merge or deploy without a separate user instruction.

## Goal

Deliver the fastest verified, usable Demucs path for this device/browser tier, targeting OBRA Fast as the practical reference rather than studio-quality stems.

## Dependencies and execution order

Current main processing pipeline and the recorded Sprint 21 baseline. No dependency on Sprints 24–26. This can be the next execution priority.

Sprint numbers identify scope, not a mandatory numerical execution order. Verify current main and existing PR state before branching.

## Scope

Pinned model/runtime provenance, a faithful prototype adapter, actual provider profiling, controlled optimization, matched speed/listening comparisons and safe promotion criteria.

Out of scope is default fine-tuned ensembles, HQ RoFormer, translating native CUDA claims into browser speed claims, or hiding unsupported runtime/model paths.

## Entry criteria

- [ ] Read this sprint, its dependencies and the current source at a recorded main SHA.
- [ ] Confirm the dependency features work on the actual surface; historical completion labels are not sufficient evidence.
- [ ] Record representative fixtures, current behavior, resource constraints and the baseline checks needed for this sprint.
- [ ] Resolve shared recipe, worker, playback or export contracts with other in-flight work before editing the same files.

## Required behavior and data contracts

Start from the OBRA-observed pinned htdemucs_fp16.onnx artifact, 44100 Hz and 343980-sample segments. Treat its 25% core overlap as an observed default requiring revalidation. FP16 storage is not proof of FP16 computation. Match model metadata, transform scaling and tensor source order before tuning.

## Implementation checklist

Depends on the current main processing baseline, not on Sprint 24. Goal is fast, usable separation that improves on the user's current SCNet experience. Studio-quality isolation and the fine-tuned multi-model ensemble are not default targets.

- [x] Pin the OBRA reference model, model hash, runtime version and public configuration before testing. Record relevant source and weight provenance. Establish a compatible packaging path before distribution.
- [x] Build a disposable local adapter/probe using standard four-stem HTDemucs. Verify sample rate, model metadata, input/output shapes, stem order, normalization, transform framing, overlap reconstruction and full-length endings against a trusted reference. Do not label an integration correct because it merely returns nonzero samples.
- [ ] Benchmark actual current-main SCNet, experimental SCNet reuse, the initial Demucs adapter and the optimized Demucs adapter on the same lawful recordings. Use OBRA Fast on the same source/device/browser where comparable. Keep a full-four-stem comparison separate from a vocals/instrumental-only delivery comparison.
- [ ] Start with the reference's 7.8-second model segment and 25% overlap. Compare supported 10%, 25%, 40% and 50% overlaps only after reconstruction is correct, one variable at a time. Lower-overlap speed settings need listening checks at boundaries and on the user's distracting passages.
- [x] Keep one session for a bounded run where owned-memory evidence supports it. Compare bounded lifetimes and session initialization costs. Do not recreate the model for every window by default simply to preserve the old adapter's structure.
- [x] Profile model setup, transforms, neural inference, GPU/CPU transitions, buffer transfers, reconstruction and encoding separately. Verify actual provider/kernel placement instead of treating a GPU badge as utilization proof.
- [ ] Test a pinned ORT version and a compatible newer version only where there is a concrete optimization hypothesis. Evaluate graph optimization, stable-shape buffers, tensor disposal, buffer reuse and GPU-resident data. Test true reduced-precision computation only as a distinct candidate with output validation; FP16 storage alone is not that candidate.
- [x] Evaluate WASM thread counts only when the hosting surface can provide the required isolation headers. Preserve a functional single-thread fallback. Do not assume GitHub Pages supports the necessary headers or add a service-worker workaround without an explicit hosting decision.
- [x] Avoid simultaneous full-song model jobs when they compete for the same GPU/memory. Bound concurrency, cancellation time, temporary storage and result retention. Reuse downloaded model assets without confusing disk cache with an active session.
- [x] Use five interleaved warm runs per candidate, separately label cold download/setup, and record median/range, failures, completed windows, actual model loads, output duration, owned peak memory and end-to-end completion. Include short excerpts and 3-, 5- and 10-minute recordings when resource limits permit. Record early limits rather than crashing the browser.
- [ ] Save matched outputs for listening on vocals and accompaniment, including reverb tails, cymbals, bass, transients and joins. Prefer the fastest candidate with acceptable listening quality. Require a repeatable speed improvement beyond variation and no new distracting regression; do not substitute reconstruction error for source-separation quality.
- [ ] Deliver a documented choice and a verified runtime adapter if it passes. If blocked, identify the exact failed model/runtime/resource condition, retain the working engine and keep the prototype evidence. Do not call an unmeasured default switch an optimization.

Evidence goes under `docs/sprint-evidence/sprint-27/`. Acceptance includes a reproducible benchmark, matched listening outputs, supported-device limitations, cancellation/cleanup and an independent Terra/Luna review. No performance number is claimed by this planning document.

## Acceptance scenarios

Check a scenario only when its evidence exists. A passing unit test alone does not establish live behavior or audible quality.

| Scenario | Required observable result | Evidence |
| --- | --- | --- |
| 27-01 | Verify model bytes/hash, preprocessing and outputs against a trusted reference, including source order and complete endings. | `docs/sprint-evidence/sprint-27/scenario-01.md` |
| 27-02 | Compare actual current-main SCNet, experimental SCNet reuse, initial Demucs and optimized Demucs on the same device, files and output scope. | `docs/sprint-evidence/sprint-27/scenario-02.md` |
| 27-03 | Run five interleaved warm trials per shortlisted candidate, with cold setup separate and failures/work counts recorded. | `docs/sprint-evidence/sprint-27/scenario-03.md` |
| 27-04 | Test short excerpts plus 3-, 5- and 10-minute inputs where resources permit; record hard limits instead of crashing the browser. | `docs/sprint-evidence/sprint-27/scenario-04.md` |
| 27-05 | Check lower-overlap boundary artifacts and the user’s distracting passages with matched listening outputs; reconstruction error alone does not measure separation quality. | `docs/sprint-evidence/sprint-27/scenario-05.md` |
| 27-06 | Verify initialization/inference cancellation, GPU failure and CPU fallback, retry, bounded memory/storage and resource release before default promotion. | `docs/sprint-evidence/sprint-27/scenario-06.md` |

## Verification and evidence

- [x] Run focused behavioral checks for the changed contract, then `npm test` and `npm run build`. Run applicable existing browser/static/format checks. Record exact commands, exit status and tested revision.
- [ ] Drive the changed workflow in actual Chrome using the Chrome skill. Save screenshots and an interaction recording for user-facing controls. Distinguish observed browser results from physical-device coverage.
- [x] Record relevant processing/interaction time, memory, cancellation and cleanup checks. For a speed claim, read the benchmark checklist first, use interleaved matched runs, validate outputs and identify the limiter. No speed claim from unlike output scopes or failed work.
- [x] Record source provenance, unresolved gaps and decisions under `docs/sprint-evidence/sprint-27/`. Use a coverage table linking every requirement and scenario to its artifact.
- [ ] Obtain independent Terra and Luna review, at most two reviewers. Resolve verified findings and record the exact reviewed revision; missing review remains open.
- [ ] Audit the final diff for unnecessary abstractions, misleading labels, comments/suppressions and unrelated changes.

## Risks and fallback

Weight distribution terms need verification independently of code licensing. GPU selection does not prove all-GPU inference. Persistent model reuse needs owned-memory and cancellation evidence; historical WebKit reuse failures remain relevant. A faster rejected or corrupted output is not a win.

If a requirement fails, retain its unchecked state and the failed evidence. Revert an unsuccessful experimental change rather than describe it as complete. State the working fallback and the exact condition required to resume the blocked part. Do not replace mandatory tests with a generic disclaimer.

## Exit criteria and PR delivery

- [ ] Implementation and acceptance scenarios have linked evidence, with any unverified platform/listening checks named explicitly.
- [ ] Unit/build/live checks and applicable resource checks pass at the final head, with independent review recorded.
- [ ] Deliver one working-branch PR for this sprint. Do not bundle another sprint's feature changes into its review diff.
- [ ] If based on an unmerged parent, target that branch and clearly state the dependency. After the parent merges, retarget the child to main before merging it.
- [ ] Report the PR, observable result, tests, tradeoffs and remaining limits. Do not merge or deploy without separate authorization.

## References

- [Roadmap](../TODO.md).
- [Pending sprint index](README.md).
- [Original context and research](demucs-waveform-sprints.md). The checklist in this individual file is authoritative for Sprint 27.
