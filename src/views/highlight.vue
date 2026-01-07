<template>
  <div class="container py-4">
    <ToolHeader
      title="Highlight"
      description="Generate syntax-highlighted code snippets using Prism.js and download them as PNG images."
    />

    <div class="card mb-4 shadow-sm">
      <div class="card-header fw-bold small text-uppercase text-muted">Configuration</div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label for="language" class="form-label small text-muted">Language</label>
            <select id="language" v-model="language" class="form-select">
              <option v-for="lang in LANGUAGES" :key="lang.id" :value="lang.id">
                {{ lang.name }}
              </option>
            </select>
          </div>
          <div class="col-md-4">
            <label for="theme" class="form-label small text-muted">Theme</label>
            <select id="theme" v-model="theme" class="form-select">
              <option v-for="(t, id) in THEMES" :key="id" :value="id">
                {{ t.name }}
              </option>
            </select>
          </div>
          <div class="col-md-4">
            <label for="fontSize" class="form-label small text-muted">Font Size</label>
            <div class="input-group">
              <input
                id="fontSize"
                v-model.number="fontSize"
                type="number"
                class="form-control"
                min="10"
                max="32"
                step="1"
              />
              <span class="input-group-text">px</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-lg-6">
        <ToolCard title="Code" class="h-100" no-padding>
          <template #header-actions>
            <span class="text-muted small">Auto-renders with Prism</span>
          </template>
          <MonospaceEditor
            v-model="code"
            :language="language"
            :rows="14"
            placeholder="Paste your code here..."
          />
        </ToolCard>
      </div>

      <div class="col-lg-6">
        <ToolCard title="Preview" class="h-100" no-padding>
          <template #header-actions>
            <button
              class="btn btn-link p-0 small"
              :disabled="isRendering || isDownloading"
              @click="downloadPng"
            >
              {{ isDownloading ? "Preparing..." : "Download PNG" }}
            </button>
          </template>
          <div class="card-body bg-light h-100">
            <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>
            <div v-else class="code-wrapper font-monospace preview-surface" :style="wrapperStyle">
              <LoadingOverlay v-if="isRendering" :loading="true" message="Rendering..." />
              <img
                v-else-if="previewImage"
                :src="previewImage"
                class="img-fluid rounded shadow-sm"
                alt="Highlighted code preview"
              />
              <div v-else class="text-muted small">Preview will appear here.</div>
            </div>
          </div>
        </ToolCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Prism from "prismjs";
import { computed, onMounted, ref, watch } from "vue";
import LoadingOverlay from "../components/LoadingOverlay.vue";
import MonospaceEditor from "../components/MonospaceEditor.vue";
import ToolCard from "../components/ToolCard.vue";
import ToolHeader from "../components/ToolHeader.vue";

const loadedLanguages = new Set<string>(["markup", "clike", "javascript", "css"]);

