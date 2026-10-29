# Browser-Local Audio Pipeline
## Product & Technical Brief

### 1. Product concept

Build a **free, browser-local audio processing application** focused on fast batch workflows.

The core idea is:

> **Select a batch of files → build a processing recipe → apply it to every file → export/download the results.**

The product should feel closer to the existing image compressor at `ashcx.github.io/image-compressor-v1` than to AudioTools.dev's current interface.

AudioTools.dev is the technical starting point and source of several reusable components, but its current product structure is based around individual tools such as Converter, Volume Booster, Trimmer, Compressor and Vocal Remover. Your version should instead expose those capabilities as **steps within one unified processing pipeline**.

AudioTools.dev already demonstrates that browser-local conversion, batch processing, WebAssembly encoding, Web Audio processing and neural vocal separation are feasible without uploading users' files. Its current tools run locally with no account or usage limits.

---

# 2. Primary product principles

## Browser-local first

Media files should remain on the user's device.

The preferred architecture is:

**File → browser processing → local output**

rather than:

**File → upload → server processing → download**

This matters particularly because the intended workload includes:

- large WAV files
- camera MP4/MOV recordings
- batches of recordings
- long event footage
- potentially dozens of files at once

AudioTools.dev follows the same philosophy and uses Web Audio, WebAssembly and Mediabunny rather than a media-processing backend.

---

## Batch-first

Batch processing should not be an afterthought.

The user should be able to select:

> 10 MP4 files

and construct one recipe such as:

> Extract audio  
> → Normalize  
> → Keep vocals  
> → MP3 192 kbps

then apply that recipe to all ten files.

The batch remains conceptually:

> **N inputs → N outputs**

throughout the application.

This is deliberately simpler than a general media-processing graph.

---

## One input produces one output

This is an important product constraint.

Every processing step should be:

> **1 track → 1 track**

There should be no branching pipelines in the initial product.

For example, the vocal-separation model internally produces:

- vocals
- instrumental/music

but the user chooses **one** to continue with.

So:

> Keep Vocals

means:

`audio → separation → vocals retained → instrumental discarded`

while:

> Keep Music

means:

`audio → separation → instrumental retained → vocals discarded`

The rest of the pipeline still receives exactly one audio stream.

This avoids turning the product into a node editor.

---

# 3. UI concept

The interface should be considerably simpler than AudioTools.dev.

There should ideally be one primary workspace instead of a separate webpage for every operation.

The basic mobile layout should be:

### Files

> 10 files selected  
> 3.2 GB

### Processing recipe

**1 — Extract Audio**  
Original audio track

**2 — Normalize**  
−16 LUFS

**3 — Voice / Music Isolation**  
Keep voice

**4 — Export**  
MP3 · 192 kbps

**+ Add Step**

**Process 10 Files**

Each step should appear as a vertically stacked card.

On phones, tapping a card expands its settings.

On desktop, the exact same structure can simply become wider rather than transforming into a completely different interface.

---

# 4. Do not use a node graph

Avoid interfaces resembling:

- Blender nodes
- Fusion
- Unreal Blueprints
- visual programming tools

There should be no cables, ports or draggable graph canvas.

The pipeline should instead behave like a **recipe or ordered list**.

Reordering can use:

- drag-and-drop on desktop
- Move Up / Move Down controls on mobile

This keeps the pipeline understandable to someone who simply wants:

> “extract all of these videos, make them the same volume, and save them as MP3.”

---

# 5. Pipeline structure

The conceptual model should be:

```text
INPUT FILE
    ↓
PROCESSING STEP
    ↓
PROCESSING STEP
    ↓
PROCESSING STEP
    ↓
EXPORT
```

**Export should be treated specially.**

Users should not normally insert arbitrary MP3 encoding operations halfway through the recipe.

Instead, processing happens at the highest useful quality internally and encoding occurs once at the end.

For example:

```text
MP4
 ↓
Extract
 ↓
Normalize
 ↓
Trim
 ↓
MP3
```

should not mean:

```text
AAC → MP3 → decode MP3 → normalize → encode again → trim → encode again
```

It should compile to approximately:

```text
MP4 container
 ↓
AAC packets
 ↓ decode once
PCM
 ↓ normalize
PCM
 ↓ trim
PCM
 ↓
encode once
MP3
```

