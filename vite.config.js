import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
export default defineConfig({
  plugins: [preact()],
  worker: { format: "es" },
  base: "/audio-toolkit-v1/",
  build: { rollupOptions: { input: ["index.html", "probes/index.html"] } },
});
