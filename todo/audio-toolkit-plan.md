# Audio Toolkit feature plan and definition of done

Date: 2026-10-29
Status: requirements recorded; implementation not started.

## 1. Purpose and authority

Build a free, browser-local batch audio processor within Media Toolkit. Users select audio or video files, build one ordered processing recipe, optionally set different trim ranges per file, and export one audio result per successful input.

This plan combines the [original brief](original-audio-pipeline-brief.md) with the subsequent user decisions. It records features and acceptance criteria without assigning delivery phases or work packages.

Requirement labels distinguish scope:

- Required: part of the initial complete product described in the brief and discussion.
- Deferred: explicitly identified as a later enhancement in the brief.
- Verification required: an upstream, browser, dependency, or licensing claim that must be checked before implementation relies on it.
- Proposed default: a detailed behavior inferred for completeness, not an additional confirmed user decision. Resolve these during work breakdown.

Unchecked items are requirements, not claims that the application currently supports them.

## 2. Confirmed decisions

- [ ] Use Media Toolkit as the overall brand.
- [ ] Plan the hub at `https://ashcx.github.io/media-toolkit/` with two large tool cards.
- [ ] Link the hub to the existing image app at `https://ashcx.github.io/image-compressor-v1/`.
- [ ] Plan the audio app at `https://ashcx.github.io/audio-toolkit-v1/`. Verify the repository and deployment destination before setup.
- [ ] Keep the hub, image app, and audio app as separately deployable sites.
- [ ] Keep this workspace, `/home/user/audio-toolkit`, dedicated to the audio app and its supporting documentation.
- [ ] Record hub and image-app coordination here, but implement those sites in their own authorized workspaces.
- [ ] Match the image app's visual appearance while adapting layouts and controls to audio workflows.
- [ ] Share UI components only where the behavior and purpose actually match.
- [ ] Follow the full recipe-based audio brief, including voice/music isolation in the initial complete scope.
- [ ] Reuse suitable open-source AudioTools.dev processing logic, especially Mediabunny, transcoding, and isolation integrations.
- [ ] Support desktop Chromium and Edge, Safari, and Android. Treat Firefox as unsupported.
- [ ] Use one shared batch recipe with per-file trim overrides. Keep other processing parameters shared in V1.
- [ ] Include individual cancellation, cancel all, retry failures, and download completed results from launch.

Definition of done: delivered behavior matches these decisions, and any accepted departures are explicitly recorded rather than silently reducing scope.

## 3. Product boundaries

### Required workflow

- [ ] Select multiple audio files, video files, or a mixed batch.
- [ ] Build a linear recipe from processing cards.
- [ ] Configure shared settings and optional per-file trim ranges.
- [ ] Test the recipe on a selected file before processing the remaining batch.
- [ ] Process each file locally with clear progress and isolated failures.
- [ ] Download individual results or a ZIP of successful results.

### Invariants

- [ ] Preserve the conceptual relationship of N inputs to N outputs, with one output for each successful input.
- [ ] Keep every public processing step one-track-in and one-track-out.
- [ ] Retain either voice or music after isolation, never expose a branching stem graph.
- [ ] Treat output encoding as a terminal export configuration.
- [ ] Decode only when processing requires PCM, and encode only once at the end when encoding is necessary.
- [ ] Copy compatible encoded audio directly when the recipe permits it.
- [ ] Keep media bytes on the user's device. No processing backend or account is required.
- [ ] Do not imply that a static app makes no network requests. App assets, codecs, and model downloads may use the network.

Definition of done: the complete workflow works with mixed batches, and architecture checks establish these invariants through execution evidence.

## 4. Media hub and navigation coordination

These are cross-project requirements, not permission to add hub or image-processing implementation to this folder.

- [ ] Provide two large hub cards, one for image processing and one for audio processing.
- [ ] Give each card a clear tool name, short description, and direct destination.
- [ ] Make cards usable by keyboard and touch, with readable focus and hover states.
- [ ] Keep hub layout usable on narrow screens.
- [ ] Provide a consistent Media Toolkit identity and a route back to the hub from each app.
- [ ] Make links between apps direct, without passing selected files or implying that processing state transfers between them.
- [ ] Keep existing image-app links functional.
- [ ] Configure each site's own GitHub Pages base path and assets independently.

