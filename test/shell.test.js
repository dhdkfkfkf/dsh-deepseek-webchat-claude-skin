/**
 * The sidebar row rename, tested against a fake DOM.
 *
 * The regression this file exists for: the row arrives as a descendant of a
 * whole-panel mount, six levels below the node the observer reports. An earlier
 * version walked the added subtree two levels deep and therefore never saw the
 * button, so the row kept saying "Chat DeepSeek" no matter how many times it
 * re-rendered. Every test below builds the row *inside* a deep wrapper, which
 * is the shape the real sidebar actually has.
 */

import assert from "node:assert/strict";
import test from "node:test";

/** Minimal element: tag, attributes, childNodes, and the two lookups fix uses. */
function element(tag, attributes = {}) {
	const node = {
		nodeType: 1,
		tagName: tag.toUpperCase(),
		attributes: { ...attributes },
		childNodes: [],
		parentNode: null,
		getAttribute(name) {
			return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null;
		},
		setAttribute(name, value) {
			this.attributes[name] = value;
		},
		appendChild(child) {
			child.parentNode = this;
			this.childNodes.push(child);
			return child;
		},
		querySelectorAll(selector) {
			const match = /^\[([^\]]+)="(.*)"\]$/.exec(selector);
			const found = [];
			const walk = (current) => {
				for (const child of current.childNodes) {
					if (child.nodeType !== 1) continue;
					if (!match || child.getAttribute(match[1]) === match[2]) found.push(child);
					walk(child);
				}
			};
			walk(this);
			return found;
		},
	};
	return node;
}

function text(data) {
	return { nodeType: 3, data, parentNode: null };
}

/**
 * Install a fake document/MutationObserver, import shell.js fresh, and hand back
 * a harness that can deliver observer records the way a browser would.
 */
async function harness() {
	const root = element("html");
	const body = element("body");
	root.appendChild(body);
	const records = [];
	let callback = null;

	globalThis.NodeFilter = { SHOW_TEXT: 4 };
	globalThis.document = {
		documentElement: root,
		body,
		querySelectorAll(selector) {
			return body.querySelectorAll(selector);
		},
		createTreeWalker(node) {
			const queue = [];
			const collect = (current) => {
				for (const child of current.childNodes ?? []) {
					if (child.nodeType === 3) queue.push(child);
					collect(child);
				}
			};
			collect(node);
			let index = 0;
			return { nextNode: () => (index < queue.length ? queue[index++] : null) };
		},
	};
	globalThis.MutationObserver = class {
		constructor(fn) {
			callback = fn;
		}
		observe() {}
		disconnect() {
			callback = null;
		}
	};

	// Cache-bust so each test gets a module with its own closed-over state.
	const module = await import(`../src/shell.js?t=${Math.random()}`);
	const teardown = module.renameSidebarLabel();
	return {
		root,
		body,
		/** Deliver records as the observer would, then let the callback run. */
		deliver(...added) {
			records.push({ type: "childList", target: body, addedNodes: added });
			if (callback) callback(records.splice(0));
		},
		deliverAttribute(target) {
			records.push({ type: "attributes", target, attributeName: "aria-label" });
			if (callback) callback(records.splice(0));
		},
		deliverCharacterData(target) {
			records.push({ type: "characterData", target });
			if (callback) callback(records.splice(0));
		},
		teardown,
	};
}

/**
 * The real shape: a whole panel mount whose button sits six levels down, with
 * five sibling wrappers above it, exactly as measured in the running app.
 * @returns {{mount: object, button: object}}
 */
function deepPanel() {
	const mount = element("div", { class: "frame" });
	let cursor = mount;
	for (let level = 0; level < 5; level += 1) cursor = cursor.appendChild(element("div"));
	const button = cursor.appendChild(element("button", { "aria-label": "Chat DeepSeek" }));
	return { mount, button };
}

test("a row added as its own node is renamed", async () => {
	const h = await harness();
	const wrap = element("div");
	const button = wrap.appendChild(element("button", { "aria-label": "Chat DeepSeek" }));
	h.deliver(wrap);
	assert.equal(button.getAttribute("aria-label"), "Chat");
});

test("a row nested six levels inside a whole-panel mount is still renamed", async () => {
	const h = await harness();
	const { mount, button } = deepPanel();
	// The observer reports the panel container, not the button: the button is a
	// descendant six levels down. This is the case that used to be missed.
	h.deliver(mount);
	assert.equal(button.getAttribute("aria-label"), "Chat");
});

test("a text node deep inside an added panel is renamed", async () => {
	const h = await harness();
	const mount = element("div");
	let cursor = mount;
	for (let level = 0; level < 5; level += 1) cursor = cursor.appendChild(element("div"));
	const span = cursor.appendChild(element("span"));
	const node = text("Chat DeepSeek");
	span.appendChild(node);
	h.deliver(mount);
	h.deliver(node);
	assert.equal(node.data, "Chat");
});

test("React restoring the attribute is corrected", async () => {
	const h = await harness();
	const button = element("button", { "aria-label": "Chat DeepSeek" });
	h.body.appendChild(button);
	h.deliverAttribute(button);
	assert.equal(button.getAttribute("aria-label"), "Chat");
});

test("React rewriting the text node is corrected", async () => {
	const h = await harness();
	const node = text("Chat DeepSeek");
	const span = element("span");
	span.appendChild(node);
	h.body.appendChild(span);
	h.deliverCharacterData(node);
	assert.equal(node.data, "Chat");
});

test("a different label with the same prefix is left alone", async () => {
	const h = await harness();
	const other = element("button", { "aria-label": "Chat DeepSeek history" });
	h.body.appendChild(other);
	h.deliver(other);
	assert.equal(other.getAttribute("aria-label"), "Chat DeepSeek history");
});

test("teardown restores the original label", async () => {
	const h = await harness();
	const { mount, button } = deepPanel();
	h.deliver(mount);
	assert.equal(button.getAttribute("aria-label"), "Chat");
	h.teardown();
	assert.equal(button.getAttribute("aria-label"), "Chat DeepSeek");
});

test("no record after teardown can rewrite the DOM", async () => {
	const h = await harness();
	const button = element("button", { "aria-label": "Chat DeepSeek" });
	h.body.appendChild(button);
	h.teardown();
	h.deliverAttribute(button);
	assert.equal(button.getAttribute("aria-label"), "Chat DeepSeek");
});
