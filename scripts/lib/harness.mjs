import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { chromium } from 'playwright';
import { createServer as createViteServer, preview } from 'vite';

export const FIXTURES = 'tests/fixtures';
const MODEL = 'public/vendor/neural/htdemucs_fp16.onnx';

async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
  });
}

/**
 * Serves the production build the way `vite preview` does. The model file can be served slowly in chunks
 * so a download is on screen long enough to read. APP_URL points at a server somebody else started,
 * in which case throttling is not available.
 */
export async function startApp() {
  if (process.env.APP_URL) return { url: process.env.APP_URL, throttle: null, close: async () => {} };
  const control = { throttle: null };
  let model = null;
  const port = await freePort();
  const server = await preview({
    logLevel: 'error',
    preview: { host: '127.0.0.1', port, strictPort: true },
    plugins: [{
      name: 'slow-model',
      configurePreviewServer(app) {
        app.middlewares.use(async (request, response, next) => {
          const slow = control.throttle;
          if (!slow || !request.url?.includes('htdemucs_fp16.onnx')) return next();
          model ??= await readFile(MODEL);
          response.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': model.length });
          let offset = 0;
          const send = () => {
            if (response.destroyed) return;
            if (offset >= model.length) return response.end();
            response.write(model.subarray(offset, offset + slow.chunkBytes));
            offset += slow.chunkBytes;
            setTimeout(send, slow.delayMs);
          };
          send();
        });
      },
    }],
  });
  return {
    url: `http://127.0.0.1:${port}/audio-toolkit-v1/`,
    /** Serve the model in chunkBytes pieces, one every delayMs. Pass null to serve it normally. */
    throttle: slow => { control.throttle = slow; },
    close: () => server.close(),
  };
}

export const launchChrome = (args = []) => chromium.launch({ channel: 'chrome', headless: true, args });

/** Reports one line per assertion and remembers failures so one run lists every problem. */
export function reporter() {
  const lines = [];
  const failures = [];
  const check = (name, condition, detail = '') => {
    lines.push({ name, ok: !!condition, detail: condition ? '' : String(detail) });
    if (condition) console.log(`ok   ${name}`);
    else { failures.push(name); console.log(`FAIL ${name}${detail ? ` -- ${detail}` : ''}`); }
    return !!condition;
  };
  const note = message => { lines.push({ name: message, ok: true, note: true }); console.log(`note ${message}`); };
  return { check, note, lines, failures };
}

/** Writes a stereo test tone. Noise rides on the sine so a separation run has something to separate. */
export async function makeAudio(path, { seconds, rate, noise = false, volume = 1 }) {
  const source = noise
    ? `aevalsrc=0.3*sin(2*PI*220*t)+0.1*sin(2*PI*880*t)+0.05*random(0):s=${rate}:d=${seconds}`
    : `sine=frequency=440:sample_rate=${rate}:duration=${seconds}`;
  execFileSync(process.env.FFMPEG ?? 'ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', volume === 1 ? source : `${source},volume=${volume}`, '-ac', '2', '-ar', String(rate), '-c:a', 'pcm_s16le', path]);
}

export async function ensureDirectory(path) { await mkdir(path, { recursive: true }); return path; }
export const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);

export function probeAudio(path) {
  const parsed = JSON.parse(execFileSync(process.env.FFPROBE ?? 'ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], { encoding: 'utf8' }));
  return { stream: parsed.streams[0], duration: Number(parsed.format.duration) };
}

/** Loads a TypeScript module from the project through Vite, so drivers can read the same values the app shows. */
export async function loadModule(path) {
  const server = await createViteServer({ logLevel: 'error', appType: 'custom', server: { middlewareMode: true } });
  try { return await server.ssrLoadModule(path); } finally { await server.close(); }
}
export const loadCopy = async () => (await loadModule('/src/copy.ts')).copy;
