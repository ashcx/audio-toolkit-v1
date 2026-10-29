# Sprint 6 acceptance contract

Baseline main `3c29c0f`. Prior design sketches and unresolved decoder probes remain in design-checkpoint.md. This document freezes the resolved implementation and acceptance thresholds during the resumed sprint, before final acceptance/review. It does not claim these thresholds existed before the experiments.

## Data and execution

One frozen per-file recipe/source snapshot, one primary-track decoder, ordered pull-based processors, one terminal PCM16 RIFF WAV encoder. The source clock is `origin + offset / rate`; integer offsets persist through gain, channel mapping and normalization. Resampling establishes a new fixed origin and grid. Output timestamps are rebased only at terminal encoding. Unsupported timeline gaps, changing shape, nonfinite decoded/output samples, channels beyond mono/stereo, unsupported decoder/container combinations and outputs approaching RIFF's 4 GB limit fail per file.

PCM blocks contain at most 4096 frames. Encoded metadata inspection does not decode. Native decode allocation depends on codec access-unit size; measured maximum decoded sample frames is recorded separately. Native decoder queues and total process memory are not proven bounded by the output-block count. Sprint 11 retains process-memory/workload limits.

Every stage consumes PCM, changes the signal, and retains explicit recipe position. Trim and gain perform linear frame work, channel mapping performs linear frame/channel work, and resampling uses bounded sinc history/lookahead with a maximum 512 phase kernels. Normalization makes one analysis/checkpoint write and one replay at its actual position, with no lossy intermediate or additional input decode. Isolation remains Sprint 9, not an implemented stage here. No processing stage consumes compressed packets as PCM; only the initial decoder consumes encoded media. The original-audio copy branch continues to use encoded packets without PCM.

Main owns every OPFS entry and sequential storage request. Worker writes await one credit and transfer an owned bounded buffer. Normalization checkpoints store planar float PCM plus source coordinates and replay bounded records. Success retains only the final file; remove, abort and failure discard job-owned entries after pending writes settle. No origin-wide cleanup.

## Signal behavior and tolerances

- Trim retains half-open source-time samples, starting at ceil(start × rate), ending before end. Float representation gets only 1e-8-frame rounding tolerance. End-of-source clamps using the frozen metadata. File overrides remain independent.
- Gain applies `10^(dB/20)` without an intermediate limiter. Mono duplicates to stereo; stereo becomes arithmetic mean. Intermediate values may exceed full scale. Only terminal PCM16 saturates at [-1,1], counts clips and reports them. Positive gain displays `May clip` before export.
- Normalization is sample-peak normalization, never LUFS or true peak. Non-silent output reaches the selected dBFS target within 0.01 dB, subject to PCM16 quantization. Exact silence stays zero. Peaks at or below 1e-6 (-120 dBFS) remain unchanged; amplification is capped at 1000 (+60 dB). A target prevented by this rule reports `Normalization limited.` Normal attenuation is not limited. Review reproduced the original 219 dB near-silence bug before this policy was added.
- Resampling uses a Blackman-windowed sinc with cutoff .94 of the lower Nyquist and radius ceil(32 × max(1,input/output)). EOF output count rounds(totalFrames × target/input). Equivalent input chunking must produce identical float output. A 1 kHz sine passband error is below 0.02 dB; 12 kHz downsampled 48→16 kHz aliases below -60 dB relative to input RMS, excluding 100 edge samples. Repeated conversion preserves source-time trim position and pitch. This is a defined reference budget, not a studio-resampler equivalence claim.
- Downloaded PCM16 gain/mapping error is below 1/32768. Reference decoded-head RMSE is below 0.0001 against local FFmpeg, allowing native Opus numerical differences. Tone fixtures present 96000 frames. Raw ADTS lacks a presentation edit and exposes 97280 decoded frames. The independently inspected offset MP4 presents 97024 frames over 2.021333 s starting at 4.978 s; it must not be silently reduced to the 96000-frame source used before timestamp-offset remux.

## Decoder boundary

MP3 Xing/LAME/Lavc/Lavf gapless metadata is read in bounded metadata windows. AAC/native decoder packets get a nonnegative internal clock, then original presentation timing is restored by the library sample handler. Native Opus gets a copied zero-preskip header and common presentation clipping; custom decoder pre-skip behavior is retained. Matroska CodecDelay retains fractional ticks. Source/ESM modifications are pinned and hash guarded in vendor/mediabunny-patches.json.

FLAC always loads its bounded WASM fallback lazily. Vorbis loads a bounded Ogg fallback lazily and currently rejects non-Ogg/multiple-track Vorbis containers explicitly. No whole-file decodeAudioData fallback. Other source/codec compatibility still requires measured evidence; no universal container claim.

## Scope limits

WAV is the minimal terminal adapter in Sprint 6. MP3, AAC/M4A, FLAC and Opus terminal encoders belong to Sprint 7. Batch cancel/stop UI belongs to Sprint 8, though removal already aborts the active job. Physical devices, subjective listening, full RSS scaling, ZIP, isolation and preview are not established here. User authorized real devices at Sprint 12 and real music/live isolation listening at Sprint 9. Existing AAC corresponding-source release audit remains open.
