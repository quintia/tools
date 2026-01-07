/// <reference types="vite/client" />

declare module "*.vue" {
	import type { DefineComponent } from "vue";
	const component: DefineComponent<object, object, Record<string, unknown>>;
	export default component;
}

declare module "prettier/standalone";
declare module "prettier/plugins/*";

declare module "virtual:pwa-register" {
	export function registerSW(options?: { immediate?: boolean }): void;
}
