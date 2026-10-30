# Speech evaluation contract

Starting revision e9d68cc. The user authorized Sprints 13–15 on 2026-10-30. Existing physical-device and listening gates remain open. The pre-existing deletion of todo/sprint-12-unfinished.md is outside this change.

Data shape is one independent mono streaming processor per channel and job, with fixed input/output frame size and explicit destruction. Standard uses GTCRN at 16 kHz with 256 samples; Detailed uses DeepFilterNet3 at 48 kHz with 480 samples. Existing ordered PCM streams preserve their source clock. Model lookahead must be measured and compensated before integration. No speed or quality ranking follows from the labels.

Throughput checkpoint. Execute one model workload at a time on this Mac. First prove initialization, nonzero finite output and destruction. Then compare identical licensed speech/noise inputs, five alternating runs, separate initialization and processing, and record latency, memory boundaries and errors. Synthetic tones validate execution only. Listening quality requires actual observations.

Task sequence follows scrum-mode. Ground contracts and baseline, implement the scoped increment, drive the actual product, self-review and rerun, log evidence, obtain independent interrogate, then deliver one PR. No implementation delegation. Sprints 14 and 15 depend on Sprint 13 evidence; they cannot inherit a completed baseline from a smoke test.

Throughput checkpoint items. Blocking first steps are representative fixtures, rights audit, delay/resource contracts and Sprint 13 acceptance. Independent workstreams are n/a because scrum-mode requires sequential main-instance execution. Shared mutable state is the checkout and build output; only the parent writes them, with reviewers read-only. The smallest safe decomposition is evaluation, then recipe integration, then measured acceleration, preserving the existing sprint boundaries.
