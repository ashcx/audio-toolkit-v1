# Sprint15 coverage

Base164b5bb. Scope is an acceleration assessment with an explicit retain-CPU outcome, not an accelerated implementation. Sprint14's reviewed technical candidate is PR16; weight redistribution/transitive notices, physical devices and listening remain open. The user explicitly requested continued technical execution14–20 without changing those facts.

| Criterion | Status | Evidence |
| --- | --- | --- |
| Existing actual CPU baseline and lifecycle | VERIFIED within tested scope | ../sprint-14/browser-pipeline.json, downloads, cancellation/full retry |
| Real GPU/isolated-host availability | VERIFIED | isolated-chrome.json; normal-chrome.json |
| Prospective acceptance thresholds | DEFINED, not measured | gpu.md |
| S15-US01 model WebGPU execution/comparison | NOT VERIFIED | gpu.md; no exposed GPU backend in either selected runtime |
| S15-US02 model threaded CPU execution/comparison | NOT VERIFIED | threads.md; both actual memories unshared even with isolation |
| S15-US03 measured win | No eligible win; retain CPU | no product change and no performance claim |
| Audio/cancellation regression | VERIFIED in retained implementation scope | no production code changes from reviewed14; existing68-test evidence remains applicable |
| Peak/total memory and subjective quality | NOT VERIFIED | sampled linear heap is explicitly narrower |
| Independent interrogate | VERIFIED for assessment scope | interrogate.md; Terra/Luna, probe findings resolved |
| PR delivery | pending | one assessment PR, explicit caveats |

Self-review confirms the probe observes actual memory objects and actual model outputs, not navigator capabilities alone. It has no timers and cannot support a speed claim. Thresholds do not establish baseline memory bounds that have not been measured. The research page has no new user processing path; release observations remain open. Retrospective improvement is to inspect a model's execution API before spending effort on provider configuration that it does not expose.
