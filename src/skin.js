/**
 * The skin definition: which rules, in which order, for which surface.
 *
 * Everything the package will ever paint is decided here, as data. The client
 * half never composes CSS itself — it asks this module for a string.
 *
 * MODES
 *   "marker" — the delivery vehicle only. Paints the whole guest in a colour
 *              nobody would ship, so "did the stylesheet land?" is answerable
 *              at a glance. Temporary by design; it is replaced, not refined.
 *   "claude" — the Claude palette, for both of the site's own themes. Each
 *              theme is a variable-layer override: the page keeps every one of
 *              its own rules and only resolves the colours differently.
 *
 * WHY VARIABLES, NOT SELECTORS
 *   The site is driven by ~688 custom properties; 115 of them live in the dark
 *   theme. Overriding the scales they reference repaints the whole surface in
 *   one move, and it stays correct when DeepSeek adds a new component that
 *   reads the same token. Writing per-component selectors would mean chasing
 *   build-time hashed class names on every release — the opposite of the
 *   "zero maintenance" goal.
 *
 *   The exceptions are surfaces the site does not drive from tokens: code
 *   blocks, whose surfaces are authored on `.md-code-block-*`, and the brand
 *   artwork, inline SVG with no class at all. Both are anchored on
 *   author-written markup (a class and a viewBox), not on build hashes, so the
 *   zero-maintenance property holds.
 *
 * WHY BOTH THEMES
 *   The site marks dark mode by setting `data-ds-dark-theme` on `<body>` and
 *   removing it for light mode; there is no light attribute and no
 *   `prefers-color-scheme` signal. So the two palettes are scoped to exactly
 *   those two states, and only one of them can ever match. A palette that
 *   covered one state and left the other alone was the earlier, deliberately
 *   narrower product; ticket 08 replaced it with a pair.
 */

import { CLAUDE_MARK_URI, CLAUDE_WORDMARK } from "./brand.js";
import { buildSheet, rule, section } from "./sheet.js";

/** The site's dark-mode signal. */
export const DARK_SCOPE = 'body[data-ds-dark-theme]';

/** Its absence — the site's light mode. */
export const LIGHT_SCOPE = 'body:not([data-ds-dark-theme])';

/** The marker mode's deliberately hideous colour. */
export const MARKER = "#ff00aa";

/**
 * DeepSeek's static scale 1 in the dark skin: the "neutral-bluish" grays.
 *
 * In the source these are cool, slightly-blue grays. Claude's dark UI is a
 * warm neutral, so each stop is remapped to the matching lightness in Claude's
 * neutral ramp (#191919 / #212121 / #282828 / #323232 and a warm off-white
 * text ramp). This single remap cascades into every alias that reads these
 * stops.
 *
 * @type {Record<string, string>}
 */
const NEUTRAL_DARK = {
	"--dsw-static-neutral-bluish-00": "#ffffff",
	"--dsw-static-neutral-bluish-50": "#fafafa",
	"--dsw-static-neutral-bluish-60": "#fafafa",
	"--dsw-static-neutral-bluish-75": "#f6f4f5",
	"--dsw-static-neutral-bluish-100": "#f2eff0",
	"--dsw-static-neutral-bluish-150": "#ede9ea",
	"--dsw-static-neutral-bluish-200": "#e8e3e5",
	"--dsw-static-neutral-bluish-300": "#d6d0d2",
	"--dsw-static-neutral-bluish-400": "#beb6b8",
	"--dsw-static-neutral-bluish-500": "#9c9395",
	"--dsw-static-neutral-bluish-600": "#8a8a8a",
	"--dsw-static-neutral-bluish-700": "#6b6b6b",
	"--dsw-static-neutral-bluish-750": "#3a3a3a",
	"--dsw-static-neutral-bluish-800": "#323232",
	"--dsw-static-neutral-bluish-850": "#282828",
	"--dsw-static-neutral-bluish-875": "#212121",
	"--dsw-static-neutral-bluish-900": "#1b1b1c",
	"--dsw-static-neutral-bluish-950": "#191919",
	"--dsw-static-neutral-bluish-1000": "#141414",
};

/**
 * The same scale for the light skin: Claude's paper ramp.
 *
 * Paper (#faf9f5) down to warm ink (#141413), keeping the source ramp's
 * lightness order so every alias that reads a stop keeps its job. The stops
 * are warm rather than the site's cool bluish grays; that is the whole point.
 *
 * @type {Record<string, string>}
 */
