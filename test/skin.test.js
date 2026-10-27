/**
 * What the skin promises, asserted on the text it emits. These are the
 * guarantees the delivery half relies on, so they are checked here rather than
 * discovered in a live panel.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { DARK_SCOPE, LIGHT_SCOPE, MARKER, buildSkin } from "../src/skin.js";

const MODES = ["marker", "claude"];

/**
 * Parse the emitted sheet into { selector, decls } entries.
 * Comments are stripped first so a section title cannot bleed into a selector.
 * @param {string} sheet
 * @returns {Array<{ selector: string, decls: Array<[string, string]> }>}
 */
function rulesOf(sheet) {
	const text = sheet.replace(/\/\*[\s\S]*?\*\//g, "");
	const rules = [];
	for (const match of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		const selector = match[1].trim().replace(/\s+/g, " ");
		const decls = match[2]
			.split(";")
			.map((declaration) => declaration.trim())
			.filter(Boolean)
			.map((declaration) => {
				const colon = declaration.indexOf(":");
				return [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()];
			});
		rules.push({ selector, decls });
	}
	return rules;
}

/**
 * The custom properties one palette sets, with !important stripped.
 * @param {string} sheet
 * @param {string} scope
 * @returns {Map<string, string>}
 */
function tokensOf(sheet, scope) {
	const map = new Map();
	for (const { selector, decls } of rulesOf(sheet)) {
		if (selector !== scope) continue;
		for (const [property, value] of decls) {
			map.set(property, value.replace(/\s*!important$/, ""));
		}
	}
	return map;
}

/** Relative luminance of a #rrggbb or #rgb colour. */
function luminance(hex) {
	const digits = hex.replace("#", "");
	const parts = digits.length === 3 ? [...digits].map((digit) => digit + digit) : digits.match(/../g);
	const [r, g, b] = parts.map((pair) => {
		const channel = parseInt(pair, 16) / 255;
		return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two opaque colours. */
function contrast(a, b) {
	const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (high + 0.05) / (low + 0.05);
}

test("every rule is scoped to one of the site's two theme signals, or is the brand artwork", () => {
	for (const mode of MODES) {
		const rules = rulesOf(buildSkin({ mode }));
		assert.ok(rules.length > 0, `${mode} sheet should contain rules`);
		for (const { selector } of rules) {
			const scoped = selector.startsWith(DARK_SCOPE) || selector.startsWith(LIGHT_SCOPE);
			const brand = /^svg\[viewBox="[^"]+"\](:? > \*)?$/.test(selector);
			assert.ok(scoped || brand, `${mode} selector is neither scoped nor brand artwork: ${selector}`);
		}
	}
});

test("the light scope is the exact complement of the dark one", () => {
	assert.equal(DARK_SCOPE, "body[data-ds-dark-theme]");
	assert.equal(LIGHT_SCOPE, "body:not([data-ds-dark-theme])");
	const sheet = buildSkin({ mode: "claude" });
	assert.ok(sheet.includes(LIGHT_SCOPE + " {"), "the light palette must be present");
	assert.ok(sheet.includes(DARK_SCOPE + " {"), "the dark palette must still be present");
});

test("the skin never scopes to prefers-color-scheme — the site's own attribute decides", () => {
	for (const mode of MODES) {
		assert.ok(
			!buildSkin({ mode }).includes("prefers-color-scheme"),
			`${mode} mode must not reference prefers-color-scheme`,
		);
	}
});

test("marker mode paints the marker colour and nothing else", () => {
	const sheet = buildSkin({ mode: "marker" });
	assert.ok(sheet.includes(MARKER), "marker mode should paint the marker colour");
	assert.ok(!sheet.includes("#d97757"), "marker mode must not contain the real palette");
	assert.ok(!sheet.includes("viewBox"), "marker mode must not touch the brand");
	assert.ok(!sheet.includes("data:image/svg+xml"), "marker mode must not carry the artwork");
});

test("marker mode is the default", () => {
	assert.equal(buildSkin(), buildSkin({ mode: "marker" }));
});

test("claude mode escalates every declaration with !important so it beats the site variable block", () => {
	const sheet = buildSkin({ mode: "claude" });
	for (const { decls } of rulesOf(sheet)) {
		for (const [, value] of decls) {
			assert.ok(value.endsWith("!important"), `every declaration must be !important, found: ${value}`);
		}
	}
});

test("both palettes repaint the brand from blue to Claude terracotta", () => {
	const sheet = buildSkin({ mode: "claude" });
	for (const scope of [DARK_SCOPE, LIGHT_SCOPE]) {
		const tokens = tokensOf(sheet, scope);
		assert.equal(tokens.get("--dsw-alias-brand-primary"), "#d97757", `${scope} brand-primary should be terracotta`);
	}
	// the deepseek blue ramp is remapped in both themes, so the raw blues must not survive
	assert.ok(!sheet.includes("#5686fe"), "deepseek-450 blue must be gone");
	assert.ok(!sheet.includes("#3964fe"), "deepseek-500 blue must be gone");
	assert.ok(!sheet.includes("#679efe"), "deepseek-400 blue must be gone");
});

test("the dark palette is unchanged: Claude's near-black canvas and warm text ramp", () => {
	const tokens = tokensOf(buildSkin({ mode: "claude" }), DARK_SCOPE);
	assert.equal(tokens.get("--dsw-alias-bg-base"), "#191919", "bg-base should be Claude near-black");
	assert.equal(tokens.get("--dsw-alias-bg-layer-1"), "#212121", "layer-1 should be #212121");
	assert.equal(tokens.get("--dsw-alias-label-primary"), "#fdfdfd");
	assert.equal(tokens.get("--dsw-alias-brand-text"), "#e89f80");
	assert.equal(tokens.get("--dsw-static-neutral-bluish-950"), "#191919", "neutral 950 stop should be remapped");
});

test("the light palette is Claude's paper: warm off-white layers and ink text", () => {
	const tokens = tokensOf(buildSkin({ mode: "claude" }), LIGHT_SCOPE);
	assert.equal(tokens.get("--dsw-alias-bg-base"), "#faf9f5", "bg-base should be Claude paper");
	assert.equal(tokens.get("--dsw-alias-bg-layer-1"), "#f5f2ec");
	assert.equal(tokens.get("--dsw-alias-bg-layer-2"), "#efece3");
	assert.equal(tokens.get("--dsw-alias-bg-layer-3"), "#e8e4da");
	assert.equal(tokens.get("--dsw-alias-label-primary"), "#141413", "primary text must be warm ink");
	assert.equal(tokens.get("--dsw-alias-border-l1"), "rgba(20,20,19,.08)", "borders must be warm-black alpha");
	assert.equal(tokens.get("--dsw-static-neutral-bluish-00"), "#faf9f5", "the lightest stop must be paper");
});

test("the two palettes set exactly the same token names, so neither theme can drift", () => {
	const sheet = buildSkin({ mode: "claude" });
	const dark = [...tokensOf(sheet, DARK_SCOPE).keys()].sort();
	const light = [...tokensOf(sheet, LIGHT_SCOPE).keys()].sort();
	assert.equal(dark.length, 98, "30 static stops + 67 aliases + 1 gradient");
	assert.deepEqual(light, dark);
});

test("the light palette's text and links clear WCAG AA on its own surfaces", () => {
	const tokens = tokensOf(buildSkin({ mode: "claude" }), LIGHT_SCOPE);
	const surfaces = ["--dsw-alias-bg-base", "--dsw-alias-bg-layer-1", "--dsw-specific-bubble"];
	const text = ["--dsw-alias-label-primary", "--dsw-alias-label-secondary", "--dsw-alias-label-tertiary"];
	for (const surface of surfaces) {
		const background = tokens.get(surface);
		assert.match(background, /^#[0-9a-f]{6}$/, `${surface} should be an opaque colour`);
		for (const token of text) {
			const ratio = contrast(tokens.get(token), background);
			assert.ok(ratio >= 4.5, `${token} on ${surface} is ${ratio.toFixed(2)}:1, below 4.5:1`);
		}
	}
	const brandText = contrast(tokens.get("--dsw-alias-brand-text"), tokens.get("--dsw-alias-bg-base"));
	assert.ok(brandText >= 4.5, `brand-text on bg-base is ${brandText.toFixed(2)}:1, below 4.5:1`);
	const ghostBorder = contrast(tokens.get("--dsw-alias-button-ghost-active-border"), tokens.get("--dsw-alias-bg-base"));
	assert.ok(ghostBorder >= 3, `the active ghost border is ${ghostBorder.toFixed(2)}:1, below 3:1 for a UI edge`);
});

test("both palettes leave semantic state colours alone (error/success/warning stay truthful)", () => {
	const sheet = buildSkin({ mode: "claude" });
	for (const prefix of ["--dsw-static-red-", "--dsw-static-green-", "--dsw-static-amber-", "--dsw-alias-state-error"]) {
		assert.ok(!sheet.includes(prefix), `${prefix} must not be redefined`);
	}
});

test("both palettes replace the hardcoded code-block surfaces, scoped and hash-free", () => {
	const sheet = buildSkin({ mode: "claude" });
	assert.ok(sheet.includes(".md-code-block.md-code-block-dark"), "dark code blocks use their author-written class");
	assert.ok(sheet.includes(".md-code-block.md-code-block-light"), "light code blocks use theirs");
	assert.ok(sheet.includes("background: #212121 !important"), "dark code-block surface should be Claude layer-1");
	assert.ok(sheet.includes("background: #f5f2ec !important"), "light code-block surface should be Claude paper layer-1");
	assert.ok(sheet.includes("color: #2b2a27 !important"), "light code text should be warm ink");
	for (const leftover of ["#111b27", "#3c526d", "#e5e5e6", "#383a42"]) {
		assert.ok(!sheet.includes(leftover), `the site's literal ${leftover} must not survive`);
	}
});

test("both palettes retarget the literal thinking gradient to their own canvas", () => {
	const sheet = buildSkin({ mode: "claude" });
	const dark = tokensOf(sheet, DARK_SCOPE);
	const light = tokensOf(sheet, LIGHT_SCOPE);
	assert.equal(
		dark.get("--dsw-linear-gradient-think"),
		"linear-gradient(180deg, #191919 20.19%, rgba(25,25,25,0) 100%)",
	);
	assert.equal(
		light.get("--dsw-linear-gradient-think"),
		"linear-gradient(180deg, #faf9f5 20.19%, rgba(250,249,245,0) 100%)",
	);
	assert.ok(!sheet.includes("#151517"), "the site's old canvas colour must not survive the retint");
});

test("the brand is swapped through its author-written viewBoxes in both themes", () => {
	const sheet = buildSkin({ mode: "claude" });
	for (const viewBox of ["0 0 143 23", "0 0 27 24", "0 0 35 26"]) {
		const selector = `svg[viewBox="${viewBox}"]`;
		assert.ok(sheet.includes(`${selector} {`), `the ${viewBox} brand surface must be anchored on its viewBox`);
		assert.ok(sheet.includes(`${selector} > * {`), `the ${viewBox} original graphics must be hidden, not removed`);
		assert.ok(
			!sheet.includes(`svg[viewBox="${viewBox}"]`.replace("svg", DARK_SCOPE + " svg")),
			"the brand must not be scoped to one theme",
		);
	}
	assert.ok(sheet.includes("visibility: hidden !important"), "the original markup needs !important to beat the site");
	assert.ok(sheet.includes("background-size: contain !important"), "the artwork must fit the original boxes");
});

test("the replacement artwork is same-document data URIs in the accent", () => {
	const sheet = buildSkin({ mode: "claude" });
	const uris = [...sheet.matchAll(/background-image: (url\("data:image\/svg\+xml,[^"]+"\)) !important;/g)].map(
		(match) => match[1],
	);
	assert.equal(uris.length, 3, "the lockup plus the two marks");

	const [lockup, ...marks] = uris.map((uri) =>
		decodeURIComponent(uri.slice('url("data:image/svg+xml,'.length, -2)),
	);
	assert.equal((lockup.match(/<path /g) ?? []).length, 2, "the lockup is the starburst mark plus the wordmark");
	assert.ok(lockup.includes('viewBox="0 -0.245 5.9773 1.49"'), "the lockup box must fit the whole drawing, starburst included");
	for (const mark of marks) {
		assert.equal((mark.match(/<path /g) ?? []).length, 1, "a mark is the starburst alone");
		assert.ok(mark.includes('viewBox="0 0 24 24"'), "the mark box must frame the starburst");
		assert.ok(!mark.includes("currentColor"), "a data URI cannot inherit currentColor, so the colour must be baked");
	}
	for (const artwork of [lockup, ...marks]) {
		assert.ok(artwork.includes('fill="#d97757"'), "the artwork must use the Claude accent");
	}
	assert.ok(!/url\(\s*["']?https?:/i.test(sheet), "no remote asset may be referenced");
});

test("the two marks are centred in their boxes; the wordmark stays left-aligned", () => {
	const sheet = buildSkin({ mode: "claude" });
	assert.ok(sheet.includes("background-position: left center !important"), "a wordmark sits against the leading edge");
	const centred = sheet.match(/background-position: center center !important/g) ?? [];
	assert.equal(centred.length, 2, "both mark-only logos should be centred");
});

test("the skin does not touch any other inline icon", () => {
	const sheet = buildSkin({ mode: "claude" });
	const viewBoxes = [...sheet.matchAll(/viewBox="([^"]*)"/g)].map((match) => match[1]);
	assert.ok(viewBoxes.length > 0, "the brand artwork must be selected");
	const targeted = new Set(["0 0 143 23", "0 0 27 24", "0 0 35 26"]);
	for (const viewBox of viewBoxes) {
		assert.ok(targeted.has(viewBox), `an unexpected viewBox is targeted: ${viewBox}`);
	}
	for (const viewBox of ["0 0 16 16", "0 0 34 29", "0 0 182 29"]) {
		assert.ok(!sheet.includes(`viewBox="${viewBox}"`), `the ${viewBox} surface must not be targeted`);
	}
});

test("neither palette touches the font token (font replacement is out of scope)", () => {
	assert.ok(!buildSkin({ mode: "claude" }).includes("--dsw-font-family"), "font token must not be redefined");
});

test("an unknown mode is a programming error, not a silent no-op", () => {
	assert.throws(() => buildSkin({ mode: "no-such-mode" }), /unknown skin mode/);
});