const LANGUAGES = [
	{ id: "clike", name: "Clike" },
	{ id: "markup-templating", name: "Markup-templating" },
	{ id: "abap", name: "Abap" },
	{ id: "abnf", name: "Abnf" },
	{ id: "actionscript", name: "Actionscript" },
	{ id: "ada", name: "Ada" },
	{ id: "agda", name: "Agda" },
	{ id: "al", name: "Al" },
	{ id: "antlr4", name: "Antlr4" },
	{ id: "apacheconf", name: "Apacheconf" },
	{ id: "apex", name: "Apex" },
	{ id: "apl", name: "Apl" },
	{ id: "applescript", name: "Applescript" },
	{ id: "aql", name: "Aql" },
	{ id: "arduino", name: "Arduino" },
	{ id: "arff", name: "Arff" },
	{ id: "armasm", name: "Armasm" },
	{ id: "arturo", name: "Arturo" },
	{ id: "asciidoc", name: "Asciidoc" },
	{ id: "asm6502", name: "Asm6502" },
	{ id: "asmatmel", name: "Asmatmel" },
	{ id: "aspnet", name: "Aspnet" },
	{ id: "autohotkey", name: "Autohotkey" },
	{ id: "autoit", name: "Autoit" },
	{ id: "avisynth", name: "Avisynth" },
	{ id: "avro-idl", name: "Avro-idl" },
	{ id: "awk", name: "Awk" },
	{ id: "bash", name: "Bash" },
	{ id: "basic", name: "Basic" },
	{ id: "batch", name: "Batch" },
	{ id: "bbcode", name: "Bbcode" },
	{ id: "bbj", name: "Bbj" },
	{ id: "bicep", name: "Bicep" },
	{ id: "birb", name: "Birb" },
	{ id: "bison", name: "Bison" },
	{ id: "bnf", name: "Bnf" },
	{ id: "bqn", name: "Bqn" },
	{ id: "brainfuck", name: "Brainfuck" },
	{ id: "brightscript", name: "Brightscript" },
	{ id: "bro", name: "Bro" },
	{ id: "bsl", name: "Bsl" },
	{ id: "c", name: "C" },
	{ id: "cfscript", name: "Cfscript" },
	{ id: "chaiscript", name: "Chaiscript" },
	{ id: "cil", name: "Cil" },
	{ id: "cilkc", name: "Cilkc" },
	{ id: "cilkcpp", name: "Cilkcpp" },
	{ id: "clojure", name: "Clojure" },
	{ id: "cmake", name: "Cmake" },
	{ id: "cobol", name: "Cobol" },
	{ id: "coffeescript", name: "Coffeescript" },
	{ id: "concurnas", name: "Concurnas" },
	{ id: "cooklang", name: "Cooklang" },
	{ id: "coq", name: "Coq" },
	{ id: "cpp", name: "Cpp" },
	{ id: "crystal", name: "Crystal" },
	{ id: "csharp", name: "Csharp" },
	{ id: "cshtml", name: "Cshtml" },
	{ id: "csp", name: "Csp" },
	{ id: "css-extras", name: "Css-extras" },
	{ id: "css", name: "Css" },
	{ id: "csv", name: "Csv" },
	{ id: "cue", name: "Cue" },
	{ id: "cypher", name: "Cypher" },
	{ id: "d", name: "D" },
	{ id: "dart", name: "Dart" },
	{ id: "dataweave", name: "Dataweave" },
	{ id: "dax", name: "Dax" },
	{ id: "dhall", name: "Dhall" },
	{ id: "diff", name: "Diff" },
	{ id: "django", name: "Django" },
	{ id: "dns-zone-file", name: "Dns-zone-file" },
	{ id: "docker", name: "Docker" },
	{ id: "dot", name: "Dot" },
	{ id: "ebnf", name: "Ebnf" },
	{ id: "editorconfig", name: "Editorconfig" },
	{ id: "eiffel", name: "Eiffel" },
	{ id: "ejs", name: "Ejs" },
	{ id: "elixir", name: "Elixir" },
	{ id: "elm", name: "Elm" },
	{ id: "erb", name: "Erb" },
	{ id: "erlang", name: "Erlang" },
	{ id: "etlua", name: "Etlua" },
	{ id: "excel-formula", name: "Excel-formula" },
	{ id: "factor", name: "Factor" },
	{ id: "false", name: "False" },
	{ id: "firestore-security-rules", name: "Firestore-security-rules" },
	{ id: "flow", name: "Flow" },
	{ id: "fortran", name: "Fortran" },
	{ id: "fsharp", name: "Fsharp" },
	{ id: "ftl", name: "Ftl" },
	{ id: "gap", name: "Gap" },
	{ id: "gcode", name: "Gcode" },
	{ id: "gdscript", name: "Gdscript" },
	{ id: "gedcom", name: "Gedcom" },
	{ id: "gettext", name: "Gettext" },
	{ id: "gherkin", name: "Gherkin" },
	{ id: "git", name: "Git" },
	{ id: "glsl", name: "Glsl" },
	{ id: "gml", name: "Gml" },
	{ id: "gn", name: "Gn" },
	{ id: "go-module", name: "Go-module" },
	{ id: "go", name: "Go" },
	{ id: "gradle", name: "Gradle" },
	{ id: "graphql", name: "Graphql" },
	{ id: "groovy", name: "Groovy" },
	{ id: "haml", name: "Haml" },
	{ id: "handlebars", name: "Handlebars" },
	{ id: "haskell", name: "Haskell" },
	{ id: "haxe", name: "Haxe" },
	{ id: "hcl", name: "Hcl" },
	{ id: "hlsl", name: "Hlsl" },
	{ id: "hoon", name: "Hoon" },
	{ id: "hpkp", name: "Hpkp" },
	{ id: "hsts", name: "Hsts" },
	{ id: "http", name: "Http" },
	{ id: "ichigojam", name: "Ichigojam" },
	{ id: "icon", name: "Icon" },
	{ id: "icu-message-format", name: "Icu-message-format" },
	{ id: "idris", name: "Idris" },
	{ id: "iecst", name: "Iecst" },
	{ id: "ignore", name: "Ignore" },
	{ id: "inform7", name: "Inform7" },
	{ id: "ini", name: "Ini" },
	{ id: "io", name: "Io" },
	{ id: "j", name: "J" },
	{ id: "java", name: "Java" },
	{ id: "javadoc", name: "Javadoc" },
	{ id: "javadoclike", name: "Javadoclike" },
	{ id: "javascript", name: "Javascript" },
	{ id: "javastacktrace", name: "Javastacktrace" },
	{ id: "jexl", name: "Jexl" },
	{ id: "jolie", name: "Jolie" },
	{ id: "jq", name: "Jq" },
	{ id: "js-extras", name: "Js-extras" },
	{ id: "js-templates", name: "Js-templates" },
	{ id: "jsdoc", name: "Jsdoc" },
	{ id: "json", name: "Json" },
	{ id: "json5", name: "Json5" },
	{ id: "jsonp", name: "Jsonp" },
	{ id: "jsstacktrace", name: "Jsstacktrace" },
	{ id: "jsx", name: "Jsx" },
	{ id: "julia", name: "Julia" },
	{ id: "keepalived", name: "Keepalived" },
	{ id: "keyman", name: "Keyman" },
	{ id: "kotlin", name: "Kotlin" },
	{ id: "kumir", name: "Kumir" },
	{ id: "kusto", name: "Kusto" },
	{ id: "latex", name: "Latex" },
	{ id: "latte", name: "Latte" },
	{ id: "less", name: "Less" },
	{ id: "lilypond", name: "Lilypond" },
	{ id: "linker-script", name: "Linker-script" },
	{ id: "liquid", name: "Liquid" },
	{ id: "lisp", name: "Lisp" },
	{ id: "livescript", name: "Livescript" },
	{ id: "llvm", name: "Llvm" },
	{ id: "log", name: "Log" },
	{ id: "lolcode", name: "Lolcode" },
	{ id: "lua", name: "Lua" },
	{ id: "magma", name: "Magma" },
	{ id: "makefile", name: "Makefile" },
	{ id: "markdown", name: "Markdown" },
	{ id: "markup", name: "Markup" },
	{ id: "mata", name: "Mata" },
	{ id: "matlab", name: "Matlab" },
	{ id: "maxscript", name: "Maxscript" },
	{ id: "mel", name: "Mel" },
	{ id: "mermaid", name: "Mermaid" },
	{ id: "metafont", name: "Metafont" },
	{ id: "mizar", name: "Mizar" },
	{ id: "mongodb", name: "Mongodb" },
	{ id: "monkey", name: "Monkey" },
	{ id: "moonscript", name: "Moonscript" },
	{ id: "n1ql", name: "N1ql" },
	{ id: "n4js", name: "N4js" },
	{ id: "nand2tetris-hdl", name: "Nand2tetris-hdl" },
	{ id: "naniscript", name: "Naniscript" },
	{ id: "nasm", name: "Nasm" },
	{ id: "neon", name: "Neon" },
	{ id: "nevod", name: "Nevod" },
	{ id: "nginx", name: "Nginx" },
	{ id: "nim", name: "Nim" },
	{ id: "nix", name: "Nix" },
	{ id: "nsis", name: "Nsis" },
	{ id: "objectivec", name: "Objectivec" },
	{ id: "ocaml", name: "Ocaml" },
	{ id: "odin", name: "Odin" },
	{ id: "opencl", name: "Opencl" },
	{ id: "openqasm", name: "Openqasm" },
	{ id: "oz", name: "Oz" },
	{ id: "parigp", name: "Parigp" },
	{ id: "parser", name: "Parser" },
	{ id: "pascal", name: "Pascal" },
	{ id: "pascaligo", name: "Pascaligo" },
	{ id: "pcaxis", name: "Pcaxis" },
	{ id: "peoplecode", name: "Peoplecode" },
	{ id: "perl", name: "Perl" },
	{ id: "php-extras", name: "Php-extras" },
	{ id: "php", name: "Php" },
	{ id: "phpdoc", name: "Phpdoc" },
	{ id: "plant-uml", name: "Plant-uml" },
	{ id: "plsql", name: "Plsql" },
	{ id: "powerquery", name: "Powerquery" },
	{ id: "powershell", name: "Powershell" },
	{ id: "processing", name: "Processing" },
	{ id: "prolog", name: "Prolog" },
	{ id: "promql", name: "Promql" },
	{ id: "properties", name: "Properties" },
	{ id: "protobuf", name: "Protobuf" },
	{ id: "psl", name: "Psl" },
	{ id: "pug", name: "Pug" },
	{ id: "puppet", name: "Puppet" },
	{ id: "pure", name: "Pure" },
	{ id: "purebasic", name: "Purebasic" },
	{ id: "purescript", name: "Purescript" },
	{ id: "python", name: "Python" },
	{ id: "q", name: "Q" },
	{ id: "qml", name: "Qml" },
	{ id: "qore", name: "Qore" },
	{ id: "qsharp", name: "Qsharp" },
	{ id: "r", name: "R" },
	{ id: "racket", name: "Racket" },
	{ id: "reason", name: "Reason" },
	{ id: "regex", name: "Regex" },
	{ id: "rego", name: "Rego" },
	{ id: "renpy", name: "Renpy" },
	{ id: "rescript", name: "Rescript" },
	{ id: "rest", name: "Rest" },
	{ id: "rip", name: "Rip" },
	{ id: "roboconf", name: "Roboconf" },
	{ id: "robotframework", name: "Robotframework" },
	{ id: "ruby", name: "Ruby" },
	{ id: "rust", name: "Rust" },
	{ id: "sas", name: "Sas" },
	{ id: "sass", name: "Sass" },
	{ id: "scala", name: "Scala" },
	{ id: "scheme", name: "Scheme" },
	{ id: "scss", name: "Scss" },
	{ id: "shell-session", name: "Shell-session" },
	{ id: "smali", name: "Smali" },
	{ id: "smalltalk", name: "Smalltalk" },
	{ id: "smarty", name: "Smarty" },
	{ id: "sml", name: "Sml" },
	{ id: "solidity", name: "Solidity" },
	{ id: "solution-file", name: "Solution-file" },
	{ id: "soy", name: "Soy" },
	{ id: "sparql", name: "Sparql" },
	{ id: "splunk-spl", name: "Splunk-spl" },
	{ id: "sqf", name: "Sqf" },
	{ id: "sql", name: "Sql" },
	{ id: "squirrel", name: "Squirrel" },
	{ id: "stan", name: "Stan" },
	{ id: "stata", name: "Stata" },
	{ id: "stylus", name: "Stylus" },
	{ id: "supercollider", name: "Supercollider" },
	{ id: "swift", name: "Swift" },
	{ id: "systemd", name: "Systemd" },
	{ id: "t4-cs", name: "T4-cs" },
	{ id: "t4-templating", name: "T4-templating" },
	{ id: "t4-vb", name: "T4-vb" },
	{ id: "tap", name: "Tap" },
	{ id: "tcl", name: "Tcl" },
	{ id: "textile", name: "Textile" },
	{ id: "toml", name: "Toml" },
	{ id: "tremor", name: "Tremor" },
	{ id: "tsx", name: "Tsx" },
	{ id: "tt2", name: "Tt2" },
	{ id: "turtle", name: "Turtle" },
	{ id: "twig", name: "Twig" },
	{ id: "typescript", name: "Typescript" },
	{ id: "typoscript", name: "Typoscript" },
	{ id: "unrealscript", name: "Unrealscript" },
	{ id: "uorazor", name: "Uorazor" },
	{ id: "uri", name: "Uri" },
	{ id: "v", name: "V" },
	{ id: "vala", name: "Vala" },
	{ id: "vbnet", name: "Vbnet" },
	{ id: "velocity", name: "Velocity" },
	{ id: "verilog", name: "Verilog" },
	{ id: "vhdl", name: "Vhdl" },
	{ id: "vim", name: "Vim" },
	{ id: "visual-basic", name: "Visual-basic" },
	{ id: "warpscript", name: "Warpscript" },
	{ id: "wasm", name: "Wasm" },
	{ id: "web-idl", name: "Web-idl" },
	{ id: "wgsl", name: "Wgsl" },
	{ id: "wiki", name: "Wiki" },
	{ id: "wolfram", name: "Wolfram" },
	{ id: "wren", name: "Wren" },
	{ id: "xeora", name: "Xeora" },
	{ id: "xml-doc", name: "Xml-doc" },
	{ id: "xojo", name: "Xojo" },
	{ id: "xquery", name: "Xquery" },
	{ id: "yaml", name: "Yaml" },
	{ id: "yang", name: "Yang" },
	{ id: "zig", name: "Zig" },
];

