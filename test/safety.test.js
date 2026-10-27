/**
 * The red lines, asserted rather than assumed.
 *
 * Ticket 05 asks for a sign-off that confirms the skin does not make the
 * account less safe. The live half needs a human on a real account, but every
 * claim that can be decided from the shipped code is pinned here, so a later
 * change cannot quietly widen the boundary:
 *   - no network, storage, cookie, UA, or guest-script access;
 *   - no DOM writes from the injector;
 *   - no CSS property that can hide, move, or disable site UI;
 *   - no selector aimed at login, verification, or site feedback;
 *   - no remote asset.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildSkin } from "../src/skin.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(...parts) {
	return readFileSync(join(packageRoot, ...parts), "utf8");
}

/**
 * Strip comments so prose about what the code does not do (cookie, network,
 * localStorage) cannot satisfy or trip the scans below.
 * @param {string} source
 * @returns {string}
 */
function codeOnly(source) {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const SOURCES = ["src/sheet.js", "src/brand.js", "src/skin.js", "src/shell.js", "src/inject.js", "index.js", "client.js"];

test("the shipped code never reaches the network, storage, cookies, the UA, or guest script", () => {
	const forbidden = [
		[/\bfetch\s*\(/, "fetch"],
		[/\bXMLHttpRequest\b/, "XMLHttpRequest"],
		[/\bWebSocket\b/, "WebSocket"],
		[/\bEventSource\b/, "EventSource"],
		[/sendBeacon/, "sendBeacon"],
		[/document\s*\.\s*cookie/, "document.cookie"],
		[/\blocalStorage\b/, "localStorage"],
		[/\bsessionStorage\b/, "sessionStorage"],
		[/\bindexedDB\b/, "indexedDB"],
		[/navigator\s*\.\s*userAgent/, "navigator.userAgent"],
		[/userAgentData/, "userAgentData"],
		[/executeJavaScript/, "executeJavaScript"],
		[/insertText|sendInputEvent/, "guest input injection"],
		[/\bwindow\s*\.\s*open\b/, "window.open"],
		[/location\s*\.\s*(href|assign|replace)/, "location navigation"],
		[/\beval\s*\(/, "eval"],
		[/\bnew\s+Function\s*\(/, "Function constructor"],
	];
	for (const file of SOURCES) {
		const code = codeOnly(read(file));
		for (const [pattern, name] of forbidden) {
			assert.ok(!pattern.test(code), `${file} must not use ${name}`);
		}
	}
});

test("the injector only reads the page and calls the webview's own CSS channel", () => {
	const code = codeOnly(read("src/inject.js"));
	const allowed = {
		element: new Set([
			"addEventListener",
			"getAttribute",
			"getURL",
			"insertCSS",
			"removeEventListener",
			"removeInsertedCSS",
		]),
		document: new Set(["documentElement", "querySelectorAll"]),
		window: new Set(["clearTimeout", "setTimeout"]),
	};
	const seen = new Map();
	for (const match of code.matchAll(/\b(element|document|window)\.([A-Za-z]+)/g)) {
		const [, target, member] = match;
		if (!seen.has(target)) seen.set(target, new Set());
		seen.get(target).add(member);
	}
	for (const [target, members] of seen) {
		for (const member of members) {
			assert.ok(allowed[target].has(member), `inject.js must not call ${target}.${member}`);
		}
	}
	assert.ok((seen.get("element")?.size ?? 0) > 0, "the scan must actually find the webview calls");
});

test("the injector performs no DOM writes", () => {
	const code = codeOnly(read("src/inject.js"));
	const writes = [
		/innerHTML|outerHTML/,
		/appendChild|removeChild|replaceChild|insertBefore/,
		/setAttribute|removeAttribute/,
		/\bclassList\b/,
		/createElement|createTextNode|createDocumentFragment/,
		/insertAdjacentHTML|insertAdjacentElement/,
		/document\s*\.\s*(body|head|write)\b/,
		/\.style\b/,
	];
	for (const pattern of writes) {
		assert.ok(!pattern.test(code), `inject.js must not contain ${pattern}`);
	}
});

test("the host rename rewrites only the label text and its aria-label", () => {
	const code = codeOnly(read("src/shell.js"));

	// The two writes this module is allowed: a text node's data, and the one
	// attribute that mirrors it for screen readers.
	assert.ok(code.includes("node.data = SIDEBAR_LABEL_REPLACEMENT"), "the rename must write the text node");
	assert.ok(
		code.includes("element.setAttribute(LABEL_ATTRIBUTE, SIDEBAR_LABEL_REPLACEMENT)"),
		"the rename must keep aria-label in step",
	);
	for (const pattern of [
		/innerHTML|outerHTML/,
		/appendChild|removeChild|replaceChild|insertBefore/,
		/createElement|createTextNode|createDocumentFragment/,
		/insertAdjacentHTML|insertAdjacentElement/,
		/\.style\b/,
		/\bclassList\b/,
		/document\s*\.\s*(head|write)\b/,
		/\bwebview\b/,
		/insertCSS|executeJavaScript/,
	]) {
		assert.ok(!pattern.test(code), `shell.js must not contain ${pattern}`);
	}

	// Exact match only: the constants are the whole contract.
	assert.match(read("src/shell.js"), /const SIDEBAR_LABEL = "Chat DeepSeek";/);
	assert.match(read("src/shell.js"), /const SIDEBAR_LABEL_REPLACEMENT = "Chat";/);
	assert.equal((code.match(/Chat DeepSeek/g) ?? []).length, 1, "the old label appears exactly once, as the constant");
});

test("the sheet uses only properties that cannot hide, move, or disable site UI", () => {
	const sheet = buildSkin({ mode: "claude" });
	const allowed = new Set([
		"background",
		"background-image",
		"background-position",
		"background-repeat",
		"background-size",
		"color",
		"visibility",
	]);
	for (const line of sheet.split("\n")) {
		const match = /^\t([^:]+): /.exec(line);
		if (!match) continue;
		const property = match[1];
		if (property.startsWith("--")) continue;
		assert.ok(allowed.has(property), `unexpected CSS property: ${property}`);
	}
	const hostile = [
		"expression",
		"behavior",
		"@import",
		"@font-face",
		"javascript:",
		"<script",
		"</style",
	];
	for (const token of hostile) {
		assert.ok(!sheet.includes(token), `the sheet must not contain ${token}`);
	}
});

test("visibility is only used to hide the original graphics of the three brand SVGs", () => {
	const sheet = buildSkin({ mode: "claude" });
	const hidden = [...sheet.matchAll(/([^{}]+)\{\s*\n?\t*visibility: hidden !important;\s*\n?\}/g)].map((match) =>
		match[1].trim(),
	);
	assert.equal(hidden.length, 3, "three brand surfaces, one hidden-children rule each");
	for (const selector of hidden) {
		assert.match(selector, /^svg\[viewBox="[^"]+"\] > \*$/);
	}
});

test("no selector is aimed at login, verification, or site feedback", () => {
	const sheet = buildSkin({ mode: "claude" });
	const selectors = sheet
		.split("\n")
		.filter((line) => line.includes("{") && !line.trimStart().startsWith("/*"))
		.join("\n");
	for (const token of [
		"login",
		"captcha",
		"challenge",
		"verify",
		"verification",
		"[role=",
		"[aria-",
		"dialog",
		"modal",
		"toast",
		"alert",
		"error",
		"warning",
		"form",
		"iframe",
		"webview",
		":has(",
	]) {
		assert.ok(!selectors.includes(token), `no selector may target ${token}`);
	}
});

test("the sheet references no remote asset and no non-SVG data URI", () => {
	for (const mode of ["marker", "claude"]) {
		const sheet = buildSkin({ mode });
		assert.ok(!/url\(\s*["']?(https?:)?\/\//i.test(sheet), "no remote URL");
		assert.ok(!/url\(\s*["']?data:(?!image\/svg\+xml)/i.test(sheet), "only inline SVG data URIs");
	}
});
