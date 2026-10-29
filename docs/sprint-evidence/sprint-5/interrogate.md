# Sprint 5 interrogate

Intent: original audio extraction without encoding, precise copy eligibility and compact per-file feedback/downloads. Review scope is integrated increment vs Sprint4 final34e102c, including source sections9/14/15, every Ready/Done/story row, frozen contracts, patch/license/install records, fixture/golden provenance, captures, exact tests, lifecycle and decision trail. No processing/formats/isolation/large-file or physical-device completion claim.

Reviews ran sequentially with gpt-6.1-terra high, independent read-only scratch; no implementation delegates. A fresh reviewer refreshed the integrated scope after behavior fixes; a third evidence-only review closed two documentation findings without repeating unchanged behavior. Parent owns all fixes.

## Reproduced findings

1. Unmarked stale output. `node .upstream/review-s5/stale.mjs` exported tone.wav then added Gain1: row showed a re-encoding error and an active old download, with no age indication. Parent ran the exact repro and confirmed download count1. Results now carry the frozen recipe; changed/invalid settings show Previous settings. Full browser checks include edits during a paused write so old snapshots cannot be relabeled current.
2. Laced-block tail padding lost. `node .upstream/review-s5/lacing.mjs` invoked the installed runtime expansion with a padded fixed-laced block: input0.0135s, expanded frames [null,null]. Parent reproduced exactly. Initial finding was method-level, not an end-to-end file. Patch now retains block tail padding on the last expanded frame. Parent added fixed/Xiph/EBML unit cases and a real valid laced Opus fixture/generator; all pass.
3. Missing capability freeze. Fresh integrated reviewer checked source section15 and the checked task; no per-processor streaming/cost contract existed. Added explicit six-processor policy table covering PCM, encoded packets, streaming, signal changes and qualitative work, with future execution evidence NOT VERIFIED.
4. Inaccurate test/count record. Exact two-file unit command ran9, not11; US03 still said13fixtures. Corrected three-file command runs11 and evidence has14fixtures per engine.

## Reference investigation

Parent's first valid laced fixture exposed FFmpeg6.1.1's per-lace DiscardPadding behavior (source passed padding to every laced frame, actual ffprobe shows648 discarded samples on both frames). Matroska defines padding at the Block tail. The fixture reuses the original tone.opus encoded access units/config; its golden PCM is that original Opus source,96000frames. Other13fixtures compare direct input/output decoded PCM. This is explicit in contracts/script/results. No numerical tolerance hides a waveform mismatch. Initial signed-integer fixture-generation mistake was corrected before acceptance.

## Independent refresh and final verdict

Fresh integrated reviewer independently ran11unit tests and full copy suite in Chromium/persistent WebKit (14fixtures each), and inspected mobile capture, planner, snapshot/OPFS lifecycle, actual laced generator/patch/reference and all stated acceptance scope. No further verified behavior findings. Exact decoded PCM identity was accepted as relevant copy-only audio evidence; listening remains NOT VERIFIED and qualitative isolation checks stay in Sprint9. Measured max write and cleanup prove only limited fixture-level resource behavior, not long-file memory scaling.

Final evidence reviewer verified the two remaining documentary conditions against actual source/spec/contracts, independently ran the corrected command11/11, and checked14recorded files per engine with13direct/1golden references. No new discrepancy. This evidence-only refresh did not repeat the full product/browser suite.

Parent final unit suite11/11 and recipe/workspace/intake regressions passed after final behavioral build. npm ci reproduced the source/ESM patch and build/typecheck passed; git diff --check passed. No unsupported findings retained. Original CJS builds are not modified/used; app/test imports are ESM. Large feasibility-probe bundle warning persists without a new performance claim.

Final technical verdict: VERIFIED after reproduced fixes and independent refresh. Actual listening, physical devices, long-file/overall memory and later processors remain unverified in their owning gates. No carry-forward, merge or deployment. PR delivery/bookkeeping follows and does not alter reviewed behavior.