Definition of done: the hub routes to both production apps, both apps link back correctly, and neither app's deployment requires deploying the other.

## 5. Visual foundation and accessibility

- [ ] Inspect the current image app's actual styles and components before choosing shared design elements.
- [ ] Match appropriate typography, colors, spacing, buttons, form treatment, themes, and overall density.
- [ ] Preserve audio-specific components for recipes, trim controls, audio results, and processing states.
- [ ] Reuse a shared component only when it reduces duplication without coupling unrelated app logic.
- [ ] Keep codec and inference details outside normal user flows unless they explain a capability or decision.
- [ ] Use one primary workspace rather than separate pages for every audio operation.
- [ ] Render the recipe as vertically stacked cards with collapsed summaries and expandable settings.
- [ ] Make desktop wider without turning it into a different interaction model.
- [ ] Support desktop drag reordering and explicit Move up/Move down controls usable on mobile and keyboard.
- [ ] Provide accessible names, visible focus, readable contrast, and touch-friendly controls.
- [ ] Announce errors and relevant progress without overwhelming screen readers.
- [ ] Avoid relying only on color to identify file states.
- [ ] Verify narrow screens, long filenames, large batches, expanded settings, and supported themes.

Definition of done: visual checks on desktop and mobile confirm a consistent family appearance; keyboard and touch users can complete the workflow.

## 6. File intake and inspection

- [ ] Support multiple file selection and desktop drag-and-drop.
- [ ] Accept mixed audio and video inputs within one batch.
- [ ] Show batch file count and total input size.
- [ ] Show per-file name, size, duration, detected container, audio codec, channel count, and sample rate where available.
- [ ] Distinguish unknown metadata from invalid or unsupported files.
- [ ] Probe actual media content instead of relying only on filename extensions.
- [ ] Identify video files without audio and report a useful per-file error.
- [ ] Use the primary audio track initially. Additional audio-track selection is deferred.
- [ ] Allow removal of individual files before processing and cleanup of their resources.
- [ ] Preserve file identity when filenames collide or duplicate inputs exist.
- [ ] Keep inspection responsive for many files and avoid decoding full recordings just to list them.
- [ ] Proposed default: allow adding files before a run; lock recipe edits during an active run to keep results consistent.

Definition of done: mixed supported inputs produce accurate usable entries; invalid inputs remain isolated and do not prevent valid files from being processed.

## 7. Input format targets

Required audio targets:

- [ ] WAV.
- [ ] MP3.
- [ ] AAC.
- [ ] M4A.
- [ ] FLAC.
- [ ] OGG with Vorbis.
- [ ] Opus.
- [ ] WebM audio.

Required video container targets for audio extraction:

- [ ] MP4.
- [ ] MOV.
- [ ] MKV.
- [ ] WebM.

- [ ] Define support by container plus actual audio codec, not container name alone.
- [ ] Validate codec combinations on every supported browser family.
- [ ] Explain unsupported codecs without falsely promising that every MP4 or MOV file will work.
- [ ] Treat OGG and Opus as normal supported formats, not legacy exceptions.
- [ ] Investigate MPEG, VOB, TS, MTS, and M2TS compatibility through reusable upstream code as follow-on coverage.

Definition of done: a documented fixture matrix covers supported container/codec pairs and records explicit failures for unsupported pairs.

## 8. Recipe builder and specification

- [ ] Add, remove, expand, collapse, and reorder processing steps.
- [ ] Show each step's purpose and current parameter summary.
- [ ] Keep Export separate and terminal. Do not allow intermediate lossy encoding steps.
- [ ] Validate parameters and incompatible step combinations before starting a run.
- [ ] Preserve the chosen step order when it changes processing results.
- [ ] Do not silently rearrange normalization, gain, trimming, or isolation.
- [ ] Define which steps may appear repeatedly and reject invalid duplicates explicitly.
- [ ] Represent recipes as serializable structured data independent of UI components and codec implementations.
- [ ] Represent per-file trim overrides separately from shared recipe parameters.
- [ ] Compile an effective per-file recipe from a stable snapshot at the start of execution.
- [ ] Include enough version information to evolve the specification without ambiguous interpretation.
- [ ] Avoid node canvases, cables, ports, branching, and multi-track mixing.

