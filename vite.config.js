import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CROSS_ORIGIN_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};

function copyRunAnywhereWasmPlugin() {
  const llamaWasmDir = path.resolve(__dirname, "node_modules/@runanywhere/web-llamacpp/wasm");
  const onnxWasmDir = path.resolve(__dirname, "node_modules/@runanywhere/web-onnx/wasm");

  return {
    name: "copy-runanywhere-wasm",
    writeBundle(options) {
      const outDir = options.dir ?? path.resolve(__dirname, "dist");
      const assetsDir = path.join(outDir, "assets");
      fs.mkdirSync(assetsDir, { recursive: true });

      for (const fileName of [
        "racommons-llamacpp.wasm",
        "racommons-llamacpp.js",
        "racommons-llamacpp-webgpu.wasm",
        "racommons-llamacpp-webgpu.js",
      ]) {
        const source = path.join(llamaWasmDir, fileName);
        if (fs.existsSync(source)) {
          fs.copyFileSync(source, path.join(assetsDir, fileName));
        }
      }

      const sherpaSourceDir = path.join(onnxWasmDir, "sherpa");
      const sherpaOutputDir = path.join(assetsDir, "sherpa");
      if (fs.existsSync(sherpaSourceDir)) {
        fs.mkdirSync(sherpaOutputDir, { recursive: true });
        for (const fileName of fs.readdirSync(sherpaSourceDir)) {
          fs.copyFileSync(
            path.join(sherpaSourceDir, fileName),
            path.join(sherpaOutputDir, fileName),
          );
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyRunAnywhereWasmPlugin()],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'SOURCEMAP_ERROR' || (warning.message && warning.message.includes('Sourcemap for'))) return;
        warn(warning);
      },
      output: {
        manualChunks: {
          monaco: ["@monaco-editor/react"],
          runanywhere: ["@runanywhere/web", "@runanywhere/web-llamacpp", "@runanywhere/web-onnx"],
        },
      },
    },
  },
  server: {
    headers: CROSS_ORIGIN_HEADERS,
  },
  preview: {
    headers: CROSS_ORIGIN_HEADERS,
  },
  assetsInclude: ["**/*.wasm"],
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["@runanywhere/web-llamacpp", "@runanywhere/web-onnx"],
  },
});
