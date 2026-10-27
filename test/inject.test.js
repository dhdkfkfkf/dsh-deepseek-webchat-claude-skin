/**
 * The client half's one pure decision: which page is ours to paint.
 *
 * Everything else in that file is DOM and Electron plumbing, which the mount
 * check exercises in a real browser. This is the part worth pinning, because a
 * mistake here would paint a page we were never allowed to touch.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { originOf } from "../src/inject.js";

test("the DeepSeek origin is recognised however the path is spelled", () => {
	assert.equal(originOf("https://chat.deepseek.com"), "https://chat.deepseek.com");
	assert.equal(originOf("https://chat.deepseek.com/a/chat/s/123"), "https://chat.deepseek.com");
	assert.equal(originOf("https://chat.deepseek.com/?x=1#y"), "https://chat.deepseek.com");
});

test("a sibling host is a different origin, so it is not painted", () => {
	assert.equal(originOf("https://evil.deepseek.com/"), "https://evil.deepseek.com");
	assert.notEqual(originOf("https://evil.deepseek.com/"), "https://chat.deepseek.com");
});

test("http and https are different origins", () => {
	assert.notEqual(originOf("http://chat.deepseek.com/"), "https://chat.deepseek.com");
});

test("the placeholder a webview carries before it loads is not an origin we accept", () => {
	assert.equal(originOf("about:blank#lease"), "null");
});

test("nothing parseable yields null rather than throwing", () => {
	assert.equal(originOf(""), null);
	assert.equal(originOf(undefined), null);
	assert.equal(originOf(null), null);
	assert.equal(originOf(42), null);
	assert.equal(originOf("not a url"), null);
});
