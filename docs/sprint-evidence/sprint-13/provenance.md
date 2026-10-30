# Runtime provenance

GTCRN uses @sapphi-red/gtcrn-wasm 0.0.3 from https://github.com/sapphi-red/gtcrn-wasm . Its packaged JS contains the GTCRN MIT notice for Rong Xiaobin and the pffft license. The wrapper package is MIT. Model origin is https://github.com/Xiaobin-Rong/gtcrn .

DeepFilterNet3 uses @lofcz/deepfilternet-web 0.1.0 from https://github.com/lofcz/DeepFilterNet/tree/773cf0ca65da1f82bc63ee5d8fd15d9314190231/packages/web . Registry metadata identifies this revision. The package includes MIT and Apache-2.0 licenses for Hendrik Schröter. The WASM embeds its default model. Default model identity and all transitive Rust dependency notices still require source/build auditing before distribution as an app dependency.

Both archives are pinned by SHA-256 in scripts/prepare-speech-evaluation.mjs. They remain in ignored research artifacts. This change does not distribute either runtime as a production asset. Unverified package claims are not treated as numerical equivalence to the official model.
