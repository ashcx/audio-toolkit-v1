# Sprint 7 coverage

Baseline main518799a. Integrated technical acceptance and independent review pass. Main/Pages delivery is recorded separately.

| Condition | Evidence | Verdict |
| --- | --- | --- |
| Ready predecessor | Sprint6 reviewed code9f50c82, final518799a, coverage/interrogate, successful Pages40877444915 and live WAV smoke | VERIFIED |
| Ready contracts/fixtures/browser access | architecture.md, checked-in synthetic sources, generated chirps/tail fixtures, Chromium/WebKit | VERIFIED |
| Ready carry-forwards | None used | VERIFIED |
| US01 MP3/AAC bitrates and proper flush | formats/results.json96 downloads; rebuilt-aac/results.json18; full-grid/results.json224 downloads | VERIFIED |
| US02 WAV/FLAC/Opus headers/depth/rate | formats/results.json,17 unit tests including WAV boundaries/preflight, Opus packet/page corrections | VERIFIED, fresh build and guard tests pass |
| US03 all legal combinations and source sizes | full-grid/results.json224 outputs; separate video conversion; no savings percent claim | VERIFIED |
| Dependency/source records | Rebuilt AAC hashes/source/repro scripts; served notices, codec-parser LGPL source/text, retained GPL text | VERIFIED specific records; final transitive audit remains Sprint12 |
| Deterministic checks |17 unit tests; fresh npm ci/build current run; compiler source reconstruction byte-identical locally | VERIFIED, install.txt/build.txt/unit-tests.txt |
| Contracts/lifecycle/data safety | Owned output storage, bounded PCM/page/write caps, original-copy branch; injected truncate failure/retry/removal | VERIFIED, full224 plus truncate failure/retry and all inherited suites |
| UI desktop/mobile/keyboard/touch/themes/errors | full-grid/captures and actual keyboard/touch browser actions; source/notice page and fresh regressions verified | VERIFIED, parent inspected mobile capture; four inherited suites pass; notice-page-check.json23 relative links HTTP200/source ZIP hash matches |
| Separate self-review/decision trail | Three story reports, architecture experimental corrections, source hash/build guard, no abandoned timing patch | VERIFIED, current decision trail |
| Independent integrated interrogate | interrogate.md; independent224 downloads, extra8kHz Opus, source/hash and capture checks | VERIFIED, one reused non-implementing Terra high reviewer under thread-limit exception |
| Relevant audio/resource observations | Independent decode/reference and481/48037/1440037 input-frame cases, block/write caps | VERIFIED named cases; RSS NOT VERIFIED (Sprint11) |
| Physical devices/listening | User-authorized device Sprint12 and real isolation listening Sprint9 | NOT VERIFIED, owning later gates |
| Main/Pages delivery | No Sprint7 commit/push yet | NOT VERIFIED |

Final parent checks: npm ci (0 vulnerabilities, dependency patch reproduced), npm run build (source hashes and worker-cycle guard pass), node --test tests/*.test.mjs17/17; FORMAT_FULL_GRID=1 FORMAT_EVIDENCE_DIR=docs/sprint-evidence/sprint-7/full-grid node scripts/format-check.mjs224 downloads; DSP_EVIDENCE_DIR=docs/sprint-evidence/sprint-7/dsp-regression node scripts/dsp-check.mjs58 observations; workspace/intake/recipe/copy regression scripts all pass in both engines using their own Sprint7 subfolders. profile-bitrate-check.json separately verifies50 AAC-LC outputs and62 MP3 bitrates. Actual subjective listening/physical devices remain unverified and at their agreed gates.
