# Sprint18 coverage

Base8bbcc19, working branch codex/sprint-18-workspace. The user explicitly authorized execution of the previously planned UI redesign. Prior release/quality/device gates remain open; no audio math/model change is introduced.

| Criterion | Status | Evidence |
| --- | --- | --- |
| Sprint17 disposition/review/PR | VERIFIED for technical disposition | PR19; ../sprint-17/interrogate.md |
| Actual reference inspected and contracts frozen | VERIFIED | contracts.md; actual image-compressor settings inspection |
| S18-US01 compact files/preserved actions | VERIFIED in tested Chrome scope | workspace.md; workspace-state.json; captures and two downloaded WAV records |
| S18-US02 export-only and legacy deletion | VERIFIED within unit/actual Chrome scope | export.md;67tests; repeated UI Export produces a new URL |
| S18-US03 settings/theme/license access | VERIFIED in tested Chrome scope | settings.md; keyboard.json; settings capture |
| Contextual exit warning | SOURCE VERIFIED; native prompt not exercised | main.tsx effect; known extension dialog-control limitation |
| Build/typecheck/static audit | VERIFIED | build.txt; static.txt; unit.txt |
| Desktop/mobile light/dark and keyboard | VERIFIED at emulated-width/desktop scope | captures; no overflow390px; Enter/Escape focus return |
| Actual physical touch/mobile/screen reader | NOT VERIFIED | no such session claimed |
| Full retained standalone browser suites | NOT RERUN |12drivers syntax migrated, preview suite removed |
| Audio/privacy/licensing | Retained with existing release limitations | no processing math change; static notice/hash audit passes |
| Independent interrogate | VERIFIED for technical scope | interrogate.md; Terra/Luna; all proven findings resolved |
| PR delivery | pending | one technical candidate PR with inherited caveats |

Separate self-review removed obsolete consumers/tests in the same change as the Batch API, reconciled current architecture/README and updated the browser drivers instead of keeping invalid preset/test paths. A corrupt file cannot prevent a valid selected file's export. General privacy is not inferred from the static audit alone. Retrospective improvement is to keep normal UI assertions aligned with consumer-visible requirements instead of technical row labels removed by redesign.