const NEUTRAL_LIGHT = {
	"--dsw-static-neutral-bluish-00": "#faf9f5",
	"--dsw-static-neutral-bluish-50": "#f5f2ec",
	"--dsw-static-neutral-bluish-60": "#f2efe8",
	"--dsw-static-neutral-bluish-75": "#f0eee6",
	"--dsw-static-neutral-bluish-100": "#ebe8df",
	"--dsw-static-neutral-bluish-150": "#e6e2d8",
	"--dsw-static-neutral-bluish-200": "#ded9cd",
	"--dsw-static-neutral-bluish-300": "#cfcabd",
	"--dsw-static-neutral-bluish-400": "#b3aca0",
	"--dsw-static-neutral-bluish-500": "#8f887c",
	"--dsw-static-neutral-bluish-600": "#6f685c",
	"--dsw-static-neutral-bluish-700": "#5e5d59",
	"--dsw-static-neutral-bluish-750": "#4a4842",
	"--dsw-static-neutral-bluish-800": "#3d3d3a",
	"--dsw-static-neutral-bluish-850": "#333230",
	"--dsw-static-neutral-bluish-875": "#2b2a27",
	"--dsw-static-neutral-bluish-900": "#262624",
	"--dsw-static-neutral-bluish-950": "#1d1c1a",
	"--dsw-static-neutral-bluish-1000": "#141413",
};

/**
 * DeepSeek's static scale 2 in the dark skin: the "deepseek" blue brand ramp.
 *
 * Remapped to Claude's terracotta accent (#d97757) and its lighter/darker
 * tints. The brand primary, button fills, brand text and business-state tints
 * all read this ramp, so a single remap turns the whole accent from blue to
 * terracotta.
 *
 * @type {Record<string, string>}
 */
const ACCENT_DARK = {
	"--dsw-static-deepseek-50": "#fbeee7",
	"--dsw-static-deepseek-100": "#f7e3d8",
	"--dsw-static-deepseek-200": "#f1d3c4",
	"--dsw-static-deepseek-300": "#ebbca6",
	"--dsw-static-deepseek-400": "#e89f80",
	"--dsw-static-deepseek-450": "#d97757",
	"--dsw-static-deepseek-500": "#c46343",
	"--dsw-static-deepseek-600": "#a8543a",
	"--dsw-static-deepseek-700-delete": "#7a3d2c",
	"--dsw-static-deepseek-800": "#4d2e22",
	"--dsw-static-deepseek-900": "#38271e",
};

/**
 * The accent ramp for the light skin.
 *
 * Same hue family. The one difference that matters is at 500: the light theme
 * points `brand-text` and `brand-primary` at the same stop, so that stop has
 * to read as text on paper (#a8543a clears 4.5:1 there), while 450 stays
 * Claude's #d97757 for fills and artwork.
 *
 * @type {Record<string, string>}
 */
const ACCENT_LIGHT = {
	"--dsw-static-deepseek-50": "#fbeee7",
	"--dsw-static-deepseek-100": "#f7e3d8",
	"--dsw-static-deepseek-200": "#f1d3c4",
	"--dsw-static-deepseek-300": "#ebbca6",
	"--dsw-static-deepseek-400": "#e89f80",
	"--dsw-static-deepseek-450": "#d97757",
	"--dsw-static-deepseek-500": "#a8543a",
	"--dsw-static-deepseek-600": "#9a4a28",
	"--dsw-static-deepseek-700-delete": "#7a3d2c",
	"--dsw-static-deepseek-800": "#4d2e22",
	"--dsw-static-deepseek-900": "#38271e",
};

/**
 * Semantic / structural tokens set explicitly to Claude's dark values.
 *
 * Most of these already resolve correctly through the two static scales above,
 * but a handful reference literal values (white-alpha borders, hover blanks)
 * or name a colour Claude tunes by hand. Setting them directly locks the exact
 * look and stays correct even if DeepSeek later points the alias at a literal.
 *
 * Deliberately left alone: the red / green / amber *state* scales
 * (--dsw-static-red-*, -green-*, -amber-*) — repainting error/success/warning
 * would make the page tell the user the wrong thing. And --dsw-font-family,
 * which is out of scope (the user rated font replacement "not important").
 *
 * @type {Record<string, string>}
 */
