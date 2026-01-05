import { defineConfig, type Plugin } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import vue from "unplugin-vue/vite";
import { VitePWA } from "vite-plugin-pwa";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { fileURLToPath, URL } from "node:url";

// Needed because __dirname is not defined in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      resolve();
      return;
    }
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

function tesseractCopyPlugin(): Plugin {
  return {
    name: "tesseract-copy",
    async buildStart() {
      const publicDir = path.resolve(__dirname, "public/tesseract");
      const langDir = path.resolve(publicDir, "lang");

      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      if (!fs.existsSync(langDir)) {
        fs.mkdirSync(langDir, { recursive: true });
      }

      // Copy worker
      const workerPath = path.resolve(
        __dirname,
        "node_modules/tesseract.js/dist/worker.min.js"
      );
      if (fs.existsSync(workerPath)) {
        fs.copyFileSync(workerPath, path.resolve(publicDir, "worker.min.js"));
      }

      // Copy core
      const coreDir = path.resolve(__dirname, "node_modules/tesseract.js-core");
      if (fs.existsSync(coreDir)) {
        const files = fs.readdirSync(coreDir);
        files.forEach((file) => {
          if (
            file.startsWith("tesseract-core") &&
            (file.endsWith(".js") || file.endsWith(".wasm"))
          ) {
            fs.copyFileSync(
              path.resolve(coreDir, file),
              path.resolve(publicDir, file)
            );
          }
        });
      }

      // Download languages
      const ocrPath = path.resolve(__dirname, "src/views/ocr.vue");
      let languages = ["eng", "jpn"];
      if (fs.existsSync(ocrPath)) {
        const content = fs.readFileSync(ocrPath, "utf-8");
        const matches = [...content.matchAll(/code: "([a-z_]+)"/g)];
        if (matches.length > 0) {
          languages = matches.map((m) => m[1]);
        }
      }

      const baseUrl = "https://tessdata.projectnaptha.com/4.0.0/";
      await Promise.all(
        languages.map((lang) =>
          downloadFile(
            `${baseUrl}${lang}.traineddata.gz`,
            path.resolve(langDir, `${lang}.traineddata.gz`)
          )
        )
      );
    },
  };
}

export default defineConfig({
  plugins: [
    vue(),
    nodePolyfills(),
    tesseractCopyPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-512.png", "favicon.png"],
      manifest: {
        name: "Taniguchi's Tools",
        short_name: "TTools",
        description: "A comprehensive suite of developer and utility tools.",
        theme_color: "#ffffff",
        icons: [
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 40 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wasm,gz}"],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ["mupdf", "tesseract.js"],
  },
});