This optimisation should be one of the fundamental properties of the engine.

---

# 6. Smart processing planner

The UI describes **what the user wants**.

A pipeline planner decides **how to execute it efficiently**.

Every step should provide metadata such as:

| Property | Example |
|---|---|
| Requires decoded PCM | Normalize: yes |
| Can work on encoded packets | Extract: yes |
| Streaming capable | Trim: potentially |
| Requires entire/chunked signal | Vocal isolation: yes |
| Changes audio samples | Normalize: yes |
| Changes container only | Stream extraction: no |
| ML-heavy | Vocal isolation: yes |

The executor can then minimise decoding, intermediate files and encoding.

---

# 7. Direct stream copy

This should be one of the flagship features.

AudioTools.dev currently forces transcoding in its shared conversion implementation rather than allowing compatible audio packets to pass through untouched. 

Mediabunny itself supports media conversion where compatible encoded packets can be copied instead of decoded/re-encoded. Its Conversion API explicitly distinguishes direct copying from forced transcoding.

Example:

```text
Sony MP4
H.264 video
AAC 48 kHz stereo audio
```

Pipeline:

```text
Extract Audio
→ M4A
```

should become:

```text
MP4 demux
→ copy AAC packets
→ M4A container
```

No audio decoding.

No audio encoder.

No generation loss.

The UI should identify this clearly:

> ⚡ **Lossless stream copy**  
> Original AAC audio · no re-encoding

---

# 8. Stream-copy compatibility

The engine should detect the actual audio codec rather than infer it only from the filename.

Examples of sensible copy paths:

| Source | Possible output |
|---|---|
| AAC inside MP4/MOV | M4A / AAC |
| MP3 inside container | MP3 |
| Opus | OGG/Opus |
| Vorbis | OGG |
| FLAC | FLAC |

If a processing step changes audio samples, stream copy becomes impossible.

For example:

```text
Extract
→ Normalize
→ M4A
```

requires:

```text
AAC → decode → normalize → encode AAC
```

The UI could show:

> **Re-encoding required**  
> Normalize modifies the audio signal.

---

# 9. Initial pipeline operations

The V1 processing library should be deliberately focused.

## Extract Audio

Purpose:

> Remove the video and work only with the selected audio track.

Options:

- Primary audio track
- Audio-track selection where multiple tracks exist
- Keep original codec where possible

AudioTools.dev currently works primarily with the primary audio track, so exposing track selection would be a meaningful improvement. Its converter already handles audio extracted from video.

---

## Trim

Options:

- start time
- end time

Potential later addition:

- trim silence from beginning/end

AudioTools.dev already has waveform-based trimming, so some of its existing implementation can be reused conceptually.

---

## Normalize

Two possible levels should eventually exist.

### Basic

Peak normalization:

> −1 dBFS

This matches AudioTools.dev's current normalization behaviour.

### Recommended

Proper loudness normalization:

> −14 LUFS  
> −16 LUFS  
> −23 LUFS

with configurable true-peak ceiling such as:

> −1 dBTP

Suggested presets:

**Music / streaming**
> −14 LUFS

**Speech / podcast**
> −16 LUFS

**Broadcast**
> −23 LUFS

Peak normalization can ship first if LUFS implementation slows down V1.

---

## Gain / Volume

Simple user-controlled gain adjustment:

> −12 dB → +12 dB

or a percentage if preferred.

This is essentially the useful portion of AudioTools.dev's existing Volume Booster without requiring a separate tool page.

---

## Mono / Stereo

Options:

> Keep original  
> Stereo  
> Mono

Useful particularly for:

- interviews
- voice recordings
- microphones
- reducing output size

---

## Sample Rate

Options under an Advanced section:

> Keep original  
> 44.1 kHz  
> 48 kHz  
> 32 kHz  
> 24 kHz  
> 16 kHz

Most users should leave this on **Keep original**.

---

# 10. Voice / Music isolation

This replaces a more complicated “stem separation” feature.

The UI should avoid technical terminology where possible.

Use something like:

## Voice / Music Isolation

**Keep:**

> Voice  
> Music

Internally, a 2-stem separation model runs once.

It generates:

```text
Vocals
Instrumental
```

but only the requested output continues through the pipeline.

---

