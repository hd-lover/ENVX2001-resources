/**
 * Interactive widgets for t-test concepts.
 * Used in Lecture 03a (L03a).
 *
 * Exports:
 *   ciDifferenceWidget()  — sliders show how the CI for the difference relates to significance
 *   pvalueExplorerWidget() — drag a t-statistic along the t-distribution and watch the p-value change
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
  return 1.96;
}

function svgEl(tag, attrs) {
  const ns = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function makeBox() {
  const box = document.createElement("div");
  box.style.cssText =
    "background:#fff;border:2px solid #333;border-radius:6px;" +
    "padding:16px 20px;width:90%;" +
    "font-family:system-ui,sans-serif;font-size:16px;color:#222;";
  return box;
}

function primaryBtnStyle(bg) {
  return (
    `padding:10px 28px;border:2px solid #333;border-radius:6px;` +
    `background:${bg};cursor:pointer;font-size:18px;font-weight:700;color:#fff;`
  );
}

function secondaryBtnStyle() {
  return (
    "padding:10px 16px;border:2px solid #999;border-radius:6px;" +
    "background:#fff;cursor:pointer;font-size:16px;font-weight:600;color:#555;"
  );
}

// --- t-distribution density and CDF -----------------------------------------

/** t-distribution PDF for given x and df. */
function tDensity(x, df) {
  return (
    (gamma((df + 1) / 2) / (Math.sqrt(df * Math.PI) * gamma(df / 2))) *
    Math.pow(1 + (x * x) / df, -(df + 1) / 2)
  );
}

/** Lanczos approximation for the gamma function. */
function gamma(z) {
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }
  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

/**
 * Two-tailed p-value for the t-distribution via numerical integration
 * (Simpson's rule). Returns P(|T| > |tVal|) for given df.
 */
function tPvalue(tVal, df) {
  const absT = Math.abs(tVal);
  if (absT < 0.001) return 1.0;
  if (absT > 50) return 0.0;

  // Integrate from absT to a large value (tail area)
  const upper = Math.max(absT + 30, 50);
  const n = 400;
  const h = (upper - absT) / n;
  let sum = tDensity(absT, df) + tDensity(upper, df);
  for (let i = 1; i < n; i++) {
    const x = absT + i * h;
    sum += tDensity(x, df) * (i % 2 === 0 ? 2 : 4);
  }
  const oneTail = (h / 3) * sum;
  return Math.min(1.0, 2 * oneTail);
}


// =============================================================================
// 1. CI for the Difference Explorer
// =============================================================================

/**
 * Two group means on a number line with a CI-for-the-difference bar below.
 * Sliders for "Difference between means" and "Variability (SD)".
 *
 * When the CI for the difference excludes zero, the verdict updates.
 * No individual group CIs are shown (avoids the overlapping-CIs misconception).
 *
 * @param {Object} [opts]
 * @param {number} [opts.width=660]
 * @param {number} [opts.n1=12]          Sample size group 1
 * @param {number} [opts.n2=15]          Sample size group 2
 * @param {number} [opts.grandMean=500]  Midpoint for the two group means
 * @param {number} [opts.diffStart=30]   Initial difference (mean1 - mean2)
 * @param {number} [opts.sdStart=40]     Initial pooled SD
 * @returns {HTMLElement}
 */
