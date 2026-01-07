import { createUnplugin } from "unplugin";

export default createUnplugin(() => {
	return {
		name: "nodelibs-polyfill",
		vite: {
			config() {
				return {
					resolve: {
						alias: [
							{
								find: /^(node:)?(crypto|vm)$/,
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
						"process.env": "{}",
					},
				};
			},
		},
	};
});
