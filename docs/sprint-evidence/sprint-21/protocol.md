# Isolation speed experiments

User priority is faster music isolation with quality as a guardrail. The first requested experiments are 55% overlap and larger processing windows. Production remains 11 seconds, 50% overlap and one model worker per window until a candidate meets the acceptance gates.

## Frozen comparison

The production `processAudio` path runs decode, resampling, checkpoint storage, inference, overlap reconstruction and terminal PCM16 WAV encoding. The timed region starts immediately before `processAudio` and ends when its promise resolves. Fixture fetch, initial source inspection, output decoding, sample validation and hashing are outside that region and their validation time is recorded separately. Every output is decoded and checked for exact source frame count, sample rate, channel count, finite samples and nonzero energy. Worker creation, termination, phases, backend and completed calls are independently counted by the harness. The expected load count must equal observed workers. At most one inference worker may be active. The final output store is released after validation.

Fixture `live` is the full 19.043265-second public-domain recording already pinned in Sprint 16 fixtures.json. It has no clean reference stems, and is not the user's affected recording. No human listening judgment is inferred. Output hashes allow the session-lifetime-only experiment to be compared directly with baseline samples. A changed overlap requires a listening assessment before promotion.

The four variants hold the model, precision, backend negotiation, sample rate, strength, fade and output format fixed. Baseline uses 50% overlap and a new worker for every window. `overlap55` changes only the hop to 45% of the 485100-sample window. `reuse2` keeps 50% overlap and reuses the model session for at most two windows, then terminates its worker. `overlap55-reuse2` combines those two changes. CPU arenas and memory-pattern caching remain disabled.

A separately labelled round 0 baseline is the first observed run in this browser session. This is not a claim of OS-cold model or browser caches. Rounds 1–5 alternate the four-variant order forward and backward. Each case has a 180-second limit. The suite checks a twenty-minute upper bound before starting another case. Failures remain visible and saved. One additional voice output from reuse2 checks the other keep mode.

Prepare with `ISOLATION_FIXTURE_DIR=/absolute/local/fixture-directory node scripts/prepare-isolation-experiment.mjs`. Preparation verifies the exact existing fixture hashes and creates a dedicated production build under ignored `.artifacts/s21-root/`. Serve that directory with `python3 -m http.server 4197 --bind 127.0.0.1 --directory .artifacts/s21-root`, then open `/audio-toolkit-v1/scripts/isolation-experiment-check.html` in actual Chrome. Do not rebuild that frozen directory during comparison. Click the shape test separately, then Run isolation comparison. Completed result JSON is saved from the visible result region. Download links expose each profile's first warm output for local listening.

## Larger-window feasibility

The actual bundled model declares input `mix_spec` shape `[1,4,2049,476]`. The shape probe sends actual 15-second and 22-second spectral inputs to the pinned ONNX session. A dimension rejection means the candidate is unsupported, not fast. Increasing only the outer buffering size while keeping 476 model frames would not test a larger model window. It could crop content or insert multiple fixed-size internal calls. No such substitute is adopted.

## Resource and acceptance limits

The actual Mac has ten logical cores. Background workload is preserved in load-before.txt. Agents pause other inference and full builds during timed runs. System services and user activity are not controlled. Alternate ordering reduces directional bias but does not remove thermal or workload uncertainty.

Browser output correctness and wall time alone do not establish a speedup suitable for promotion. The benchmark checklist also requires a demonstrated limiter, output quality, representative end-to-end workload, and memory headroom. Browser-wide RSS on a user's multipage Chrome session cannot be represented as this tab's owned peak memory. Prior WebKit reused-session evidence exceeded the 2 GiB dedicated-browser guard after one call, so a Chrome result alone cannot justify changing the cross-browser default. A two-window reuse experiment remains opt-in for diagnostics until its resource and fallback checks pass on supported engines.

## Additional reliability checks

After the repeated comparison, a separate build used `ISOLATION_EXPERIMENT_ID=s21-reliability`, served on 4198. Its full-song button runs baseline then reuse2 once each on the complete 92.16-second instrumental fixture. It records actual remaining temporary-file count after final store release. This pair is a reliability diagnostic, not a repeatable full-song timing comparison.

A third separate build uses `ISOLATION_EXPERIMENT_ID=s21-cancellation`, served on 4199. Check cancellation after retained window aborts the real job when its first completed-window progress event arrives, while the model worker is retained. It measures abort-to-job-rejection time and records active workers and actual temporary files after cleanup.

Frozen manifests identify all three bundles. Changing only the experiment id gives each run a separate build directory. Use the matching port when serving a different directory. Runtime source remains identical across these builds; only the diagnostic harness adds the later observations.