Definition of done: the same validated recipe consistently drives testing and full-batch execution; UI operations cannot create an invalid execution state.

## 9. Extract audio

- [ ] Accept an audio stream from a supported video container.
- [ ] Select the primary audio track in V1.
- [ ] Preserve encoded audio packets where the export container and recipe allow it.
- [ ] Exclude video from the output.
- [ ] Allow existing audio files to enter the same downstream recipe without unnecessary conversion.
- [ ] Show whether the effective operation copies the original stream or requires re-encoding.

Definition of done: supported videos produce audio-only outputs, and compatible copy paths introduce no audio re-encoding.

## 10. Shared trimming and per-file overrides

- [ ] Provide start and end timestamps for the recipe's trim step.
- [ ] Allow each file to override its trim start and end while retaining the shared recipe structure.
- [ ] Clearly distinguish inherited values from overridden values.
- [ ] Provide Reset to batch settings for an overridden file.
- [ ] Keep overrides attached to stable file IDs through reordering and retries.
- [ ] Apply later shared trim changes only to files that still inherit the batch values.
- [ ] Define timestamps against source media time, so overrides stay meaningful when steps move.
- [ ] Define behavior for multiple trim steps before permitting them. Proposed default: one trim step in V1.
- [ ] Validate finite nonnegative timestamps, start before end, and a nonempty selected range.
- [ ] If the start is beyond the file's duration, report that file's validation error and allow other files to proceed.
- [ ] If the end exceeds the duration, clamp to the file end and show the effective range.
- [ ] Proposed default: an omitted start means the beginning; an omitted end means the end of that file.
- [ ] Show each file's effective range and expected retained duration.
- [ ] Ensure preview and final export use the same effective range.
- [ ] Use encoded-packet trimming only when its boundary precision matches the promised behavior.
- [ ] Decode for accurate boundaries when necessary, and explain when trimming prevents stream copy.
- [ ] Consider adapting upstream waveform rendering where useful. A full timeline editor is outside scope.

Definition of done: files in one batch can produce different correctly trimmed ranges, inheritance/reset works, and invalid ranges affect only the relevant files.

## 11. Normalize loudness

- [ ] Provide peak normalization with a target such as -1 dBFS.
- [ ] Handle silence without division errors or extreme gain.
- [ ] Keep peak normalization distinct from perceived-loudness normalization in labels and presets.
- [ ] Support an upgrade path to integrated loudness targets of -14, -16, and -23 LUFS with a configurable true-peak ceiling such as -1 dBTP.
- [ ] The brief permits peak normalization in V1 if proper LUFS normalization is deferred. Record that choice explicitly before implementation.
- [ ] Do not label a peak-only result as -16 LUFS or claim broadcast compliance.
- [ ] Account for the signal at this step's actual position in the recipe.
- [ ] Use a bounded analysis strategy for long recordings, with multiple passes if required.
- [ ] If LUFS is implemented, verify loudness and true peak with an independent reference and documented tolerances.

Definition of done: the shipped normalization mode is correctly labeled, measured output meets its defined tolerance, and silence and long recordings remain safe.

## 12. Gain, channels, and sample rate

### Gain

- [ ] Provide a clear gain control, initially targeting -12 dB to +12 dB.
- [ ] Make units explicit and validate the accepted range.
- [ ] Define clipping behavior and communicate likely clipping before export where detectable.
- [ ] Avoid silently adding a compressor or limiter that changes the requested sound.

### Channels

- [ ] Offer Keep original, Stereo, and Mono.
- [ ] Define channel mapping and downmix behavior rather than discarding channels accidentally.
- [ ] Handle mono-to-stereo conversion predictably.
- [ ] Identify unsupported multichannel configurations clearly.

### Sample rate

- [ ] Put sample-rate controls in advanced settings.
- [ ] Offer Keep original, 44.1 kHz, 48 kHz, 32 kHz, 24 kHz, and 16 kHz.
- [ ] Validate the selected rate against the output codec.
- [ ] Use an appropriate resampler without unintended speed or pitch changes.

