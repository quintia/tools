import { createApp } from "vue";
import { Buffer } from "buffer";
import process from "process";
import App from "./App.vue";
import { router } from "./router";
import "bootswatch/dist/lumen/bootstrap.min.css";
import "bootstrap/js/dist/collapse";
import { registerSW } from "virtual:pwa-register";

globalThis.Buffer = Buffer;
globalThis.process = process;

registerSW({ immediate: true });

createApp(App).use(router).mount("#app");
