import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
export default defineConfig({
  plugins: [preact()],
  worker: {
    format: "es",
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: "worker-media", test: /node_modules\/mediabunny\// }, { name: "isolation-runtime", test: /vendor\/neural\// }],
        },
      },
    },
  },
  base: "/audio-toolkit-v1/",
  build: { rollupOptions: { input: ["index.html", "probes/index.html"] } },
});
