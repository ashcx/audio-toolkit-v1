# Engine architecture decision

2026-10-29. Major-design panel used Terra low and Luna low, read-only. Both inspected upstream and local Mediabunny contracts.

Terra proposed a typed processor registry and effective per-file `copy | pcm` execution plan, preserving recipe order and explicit normalization analysis passes. Luna proposed a sequential async-iterable PCM transform chain with browser-backed replay spools and a small runFile interface. Both identified whole-file upstream isolation and BufferTarget as unsuitable large-file defaults.

Choose the compiled plan as the public contract and bounded async-iterable PCM stages as its execution mechanism. This separates intent, copy eligibility and UI explanation from library APIs without duplicating a second planner. A single global inference slot and job-attempt IDs own cancellation. OPFS checkpoints retain expensive intermediate PCM when normalization requires replay.

Reject Luna's proposed moving trim into the reader regardless of card position. Source-time timestamps do not authorize reordering trim before preceding normalization or isolation. Carry source timeline mapping through stages and apply trim at its requested position. At most one trim step.

Probe results are feasibility evidence only. Production module/type definitions freeze in their owning sprints before consumers. No contract claims bounded inference or memory safety until actual duration-scaled measurements and overlap/tail checks exist.

Principles applied: Model the Domain selects a discriminated copy/PCM plan rather than parallel booleans. Foundational Thinking puts the verification probe before app features. Prove It Works requires actual encoded files and inference results.
