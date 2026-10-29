# Sprint 9 findings and corrections

## S09-F01: music block-boundary subtraction in WebKit

The real `ISOLATION_CHECK_ENGINE=webkit ... node scripts/isolation-check.mjs` failed the unchanged voice-plus-music reconstruction gate: maximum error 0.0008544921875 exceeded 0.0001. See full-app-one-tab/failure.txt and webkit-trace/failure.txt. Both modes had correct frame counts and finite output.

The repeated traced run found identical per-window input and selected model-output F32 signatures in both modes. A pure long nonlinear reconstruction control passed in Node, Chromium and WebKit at 7.450580596923828e-9 (browser-reconstruction-control.json). The full product discrepancy therefore remained distinct from model variation and the simple control.

A diagnostic build tapped each PCM block before encoding. Its worker-only Vite transform inserted `self.postMessage({kind:"debug-pcm",offset:stats.encodedFrames,planes:block.planes})` at the `for await (const block of stream)` encoder loop. The test listener intercepted these messages before product handlers. The first transform attempt mistakenly applied only the main build plugin; no tap was emitted and its zero-filled capture is invalid, not evidence. The corrected worker.plugins transform produced actual nonzero captures. The driver now refuses a requested PCM capture if no messages arrive.

The valid capture found 224 bad pre-encode samples above1e-6; every bad frame had offset0 modulo2048. Maximum pre-encode error was0.0006704106344841421. Both WAV encoders preserved their input within0.5 PCM16 LSB. See pre-encode-diagnostic.json. The diagnostic files and transform are in ignored .artifacts/s9-pcm-tap and .artifacts/vite-pcm-trace.config.mjs; the correction is independently reproducible through the regular product driver without that instrumentation.

Replace the subtraction's forEach callback, which closed over mutable zip offsets, with explicit indexed channel/sample loops. This changes no data shape, buffering or fallback policy. The actual WebKit full driver then passed both long modes, byte progress, hash-failure retry, cancellation during download and inference, cleanup, keyboard/touch and desktop/mobile checks. Recombined maximum error returned to one PCM16 LSB (0.000030517578125), RMSE3.6381953430032886e-7. Peak sampled owned-browser aggregate RSS2126729216 bytes remained below the unchanged2147483648 budget. This is a single resource-bound observation; no native-engine cause, allocator leak, speedup or phone support is inferred. Evidence: webkit-indexed-subtract/results.json and checks.txt.

Added a long weak-stem stereo replay control over every frame, with async inference completion. All39 deterministic checks pass. The pure controls did not reproduce the old browser integration failure; the recorded real product reproduction is the regression gate. Independent changed-behavior refresh remains open.

## Resource measurement correction

Persistent browser launch already supplied one blank tab. The driver created a second. The observed two-tab failure is retained in full-app-extra-tab/results.json. Reuse its initial page and assert exactly one page. The one-tab complete WebKit flow passes the same declared budget. Do not convert this into an unlimited workload or physical device claim.

## Other attempts and missing evidence

The initial copy regression invocation omitted APP_URL and timed out at an old4173 preview. It established no product regression; rerun uses the actual4174 build. The order suite was externally terminated with status143 after three passes; the remaining WebKit order scenario passed in a focused rerun. Original partial results remain in order/results.json, focused evidence in order-webkit-before/results.json.

The initial software WebGPU probe timed out after180 seconds, without a completed inference or dispatch observation. Its result is retained. A second bounded diagnostic instruments actual native dispatch and phase/console progress before determining what the software adapter can establish. Physical GPU and lawful real-material listening remain unverified. No sprint completion or exception is asserted.
