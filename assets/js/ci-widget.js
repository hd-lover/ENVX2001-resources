/**
 * Interactive widgets for confidence interval and related concepts.
 * Used in Lecture 02 (L02a and L02b).
 *
 * Exports:
 *   ciCoverageWidget()   — repeated sampling shows ~95% of CIs contain the truth
 *   ciWidthWidget()      — sliders for n and s show what drives CI width
 *   covarianceWidget()   — scatter plot comparing same-site vs different-site covariance
 */

// --- Shared utilities -------------------------------------------------------

/** t-critical values (two-tailed 0.975 quantile) for df = 1..49. */
const T_975 = [
  0, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262,
  2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093,
  2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045,
  2.042, 2.040, 2.037, 2.035, 2.032, 2.030, 2.028, 2.026, 2.024, 2.023,
  2.021, 2.020, 2.018, 2.017, 2.015, 2.014, 2.013, 2.012, 2.011, 2.010,
];

function tCrit(df) {
  if (df < 1) return Infinity;
  if (df < T_975.length) return T_975[df];
  return 1.96; // normal approximation for large df
}

/** Box-Muller transform: returns a standard normal variate. */
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function svgEl(tag, attrs) {
  const ns = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/** Shared container style matching sampling-widget.js. */
function makeBox() {
  const box = document.createElement("div");
  box.style.cssText =
    "background:#fff;border:2px solid #333;border-radius:6px;" +
    "padding:16px 20px;width:90%;" +
    "font-family:system-ui,sans-serif;font-size:16px;color:#222;";
  return box;
}

/** Shared primary button style. */
function primaryBtnStyle(bg) {
  return (
    `padding:10px 28px;border:2px solid #333;border-radius:6px;` +
    `background:${bg};cursor:pointer;font-size:18px;font-weight:700;color:#fff;`
  );
}

/** Shared secondary button style. */
function secondaryBtnStyle() {
  return (
    "padding:10px 16px;border:2px solid #999;border-radius:6px;" +
    "background:#fff;cursor:pointer;font-size:16px;font-weight:600;color:#555;"
  );
}

// =============================================================================
// 1. CI Coverage Simulation
// =============================================================================

/**
 * Repeated-sampling widget that builds CI bars one at a time.
 *
 * Each click draws n values from N(trueMean, trueSd²), computes a 95% CI,
 * and draws a horizontal bar. Green if it captures the true mean, red if not.
 * A running counter shows the capture rate approaching ~95%.
 *
 * @param {Object} [opts]
 * @param {number} [opts.width=660]       SVG viewBox width
 * @param {number} [opts.trueMean=67.3]   Known population mean
 * @param {number} [opts.trueSd=18.9]     Known population sd
 * @param {number} [opts.nStart=7]        Initial sample size
 * @param {number} [opts.nMin=5]          Slider minimum
 * @param {number} [opts.nMax=50]         Slider maximum
 * @param {number} [opts.maxBars=15]      Max visible bars
 * @returns {HTMLElement}
 */
export function ciCoverageWidget(opts = {}) {
  const {
    width: W = 660,
    trueMean = 67.3,
    trueSd = 18.9,
    nStart = 7,
    nMin = 5,
    nMax = 50,
    maxBars = 15,
    colorHit = "#3a9a5c",
    colorMiss = "#e64626",
  } = opts;

  const margin = { top: 28, right: 20, bottom: 24, left: 20 };
  const barH = 8, barGap = 4, barStep = barH + barGap;
  const plotH = maxBars * barStep;
  const H = margin.top + plotH + margin.bottom;
  const plotW = W - margin.left - margin.right;

  const xMin = 15, xMax = 120;
  const xScale = (v) => margin.left + ((v - xMin) / (xMax - xMin)) * plotW;

  let nSamples = nStart, total = 0, hits = 0;
  const bars = [];

  const box = makeBox();

  // --- SVG ---
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}` });
  svg.style.cssText = "width:100%;display:block;";

  // True mean line (drawn first — bars go on top)
  const tmX = xScale(trueMean);
  svg.appendChild(
    svgEl("line", {
      x1: tmX, y1: margin.top - 2, x2: tmX, y2: margin.top + plotH,
      stroke: "#333", "stroke-width": "2", "stroke-dasharray": "6,3",
    })
  );

  // x-axis ticks
  for (let v = 20; v <= 110; v += 10) {
    const x = xScale(v);
    svg.appendChild(
      svgEl("line", {
        x1: x, y1: margin.top + plotH, x2: x, y2: margin.top + plotH + 5,
        stroke: "#999", "stroke-width": "1",
      })
    );
    const t = svgEl("text", {
      x, y: margin.top + plotH + 18,
      "text-anchor": "middle", fill: "#666", "font-size": "11px",
    });
    t.textContent = v;
    svg.appendChild(t);
  }

  // True mean label
  const tmLabel = svgEl("text", {
    x: tmX, y: margin.top - 8,
    "text-anchor": "middle", fill: "#333", "font-size": "12px",
    "font-weight": "bold",
  });
  tmLabel.textContent = `True mean = ${trueMean}`;
  svg.appendChild(tmLabel);

  // Bar group
  const barsG = svgEl("g", {});
  svg.appendChild(barsG);
  box.appendChild(svg);

  // --- Controls ---
  const ctrl = document.createElement("div");
  ctrl.style.cssText =
    "display:flex;align-items:center;gap:12px;margin-top:12px;";
  ctrl.innerHTML =
    '<span style="font-size:16px;color:#222;white-space:nowrap;font-weight:600">n</span>' +
    `<input type="range" min="${nMin}" max="${nMax}" value="${nStart}" ` +
    `style="flex:1;accent-color:${colorMiss};height:6px">` +
    `<span style="font-size:16px;min-width:24px;text-align:right;font-weight:600;color:#222">${nStart}</span>` +
    `<button style="${primaryBtnStyle(colorMiss)}">Sample!</button>` +
    `<button style="${secondaryBtnStyle()}">Reset</button>`;
  box.appendChild(ctrl);

  const slider = ctrl.querySelector("input");
  const nval = ctrl.querySelector("span:nth-of-type(2)");
  const sampleBtn = ctrl.querySelectorAll("button")[0];
  const resetBtn = ctrl.querySelectorAll("button")[1];

  // --- Stats ---
  const stats = document.createElement("div");
  stats.style.cssText =
    "margin-top:10px;padding-top:10px;border-top:2px solid #ddd;" +
    "font-size:16px;color:#222;min-height:24px;";
  stats.innerHTML =
    "Click <b>Sample!</b> to draw a random sample and compute its 95% CI.";
  box.appendChild(stats);

  // --- Logic ---
  slider.oninput = () => {
    nSamples = +slider.value;
    nval.textContent = slider.value;
  };

  function drawBars() {
    while (barsG.firstChild) barsG.removeChild(barsG.firstChild);
    const visible = bars.slice(-maxBars);
    for (let i = 0; i < visible.length; i++) {
      const b = visible[i];
      const y = margin.top + i * barStep + barGap / 2;
      const col = b.hit ? colorHit : colorMiss;

      // CI bar
      barsG.appendChild(
        svgEl("line", {
          x1: Math.max(xScale(xMin), xScale(b.lower)),
          y1: y + barH / 2,
          x2: Math.min(xScale(xMax), xScale(b.upper)),
          y2: y + barH / 2,
          stroke: col, "stroke-width": String(barH), "stroke-linecap": "round",
        })
      );

      // Sample mean dot
      const mx = xScale(b.mean);
      if (mx >= xScale(xMin) && mx <= xScale(xMax)) {
        barsG.appendChild(
          svgEl("circle", {
            cx: mx, cy: y + barH / 2, r: 3.5,
            fill: "#fff", stroke: col, "stroke-width": "1.5",
          })
        );
      }
    }
  }

  sampleBtn.onclick = () => {
    const vals = Array.from({ length: nSamples }, () => trueMean + trueSd * randn());
    const mean = vals.reduce((a, b) => a + b, 0) / nSamples;
    const sd = Math.sqrt(
      vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (nSamples - 1)
    );
    const se = sd / Math.sqrt(nSamples);
    const t = tCrit(nSamples - 1);
    const lower = mean - t * se;
    const upper = mean + t * se;
    const hit = trueMean >= lower && trueMean <= upper;

    total++;
    if (hit) hits++;
    bars.push({ lower, upper, mean, hit });

    drawBars();
    const pct = Math.round((hits / total) * 100);
    stats.innerHTML =
      `<b style="color:${colorHit}">${hits}</b> / ${total} intervals contain ` +
      `the true mean (<b>${pct}%</b>)`;
  };

  resetBtn.onclick = () => {
    total = 0;
    hits = 0;
    bars.length = 0;
    while (barsG.firstChild) barsG.removeChild(barsG.firstChild);
    stats.innerHTML =
      "Click <b>Sample!</b> to draw a random sample and compute its 95% CI.";
  };

  sampleBtn.onmouseenter = () => (sampleBtn.style.opacity = "0.85");
  sampleBtn.onmouseleave = () => (sampleBtn.style.opacity = "1");
  resetBtn.onmouseenter = () => (resetBtn.style.background = "#f5f5f5");
  resetBtn.onmouseleave = () => (resetBtn.style.background = "#fff");

  return box;
}

// =============================================================================
// 2. CI Width Explorer
// =============================================================================

/**
 * Sliders for sample size (n) and standard deviation (s) that animate
 * a CI bar in real time, showing what drives CI width.
 *
 * @param {Object} [opts]
 * @param {number} [opts.width=660]   SVG viewBox width
 * @param {number} [opts.mean=67.3]   Fixed sample mean
 * @param {number} [opts.nStart=7]    Initial sample size
 * @param {number} [opts.sStart=19]   Initial standard deviation
 * @returns {HTMLElement}
 */
export function ciWidthWidget(opts = {}) {
  const {
    width: W = 660,
    mean = 67.3,
    nStart = 7,
    sStart = 19,
    nMin = 5,
    nMax = 50,
    sMin = 5,
    sMax = 35,
    colorBar = "#4a90d9",
    colorPt = "#e64626",
  } = opts;

  const H = 80;
  const margin = { left: 20, right: 20 };
  const plotW = W - margin.left - margin.right;
  const xMin = 20, xMax = 115;
  const xScale = (v) => margin.left + ((v - xMin) / (xMax - xMin)) * plotW;

  let n = nStart, s = sStart;

  const box = makeBox();

  // --- SVG ---
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}` });
  svg.style.cssText = "width:100%;display:block;";

  // x-axis ticks
  for (let v = 20; v <= 110; v += 10) {
    const x = xScale(v);
    svg.appendChild(
      svgEl("line", {
        x1: x, y1: 56, x2: x, y2: 61, stroke: "#ccc", "stroke-width": "1",
      })
    );
    const t = svgEl("text", {
      x, y: 74, "text-anchor": "middle", fill: "#999", "font-size": "10px",
    });
    t.textContent = v;
    svg.appendChild(t);
  }

  // CI bar
  const ciBar = svgEl("line", {
    y1: 36, y2: 36,
    stroke: colorBar, "stroke-width": "12", "stroke-linecap": "round",
  });
  ciBar.style.transition = "x1 0.15s, x2 0.15s";
  svg.appendChild(ciBar);

  // Mean dot
  const meanDot = svgEl("circle", {
    cx: xScale(mean), cy: 36, r: 6,
    fill: colorPt, stroke: "#fff", "stroke-width": "2",
  });
  svg.appendChild(meanDot);

  // Bound labels
  const lblLower = svgEl("text", {
    y: 18, "text-anchor": "middle", fill: colorBar,
    "font-size": "13px", "font-weight": "bold",
  });
  const lblUpper = svgEl("text", {
    y: 18, "text-anchor": "middle", fill: colorBar,
    "font-size": "13px", "font-weight": "bold",
  });
  const lblMean = svgEl("text", {
    y: 12, "text-anchor": "middle", fill: colorPt,
    "font-size": "13px", "font-weight": "bold",
  });
  svg.appendChild(lblLower);
  svg.appendChild(lblUpper);
  svg.appendChild(lblMean);

  box.appendChild(svg);

  // --- Sliders ---
  const sliders = document.createElement("div");
  sliders.style.cssText =
    "display:flex;flex-direction:column;gap:8px;margin-top:12px;";

  function makeSlider(label, min, max, start, accent) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:12px;";
    row.innerHTML =
      `<span style="font-size:15px;font-weight:600;color:#222;min-width:180px">${label}</span>` +
      `<input type="range" min="${min}" max="${max}" value="${start}" step="1" ` +
      `style="flex:1;accent-color:${accent};height:6px">` +
      `<span style="font-size:15px;min-width:40px;text-align:right;font-weight:600;color:#222">${start}</span>`;
    return row;
  }

  const nRow = makeSlider("Sample size (n)", nMin, nMax, nStart, colorPt);
  const sRow = makeSlider("Std deviation (s)", sMin, sMax, sStart, colorBar);
  sliders.appendChild(nRow);
  sliders.appendChild(sRow);
  box.appendChild(sliders);

  const nSlider = nRow.querySelector("input");
  const nValEl = nRow.querySelector("span:nth-of-type(2)");
  const sSlider = sRow.querySelector("input");
  const sValEl = sRow.querySelector("span:nth-of-type(2)");

  // --- Info ---
  const info = document.createElement("div");
  info.style.cssText =
    "margin-top:10px;padding-top:10px;border-top:2px solid #ddd;" +
    "font-size:16px;color:#222;";
  box.appendChild(info);

  function update() {
    const t = tCrit(n - 1);
    const se = s / Math.sqrt(n);
    const me = t * se;
    const lower = mean - me;
    const upper = mean + me;
    const width = upper - lower;
    const pctME = Math.round((me / mean) * 100);

    ciBar.setAttribute("x1", xScale(Math.max(xMin, lower)));
    ciBar.setAttribute("x2", xScale(Math.min(xMax, upper)));
    meanDot.setAttribute("cx", xScale(mean));

    lblLower.setAttribute("x", xScale(Math.max(xMin + 2, lower)));
    lblLower.textContent = lower.toFixed(1);
    lblUpper.setAttribute("x", xScale(Math.min(xMax - 2, upper)));
    lblUpper.textContent = upper.toFixed(1);
    lblMean.setAttribute("x", xScale(mean));
    lblMean.textContent = `x\u0304 = ${mean.toFixed(1)}`;

    info.innerHTML =
      `CI width: <b>${width.toFixed(1)} t/ha</b> &middot; ` +
      `Margin of error: <b>${me.toFixed(1)} t/ha</b> (&plusmn;${pctME}% of the mean)`;
  }

  nSlider.oninput = () => { n = +nSlider.value; nValEl.textContent = n; update(); };
  sSlider.oninput = () => { s = +sSlider.value; sValEl.textContent = s; update(); };

  update();
  return box;
}

