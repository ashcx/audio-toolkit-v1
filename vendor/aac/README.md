# Reproducible AAC runtime

This replaces the unpinned FFmpeg WASM embedded in `@mediabunny/aac-encoder` 1.63.0. The wrapper and C bridge retain their MPL 2.0 copyright headers. FFmpeg is built from n8.0 revision `140fd653aed8cad774f991ba083e2d01e86420c7`, with its AAC encoder only and no GPL/nonfree/version3 configuration. The resulting library identifies `Lavc62.11.100`.

Run from the repository root on Linux with Bash, Git, Make, Python 3 and Node 22 available:

```sh
npm ci
bash scripts/build-aac.sh
npm run build
```

The script installs Emscripten 3.1.74 inside ignored `.upstream/emsdk`, checks pinned source revisions, configures/builds FFmpeg and links the retained bridge. It makes no shell-profile changes. The first compiler download is about 300 MB; ordinary app builds use committed generated files and need no compiler installation.

`scripts/build-aac.mjs` removes the original package's inline worker/runtime and substitutes a module worker using the rebuilt runtime. Its original wrapper input has a fixed SHA-256 guard. `source/` retains the exact upstream bridge and worker source. `encoder.mjs` retains the readable wrapper and helper code; `aac-worker.js` is generated from the retained worker source. The worker protocol and public `registerAacEncoder()` API are preserved.

`provenance.json` records source/compiler revisions and hashes of every generated artifact. Two local bridge/runtime rebuilds and a subsequent complete `build-aac.sh` run produced identical artifact manifests. This is a measured local reproducibility result, not a claim about all build hosts. `verify-aac.mjs` checks artifact hashes, the served build record and the complete FFmpeg source archive during every normal app build.

The corresponding FFmpeg source archive and build record are served under `public/third-party/`. Users can rebuild and replace the runtime using these sources and scripts. `licenses/FFmpeg-LGPL-2.1.txt`, the wrapper MPL notice, Emscripten and Musl notices are retained. Final transitive dependency review remains separate from this exact-source/build record.
