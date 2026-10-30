# Sprint 11 contract and checkpoint

Base: Sprint10 branch dd64fc0. PR targets main and depends on PRs10 and11. No merging or release claim. User requested all three sprint PRs; technical dependent work proceeds against frozen interfaces while required independent acceptance remains open.

Only complete Batch results enter a ZIP. Entry names equal sanitized unique output names. Stored ZIP entries use CRC32 and ZIP64 headers, streamed in at most1MiB slices to the existing browser-backed store. No whole-output collection or full ZIP RAM copy. Internal offsets must remain exact JavaScript integers; quotas fail explicitly. Source results remain independently owned and downloadable after an archive failure.

An Archive owner has idle/building/cancelling/releasing/ready/failed/cleanup states. It owns one generated ZIP and URL, retains failed cleanup for explicit retry, cancels before releasing in-flight work, and disposes on unmount. Archive creation locks source removal and export changes until complete or cancelled. Changing completed source URLs invalidates a retained ZIP.

Design alternatives. Extending Batch with a fake ZIP media job would mix source-file plans with aggregate artifacts. A separate Archive owner reuses cleanupAll and the output store without pretending ZIP is an audio conversion. Main-instance sequential comparison substitutes for the unavailable second design panel; required independent Terra high review remains blocked by session capacity.

Throughput checkpoint. Blocking first steps are naming and ZIP layout/ownership freeze. Independent implementation is n/a under Scrum. Shared state is the source-result list, locked during archive creation. Smallest safe decomposition is ZIP writer and naming, owner/UI recovery, then resource measurements.

Resource budgets selected before runs. Owned-browser aggregate RSS guard2GiB, app copy/ZIP chunks1MiB, no more than one ZIP build. UI heartbeat max pause1second during ordinary retention/ZIP. Measure20 compressed hour-long sources,50 short PCM clips and a longer PCM conversion where feasible; smaller observed limits are reported without claiming unlimited capacity. Physical mobile suspension remains Sprint12 NOT VERIFIED.

ZIP layout reference: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT . The implementation uses stored entries with UTF-8 names and ZIP64 size/offset records.
