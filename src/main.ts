import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import "bootswatch/dist/lumen/bootstrap.min.css";
import "bootstrap/js/dist/collapse";
import "@git-diff-view/vue/styles/diff-view.css";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

createApp(App).use(router).mount("#app");
