# Sprint 28 copy deck (for approval)

This is the review gate for [Sprint 28](sprint-28-ui-ux-overhaul.md). It lists every user-visible string the audit found, what it says today and what it will say. No app code has changed. Nothing is built until you approve this table or send changes.

How to read it. **Remove** means the text never appears. **Silent** means the app handles it without telling the user. **Verify** marks wording that states a fact I have not confirmed, which I check before shipping. Decided names are from your replies: Voice / music splitter, Remove background noise, Compressor, Steps, Gain and Normalize unchanged, Standard and Detailed, Keep original.

## 1. Panels, names and options

| Where | Today | New |
| --- | --- | --- |
| Panel heading | Recipe | Steps |
| Step title | Voice / music | Voice / music splitter |
| Step title | Voice isolation | Remove background noise |
| Step title | Reduce loud/quiet differences | Compressor |
| Step titles | Trim all, Gain, Normalize, Channels, Sample rate | unchanged |
| Add step menu | Add step | unchanged (existing control only) |
| Splitter option | Voice / Music | Voice / Music, each with a hint (section 2) |
| Noise option | Standard · GTCRN / Detailed · DeepFilterNet3 | Standard / Detailed |
| Noise field label | Voice model | Quality |
| Export format | MP3, M4A · AAC, WAV, FLAC | MP3, M4A, WAV, FLAC |
| Export format | OGG · Opus | Opus (.ogg) |
| Export format | Direct stream copy | Keep original (no re-encoding) |
| Bitrate label | Bitrate (kbps) / Target bitrate (kbps) | Bitrate (kbps) |
| Encoding mode | Encoding mode: Constant bitrate (CBR) / Variable bitrate (VBR) | shown only when there is a choice (Opus), labelled Constant (CBR) / Variable (VBR) |
| Settings section | Appearance | Theme |

## 2. Step summaries and hints

| Where | Today | New |
| --- | --- | --- |
| Trim summary | 00:00 to End | Whole file (or 00:10 to 01:30 when set) |
| Trim hint | Applies to all files. Files shorter than the selected start cannot be exported. | Applies to every file. |
| Gain summary | 3 dB · May clip | +3 dB · May distort |
| Gain warning | May clip. Check the exported result. | Loud peaks may distort. |
| Normalize summary | Loudness · -14 LUFS · -0.3 dBTP | Loudness · −14 LUFS · −0.3 dBTP (numbers stay) |
| Normalize mode legend | Normalize mode | Mode |
| Loudness marks | −23 EBU R 128 delivery / −16 Podcast reference / −14 Streaming playback / −9.5 Loud playback / −8 Tool maximum | −23 Broadcast / −16 Podcast / −14 Streaming / −9.5 Loud / −8 Maximum |
| Loudness note | Only -23 LUFS is a formal delivery target here. Other marks are references, not platform guarantees. | Remove |
| Loudness explainer | Gated integrated loudness is measured in 400 ms blocks. The true-peak ceiling can prevent the requested loudness; the export reports the achieved result at this step. Later gain or compressor steps can change the final level. | Loudness is raised until it reaches the target or the peak ceiling. |
| Peak explainer | Peak mode aims at the requested true peak. The reported peak is this app's estimate, so another meter can read a little differently. The loudness target is not used. | Raises the loudest peak to this level. |
| Older peak setting | This recipe keeps its original sample-peak meaning. New peak steps use true peak. | Remove |
| Level readout | Original audio · 2 files / Peak −4.5 dBFS / Average RMS −19.0 dBFS | Your audio / Peak −4.5 dBFS / Average −19.0 dBFS. Shown in Gain and Normalize only, not Compressor. |
| Level readout states | Choose files to measure their levels. / Measuring audio 1/2… / Analysis paused during export. / Could not measure audio levels. Reopen this step to retry. | Add a file to see its levels. / Measuring… / (hidden during export) / Couldn't measure this audio. |
| Compressor summary | Bypass · Speech · 50% | Speech · 50% |
| Compressor checkbox | Enable compressor | Remove (the step is on when added; removing the step turns it off) |
| Compressor hints | Loud parts are turned down more than quiet parts, so speech stays even without automatic makeup gain. / Compressor before loudness normalization avoids downstream gain changes. Explicit step order is respected. | Turns loud parts down so quiet and loud parts sound more even. (second line removed) |
| Compressor labels | Amount (Gentle / Strong), Preset (Speech / Music) | unchanged |
| Channels / Sample rate | Keep unchanged, Mono, Stereo, 44.1 kHz… | unchanged |
| Splitter hint | The first use downloads an 85 MB model, which the browser may reuse from its cache. Every job re-checks it. Some voice, music or reverb may remain. | Voice: removes the music and keeps the vocals. Music: removes the vocals and keeps the music. Some leftover sound is normal. (the download size appears when it first happens, section 4) |
| Splitter, no GPU | This browser found no usable GPU. Isolation will run on the CPU, slower than real time: about 80 seconds per minute of audio on a fast laptop. | This device has no graphics acceleration, so splitting will be slow (about 1½ minutes per minute of audio). Shown only when the step is added. Verify the figure. |
| Noise hints | none | Standard: faster, good for most recordings. Detailed: slower, removes more noise. Verify the speed claim. |
| Steps empty state | (blank) | Add a step to change your audio. Steps run from top to bottom. |
| Panel hint | none | one line: Steps run from top to bottom. |

