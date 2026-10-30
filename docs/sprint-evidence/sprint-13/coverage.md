# Sprint 13 coverage

Status IN PROGRESS. Baseline e9d68cc. This is a research checkpoint, not completed Sprint 13 acceptance or authority to skip its dependencies.

| Condition | Status | Evidence |
| --- | --- | --- |
| Baseline main and processing ownership | VERIFIED | contracts.md; docs/architecture.md |
| Existing unit baseline | VERIFIED | baseline-unit.txt, 60 tests passed |
| Clean locked build using supported Node 22.23.1 | VERIFIED | locked-build.txt; project-local .artifacts/tooling; earlier failures retained separately |
| Build after local dependency repair | VERIFIED with limitation | build-local-repair.txt; npm no-save repair advanced local transitive versions, not a locked clean-install result |
| Each model executes in Chrome | VERIFIED | chrome-smoke.json; chrome-speech.json |
| Representative licensed corpus | NOT VERIFIED | cpu.md, one upstream noncommercial evaluation pair only |
| Reproducible preparation and browser driver | VERIFIED | scripts/prepare-speech-evaluation.mjs; scripts/speech-evaluation.html; cpu.md |
| End-to-end time and peak memory | NOT VERIFIED | cpu.md, frame loop only |
| Audible quality | NOT VERIFIED | no user listening observations |
| GPU and threaded CPU | NOT VERIFIED | acceleration.md |
| Model/runtime license investigation | INCONCLUSIVE | provenance.md, package notices reviewed; transitive audit incomplete |
| Independent interrogate | VERIFIED for research checkpoint only | interrogate.md; Terra and Luna both withhold sprint acceptance and progression |
| Sprint PR delivery | NOT VERIFIED | pending complete acceptance or qualifying unfinished-work review |

S13-US01 and S13-US03 remain incomplete. S13-US02 has a documented unavailable-path assessment, but no executed acceleration comparison. Sprints 14 and 15 have not started. No last-resort progression exception is claimed.

2026-10-30 YouTube extension. The user's sample-source direction is implemented. Two audio tracks are downloaded locally with source attribution and SHA-256 identities in youtube-fixtures.json. Forty Chrome model runs across two sources, original/added-hiss conditions, two models and five alternating repeats complete with finite outputs, exact sample counts and no clipped samples. See chrome-youtube.json and youtube.md. The new offline downloader recovery check passes; the complete normal unit suite now passes61 tests in youtube-unit.txt. Terra and Luna reviewed the extension; findings and resolutions are in interrogate.md. This improves fixture coverage without changing the unverified listening/memory/provenance/acceleration gates above. No production code or completed-sprint PR is claimed.
