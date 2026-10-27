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
 * How deep an added subtree is inspected. The row is button > title span >
 * text (depth 2 from the added node when the button itself is new), and the
 * collapsed-rail tooltip is one wrapper around the text. Anything deeper is
 * a chat transcript, which this module has no business walking.
 */
const NEARBY_DEPTH = 2;

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
	 * Inspect an added element and the two levels below it: the row button, its
	 * title span, the tooltip wrapper and its text are all inside that range.
	 * @param {Element} element
	 * @param {number} depth
	 */
	function fixNearby(element, depth) {
		if (disposed) return;
		fixLabel(element);
		const children = element.childNodes;
		for (let index = 0; index < children.length; index += 1) {
			const child = children[index];
			if (child.nodeType === TEXT_NODE) fixText(child);
			else if (depth > 0 && child.nodeType === ELEMENT_NODE) fixNearby(child, depth - 1);
		}
	}

	// First pass: the row may already be rendered when this plugin mounts.
	const root = document.body ?? document.documentElement;
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) fixText(node);
	for (const element of document.querySelectorAll(`[${LABEL_ATTRIBUTE}="${SIDEBAR_LABEL}"]`)) {
		fixLabel(element);
	}

	// Re-renders: the sidebar unmounts the title span when it collapses, rebuilds
	// the row when it expands, and the tooltip is created on hover. Attributes
	// are observed because React restores `aria-label` on a full row re-render.
	const observer = new MutationObserver((records) => {
		for (const record of records) {
			if (record.type === "attributes") {
				fixLabel(record.target);
				continue;
			}
			for (const added of record.addedNodes) {
				if (added.nodeType === TEXT_NODE) fixText(added);
				else if (added.nodeType === ELEMENT_NODE) fixNearby(added, NEARBY_DEPTH);
			}
		}
	});
	observer.observe(document.documentElement, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: [LABEL_ATTRIBUTE],
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
