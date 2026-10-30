# Isolation processor indicator

User goal: show a readable GPU/CPU indicator while testing voice/music isolation. Base main22ec2f2; branch codex/isolation-device-indicator. Scope is presentation/metadata only: no model, overlap, threading, acceleration settings or audio-processing change.

## Data and design

Two independent read-only design passes (Terra low, Luna low) compared enriched progress events with separate attempt-scoped metadata. Chosen: a dedicated isolation-device event updates BatchJob.device without replacing JobOperation. InferenceRunner owns device/fallback truth; processAudio forwards metadata even while suppressing repeated loading phases; Batch clears it on a new attempt and preserves it with a reused/completed result. PCM's producer protocol remains JobOperation, preventing UI metadata from being mistaken for completed audio.

Labels: CPU; Trying GPU until the first GPU-configured window succeeds; GPU + CPU after success; CPU · switched from GPU after GPU failure/stall. Confirmed GPU mode stays stable between subsequent windows. GPU + CPU describes the successful hybrid execution-provider mode, not individual operator placement or GPU utilization. A tooltip makes that boundary explicit. The badge uses14px bold text and the existing theme border/foreground; there are no new icons or permanent explanatory paragraphs.

## Verification

- `npm test`:60 passed, including progress unaffected by device events, retained result/test reuse, retry reset, cancellation/late events, tentative/confirmed GPU states and sticky CPU fallback.
- `npm run build`: passed, including type checking and pinned asset/worker checks. Existing large-chunk warning remains informational.
- `APP_URL=http://127.0.0.1:4182/audio-toolkit-v1/ DEVICE_EVIDENCE_DIR=.artifacts/device-indicator/final-browser node scripts/device-indicator-check.mjs`: six cases passed, three in each actual Chromium/WebKit browser. All run real WASM inference; GPU preparation/success/failure messages are explicitly simulated because the host has no usable WebGPU adapter. The driver forces CPU computation so those label tests remain deterministic on other hosts. No physical GPU or Mac performance claim follows.
- Browser checks observe the indicator during numeric separation progress, retain it beside a completed download, verify clear removes it and all temporary stores, and check1280px/light and390px/dark without horizontal overflow. Three reviewed captures are retained here; generated audio/profiles remain ignored.
- `git diff --check`: passed. No source comments were introduced.

The first added runner test expected the last event to be device metadata; a subsequent loading phase made that assertion wrong and left a pending fake-worker timer. The test was corrected to inspect the latest device event, then rerun successfully. This was a test assertion failure, not a successful product check.

## Independent interrogate

One Terra high reviewer reproduced a regression: after one successful GPU window, the next GPU selection reset the label to Trying GPU and its tooltip wrongly implied no processing had succeeded. Fixed by storing the current device as a union and retaining confirmed GPU status until fallback. The focused real-runner/batch suite independently passed23 tests after the fix, including the new cross-window assertion. No additional blocking finding was verified. Review did not independently operate browsers or establish actual GPU utilization; parent performed browser runs and visual inspection.

Model the Domain keeps processor metadata orthogonal to progress. Prove It Works uses actual browser inference for the CPU flow and clearly labelled injected messages for unavailable GPU states. The indicator makes no speed guarantee. PR delivery is separate from merge/deployment; neither is authorized by this task.
