/**
 * dsh-deepseek-webchat-claude-skin — browser half (GENERATED).
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
	id: "dsh-deepseek-webchat-claude-skin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		// ---- src/sheet.js ----
		/**
		 * Stylesheet builder — pure string assembly.
		 *
		 * No DOM, no Electron, no timers: the input is data, the output is CSS text.
		 * That is deliberate. The only seam this package has is "given this data, emit
		 * this text", so the whole visual definition can be tested in plain Node
		 * without a browser.
		 */

		/**
		 * Render a CSS string literal, escaping what would otherwise break out.
		 * @param {string} value
		 * @returns {string}
		 */
		function cssString(value) {
			const escaped = String(value)
				.replaceAll("\\", "\\\\")
				.replaceAll('"', '\\"')
				.replaceAll("\n", "\\a ");
			return '"' + escaped + '"';
		}

		/**
		 * Render one declaration list as indented CSS lines.
		 * Later declarations win, so callers append overrides instead of deduping.
		 * @param {Array<[string, string]>} declarations
		 * @returns {string}
		 */
		function declarations(declarations) {
			return declarations
				.map(([property, value]) => `\t${property}: ${value};`)
				.join("\n");
		}

		/**
		 * Render one rule. A rule with no declarations renders as nothing at all,
		 * which keeps generated sheets free of empty blocks.
		 * @param {string} selector
		 * @param {Array<[string, string]>} body
		 * @returns {string}
		 */
		function rule(selector, body) {
			if (body.length === 0) return "";
			return `${selector} {\n${declarations(body)}\n}`;
		}

		/**
		 * Render a block of rules as one section, prefixed by a comment that says why
		 * the section exists. Sections are separated by a blank line.
		 * @param {string} title
		 * @param {string[]} rules
		 * @returns {string}
		 */
		function section(title, rules) {
			const body = rules.filter((text) => text !== "").join("\n\n");
			if (body === "") return "";
			return `/* ${title} */\n${body}`;
		}

		/**
		 * Join sections into a complete stylesheet.
		 * @param {string[]} sections
		 * @returns {string}
		 */
		function buildSheet(sections) {
			return sections.filter((text) => text !== "").join("\n\n") + "\n";
		}

		// ---- src/brand.js ----
		/**
		 * The Claude brand artwork, lifted from the sibling dsh-claude-style plugin (its
		 * data-combine-word="Claude" drawing: the starburst plus the wordmark).
		 *
		 * Two shapes, both inlined as data URIs because the red line forbids network
		 * requests into the guest and the site's CSP would refuse a remote asset anyway:
		 *   - the lockup, for the site's 143x23 wordmark;
		 *   - the starburst alone, for the two mark-only whale logos in the app chrome.
		 *
		 * The lockup viewBox is taller than the stock 0 0 5.9773 1 on purpose. The
		 * plugin draws the starburst outside the text's viewBox and relies on
		 * overflow: visible; a CSS background image has no overflow, so the stock box
		 * clips the top and bottom of the star. The expanded box fits the whole drawing
		 * and keeps the lockup at the site wordmark's visual scale.
		 *
		 * The accent is baked in at #d97757 rather than using currentColor: a data URI
		 * has no cascade from the page, so currentColor would resolve to black.
		 */

		const MARK_PATH =
			'M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z';

		const TEXT_PATH =
			'M13.623 20.222c-3.417 0-5.753-1.901-6.855-4.827a12.992 12.992 0 01-.838-4.772c0-4.907 2.206-8.315 7.08-8.315 3.275 0 5.297 1.425 6.448 4.826h1.402l-.19-4.69C18.709 1.18 16.258.543 13.276.543c-4.2 0-7.775 1.874-9.763 5.254a11.357 11.357 0 00-1.511 5.872c0 3.753 1.777 7.08 5.113 8.926a11.95 11.95 0 005.943 1.398c3.254 0 5.835-.617 8.122-1.697l.593-5.172h-1.43c-.858 2.362-1.88 3.78-3.574 4.534-.831.373-1.88.564-3.146.564zm14.74-17.914L28.499 0h-.967L23.23 1.29v.699l1.907.882v16.142c0 1.1-.565 1.344-2.043 1.528v1.18h7.319v-1.18c-1.484-.184-2.042-.428-2.042-1.528V2.315l-.007-.007zm29.104 19.685h.565l4.95-.937v-1.208l-.695-.054c-1.157-.109-1.457-.346-1.457-1.29V9.897l.137-2.763h-.783l-4.678.672v1.181l.457.082c1.266.183 1.64.536 1.64 1.419v7.67c-1.212.937-2.369 1.527-3.744 1.527-1.525 0-2.471-.774-2.471-2.58V9.905l.136-2.763h-.804l-4.684.672v1.181l.484.082c1.266.183 1.64.536 1.64 1.418v7.08c0 3 1.703 4.426 4.412 4.426 2.07 0 3.765-1.1 5.038-2.627L57.474 22l-.007-.007zm-13.602-9.55c0-3.836-2.043-5.309-5.733-5.309-3.254 0-5.616 1.344-5.616 3.57 0 .666.238 1.175.721 1.528l2.478-.326c-.109-.746-.163-1.201-.163-1.391 0-1.263.674-1.901 2.042-1.901 2.022 0 3.044 1.419 3.044 3.7v.746l-5.106 1.527c-1.702.462-2.67.863-3.316 1.8a3.386 3.386 0 00-.476 1.9c0 2.172 1.497 3.706 4.057 3.706 1.852 0 3.493-.835 4.922-2.416.51 1.581 1.294 2.416 2.69 2.416 1.13 0 2.15-.455 3.063-1.344l-.272-.937a4.363 4.363 0 01-1.178.163c-.783 0-1.157-.617-1.157-1.826v-5.607zm-6.536 7.378c-1.396 0-2.26-.808-2.26-2.226 0-.964.456-1.528 1.43-1.854l4.139-1.31v3.965c-1.321.997-2.097 1.425-3.31 1.425zm43.095 1.235v-1.208l-.701-.054c-1.158-.109-1.45-.346-1.45-1.29V2.308L78.409 0h-.974l-4.302 1.29v.699l1.906.882V8.18a6.024 6.024 0 00-3.656-1.046c-4.276 0-7.612 3.245-7.612 8.098 0 3.998 2.397 6.761 6.346 6.761 2.042 0 3.819-.99 4.922-2.525l-.136 2.525h.571l4.95-.937zm-8.96-12.313c2.043 0 3.575 1.181 3.575 3.353v6.11a4.91 4.91 0 01-3.547 1.425c-2.928 0-4.412-2.308-4.412-5.39 0-3.462 1.695-5.498 4.385-5.498zm19.424 3.055c-.381-1.792-1.484-2.81-3.016-2.81-2.288 0-3.874 1.717-3.874 4.18 0 3.646 1.934 6.008 5.059 6.008a5.858 5.858 0 005.03-2.953l.913.245c-.408 3.163-3.281 5.525-6.808 5.525-4.14 0-6.992-3.054-6.992-7.399 0-4.378 3.098-7.46 7.237-7.46 3.09 0 5.27 1.853 5.97 5.07l-10.783 3.3V14.05l7.264-2.247v-.006z';

		const LOCKUP_VIEWBOX = "0 -0.245 5.9773 1.49";

		const CLAUDE_LOCKUP =
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + LOCKUP_VIEWBOX + '">' +
			'<g transform="translate(-0.0000 -0.2250) scale(0.060417)" fill="#d97757" fill-rule="nonzero">' +
			'<path d="' + MARK_PATH + '"/></g>' +
			'<g transform="translate(1.6591 -0.0000) scale(0.045455)" fill="#d97757" fill-rule="nonzero">' +
			'<path d="' + TEXT_PATH + '"/></g>' +
			'</svg>';

		const CLAUDE_MARK =
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
			'<path fill="#d97757" fill-rule="nonzero" d="' + MARK_PATH + '"/></svg>';

		/**
		 * CSS background-image values: same-document data URIs.
		 * @type {string}
		 */
		const CLAUDE_WORDMARK = `url("data:image/svg+xml,${encodeURIComponent(CLAUDE_LOCKUP)}")`;

		/** @type {string} */
		const CLAUDE_MARK_URI = `url("data:image/svg+xml,${encodeURIComponent(CLAUDE_MARK)}")`;

		// ---- src/skin.js ----
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



		/** The site's dark-mode signal. */
		const DARK_SCOPE = 'body[data-ds-dark-theme]';

		/** Its absence — the site's light mode. */
		const LIGHT_SCOPE = 'body:not([data-ds-dark-theme])';

		/** The marker mode's deliberately hideous colour. */
		const MARKER = "#ff00aa";

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
		function buildSkin(options = {}) {
			const mode = options.mode ?? "marker";
			if (mode === "marker") return buildSheet([markerRules()]);
			if (mode === "claude") {
				return buildSheet([...paletteRules(), ...wordmarkRules(), codeBlockRules()]);
			}
			throw new Error(`unknown skin mode: ${mode}`);
		}

		// ---- src/shell.js ----
		/**
		 * Host-surface copy: the sidebar row that opens the DeepSeek panel.
		 *
		 * WHY THIS EXISTS
		 *   webchat registers the row as "Chat DeepSeek" in every locale, and there is
		 *   no slot option or config for the name (lib/client.js `copy()`). The skin is
		 *   a Claude rebrand, and the row is the last "DeepSeek" left in the chrome.
		 *
		 * WHAT IT WRITES
		 *   Two things, both in the host document: the label's text node, and the
		 *   `aria-label` that mirrors it for screen readers. The guest page inside the
		 *   webview is never read or written by this module. No nodes are added, moved
		 *   or removed; no className or style is touched.
		 *
		 * WHY THE EXACT TEXT
		 *   The row's class names are CSS-module hashes, so no selector is stable. The
		 *   label string itself is the contract: if webchat renames it, this module
		 *   goes dormant instead of rewriting the wrong node. That is also why the
		 *   match is exact — "Chat DeepSeek history" in another plugin's row, or the
		 *   transient "已打开 Chat DeepSeek" notice, must stay untouched.
		 */

		/** What webchat calls the row, in every locale. */
		const SIDEBAR_LABEL = "Chat DeepSeek";

		/** What the row says after the rebrand. One constant, if the name changes. */
		const SIDEBAR_LABEL_REPLACEMENT = "Chat";

		/** The label also lives in this attribute on the row's button. */
		const LABEL_ATTRIBUTE = "aria-label";

		const TEXT_NODE = 3;
		const ELEMENT_NODE = 1;

		/**
		 * No depth limit on an added subtree: the sidebar row arrives as a descendant
		 * of a whole-panel mount (measured: the button sits six levels below the node
		 * the observer reports). Walking with a fixed depth missed it entirely, which
		 * is why an exact-match first pass plus a shallow recursive scan never renamed
		 * the row.
		 */
		const LABEL_SELECTOR = `[${LABEL_ATTRIBUTE}="${SIDEBAR_LABEL}"]`;

		/**
		 * Rename the row now, and keep it renamed as the sidebar re-renders.
		 * @returns {() => void} teardown, restoring every node this module changed
		 */
		function renameSidebarLabel() {
			/** Text nodes changed to the replacement, for teardown. */
			const texts = new Set();
			/** Elements whose label attribute was changed, for teardown. */
			const labelled = new Set();
			/** Set at teardown so a queued observer callback cannot rewrite the DOM. */
			let disposed = false;

			/**
			 * @param {Text} node
			 */
			function fixText(node) {
				if (disposed || node.nodeType !== TEXT_NODE || node.data !== SIDEBAR_LABEL) return;
				node.data = SIDEBAR_LABEL_REPLACEMENT;
				texts.add(node);
			}

			/**
			 * @param {Element} element
			 */
			function fixLabel(element) {
				if (disposed || element.getAttribute(LABEL_ATTRIBUTE) !== SIDEBAR_LABEL) return;
				element.setAttribute(LABEL_ATTRIBUTE, SIDEBAR_LABEL_REPLACEMENT);
				labelled.add(element);
			}

			/**
			 * Inspect an added subtree at any depth, two ways, because the row arrives in
			 * two shapes:
			 *   - as the label attribute on a button, however deep it is nested
			 *     (measured: six levels below the node the observer reports), found with
			 *     a selector instead of a hand-rolled walk;
			 *   - as a bare text node inside a rebuilt span or the rail tooltip, which has
			 *     no attribute to select and is found by walking the subtree's text.
			 * Both are needed: the first catches the row, the second catches a re-render
			 * that rebuilds only the title.
			 * @param {Element} element
			 */
			function fixSubtree(element) {
				if (disposed) return;
				fixLabel(element);
				for (const labelled of element.querySelectorAll(LABEL_SELECTOR)) fixLabel(labelled);
				const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
				for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) fixText(node);
			}

			// First pass: the row may already be rendered when this plugin mounts.
			const root = document.body ?? document.documentElement;
			const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
			for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) fixText(node);
			for (const element of document.querySelectorAll(LABEL_SELECTOR)) {
				fixLabel(element);
			}

			// Re-renders: the sidebar unmounts the title span when it collapses, rebuilds
			// the row when it expands, and the tooltip is created on hover. Attributes
			// are observed because React restores `aria-label` on a full row re-render.
			// Character data is observed because a render that only changes the label
			// text reuses the existing text node (React writes `nodeValue`), which a
			// childList observer never sees.
			const observer = new MutationObserver((records) => {
				for (const record of records) {
					if (record.type === "attributes") {
						fixLabel(record.target);
						continue;
					}
					if (record.type === "characterData") {
						fixText(record.target);
						continue;
					}
					for (const added of record.addedNodes) {
						if (added.nodeType === TEXT_NODE) fixText(added);
						else if (added.nodeType === ELEMENT_NODE) fixSubtree(added);
					}
				}
			});
			observer.observe(document.documentElement, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: [LABEL_ATTRIBUTE],
				characterData: true,
			});

			return function () {
				disposed = true;
				observer.disconnect();
				for (const node of texts) {
					if (node.data === SIDEBAR_LABEL_REPLACEMENT) node.data = SIDEBAR_LABEL;
				}
				texts.clear();
				for (const element of labelled) {
					if (element.getAttribute(LABEL_ATTRIBUTE) === SIDEBAR_LABEL_REPLACEMENT) {
						element.setAttribute(LABEL_ATTRIBUTE, SIDEBAR_LABEL);
					}
				}
				labelled.clear();
			};
		}

		// ---- src/inject.js ----
		/**
		 * Delivery: find the DeepSeek guest, hand it a stylesheet.
		 *
		 * WHAT THIS DOES NOT DO
		 *   It does not touch the guest's DOM, its user agent, its cookies, its
		 *   localStorage, or its network. The only thing that crosses the boundary is
		 *   a CSS text handed to the webview's own insertCSS. The guest therefore sees
		 *   exactly the page it always sees, painted differently.
		 *
		 *   The one host-side write lives in src/shell.js: the webchat sidebar row is
		 *   renamed "Chat DeepSeek" -> "Chat" with a text-node edit and its aria-label.
		 *   That is DSH chrome, not the guest page.
		 *
		 * WHY ORIGIN AND NOT A MARKER ATTRIBUTE
		 *   The host plugin tags its webview with a private attribute. Depending on
		 *   that name couples this package to another package's internals; the guest's
		 *   origin is the real contract — "the page we skin is the DeepSeek page".
		 *
		 * WHY RE-INJECT
		 *   The host reloads the guest once after restoring the login session. A
		 *   stylesheet inserted before that reload is gone with the old document, so
		 *   every completed load gets a fresh insert. Re-inserting is safe: the
		 *   previous key is removed first, so the sheet never accumulates.
		 *
		 * FAILURE MODE
		 *   If no guest ever appears, this stays dormant and says so once. A skin that
		 *   silently does nothing is a cosmetic bug; a skin that throws inside the host
		 *   surface is a broken app. Only the first is acceptable.
		 */

		/** Loader id — must match package.json, cordis.patch.yml and the envelope. */
		const PLUGIN_ID = "dsh-deepseek-webchat-claude-skin";

		/** The one page this package is allowed to paint. */
		const GUEST_ORIGIN = "https://chat.deepseek.com";

		/** Which skin to build. See src/skin.js for the modes. */
		const SKIN_MODE = "claude";

		/** How long to wait for a guest before admitting none showed up. */
		const WARN_AFTER_MS = 4000;

		/**
		 * Origin of a URL, or null when it is not a URL we can parse.
		 * Exported because it is the client half's only pure decision: which page is
		 * the one we are allowed to paint.
		 * @param {unknown} url
		 * @returns {string | null}
		 */
		function originOf(url) {
			if (typeof url !== "string" || url === "") return null;
			try {
				return new URL(url).origin;
			} catch {
				return null;
			}
		}

		/**
		 * Best-effort current URL of a webview.
		 *
		 * `getURL()` throws until the element is attached and has emitted dom-ready,
		 * and the `src` attribute may still hold the placeholder the host used while
		 * it was reserving a session partition, so both are tried and both may fail.
		 * @param {any} element
		 * @returns {string | null}
		 */
		function currentUrl(element) {
			try {
				const url = element.getURL();
				if (typeof url === "string" && url !== "") return url;
			} catch {
				// Not attached yet — expected on the first pass.
			}
			const attribute = element.getAttribute("src");
			return typeof attribute === "string" && attribute !== "" ? attribute : null;
		}

		/**
		 * Is this element the DeepSeek guest?
		 * @param {any} element
		 * @returns {boolean}
		 */
		function isGuest(element) {
			return originOf(currentUrl(element)) === GUEST_ORIGIN;
		}

		/**
		 * Create the injector. Kept as a factory so the cleanup closure owns its own
		 * bookkeeping instead of reaching for module-level mutable state.
		 * @returns {{ scan: () => number, apply: () => Promise<number>, dispose: () => void, painted: () => boolean }}
		 */
		function createInjector() {
			/** Inserted stylesheet keys, per element, so re-inserts replace rather than stack. */
			const keys = new WeakMap();
			/** Elements already wired, so listeners are attached once. */
			const wired = new WeakSet();
			/** Wired elements, so disposal can take its sheets back out. */
			const elements = new Set();
			/** Teardown callbacks. */
			const teardowns = [];
			/** Last queued injection per element, so overlapping load events do not race. */
			const queues = new WeakMap();
			/** Set once disposed, so a queued injection does not paint after teardown. */
			let disposed = false;
			/** Whether a sheet has ever landed; drives the dormancy diagnostic. */
			let painted = false;

			/**
			 * Insert the stylesheet into one guest, replacing any earlier insert.
			 *
			 * `dom-ready` and `did-finish-load` can arrive while the previous
			 * `insertCSS` is still in flight. Serialising per element means the second
			 * pass waits, sees the first pass's key, and replaces it — instead of both
			 * inserting and only the later key being remembered.
			 * @param {any} element
			 * @returns {Promise<boolean>}
			 */
			function inject(element) {
				const previous = queues.get(element) ?? Promise.resolve();
				const task = previous.catch(() => {}).then(() => paint(element));
				queues.set(element, task);
				return task;
			}

			/**
			 * One injection pass. Assumes it owns the element's queue.
			 * @param {any} element
			 * @returns {Promise<boolean>}
			 */
			async function paint(element) {
				if (disposed) return false;

				let css;
				try {
					css = buildSkin({ mode: SKIN_MODE });
				} catch (error) {
					console.warn(PLUGIN_ID + ": could not build the stylesheet", error);
					return false;
				}

				const previous = keys.get(element);
				keys.delete(element);
				if (previous !== undefined) {
					try {
						await element.removeInsertedCSS(previous);
					} catch {
						// The old document is gone; its key died with it.
					}
				}

				try {
					const key = await element.insertCSS(css);
					if (disposed) {
						// Teardown won the race; do not leave a sheet behind.
						try {
							await element.removeInsertedCSS(key);
						} catch {
							// The element is gone; nothing left to paint.
						}
						return false;
					}
					keys.set(element, key);
					painted = true;
					return true;
				} catch (error) {
					console.warn(PLUGIN_ID + ": the guest refused the stylesheet", error);
					return false;
				}
			}

			/**
			 * Attach lifecycle listeners to one webview element, once.
			 * @param {any} element
			 */
			function wire(element) {
				if (wired.has(element)) return;
				wired.add(element);
				elements.add(element);

				const onReady = () => {
					if (isGuest(element)) void inject(element);
				};
				const onLoad = () => {
					if (isGuest(element)) void inject(element);
				};

				element.addEventListener("dom-ready", onReady);
				element.addEventListener("did-finish-load", onLoad);
				teardowns.push(() => {
					element.removeEventListener("dom-ready", onReady);
					element.removeEventListener("did-finish-load", onLoad);
				});

				// A guest that was already loaded before this plugin mounted still needs
				// the sheet, and it will never emit dom-ready again.
				onReady();
			}

			/**
			 * Walk the document for webviews and wire the ones that are guests.
			 * @returns {number} how many guests are wired
			 */
			function scan() {
				const elements = document.querySelectorAll("webview");
				let guests = 0;
				for (const element of elements) {
					if (!isGuest(element)) {
						// Wire it anyway: it may not be the guest yet, and its dom-ready
						// will tell us when it becomes one.
						wire(element);
						continue;
					}
					guests += 1;
					wire(element);
				}
				return guests;
			}

			/**
			 * Re-inject into every known guest. Exposed for development and for the
			 * marker check; nothing in the normal path needs it.
			 * @returns {Promise<number>}
			 */
			async function applyNow() {
				let count = 0;
				for (const element of document.querySelectorAll("webview")) {
					if (!isGuest(element)) continue;
					if (await inject(element)) count += 1;
				}
				return count;
			}

			/**
			 * Stop everything this injector owns: listeners, and the sheets it inserted.
			 * A guest that navigated has already dropped its sheet, which rejects the
			 * removal — the key died with the old document, so that is fine.
			 */
			function dispose() {
				disposed = true;
				for (const teardown of teardowns) teardown();
				teardowns.length = 0;

				for (const element of elements) {
					const key = keys.get(element);
					if (key === undefined) continue;
					keys.delete(element);
					try {
						const pending = element.removeInsertedCSS(key);
						if (pending && typeof pending.catch === "function") pending.catch(() => {});
					} catch {
						// The element is gone; nothing left to paint.
					}
				}
				elements.clear();
			}

			return { scan, apply: applyNow, dispose, painted: () => painted };
		}

		/**
		 * Plugin body. The loader calls this once per mount and calls the returned
		 * cleanup when the plugin is swapped out.
		 * @param {{ effect?: (fn: () => (() => void), label?: string) => void }} ctx
		 */
		function apply(ctx) {
			const injector = createInjector();

			const run = () => {
				injector.scan();
				const restoreLabel = renameSidebarLabel();

				// A webview can appear after this plugin mounts (the host may recreate it
				// on a hot swap). Watching is not editing: nothing here mutates the DOM.
				const observer = new MutationObserver(() => {
					injector.scan();
				});
				observer.observe(document.documentElement, { childList: true, subtree: true });

				const timer = window.setTimeout(() => {
					injector.scan();
					if (!injector.painted()) {
						console.warn(
							PLUGIN_ID +
								": no stylesheet has reached a " +
								GUEST_ORIGIN +
								" guest yet; the skin stays dormant. Open the DeepSeek panel, or check that the host still embeds the page.",
						);
					}
				}, WARN_AFTER_MS);

				return () => {
					window.clearTimeout(timer);
					observer.disconnect();
					restoreLabel();
					injector.dispose();
				};
			};

			if (typeof ctx?.effect === "function") {
				ctx.effect(run, PLUGIN_ID + ": inject the skin");
			} else {
				run();
			}
		}

		exports.apply = apply;
		exports.inject = [];
		return module.exports;
	},
});
