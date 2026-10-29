# Input inspection matrix

Locally generated sine/black-video fixtures and ffprobe references are retained in tests/fixtures/manifest.json. Normal fixture/browser checks need no FFmpeg or network. Regeneration requires FFmpeg/ffprobe and scripts/generate-fixtures.mjs. Inspection does not establish every decoder/codec combination in a container.

| Input | Chromium actual result | WebKit |
| --- | --- | --- |
| tone.wav | ready: tone.wav375.1 KB · 0:02 · WAV · PCM-S16 · Stereo · 48 kHz | ready |
| tone.mp3 | ready: tone.mp332.3 KB · 0:02 · MP3 · Stereo · 48 kHz | ready |
| tone.aac | ready: tone.aac32.2 KB · Duration unknown · ADTS · AAC · Stereo · 48 kHz | ready |
| tone.m4a | ready: tone.m4a32.7 KB · 0:02 · MP4 · AAC · Stereo · 48 kHz | ready |
| tone.flac | ready: tone.flac34.5 KB · 0:02 · FLAC · Stereo · 48 kHz | ready |
| tone.ogg | ready: tone.ogg10.2 KB · Duration unknown · Ogg · VORBIS · Stereo · 48 kHz | ready |
| tone.opus | ready: tone.opus28.9 KB · Duration unknown · Ogg · OPUS · Stereo · 48 kHz | ready |
| audio.webm | ready: audio.webm29.7 KB · 0:02 · WebM · OPUS · Stereo · 48 kHz | ready |
| video.mp4 | ready: video.mp434.6 KB · 0:02 · MP4 · AAC · Stereo · 48 kHz | ready |
| video.mov | ready: video.mov34.6 KB · 0:02 · MOV · AAC · Stereo · 48 kHz | ready |
| video.mkv | ready: video.mkv33.3 KB · 0:02 · Matroska · OPUS · Stereo · 48 kHz | ready |
| video.webm | ready: video.webm33.2 KB · 0:02 · WebM · OPUS · Stereo · 48 kHz | ready |
| offset.mp4 | ready: offset.mp434.6 KB · 0:02 · MP4 · AAC · Stereo · 48 kHz | ready |
| unsupported.mkv | failed: unsupported.mkv32.8 KBUnsupported audio codec. | failed |
| long-video.webm | ready: long-video.webm20.0 KB · 0:02 · WebM · OPUS · Mono · 48 kHz | ready |
| no-audio.mp4 | failed: no-audio.mp41.6 KBNo audio track. | failed |
| misnamed.mp3 | ready: misnamed.mp3375.1 KB · 0:02 · WAV · PCM-S16 · Stereo · 48 kHz | ready |
| corrupt.wav | failed: corrupt.wav22 BUnsupported or unreadable media. | failed |
