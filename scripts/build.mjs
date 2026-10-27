/**
 * Bundle the browser half into one file.
 *
 * The loader hands a factory a `require` and expects a CommonJS-shaped module
 * back; it does not run a general ES module graph. So the sources are plain ES
 * modules for authoring and testing, and this script flattens them into a
 * single factory body.
 *
 * The flattening is intentionally dumb — strip imports, strip the `export`
 * keyword, concatenate in dependency order — because the inputs are a handful
 * of files written for exactly this. A general bundler would be a dependency
 * and a build cache for no gain.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, "..");

/** Dependency order: sheet and brand have no imports, skin imports both, inject imports skin and shell. */
const MODULES = ["src/sheet.js", "src/brand.js", "src/skin.js", "src/shell.js", "src/inject.js"];

const IMPORT_LINE = /^import\s[^;]*;\s*$/gm;
const EXPORT_KEYWORD = /^export\s+(?=(?:async\s+)?(?:function|const|let|class))/gm;

/**
 * Read one source file and turn it into factory-body statements.
 * @param {string} relativePath
 * @returns {Promise<string>}
 */
async function flatten(relativePath) {
	const source = await readFile(join(packageRoot, relativePath), "utf8");
	const body = source
		.replace(IMPORT_LINE, "")
		.replace(EXPORT_KEYWORD, "")
		.trimEnd();
	if (body === "") {
		throw new Error(`${relativePath} flattened to nothing`);
	}
	return `// ---- ${relativePath} ----\n${body}`;
}

/**
 * Collect the top-level names one file declares, to catch accidental clashes
 * before they become a confusing runtime error.
 * @param {string} source
 * @returns {string[]}
 */
function declaredNames(source) {
	const names = [];
	const declaration = /^(?:export\s+)?(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
	for (const match of source.matchAll(declaration)) names.push(match[1]);
	return names;
}

async function main() {
	const sources = await Promise.all(MODULES.map((path) => readFile(join(packageRoot, path), "utf8")));

	const seen = new Map();
	for (let index = 0; index < MODULES.length; index += 1) {
		for (const name of declaredNames(sources[index])) {
			if (seen.has(name)) {
				throw new Error(`${name} is declared in both ${seen.get(name)} and ${MODULES[index]}`);
			}
			seen.set(name, MODULES[index]);
		}
	}

	const bodies = [];
	for (const path of MODULES) bodies.push(await flatten(path));

	const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));

	const bundle = `/**
 * ${manifest.name} — browser half (GENERATED).
 *
 * Built from src/ by scripts/build.mjs. Edit the sources, not this file.
 *
 * This file paints the DeepSeek page the host embeds in a webview. It sends
 * exactly one thing across that boundary: a CSS text, through the webview's own
 * insertCSS. No DOM edits in the guest, no user-agent or cookie or storage
 * access, no network requests.
 *
 * On the host side it also renames the webchat sidebar row (text and its
 * aria-label), so the rebrand does not stop at the panel edge.
 */
window.__ModuleLoader__.load({
	id: ${JSON.stringify(manifest.name)},
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

${bodies.map((body) => body.split("\n").map((line) => (line === "" ? "" : "\t\t" + line)).join("\n")).join("\n\n")}

		exports.apply = apply;
		exports.inject = [];
		return module.exports;
	},
});
`;

	await writeFile(join(packageRoot, "client.js"), bundle, "utf8");
	console.log(`built client.js — ${bundle.length} bytes from ${MODULES.length} modules`);
}

await main();
