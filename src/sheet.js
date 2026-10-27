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
export function cssString(value) {
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
export function declarations(declarations) {
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
export function rule(selector, body) {
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
export function section(title, rules) {
	const body = rules.filter((text) => text !== "").join("\n\n");
	if (body === "") return "";
	return `/* ${title} */\n${body}`;
}

/**
 * Join sections into a complete stylesheet.
 * @param {string[]} sections
 * @returns {string}
 */
export function buildSheet(sections) {
	return sections.filter((text) => text !== "").join("\n\n") + "\n";
}
