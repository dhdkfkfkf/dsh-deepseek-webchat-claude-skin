/**
 * Probe: does the selector this skin depends on actually match, in a real
 * engine, against SVG created the way the site creates it?
 *
 * The site builds its wordmark with React, which reaches the DOM as
 * `setAttribute("viewBox", ...)` on an SVG-namespaced element. Two things could
 * go wrong and neither is answerable from reading code:
 *
 *   1. the attribute name might be lowercased, so a `[viewBox]` selector would
 *      miss it;
 *   2. the selector might match something it should not.
 *
 * So this drives a real browser and reports what it finds. It is a measurement,
 * not a test: it prints, it does not assert a product requirement.
 *
 * Usage: node scripts/probe-selectors.mjs [--browser <path>]
 */

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const CANDIDATES = [
	process.env.DSH_EDGE,
	"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	"C:/Program Files/Microsoft/Edge/Application/msedge.exe",
	"C:/Program Files/Google/Chrome/Application/chrome.exe",
];

function findBrowser() {
	const explicit = process.argv.indexOf("--browser");
	if (explicit !== -1 && process.argv[explicit + 1]) return process.argv[explicit + 1];
	for (const candidate of CANDIDATES) if (candidate && existsSync(candidate)) return candidate;
	throw new Error("no Chromium-family browser found; pass --browser <path>");
}

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

async function evaluate(cdp, expression) {
	const result = await cdp.send("Runtime.evaluate", {
		expression,
		awaitPromise: true,
		returnByValue: true,
	});
	if (result.exceptionDetails) {
		throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
	}
	return result.result.value;
}

const PROBE = await readFile(join(here, "probe-payload.js"), "utf8");

async function main() {
	const browser = findBrowser();
	const profileDir = await mkdtemp(join(tmpdir(), "dsh-skin-probe-"));
	const pagePath = join(profileDir, "probe.html");
	await writeFile(pagePath, "<!doctype html><html><body></body></html>", "utf8");

	const port = 9500 + Math.floor(Math.random() * 60);
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
		const deadline = Date.now() + 15000;
		let page;
		while (Date.now() < deadline) {
			try {
				const list = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
				page = list.find((entry) => entry.type === "page");
				if (page) break;
			} catch {}
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
		if (!page) throw new Error("the browser never exposed a page target");

		cdp = await connect(page.webSocketDebuggerUrl);
		await cdp.send("Runtime.enable");
		const report = await evaluate(cdp, PROBE);
		console.log(JSON.stringify(report, null, 2));
	} finally {
		cdp?.close();
		child.kill();
		await new Promise((resolve) => setTimeout(resolve, 300));
		await rm(profileDir, { recursive: true, force: true, maxRetries: 5 }).catch(() => {});
	}
}

await main();
