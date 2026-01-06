import { defineConfig } from "vite";
import vue from "unplugin-vue/vite";
import { VitePWA } from "vite-plugin-pwa";
import { tesseractCopyPlugin } from "./vite-plugins/tesseract-copy";

export default defineConfig({
  plugins: [
    vue(),
    tesseractCopyPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-512.png", "favicon.ico"],
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
  resolve: {
    alias: [
      {
        find: /^(node:)?vm$/,
        replacement: "@jspm/core/nodelibs/@empty",
      },
      {
        find: /^(node:)?(buffer|fs|path|process|stream|util|module|url|events|crypto|os|http|https|zlib|assert|console|constants|readline|timers|tty|string_decoder)\/?$/,
        replacement: "@jspm/core/nodelibs/$2",
      },
    ],
  },
  define: {
    global: "globalThis",
    "process.env": "({})",
  },
  optimizeDeps: {
    exclude: ["mupdf", "tesseract.js"],
  },
  worker: {
    format: "es",
  },
});