## AudioTools.dev implementation to reuse

AudioTools.dev already has a Vocal Remover built around **SCNet** running through **ONNX Runtime Web**.

The model is approximately 13 MB and executes entirely in the browser. AudioTools describes it as neural separation rather than traditional centre-channel cancellation.

The existing implementation produces:

> vocals + instrumental

so your product can simply discard whichever side the user did not request.

No second model is required for “music removal.”

---

# 11. Vocal isolation limitations

This should be clearly communicated.

Neural separation is not perfect.

AudioTools itself notes potential remaining:

- vocal traces
- reverb
- backing vocals
- drums/instruments in the vocal stem
- poorer results on live recordings
- poorer results on heavily distorted material

It is also substantially slower than simple conversion, particularly on mobile.

Therefore the scheduler should treat vocal isolation as an **expensive processing stage**.

---

# 12. Features deliberately excluded from V1

The following should **not** be part of the initial scope:

- background-noise removal
- four-stem separation
- drums/bass/guitar separation
- exporting both voice and instrumental
- branching pipelines
- node graphs
- multitrack mixing
- DAW-style editing
- arbitrary FFmpeg commands
- complicated EQ/compressor interfaces
- server-side processing

The point is not to create Audacity in the browser.

The product is:

> **batch media processing through simple reusable recipes.**

---

# 13. Input format targets

AudioTools.dev currently accepts common inputs including:

- WAV
- MP3
- FLAC
- OGG
- Opus
- AAC
- M4A
- WebM
- MP4
- MOV
- MKV

Its current implementation also has handling for additional MPEG-family inputs such as MPEG/VOB/TS/MTS/M2TS.

The initial project should target:

### Audio

```text
WAV
MP3
AAC
M4A
FLAC
OGG / Vorbis
Opus
WebM audio
```

### Video

```text
MP4
MOV
MKV
WebM
```

MPEG/TS support can follow depending on how much of AudioTools' existing handling is retained.

---

# 14. Output format targets

The first useful set would be:

### MP3

Bitrates:

> 128  
> 192  
> 256  
> 320 kbps

AudioTools already uses a WebAssembly MP3 encoder for this.

---

### M4A / AAC

Good default compressed format.

Options:

> 128  
> 192  
> 256 kbps

AAC encoding should use native/browser support when available and a WASM fallback where necessary, following AudioTools' existing architecture.

---

### WAV

Lossless PCM.

Useful for:

- intermediate-quality output
- professional editing
- archival/workflow hand-off

---

### FLAC

Lossless compressed output.

AudioTools already supports FLAC through a WebAssembly encoder.

---

### Opus / OGG

This should be added even though AudioTools.dev does not currently expose it as an output format.

Useful for:

- speech
- messaging
- small high-quality files

---

### Original Stream

Special option:

> **Original audio — no re-encoding**

Available only where extraction/remuxing is possible.

---

# 15. Compression functionality

The concept of a separate “Audio Compressor” does not necessarily need its own page.

Compression can primarily be represented through the **Export** stage.

Example:

> Export MP3  
> 128 kbps

already means:

> reduce file size using lossy audio compression.

Advanced export could additionally support:

> **Target size:** 10 MB

The app can calculate the approximate bitrate based on duration.

AudioTools currently treats compression as a separate MP3-bitrate tool, but your pipeline architecture makes it more logical as an output property.

---

# 16. Batch behaviour

The processing screen should show per-file progress.

Example:

```text
✓ CAM001.mp4       Done
✓ CAM002.mp4       Done
● CAM003.mp4       Isolating voice · 63%
○ CAM004.mp4       Waiting
○ CAM005.mp4       Waiting
```

Every file should have its own state.

Potential states:

```text
Waiting
Reading
Extracting
Decoding
Processing
Normalizing
Separating
Encoding
Saving
Done
Failed
Cancelled
```

One failure must not terminate the entire batch.

Controls should include:

> Cancel current  
> Cancel all  
> Retry failed  
> Download completed

---

# 17. Test on one file

For expensive pipelines, users should be able to test the recipe before running the entire batch.

Example:

> **Test pipeline on first file**

Then:

```text
CAM001.mp4

Extract audio        ✓
Normalize            ✓
Keep voice           ✓
Encode MP3            ✓

Output:
18.4 MB
```

