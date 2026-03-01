/**
 * Interactive random sampling widget.
 *
 * Draws a landscape split into two zones and lets the user repeatedly
 * scatter random samples, building a running tally of how often the
 * smaller zone gets missed.
 *
 * @param {Object} [opts]
 * @param {number} [opts.width=660]       SVG width
 * @param {number} [opts.height=180]      SVG height
 * @param {number} [opts.split=0.8]       Fraction belonging to zone A
 * @param {string} [opts.labelA="Grassland"] Zone A label
 * @param {string} [opts.labelB="Wetland"]   Zone B label
 * @param {string} [opts.colorA="#5a8a4a"]   Zone A fill
 * @param {string} [opts.colorB="#3a7aaa"]   Zone B fill
 * @param {string} [opts.colorPt="#e64626"]  Sample point fill
 * @param {number} [opts.nStart=10]       Initial sample size
 * @param {number} [opts.nMin=5]          Slider minimum
 * @param {number} [opts.nMax=50]         Slider maximum
 * @returns {HTMLElement} Self-contained widget element
 */
export function samplingWidget(opts = {}) {
  const {
    width: W = 660,
    height: H = 180,
    split: SPLIT = 0.8,
    labelA = "Grassland",
    labelB = "Wetland",
    colorA = "#5a8a4a",
    colorB = "#3a7aaa",
    colorPt = "#e64626",
    nStart = 10,
    nMin = 5,
    nMax = 50,
  } = opts;

  const svgNS = "http://www.w3.org/2000/svg";
  const bx = W * SPLIT;
  let nSamples = nStart, total = 0, missed = 0;

  // --- helpers ---
  function svgEl(tag, attrs) {
    const el = document.createElementNS(svgNS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  // --- container ---
  const box = document.createElement("div");
  box.style.cssText =
    "background:#fff;border:2px solid #333;border-radius:6px;" +
    "padding:16px 20px;width:90%;" +
    "font-family:system-ui,sans-serif;font-size:16px;color:#222;";

  // --- SVG landscape ---
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}` });
  svg.style.cssText =
    "width:100%;display:block;border-radius:4px;overflow:hidden;";

  svg.appendChild(
    svgEl("rect", { x: 0, width: bx, height: H, fill: colorA })
  );
  svg.appendChild(
    svgEl("rect", { x: bx, width: W - bx, height: H, fill: colorB })
  );
  svg.appendChild(
    svgEl("line", {
      x1: bx, y1: 0, x2: bx, y2: H,
      stroke: "rgba(255,255,255,0.6)",
      "stroke-width": "2",
      "stroke-dasharray": "6,4",
    })
  );

  function addLabel(x, y, txt) {
    const t = svgEl("text", {
      x, y,
      "text-anchor": "middle",
      fill: "#fff",
      "font-size": "14px",
      "font-weight": "bold",
    });
    t.textContent = txt;
    svg.appendChild(t);
  }
  const pctA = Math.round(SPLIT * 100);
  const pctB = 100 - pctA;
  addLabel(bx / 2, 18, `${labelA} (${pctA}%)`);
  addLabel(bx + (W - bx) / 2, 18, `${labelB} (${pctB}%)`);

  const ptsG = svgEl("g", {});
  svg.appendChild(ptsG);
  box.appendChild(svg);

  // --- controls ---
  const ctrl = document.createElement("div");
  ctrl.style.cssText =
    "display:flex;align-items:center;gap:12px;margin-top:12px;";
  ctrl.innerHTML =
    '<span style="font-size:16px;color:#222;white-space:nowrap;font-weight:600">n</span>' +
    `<input type="range" min="${nMin}" max="${nMax}" value="${nStart}" ` +
    `style="flex:1;accent-color:${colorPt};height:6px">` +
    `<span style="font-size:16px;min-width:24px;text-align:right;font-weight:600;color:#222">${nStart}</span>` +
    `<button style="padding:10px 28px;border:2px solid #333;border-radius:6px;` +
    `background:${colorPt};cursor:pointer;font-size:18px;font-weight:700;color:#fff">` +
    "Sample!</button>";
  box.appendChild(ctrl);

  const slider = ctrl.querySelector("input");
  const nval = ctrl.querySelector("span:nth-of-type(2)");
  const btn = ctrl.querySelector("button");

  // --- stats ---
  const stats = document.createElement("div");
  stats.style.cssText =
    "display:flex;justify-content:space-between;align-items:center;" +
    "margin-top:10px;padding-top:10px;border-top:2px solid #ddd;font-size:16px;color:#222;";
  const countsEl = document.createElement("span");
  countsEl.innerHTML = "";
  const tallyEl = document.createElement("div");
  tallyEl.style.cssText = "display:flex;align-items:center;gap:10px;";
  stats.appendChild(countsEl);
  stats.appendChild(tallyEl);
  box.appendChild(stats);

  // --- logic ---
  slider.oninput = () => {
    nSamples = +slider.value;
    nval.textContent = slider.value;
  };
  btn.onmouseenter = () => (btn.style.opacity = "0.85");
  btn.onmouseleave = () => (btn.style.opacity = "1");

  btn.onclick = () => {
    const pts = Array.from({ length: nSamples }, () => ({
      x: Math.random() * W,
      y: 24 + Math.random() * (H - 28),
    }));
    const nA = pts.filter((p) => p.x < bx).length;
    const nB = nSamples - nA;
    total++;
    if (nB === 0) missed++;

    // redraw points
    while (ptsG.firstChild) ptsG.removeChild(ptsG.firstChild);
    for (const p of pts) {
      ptsG.appendChild(
        svgEl("circle", {
          cx: p.x, cy: p.y, r: 5,
          fill: colorPt, stroke: "white", "stroke-width": "1.5",
        })
      );
    }

    // counts
    const bStyle = nB === 0 ? `color:${colorPt};font-weight:700` : "";
    countsEl.innerHTML =
      `${labelA} <b>${nA}</b> &middot; ${labelB} <b style="${bStyle}">${nB}</b>`;

    // tally bar
    const pct = Math.round((missed / total) * 100);
    tallyEl.innerHTML =
      `<span style="color:#555">${labelB} missed</span>` +
      '<span style="display:inline-block;width:100px;height:8px;background:#ddd;' +
      'border-radius:4px;overflow:hidden;vertical-align:middle">' +
      `<span style="display:block;width:${pct}%;height:100%;background:${colorPt};` +
      'border-radius:4px;transition:width 0.2s"></span></span>' +
      `<span><b>${missed}</b>/${total} <span style="color:#555">(${pct}%)</span></span>`;
  };

  return box;
}
