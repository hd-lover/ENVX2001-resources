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


/**
 * Step-through stratified sampling widget.
 *
 * Three-step walkthrough matching the "3 steps" lecture slide:
 * (1) Divide the landscape into strata, (2) Sample within each
 * stratum, (3) Pool the estimates into a weighted mean.
 *
 * Uses fixed sample positions to avoid confusion between random
 * dot placement and the actual data values shown in Step 3.
 *
 * @param {Object} [opts]
 * @param {number} [opts.width=660]           SVG viewBox width
 * @param {number} [opts.height=200]          SVG viewBox height
 * @param {number} [opts.split=0.62]          Fraction belonging to zone A
 * @param {string} [opts.labelA="Land type A"] Zone A label
 * @param {string} [opts.labelB="Land type B"] Zone B label
 * @param {string} [opts.colorA="#5a8a4a"]     Zone A fill
 * @param {string} [opts.colorB="#3a7aaa"]     Zone B fill
 * @param {string} [opts.colorPt="#fff"]       Sample point fill
 * @returns {HTMLElement} Self-contained widget element
 */
export function stratifiedStepsWidget(opts = {}) {
  const {
    width: W = 660,
    height: H = 200,
    split: SPLIT = 0.62,
    labelA = "Land type A",
    labelB = "Land type B",
    colorA = "#5a8a4a",
    colorB = "#3a7aaa",
    colorPt = "#fff",
  } = opts;

  const svgNS = "http://www.w3.org/2000/svg";
  const bx = W * SPLIT;
  let step = 0;
  let stepping = false;

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

  // --- SVG ---
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}` });
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Landscape diagram for stratified sampling walkthrough");
  svg.style.cssText = "width:100%;display:block;border-radius:4px;overflow:hidden;";

  // Background rects with CSS transition for smooth colour change
  const bgA = svgEl("rect", { x: 0, width: bx, height: H, fill: "#777" });
  const bgB = svgEl("rect", { x: bx, width: W - bx, height: H, fill: "#777" });
  bgA.style.transition = "fill 0.4s";
  bgB.style.transition = "fill 0.4s";
  svg.appendChild(bgA);
  svg.appendChild(bgB);

  const divLine = svgEl("line", {
    x1: bx, y1: 0, x2: bx, y2: H,
    stroke: "rgba(255,255,255,0.6)", "stroke-width": "3", "stroke-dasharray": "6,4",
  });
  divLine.style.opacity = "0";
  divLine.style.transition = "opacity 0.4s";
  svg.appendChild(divLine);

  const pctA = Math.round(SPLIT * 100);
  const pctB = 100 - pctA;

  function makeLabel(x, txt) {
    const t = svgEl("text", { x, y: 24, "text-anchor": "middle", fill: "#fff", "font-size": "16px", "font-weight": "bold" });
    t.textContent = txt;
    t.style.opacity = "0";
    t.style.transition = "opacity 0.4s";
    svg.appendChild(t);
    return t;
  }
  const lblA = makeLabel(bx / 2, `${labelA} (${pctA}%)`);
  const lblB = makeLabel(bx + (W - bx) / 2, `${labelB} (${pctB}%)`);

  // Undivided label — dark text for contrast on #777 grey
  const lblAll = svgEl("text", { x: W / 2, y: H / 2 + 6, "text-anchor": "middle", fill: "#222", "font-size": "20px", "font-weight": "bold" });
  lblAll.textContent = "The farmer's property";
  lblAll.style.transition = "opacity 0.4s";
  svg.appendChild(lblAll);

  const ptsG = svgEl("g", {});
  svg.appendChild(ptsG);

  box.appendChild(svg);

  // --- step counter + controls ---
  const ctrl = document.createElement("div");
  ctrl.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-top:12px;";

  const stepCounter = document.createElement("span");
  stepCounter.style.cssText = "font-size:15px;font-weight:600;color:#555;";
  stepCounter.textContent = "";

  const btnRow = document.createElement("div");
  btnRow.style.cssText = "display:flex;gap:8px;";

  const nextBtn = document.createElement("button");
  nextBtn.style.cssText =
    "padding:10px 28px;border:2px solid #333;border-radius:6px;background:#e64626;" +
    "cursor:pointer;font-size:18px;font-weight:700;color:#fff;";
  nextBtn.textContent = "Step 1: Divide";

  const resetBtn = document.createElement("button");
  resetBtn.style.cssText =
    "padding:10px 20px;border:2px solid #999;border-radius:6px;background:#fff;" +
    "cursor:pointer;font-size:16px;font-weight:600;color:#555;";
  resetBtn.textContent = "Start over";
  resetBtn.style.display = "none";

  btnRow.appendChild(nextBtn);
  btnRow.appendChild(resetBtn);
  ctrl.appendChild(stepCounter);
  ctrl.appendChild(btnRow);
  box.appendChild(ctrl);

  // --- description ---
  const desc = document.createElement("div");
  desc.style.cssText =
    "margin-top:10px;padding-top:10px;border-top:2px solid #ddd;" +
    "font-size:18px;color:#444;min-height:24px;";
  desc.innerHTML = "The farmer wants to estimate soil carbon (t/ha) across the property. Click <b>Step 1</b> to begin.";
  box.appendChild(desc);

  // --- fixed sample positions (deterministic, no re-randomise confusion) ---
  const nA = 4, nB = 3;
  const fixedPtsA = [
    { x: bx * 0.2, y: H * 0.35 },
    { x: bx * 0.5, y: H * 0.55 },
    { x: bx * 0.75, y: H * 0.3 },
    { x: bx * 0.4, y: H * 0.75 },
  ];
  const fixedPtsB = [
    { x: bx + (W - bx) * 0.3, y: H * 0.4 },
    { x: bx + (W - bx) * 0.6, y: H * 0.65 },
    { x: bx + (W - bx) * 0.5, y: H * 0.3 },
  ];

  // --- data values matching the lecture worked example ---
  const meanA = 81.25, meanB = 48.67, pooled = 68.9;

  // --- step logic ---
  function doStep1() {
    step = 1;
    bgA.setAttribute("fill", colorA);
    bgB.setAttribute("fill", colorB);
    divLine.style.opacity = "1";
    lblA.style.opacity = "1";
    lblB.style.opacity = "1";
    lblAll.style.opacity = "0";
    stepCounter.textContent = "1 / 3";
    desc.innerHTML = "The property is divided into two strata based on land type. Each stratum will be sampled separately.";
    nextBtn.textContent = "Step 2: Sample";
    resetBtn.style.display = "inline-block";
  }

  function doStep2() {
    step = 2;
    while (ptsG.firstChild) ptsG.removeChild(ptsG.firstChild);
    for (const p of [...fixedPtsA, ...fixedPtsB]) {
      ptsG.appendChild(svgEl("circle", {
        cx: p.x, cy: p.y, r: 8, fill: colorPt, stroke: "#333", "stroke-width": "2",
      }));
    }
    stepCounter.textContent = "2 / 3";
    desc.innerHTML =
      `<b>${nA}</b> sampling sites in ${labelA}, <b>${nB}</b> in ${labelB} — ` +
      "every stratum is guaranteed representation. Each dot is one site where soil carbon is measured.";
    nextBtn.textContent = "Step 3: Pool";
  }

  function doStep3() {
    step = 3;
    stepCounter.textContent = "3 / 3";
    desc.innerHTML =
      `Each stratum's mean is weighted by its share of the property area:<br>` +
      `Pooled mean = ${pctA / 100} &times; ${meanA} + ${pctB / 100} &times; ${meanB} = <b>${pooled} t/ha</b>`;
    nextBtn.textContent = "Done";
    nextBtn.disabled = true;
    nextBtn.style.opacity = "0.5";
    nextBtn.style.cursor = "default";
  }

  function doReset() {
    step = 0;
    stepping = false;
    bgA.setAttribute("fill", "#777");
    bgB.setAttribute("fill", "#777");
    divLine.style.opacity = "0";
    lblA.style.opacity = "0";
    lblB.style.opacity = "0";
    lblAll.style.opacity = "1";
    while (ptsG.firstChild) ptsG.removeChild(ptsG.firstChild);
    stepCounter.textContent = "";
    desc.innerHTML = "The farmer wants to estimate soil carbon (t/ha) across the property. Click <b>Step 1</b> to begin.";
    nextBtn.textContent = "Step 1: Divide";
    nextBtn.disabled = false;
    nextBtn.style.opacity = "1";
    nextBtn.style.cursor = "pointer";
    nextBtn.style.display = "inline-block";
    resetBtn.style.display = "none";
  }

  nextBtn.onclick = () => {
    if (stepping || nextBtn.disabled) return;
    stepping = true;
    if (step === 0) doStep1();
    else if (step === 1) doStep2();
    else if (step === 2) doStep3();
    setTimeout(() => { stepping = false; }, 100);
  };
  resetBtn.onclick = doReset;

  nextBtn.onmouseenter = () => { if (!nextBtn.disabled) nextBtn.style.opacity = "0.85"; };
  nextBtn.onmouseleave = () => { if (!nextBtn.disabled) nextBtn.style.opacity = "1"; };
  resetBtn.onmouseenter = () => (resetBtn.style.background = "#f5f5f5");
  resetBtn.onmouseleave = () => (resetBtn.style.background = "#fff");

  return box;
}
