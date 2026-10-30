# CPU evaluation

Run `node scripts/prepare-speech-evaluation.mjs`. It verifies archive hashes before extraction. Add these upstream evaluation fixtures as `.artifacts/speech-upstream/clean.wav` and `noisy.wav` respectively.

- https://raw.githubusercontent.com/Rikorose/DeepFilterNet/main/assets/clean_freesound_33711.wav
- https://raw.githubusercontent.com/Rikorose/DeepFilterNet/main/assets/noisy_snr0.wav

Attribution and limitations are in https://github.com/Rikorose/DeepFilterNet/blob/main/assets/README.md . Speech 33711 is CC BY-NC 3.0. These files are used for local noncommercial evaluation only and are not redistributed with this change. Commercial reuse needs another fixture. This one speaker/noise pair is not a representative quality corpus.

Serve `.artifacts/speech-upstream/` on localhost and click Run both CPU models in Chrome. The harness decodes the same input, independently resamples reference and mixture to the required rate, runs fixed frames with zero padding and a 200 ms flush, checks finite nonzero changed output, and searches positive delay within 100 ms using the first two seconds. The search uses every eighth reference sample and raw correlation. This is an exploratory alignment check, not a standardized quality metric. SNR is computed against the entire aligned reference. The requested model comparison remains inconclusive beyond this sample.

The synthetic smoke and speech outputs are recorded separately in chrome-smoke.json and chrome-speech.json. Five alternating runs complete without model errors. Measured alignment is 256 samples at 16 kHz for GTCRN and 1440 samples at 48 kHz for DeepFilterNet3 on this sample. Different sample rates and browser resampling prevent a controlled quality ranking.

Initialization and frame-loop processing are separate timings. Decode, resample, quality comparison and download are excluded. No end-to-end product speedup is established. Runtime/JIT warmup and thermal drift are visible across runs. No profiler or limiter measurement has been performed, so comparative performance is INCONCLUSIVE under benchmark-checklist. No reliable process or WASM peak-memory instrumentation is present. Memory remains NOT VERIFIED. One-frame buffering in a future adapter does not establish runtime heap bounds.

The WASM files are 196884 bytes for GTCRN and 34135648 bytes for DeepFilterNet3. Those are packaged runtime sizes with embedded model data, not independently measured weight tensor sizes.

Actual listening, multiple speakers/noises, clean speech preservation, stereo, tail checks and mobile/browser coverage remain open. The harness is exploratory and retains whole short fixtures in memory. It must not be used as the app's bounded processing implementation.

Fixture SHA-256 values observed for this run are `2d885e9f45c0f9381aee09a397ecd160aff1875ffb75ebe2217d21c3511b0d5d` for clean.wav and `e1e08601f3b7ceb2f36d45c86343e38cd8927a73d7ad5526d6c4687c33aa7186` for noisy.wav. Check these before reproducing the saved result. Source URLs above are mutable; the hashes freeze the actual evaluation bytes.
