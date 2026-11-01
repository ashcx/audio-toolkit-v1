Re-verified at `762a99a` after the evidence review.

What changed:
- Peak mode no longer subtracts the 1.0 dB true-peak guard. It aims at the requested dBTP directly, so a 0 dBTP target is reachable. The guard still applies to loudness ceiling decisions, where it is documented.
- The result line now names both values, for example `Peak target applied at the Peak step. Estimated true peak 0.0 dBTP against a 0.0 dBTP target.`
- The -0.3 dBTP ceiling result is described as 0.1 dB inside the ceiling, not as an exact hit. The base commit is corrected to `32356a4`, and the stale one-directional under-read claim is replaced with the measured phase-sweep range.

Evidence at this head:
- ffmpeg on the new 0 dBTP export: `Peak: -0.0 dBFS`. Client estimate: 0.0 dBTP.
- `npm test`: 123 pass. `npx tsc --noEmit` clean.
- Chrome `sprint-24-check`: pass, no page errors, including the new `08-peak-result` scenario.
- Chrome `dsp-check`: 29 observations pass. Peak ordering expectations now use the exact -6 dBTP target instead of target minus guard.
- Chrome `isolation-order-check`: both order cases pass.
- The independent loudness/true-peak fixture table is unchanged: all 7 rows pass. The 16 kHz burst still exports at -0.4 dBTP against a -0.3 dBTP loudness ceiling.

Known gaps remain: decoded lossy-export peaks, listening/physical-device acceptance, and analysis time, memory, temp storage and preview latency are not measured.