export function ciDifferenceWidget(opts = {}) {
  const {
    width: W = 660,
    n1 = 12,
    n2 = 15,
    grandMean = 500,
    diffStart = 30,
    diffMin = -80,
    diffMax = 80,
    sdStart = 40,
    sdMin = 10,
    sdMax = 80,
    colorSig = "#e64626",
    colorNS = "#4a90d9",
  } = opts;

  const df = n1 + n2 - 2;
  const tc = tCrit(df);

  // --- Layout ---
  const topH = 70;   // group means area
  const gap = 20;
  const botH = 60;   // CI-for-difference area
  const margin = { top: 20, right: 30, bottom: 30, left: 30 };
  const H = margin.top + topH + gap + botH + margin.bottom;
  const plotW = W - margin.left - margin.right;

  // Top panel x-scale: group means (centred on grandMean)
  const topXMin = grandMean - 100;
  const topXMax = grandMean + 100;
  const topXScale = (v) =>
    margin.left + ((v - topXMin) / (topXMax - topXMin)) * plotW;

  // Bottom panel x-scale: difference (centred on 0)
  const botXMin = -100;
  const botXMax = 100;
  const botXScale = (v) =>
    margin.left + ((v - botXMin) / (botXMax - botXMin)) * plotW;

  let diff = diffStart;
  let sd = sdStart;

  const box = makeBox();

  // --- SVG ---
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}` });
  svg.style.cssText = "width:100%;display:block;";

  // Top panel: group means
  const topY = margin.top + topH / 2;

  // Top axis line
  svg.appendChild(
    svgEl("line", {
      x1: margin.left, y1: topY + 16,
      x2: margin.left + plotW, y2: topY + 16,
      stroke: "#ddd", "stroke-width": "1",
    })
  );

  // Top axis ticks
  for (let v = topXMin + 20; v < topXMax; v += 20) {
    const x = topXScale(v);
    svg.appendChild(
      svgEl("line", {
        x1: x, y1: topY + 16, x2: x, y2: topY + 21,
        stroke: "#ccc", "stroke-width": "1",
      })
    );
    const t = svgEl("text", {
      x, y: topY + 33,
      "text-anchor": "middle", fill: "#999", "font-size": "10px",
    });
    t.textContent = v;
    svg.appendChild(t);
  }

  // Top panel label
  const topLabel = svgEl("text", {
    x: margin.left, y: margin.top + 4,
    fill: "#666", "font-size": "12px", "font-weight": "600",
  });
  topLabel.textContent = "Group means";
  svg.appendChild(topLabel);

  // Group 1 dot + label
  const dot1 = svgEl("circle", {
    cx: 0, cy: topY, r: 8,
    fill: "#4477aa", stroke: "#fff", "stroke-width": "2",
  });
  svg.appendChild(dot1);
  const lbl1 = svgEl("text", {
    x: 0, y: topY - 14,
    "text-anchor": "middle", fill: "#4477aa",
    "font-size": "12px", "font-weight": "bold",
  });
  svg.appendChild(lbl1);

  // Group 2 dot + label
  const dot2 = svgEl("circle", {
    cx: 0, cy: topY, r: 8,
    fill: "#cc6633", stroke: "#fff", "stroke-width": "2",
  });
  svg.appendChild(dot2);
  const lbl2 = svgEl("text", {
    x: 0, y: topY - 14,
    "text-anchor": "middle", fill: "#cc6633",
    "font-size": "12px", "font-weight": "bold",
  });
  svg.appendChild(lbl2);

  // Bottom panel: CI for difference
  const botTop = margin.top + topH + gap;
  const botMid = botTop + botH / 2;

  // Bottom panel label
  const botLabel = svgEl("text", {
    x: margin.left, y: botTop - 4,
    fill: "#666", "font-size": "12px", "font-weight": "600",
  });
  botLabel.textContent = "CI for the difference";
  svg.appendChild(botLabel);

  // Zero reference line (dashed)
  const zeroX = botXScale(0);
  svg.appendChild(
    svgEl("line", {
      x1: zeroX, y1: botTop, x2: zeroX, y2: botTop + botH,
      stroke: "#333", "stroke-width": "2", "stroke-dasharray": "6,3",
    })
  );

  // Zero label
  const zeroLabel = svgEl("text", {
    x: zeroX, y: botTop + botH + 14,
    "text-anchor": "middle", fill: "#333", "font-size": "11px",
    "font-weight": "bold",
  });
  zeroLabel.textContent = "0";
  svg.appendChild(zeroLabel);

  // Bottom axis ticks
  for (let v = botXMin + 20; v < botXMax; v += 20) {
    if (v === 0) continue;
    const x = botXScale(v);
    svg.appendChild(
      svgEl("line", {
        x1: x, y1: botTop + botH - 2, x2: x, y2: botTop + botH + 3,
        stroke: "#ccc", "stroke-width": "1",
      })
    );
    const t = svgEl("text", {
      x, y: botTop + botH + 14,
      "text-anchor": "middle", fill: "#999", "font-size": "10px",
    });
    t.textContent = v;
    svg.appendChild(t);
  }

  // CI bar
  const ciBar = svgEl("line", {
    y1: botMid, y2: botMid,
    "stroke-width": "10", "stroke-linecap": "round",
  });
  ciBar.style.transition = "x1 0.15s, x2 0.15s, stroke 0.15s";
  svg.appendChild(ciBar);

  // Difference dot on CI bar
  const diffDot = svgEl("circle", {
    cy: botMid, r: 5,
    stroke: "#fff", "stroke-width": "2",
  });
  diffDot.style.transition = "cx 0.15s, fill 0.15s";
  svg.appendChild(diffDot);

  // CI bound labels
  const lblLower = svgEl("text", {
    y: botMid - 12, "text-anchor": "middle",
    "font-size": "12px", "font-weight": "bold",
  });
  svg.appendChild(lblLower);
  const lblUpper = svgEl("text", {
    y: botMid - 12, "text-anchor": "middle",
    "font-size": "12px", "font-weight": "bold",
  });
  svg.appendChild(lblUpper);

  box.appendChild(svg);

  // --- Sliders ---
  const sliders = document.createElement("div");
  sliders.style.cssText =
    "display:flex;flex-direction:column;gap:8px;margin-top:12px;";

  function makeSlider(label, min, max, start, accent) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:12px;";
    row.innerHTML =
      `<span style="font-size:15px;font-weight:600;color:#222;min-width:200px">${label}</span>` +
      `<input type="range" min="${min}" max="${max}" value="${start}" step="1" ` +
      `style="flex:1;accent-color:${accent};height:6px">` +
      `<span style="font-size:15px;min-width:40px;text-align:right;font-weight:600;color:#222">${start}</span>`;
    return row;
  }

  const diffRow = makeSlider(
    "Difference between means", diffMin, diffMax, diffStart, colorSig
  );
  const sdRow = makeSlider(
    "Variability (SD)", sdMin, sdMax, sdStart, colorNS
  );
  sliders.appendChild(diffRow);
  sliders.appendChild(sdRow);
  box.appendChild(sliders);

  const diffSlider = diffRow.querySelector("input");
  const diffValEl = diffRow.querySelector("span:nth-of-type(2)");
  const sdSlider = sdRow.querySelector("input");
  const sdValEl = sdRow.querySelector("span:nth-of-type(2)");

  // --- Stats ---
  const stats = document.createElement("div");
  stats.style.cssText =
    "margin-top:10px;padding-top:10px;border-top:2px solid #ddd;" +
    "font-size:16px;color:#222;";
  box.appendChild(stats);

  // --- Update ---
  function update() {
    const mean1 = grandMean + diff / 2;
    const mean2 = grandMean - diff / 2;

    // Position group dots
    dot1.setAttribute("cx", topXScale(mean1));
    dot2.setAttribute("cx", topXScale(mean2));
    lbl1.setAttribute("x", topXScale(mean1));
    lbl1.textContent = `Breed 1: ${mean1.toFixed(0)}`;
    lbl2.setAttribute("x", topXScale(mean2));
    lbl2.textContent = `Breed 2: ${mean2.toFixed(0)}`;

    // Compute CI for the difference
    const se = sd * Math.sqrt(1 / n1 + 1 / n2);
    const me = tc * se;
    const lower = diff - me;
    const upper = diff + me;
    const sig = lower > 0 || upper < 0;
    const col = sig ? colorSig : colorNS;

    // Position CI bar
    const barL = botXScale(Math.max(botXMin, lower));
    const barR = botXScale(Math.min(botXMax, upper));
    ciBar.setAttribute("x1", barL);
    ciBar.setAttribute("x2", barR);
    ciBar.setAttribute("stroke", col);

    // Position difference dot
    diffDot.setAttribute("cx", botXScale(diff));
    diffDot.setAttribute("fill", col);

    // Bound labels
    lblLower.setAttribute("x", barL);
    lblLower.setAttribute("fill", col);
    lblLower.textContent = lower.toFixed(1);
    lblUpper.setAttribute("x", barR);
    lblUpper.setAttribute("fill", col);
    lblUpper.textContent = upper.toFixed(1);

    // Stats readout
    const tStat = diff / se;
    const pval = tPvalue(tStat, df);
    if (sig) {
      stats.innerHTML =
        `95% CI for the difference: <b style="color:${col}">(${lower.toFixed(1)}, ${upper.toFixed(1)})</b> ` +
        `&mdash; excludes zero. <b style="color:${col}">Significant difference</b> (p = ${pval.toFixed(4)})`;
    } else {
      stats.innerHTML =
        `95% CI for the difference: <b style="color:${col}">(${lower.toFixed(1)}, ${upper.toFixed(1)})</b> ` +
        `&mdash; includes zero. <b style="color:${col}">No significant difference</b> (p = ${pval.toFixed(4)})`;
    }
  }

  diffSlider.oninput = () => {
    diff = +diffSlider.value;
    diffValEl.textContent = diff;
    update();
  };
  sdSlider.oninput = () => {
    sd = +sdSlider.value;
    sdValEl.textContent = sd;
    update();
  };

  update();
  return box;
}


// =============================================================================
// 2. P-value Explorer
// =============================================================================

/**
 * t-distribution curve at a fixed df. A slider moves a t-statistic marker
 * along the x-axis; two-tailed shading updates in real time.
 *
 * @param {Object} [opts]
 * @param {number} [opts.width=660]
 * @param {number} [opts.df=25]          Degrees of freedom (cattle: 12+15-2)
 * @param {number} [opts.tStart=2.25]    Initial t-statistic (cattle example)
 * @returns {HTMLElement}
 */
export function pvalueExplorerWidget(opts = {}) {
  const {
    width: W = 660,
    df = 25,
    tStart = 2.25,
    tMin = 0,
    tMax = 4,
    colorNS = "#4a90d9",
    colorSig = "#e64626",
  } = opts;

  const margin = { top: 15, right: 20, bottom: 30, left: 20 };
  const plotH = 140;
  const H = margin.top + plotH + margin.bottom;
  const plotW = W - margin.left - margin.right;

  const xRange = 4.5;
  const xScale = (v) =>
    margin.left + ((v + xRange) / (2 * xRange)) * plotW;
  const yBase = margin.top + plotH;

  // Pre-compute the curve
  const nPts = 300;
  const curvePoints = [];
  const maxDensity = tDensity(0, df);
  for (let i = 0; i <= nPts; i++) {
    const x = -xRange + (2 * xRange * i) / nPts;
    const d = tDensity(x, df);
    curvePoints.push({ x, d });
  }
  const yScale = (d) => yBase - (d / maxDensity) * (plotH - 10);

  // Critical value for this df
  const critVal = tCrit(df);

  let tVal = tStart;

  const box = makeBox();

  // --- SVG ---
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}` });
  svg.style.cssText = "width:100%;display:block;";

  // x-axis
  svg.appendChild(
    svgEl("line", {
      x1: margin.left, y1: yBase,
      x2: margin.left + plotW, y2: yBase,
      stroke: "#999", "stroke-width": "1",
    })
  );

  // x-axis ticks
  for (let v = -4; v <= 4; v++) {
    const x = xScale(v);
    svg.appendChild(
      svgEl("line", {
        x1: x, y1: yBase, x2: x, y2: yBase + 5,
        stroke: "#999", "stroke-width": "1",
      })
    );
    const t = svgEl("text", {
      x, y: yBase + 18,
      "text-anchor": "middle", fill: "#666", "font-size": "11px",
    });
    t.textContent = v;
    svg.appendChild(t);
  }

  // x-axis label
  const xLabel = svgEl("text", {
    x: margin.left + plotW / 2, y: H - 4,
    "text-anchor": "middle", fill: "#666", "font-size": "12px",
  });
  xLabel.textContent = "t-statistic";
  svg.appendChild(xLabel);

  // Critical value lines (dashed)
  for (const cv of [-critVal, critVal]) {
    const cx = xScale(cv);
    svg.appendChild(
      svgEl("line", {
        x1: cx, y1: margin.top, x2: cx, y2: yBase,
        stroke: "#999", "stroke-width": "1", "stroke-dasharray": "4,3",
      })
    );
    const cvLabel = svgEl("text", {
      x: cx, y: margin.top - 4,
      "text-anchor": "middle", fill: "#999", "font-size": "10px",
    });
    cvLabel.textContent = cv > 0 ? `+${critVal.toFixed(2)}` : `−${critVal.toFixed(2)}`;
    svg.appendChild(cvLabel);
  }

  // Shaded tail areas (will be rebuilt on update)
  const leftTail = svgEl("path", { "fill-opacity": "0.35" });
  svg.appendChild(leftTail);
  const rightTail = svgEl("path", { "fill-opacity": "0.35" });
  svg.appendChild(rightTail);

  // Curve path
  let pathD = "";
  for (let i = 0; i <= nPts; i++) {
    const px = xScale(curvePoints[i].x);
    const py = yScale(curvePoints[i].d);
    pathD += (i === 0 ? "M" : "L") + `${px},${py}`;
  }
  svg.appendChild(
    svgEl("path", {
      d: pathD,
      fill: "none", stroke: "#333", "stroke-width": "2",
    })
  );

  // Marker line (vertical line at current t)
  const marker = svgEl("line", {
    y1: margin.top, y2: yBase,
    stroke: colorSig, "stroke-width": "2.5",
  });
  svg.appendChild(marker);

  // Marker dot
  const markerDot = svgEl("circle", {
    r: 5, fill: colorSig, stroke: "#fff", "stroke-width": "2",
  });
  svg.appendChild(markerDot);

  box.appendChild(svg);

  // --- Slider ---
  const ctrl = document.createElement("div");
  ctrl.style.cssText =
    "display:flex;align-items:center;gap:12px;margin-top:12px;";
  ctrl.innerHTML =
    '<span style="font-size:15px;font-weight:600;color:#222;min-width:200px">|t| statistic</span>' +
    `<input type="range" min="${tMin}" max="${tMax}" value="${tStart}" step="0.01" ` +
    `style="flex:1;accent-color:${colorSig};height:6px">` +
    `<span style="font-size:15px;min-width:50px;text-align:right;font-weight:600;color:#222">${tStart.toFixed(2)}</span>`;
  box.appendChild(ctrl);

  const slider = ctrl.querySelector("input");
  const tValEl = ctrl.querySelector("span:nth-of-type(2)");

  // --- Stats ---
  const stats = document.createElement("div");
  stats.style.cssText =
    "margin-top:10px;padding-top:10px;border-top:2px solid #ddd;" +
    "font-size:16px;color:#222;";
  box.appendChild(stats);

  // --- Build tail path ---
  function tailPath(from, to) {
    // Find curve points in range and build a closed path
    let d = `M${xScale(from)},${yBase}`;
    for (const pt of curvePoints) {
      if (pt.x >= from && pt.x <= to) {
        d += `L${xScale(pt.x)},${yScale(pt.d)}`;
      }
    }
    d += `L${xScale(to)},${yBase}Z`;
    return d;
  }

  // --- Update ---
  function update() {
    const absT = Math.abs(tVal);
    const pval = tPvalue(tVal, df);
    const sig = pval < 0.05;
    const col = sig ? colorSig : colorNS;

    // Marker
    const mx = xScale(absT);
    const mxNeg = xScale(-absT);
    marker.setAttribute("x1", mx);
    marker.setAttribute("x2", mx);
    marker.setAttribute("stroke", col);
    markerDot.setAttribute("cx", mx);
    markerDot.setAttribute("cy", yScale(tDensity(absT, df)));
    markerDot.setAttribute("fill", col);

    // Tail shading
    rightTail.setAttribute("d", tailPath(absT, xRange));
    rightTail.setAttribute("fill", col);
    leftTail.setAttribute("d", tailPath(-xRange, -absT));
    leftTail.setAttribute("fill", col);

    // Stats
    const cattleSE = 4.49;
    const impliedDiff = (absT * cattleSE).toFixed(1);
    const pStr = pval < 0.0001 ? "< 0.0001" : pval.toFixed(4);
    const eqLine =
      `<i>t</i> = difference / SE = ${impliedDiff} / ${cattleSE} = <b>${absT.toFixed(2)}</b>` +
      ` &nbsp; (SE = ${cattleSE} kg, from cattle data)`;
    if (sig) {
      stats.innerHTML =
        `${eqLine}<br>` +
        `A ${impliedDiff} kg difference (p = <b style="color:${colorSig}">${pStr}</b>) ` +
        `is significant at the 5% level. <b style="color:${colorSig}">Reject H\u2080.</b>`;
    } else {
      stats.innerHTML =
        `${eqLine}<br>` +
        `A ${impliedDiff} kg difference (p = <b>${pStr}</b>) ` +
        `is not significant at the 5% level. <b>Fail to reject H\u2080.</b>`;
    }
  }

  slider.oninput = () => {
    tVal = +slider.value;
    tValEl.textContent = tVal.toFixed(2);
    update();
  };

  update();
  return box;
}