const ALIAS_DARK = {
	"--dsw-alias-bg-base": "#191919",
	"--dsw-alias-bg-layer-1": "#212121",
	"--dsw-alias-bg-layer-2": "#282828",
	"--dsw-alias-bg-layer-3": "#323232",
	"--dsw-alias-bg-overlay": "#282828",
	"--dsw-alias-bg-module-platform": "#323232",
	"--dsw-alias-bg-multi-select": "#3a3a3a",
	"--dsw-alias-bg-skeleton": "rgba(255,255,255,.08)",

	"--dsw-alias-label-primary": "#fdfdfd",
	"--dsw-alias-label-primary-foreground": "#fdfdfd",
	"--dsw-alias-label-primary-inverted": "#1b1b1c",
	"--dsw-alias-label-primary-dimmed": "#d6d0d2",
	"--dsw-alias-label-secondary": "#beb6b8",
	"--dsw-alias-label-tertiary": "#9c9395",
	"--dsw-alias-label-caption": "#776f71",
	"--dsw-alias-label-dimmed": "#3a3a3a",

	"--dsw-alias-brand-primary": "#d97757",
	"--dsw-alias-brand-primary-invert": "#fdfdfd",
	"--dsw-alias-brand-text": "#e89f80",

	"--dsw-alias-button-primary-fill": "#d97757",
	"--dsw-alias-button-primary-hover": "#eb9170",
	"--dsw-alias-button-primary-dimmed": "#3a3a3a",
	"--dsw-alias-button-contrast-fill": "#fdfdfd",
	"--dsw-alias-button-elevated-fill": "#3a3a3a",
	"--dsw-alias-button-floating-fill": "#2c2c2e",
	"--dsw-alias-button-floating-hover": "#323232",
	"--dsw-alias-button-ghost-active-border": "#c46343",
	"--dsw-alias-button-ghost-active-fill": "#4d2e22",
	"--dsw-alias-button-ghost-active-hover": "#5c3628",
	"--dsw-alias-button-info-fill": "#e89f80",
	"--dsw-alias-button-info-hover": "#c46343",

	"--dsw-alias-interactive-bg-hover": "rgba(255,255,255,.08)",
	"--dsw-alias-interactive-bg-active": "rgba(255,255,255,.14)",
	"--dsw-alias-interactive-bg-hover-accent": "rgba(255,255,255,.24)",
	"--dsw-alias-interactive-bg-hover-solid": "#323232",

	"--dsw-alias-border-l1": "rgba(255,255,255,.09)",
	"--dsw-alias-border-l2": "rgba(255,255,255,.18)",
	"--dsw-alias-border-l3": "rgba(255,255,255,.3)",
	"--dsw-alias-border-l4": "rgba(255,255,255,.4)",
	"--dsw-alias-border-inverted": "rgba(255,255,255,.09)",
	"--dsw-alias-border-inverted2": "rgba(255,255,255,.12)",
	"--dsw-alias-border-l2-darkmode-thin": "rgba(255,255,255,.09)",

	"--dsw-alias-markdown-code-block": "#212121",
	"--dsw-alias-markdown-code-block-banner": "#282828",
	"--dsw-alias-markdown-code-segment-selected": "#323232",
	"--dsw-alias-markdown-code-segment-unselected": "#212121",
	"--dsw-alias-markdown-inline-code": "#282828",
	"--dsw-alias-markdown-citation": "#323232",
	"--dsw-alias-markdown-placeholder": "#282828",
	"--dsw-alias-markdown-tag": "#282828",

	"--dsw-specific-bubble": "#282828",
	"--dsw-specific-bubble-highlight": "#3a3a3a",
	"--dsw-specific-input-major": "#282828",
	"--dsw-specific-login-input": "#1b1b1c",
	"--dsw-specific-sidebar-fill": "#1b1b1c",
	"--dsw-specific-sidebar-nav-item-active": "#3a3a3a",
	"--dsw-specific-sidebar-nav-item-hover": "#2c2c2e",
	"--dsw-specific-selector": "#3a3a3a",
	"--dsw-specific-menu": "#323232",

	"--dsw-alias-scrollbar-bg-l1": "#3a3a3a",
	"--dsw-alias-scrollbar-bg-l2": "#4a4a4a",
	"--dsw-alias-scrollbar-hover-l1": "#4a4a4a",
	"--dsw-alias-scrollbar-hover-l2": "#5a5a5a",

	"--dsw-alias-toast-bg": "#282828",
	"--dsw-alias-tooltip-bg": "#282828",

	"--dsw-alias-state-business-primary": "#d97757",
	"--dsw-alias-state-business-tertiary": "#4d2e22",

	/* The site's "thinking" fade is a literal gradient, not a scale reference. */
	"--dsw-linear-gradient-think": "linear-gradient(180deg, #191919 20.19%, rgba(25,25,25,0) 100%)",
};

