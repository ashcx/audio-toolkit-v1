# Sprint 9 integrated review

Intent: browser-local ordered voice/music isolation with bounded ownership, source-time and batch behavior, privacy and minimal UI. Scope is main e9aef30 through the current Sprint 9 working tree, requirements 13/15/19/22, all Ready/Done and story predicates, implementation, contracts, numerical diagnostics, evidence and captures.

This is one independent gpt-6.1-terra high reviewer reused under the finished non-implementer exception after the runtime thread limit. It is not a fresh or multi-model verdict.

`node --test tests/*.test.mjs` passed 39/39. `sha256sum -c docs/sprint-evidence/sprint-9/reviewed-code.sha256` passed after the GPU diagnostic-only update. Scoped source comment and suppression review found no deletions, holds, suppressions or encoding offers.

`APP_URL=http://127.0.0.1:4174/audio-toolkit-v1/ ISOLATION_CHECK_ENGINE=webkit ISOLATION_EVIDENCE_DIR=.artifacts/s9-integrated-review/isolation node scripts/isolation-check.mjs` exited 0. Both actual long exports had 573437 frames and four model windows; voice plus music recovered the input with maximum error 0.000030517578125 and RMSE 3.6381953430032886e-7. The original S09-F01 browser reconstruction failure is resolved on the tested WebKit path. Hash-corruption retry, download and inference cancellation, OPFS and worker cleanup, keyboard/touch, same-origin GET-only traffic and page-error checks passed. The fresh desktop and mobile dark captures are readable and have no horizontal overflow.

The single WebKit full-app run sampled a peak aggregate owned-browser RSS of 2130718720 bytes against the 2147483648-byte guard, with correct outputs and completed work. It is a single near-threshold sampled RSS observation, not PSS, a repeatability guarantee, a throughput comparison, an unlimited workload guarantee or a physical-device limit. The separately recorded forced SwiftShader software diagnostic exceeded the guard before completing inference despite observing native dispatch; it is not physical-GPU evidence.

No new proven findings. The prior block-boundary defect is resolved, not dropped. No unsupported GPU or listening hypothesis is promoted to a finding or passed gate. The scoped CPU and numerical technical review passes on the named observations; it is not an overall Sprint 9 Done verdict.

US01's completed actual GPU provider path remains NOT VERIFIED. US02's lawful music, speech-over-music and live/event quality and continuity observations remain NOT VERIFIED. US03's real-material listening and complete supported-path observations remain NOT VERIFIED. User-authorized physical-device checks remain Sprint 12; full resource/device limits and final transitive licensing review remain at their owning later gates. No carry-forward, Sprint Done, push or deployment is asserted.

## Parent verification of the final report

Parent read the actual independent report and results, checked the matching source snapshot, exact573437-frame outputs, one-LSB error, zero stores/workers/page errors and near-budget sampled RSS. The independent artifacts/captures are retained in independent-isolation/. Current Chromium and WebKit parent captures were inspected on desktop and mobile. The final independent technical review covers the integrated S9 code, requirements/Ready/Done, frozen contracts, original failures, corrections, acceptance rows, decision trail and missing facts. It is a scoped CPU/numerical PASS, with overall Sprint9 NOT DONE. No defect is waived; the hardware/provider/listening gaps are not converted into passed observations. Parent delivery remains withheld pending the sprint's required factual gates.

## Subsequent user-requested delivery

The user explicitly requested PR delivery with the above factual gaps disclosed. Source implementation a6ecb1a preserves every reviewed product/source hash. PR #9 is open against main from codex/sprint-9-isolation. Delivery/workflow records changed after review, without changing product behavior or claiming the missing observations. No merge or deployment.
