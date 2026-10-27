(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const report = {};

  // 1. The React path: createElementNS + setAttribute, exactly what jsx() does.
  const brand = document.createElementNS(SVG_NS, "svg");
  brand.setAttribute("viewBox", "0 0 143 23");
  brand.setAttribute("width", "143");
  brand.setAttribute("height", "23");
  document.body.appendChild(brand);
  report.reactAttributeNames = [...brand.attributes].map((a) => a.name);

  // 2. The innerHTML path: the HTML parser lowercases, then SVG attribute
  //    adjustment puts the canonical case back.
  const holder = document.createElement("div");
  holder.innerHTML = '<svg viewbox="0 0 143 23"><path d="M0 0h1v1H0z"/></svg>';
  document.body.appendChild(holder);
  const parsed = holder.querySelector("svg");
  report.parsedAttributeNames = [...parsed.attributes].map((a) => a.name);

  // 3. A decoy at a different size, to prove the selector is not greedy.
  const decoy = document.createElementNS(SVG_NS, "svg");
  decoy.setAttribute("viewBox", "0 0 16 16");
  document.body.appendChild(decoy);

  const select = (css) => {
    try { return document.querySelectorAll(css).length; } catch (e) { return "error: " + e.message; }
  };
  report.selectorExact = select('svg[viewBox="0 0 143 23"]');
  report.selectorLower = select('svg[viewbox="0 0 143 23"]');
  report.selectorInsensitive = select('svg[viewBox="0 0 143 23" i]');
  report.selectorDecoyOnly = select('svg[viewBox="0 0 16 16"]');
  report.hasAttributeUpper = brand.hasAttribute("viewBox");
  report.hasAttributeLower = brand.hasAttribute("viewbox");

  // 4. Does the replacement mechanism paint? Parent + hidden child + ::before.
  const parent = document.createElement("div");
  parent.style.width = "143px";
  parent.style.height = "23px";
  const child = document.createElementNS(SVG_NS, "svg");
  child.setAttribute("viewBox", "0 0 143 23");
  parent.appendChild(child);
  parent.id = "probe-parent";
  document.body.appendChild(parent);

  const style = document.createElement("style");
  style.textContent =
    '#probe-parent > svg[viewBox="0 0 143 23"] { visibility: hidden; }\n' +
    '#probe-parent::before { content: "x"; display: block; width: 10px; height: 10px; background-color: rgb(217, 119, 87); }';
  document.head.appendChild(style);

  report.childVisibility = getComputedStyle(child).visibility;
  const before = getComputedStyle(parent, "::before");
  report.beforeContent = before.content;
  report.beforeBackground = before.backgroundColor;
  report.beforeWidth = before.width;
  report.parentRect = JSON.stringify(parent.getBoundingClientRect());
  return report;
})()