/**
 * The same token names for the light skin, with Claude's paper values.
 *
 * Three things are not a straight inversion:
 *   - the label ramp keeps its roles: `label-primary` is ink, `-inverted` and
 *     `-foreground` are what sits on dark or coloured surfaces;
 *   - `brand-text` and `brand-primary-invert` use #a8543a, the accent stop that
 *     clears 4.5:1 as text on paper, while the fill stays Claude's #d97757;
 *   - the borders are warm-black alpha rather than the site's white alpha, and
 *     the two `border-inverted*` tokens stay transparent exactly as the site
 *     sets them for light.
 *
 * @type {Record<string, string>}
 */
const ALIAS_LIGHT = {
	"--dsw-alias-bg-base": "#faf9f5",
	"--dsw-alias-bg-layer-1": "#f5f2ec",
	"--dsw-alias-bg-layer-2": "#efece3",
	"--dsw-alias-bg-layer-3": "#e8e4da",
	"--dsw-alias-bg-overlay": "#efece3",
	"--dsw-alias-bg-module-platform": "#e8e4da",
	"--dsw-alias-bg-multi-select": "#ebe8df",
	"--dsw-alias-bg-skeleton": "rgba(20,20,19,.06)",

	"--dsw-alias-label-primary": "#141413",
	"--dsw-alias-label-primary-foreground": "#ffffff",
	"--dsw-alias-label-primary-inverted": "#faf9f5",
	"--dsw-alias-label-primary-dimmed": "#262624",
	"--dsw-alias-label-secondary": "#5e5d59",
	"--dsw-alias-label-tertiary": "#6f685c",
	"--dsw-alias-label-caption": "#8f887c",
	"--dsw-alias-label-dimmed": "#ded9cd",

	"--dsw-alias-brand-primary": "#d97757",
	"--dsw-alias-brand-primary-invert": "#a8543a",
	"--dsw-alias-brand-text": "#a8543a",

	"--dsw-alias-button-primary-fill": "#d97757",
	"--dsw-alias-button-primary-hover": "#c96442",
	"--dsw-alias-button-primary-dimmed": "#e6e2d8",
	"--dsw-alias-button-contrast-fill": "#1d1c1a",
	"--dsw-alias-button-elevated-fill": "#ffffff",
	"--dsw-alias-button-floating-fill": "#ffffff",
	"--dsw-alias-button-floating-hover": "#f0eee6",
	"--dsw-alias-button-ghost-active-border": "#c96442",
	"--dsw-alias-button-ghost-active-fill": "#fbeee7",
	"--dsw-alias-button-ghost-active-hover": "#f7e3d8",
	"--dsw-alias-button-info-fill": "#d97757",
	"--dsw-alias-button-info-hover": "#c96442",

	"--dsw-alias-interactive-bg-hover": "rgba(20,20,19,.06)",
	"--dsw-alias-interactive-bg-active": "rgba(20,20,19,.1)",
	"--dsw-alias-interactive-bg-hover-accent": "rgba(20,20,19,.14)",
	"--dsw-alias-interactive-bg-hover-solid": "#f0eee6",

	"--dsw-alias-border-l1": "rgba(20,20,19,.08)",
	"--dsw-alias-border-l2": "rgba(20,20,19,.14)",
	"--dsw-alias-border-l3": "rgba(20,20,19,.22)",
	"--dsw-alias-border-l4": "rgba(20,20,19,.3)",
	"--dsw-alias-border-inverted": "transparent",
	"--dsw-alias-border-inverted2": "transparent",
	"--dsw-alias-border-l2-darkmode-thin": "rgba(20,20,19,.14)",

	"--dsw-alias-markdown-code-block": "#f5f2ec",
	"--dsw-alias-markdown-code-block-banner": "#efece3",
	"--dsw-alias-markdown-code-segment-selected": "#faf9f5",
	"--dsw-alias-markdown-code-segment-unselected": "#f5f2ec",
	"--dsw-alias-markdown-inline-code": "#ebe8df",
	"--dsw-alias-markdown-citation": "#ebe8df",
	"--dsw-alias-markdown-placeholder": "#efece3",
	"--dsw-alias-markdown-tag": "#efece3",

	"--dsw-specific-bubble": "#f0eee6",
	"--dsw-specific-bubble-highlight": "#e6e2d8",
	"--dsw-specific-input-major": "#ffffff",
	"--dsw-specific-login-input": "#f5f2ec",
	"--dsw-specific-sidebar-fill": "#f0eee6",
	"--dsw-specific-sidebar-nav-item-active": "#e8e4da",
	"--dsw-specific-sidebar-nav-item-hover": "#ebe8df",
	"--dsw-specific-selector": "#ebe8df",
	"--dsw-specific-menu": "#ffffff",

	"--dsw-alias-scrollbar-bg-l1": "#e6e2d8",
	"--dsw-alias-scrollbar-bg-l2": "#dcd7ca",
	"--dsw-alias-scrollbar-hover-l1": "#dcd7ca",
	"--dsw-alias-scrollbar-hover-l2": "#cfcabd",

	"--dsw-alias-toast-bg": "#30302e",
	"--dsw-alias-tooltip-bg": "#262624",

	"--dsw-alias-state-business-primary": "#d97757",
	"--dsw-alias-state-business-tertiary": "#f7e3d8",

	/* The site fades to white here; on paper the fade has to match the paper. */
	"--dsw-linear-gradient-think": "linear-gradient(180deg, #faf9f5 20.19%, rgba(250,249,245,0) 100%)",
};

