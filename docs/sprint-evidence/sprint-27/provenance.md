# Sprint 27 model provenance

## Model file

| Item | Value |
| --- | --- |
| File | `htdemucs_fp16.onnx` |
| Source URL | https://huggingface.co/Ryan5453/unblend/resolve/main/htdemucs_fp16.onnx |
| Revision observed on OBRA (2026-10-31 research) | `30b749fd691312b1e4b3f8fe79df0b51cde836cd` |
| Bytes | 85034606 |
| SHA-256 | `742a4f8594a48d6306da303b8b2dd8be2b54389b88557db034408b436effd775` |
| Local path | `.artifacts/models/htdemucs_fp16.onnx` (gitignored, never committed) |
| Producer | pytorch 2.13.0, ONNX IR 8, opset 17 |

The file was downloaded from the `main` URL with the user's permission. Its bytes and hash equal the values the research recorded for the pinned revision above. That makes it the same file the research describes. It does not prove that `main` will keep serving it. Phase 3 should fetch from the immutable revision URL.

## Embedded metadata

Read with `onnx` 1.23.2 from the file's `metadata_props`, unchanged:

| Key | Value |
| --- | --- |
| sources | `["drums", "bass", "other", "vocals"]` |
| sample_rate | 44100 |
| audio_channels | 2 |
| weight_precision | fp16 |
| compute_precision | fp32 |
| model_family | demucs |
| architecture | htdemucs |
| segment_samples | 343980 |
| stft_n_fft | 4096 |
| stft_hop_length | 1024 |
| stft_win_length | 4096 |
| stft_normalized | true |
| stft_window | hann |
| batch_mode | dynamic |
| external_normalization | true |
| license | unlicensed |
| stft_pad_samples | 1536 |
| stft_frame_trim | 2 |

Graph inputs are `spec_real` and `spec_imag` `[batch, 2, 2048, 336]` and `audio` `[batch, 2, 343980]`. Graph outputs, measured by running it, are `out_spec_real` and `out_spec_imag` `[1, 4, 2, 2048, 336]` and `out_wave` `[1, 4, 2, 343980]`. The graph casts fp16 weights to fp32 (321 `Cast` nodes), so fp16 storage does not mean fp16 arithmetic.

## License status and bundle decision

The file's own metadata says `license = unlicensed`. The Hugging Face model card reports no explicit grant for the weights. The upstream Demucs code is MIT, but that license covers code, not these exported weights.

The user was told this and chose to bundle the model anyway. This is the user's decision, recorded here as theirs. This sprint did not make it and does not assess its legal effect. Until a later phase packages the model, it lives only in the gitignored `.artifacts/` folder.

## Runtimes used in Phase 1

| Runtime | Version | Role |
| --- | --- | --- |
| onnxruntime (Python, CPUExecutionProvider) | 1.31.1 | Reference |
| numpy | 2.4.6 | Reference transforms |
| onnxruntime-web (vendored `vendor/neural/`) | 1.31.1 | Browser probe, WASM and WebGPU |
| @audio/neural-separate (vendored) | 0.7.0 | Browser chunking, STFT and overlap-add |
| Chrome (Playwright `channel: 'chrome'`, headless) | 156.0.8078.81 | Browser probe |
