import { defineConfig } from 'vite';
export default defineConfig({
  base: '/audio-toolkit-v1/',
  build: { rollupOptions: { input: 'probes/index.html' } },
});
