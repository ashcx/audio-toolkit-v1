# Sprint 12 contracts and throughput checkpoint

Base 98f1020 (Sprint 11 delivery). Scope: integrated automated verification, static/privacy/provenance audit, truthful setup/architecture/limits docs and sibling navigation handoff. No sibling edits, merges or deployment. Separate local validation, PR delivery and production state.

User-visible execution interfaces are frozen from Sprints 9–11. Use existing behavioral drivers sequentially against one immutable production build, stop on failure, fix proven defects at their source, then rerun the affected and dependent checks. Add a small privacy driver for observed requests, actual inference assets, license links and base-path navigation; do not duplicate the DSP/format suites. Physical devices and listening remain operator acceptance, not automation claims. The same independent Terra high reviewer will review the resulting records and gaps.

Throughput: main implements docs/driver sequentially; review may inspect frozen code read-only. Shared state is the production dist directory: do not rebuild it during browser runs. Resource budgets and explicit proven workloads stay as Sprint 11, without converting incomplete20-hour observations into support claims.
