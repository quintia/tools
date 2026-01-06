import { defineConfig } from "vite";
import vue from "unplugin-vue/vite";
import tesseractCopyPlugin from "./unplugin/tesseract-copy";
import nodelibsPolyfill from "./unplugin/nodelibs-polyfill";
import pwaPlugin from "./unplugin/pwa";

export default defineConfig({
  plugins: [
    vue(),
    tesseractCopyPlugin.vite(),
    nodelibsPolyfill.vite(),
    pwaPlugin.vite({
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
  worker: {
    format: "es",
  },
});
