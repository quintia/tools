import { createRouter, createWebHistory } from "vue-router";
import { tools } from "./tools";

const routes = [
	{
		path: "/",
		component: () => import("./views/home.vue"),
	},
	...tools.map((tool) => ({
		path: tool.path,
		component: tool.component,
	})),
];

export const router = createRouter({
	history: createWebHistory(),
	routes,
});
