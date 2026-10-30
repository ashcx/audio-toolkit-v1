# Sprint 12 acceptance and release matrix

Base98f1020. Product code/public assets remained unchanged throughout Sprint12 browser runs (`git diff 98f1020 -- src public vite.config.js` empty). The parent maintained an immutable dist from the passing Sprint11 production build. The release driver's continuation guard checks prior successful names/status and preview URL; it does not fingerprint or prove content immutability. Dist immutability is a maintained run condition here. No code was rebuilt between the original run and privacy-only rerun.

## Automated observations

`npm test`:58 passed. `npm run build`: passed at the Sprint11 product revision, retained unchanged during browsers, and passed again after browser completion with Sprint12 documentation/tooling. `npm run verify:static`:16 installed production license declarations,22 retained local notice/source assets and pinned AAC/neural hashes passed. `APP_URL=http://127.0.0.1:4184/audio-toolkit-v1/ npm run verify:browser` executed11 sequential suites, stopping at the first failure. Ten suites passed on the initial run. Privacy's local-object-URL assertion was corrected, and `RELEASE_CHECK_FROM=privacy` reran both actual browsers; all11 final suite records have exit0. Previous failed attempt remains in release-results.json.

| Requirement/story | Actual evidence | Status |
| --- | --- | --- |
| S12-US01: workspace, responsive themes, keyboard and capability notices | workspace-results.json, desktop1440px/mobile390px light/dark/system, live preference change and persistence; long names, keyboard focus after removal; actual touch is separate | VERIFIED automation |
| Intake/content identification, append/drop/duplicates and isolated failures | intake-results.json; both engines, required synthetic audio/video containers, corrupt/no-audio/misnamed inputs | VERIFIED automation |
| Ordered recipe, repeated stages, per-file ranges, validation and copy/re-encode planning | recipe-results.json;58 unit checks | VERIFIED automation |
| Original audio extraction/remux and timestamps | copy-results.json; actual downloads, both engines; synthetic single/video/offset fixtures | VERIFIED automation |
| Gain/peak normalize/channels/resample/trim and ordering | dsp-results.json:58 downloaded observations and recorded block/encode/checkpoint statistics | VERIFIED automation |
| Required encodings/settings and correctness | format-results.json:96 downloaded cases independently decoded/probed; invalid-setting recovery | VERIFIED automation |
| Cancellation, batch isolation, retry and read/process/encode/write/close failures | batch-results.json, both engines; existing successes retained | VERIFIED automation |
| Storage cleanup on cancellation, removal and replacement | cleanup-results.json:6 cases, retained callbacks and zero stores after recovery | VERIFIED automation |
| Test-one/default/chosen-file, effective override, native playback, reuse/invalidation and editable presets | preview-results.json; native playback clock advances in both engines; actual two-file isolation reuse in Chromium | VERIFIED automation; human listening separate |
| ZIP exact bytes/CRC/names, partial failure, repeated saves, quota, pending-write cancellation, cleanup retry, invalidation and clear | download-results.json, independent Python reader, both engines | VERIFIED automation |
| S12-US02: privacy, lazy inference model/runtime, base path, reload and static errors | privacy-results.json: actual voice inference and ZIP/clear; all observed HTTP requests same-origin/base path, GET/bodyless; local blob reads allowed separately, no source filename request; no HTTP errors/page errors | VERIFIED observed flows |
| Local notices/source assets and pinned provenance | static-audit.json and privacy-results.json;16 declared licenses,22 local assets, browser HEAD checks and hash verifiers; compact-model rebuild/transitive legal closure not claimed | VERIFIED local packaging; provenance boundaries documented |
| S12-US03: navigation/sibling handoff | privacy-results.json checks hub/image href attributes and license back navigation; docs/release-acceptance.md | VERIFIED local handoff; siblings unmodified |
| Measured long/batch/retention/ZIP limits | Sprint11 resource summaries; hour-copy-results.json:20 synthetic hour-long AAC/M4A files,1,699,529bytes each, matching-container original byte copy; first download exact; all20 complete; combined copy+10-minute encode RSS935,424,000bytes under2GiB | VERIFIED only named Linux workloads |
| Physical Chrome on Mac, Edge, Safari on Mac/iPhone/iPad, Android Chrome; device versions/suspension/touch/save | docs/release-acceptance.md checklist | NOT VERIFIED |
| Real music/live-event subjective separation listening, Mac thermals/GPU reliability | earlier full-song/excerpt objective evidence is not a substitute | NOT VERIFIED |
| Independent Terra high interrogate | reviewer.md and interrogate.md | See verdict |
| PR delivery | respective sprint PR links recorded after creation | Pending readback |
| Candidate merged/deployed/live site running these changes | no merge or deployment authorized/performed | NOT VERIFIED |

## Failed attempts and corrected measurements

The initial20-hour resource driver left the default MP3 export selected and timed out after600seconds. It measured encoding, not the intended copy workload. The corrected driver selects Original and asserts20 copy plans before timing. Independent comparison verifies the first downloaded AAC/M4A is byte-identical; input silence is highly compressed, so no large-camera, remux or hour-long re-encode support claim follows. Prior Sprint11 unverified wording is updated by this evidence.

The initial privacy predicate rejected two same-origin `blob:` GET requests. The failing raw request list showed local object-URL reads only. The corrected predicate permits local blob URLs, while still rejecting external origins, unexpected HTTP paths, non-GET methods or bodies. Both engines reran with real inference; no upload was observed. The final summary preserves the failed attempt rather than relabeling it a pass.

## Delivery boundary

The technical increment is reviewable. Full Sprint12/release acceptance remains open for real devices, suspension and subjective listening, plus any stated provenance boundary. Automated WebKit is not actual Safari, and a390px viewport is not a physical phone. No unchecked row becomes verified through a PR, source inspection or synthetic fixture. Open PRs target main in order10->11->12->Sprint12 PR; no merges or candidate deployment are claimed.
