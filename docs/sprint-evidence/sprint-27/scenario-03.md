# Scenario 27-03. Five interleaved warm runs per shortlisted candidate, cold setup separate

Status is met for the 10 s, 60 s and 3 min inputs. Every shortlisted candidate has five counted runs, interleaved forward and backward after one uncounted warmup round. No candidate failed. Two runs were lost to a harness bug, described below.

Commands and run discipline are in [protocol.md](protocol.md). Rows are in [results.json](results.json).

## Warm runs

"Peak +MiB" is the median peak RSS of the dedicated Chrome's process tree minus the pre-run sample. RSS on Apple unified memory leaves out most GPU allocations, so read it as a lower bound.

| Input | Candidate | Runs ok/fail | Median s | Range s | Median RTF | Windows | Loads | Peak +MiB median (max) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10 s | scnet-app | 4/0 (+1 harness) | 3.78 | 3.74 to 3.83 | 2.65 | 1 | 1 | 1422 (1738) |
| 10 s | scnet-main | 5/0 | 3.50 | 3.36 to 3.64 | 2.86 | 1 | 1 | 1652 (1674) |
| 10 s | scnet-reuse2 | 5/0 | 3.57 | 3.41 to 3.64 | 2.80 | 1 | 1 | 1669 (1708) |
| 10 s | demucs-webgpu | 5/0 | 3.07 | 2.98 to 3.13 | 3.26 | 2 | 1 | 2003 (2028) |
| 10 s | demucs-wasm | 5/0 | 15.37 | 15.00 to 15.61 | 0.65 | 2 | 1 | 1520 (2007) |
| 60 s | scnet-app | 4/0 (+1 harness) | 56.08 | 55.68 to 58.54 | 1.07 | 12 | 12 | 3526 (4706) |
| 60 s | scnet-main | 5/0 | 53.66 | 44.38 to 82.12 | 1.12 | 12 | 12 | 3385 (5013) |
| 60 s | scnet-reuse2 | 5/0 | 47.66 | 43.06 to 50.65 | 1.26 | 12 | 6 | 2085 (3219) |
| 60 s | demucs-webgpu | 5/0 | 13.28 | 12.31 to 13.61 | 4.52 | 11 | 1 | 1981 (2367) |
| 60 s | demucs-wasm | 5/0 | 81.35 | 80.88 to 84.01 | 0.74 | 11 | 1 | 1672 (1818) |
| 3 min | scnet-main | 5/0 | 130.63 | 123.42 to 199.71 | 1.38 | 34 | 34 | 895 (5384) |
| 3 min | scnet-reuse2 | 5/0 | 134.51 | 119.22 to 170.90 | 1.34 | 34 | 17 | 2544 (4637) |
| 3 min | demucs-webgpu | 5/0 | 35.60 | 33.51 to 39.39 | 5.06 | 31 | 1 | 2762 (3013) |

At 3 minutes, demucs-wasm was shortlisted out after the 60 s result showed it slower than shipped SCNet. It has one run, in scenario-04.

## Phase medians

Demucs (worker timings, median per run):

| Input | Provider | Fetch + hash | Session | ORT run total | Per window | JS norm, STFT, iSTFT, overlap-add | Per window | Adapter copies | Return transfer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 60 s | WebGPU | 73 ms | 1329 ms | 8526 ms | 775 ms | 3263 ms | 297 ms | 78 ms | 0.4 ms |
| 3 min | WebGPU | 94 ms | 1258 ms | 24459 ms | 789 ms | 9615 ms | 310 ms | 222 ms | 0.3 ms |
| 60 s | WASM | 86 ms | 718 ms | 78528 ms | 7139 ms | 2043 ms | 186 ms | 41 ms | 0.2 ms |

Adapter copies (splitting and rejoining the complex spectrogram) are about 1% of the run. Returning the outputs is a transfer, not a copy, and takes under 1 ms. Accumulating the accompaniment takes 6 to 20 ms.

SCNet shipped stage (from runner events, summed over windows, median per run):

| Input | Worker start + cached model fetch + hash | Session creation | Separation | Per window |
| --- | --- | --- | --- | --- |
| 60 s, one worker per window | 1131 ms | 6361 ms | 45692 ms | 3808 ms |
| 60 s, two-window reuse | 427 ms | 2660 ms | 44103 ms | 3675 ms |
| 3 min, one worker per window | 1420 ms | 7119 ms | 121818 ms | 3583 ms |
| 3 min, two-window reuse | 1141 ms | 6819 ms | 124634 ms | 3666 ms |

At 3 min the reuse candidate's session total is not half the baseline's. Separation dominates both, and the gap between the two 3 min medians (−3%) is smaller than their ranges. So two-window reuse makes no measurable difference at 3 minutes.

## Cold download and setup

Each candidate ran once in a fresh Chrome profile with an empty HTTP cache, then once warm, on the 10 s input (`bench-cold.json`). The model came from the local server, so these times exclude network latency.

| Candidate | Cold | Warm after cold | Cold fetch + hash | Cold session |
| --- | --- | --- | --- | --- |
| scnet-main | 3.78 s | 3.63 s | 58 ms (13.2 MB) | 502 ms |
| demucs-webgpu | 3.61 s | 3.26 s | 163 ms (85.0 MB) | 1382 ms |
| demucs-wasm | 16.15 s | 15.48 s | 172 ms | 799 ms |

On a real first visit the download dominates. At 50 Mbit/s, 85.0 MB takes about 13.6 s and 13.2 MB takes about 2.1 s. That is arithmetic, not a measurement. Phase 3 should fetch the model once, keep it in the Cache API or HTTP cache, hash-check it, and show download progress.

## Failures and noise

- **Harness failures.** The 10 s and 60 s runs of `scnet-app` in round 1 completed (3.6 s and 44.7 s). The driver then tried to save listening WAVs that this candidate does not keep, and marked both runs failed. The driver was fixed afterwards. Neither is a candidate failure, and both are excluded from the medians.
- **Background load.** Other agent sessions loaded the machine during the runs. The 1-minute load average reached 34 during SCNet's 60 s round 4. That run was the 82 s outlier, and similar spikes produced the 3 min SCNet maxima of 171 s and 200 s. Interleaving spread the load across candidates. Demucs's ranges stayed within ±10% of its medians, and its slowest runs remained well under SCNet's fastest.
- **Drift.** The overlap experiment, run 40 minutes later, measured Demucs at 25% overlap with a 15.17 s median against 13.28 s here, with per-window inference at 852 ms against 775 ms. Absolute times drift by about 15% across sessions on this machine. Ratios within one interleaved session are the reliable figures.