const THEMES = {
	light: {
		name: "Light",
		bg: "#ffffff",
		fg: "#000000",
		colors: {
			keyword: "#0077aa",
			comment: "#708090",
			punctuation: "#999",
			operator: "#9a6e3a",
			string: "#669900",
			number: "#990055",
			function: "#DD4A68",
			class: "#DD4A68",
			variable: "#e90",
			tag: "#0077aa",
			attr: "#669900",
			constant: "#990055",
			boolean: "#990055",
			builtin: "#0077aa",
			char: "#669900",
			selector: "#669900",
			regex: "#e90",
			important: "#e90",
			atrule: "#0077aa",
			entity: "#9a6e3a",
			url: "#9a6e3a",
		},
	},
	dark: {
		name: "Dark",
		bg: "#2d2d2d",
		fg: "#ccc",
		colors: {
			keyword: "#cc99cd",
			comment: "#999",
			punctuation: "#ccc",
			operator: "#67cdcc",
			string: "#7ec699",
			number: "#f08d49",
			function: "#f08d49",
			class: "#f08d49",
			variable: "#e2777a",
			tag: "#e2777a",
			attr: "#f8c555",
			constant: "#f08d49",
			boolean: "#f08d49",
			builtin: "#cc99cd",
			char: "#7ec699",
			selector: "#7ec699",
			regex: "#e2777a",
			important: "#e2777a",
			atrule: "#cc99cd",
			entity: "#67cdcc",
			url: "#67cdcc",
		},
	},
} as const;