Definition of done: reference signals establish expected gain, channel mapping, duration, and sample rate in exported files.

## 13. Voice and music isolation

- [ ] Include Voice / Music Isolation in the initial complete scope.
- [ ] Offer Keep voice and Keep music as two modes of one processor.
- [ ] Reuse suitable AudioTools.dev SCNet and ONNX Runtime Web integration after source and license inspection.
- [ ] Execute inference on the user's device.
- [ ] Produce the requested stream and discard the other stem when no longer needed.
- [ ] Keep one output per input without exposing a two-stem export workflow.
- [ ] Lazy-load the model and runtime when isolation is needed.
- [ ] Show first-use download/loading progress and useful failures.
- [ ] Verify the actual model size, source, runtime requirements, and redistribution terms instead of treating brief claims as verified facts.
- [ ] Use WebGPU where supported and a verified WebAssembly/CPU fallback where viable.
- [ ] Do not require WebGPU for every supported browser.
- [ ] Run at most one isolation job concurrently.
- [ ] Define bounded chunking, overlap, reconstruction, sample-rate adaptation, and end-of-file handling.
- [ ] Avoid audible gaps or discontinuities at chunk boundaries.
- [ ] Support cancellation and release inference resources after completion, failure, or cancellation.
- [ ] Explain that voice traces, reverb, backing vocals, or instruments may remain, especially in live or distorted recordings.
- [ ] Explain that isolation takes longer and uses more memory than conversion, especially on phones.

Definition of done: both modes work in real browsers, exported duration and continuity are correct, resources are released, and documented listening checks cover music and live/event material.

## 14. Export formats and compression

### MP3

- [ ] Offer 128, 192, 256, and 320 kbps.
- [ ] Reuse an appropriate verified WebAssembly encoder integration.

### M4A with AAC

- [ ] Offer 128, 192, and 256 kbps.
- [ ] Prefer supported native encoding where suitable.
- [ ] Provide a verified WebAssembly fallback where native AAC encoding is unavailable.
- [ ] Use the correct container, MIME type, and filename extension.

### WAV

- [ ] Export PCM audio with documented sample format and bit depth.
- [ ] Validate file headers and duration.
- [ ] Detect file-size/container limits before producing an invalid large WAV.

### FLAC

- [ ] Export losslessly compressed audio using a verified encoder.
- [ ] Document supported bit depths and sample rates.

### Opus in OGG

- [ ] Include Opus output even if upstream does not expose it.
- [ ] Provide understandable bitrate controls. Final options remain to be selected during breakdown.
- [ ] Validate container metadata and playback compatibility.
- [ ] Do not confuse OGG containers with Vorbis or Opus codecs.

### Original stream

- [ ] Offer original audio without re-encoding only when compatible.
- [ ] Choose a valid audio-only output container for the detected codec.
- [ ] Explain why sample-changing steps disable this option.
- [ ] Do not silently substitute transcoding under a no-re-encoding label.
- [ ] Resolve per-file output container differences explicitly for mixed-codec batches.

### Shared export behavior

- [ ] Explain that bitrate-based export is the initial compression control.
- [ ] Avoid promising smaller files for every input and setting.
- [ ] Show actual output size and a meaningful comparison after completion.
- [ ] Distinguish extracted audio size from the original video's total size when presenting savings.
- [ ] Encode once after all PCM processing and flush the encoder correctly.
- [ ] Handle output names, extensions, collisions, and repeated downloads predictably.
- [ ] Target-size compression remains deferred.

Definition of done: each output format produces valid playable files with the selected properties, including successful completion and valid final frames for long inputs.

## 15. Smart execution planner

- [ ] Describe each processor's PCM requirement, encoded-packet support, streaming support, signal changes, and computational cost.
- [ ] Separate recipe intent from per-file execution planning.
- [ ] Detect codecs from actual input tracks.
- [ ] Plan direct packet copy when container compatibility and all effective steps permit it.
- [ ] Plan one decode stage and one final encode stage where required.
- [ ] Avoid intermediate lossy files and repeated decoder/encoder cycles.
- [ ] Preserve logical step order while eliminating genuine no-op work.
- [ ] Plan analysis passes explicitly when normalization needs them.
- [ ] Reflect per-file trim overrides in copy eligibility and decoding requirements.
- [ ] Explain copy versus re-encoding using plain language in the UI.
- [ ] Preserve compatible AAC-to-M4A, MP3-to-MP3, Opus-to-OGG, Vorbis-to-OGG, and FLAC paths where the library actually supports them.
- [ ] Verify these paths rather than assuming every table entry in the brief is available upstream.

