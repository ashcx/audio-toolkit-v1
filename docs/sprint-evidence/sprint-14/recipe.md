# Recipe integration

Added a strict speech-step variant with standard or detailed model identity. Voice isolation is distinct from Voice / music. The editor offers Standard · GTCRN and Detailed · DeepFilterNet3 without speed/quality claims. Existing recipes remain version1 and validate without adding a speech step. Speech always selects a PCM plan and explains why Original audio is incompatible. Batch's existing exclusive neural slot now covers speech so concurrent ordinary jobs cannot multiply model working sets.

Checks. Typecheck passes. All68 normal unit tests pass, including six new streaming adapter cases. They prove fixed-frame delay compensation, tail length, independent channel state, original rate/frame clock, invalid-output release and cancellation release with deterministic delayed processors. These are adapter-contract checks, not actual neural quality tests. Actual CPU model execution is separately exercised through the browser pipeline harness.