const FONT_STACK =
	'SF Mono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const PADDING = 20;

const code = ref(
	`function greet(name: string) {

  return \`Hello, \${name}!\`;

}



greet("Taniguchi");`,
);
const language = ref("typescript");
const theme = ref<keyof typeof THEMES>("light");
const fontSize = ref(14);
const isRendering = ref(false);
const isDownloading = ref(false);
const error = ref("");
const previewImage = ref("");
let renderTimeout: number | undefined;

const wrapperStyle = computed(() => ({
	fontSize: `${fontSize.value}px`,
}));

type SimpleToken = {
	content: string;
	color: string;
};

const flattenTokens = (
	tokens: (string | Prism.Token)[],
	colors: Record<string, string>,
	defaultColor: string,
): SimpleToken[] => {
	const result: SimpleToken[] = [];

	const process = (
		token: string | Prism.Token | (string | Prism.Token)[],
		inheritedColor: string,
	) => {
		if (typeof token === "string") {
			result.push({ content: token, color: inheritedColor });
		} else if (Array.isArray(token)) {
			for (const child of token) {
				process(child, inheritedColor);
			}
		} else {
			const color = colors[token.type] || inheritedColor;
			process(token.content, color);
		}
	};

	for (const token of tokens) {
		process(token, defaultColor);
	}

	return result;
};