Definition of done: execution instrumentation proves that a copy-only extraction invokes no audio decoder or encoder, while a processed export avoids repeated encoding.

## 16. Batch execution and controls

- [ ] Give each file a separate lifecycle and error record.
- [ ] Represent Waiting, Reading, Extracting, Decoding, Processing, Normalizing, Separating, Encoding, Saving, Done, Failed, and Cancelled where applicable.
- [ ] Skip irrelevant states rather than inventing work or false progress.
- [ ] Show per-file current operation, available progress, and overall counts.
- [ ] Use indeterminate progress when reliable percentages are unavailable.
- [ ] Keep one failed file from terminating other jobs.
- [ ] Support cancel one file, cancel all, retry failed, and download completed.
- [ ] Prevent cancelled workers from publishing late success results.
- [ ] Prevent retries from duplicating results or overwriting unrelated outputs.
- [ ] Keep successful outputs available when another job fails or is cancelled.
- [ ] Release queues, decoders, encoders, workers, and temporary data after every terminal state.
- [ ] Define whether cancellation takes effect immediately or at a safe chunk boundary and communicate it accurately.
- [ ] Proposed default: retries reuse the run's effective recipe; changing settings starts a distinct run.
- [ ] Pause/resume remains deferred and is distinct from required cancellation.

Definition of done: partial failures, cancellations, and retries leave accurate states, valid retained results, and no leaked active work.

## 17. Test on one file and presets

### Test on one file

- [ ] Default to the first file while allowing a user-selected file.
- [ ] Execute the same engine and effective recipe used for the full batch.
- [ ] Include that file's trim override.
- [ ] Show step completion, final format, actual output size, and a playable/downloadable result where supported.
- [ ] Allow applying the tested recipe to the remaining files.
- [ ] Avoid reprocessing the tested file when its successful result can be reused.
- [ ] Invalidate a test result's reuse when its input or effective settings change.

### Built-in presets

- [ ] Extract original audio: extraction plus original-stream export.
- [ ] High quality MP3: MP3 at 192 kbps.
- [ ] Speech: mono, normalization, and MP3 at 128 kbps.
- [ ] Isolate voice: keep voice, normalize, and MP3 export.
- [ ] Karaoke/remove vocals: keep music and MP3 export.
- [ ] Make presets editable recipes, not separate tools.
- [ ] Make normalization labels reflect actual peak or LUFS support.
- [ ] Proposed default: confirm how a preset affects existing per-file trim overrides before implementing preset replacement.
- [ ] Custom saved recipes remain deferred.

Definition of done: tests and batch runs produce equivalent outputs under the same effective settings, and preset summaries match their actual parameters.

## 18. Output handling and downloads

- [ ] Download individual completed results.
- [ ] Download successful results as a ZIP, including after partial batch failure.
- [ ] Store compressed media entries without redundant ZIP recompression.
- [ ] Support large outputs without holding all results and ZIP copies in RAM simultaneously.
- [ ] Use browser-backed temporary output storage where supported and appropriate.
- [ ] Handle storage quota failures and download failures without marking incomplete files successful.
- [ ] Exclude partial/cancelled outputs from successful downloads.
- [ ] Sanitize names and prevent output collisions without changing source files.
- [ ] Release object URLs and temporary files when results are removed or the workspace is reset.
- [ ] Explain the session lifetime of results and the risk of losing unsaved work on navigation.
- [ ] Direct user-selected folder output is deferred; keep output sinks extensible for it.

Definition of done: individual files and ZIP contents are complete, named correctly, playable, and available after unrelated file failures.

## 19. Large-file architecture and scheduling

Both large camera recordings and batches of shorter interview clips are required use cases. Exact supported limits must come from measurements, not promises of unlimited processing.

