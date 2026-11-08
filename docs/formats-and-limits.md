# Formats and measured limits

| Area | Behavior |
| --- | --- |
| Inputs | Content-inspected audio/video including MP3, AAC/M4A, WAV, FLAC, Ogg/Vorbis/Opus, MP4/MOV, WebM and Matroska; decodable streams remain codec/browser dependent |
| Outputs | MP3; AAC in M4A; WAV; FLAC; Opus in OGG; Original audio chooses a suitable container for the identified codec |
| Copy vs encode | Compatible extraction may preserve compressed packets. Trim/processing or a selected encoding format uses PCM where supported. Unsupported plans report an error |
| Channels/rates | Recipe validates supported mono/stereo and codec sample-rate settings; unsupported combinations are rejected before starting |
| WAV | Size guards reject unsupported lengths rather than emitting corrupt headers |
| Preview | Actual retained output, native browser playback when supported; no separate low-quality preview pipeline |
| ZIP | Stored ZIP64, safe unique UTF-8 names, CRC32; includes only completed outputs. Desktop unzip/browser save behavior is still device dependent |
| Isolation | Two stems only (voice or music) from HTDemucs v4; music is drums + bass + other, so voice + music is close to but not exactly the mix. Keep music is a sum of predicted stems at the model's 44.1 kHz, not the original minus voice: sources at other rates are resampled and band-limited (96 and 192 kHz lose content above 22.05 kHz, and 48 kHz takes a 48 to 44.1 to 48 kHz round trip). Quality depends on the source and has not been judged by ear; leakage and artifacts are possible. First use downloads an 85 MB model. WebGPU on an Apple M5 separated 60 s in about 13 s; without a usable GPU it runs on single-thread WASM at about 81 s per 60 s. Memory is bounded per window, not per track: no length cap. No promise of perfect separation or LUFS mastering |

Automated integrated coverage is Linux Chromium and Playwright WebKit, including desktop 390 px responsive simulation. It does not establish branded Chrome on macOS, Edge, actual Safari/iOS or Android. Firefox is explicitly unsupported by this app. Native preview codec support is separate from export support.

Proven synthetic limits from Sprint 11: 50 ten-second stereo 48 kHz WAV clips exported to WAV, retained, then archived as 96,002,200 bytes; owned Chromium RSS peaked 863,178,752 bytes and ZIP writes stayed within 1 MiB. ZIP heartbeat max 72.5 ms. One ten-minute stereo 48 kHz WAV converted to MP3 with peak 640,860,160 bytes RSS. RSS is sampled sum across owned browser processes, not exclusive physical memory or a mobile guarantee; the selected abort budget was 2 GiB. Disk retains original results plus one ZIP while both are available.

A corrected Sprint 12 run also completed 20 synthetic one-hour AAC/M4A sources (1,699,529 bytes each) using the matching-container original-audio byte-copy fast path. The first downloaded file exactly matched its source; all 20 jobs completed. The combined copy and ten-minute PCM run peaked 935,424,000 bytes RSS. This is small compressed silence, not camera footage or remuxing throughput. These measurements do not prove 20 hour-long encodes, video remuxes, isolation, arbitrary large files or unlimited batches. Previous isolation evidence covers a 211.7-second song in both modes and separate excerpts; it does not replace listening or Mac heat/reliability acceptance. Temporary-storage quota and available memory vary by browser/device. Free space, reduce the batch or download individually after quota failure. Background/suspended mobile tabs may stop; keep the tab open and save outputs.
