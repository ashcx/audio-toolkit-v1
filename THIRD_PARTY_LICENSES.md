# Third-party provenance

## Inspected source

AudioTools.dev was cloned read-only into ignored `.upstream/audiotools.dev` at revision `2e2373ec0273072f5db7a9c1c697d60a01c4f989`. Its README declares MIT with attribution to Roman Gordienko. Its branding, analytics and separate-tool UI are not copied. Processing integration patterns inform this app. The upstream whole-file PCM and BufferTarget paths do not establish bounded memory safety.

## Runtime dependencies

| Component | Pinned version/source | License and retained evidence |
| --- | --- | --- |
| Mediabunny | npm 1.63.0 | MPL-2.0, `licenses/Mediabunny-MPL-2.0.txt`; source included in published npm package and https://github.com/Vanilagy/mediabunny/tree/v1.63.0 |
| MP3 extension | @mediabunny/mp3-encoder 1.63.0 | MPL-2.0 wrapper, LAME 3.100 LGPL; source/rebuild instructions in pinned package README |
| AAC extension | @mediabunny/aac-encoder 1.63.0 wrapper; local FFmpeg n8.0 build | MPL-2.0 wrapper/bridge; FFmpeg LGPL-2.1-or-later. Exact source, bridge, build recipe and output hashes retained in vendor/aac and public/third-party. Original unpinned WASM is replaced. |
| FLAC extension | @mediabunny/flac-encoder 1.63.0 | MPL-2.0 wrapper, libFLAC BSD; binary revision and matching retained notice recorded below |
| Neural separation bundle | Upstream vendor at inspected revision, @audio/neural-separate 0.7.0 and @audio/neural-runtime 0.2.0 | MIT; bundled license comments and `licenses/neural-NOTICE.txt` retained |
| ONNX Runtime Web | upstream vendored 1.31.1 | MIT; `licenses/ONNXRuntime-MIT.txt` retained; single-thread WASM path runs without cross-origin isolation; optional WebGPU/WASM provider path retains separate verification |
| SCNet model | upstream vendor scnet.int8.onnx | Upstream identifies v1.0.6 ZFTurbo checkpoint; MIT repository license retained at `licenses/SCNet-MIT.txt`. Exact checkpoint-to-compact-model build provenance is upstream's assertion, not independently regenerated here. |

The model's SHA-256 is `3f049a0e4ce3c08264a6212a50445ba77f02a517cd4c6dc86cbe1ca130176d67`, verified locally. Original bundle license comments and notices remain intact. Modified integration code is separate from vendored code.

## Release gate

This is an audit record in progress, not a declaration that all redistribution obligations are closed. Exact encoder source/rebuild links, license texts, model provenance and production notice delivery must be verified before release. Do not strip library license comments. Do not claim the entire dependency tree is MIT.

FLAC binary identifies `reference libFLAC git-3f1ecff8 20260304`; its corresponding BSD notice was retrieved from that exact commit and retained. LAME LGPL text is retained; the package identifies LAME 3.100 and provides build instructions. The original AAC feasibility bundle identified `Lavc62.23.103` without an exact FFmpeg commit. Sprint 7 replaces that binary rather than assigning it an inferred source revision. Historic main deployments occurred; the current workflow authorizes PR delivery only.

The replacement AAC runtime is built from FFmpeg n8.0 revision `140fd653aed8cad774f991ba083e2d01e86420c7` using Emscripten 3.1.74, with the pinned 1.63.0 MPL bridge and wrapper. It identifies `Lavc62.11.100`. `scripts/build-aac.sh` and `scripts/build-aac.mjs` reproduce it. Two local bridge/runtime rebuilds produced identical recorded artifact hashes. The complete FFmpeg source archive is served as `public/third-party/ffmpeg-n8.0-source.zip`; bridge, worker source, modified wrapper and provenance are in `vendor/aac/`. Generated assets are hash-checked during every app build. Unknown original WASM is removed from the wrapper and is not imported by production or feasibility probes. This closes the identified missing FFmpeg source revision/build artifact gap; it does not certify every transitive licensing obligation.

Codec-parser 2.5.0 is LGPL-3.0-or-later, not MIT. Its exact installed package includes readable source and is retained in `public/third-party/codec-parser-2.5.0-source.zip`, alongside its LGPL text and incorporated GPL-3.0 text. Audiojs and wasm-audio-decoders wrapper MIT notices, Xiph notices, Preact/Zod, Emscripten and Musl notices are retained separately. A minimal footer links the served notice/source page. Full final dependency/source review remains Sprint 12; do not label the entire dependency tree MIT.