Then:

> **Apply to remaining 39 files**

This is particularly useful when vocal isolation is involved.

---

# 18. Pipeline presets

Once the pipeline system exists, presets become inexpensive to implement.

Suggested built-ins:

### Extract Original Audio

```text
Extract
→ Original Stream
```

### High Quality MP3

```text
MP3
192 kbps
```

### Speech

```text
Mono
→ Normalize −16 LUFS
→ MP3 128 kbps
```

### Isolate Voice

```text
Voice / Music Isolation: Voice
→ Normalize
→ MP3
```

### Karaoke / Remove Vocals

```text
Voice / Music Isolation: Music
→ MP3
```

Users could eventually save custom recipes locally.

---

# 19. Mobile behaviour

Mobile support should influence execution policy, not just CSS.

The interface itself should work naturally as a vertical stack.

Heavy processing should be conservative.

Suggested default scheduler:

### Desktop

Normal conversion:

> 2–4 files concurrently

Neural isolation:

> 1 file at a time

### Mobile

Normal conversion:

> 1–2 files concurrently

Neural isolation:

> 1 file at a time

This reduces memory pressure, overheating and browser termination.

AudioTools itself warns that SCNet separation is considerably slower on phones and requires substantial free memory.

---

# 20. Core dependency: Mediabunny

**Mediabunny should remain the main container/codec abstraction.**

It provides:

- media probing
- demuxing
- muxing
- encoded packet access
- audio/video track discovery
- conversion
- WebCodecs integration
- stream-copy opportunities
- trimming/resampling/conversion infrastructure

AudioTools.dev already uses Mediabunny as its core modern media layer.

It should replace the temptation to use FFmpeg.wasm for everything.

---

# 21. Mediabunny encoder dependencies

Likely dependencies include:

```text
mediabunny
@mediabunny/mp3-encoder
@mediabunny/flac-encoder
@mediabunny/aac-encoder
```

AudioTools currently vendors Mediabunny and its AAC, MP3 and FLAC encoder extensions. 

The AAC extension should remain a fallback when native browser encoding is unavailable.

---

# 22. Web Audio API

Use:

```text
AudioContext
OfflineAudioContext
AudioBuffer
```

for PCM-oriented operations such as:

- gain
- peak analysis
- waveform generation
- remixing
- potentially simple normalization
- sample-rate conversion where appropriate

AudioTools currently uses Web Audio heavily for its editing tools.

However, avoid forcing every input through a giant `AudioBuffer` unnecessarily.

Large files should remain streamed wherever possible.

---

# 23. WebCodecs

Use native **WebCodecs** through Mediabunny whenever browser support allows.

Advantages include:

- native codec implementations
- lower overhead than FFmpeg.wasm
- better streaming capability
- better performance on large media
- reduced WASM memory pressure

The architecture should fall back gracefully when browser-native decoding/encoding is unavailable.

---

# 24. ONNX Runtime Web

Required for voice/music isolation.

Dependency:

```text
onnxruntime-web
```

Purpose:

> execute the SCNet model locally inside the browser.

AudioTools currently uses ONNX Runtime Web for its Vocal Remover.

Where possible, execution should support:

> WebGPU

with a fallback to:

> WebAssembly / CPU

depending on browser support.

---

# 25. SCNet model

Reuse or adapt the SCNet-based 2-stem model currently used by AudioTools.dev.

Function:

```text
mixed audio
      ↓
    SCNet
   ↙     ↘
vocals   music
```

Your processor then selects:

```text
requested output
```

and immediately releases/discards the other stem.

This keeps the public pipeline 1→1.

---

# 26. Web Workers

Processing should occur outside the main UI thread wherever practical.

Workers are especially important for:

- ML inference
- MP3 encoding
- FLAC encoding
- waveform analysis
- heavy DSP
- potentially pipeline execution itself

The primary interface should remain responsive while a batch processes.

---

# 27. ZIP generation

For browsers where downloading multiple individual files is inconvenient, provide:

> **Download all as ZIP**

AudioTools already implements batch conversion with per-file results and ZIP download.

You could retain or generalise its existing batch implementation, or use a lightweight library such as:

```text
fflate
```

Avoid recompressing audio inside the ZIP; compressed media should simply be stored.

---

# 28. Direct folder output