/**
 * One palette per site theme. The scopes are mutually exclusive by
 * construction (`[data-ds-dark-theme]` vs `:not([data-ds-dark-theme])`), so a
 * theme switch is a pure cascade change with no observer and no re-injection.
 *
 * @type {Array<{ name: string, scope: string, static: Record<string, string>, alias: Record<string, string> }>}
 */
const THEMES = [
	{ name: "dark", scope: DARK_SCOPE, static: { ...NEUTRAL_DARK, ...ACCENT_DARK }, alias: ALIAS_DARK },
	{ name: "light", scope: LIGHT_SCOPE, static: { ...NEUTRAL_LIGHT, ...ACCENT_LIGHT }, alias: ALIAS_LIGHT },
];

/**
 * Marker rules: unmistakable, and obviously not a product decision.
 * @returns {string}
 */
function markerRules() {
	return section("marker: proves the stylesheet reached the guest", [
		rule(DARK_SCOPE, [["background-color", `${MARKER} !important`]]),
		rule(`${DARK_SCOPE} *`, [
			["background-color", `${MARKER} !important`],
			["color", "#00ff00 !important"],
		]),
	]);
}

/**
 * Append "!important" to every declared value.
 *
 * The site declares its own theme variables once per theme block (the same
 * selectors our override uses), with no "!important". When both rules have
 * equal specificity the later one in source order wins, and the site can
 * re-inject its stylesheet after we do — which is exactly why an earlier
 * "!important"-less palette rendered as nothing. Escalating our declarations to
 * "!important" guarantees the override beats the site's own block. "!important"
 * on a custom-property declaration is valid CSS and overrides any non-important
 * declaration of the same property on the same element.
 * @param {Array<[string, string]>} entries
 * @returns {Array<[string, string]>}
 */
function withImportant(entries) {
	return entries.map(([property, value]) => [property, value + " !important"]);
}

/**
 * Palette rules: redefine the site's own custom properties under each of its
 * theme signals. The page keeps all of its own selectors and only resolves
 * colours differently.
 * @returns {string[]}
 */
function paletteRules() {
	return THEMES.flatMap((theme) => [
		section(
			`static color scales — ${theme.name} theme: DeepSeek ramps remapped to Claude warm-neutral + terracotta (!important to beat the site variable block)`,
			[rule(theme.scope, withImportant(Object.entries(theme.static)))],
		),
		section(
			`semantic / structural tokens — Claude ${theme.name} values, set explicitly (!important)`,
			[rule(theme.scope, withImportant(Object.entries(theme.alias)))],
		),
	]);
}