## 3. Export panel and delivery

| Where | Today | New |
| --- | --- | --- |
| MP3 mode text | Constant bitrate. This LAME path has no verified variable mode. | Remove |
| M4A, Opus mode text | Variable bitrate. The AAC encoder adapts the bitrate to the content; the bitrate is a target… and similar | Remove |
| Keep original hint | Preserves the encoded audio without re-encoding. Effects and accurate trims need an encoded format. | Keeps the file's own audio as it is. Steps that change the sound need another format. |
| Run status | 2/2 done | Exporting 1 of 2 (only while running; nothing once finished) |
| Standing hint | Clear all removes unsaved exports. Saved downloads stay on your device. | Remove (the Clear all tooltip keeps it) |
| Running hint | Keep this page open. Cancellation waits for cleanup. | Keep this tab open until it finishes. (running only) |
| Cleaning hint | Cleaning up… | Remove |
| Clearing | Cancelling and cleaning up before clearing… | Clearing… |
| Buttons | Export, Clear all, Save to device, Cancel all, Retry failed | unchanged |
| Save menu | Create ZIP / Download ZIP, Save to folder, Clear results | Create ZIP / Download ZIP, Save to folder, Discard exports (separated, destructive style) |
| ZIP progress | Creating ZIP, Cancel ZIP, Cleaning up ZIP… | Creating ZIP, Cancel, Finishing… |
| Folder choose | Choose a folder for a new batch folder. | Choose where to save. |
| Folder progress | Saving 2 / 4, Cancel folder save | Saving 2 of 4, Cancel |
| Folder result | 3 saved to FOLDER. 1 failed, 0 not saved. | Saved 3 files to FOLDER. (plus 1 couldn't be saved. only when that is true) |

## 4. File rows, progress and results

| Where | Today | New |
| --- | --- | --- |
| Result label | Exported audio / Previous export | Result / Result (older settings) |
| Success note | Loudness target reached at the Normalize step. Achieved −14.0 LUFS. Later steps can change the final level. | Remove |
| Success note | Separated with Demucs on the GPU. | Remove |
| Success note | Compressor max gain reduction 3.2 dB. | Remove |
| Success note | No re-encoding. | Remove |
| Success note | Peak target applied at the Peak step. Estimated true peak… | Remove |
| Attention note | Peak ceiling limited loudness at the Normalize step. Achieved −15.1 LUFS… | The peak ceiling kept this quieter than the target (−15.1 LUFS). |
| Attention note | Limited by the maximum gain at the Normalize step. | This audio was too quiet to reach the target. |
| Attention note | Loudness target not reached… silent or below the measurement gate. | This audio is too quiet to measure, so loudness was not changed. |
| Attention note | Clipped samples. | Some peaks are clipped. Lower the gain or the peak target. |
| Device badge | Trying GPU / GPU + CPU / CPU / CPU · switched from GPU | Remove everywhere |
| Phase labels | Preparing, Reading, Extracting, Decoding, Analyzing for isolation… | Preparing… |
| Phase labels | Processing, Normalizing, Processing / encoding… | Processing… |
| Phase label | Loading isolation tools… | Preparing… |
| Phase labels | Encoding, Saving… | Saving… |
| Model download | Loading model 12.0 MB / 85.0 MB | Downloading model, 12 of 85 MB (appears only when the model downloads) |
| Separating | Separating 0 / 4 | Separating voice and music, 40% |
| Other states | Waiting, Cancelling…, Cancelled, Reading… | unchanged |
| File summary line | duration only | unchanged |

## 5. Preview

| Where | Today | New |
| --- | --- | --- |
| Button | Preview | Preview 15 s |
| Heading | Preview · 00:00 to 00:15 · WAV comparison | First 15 seconds, before and after |
| Estimate note | Excerpt estimate. Normalization and isolation may differ with full-track context. | Loudness and splitting may sound slightly different on the full file. |
| Players | Original excerpt / Processed preview | Before / After |
| Compressor note | Compressor reduced peaks by up to 3.2 dB in this excerpt. | Remove |
| Running | Preview · Processing excerpt · Trying GPU | Previewing… 40% |
| Buttons | Close preview, Cancel preview | unchanged |

## 6. Banners and Settings

| Where | Today | New |
| --- | --- | --- |
| Banner | Firefox is unsupported. Use Chrome, Edge or Safari. | unchanged |
| Banner | Audio workers are unavailable. Use a supported browser. | This browser can't run the app. Use Chrome, Edge or Safari. |
| Banner | Temporary storage is unavailable. Large files may be limited. | This browser limits storage, so large files may not work. |
| Banner | Some formats need a compatibility component. Support is checked before processing. | Remove |
| Settings | Settings dialog: Appearance (System, Light, Dark), Licenses, Close | Theme (System, Light, Dark), Licenses, Close |

## 7. Errors (every message shown to a user)

Each error shows once, where the user can act, and never shows raw browser or engine text. Today raw text can leak, for example "Failed to fetch".

| Today | New | Action |
| --- | --- | --- |
| Unsupported or unreadable media. / Could not inspect this file. | This file can't be read. Try another file. | Remove |
| No audio track. / The audio track contains no packets. | This file has no audio. | Remove |
| Unsupported audio codec. | This file's audio format isn't supported. | Remove |
| Trim all start must be before end. | Start must be before the end. (shown once, at the step) | |
| Trim all starts at or after the file end. | Start is after the end of this file. | |
| Enter a valid timestamp. / Enter a finite timestamp. | Enter a time like 1:30. | |
| Timestamps cannot be negative. | Times can't be negative. | |
| Gain must be between -12 and 12 dB. | Gain must be between −12 and +12 dB. | |
| Loudness target must be between -30 and -8 LUFS. | unchanged | |
| Enter a gain value. / peak / loudness / ceiling / compression messages | Enter a number. | |
| Loudness/peak mode contradictions, Each step needs a unique identity., File inspection is not complete. | Never shown (Export stays disabled until inspection finishes) | |
| Opus needs 16, 24 or 48 kHz. Add a sample rate step. | Silent: the audio is resampled to a supported rate | |
| At this sample rate, choose MP3 at 128 kbps or increase the sample rate. | MP3 at this sample rate supports up to 160 kbps. Lower the bitrate. | |
| AAC bitrate is too high for this rate and channel count… | This bitrate is too high for this audio. Lower the bitrate. | |
| Processed WAV output must be smaller than 4 GB. | WAV files can't be larger than 4 GB. Choose another format or trim the audio. | |
| Gain requires re-encoding. Choose another format. (and each other step) | Gain needs a format other than Keep original. Choose another format. | |
| This codec has no supported stream-copy container… | This file can't be kept as it is. Choose another format. | |
| Failed to fetch / Could not load the isolation model… / Could not load isolation tools… | Couldn't download the voice/music model. Check your connection and try again. | Retry |
| The isolation model could not be verified. / download is incomplete. | The model download was damaged. Try again. | Retry |
| Isolation stopped responding. Retry, or try a shorter selection. | Voice / music splitting stopped responding. Try again, or try a shorter clip. | Retry |
| Isolation failed. | Couldn't split voice and music. Try again. | Retry |
| The selected range contains no audio. | The selected part has no audio. | |
| The selected range is too short for isolation. Keep a longer range. | The selected part is too short to split. | |
| Audio export failed. / Audio processing failed. / Audio export failed. Retry this file. | Something went wrong with this file. Try again. | Retry |
| Not enough device storage for this output. / Temporary storage failed. / Temporary output is unavailable. | Not enough space to finish. Free some space and try again. | Retry |
| Temporary storage is unavailable in this browser. / …Try a non-private browser window. | This browser can't store large files in private mode. Try a normal window. | |
| The audio timeline has an unsupported gap or overlap. / format changes unexpectedly. / MP3 timing metadata is unavailable. / Original audio configuration is unavailable. | This file's audio can't be processed. | Remove |
| The processed audio exceeds the supported sample range. | This file has damaged audio. | Remove |
| The source audio no longer matches the recipe. | The file changed. Remove it and add it again. | |
| Preview failed. | Couldn't make a preview. Try again. | Retry |
| Preview cancelled. | Preview cancelled. | |
| Preview/temporary files need cleanup. / Temporary files could not be removed. Retry cleanup. / Retry preview cleanup / Retry ZIP cleanup | Silent retry. If it keeps failing: Couldn't free some storage. | Try again |
| Folder access denied… (several variants) | Couldn't save to that folder. Download the files instead. | Download |
| Not enough space; original download is available. | Not enough space on that drive. | |
| Name already exists; existing file was kept. | Skipped NAME because it already exists. | |
| A partial file may remain in DIR/NAME. Original download is available. | Couldn't finish saving NAME. Download it instead. | Download |
| Folder saving cancelled. Downloads are still available. | Cancelled. | |
| Not enough temporary storage for the ZIP… / ZIP could not be saved… | Couldn't create the ZIP. Download the files one by one. | |
| Output names must be safe and unique. Download individually instead. | Some file names can't be saved together. Download them one by one. | |
| Internal-only (Isolation backpressure, window sizes, identity, closed output) | Never shown; logged to the console | |

## 8. Words that must not appear in the interface

GPU, CPU, model (except "the voice/music model" in the download and its error), window, codec, stream, cleanup, temporary, identity, backpressure, isolation, re-encoding, "Failed to fetch", "Error:", and any raw exception text. Decibel and loudness terms (dB, dBFS, dBTP, LUFS, RMS) appear only inside Gain, Normalize, Compressor and the level readout.

## 9. Open points for you

1. **Remove the success notes.** Section 4 removes five notes that appear on a normal success and keeps four short ones that appear only when something differs from what you asked for. Confirm that trade.
2. **Compressor has no on/off.** The step is on when added and you remove it to turn it off. This changes behavior, not only words.
3. **"Discard exports".** I renamed "Clear results" and kept it in the Save menu but separated and in the destructive style. Tell me if you would rather lose it, since re-exporting replaces results anyway.
4. **Two figures need checking before they ship.** The "about 1½ minutes per minute of audio" slow-path estimate and the Standard versus Detailed speed claim. I will measure or soften them.

### Figures checked while building

1. **Slow-path estimate.** Sprint 27 measured Demucs on WASM at about 81 s per 60 s of audio on one Apple M5 (`todo/HANDOFF-sprints-27-29.md`, PR 36). That is about 1.35 minutes per minute on a fast machine, so the shipped line says roughly 1½ minutes or more per minute of audio. Slower devices will take longer. Only that one device was timed.
2. **Standard versus Detailed.** The Sprint 13 YouTube evaluation (commit 6d64371, `docs/sprint-evidence/sprint-13/chrome-youtube.json`, since removed from the tree) timed both models over 20 runs each on 20 s excerpts in Chrome. GTCRN averaged about 1.9 s and DeepFilterNet3 about 3.2 s, so "Detailed is slower" has a recorded basis. The timings are diagnostic and include decoding and start-up. No listening session or noise measurement backs "removes more noise" (the Sprint 14 gate for quality labels is still unchecked), so the shipped hint says Detailed is "more thorough on noisy recordings" and keeps the speed claim.