const renderToCanvas = (tokens: SimpleToken[], bg: string): string => {
	const currentFontSize = fontSize.value;
	const lineHeight = currentFontSize * 1.5;
	const font = `${currentFontSize}px ${FONT_STACK}`;

	const lines = [];
	let currentLine: SimpleToken[] = [];
	for (const token of tokens) {
		const parts = token.content.split("\n");
		for (let i = 0; i < parts.length; i++) {
			if (parts[i]) {
				currentLine.push({ content: parts[i], color: token.color });
			}
			if (i < parts.length - 1) {
				lines.push(currentLine);
				currentLine = [];
			}
		}
	}
	lines.push(currentLine);

	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not get canvas context");

	ctx.font = font;

	// Measure width
	let maxWidth = 0;
	for (const line of lines) {
		let lineWidth = 0;
		for (const token of line) {
			lineWidth += ctx.measureText(token.content).width;
		}
		if (lineWidth > maxWidth) maxWidth = lineWidth;
	}

	const width = Math.ceil(maxWidth + PADDING * 2);
	const height = Math.ceil(lines.length * lineHeight + PADDING * 2);

	// High DPI support
	const pixelRatio = 2;
	canvas.width = width * pixelRatio;
	canvas.height = height * pixelRatio;
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;

	ctx.scale(pixelRatio, pixelRatio);

	// Draw background
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, width, height);

	// Draw text
	ctx.font = font;
	ctx.textBaseline = "top";

	let y = PADDING;
	for (const line of lines) {
		let x = PADDING;
		for (const token of line) {
			ctx.fillStyle = token.color;
			ctx.fillText(token.content, x, y);
			x += ctx.measureText(token.content).width;
		}
		y += lineHeight;
	}

	return canvas.toDataURL("image/png");
};