/**
 * Brand artwork: paint Claude's over the site's inline SVGs.
 *
 * The site renders its brand as inline SVG with no class hook, so the anchor is
 * the viewBox — an author-written markup attribute, not a build hash. Three
 * surfaces are in scope, all outside the login pages, whose own brand surfaces
 * (the 34x29 mark and 182x29 lockup) are left alone because the red line
 * protects that surface:
 *   - 143x23 — the full DeepSeek lockup in the sidebar and sign-in header;
 *     it becomes Claude's lockup, fitted to the box and left-aligned the way a
 *     wordmark sits.
 *   - 27x24 — the mark-only logo in the mobile sidebar header.
 *   - 35x26 — the mark-only logo above the welcome screen.
 * The two marks take the starburst alone, centred, because the box is square-ish
 * and a wordmark would not fit it.
 *
 * The 16x16 family is generic UI iconography, not brand, and is untouched.
 *
 * Painting the SVG element itself, rather than a parent ::before, keeps the
 * rule independent of the parent's hashed class. The original children are
 * hidden rather than removed, and the click handlers live on the parents, so
 * every click path is untouched.
 *
 * The artwork is theme-independent: the accent is baked into the data URI and
 * #d97757 is Claude's mark on paper as well as on ink, so these rules carry no
 * scope.
 * @param {string} svg
 * @param {string} image
 * @param {string} position
 * @returns {string[]}
 */
function brandReplacement(svg, image, position) {
	return [
		rule(svg, [
			["background-image", `${image} !important`],
			["background-repeat", "no-repeat !important"],
			["background-position", `${position} !important`],
			["background-size", "contain !important"],
		]),
		rule(`${svg} > *`, [["visibility", "hidden !important"]]),
	];
}

/**
 * @returns {string[]}
 */
function wordmarkRules() {
	const wordmark = `svg[viewBox="0 0 143 23"]`;
	const marks = [`svg[viewBox="0 0 27 24"]`, `svg[viewBox="0 0 35 26"]`];
	return [
		section(
			"brand wordmark — inline SVG with no class hook, anchored on the author-written viewBox",
			brandReplacement(wordmark, CLAUDE_WORDMARK, "left center"),
		),
		section(
			"brand marks — the mark-only whale logos in the sidebar header and above the welcome screen",
			marks.flatMap((mark) => brandReplacement(mark, CLAUDE_MARK_URI, "center center")),
		),
	];
}

/**
 * Code blocks are the one surface the site does not drive from tokens: each
 * theme authors its own literals on `.md-code-block-dark` / `-light`. Those are
 * author-written classes, not build hashes, so keying on them keeps the
 * zero-maintenance property. Each theme keeps its own block, scoped like the
 * rest of the sheet.
 * @returns {string}
 */
function codeBlockRules() {
	const dark = `${DARK_SCOPE} .md-code-block.md-code-block-dark`;
	const light = `${LIGHT_SCOPE} .md-code-block.md-code-block-light`;
	const surface = (block, background, color, selection) => [
		rule(`${block} pre[class*="language-"], ${block} :not(pre) > code[class*="language-"]`, [
			["background", `${background} !important`],
			["color", `${color} !important`],
		]),
		rule(`${block} ::selection`, [["background", `${selection} !important`]]),
	];
	return section("code blocks — the site hardcodes its surfaces here, outside the token layer", [
		...surface(dark, "#212121", "#ede9ea", "#4d2e22"),
		rule(`${dark} div.code-toolbar > .toolbar > .toolbar-item > button`, [
			["color", "#1b1b1c !important"],
			["background", "#d97757 !important"],
		]),
		...surface(light, "#f5f2ec", "#2b2a27", "#f1d3c4"),
	]);
}

/**
 * Build the stylesheet for a mode.
 * @param {{ mode?: "marker" | "claude" }} [options]
 * @returns {string}
 */
export function buildSkin(options = {}) {
	const mode = options.mode ?? "marker";
	if (mode === "marker") return buildSheet([markerRules()]);
	if (mode === "claude") {
		return buildSheet([...paletteRules(), ...wordmarkRules(), codeBlockRules()]);
	}
	throw new Error(`unknown skin mode: ${mode}`);
}
