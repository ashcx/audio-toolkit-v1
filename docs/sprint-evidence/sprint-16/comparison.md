# Practical candidate assessment

The official DTTNet repository is https://github.com/junyuchen-cjy/DTTNet-Pytorch on its master branch. Its README describes a PyTorch/Conda inference workflow and checkpoints hosted in Mega and Baidu folders. Its code LICENSE is Apache2.0. No documented browser ONNX model, compatible spectral/state contract, or browser runtime integration was found in the inspected root/README. Checkpoint redistribution rights were not separately verified. Local evidence copies remain in ignored .artifacts/music16. Published parameter counts and SDR do not prove browser speed, memory or compatibility. DTTNet inference/quality/performance in this browser are NOT VERIFIED; shipping it would require a converted and numerically checked model plus rights and resource evidence.

SCNet candidate1 would retain the session across windows. That could reduce repeated initialization but would undo the fresh-worker lifetime boundary introduced after earlier retained-memory failures. No present peak-memory and repeated-lifetime proof exists for that variant on this Mac. It is not an eligible shipped optimization.

Candidate2 would reduce overlap or expand windows. That changes boundary reconstruction and the measured memory envelope. No paired source/stem reference or listening evidence supports accepting those quality/resource changes. The official DTTNet README itself describes overlap as a speed/quality tradeoff; its published factor is not used as this app's speed estimate.

Candidate3 is the already-existing WebGPU+WASM capability path versus forced CPU. The current default is exercised in baseline-chrome.json. Successful default provider selection is not an optimization introduced by this sprint, and no all-GPU placement or controlled before/after gain is claimed. A forced-CPU matched baseline, five-run comparison and profiler/peak measurements remain unverified.

Retain SCNet until a practical candidate clears the stated measurement and quality gates. This is a no-eligible-win assessment, not proof that all alternatives are slower or infeasible in principle.
