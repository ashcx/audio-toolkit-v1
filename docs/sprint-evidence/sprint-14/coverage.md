# Sprint14 coverage

Technical candidate in progress on codex/sprint-14-speech-cleanup, based on6d64371. The user explicitly authorized technical execution of14–20 while prior factual observations remain open. No merge or deployment is authorized. This is not a claim that missing model rights or human observations have passed.

| Criterion | Status | Evidence |
| --- | --- | --- |
| Sprint13 CPU paths and delay contract | VERIFIED within numerical scope | ../sprint-13/chrome-speech.json; contracts.md |
| Model rights and compiled transitive audit | NOT VERIFIED for release | THIRD_PARTY_LICENSES.md, upstream issues700/712; no owner clarification |
| Existing recipe and music behavior | VERIFIED in unit regression scope | unit.txt,68 tests; existing isolation suites retained |
| S14-US01 model choices and ordered plans | VERIFIED | recipe.md; actual Chrome selector/reorder/export; captures |
| S14-US02 bounded adapter, duration/channels/rate | VERIFIED within tested scope | browser-pipeline.json; two physical downloaded WAV headers/hashes; six adapter tests |
| Cancellation and cleanup | VERIFIED in observed scope | actual UI Cancel all yields Cancelled and Retry; final pipeline cleanup check passes with before0/after0 in browser-pipeline.json |
| S14-US03 desktop/mobile controls/export | VERIFIED in desktop Chrome and emulated-width scope; full accessibility story remains open | captures/desktop.png, detailed-desktop.png, mobile.png; actual local file upload and download |
| Physical mobile/touch and screen-reader use | NOT VERIFIED | no physical/screen-reader session claimed |
| Listening/quality/tails beyond numerical grids | NOT VERIFIED | fixed model delays from exploratory reference experiment; no subjective observations |
| Progress | VERIFIED indeterminate phase scope | Loading model, Processing and existing terminal phase events; no fabricated percentage |
| Build/typecheck/unit | VERIFIED | build.txt; unit.txt |
| Independent review | IN PROGRESS | Terra/Luna initial review; fixes and current evidence require refresh |
| PR | pending | one candidate PR after technical review; release caveats required |

Actual desktop journey selected the attributed Orton interview, added Voice isolation, switched models, added trim30–31seconds, moved trim before speech, selected WAV and exported each model. Blob-download APIs were unsupported by the extension, so ordinary Download clicks were used. The resulting task-created files in Downloads were copied to ignored .artifacts/speech14-outputs, parsed independently with Python wave, and matched44100frames,44100Hz,2channels,PCM16. standard-download.json and detailed-download.json retain identities. Those test outputs remain private/local and are not repository assets.

Self-review corrected a one-frame resampling edge case and bounded speech to one step per validated recipe, after independently reproduced Terra findings. Standalone internal factory tests do not count as neural quality evidence. The final worker harness uses actual application inspect/compile/process/storage code from a development server; it is not described as production-hosting verification. The real workspace export used the production build under its actual base path.

Planning and written sync occurred in this run. Review is the independent panel documented here; no human meeting is claimed. Retrospective improvements are to freeze the minimum-frame grid and the single-neural-step policy before implementing future models. Overall Sprint14 acceptance remains open for the stated release/device/listening gates, even once the technical candidate PR is delivered.
