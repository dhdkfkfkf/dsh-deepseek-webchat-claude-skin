# dsh-deepseek-webchat-claude-skin

The Claude look for the DeepSeek panel: a dark and light skin for the DeepSeek
page that
[`@jaychang1989/dsh-webchat`](https://github.com/jaychang1989/dsh-webchat) embeds
in a `<webview>`, plus the sidebar rename that carries the rebrand to the panel
edge.

One profile, two jobs: webchat keeps owning the embed and its updates, this
package owns the paint. It does not vendor, patch or re-export webchat, so the
two release independently.

At a glance:

- **What changes**: two colour palettes, the brand artwork, the code-block
  surfaces, the "thinking" fade, and one host-side label.
- **How**: a single CSS text handed to the webview's own `insertCSS`, plus one
  text-node rename in the DSH document. Nothing else crosses a boundary.
- **What it cannot do**: touch the guest DOM, the network, cookies, storage, the
  user agent or the login flow, or run script in the guest.
- **Dependencies**: none. Six files, no install scripts, one readable generated
  bundle.
- **Evidence**: 42 code-level tests and a real-Chromium mount check, both behind
  `npm run verify`.


## What changed recently

**0.3.3 — README only**

No code change. The release notes below were rewritten for someone installing
the plugin rather than someone reading the fix, and the install command at the
top no longer points at an old version.

**0.3.2 — the sidebar now says "Chat"**

The row used to stay "Chat DeepSeek" no matter what you did. The plugin watched
one node, but the sidebar row turns up six levels below it, and the old code only
looked two levels down. The first sweep at startup missed it too, because the
sidebar has not been drawn yet at that point. So both attempts came up empty and
the label never changed.

It now searches the whole subtree with no depth limit and repeats that on every
change, so the row stays renamed across re-renders, collapses and tooltip
rebuilds. There is a regression test that puts the row five wrappers deep.

**0.3.1 — the sidebar row renames, and a light theme**

Adds the light palette and the Claude wordmark on the DeepSeek page, and fixes
the sidebar row going back to "Chat DeepSeek" after the panel re-rendered: React
reuses the existing text node when only the label changes, so the observer never
saw those updates and the rename was applied once at mount and then quietly
overwritten. The observer now also watches character data. (0.3.2 found a second,
deeper cause for the same symptom — see above.)

**0.3.0 — first release**

Dark and light Claude palettes for the DeepSeek page, the brand artwork, and the
code-block surfaces.

## Install

Webchat is the page; this one is the paint. Pick the block that matches your
setup, with DSH fully closed.

### Already have the panel

```sh
dsh plugin --profile desktop add https://github.com/dhdkfkfkf/dsh-deepseek-webchat-claude-skin/releases/download/v0.3.2/dsh-deepseek-webchat-claude-skin-0.3.2.tgz
```

### Fresh install

One command brings both. The plugin manager mounts every newly installed direct
dependency that declares a bundle patch, so the panel and the skin are registered
in the same pass — there is no second step:

```sh
dsh plugin --profile desktop add @jaychang1989/dsh-webchat https://github.com/dhdkfkfkf/dsh-deepseek-webchat-claude-skin/releases/download/v0.3.2/dsh-deepseek-webchat-claude-skin-0.3.2.tgz
```

Then start DSH. Adding or removing a bundle is a boot-time decision; editing an
already-installed package's patch is picked up live, installing is not.

### Optional: panel geometry fix

Only if a fullscreen or window toggle leaves the DeepSeek panel at stale bounds
until you reload it. This is a separate package, not a dependency of the skin,
and neither needs the other:

```sh
dsh plugin --profile desktop add https://github.com/dhdkfkfkf/dsh-webchat-anchor-fix/releases/download/v0.1.0/dsh-webchat-anchor-fix-0.1.0.tgz
```

**Caution:** install it for that symptom only. If the panel already keeps its
bounds, the fix has nothing to correct — it adds a second host-side stylesheet
and a second thing to keep up to date. Do not treat it as part of the skin.

Notes:

- **Mainland China**: prefix a release URL with `https://gh-proxy.com/`, the
  same way other DSH plugins are distributed here.
- **Upgrading from `dsh-deepseek-claude-skin`** (the pre-release name): remove
  that dependency and its `dsh.profile.bundles` entry before adding this one.
  Two bundles claiming one loader id stop the boot.
- **Local development**: `npm run pack`, then
  `dsh plugin --profile desktop add <path-to-tgz>`.

## What it changes

This is the complete list. Everything is a stylesheet rule in the guest, except
the last row, which is DSH chrome.

| Where | Surface | Change | Anchored on |
| --- | --- | --- | --- |
| guest | design tokens | 98 custom properties per theme: 30 static scale stops, 67 semantic aliases, the "thinking" gradient | `body[data-ds-dark-theme]` / `body:not([data-ds-dark-theme])` |
| guest | brand artwork | the 143x23 lockup and the two marks (27x24, 35x26) replaced by the Claude lockup and starburst, inlined as data URIs | the `viewBox` attribute |
| guest | code blocks | per-theme surface, text and selection colours; the dark toolbar button recoloured | `.md-code-block-dark` / `.md-code-block-light` |
| host | sidebar row | "Chat DeepSeek" → "Chat", in the label's text node and its `aria-label` | the exact label string |

**Tokens.** The 30 static stops remap the site's neutral ramps to a warm
Claude-neutral ramp and its accent family to terracotta. The 67 aliases cover
canvas and surface layers, the four label levels, borders, the brand family,
button fills, interaction tints, markdown surfaces, sidebar, bubbles, composer,
scrollbars, toast and tooltip. Every declaration is `!important`, because the
site sets the same names from its own variable block and would otherwise win.

The site has exactly two theme states and marks them by toggling
`data-ds-dark-theme` on `<body>`; there is no light attribute and no
`prefers-color-scheme` signal. So there are two palettes, scoped to that
attribute and its absence, and only one can ever match. Switching themes is a
cascade change: no observer, no re-injection.

**Palette.** Dark is Claude's near-black canvas (`#191919`, layers at `#212121`).
Light is Claude's paper ramp (`#faf9f5` canvas, warm ink text) with the same
terracotta accent (`#d97757`). Light text tokens are chosen to clear WCAG AA on
the light surfaces; the accent *text* stop is darker than the fill stop, exactly
as the site itself does it. White on the accent fill measures 3.12:1 — that is a
UI component, not body text, and the one deliberate sub-AA pairing in the skin.

**Brand.** The artwork is inlined, so no request leaves the page. Painting and
hiding share the same `viewBox` selector: if upstream changes that markup, both
go dormant together, so the skin cannot hide an SVG it did not replace. The
lockup's box is widened to fit the whole starburst; the marks take the starburst
alone, centred. The originals are hidden rather than removed, so the containers
keep their click handlers (navigate home / open sign-in). The 16x16 icon family
is generic UI iconography and is left alone, as are the login pages' own brand
surfaces (34x29 mark, 182x29 lockup). The art is unscoped: `#d97757` reads on
paper as well as on ink.

**Untouched on purpose.** Error, success and warning colours (the red, green and
amber ramps and `--dsw-alias-state-error` are never redefined); the font family
token; the 16x16 icons; the site's DOM. The sign-in page is recoloured by the
same tokens as the rest of the page, but no control on it is hidden, moved,
disabled or reworded.

## What it never does

- No DOM edits in the guest. No node is added, removed, moved or restyled inline.
  The only guest write is a stylesheet.
- No network. No `fetch`, XHR, WebSocket, EventSource or beacon; no remote URL in
  the sheet (SVG data URIs only); no fonts, no images.
- No cookie, `localStorage`, `sessionStorage` or `indexedDB` access; no
  `navigator.userAgent` read or override.
- No script execution in the guest, no `executeJavaScript`, no text or input
  injection, no navigation (`window.open`, `location.href/assign/replace`).
- No login-state automation. It never reads, drives or clears a session, and no
  selector targets a login, captcha, challenge, verification, dialog, toast,
  alert, error, warning or form surface.
- No hiding, moving or disabling site UI. The allowed properties are
  `background*`, `color`, `visibility` and custom properties — no `position`,
  `z-index`, `pointer-events`, `display` or `opacity`.
- No host rewrite beyond the one sidebar label. No nodes are created or moved;
  no class, style or handler is touched.

That restraint is not decoration. The DeepSeek page decides whether a client
looks like a supported browser, and webchat already negotiates that boundary
carefully. A skin has no business joining that conversation.

## Safety: threat model and evidence

| Risk | Why it cannot happen here | Pinned by |
| --- | --- | --- |
| Session or credential exfiltration | no network primitive, no cookie/storage API, no guest script; the guest receives CSS, never code | source scan over every shipped file, including the generated bundle |
| DeepSeek risk-control or login interference | origin pinned to `https://chat.deepseek.com`; no navigation, no input, no session access; no selector aimed at login/verification surfaces | origin tests, selector scan, property allowlist |
| Hiding, moving or breaking site UI | property allowlist excludes layout and hit-testing; `visibility` is used only on the three brand SVGs' children; clicks are preserved | CSS scan and real mouse clicks in Chromium |
| Breaking the DSH host | writes only one text node and one `aria-label`; the observer stops at depth 2; cleanup restores the original text | `src/shell.js` scan and mount-check restore |
| Install-time or supply-chain execution | zero dependencies, no `preinstall`/`install`/`postinstall` scripts, six files in the tarball | `package.json` and `npm pack` listing |

### Reproduce it

```sh
npm test            # 42 tests, plain Node, no browser
npm run test:mount  # loads the built bundle into real Chromium
npm run verify      # both, plus a fresh build
```

`npm test` decides, from the shipped code itself:

- the sheet builder's output, and that every declaration in the sheet is one of
  the allowed properties;
- `visibility` appears only in the three brand-SVG child rules, and every rule
  is scoped to one of the two theme scopes or one of the three `viewBox` anchors;
- no selector contains `login`, `captcha`, `challenge`, `verify`, `dialog`,
  `modal`, `toast`, `alert`, `error`, `warning`, `form`, `iframe`, `webview`,
  `[role=`, `[aria-` or `:has(`;
- no remote URL and no non-SVG data URI;
- both palettes define exactly the same 98 token names, every declaration is
  `!important`, and light text clears its contrast targets;
- the shipped sources (including `client.js`) contain no network, storage,
  cookie, UA, script-execution or navigation API, no `eval`, no `Function`;
- the injector calls only `addEventListener`, `getAttribute`, `getURL`,
  `insertCSS`, `removeEventListener`, `removeInsertedCSS` on the webview;
- the injector performs no DOM writes;
- `src/shell.js` writes exactly the text node and the `aria-label`.

`npm run test:mount` loads the actual built bundle into a real page with a
stand-in guest and asserts on what it did: a guest gets a sheet, a reload
replaces rather than stacks, a non-guest is left alone, a late guest is picked
up, the guest's script hook is never called, and cleanup releases the listeners
and removes the sheet. It then checks the host rename (label, `aria-label`, a
re-rendered title, the rail tooltip, an untouched longer label, restore on
cleanup), and applies the exact sheet the injector produced to fixtures shaped
like the brand surfaces and code blocks: both palettes resolve their own canvas
values and swap cleanly, each code block is painted only by its own theme, the
brand art paints and decodes, the 16x16 decoy stays untouched, and a real mouse
click on each brand surface still reaches its container.

`client.js` is generated but not minified, and it is the only file that ever runs
in the browser — you can read it before trusting it.

### What this does not prove

The tests pin what the code *can* do, from the shipped bytes. They do not prove
how a particular account's page behaves server-side. A live-account sign-off is
still on the list, and it is the one check that needs a human.

If DeepSeek changes its markup, the affected rule goes dormant — a stale
`viewBox` paints and hides nothing, a renamed code-block class falls back to the
site's own colours. A cosmetic gap is the intended failure mode; a broken panel
is not.

## How it finds the guest

By origin: any `<webview>` whose current URL has the origin
`https://chat.deepseek.com`.

Not by the private attribute the host happens to tag its webview with. That
attribute is an internal of another package; the origin is the real contract —
"the page we skin is the DeepSeek page".

A webview created before this plugin mounts, after it mounts, or reloaded by the
host is handled the same way: `dom-ready` and `did-finish-load` both trigger an
insert. The host reloads the guest once after restoring the login session, so a
one-shot insert would evaporate; re-inserting is safe because the previous key
is removed first and the sheet never accumulates.

## When it does not work

It stays dormant and says so once, after four seconds, in the console. It never
throws into the host surface.

That asymmetry is deliberate. A skin that silently does nothing is a cosmetic
bug. A skin that breaks the panel is a broken app.

## Host chrome

The panel's sidebar row is DSH chrome, not part of the guest, and webchat
hard-codes its label as "Chat DeepSeek" in every locale with no config or slot
option. This package renames it to "Chat" so the rebrand does not stop at the
panel edge.

The rename is text-only, in the host document:

- the label's text node, and the `aria-label` on the row's button, are rewritten;
- no nodes are added, moved or removed; no class, style or handler is touched;
- the match is exact, so another plugin's longer label or the transient
  "已打开 Chat DeepSeek" notice is untouched;
- a `MutationObserver` re-applies it when the sidebar collapses or expands or the
  rail tooltip is created, and the cleanup restores the original text.

Like the injector, it is keyed on a string rather than a build hash: if webchat
renames the row, the rename goes dormant instead of rewriting the wrong node.

## Layout

| Path | What it is |
| --- | --- |
| `src/sheet.js` | CSS text assembly: rules, sections, string escaping |
| `src/brand.js` | The Claude lockup and marks, inlined as accent-coloured data URIs |
| `src/skin.js` | The skin definition — which rules, in which order |
| `src/shell.js` | Host-surface copy: renames the sidebar row |
| `src/inject.js` | Finding the guest and delivering the sheet |
| `client.js` | Generated browser bundle; do not edit |
| `index.js` | Host half; a no-op, because the skin is browser-only |
| `test/` | `node --test` suites |
| `scripts/build.mjs` | Flattens `src/` into `client.js` |
| `scripts/mount-check.mjs` | Real-browser behaviour check |

The mount check needs a Chromium-family browser. It finds Edge or Chrome in the
usual places, or takes `--browser <path>`.

Unofficial; not affiliated with DeepSeek or Anthropic.
