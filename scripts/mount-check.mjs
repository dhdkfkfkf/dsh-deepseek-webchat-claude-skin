/**
 * Mount check: does the client half actually behave in a browser?
 *
 * The unit tests pin the pure decisions. They cannot answer the questions that
 * only a real engine can: does a late-arriving webview get picked up, does a
 * second load replace the sheet instead of stacking it, does a non-guest get
 * left alone. So this script loads the built bundle into a real page in a real
 * browser, with a stand-in webview element, and asserts on what the injector
 * did.
 *
 * The stand-in is not a real <webview>: that needs Electron, and Electron is
 * not something a build check should drag in. What is real here is everything
 * the injector touches — document, querySelectorAll, MutationObserver, event
 * listeners, timers. What is faked is only the four methods of the guest API.
 *
 * Usage: node scripts/mount-check.mjs [--browser <path-to-msedge>]
 */

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, "..");

const CANDIDATES = [
	process.env.DSH_EDGE,
	"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	"C:/Program Files/Microsoft/Edge/Application/msedge.exe",
	"C:/Program Files/Google/Chrome/Application/chrome.exe",
];

/**
 * Find a Chromium-family browser to drive.
 * @returns {string}
 */
function findBrowser() {
	const explicit = process.argv.indexOf("--browser");
	if (explicit !== -1 && process.argv[explicit + 1]) return process.argv[explicit + 1];
	for (const candidate of CANDIDATES) {
		if (candidate && existsSync(candidate)) return candidate;
	}
	throw new Error("no Chromium-family browser found; pass --browser <path>");
}

/**
 * Minimal CDP client over the DevTools websocket.
 * @param {string} wsUrl
 */
async function connect(wsUrl) {
	const socket = new WebSocket(wsUrl);
	await new Promise((resolve, reject) => {
		socket.addEventListener("open", resolve, { once: true });
		socket.addEventListener("error", reject, { once: true });
	});
	let nextId = 0;
	const pending = new Map();
	socket.addEventListener("message", (event) => {
		const message = JSON.parse(event.data);
		const entry = pending.get(message.id);
		if (entry === undefined) return;
		pending.delete(message.id);
		if (message.error) entry.reject(new Error(message.error.message));
		else entry.resolve(message.result);
	});
	return {
		send(method, params = {}) {
			const id = (nextId += 1);
			socket.send(JSON.stringify({ id, method, params }));
			return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
		},
		close() {
			socket.close();
		},
	};
}

/**
 * Evaluate an expression in the page and return its JSON value.
 * @param {any} cdp
 * @param {string} expression
 */
async function evaluate(cdp, expression) {
	const result = await cdp.send("Runtime.evaluate", {
		expression,
		awaitPromise: true,
		returnByValue: true,
	});
	if (result.exceptionDetails) {
		throw new Error(
			"page threw: " +
				(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text),
		);
	}
	return result.result.value;
}

/**
 * Poll until the predicate holds or the deadline passes.
 * @param {() => Promise<boolean>} predicate
 * @param {number} timeoutMs
 */
async function until(predicate, timeoutMs) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (await predicate()) return true;
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
	return false;
}

const FIXTURE = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>mount check</title>
<style>
  /* The sidebar row webchat registers, parked where it cannot overlap the
     wordmark fixture. The row and its aria-label both carry the label. */
  #shell { position: fixed; left: 600px; top: 8px; width: 190px; }
  #shell button { display: flex; align-items: center; gap: 6px; }
</style>
</head>
<body>
<div id="surface"></div>
<div id="shell"><nav aria-label="全局面板">
  <button type="button" id="webchat-row" aria-label="Chat DeepSeek">
    <span aria-hidden="true" id="row-glyph"></span>
    <span id="row-title">Chat DeepSeek</span>
  </button>
  <button type="button" id="decoy-row" aria-label="Chat DeepSeek history">
    <span id="decoy-title">Chat DeepSeek history</span>
  </button>
</nav></div>
<script>
// A stand-in for the guest element. "webview" is not a valid custom element
// name (no hyphen), so the element is a plain unknown element whose four guest
// methods are attached per instance. Everything else in this page is real DOM.
window.__calls = [];
window.__inserts = [];
window.insertDelayMs = 0;