// =============================================================================
// 3. Covariance Scatter
// =============================================================================

/**
 * Scatter plot of Visit 1 vs Visit 2 for paired sites.
 *
 * Default shows the farmer's 3 paired sites (positive covariance).
 * A button switches to randomly generated "different sites" data
 * where covariance is unpredictable, illustrating why pairing helps.
 *
 * @param {Object} [opts]
 * @param {number} [opts.width=500]         SVG viewBox width
 * @param {number} [opts.height=310]        SVG viewBox height
 * @param {Array}  [opts.pairedData]        Array of {label, x, y} objects
 * @param {string} [opts.colorPaired="#3a9a5c"]  Point colour in paired mode
 * @param {string} [opts.colorRandom="#e64626"]  Point colour in random mode
 * @returns {HTMLElement}
 */
export function covarianceWidget(opts = {}) {
  const {
    width: W = 500,
    height: H = 310,
    pairedData = [
      { label: "Site 1", x: 90, y: 95 },
      { label: "Site 2", x: 48, y: 52 },
      { label: "Site 3", x: 71, y: 75 },
    ],
    colorPaired = "#3a9a5c",
    colorRandom = "#e64626",
  } = opts;

  const margin = { top: 15, right: 70, bottom: 45, left: 55 };
  const plotW = W - margin.left - margin.right;
  const plotH = H - margin.top - margin.bottom;

  const axMin = 35, axMax = 105;
  const xScale = (v) => margin.left + ((v - axMin) / (axMax - axMin)) * plotW;
  const yScale = (v) =>
    margin.top + plotH - ((v - axMin) / (axMax - axMin)) * plotH;

  let isPaired = true;
  let currentData = pairedData.map((d) => ({ ...d }));

  const box = makeBox();

  // --- SVG ---
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}` });
  svg.style.cssText = "width:100%;display:block;max-width:500px;";

  // Grid lines
  for (let v = 40; v <= 100; v += 10) {
    svg.appendChild(
      svgEl("line", {
        x1: margin.left, y1: yScale(v),
        x2: margin.left + plotW, y2: yScale(v),
        stroke: "#eee", "stroke-width": "1",
      })
    );
    svg.appendChild(
      svgEl("line", {
        x1: xScale(v), y1: margin.top,
        x2: xScale(v), y2: margin.top + plotH,
        stroke: "#eee", "stroke-width": "1",
      })
    );
  }

  // Axes
  svg.appendChild(
    svgEl("line", {
      x1: margin.left, y1: margin.top + plotH,
      x2: margin.left + plotW, y2: margin.top + plotH,
      stroke: "#333", "stroke-width": "1.5",
    })
  );
  svg.appendChild(
    svgEl("line", {
      x1: margin.left, y1: margin.top,
      x2: margin.left, y2: margin.top + plotH,
      stroke: "#333", "stroke-width": "1.5",
    })
  );

  // Axis labels
  for (let v = 40; v <= 100; v += 10) {
    const tx = svgEl("text", {
      x: xScale(v), y: margin.top + plotH + 18,
      "text-anchor": "middle", fill: "#666", "font-size": "11px",
    });
    tx.textContent = v;
    svg.appendChild(tx);

    const ty = svgEl("text", {
      x: margin.left - 8, y: yScale(v) + 4,
      "text-anchor": "end", fill: "#666", "font-size": "11px",
    });
    ty.textContent = v;
    svg.appendChild(ty);
  }

  // Axis titles
  const xTitle = svgEl("text", {
    x: margin.left + plotW / 2, y: H - 5,
    "text-anchor": "middle", fill: "#333",
    "font-size": "13px", "font-weight": "bold",
  });
  xTitle.textContent = "Visit 1 (t/ha)";
  svg.appendChild(xTitle);

  const yTitle = svgEl("text", {
    x: 14, y: margin.top + plotH / 2,
    "text-anchor": "middle", fill: "#333",
    "font-size": "13px", "font-weight": "bold",
    transform: `rotate(-90, 14, ${margin.top + plotH / 2})`,
  });
  yTitle.textContent = "Visit 2 (t/ha)";
  svg.appendChild(yTitle);

  // y = x reference line
  svg.appendChild(
    svgEl("line", {
      x1: xScale(axMin), y1: yScale(axMin),
      x2: xScale(axMax), y2: yScale(axMax),
      stroke: "#ccc", "stroke-width": "1", "stroke-dasharray": "4,3",
    })
  );

  // Points group
  const ptsG = svgEl("g", {});
  svg.appendChild(ptsG);
  box.appendChild(svg);

  // --- Controls ---
  const ctrl = document.createElement("div");
  ctrl.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:12px;";

  const randomBtn = document.createElement("button");
  randomBtn.style.cssText = primaryBtnStyle(colorRandom);
  randomBtn.textContent = "Try different sites";

  const resetBtn = document.createElement("button");
  resetBtn.style.cssText = secondaryBtnStyle();
  resetBtn.textContent = "Back to same sites";
  resetBtn.style.display = "none";

  ctrl.appendChild(randomBtn);
  ctrl.appendChild(resetBtn);
  box.appendChild(ctrl);

  // --- Stats ---
  const stats = document.createElement("div");
  stats.style.cssText =
    "margin-top:10px;padding-top:10px;border-top:2px solid #ddd;" +
    "font-size:16px;color:#222;";
  box.appendChild(stats);

  function computeCov(data) {
    const nn = data.length;
    const mx = data.reduce((a, d) => a + d.x, 0) / nn;
    const my = data.reduce((a, d) => a + d.y, 0) / nn;
    return data.reduce((a, d) => a + (d.x - mx) * (d.y - my), 0) / (nn - 1);
  }

  function drawPoints() {
    while (ptsG.firstChild) ptsG.removeChild(ptsG.firstChild);
    const col = isPaired ? colorPaired : colorRandom;

    for (const d of currentData) {
      ptsG.appendChild(
        svgEl("circle", {
          cx: xScale(d.x), cy: yScale(d.y), r: 8,
          fill: col, stroke: "#fff", "stroke-width": "2",
        })
      );
      const lbl = svgEl("text", {
        x: xScale(d.x) + 12, y: yScale(d.y) + 4,
        fill: "#333", "font-size": "11px", "font-weight": "bold",
      });
      lbl.textContent = d.label;
      ptsG.appendChild(lbl);
    }

    const cov = computeCov(currentData);
    if (isPaired) {
      stats.innerHTML =
        `Covariance: <b>+${cov.toFixed(0)}</b> &mdash; ` +
        `positive and reliable (same sites measured twice)`;
    } else {
      stats.innerHTML =
        `Covariance: <b>${cov > 0 ? "+" : ""}${cov.toFixed(0)}</b> &mdash; ` +
        `unpredictable (different sites each visit). Click again to reshuffle.`;
    }
  }

  randomBtn.onclick = () => {
    isPaired = false;
    currentData = pairedData.map((d, i) => ({
      label: `Site ${i + 1}`,
      x: 40 + Math.round(Math.random() * 55),
      y: 40 + Math.round(Math.random() * 55),
    }));
    resetBtn.style.display = "inline-block";
    drawPoints();
  };

  resetBtn.onclick = () => {
    isPaired = true;
    currentData = pairedData.map((d) => ({ ...d }));
    resetBtn.style.display = "none";
    drawPoints();
  };

  randomBtn.onmouseenter = () => (randomBtn.style.opacity = "0.85");
  randomBtn.onmouseleave = () => (randomBtn.style.opacity = "1");
  resetBtn.onmouseenter = () => (resetBtn.style.background = "#f5f5f5");
  resetBtn.onmouseleave = () => (resetBtn.style.background = "#fff");

  drawPoints();
  return box;
}