const ensureLanguageLoaded = async (lang: string) => {
	if (loadedLanguages.has(lang)) return;

	try {
		// Vite will resolve this and create chunks for each matching file
		await import(`prismjs/components/prism-${lang}.js`);
		loadedLanguages.add(lang);
	} catch (err) {
		console.error(`Failed to load Prism language: ${lang}`, err);
	}
};

const renderHighlight = async () => {
	error.value = "";
	isRendering.value = true;
	try {
		await ensureLanguageLoaded(language.value);

		const grammar = Prism.languages[language.value] || Prism.languages.markup;
		const tokens = Prism.tokenize(code.value, grammar);
		const currentTheme = THEMES[theme.value];
		const flatTokens = flattenTokens(
			tokens,
			currentTheme.colors,
			currentTheme.fg,
		);

		previewImage.value = renderToCanvas(flatTokens, currentTheme.bg);
	} catch (renderError) {
		error.value =
			renderError instanceof Error
				? renderError.message
				: "Failed to render code.";
		previewImage.value = "";
		console.error(renderError);
	} finally {
		isRendering.value = false;
	}
};

const scheduleRender = () => {
	if (renderTimeout) {
		window.clearTimeout(renderTimeout);
	}

	renderTimeout = window.setTimeout(renderHighlight, 200);
};

watch([code, language, theme, fontSize], scheduleRender, { immediate: true });

onMounted(() => {
	renderHighlight();
});

const downloadPng = () => {
	if (!previewImage.value) return;

	isDownloading.value = true;
	try {
		const link = document.createElement("a");
		link.href = previewImage.value;
		link.download = `highlight-${language.value}.png`;
		link.click();
	} catch (downloadError) {
		error.value = "Unable to download the image.";
	} finally {
		isDownloading.value = false;
	}
};
</script>

<style scoped>
.code-wrapper {
  min-height: 320px;
  padding: 1rem;
}

.preview-surface {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.img-fluid {
  max-width: 100%;
  height: auto;
}
</style>