function standIn(url) {
  const element = document.createElement("webview");
  element.setAttribute("data-url", url);
  let current = url === "about:blank" ? null : url;
  const keys = new Set();
  element.getURL = () => {
    if (current === null) throw new Error("not attached yet");
    return current;
  };
  element.insertCSS = async (css) => {
    const key = "key-" + (window.__inserts.length + 1);
    if (window.insertDelayMs) await new Promise((r) => setTimeout(r, window.insertDelayMs));
    window.__inserts.push({ key, css, url: current });
    keys.add(key);
    return key;
  };
  element.removeInsertedCSS = async (key) => {
    if (!keys.has(key)) throw new Error("unknown key " + key);
    keys.delete(key);
    window.__calls.push({ op: "remove", key });
  };
  element.executeJavaScript = async () => {
    window.__calls.push({ op: "executeJavaScript" });
    throw new Error("the skin must never execute script in the guest");
  };
  return element;
}

window.mountGuest = (url) => {
  const element = standIn(url);
  document.getElementById("surface").appendChild(element);
  return element;
};
window.fireReady = (element) => element.dispatchEvent(new Event("dom-ready"));
window.fireLoad = (element) => element.dispatchEvent(new Event("did-finish-load"));
window.liveSheets = () => {
  const removed = new Set(window.__calls.filter((c) => c.op === "remove").map((c) => c.key));
  return window.__inserts.filter((insert) => !removed.has(insert.key));
};
</script>
</body>
</html>`;

const CHECKS = `(async () => {
  const results = [];
  const check = (name, ok, detail) => results.push({ name, ok: Boolean(ok), detail: detail ?? "" });

  const guest = window.mountGuest("https://chat.deepseek.com/a/chat/s/1");
  window.fireReady(guest);
  await new Promise((r) => setTimeout(r, 60));

  check("a guest that reaches dom-ready gets a sheet", window.__inserts.length === 1, "inserts=" + window.__inserts.length);
  check("the inserted text is the skin", window.__inserts[0]?.css.includes("data-ds-dark-theme"), "len=" + (window.__inserts[0]?.css.length ?? 0));
  check("the inserted sheet carries both theme scopes", window.__inserts[0]?.css.includes("body:not([data-ds-dark-theme])"), "len=" + (window.__inserts[0]?.css.length ?? 0));

  // A reload is a second load of the same element: the old sheet must go away.
  window.fireLoad(guest);
  await new Promise((r) => setTimeout(r, 60));
  check("a reload replaces the sheet instead of stacking it", window.liveSheets().length === 1, "live=" + window.liveSheets().length);
  check("the replaced key was actually removed", window.__calls.some((c) => c.op === "remove"), JSON.stringify(window.__calls));

  // A different site must be left alone.
  const other = window.mountGuest("https://example.com/");
  window.fireReady(other);
  await new Promise((r) => setTimeout(r, 60));
  check("a non-guest webview gets no sheet", window.__inserts.every((i) => i.url.includes("deepseek")), "urls=" + window.__inserts.map((i) => i.url).join(","));

  // A guest created after the plugin mounted must be picked up by the observer.
  const late = window.mountGuest("https://chat.deepseek.com/a/chat/s/2");
  const picked = await new Promise((resolve) => {
    const started = Date.now();
    const poll = setInterval(() => {
      if (window.__inserts.some((i) => i.url.endsWith("/2"))) { clearInterval(poll); resolve(true); }
      else if (Date.now() - started > 1500) { clearInterval(poll); resolve(false); }
    }, 50);
  });
  check("a guest created after mount is picked up", picked, "late=" + late.getAttribute("data-url"));

  // dom-ready and did-finish-load can arrive while insertCSS is still in flight.
  // With a slow insert, three overlapping triggers must still leave one sheet.
  window.insertDelayMs = 20;
  const race = window.mountGuest("https://chat.deepseek.com/a/chat/s/4");
  window.fireReady(race);
  window.fireLoad(race);
  await new Promise((r) => setTimeout(r, 200));
  const liveRace = window.liveSheets().filter((i) => i.url.endsWith("/4")).length;
  check("overlapping ready+load leaves exactly one sheet", liveRace === 1, "live=" + liveRace);

  check("nothing was executed inside the guest", !window.__calls.some((c) => c.op === "executeJavaScript"), JSON.stringify(window.__calls));

  // The host sidebar row: the label text and its aria-label are the only writes.
  const row = document.getElementById("webchat-row");
  const rowTitle = document.getElementById("row-title");
  check("the sidebar row says Chat, not Chat DeepSeek", rowTitle.textContent === "Chat", rowTitle.textContent);
  check("the row's aria-label is renamed in step", row.getAttribute("aria-label") === "Chat", row.getAttribute("aria-label"));
  check("the row keeps its glyph", document.getElementById("row-glyph") !== null && row.querySelector("span").getAttribute("aria-hidden") === "true");
  check("a longer label that merely shares the prefix is untouched", document.getElementById("decoy-title").textContent === "Chat DeepSeek history" && document.getElementById("decoy-row").getAttribute("aria-label") === "Chat DeepSeek history", document.getElementById("decoy-title").textContent);

  // Collapse unmounts the title span; expand adds a fresh one with the old text.
  rowTitle.remove();
  await new Promise((r) => setTimeout(r, 30));
  const rebuilt = document.createElement("span");
  rebuilt.id = "row-title";
  rebuilt.textContent = "Chat DeepSeek";
  row.appendChild(rebuilt);
  await new Promise((r) => setTimeout(r, 30));
  check("a re-rendered title is renamed again", rebuilt.textContent === "Chat", rebuilt.textContent);

  // A render that only changes the label reuses the text node (React writes
  // nodeValue), which is not a childList mutation.
  rebuilt.firstChild.data = "Chat DeepSeek";
  await new Promise((r) => setTimeout(r, 30));
  check("an in-place label update is renamed again", rebuilt.textContent === "Chat", rebuilt.textContent);

  // The collapsed-rail tooltip is the same copy in its own wrapper.
  const tip = document.createElement("div");
  tip.id = "tooltip";
  tip.innerHTML = "<span>Chat DeepSeek</span>";
  document.getElementById("shell").appendChild(tip);
  await new Promise((r) => setTimeout(r, 30));
  check("the rail tooltip copy is renamed too", tip.textContent === "Chat", tip.textContent);

  return results;
})()`;

/**
 * Apply the sheet the injector actually produced to a fixture document shaped
 * like the site's brand surfaces, and read back what the engine computed. The
 * fixture copies the site's 143x23 lockup, its two mark-only whale logos
 * (27x24 sidebar header, 35x26 welcome screen), and keeps a generic 16x16 icon
 * next to them as the decoy. Click handlers sit on the containers, as they do
 * on the site.
 */
const WORDMARK_SETUP = `(async () => {
  const results = [];
  const check = (name, ok, detail) => results.push({ name, ok: Boolean(ok), detail: detail ?? "" });

  const css = window.__inserts[0]?.css ?? "";
  const style = document.createElement("style");
  style.id = "wordmark-fixture-sheet";
  style.textContent = css;
  document.head.appendChild(style);
  document.body.setAttribute("data-ds-dark-theme", "");

  const surface = document.getElementById("surface");
  const host = document.createElement("div");
  host.id = "wordmark-host";
  host.style.cssText = "position:fixed;left:8px;top:8px;width:143px;height:23px";
  host.innerHTML = '<svg id="wordmark" width="143" height="23" viewBox="0 0 143 23" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_dseek_full)"><path id="wordmark-path" d="M0 0h10v10H0z" fill="currentColor"></path></g><defs><clipPath id="clip0_dseek_full"><rect width="10" height="10"></rect></clipPath></defs></svg>';
  window.__wordmarkClicks = 0;
  host.addEventListener("click", () => { window.__wordmarkClicks += 1; });
  surface.appendChild(host);

  const decoyHost = document.createElement("div");
  decoyHost.id = "decoy-host";
  decoyHost.style.cssText = "position:fixed;left:8px;top:48px;width:16px;height:16px";
  decoyHost.innerHTML = '<svg id="decoy-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path id="decoy-path" d="M0 0h16v16H0z" fill="currentColor"></path></svg>';
  surface.appendChild(decoyHost);

  const marks = [
    { id: "sidebar-mark", viewBox: "0 0 27 24", width: 27, height: 24, top: 80 },
    { id: "welcome-mark", viewBox: "0 0 35 26", width: 35, height: 26, top: 120 },
  ];
  window.__markClicks = {};
  for (const mark of marks) {
    const markHost = document.createElement("div");
    markHost.id = mark.id + "-host";
    markHost.style.cssText = "position:fixed;left:8px;top:" + mark.top + "px;width:" + mark.width + "px;height:" + mark.height + "px";
    markHost.innerHTML = '<svg id="' + mark.id + '" width="' + mark.width + '" height="' + mark.height + '" viewBox="' + mark.viewBox + '" fill="none" xmlns="http://www.w3.org/2000/svg"><path id="' + mark.id + '-path" d="M0 0h10v10H0z" fill="currentColor"></path></svg>';
    window.__markClicks[mark.id] = 0;
    markHost.addEventListener("click", () => { window.__markClicks[mark.id] += 1; });
    surface.appendChild(markHost);
  }

  const codeHost = document.createElement("div");
  codeHost.id = "code-host";
  codeHost.style.cssText = "position:fixed;left:8px;top:160px;width:220px";
  codeHost.innerHTML =
    '<div class="md-code-block md-code-block-dark"><pre class="language-js" id="dark-pre"><code class="language-js">x</code></pre></div>' +
    '<div class="md-code-block md-code-block-light"><pre class="language-js" id="light-pre"><code class="language-js">x</code></pre></div>';
  surface.appendChild(codeHost);

  const brand = document.getElementById("wordmark");
  const brandStyle = getComputedStyle(brand);
  const rect = brand.getBoundingClientRect();
  const point = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
  const hit = point === brand ? "wordmark" : point === host ? "host" : point ? (point.id || point.tagName) : "none";

  const readArtwork = async (svgStyle) => {
    const raw = svgStyle.backgroundImage.slice(svgStyle.backgroundImage.indexOf("data:"), svgStyle.backgroundImage.lastIndexOf('"'));
    const decoded = decodeURIComponent(raw);
    const image = new Image();
    image.src = raw;
    await image.decode();
    return { decoded, drawable: image.naturalWidth > 0 };
  };

  let artwork = { decoded: "", drawable: false };
  try {
    artwork = await readArtwork(brandStyle);
  } catch (error) {
    artwork = { decoded: "error: " + error.message, drawable: false };
  }
  const decoded = artwork.decoded;
  const drawable = artwork.drawable;

  const decoyStyle = getComputedStyle(document.getElementById("decoy-icon"));
  check("the brand svg is painted with a Claude lockup data URI", brandStyle.backgroundImage.startsWith('url("data:image/svg+xml,'), brandStyle.backgroundImage.slice(0, 60));
  check("the lockup data URI decodes to a drawable image", drawable, decoded.slice(0, 80));
  check("the lockup box fits the whole drawing, starburst included", decoded.includes('viewBox="0 -0.245 5.9773 1.49"'), decoded.slice(0, 80));
  check("the wordmark carries the accent, never currentColor", decoded.includes('fill="#d97757"') && !decoded.includes("currentColor"), decoded.slice(0, 80));
  check("the original wordmark graphics are hidden, not removed", brand.querySelector("path") !== null && getComputedStyle(brand.querySelector("path")).visibility === "hidden");
  check("the svg keeps its 143x23 box", Math.round(rect.width) === 143 && Math.round(rect.height) === 23, rect.width + "x" + rect.height);
  check("the wordmark is left-aligned in its box", brandStyle.backgroundPosition === "0% 50%", brandStyle.backgroundPosition);
  check("a 16x16 icon with the same structure is untouched", decoyStyle.backgroundImage === "none" && getComputedStyle(document.getElementById("decoy-path")).visibility === "visible", decoyStyle.backgroundImage);
  check("the click point lands on the wordmark or its container", hit === "wordmark" || hit === "host", hit);

  const markBoxes = [];
  for (const mark of marks) {
    const svg = document.getElementById(mark.id);
    const svgStyle = getComputedStyle(svg);
    const svgRect = svg.getBoundingClientRect();
    let markArtwork = { decoded: "", drawable: false };
    try {
      markArtwork = await readArtwork(svgStyle);
    } catch (error) {
      markArtwork = { decoded: "error: " + error.message, drawable: false };
    }
    check("the " + mark.id + " is painted with a Claude mark data URI", svgStyle.backgroundImage.startsWith('url("data:image/svg+xml,'), svgStyle.backgroundImage.slice(0, 60));
    check("the " + mark.id + " data URI decodes to a drawable image", markArtwork.drawable, markArtwork.decoded.slice(0, 80));
    check("the " + mark.id + " is the starburst alone, in the accent", (markArtwork.decoded.match(/<path /g) ?? []).length === 1 && markArtwork.decoded.includes('fill="#d97757"') && !markArtwork.decoded.includes("currentColor"), markArtwork.decoded.slice(0, 80));
    check("the " + mark.id + " original graphics are hidden, not removed", svg.querySelector("path") !== null && getComputedStyle(svg.querySelector("path")).visibility === "hidden");
    check("the " + mark.id + " keeps its " + mark.width + "x" + mark.height + " box", Math.round(svgRect.width) === mark.width && Math.round(svgRect.height) === mark.height, svgRect.width + "x" + svgRect.height);
    check("the " + mark.id + " is centred in its box", svgStyle.backgroundPosition === "50% 50%", svgStyle.backgroundPosition);
    markBoxes.push({ id: mark.id, x: svgRect.x, y: svgRect.y, width: svgRect.width, height: svgRect.height });
  }

  const tokensOf = () => {
    const style = getComputedStyle(document.body);
    const read = (name) => style.getPropertyValue(name).trim();
    return {
      base: read("--dsw-alias-bg-base"),
      layer: read("--dsw-alias-bg-layer-1"),
      text: read("--dsw-alias-label-primary"),
      brandText: read("--dsw-alias-brand-text"),
    };
  };
  const codeOf = (preId) => {
    const style = getComputedStyle(document.getElementById(preId));
    return { background: style.backgroundColor, color: style.color };
  };
  const artworkOf = (id, pathId) => ({
    background: getComputedStyle(document.getElementById(id)).backgroundImage,
    hidden: getComputedStyle(document.getElementById(pathId)).visibility,
  });
  const snapshot = () => ({
    tokens: tokensOf(),
    darkCode: codeOf("dark-pre"),
    lightCode: codeOf("light-pre"),
    wordmark: artworkOf("wordmark", "wordmark-path"),
    marks: [artworkOf("sidebar-mark", "sidebar-mark-path"), artworkOf("welcome-mark", "welcome-mark-path")],
  });

  const darkTheme = snapshot();
  document.body.removeAttribute("data-ds-dark-theme");
  const lightTheme = snapshot();
  document.body.setAttribute("data-ds-dark-theme", "");
  const backToDark = tokensOf();

  return {
    results,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    marks: markBoxes,
    darkTheme,
    lightTheme,
    backToDark,
  };
})()`;

const WORDMARK_TEARDOWN = `(() => {
  document.getElementById("wordmark-fixture-sheet")?.remove();
  document.getElementById("wordmark-host")?.remove();
  document.getElementById("decoy-host")?.remove();
  document.getElementById("sidebar-mark-host")?.remove();
  document.getElementById("welcome-mark-host")?.remove();
  document.getElementById("code-host")?.remove();
  document.body.removeAttribute("data-ds-dark-theme");
  return true;
})()`;

async function main() {
	const browser = findBrowser();
	const profileDir = await mkdtemp(join(tmpdir(), "dsh-skin-mount-"));
	const pagePath = join(profileDir, "fixture.html");
	const bundle = await readFile(join(packageRoot, "client.js"), "utf8");

	await writeFile(pagePath, FIXTURE, "utf8");
	const port = 9421 + Math.floor(Math.random() * 60);
	const child = spawn(
		browser,
		[
			"--headless=new",
			"--no-sandbox",
			"--disable-crashpad",
			"--disable-gpu",
			"--remote-debugging-port=" + port,
			"--remote-allow-origins=*",
			"--user-data-dir=" + profileDir,
			"file:///" + pagePath.replaceAll("\\", "/"),
		],
		{ stdio: "ignore" },
	);

	let cdp;
	try {
		const target = await until(async () => {
			try {
				const response = await fetch("http://127.0.0.1:" + port + "/json/list");
				const list = await response.json();
				return list.find((entry) => entry.type === "page") ?? false;
			} catch {
				return false;
			}
		}, 15000);
		if (!target) throw new Error("the browser never exposed a page target");

		const list = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
		const page = list.find((entry) => entry.type === "page");
		cdp = await connect(page.webSocketDebuggerUrl);
		await cdp.send("Runtime.enable");

		// Install the loader facade the host provides, then run the bundle.
		await evaluate(
			cdp,
			`(() => {
				window.__loaded = [];
				window.__ModuleLoader__ = {
					load(definition) { window.__loaded.push(definition); },
				};
				return true;
			})()`,
		);
		await evaluate(cdp, bundle);

		const registered = await evaluate(cdp, "window.__loaded.map((d) => d.id)");
		const definitions = await evaluate(cdp, "window.__loaded.length");
		if (definitions !== 1 || registered[0] !== "dsh-deepseek-webchat-claude-skin") {
			throw new Error("bundle did not register itself: " + JSON.stringify(registered));
		}

		// Mount the way the loader does, with a ctx.effect that keeps the cleanup.
		await evaluate(
			cdp,
			`(() => {
				const definition = window.__loaded[0];
				const moduleExports = definition.factory(() => { throw new Error("no requires expected"); });
				if (typeof moduleExports.apply !== "function") throw new Error("no apply export");
				if (!Array.isArray(moduleExports.inject)) throw new Error("no inject export");
				window.__cleanups = [];
				moduleExports.apply({
					effect(fn, label) {
						const dispose = fn();
						window.__cleanups.push({ fn: dispose, label });
					},
				});
				return true;
			})()`,
		);

		const results = await evaluate(cdp, CHECKS);
		let failed = 0;
		const expect = (name, ok, detail) => {
			if (!ok) failed += 1;
			console.log((ok ? "  ok   " : "  FAIL ") + name + (ok ? "" : " — " + (detail ?? "")));
		};
		for (const result of results) {
			if (!result.ok) failed += 1;
			console.log((result.ok ? "  ok   " : "  FAIL ") + result.name + (result.ok ? "" : " — " + result.detail));
		}

		// Cleanup must release the listeners and take its sheets back out.
		const cleanup = await evaluate(
			cdp,
			`(async () => {
				for (const entry of window.__cleanups) entry.fn();
				await new Promise((resolve) => setTimeout(resolve, 50));
				const live = window.liveSheets().length;
				const before = window.__inserts.length;
				window.fireLoad(window.mountGuest("https://chat.deepseek.com/a/chat/s/3"));
				await new Promise((resolve) => setTimeout(resolve, 50));
				return {
					listeners: window.__inserts.length === before,
					live,
					label: {
						title: document.getElementById("row-title")?.textContent,
						aria: document.getElementById("webchat-row")?.getAttribute("aria-label"),
						tooltip: document.getElementById("tooltip")?.textContent,
						decoy: document.getElementById("decoy-title")?.textContent,
					},
				};
			})()`,
		);
		if (!cleanup.listeners) {
			failed += 1;
			console.log("  FAIL cleanup released the listeners");
		} else {
			console.log("  ok   cleanup released the listeners");
		}
		if (cleanup.live !== 0) {
			failed += 1;
			console.log("  FAIL cleanup removed the inserted sheets — live=" + cleanup.live);
		} else {
			console.log("  ok   cleanup removed the inserted sheets");
		}

		if (
			cleanup.label.title !== "Chat DeepSeek" ||
			cleanup.label.aria !== "Chat DeepSeek" ||
			cleanup.label.tooltip !== "Chat DeepSeek" ||
			cleanup.label.decoy !== "Chat DeepSeek history"
		) {
			failed += 1;
			console.log("  FAIL cleanup restored the sidebar label — " + JSON.stringify(cleanup.label));
		} else {
			console.log("  ok   cleanup restored the sidebar label");
		}

		// Wordmark: apply the sheet the injector actually produced to a fixture
		// shaped like the site's brand container, then click it with a real
		// input event — the handler lives on the parent and must still fire.
		const wordmark = await evaluate(cdp, WORDMARK_SETUP);
		for (const result of wordmark.results) {
			if (!result.ok) failed += 1;
			console.log(
				(result.ok ? "  ok   " : "  FAIL ") + result.name + (result.ok ? "" : " — " + result.detail),
			);
		}

		const clickAt = async (rect) => {
			const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
			await cdp.send("Input.dispatchMouseEvent", {
				type: "mousePressed",
				x: point.x,
				y: point.y,
				button: "left",
				clickCount: 1,
			});
			await cdp.send("Input.dispatchMouseEvent", {
				type: "mouseReleased",
				x: point.x,
				y: point.y,
				button: "left",
				clickCount: 1,
			});
		};

		await clickAt(wordmark.rect);
		const clicks = await evaluate(cdp, "window.__wordmarkClicks");
		if (clicks !== 1) {
			failed += 1;
			console.log("  FAIL clicking the wordmark still reaches the container — clicks=" + clicks);
		} else {
			console.log("  ok   clicking the wordmark still reaches the container");
		}

		for (const mark of wordmark.marks) {
			await clickAt(mark);
			const markClicks = await evaluate(cdp, `window.__markClicks["${mark.id}"]`);
			if (markClicks !== 1) {
				failed += 1;
				console.log(`  FAIL clicking the ${mark.id} still reaches its container — clicks=` + markClicks);
			} else {
				console.log(`  ok   clicking the ${mark.id} still reaches its container`);
			}
		}

		const { darkTheme, lightTheme, backToDark } = wordmark;
		expect(
			"the dark theme resolves Claude's near-black canvas",
			darkTheme.tokens.base === "#191919" && darkTheme.tokens.layer === "#212121",
			JSON.stringify(darkTheme.tokens),
		);
		expect(
			"the light theme resolves Claude's paper canvas",
			lightTheme.tokens.base === "#faf9f5" && lightTheme.tokens.layer === "#f5f2ec",
			JSON.stringify(lightTheme.tokens),
		);
		expect(
			"the light theme's text is warm ink and its accent clears AA",
			lightTheme.tokens.text === "#141413" && lightTheme.tokens.brandText === "#a8543a",
			JSON.stringify(lightTheme.tokens),
		);
		expect(
			"switching back restores the dark palette with no residue",
			backToDark.base === "#191919" && backToDark.text === "#fdfdfd",
			JSON.stringify(backToDark),
		);
		expect(
			"the dark code block takes Claude's layer-1 surface",
			darkTheme.darkCode.background === "rgb(33, 33, 33)" && darkTheme.darkCode.color === "rgb(237, 233, 234)",
			JSON.stringify(darkTheme.darkCode),
		);
		expect(
			"the light code block takes Claude's paper surface",
			lightTheme.lightCode.background === "rgb(245, 242, 236)" &&
				lightTheme.lightCode.color === "rgb(43, 42, 39)",
			JSON.stringify(lightTheme.lightCode),
		);
		expect(
			"each code block is painted only by its own theme",
			darkTheme.lightCode.background === "rgba(0, 0, 0, 0)" &&
				lightTheme.darkCode.background === "rgba(0, 0, 0, 0)",
			JSON.stringify({ dark: darkTheme.lightCode, light: lightTheme.darkCode }),
		);
		const lightArtwork = [lightTheme.wordmark, ...lightTheme.marks];
		expect(
			"light mode paints the Claude brand artwork too",
			lightArtwork.every(
				(entry) => entry.background.startsWith('url("data:image/svg+xml,') && entry.hidden === "hidden",
			),
			JSON.stringify(lightTheme.wordmark),
		);
		await evaluate(cdp, WORDMARK_TEARDOWN);

		if (failed > 0) {
			console.log("\nmount check failed: " + failed + " assertion(s)");
			process.exitCode = 1;
		} else {
			console.log("\nmount check passed");
		}
	} finally {
		cdp?.close();
		child.kill();
		await new Promise((resolve) => setTimeout(resolve, 300));
		await rm(profileDir, { recursive: true, force: true, maxRetries: 5 }).catch(() => {});
	}
}

await main();
