# Local isolation assets

The application bundles pinned neural JavaScript from `vendor/neural/` into lazy worker chunks. This directory serves the unchanged model, ONNX WASM loaders/binaries and notices on the application's own origin. Source revision and exact hashes are in `vendor/neural/provenance.json`; every build checks them. GPU assets are included for capability-driven use, not a claim of verified physical-GPU support.

The upstream record below describes the original AudioTools.dev packaging. This application replaces its model with `htdemucs_fp16.onnx` (HTDemucs v4, 85,034,606 bytes, SHA-256 `742a4f8594a48d6306da303b8b2dd8be2b54389b88557db034408b436effd775`, from huggingface.co/Ryan5453/unblend at revision `30b749fd691312b1e4b3f8fe79df0b51cde836cd`). The weights' license is unresolved: the file's metadata says `unlicensed`. It is bundled by the user's decision; see `THIRD_PARTY_LICENSES.md`. The app runs its own bounded Demucs windows and transforms instead of the bundle's whole-input separation.

# Source separation runtime (Vocal Remover)

Used by `/vocal-remover/separate-worker.js`. Everything here runs in the browser.

| File | What | Licence |
|---|---|---|
| `neural.js` + chunks | [`@audio/neural-separate`](https://github.com/audiojs/neural) 0.7.0 and `@audio/neural-runtime` 0.2.0 (with `fourier-transform`, `@audio/resample-sinc`), bundled with esbuild; the `onnxruntime-web` 1.31.1 JS for the wasm and WebGPU backends is in the `ort.*` chunks | MIT (see `NOTICE-neural-separate` and the licence comments at the end of each file) |
| `ort-wasm-simd-threaded.wasm`, `.mjs` | ONNX Runtime Web, CPU (WebAssembly) backend | MIT |
| `ort-wasm-simd-threaded.asyncify.wasm`, `.mjs` | ONNX Runtime Web, WebGPU backend | MIT |
| `htdemucs_fp16.onnx` | HTDemucs v4, the separation model (85 MB), fp16 weights with fp32 compute. SHA-256 checked by the worker before use | Unresolved (metadata says unlicensed) |

`ort.webgl.*` and `roformer-*` are chunks the bundle can import but the Vocal Remover never loads (other backends and models).

The model is served from this site rather than Hugging Face so that it loads where Hugging Face is blocked and no third
party sees the request.

## Rebuild

```sh
npm i @audio/neural-separate@0.7.0 @audio/neural-runtime@0.2.0 onnxruntime-web@1.31.1 esbuild
printf "export { default as separate } from '@audio/neural-separate'\nexport { load, fetchModel } from '@audio/neural-runtime'\n" > entry.js
npx esbuild entry.js --bundle --format=esm --splitting --outdir=out --minify --platform=browser --target=es2022 \
  --legal-comments=eof --chunk-names=[name]-[hash] --entry-names=neural "--external:node:*"
cp out/*.js node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded{,.asyncify}.{wasm,mjs} vendor/neural/
```

`node:*` imports stay external: they are only reached in Node, never in a browser.
