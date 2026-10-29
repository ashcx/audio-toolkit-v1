# Third-party provenance

## Inspected source

AudioTools.dev was cloned read-only into ignored `.upstream/audiotools.dev` at revision `2e2373ec0273072f5db7a9c1c697d60a01c4f989`. Its README declares MIT with attribution to Roman Gordienko. Its branding, analytics and separate-tool UI are not copied. Processing integration patterns inform this app. The upstream whole-file PCM and BufferTarget paths do not establish bounded memory safety.

## Runtime dependencies

| Component | Pinned version/source | License and retained evidence |
| --- | --- | --- |
| Mediabunny | npm 1.63.0 | MPL-2.0, `licenses/Mediabunny-MPL-2.0.txt`; source included in published npm package and https://github.com/Vanilagy/mediabunny/tree/v1.63.0 |
| MP3 extension | @mediabunny/mp3-encoder 1.63.0 | MPL-2.0 wrapper, LAME 3.100 LGPL; source/rebuild instructions in pinned package README |
| AAC extension | @mediabunny/aac-encoder 1.63.0 | MPL-2.0 wrapper, FFmpeg AAC WASM; exact FFmpeg revision and transitive license/source obligations still require audit before shipping |
| FLAC extension | @mediabunny/flac-encoder 1.63.0 | MPL-2.0 wrapper, libFLAC BSD; exact library revision and notice closure still require audit before shipping |
| Neural separation bundle | Upstream vendor at inspected revision, @audio/neural-separate 0.7.0 and @audio/neural-runtime 0.2.0 | MIT; bundled license comments and `licenses/neural-NOTICE.txt` retained |
| ONNX Runtime Web | upstream vendored 1.31.1 | MIT; `licenses/ONNXRuntime-MIT.txt` retained; single-thread WASM path selected without cross-origin isolation |
| SCNet model | upstream vendor scnet.int8.onnx | Upstream identifies v1.0.6 ZFTurbo checkpoint; MIT repository license retained at `licenses/SCNet-MIT.txt`. Exact checkpoint-to-compact-model build provenance is upstream's assertion, not independently regenerated here. |

The model's SHA-256 is `3f049a0e4ce3c08264a6212a50445ba77f02a517cd4c6dc86cbe1ca130176d67`, verified locally. Original bundle license comments and notices remain intact. Modified integration code is separate from vendored code.

## Release gate

This is an audit record in progress, not a declaration that all redistribution obligations are closed. Exact encoder source/rebuild links, license texts, model provenance and production notice delivery must be verified before release. Do not strip library license comments. Do not claim the entire dependency tree is MIT.

Additional audit results: FLAC binary identifies `reference libFLAC git-3f1ecff8 20260304`; its corresponding BSD notice was retrieved from that exact commit and retained. AAC binary identifies `Lavc62.23.103`; the published package supplies its bridge and rebuild configuration without GPL flags, but does not pin the exact FFmpeg source commit. Preserve LGPL-2.1 text and resolve exact corresponding-source delivery before distributing a production build. No production distribution is authorized in this run. LAME LGPL text is retained; the package identifies LAME 3.100 and provides build instructions.

Sprint 6 integrates bounded FLAC decoding through @audio/decode-flac 2.0.0 (MIT), wrapping @wasm-audio-decoders/flac 0.2.11 (MIT wrapper with libFLAC BSD). Its license and libFLAC notice are retained. Vorbis decoding uses @audio/decode-vorbis 1.3.4 (MIT), wrapping @wasm-audio-decoders/ogg-vorbis 0.1.20. The latter declares original source MIT and preserves Copyright 2021–2025 Ethan Halsall in its bundle. Upstream licensing declaration is https://github.com/eshaz/wasm-audio-decoders#licensing. Audiojs's complete license is retained as `licenses/audio-decode-vorbis-MIT.txt`; Xiph Vorbis and Ogg BSD notices are retained as `licenses/Vorbis-BSD.txt` and `licenses/Ogg-BSD.txt`. The npm lockfile pins the resolved dependency tree. Library license comments remain intact.

The original SCNet owner explicitly confirmed MIT licensing of pretrained weights and ONNX redistribution on 2026-07-17. Primary author evidence was fetched from GitHub API into `docs/sprint-evidence/sprint-1/scnet-author-grant.json`. The checkpoint asset exists in the named upstream release. Audiojs model-card source revisions and checkpoint digest are retained in `scnet-model-card.md`; its compact asset has a different digest and is not substituted for the tested AudioTools.dev compact build. Original-author MIT notice is retained in `licenses/SCNet-author-MIT.txt`. This establishes published author permission; retraining or independently regenerating the compact export is outside this audit.

## Local Mediabunny padding fix

Sprint 5 modifies the Matroska demuxer in Mediabunny 1.63.0 (MPL-2.0) to retain positive Opus DiscardPadding in the final packet duration and reject padding it cannot preserve. Original copyright/license headers remain. Complete reproducible source and ESM transformations, original/patched SHA-256 values and version guard are in `vendor/mediabunny-patches.json`, applied by `scripts/patch-mediabunny.mjs` during npm postinstall. The unmodified corresponding package source is distributed by npm with the pinned dependency. This project uses ESM; CommonJS builds are not patched or used. This changes duration metadata, not encoded payloads.

Sprint 6 extends the same reproducible source/ESM patch to preserve fractional Matroska CodecDelay and normalize native decoder input timestamps. Native Opus decoding uses a copied zero-preskip header so the shared presentation clock owns trimming consistently across Chromium and WebKit. Custom decoders retain the prior pre-skip contract. Encoded packet payloads and the copy path are unchanged. Exact transformations and hashes remain in the patch manifest; browser reference results are in Sprint 6 evidence.
