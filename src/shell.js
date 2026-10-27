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
export function renameSidebarLabel() {
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
