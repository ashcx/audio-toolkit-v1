# Sprint 11 acceptance evidence

Base dd64fc0. Main instance implemented sequentially; independent Terra high reviewed code and evidence. All measurements are Linux automation, not physical Mac/iOS/Android claims.

| Acceptance | Evidence | Status |
| --- | --- | --- |
| Stored ZIP64, exact completed bytes, CRC, UTF-8 names, repeated downloads | scripts/download-check.mjs; browser-results.json; actual Chromium and WebKit downloads independently opened by Python zipfile | VERIFIED |
| Safe unique names, retained uppercase and Unicode collisions, bounded UTF-8 length | tests/planner.test.mjs plus browser name attributes | VERIFIED |
| ZIP after partial job failure contains only success | both engines, injected one media write failure and independently read one-entry ZIP | VERIFIED |
| Quota recovery, cancel pending write, retained failed cleanup, source invalidation, reset | browser-results.json plus Archive lifecycle tests; zero stores after reset | VERIFIED |
| Storage writer setup failure followed by failed deletion | independent reproduced defect fixed in output-store.ts; tests/output-store.test.mjs and reviewer record | VERIFIED |
| 50 ten-second stereo 48 kHz WAV clips -> WAV -> ZIP | batch-resource-results.json; 96,002,200 result bytes, 50 CRC-checked stored entries; peak owned Chromium RSS 863,178,752 bytes; max ZIP write 1,048,576 bytes; ZIP heartbeat max72.5ms | VERIFIED for this synthetic workload |
| Ten-minute stereo 48 kHz WAV -> MP3 | pcm-resource-results.json; downloaded stream independently probed near600seconds; 2GiB owned-RSS guard | VERIFIED for one synthetic tone |
| 20 compressed hour-long sources | original driver accidentally kept MP3 default; corrected Sprint12 measurement explicitly selects original and asserts20 copy plans. See ../sprint-12/hour-copy-results.json | VERIFIED only small matching-container AAC/M4A byte-copy case |
| Unit/build/self-review | 58 Node tests passed; npm run build passed; git diff --check; parent reviewed mobile captures | VERIFIED |
| Independent review | reviewer.md, interrogate.md | See verdict |
| Physical suspension/backgrounding, real Mac/iOS/Android limits, subjective listening | Sprint12 acceptance remains open | NOT VERIFIED |

Commands: `node --experimental-strip-types --test tests/*.test.mjs`; `npm run build`; `APP_URL=http://127.0.0.1:4184/audio-toolkit-v1/ SKIP_LARGE=1 node scripts/download-check.mjs`; full download driver without SKIP_LARGE for the 50-clip case; `PCM_ONLY=1 node scripts/download-limits.mjs` for the ten-minute case. Default driver output is ignored .artifacts; checked-in records are copied summaries and captures, never media.

WebKit may replace spaces with underscores in its suggested download filename. ZIP names match the application's download attributes; file bytes match browser downloads exactly. An actual Chromium quota run also encountered native NoModificationAllowedError during partial-file deletion. The visible cleanup retry retained ownership and recovered with original results intact. Cleanup failure is prioritized over the original storage message until recovery succeeds.

Driver corrections: Playwright rejects in-memory upload payloads over50MB; 50 fixtures now use disk paths. Initial filename assertion compared WebKit's browser-renamed filename instead of the download attribute; corrected. One command incorrectly appended an outDir option to the multi-command npm build script; rerunning the unchanged build command passed. These were test/command failures, not successful product checks.

Sprint12 follow-up: the original600second timeout attempted20hours of MP3 encoding, not packet copy. Corrected run completed20 one-hour synthetic AAC/M4A copies; see Sprint12 record for exact sizes, route, first-download byte equality and RSS. No hour-long encoding or camera/remux capacity is claimed.
