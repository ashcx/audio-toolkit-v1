# Audio Toolkit

Browser-local batch audio processing with ordered recipes. Implementation is in progress. The present increment is a processing feasibility harness, not the finished app.

## Run the current checks

Requires Node.js 22 or later.

```sh
npm ci
npx playwright install chromium webkit
npm run build
npm run preview -- --port 4173
```

In a second terminal:

```sh
PROBE_URL=http://127.0.0.1:4173/audio-toolkit-v1/probes/ npm run probe
node scripts/resource-probe.mjs
```

Linux WebKit can require `npx playwright install-deps webkit`. This installs development browser dependencies. Both servers bind to loopback. Open the local production preview at `http://127.0.0.1:4173/audio-toolkit-v1/probes/`.

The synthetic probes exercise encoding/decoding, AAC packet-copy feasibility and pinned-model CPU inference. They create no upload requests and load their model/runtime locally. They do not prove full-format support, listening quality, long-file limits or real-device compatibility. Probe records are in [Sprint 1 evidence](docs/sprint-evidence/sprint-1/coverage.md).

## Follow development

[TODO.md](TODO.md) owns sprint order. [Feature requirements](todo/audio-toolkit-plan.md) own full scope, including voice/music isolation. [Orchestration](todo/orchestration-plan.md) owns dependencies and contract freezes. [Third-party provenance](THIRD_PARTY_LICENSES.md) records source and outstanding production distribution obligations.

The image compressor is a read-only design reference. Its source tree is not a build dependency. Merge and production deployment are not authorized by the current implementation request.
