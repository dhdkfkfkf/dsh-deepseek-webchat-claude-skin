/**
 * The builder is the package's only seam, so it is tested as behaviour: given
 * this data, the emitted text is this. No DOM, no browser, no implementation
 * poking.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { buildSheet, cssString, declarations, rule, section } from "../src/sheet.js";

test("a rule renders its declarations in order, indented", () => {
	assert.equal(
		rule("body", [
			["color", "#fff"],
			["background", "#000"],
		]),
		"body {\n\tcolor: #fff;\n\tbackground: #000;\n}",
	);
});

test("later declarations are kept, not deduped — overrides are how a skin wins", () => {
	const text = rule("body", [
		["color", "#fff"],
		["color", "#000"],
	]);
	assert.match(text, /color: #fff;[\s\S]*color: #000;/);
});

test("a rule with no declarations renders as nothing at all", () => {
	assert.equal(rule("body", []), "");
});

test("a section with no renderable rules renders as nothing at all", () => {
	assert.equal(section("empty", ["", ""]), "");
});

test("a section keeps its title as a comment and drops empty members", () => {
	assert.equal(section("why", ["a {}", "", "b {}"]), "/* why */\na {}\n\nb {}");
});

test("sections are separated by one blank line and the sheet ends with a newline", () => {
	const text = buildSheet(["a {}", "b {}"]);
	assert.equal(text, "a {}\n\nb {}\n");
});

test("empty sections never leave stray blank lines behind", () => {
	assert.equal(buildSheet(["", "a {}", ""]), "a {}\n");
});

test("cssString quotes and escapes so a value cannot break out of its literal", () => {
	assert.equal(cssString('plain'), '"plain"');
	assert.equal(cssString('a"b'), '"a\\"b"');
	assert.equal(cssString("a\\b"), '"a\\\\b"');
});

test("cssString turns a newline into an escape rather than a line break", () => {
	assert.equal(cssString("a\nb"), '"a\\a b"');
});
