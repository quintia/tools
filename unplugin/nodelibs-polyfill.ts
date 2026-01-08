import { createUnplugin } from "unplugin";

export default createUnplugin(() => {
	return {
		name: "nodelibs-polyfill",
		vite: {
			enforce: "pre",
			config() {
				return {
					resolve: {
						alias: [
							{
								find: /^(node:)?zlib$/,
								replacement: "\0polyfill:zlib",
							},
							{
								find: /^(node:)?(crypto|vm)$/,
								replacement: "@jspm/core/nodelibs/@empty",
							},
							{
								find: /^(node:)?(buffer|fs|path|process|stream|util|module|url|events|crypto|os|http|https|assert|console|constants|readline|timers|tty|string_decoder)\/?$/,
								replacement: "@jspm/core/nodelibs/$2",
							},
						],
					},
				};
			},
		},
		load(id) {
			if (id === "\0polyfill:zlib") {
				return `
          export * from "@jspm/core/nodelibs/zlib";
          import * as zlib from "@jspm/core/nodelibs/zlib";
          export const constants = zlib;
          export default zlib;
        `;
			}
		},
	};
});
