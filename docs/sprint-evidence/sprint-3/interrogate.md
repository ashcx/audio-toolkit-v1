# Sprint 3 interrogate

Intent: inspect mixed audio/video files by content with stable batch identity, bounded inspection scheduling, correct primary-track metadata and isolated failures. Preserve the user's minimal copy/icons direction. Base is Sprint 2 eefe899. Reviewer examined the full integrated uncommitted Sprint 3 snapshot, source, fixtures/references, scripts, contracts, exact check results, captures and Ready/Done rows.

Reviewer: gpt-6.1-terra at high, independent and read-only. No implementation delegates or extra panel. Parent reproduced findings and fixed them sequentially.

## Proven findings

1. Unsupported codec marked ready. Reviewer generated a WMA Matroska fixture using `ffmpeg -hide_banner -loglevel error -f lavfi -i sine=frequency=440:duration=2 -c:a wmav2 -y .upstream/review-s3/unsupported.mkv`. Actual UI was ready with Unknown codec. Parent reran the browser journey and observed the same. Ready now requires recognized AudioCodec; unknown codec yields a per-file Unsupported audio codec failure. Added fixture/reference and assertion.
2. Video duration substituted for audio duration. Reviewer generated a WebM with 10-second black video and 2-second Opus audio; ffmpeg audio-only output reported two seconds but UI reported 0:10. Parent reran the actual fixture and confirmed. Inspected Mediabunny Matroska source: its metadata-duration API returns segment end. Now that format family uses actual audio packet duration without decoding PCM. Added reproducible unequal-track fixture and assertion.
3. Touch evidence missing. Viewport sizing alone did not satisfy the touch exit. Added actual emulated touch file chooser and removal using isMobile/hasTouch and tap in both engines, while preserving real-device deferral.

## Refresh and verdict

Parent build, typecheck, intake and inherited workspace checks passed. Refreshed reviewer independently ran `INTAKE_EVIDENCE_DIR=.upstream/review-s3/refreshed node scripts/intake-check.mjs`, which exited 0. In both engines unsupported.mkv failed clearly, long-video.webm displayed 0:02, touchAddAndRemove was true, peakReading was 2 and decoderConstructions was 0. Reviewer inspected the changed source, generator/assertions, touch journey, contracts and coverage. No new verified findings remained.

Dropped/unclaimed hypotheses: no full codec decoding, long-file processing or physical-device conclusion is inferred from metadata inspection. The initial complete scope remains required in later owning sprints. Unknown duration/rate/channels are nullable; unsupported codec is no longer misclassified as ready. No last-resort carry-forward is used.

Final technical verdict: VERIFIED after fixes and refreshed independent review. PR/CI-state delivery follows. No merge/deployment is authorized. Final documentation/PR bookkeeping does not change reviewed behavior.