- [ ] Stream demuxing and packet copying where possible.
- [ ] Decode and process bounded chunks where required.
- [ ] Avoid forcing every input through a whole-file AudioBuffer.
- [ ] Release consumed PCM and unwanted isolation output promptly.
- [ ] Apply backpressure between readers, processors, encoders, and output sinks.
- [ ] Bound queued work, decoded data, model working memory, and retained output memory.
- [ ] Move heavy inference, encoding, waveform analysis, and DSP away from the main UI thread where practical.
- [ ] Start from the brief's desktop conversion guidance of 2–4 concurrent files and mobile guidance of 1–2, then validate conservative defaults.
- [ ] Use a maximum of one isolation job across the batch.
- [ ] Adapt concurrency to capabilities and observed limits rather than assuming fixed device memory.
- [ ] Keep controls responsive during long jobs.
- [ ] Document behavior when mobile browsers background, suspend, or terminate the page. Do not promise background execution.
- [ ] Test long recordings and large mixed batches separately from short synthetic clips.
- [ ] Measure output retention and ZIP generation as well as processing memory.
- [ ] Publish tested device/browser/file limits with fixture characteristics and known failures.

Definition of done: representative long and batch workloads complete within measured resource limits, and limits are reported honestly with reproducible evidence.

## 20. Browser support and capability handling

Required browser targets:

- [ ] Desktop Chrome and Chromium.
- [ ] Desktop Edge.
- [ ] Safari on macOS.
- [ ] Safari on iPhone and iPad.
- [ ] Android Chrome as the initial Android test target.

Unsupported browser:

- [ ] Show a clear Firefox unsupported/untested notice with suggested supported browsers.
- [ ] Do not claim Firefox has passed release validation.

Capability requirements:

- [ ] Check actual codec, worker, inference, and storage capabilities, not user-agent strings alone.
- [ ] Supply appropriate fallbacks for core workflows on supported browsers.
- [ ] Identify feature-specific limitations before expensive work begins.
- [ ] Keep ordinary conversion usable if optional acceleration is unavailable.
- [ ] Use normal downloads and ZIP where directory picking is unavailable.
- [ ] Select and record supported OS/browser versions during implementation breakdown.
- [ ] Verify mobile file picking, playback, downloads, memory behavior, and cancellation on actual devices where available.

Definition of done: the release matrix records pass/fail evidence for core workflows on every supported browser family; Firefox receives the stated notice.

## 21. Open-source reuse and dependency verification

The preferred starting point is AudioTools.dev's processing implementation. Reusing its engine does not require preserving its separate-tool page structure.

- [ ] Find the authoritative source repository and record the inspected revision.
- [ ] Inspect source for Mediabunny integration, probing, MP3/AAC/FLAC encoding, WAV output, SCNet, and ONNX worker setup.
- [ ] Prefer adapting proven processing logic over independently rebuilding equivalent codec integrations.
- [ ] Evaluate MPEG compatibility, waveform rendering, and batch result code for reuse where appropriate.
- [ ] Build an app-specific shell, recipe builder, planner, scheduler, failure handling, and output manager.
- [ ] Keep the UI independent from upstream codec internals.
- [ ] Verify actual package names, versions, APIs, vendored modifications, and browser requirements.
- [ ] Use Mediabunny as the primary container/codec abstraction.
- [ ] Use WebCodecs through that abstraction where supported.
- [ ] Use Web Audio selectively for suitable PCM operations, not as a universal whole-file decode path.
- [ ] Use TypeScript and Vite as the brief's baseline; evaluate Preact for consistency with the current image app.
- [ ] Verify whether upstream native and WebAssembly fallback paths meet the supported browser matrix.
- [ ] Avoid making FFmpeg.wasm a core dependency.
- [ ] Retain clear provenance for copied or modified upstream modules.

Definition of done: dependency choices and reused source have traceable revisions, working supported-browser paths, and documented reasons for adaptations.

## 22. Privacy, licensing, and static deployment

### Privacy

- [ ] Process selected media entirely on-device.
- [ ] Make no selected-media uploads, including in error reports or analytics.
- [ ] Keep filenames and local file paths out of external telemetry.
- [ ] Explain first-use model and codec downloads without implying user media leaves the device.
- [ ] Document temporary browser storage and cleanup behavior.
- [ ] Validate network behavior with conversion and isolation enabled.

