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
export function originOf(url) {
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
export function apply(ctx) {
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