Sprint 6 integrates bounded FLAC decoding through @audio/decode-flac 2.0.0 (MIT), wrapping @wasm-audio-decoders/flac 0.2.11 (MIT wrapper with libFLAC BSD). Its license and libFLAC notice are retained. Vorbis decoding uses @audio/decode-vorbis 1.3.4 (MIT), wrapping @wasm-audio-decoders/ogg-vorbis 0.1.20. The latter declares original source MIT and preserves Copyright 2021–2025 Ethan Halsall in its bundle. Upstream licensing declaration is https://github.com/eshaz/wasm-audio-decoders#licensing. Audiojs's complete license is retained as `licenses/audio-decode-vorbis-MIT.txt`; Xiph Vorbis and Ogg BSD notices are retained as `licenses/Vorbis-BSD.txt` and `licenses/Ogg-BSD.txt`. The npm lockfile pins the resolved dependency tree. Library license comments remain intact.

The original SCNet owner explicitly confirmed MIT licensing of pretrained weights and ONNX redistribution on 2026-07-17. Primary author evidence was fetched from GitHub API into `docs/sprint-evidence/sprint-1/scnet-author-grant.json`. The checkpoint asset exists in the named upstream release. Audiojs model-card source revisions and checkpoint digest are retained in `scnet-model-card.md`; its compact asset has a different digest and is not substituted for the tested AudioTools.dev compact build. Original-author MIT notice is retained in `licenses/SCNet-author-MIT.txt`. This establishes published author permission; retraining or independently regenerating the compact export is outside this audit.

## Local Mediabunny padding fix

Sprint 5 modifies the Matroska demuxer in Mediabunny 1.63.0 (MPL-2.0) to retain positive Opus DiscardPadding in the final packet duration and reject padding it cannot preserve. Original copyright/license headers remain. Complete reproducible source and ESM transformations, original/patched SHA-256 values and version guard are in `vendor/mediabunny-patches.json`, applied by `scripts/patch-mediabunny.mjs` during npm postinstall. The unmodified corresponding package source is distributed by npm with the pinned dependency. This project uses ESM; CommonJS builds are not patched or used. This changes duration metadata, not encoded payloads.

Sprint 6 extends the same reproducible source/ESM patch to preserve fractional Matroska CodecDelay and normalize native decoder input timestamps. Native Opus decoding uses a copied zero-preskip header so the shared presentation clock owns trimming consistently across Chromium and WebKit. Custom decoders retain the prior pre-skip contract. Encoded packet payloads and the copy path are unchanged. Exact transformations and hashes remain in the patch manifest; browser reference results are in Sprint 6 evidence.

Sprint9 packages the unchanged neural JavaScript as lazy worker chunks from `vendor/neural/`, with declarations copied from the exact0.7.0/0.2.0 packages. Model and CPU/GPU WASM assets stay on the application origin. `vendor/neural/provenance.json` records upstream revision, package versions and exact asset/type hashes; `scripts/verify-neural.mjs` checks each build. Model build correspondence remains the inspected upstream assertion described above, not a newly regenerated checkpoint claim.

## Sprint 12 local audit

`scripts/static-audit.mjs` inspected 16 installed production package manifest declarations against the pinned lockfile and 22 served license/source assets. All 16 have license declarations. Every retained local notice/source link is nonempty and hashed in the audit record. AAC runtime/corresponding source and neural assets pass their pinned hash verifiers; the actual privacy browser journey checks served local notice/source links under the Pages base path. Private test songs and generated media are ignored and untracked. See docs/sprint-evidence/sprint-12/static-audit.json.

This closes the recorded local packaging/notice delivery check, not every possible transitive obligation. Upstream source links and the original model-weight grant/provenance remain evidence; the compact model was not independently regenerated from its training checkpoint. No new blanket-license or legal-compliance claim is made.

## Speech cleanup candidate, Sprint14

Pinned npm packages @sapphi-red/gtcrn-wasm0.0.3 and @lofcz/deepfilternet-web0.1.0 are locked with registry integrity. GTCRN wrapper MIT, GTCRN author MIT and pffft notices are copied to public/third-party. DeepFilterNet code is dual MIT/Apache-2.0; its MIT notice is copied. Fork source revision773cf0ca65da1f82bc63ee5d8fd15d9314190231 builds libDF with wasm/default-model and embeds models/DeepFilterNet3_onnx.tar.gz. See Sprint13 provenance and Sprint14 contracts.

Unresolved distribution gate. The original model owner has open requests explicitly asking whether its code license covers pretrained weight redistribution, including https://github.com/Rikorose/DeepFilterNet/issues/700 and https://github.com/Rikorose/DeepFilterNet/issues/712 . No owner clarification was visible when inspected2026-10-30. Package license metadata is not recorded as resolution of that question. Retain the candidate for authorized local evaluation and code review, with no deployment or unconditional distribution-readiness claim. The transitive compiled Rust notice audit remains unverified. This is an evidence limitation, not an invented restriction or a legal conclusion.