### Licensing

- [ ] Verify the AudioTools.dev license from its actual source.
- [ ] Verify licenses for Mediabunny, codec extensions, ONNX Runtime Web, SCNet code, and the exact model weights.
- [ ] Check model redistribution independently from code licensing.
- [ ] Preserve required copyright and license notices.
- [ ] Add an appropriate project LICENSE and THIRD_PARTY_LICENSES.md when source is introduced.
- [ ] Meet any source-disclosure or modification-notice obligations that actually apply.
- [ ] Do not copy upstream assets or branding without checking their reuse terms.

### Deployment

- [ ] Serve the audio app as a static GitHub Pages build at its configured base path.
- [ ] Resolve codecs, workers, model files, and runtime assets correctly under that path.
- [ ] Verify hosting headers and runtime requirements before relying on cross-origin isolation, SharedArrayBuffer, or threaded WebAssembly.
- [ ] Provide a viable supported-browser path if required headers are unavailable on the chosen hosting setup.
- [ ] Keep large model delivery and caching compatible with static hosting constraints.
- [ ] Verify direct navigation and reload at the production path.
- [ ] Keep local validation, merged changes, and live deployment as separate recorded states.

Definition of done: the production static build runs without a processing server, media remains local, assets load correctly, and license obligations are satisfied.

## 23. Deferred enhancements

These remain recorded for later work and do not silently become initial release requirements.

- [ ] Proper LUFS normalization and true-peak control, if peak normalization is the explicitly chosen initial implementation.
- [ ] Audio-track selection for files with multiple audio tracks.
- [ ] Target-size compression with approximate bitrate calculation.
- [ ] Locally saved custom recipes.
- [ ] Direct output to a user-selected folder.
- [ ] Advanced Opus controls.
- [ ] Metadata preservation with explicit supported fields.
- [ ] Pause/resume processing. Cancellation remains required initially.
- [ ] Detailed user-facing browser capability diagnostics. Basic capability checks remain required initially.
- [ ] MPEG/transport-stream compatibility beyond verified initial coverage.
- [ ] Lazy-loaded FFmpeg.wasm for legacy inputs such as WMA, ASF, AMR, or APE.
- [ ] AC-3, E-AC-3, and DTS compatibility where practical and licensed.
- [ ] Optional installable/offline PWA behavior.
- [ ] Automatic trimming of leading and trailing silence.

Definition of done for any promoted enhancement: define its acceptance criteria, browser support, licensing, and resource impact before adding it to a delivery work package.

## 24. Explicit exclusions

- Background-noise removal in V1.
- Four-stem or instrument-specific separation.
- Simultaneous voice and instrumental export from one input.
- Branching pipelines or node editors.
- Multi-track mixing or DAW-style editing.
- Arbitrary FFmpeg commands.
- Complex EQ or dynamic-range compressor interfaces.
- Server-side media processing.
- Per-file overrides for every recipe parameter in V1. Trimming is the agreed exception.
- Image-processing implementation or media-hub application code in this workspace.

## 25. Verification inventory

### Functional scenarios

- [ ] Extract original AAC from a compatible MP4/MOV to M4A with no decoding or encoding.
- [ ] Normalize the same source and prove the plan switches to decode/process/encode.
- [ ] Convert mixed audio/video inputs using one recipe.
- [ ] Apply inherited trim settings, two distinct overrides, and Reset to batch settings.
- [ ] Handle a trim beyond duration without stopping valid files.
- [ ] Test one file and process the remainder without duplicating its reusable result.
- [ ] Verify both voice and music isolation on music, speech-over-music, and live/event material.
- [ ] Verify all required output formats and advertised bitrate options.
- [ ] Handle corrupt media, no-audio video, unsupported codecs, and missing model assets.
- [ ] Cancel waiting and active jobs, cancel all, retry failed jobs, and download completed outputs.
- [ ] Verify duplicate filenames, long filenames, and output collisions.
- [ ] Verify individual downloads and ZIP contents after partial failure.

### Audio correctness