This should probably be a later enhancement but is valuable for desktop users.

Where supported:

> Choose output folder

then write each processed result directly to disk.

Advantages:

- avoids retaining every output in browser RAM
- avoids giant ZIP files
- improves 50–100-file workflows
- better for WAV/FLAC output

Use the browser **File System Access API** where available.

Fall back to normal downloads elsewhere.

---

# 29. Memory architecture

This is one of the most important technical requirements.

Avoid:

```text
input File
→ huge AudioBuffer
→ Blob
→ Blob
→ Blob
→ final Blob
```

where possible.

Prefer:

```text
File
→ streamed demux
→ decode chunks if required
→ processor
→ encoder
→ output sink
```

Intermediate PCM should be released as soon as downstream stages have consumed it.

Vocal isolation may require larger overlapping chunks, so that processor needs its own memory strategy.

---

# 30. Suggested processor abstraction

Conceptually, every pipeline processor could expose something like:

```text
Processor

type
parameters

requiresPCM
supportsEncodedInput
supportsStreaming
isHeavy
canRunOnMobile

prepare()
process()
finalize()
```

Examples:

```text
ExtractProcessor
TrimProcessor
NormalizeProcessor
GainProcessor
ChannelProcessor
ResampleProcessor
IsolationProcessor
ExportProcessor
```

The UI should know nothing about the underlying codec implementation.

It simply generates a pipeline specification.

---

# 31. Pipeline specification

A recipe could conceptually look like:

```json
{
  "steps": [
    {
      "type": "extract",
      "track": "primary"
    },
    {
      "type": "normalize",
      "mode": "lufs",
      "target": -16,
      "truePeak": -1
    },
    {
      "type": "isolate",
      "keep": "vocals"
    }
  ],
  "output": {
    "format": "mp3",
    "bitrate": 192000
  }
}
```

The executor compiles that declarative recipe into an efficient execution plan.

That separation between **recipe** and **execution** will make the application significantly easier to extend.

---

# 32. Suggested technical stack

A sensible implementation would be:

```text
TypeScript
Vite

Mediabunny
@mediabunny/mp3-encoder
@mediabunny/flac-encoder
@mediabunny/aac-encoder

Web Audio API
WebCodecs

ONNX Runtime Web
SCNet model

Web Workers

fflate (optional ZIP implementation)

File System Access API (optional enhancement)
IndexedDB (presets / temporary state if needed)
```

I would prefer TypeScript for this project even if your original image compressor uses simpler JavaScript, because the pipeline state and media types will become complicated enough that static typing will pay for itself.

---

# 33. FFmpeg.wasm should NOT be a core dependency

Do not make the project:

> FFmpeg compiled to WebAssembly with a GUI.

That gives enormous format coverage but sacrifices much of the performance and architectural elegance you're trying to achieve.

Mediabunny + browser-native codecs should remain the primary path.

FFmpeg.wasm could eventually become a **lazy-loaded compatibility module** for obscure formats such as:

- WMA
- ASF
- AMR
- APE
- unusual legacy codecs

Only load it when required.

---

# 34. Legacy codec strategy

OGG/Opus should be considered a normal supported format, not a legacy edge case.

WMA is different.

Mediabunny doesn't provide WMA/ASF support through its normal modern codec/container stack, so WMA support would likely need another decoder such as FFmpeg.wasm.

That should therefore be a later compatibility feature rather than something that complicates V1.

---

# 35. AudioTools.dev components worth reusing

From the existing project, the most useful code/concepts to reuse are:

| Component | Reuse value |
|---|---:|
| Mediabunny integration | Very high |
| MP3 encoder integration | Very high |
| AAC fallback | Very high |
| FLAC encoder integration | Very high |
| Media probing | Very high |
| SCNet vocal separation | Very high |
| ONNX worker setup | Very high |
| MPEG compatibility code | Medium |
| Batch result management | Medium |
| WAV generation | Medium |
| Waveform rendering | Medium |
| Current UI | Low |
| Page-to-page tool navigation | Very low |
| Assistant routing system | Very low |

The AudioTools converter already supports multi-file conversion and sequential batch processing, so some of its batch logic provides a useful reference.

---

# 36. Components that should be rewritten

I would build your own:

- main application shell
- pipeline builder
- processing scheduler
- batch state manager
- responsive/mobile UI
- recipe format
- processor interface
- pipeline optimisation logic
- failure/retry system
- output manager

Do **not** attempt to turn all of AudioTools.dev's existing independent pages into one application by linking them together.

Its current “continue with this file” mechanism is useful inspiration but not the architecture your project needs.

---

# 37. Visual design direction

The interface should inherit the philosophy of the image compressor:

> simple  
> spacious  
> obvious  
> minimal explanation required  
> touch-friendly  
> fast

The advanced technical complexity should be hidden underneath.

A beginner should understand:

```text
10 files

Extract Audio
↓
Normalize
↓
Keep Voice
↓
MP3

PROCESS
```

A knowledgeable user can expand each stage for additional settings.

---

# 38. Recommended V1

A realistic first proper release should contain:

### File handling

- multiple file selection
- drag/drop
- mixed audio/video batch
- per-file metadata
- remove individual files

### Pipeline

- reorder steps
- add/remove steps
- compact collapsed cards

### Processing stages

- Extract Audio
- Trim
- Normalize
- Gain
- Mono/Stereo
- Sample Rate
- Voice/Music Isolation

### Export

- Original stream
- MP3
- M4A/AAC
- WAV
- FLAC
- Opus/OGG

### Batch

- sequential/limited-concurrency processing
- per-file progress
- errors isolated per file
- retry failures
- individual downloads
- ZIP all

### Performance

- stream where possible
- decode only where necessary
- encode only once
- one ML job at a time
- mobile-aware scheduling

---

# 39. V1.5 / V2

After the core architecture proves reliable:

- proper LUFS normalization if V1 initially uses peak normalization
- audio-track selection
- target-size compression
- saved recipes
- direct output folders
- Opus advanced controls
- metadata preservation
- cancellation/pause
- browser capability diagnostics
- legacy FFmpeg.wasm decoder
- AC-3/E-AC-3/DTS compatibility
- optional PWA/offline installation

Noise removal can remain outside the roadmap unless genuine demand appears.

---

# 40. Product positioning

The differentiator should **not** primarily be:

> “Free audio converter.”

There are hundreds of those.

The actual proposition is:

> **Build an audio-processing recipe and run it locally on an entire batch.**

Examples:

```text
20 videos
→ extract original audio
→ normalize
→ MP3
```

```text
30 interview WAVs
→ mono
→ normalize
→ MP3 128 kbps
```

```text
10 songs
→ remove music
→ normalize vocals
→ WAV
```

```text
40 MP4 camera clips
→ extract AAC
→ original stream
```

The last workflow should complete exceptionally quickly because the planner recognises that no decoding or encoding is required.

That combination of **pipeline processing + large batches + local execution + smart codec handling + an extremely simple mobile UI** is what makes the project substantially more interesting than another browser audio converter.

---

# 41. Licensing and attribution

AudioTools.dev itself is open-source under the MIT licence.

However, copying the project means preserving applicable notices for both its code and its dependencies.

In particular, AudioTools vendors Mediabunny under MPL-2.0 along with separate codec extensions. 

The new project should therefore maintain something along the lines of:

```text
LICENSE
THIRD_PARTY_LICENSES.md
```

and document:

- AudioTools.dev-derived MIT code
- Mediabunny
- codec encoder libraries
- ONNX Runtime
- SCNet/model attribution
- any ZIP or DSP libraries added later

The exact licensing of the particular separation model weights should also be verified before redistribution rather than assuming that the code licence automatically governs the model file.

---

# 42. Final project definition

The product should ultimately be thought of as a:

## **Local Batch Audio Processor**

rather than merely an:

## Audio Converter

Its defining workflow is:

```text
FILES
  ↓
RECIPE
  ↓
SMART EXECUTION PLAN
  ↓
LOCAL PROCESSING
  ↓
OUTPUT
```

with the key constraints:

> **No uploads**

> **Batch-first**

> **1 input → 1 output**

> **Linear vertical pipeline**

> **Mobile-friendly**

> **Stream copy whenever possible**

> **Decode only when necessary**

> **Encode only once**

> **Voice OR music isolation, never branching stems**

> **No noise removal for V1**

> **Simple UI hiding sophisticated processing underneath**

That should be the design constraint against which every future feature is evaluated.