- [ ] Validate output duration, audible start/end boundaries, sample rate, channel count, codec, and container.
- [ ] Check normalization against the shipped mode with an independent reference.
- [ ] Verify gain and resampling with known signals.
- [ ] Check isolation chunk boundaries for gaps, repeats, or discontinuities.
- [ ] Verify copied encoded streams remain unchanged except for valid container/timestamp changes.
- [ ] Check that lossy export does not create unintended intermediate lossy generations.

### Reliability and performance

- [ ] Test representative 20-file hour-long camera batches and 50 short interview clips, or document smaller proven limits on constrained devices.
- [ ] Separate copy-only, ordinary conversion, DSP, and neural-isolation measurements.
- [ ] Record fixture codecs, sizes, durations, browser versions, device hardware, elapsed time, and memory observations.
- [ ] Verify resource release after repeated runs and cancellation.
- [ ] Verify storage-quota and output-generation failures.
- [ ] Verify responsive controls and mobile background/recovery behavior.
- [ ] Do not present DOM virtualization or unit tests alone as proof of overall memory safety.

### UI and deployment

- [ ] Check desktop and mobile layouts, supported themes, keyboard controls, and touch interactions.
- [ ] Exercise the production build under its real GitHub Pages base path.
- [ ] Check runtime/model loading and fallback paths under production hosting constraints.
- [ ] Inspect network requests to confirm selected media never uploads.
- [ ] Check hub and sibling-app links when those sites are independently delivered.

## 26. Overall definition of done

The initial complete audio product is done only when all required criteria below have evidence. Deferred items do not block completion unless explicitly promoted.

- [ ] The delivered feature inventory covers the required brief and confirmed discussion decisions.
- [ ] A user can complete file selection, recipe configuration, per-file trimming, test execution, batch processing, and download.
- [ ] Every successful input produces exactly one valid output with the requested effective settings.
- [ ] Extraction, trimming, normalization, gain, channel conversion, resampling, isolation, and required exports work as documented.
- [ ] The planner demonstrably copies streams where possible and avoids unnecessary decode/encode cycles.
- [ ] Failed and cancelled files do not corrupt unrelated results or leave active resources behind.
- [ ] Long recordings and batch workloads have reproducible evidence and honest supported limits.
- [ ] Supported desktop, Safari, and Android workflows pass the recorded browser matrix.
- [ ] Firefox receives the unsupported/untested notice.
- [ ] The UI matches the Media Toolkit visual foundation and remains usable by keyboard and touch.
- [ ] Media stays local, dependency provenance is recorded, and license obligations are met.
- [ ] The actual production build loads workers, codecs, model assets, and links correctly on GitHub Pages.
- [ ] Relevant automated checks and real-browser checks pass, with limitations documented.
- [ ] Documentation records setup, architecture, supported formats, known limitations, privacy, licenses, and verification evidence.
- [ ] Required repository work is committed, pushed, and represented by a reviewable PR once a Git repository and remote exist.
- [ ] Cross-project hub/image work is tracked separately; audio completion does not falsely claim those sites have been changed or deployed.

## 27. Decisions to resolve during later breakdown

These details do not prevent recording the current plan. They must be settled before implementing the affected behavior.

- [ ] Confirm the audio repository identity and production URL.
- [ ] Select the appropriate shared design component arrangement without adding hub/image code here.
- [ ] Verify authoritative AudioTools.dev source, revision, license, and reusable modules.
- [ ] Select peak-only initial normalization or initial LUFS support, using the brief's allowed distinction.
- [ ] Set default recipe, export format, and preset behavior with existing trim overrides.
- [ ] Confirm one-trim-step behavior and source-time timestamp semantics.
- [ ] Choose WAV bit depth, Opus bitrate options, and multichannel conversion rules.
- [ ] Define run-editing behavior, retry snapshot behavior, and output naming rules.
- [ ] Select minimum supported browser/OS versions and real test devices.
- [ ] Establish measured file-duration, batch-size, memory, storage, and ZIP limits.
- [ ] Verify GitHub Pages runtime/header constraints and model delivery strategy.
- [ ] Break this inventory into implementation parts with dependencies and acceptance evidence. No phase ordering is assigned in this document.
