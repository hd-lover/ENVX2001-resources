/**
 * Interactive widgets for ANOVA concepts.
 * Used in Lecture 03b (L03b).
 *
 * Exports:
 *   multipleComparisonsWidget() — simulate 6 pairwise t-tests to show inflated false positive rate
 *   variancePartitionWidget()   — slider moves group means apart to show SS_treatment vs SS_residual
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


// =============================================================================
// 1. Multiple Comparisons Simulator
// =============================================================================

/**
 * Simulates 6 pairwise t-tests on 4 groups drawn from the same distribution.
 * Each click generates new data and shows which pairs produce false positives.
 * Running tally converges on ~26.5%.
 *
 * @param {Object} [opts]
 * @param {number} [opts.nPerGroup=5]    Observations per group
 * @param {number} [opts.nGroups=4]      Number of groups
 * @returns {HTMLElement}
 */
export function multipleComparisonsWidget(opts = {}) {
  const {
    nPerGroup = 5,
    nGroups = 4,
    colorOK = "#3a9a5c",
    colorFP = "#e64626",
  } = opts;

  // All pairwise combinations
  const pairs = [];
  for (let i = 0; i < nGroups; i++) {
    for (let j = i + 1; j < nGroups; j++) {
      pairs.push([i, j]);
    }
  }
  const nPairs = pairs.length; // 6

  const dfPerTest = 2 * nPerGroup - 2;
  const tc = tCrit(dfPerTest);

  let totalRounds = 0;
  let roundsWithFP = 0;

  const box = makeBox();

  // --- Grid of pairwise results ---
  const grid = document.createElement("div");
  grid.style.cssText =
    "display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;";

  const cells = [];
  for (let k = 0; k < nPairs; k++) {
    const [i, j] = pairs[k];
    const cell = document.createElement("div");
    cell.style.cssText =
      "border:2px solid #ddd;border-radius:6px;padding:10px 12px;" +
      "text-align:center;transition:background 0.2s,border-color 0.2s;";
    cell.innerHTML =
      `<div style="font-weight:700;font-size:14px;margin-bottom:4px;">` +
      `Diet ${i + 1} vs ${j + 1}</div>` +
      `<div class="pval" style="font-size:15px;color:#999;">&mdash;</div>`;
    grid.appendChild(cell);
    cells.push(cell);
  }
  box.appendChild(grid);

  // --- Controls ---
  const ctrl = document.createElement("div");
  ctrl.style.cssText =
    "display:flex;align-items:center;gap:8px;margin-bottom:4px;";

  const runBtn = document.createElement("button");
  runBtn.style.cssText = primaryBtnStyle(colorFP);
  runBtn.textContent = "Run 6 tests";

  const resetBtn = document.createElement("button");
  resetBtn.style.cssText = secondaryBtnStyle();
  resetBtn.textContent = "Reset";

  ctrl.appendChild(runBtn);
  ctrl.appendChild(resetBtn);
  box.appendChild(ctrl);

  // --- Stats / tally ---
  const stats = document.createElement("div");
  stats.style.cssText =
    "margin-top:10px;padding-top:10px;border-top:2px solid #ddd;" +
    "font-size:16px;color:#222;min-height:24px;";
  stats.innerHTML =
    "Click <b>Run 6 tests</b> to generate 4 groups from the same population " +
    "and test every pair. All groups have the same true mean, so any significant " +
    "result is a false positive.";
  box.appendChild(stats);

  // --- Tally bar ---
  const barOuter = document.createElement("div");
  barOuter.style.cssText =
    "margin-top:10px;height:20px;background:#eee;border-radius:10px;" +
    "position:relative;overflow:hidden;display:none;";

  const barInner = document.createElement("div");
  barInner.style.cssText =
    `height:100%;background:${colorFP};border-radius:10px;` +
    "transition:width 0.3s;width:0%;";
  barOuter.appendChild(barInner);

  // Target marker at 26.5%
  const targetMarker = document.createElement("div");
  targetMarker.style.cssText =
    "position:absolute;left:26.5%;top:0;bottom:0;width:2px;background:#333;";
  barOuter.appendChild(targetMarker);

  const targetLabel = document.createElement("div");
  targetLabel.style.cssText =
    "position:absolute;left:26.5%;top:-16px;transform:translateX(-50%);" +
    "font-size:10px;font-weight:600;color:#333;white-space:nowrap;";
  targetLabel.textContent = "Expected: 26.5%";
  barOuter.appendChild(targetLabel);

  box.appendChild(barOuter);

  // --- Logic ---
  function pooledTTest(a, b) {
    const nA = a.length, nB = b.length;
    const mA = a.reduce((s, v) => s + v, 0) / nA;
    const mB = b.reduce((s, v) => s + v, 0) / nB;
    const ssA = a.reduce((s, v) => s + (v - mA) ** 2, 0);
    const ssB = b.reduce((s, v) => s + (v - mB) ** 2, 0);
    const sp2 = (ssA + ssB) / (nA + nB - 2);
    if (sp2 === 0) return 0;
    return (mA - mB) / Math.sqrt(sp2 * (1 / nA + 1 / nB));
  }

  function runRound() {
    // Generate 4 groups from N(0, 1)
    const groups = [];
    for (let g = 0; g < nGroups; g++) {
      const data = [];
      for (let i = 0; i < nPerGroup; i++) data.push(randn());
      groups.push(data);
    }

    let anyFP = false;

    for (let k = 0; k < nPairs; k++) {
      const [i, j] = pairs[k];
      const tStat = pooledTTest(groups[i], groups[j]);
      const sig = Math.abs(tStat) > tc;
      if (sig) anyFP = true;

      const cell = cells[k];
      const pvalEl = cell.querySelector(".pval");

      // Approximate p-value display (simplified)
      const pApprox = sig ? "< 0.05" : "> 0.05";

      if (sig) {
        cell.style.background = "#fde8e4";
        cell.style.borderColor = colorFP;
        pvalEl.innerHTML = `<b style="color:${colorFP}">p ${pApprox}</b>`;
      } else {
        cell.style.background = "#e8f5e9";
        cell.style.borderColor = colorOK;
        pvalEl.innerHTML = `<span style="color:${colorOK}">p ${pApprox}</span>`;
      }
    }

    totalRounds++;
    if (anyFP) roundsWithFP++;

    const pct = Math.round((roundsWithFP / totalRounds) * 100);
    barOuter.style.display = "block";
    barInner.style.width = `${pct}%`;

    stats.innerHTML =
      `<b style="color:${colorFP}">${roundsWithFP}</b> / ${totalRounds} rounds ` +
      `had at least one false positive (<b>${pct}%</b>)`;
  }

  runBtn.onclick = runRound;

  resetBtn.onclick = () => {
    totalRounds = 0;
    roundsWithFP = 0;
    barOuter.style.display = "none";
    barInner.style.width = "0%";
    for (const cell of cells) {
      cell.style.background = "#fff";
      cell.style.borderColor = "#ddd";
      cell.querySelector(".pval").innerHTML = "&mdash;";
    }
    stats.innerHTML =
      "Click <b>Run 6 tests</b> to generate 4 groups from the same population " +
      "and test every pair. All groups have the same true mean, so any significant " +
      "result is a false positive.";
  };

  runBtn.onmouseenter = () => (runBtn.style.opacity = "0.85");
  runBtn.onmouseleave = () => (runBtn.style.opacity = "1");
  resetBtn.onmouseenter = () => (resetBtn.style.background = "#f5f5f5");
  resetBtn.onmouseleave = () => (resetBtn.style.background = "#fff");

  return box;
}


// =============================================================================
// 2. Variance Partitioning Explorer
// =============================================================================

/**
 * Four groups of dots with a slider that moves group means apart.
 * Shows between-group and within-group variation, and the F ratio.
 *
 * Points move with their group mean (SS_residual stays constant).
 * Blue lines: group means to overall mean. Grey lines: points to group means.
 *
 * @param {Object} [opts]
 * @param {number} [opts.width=660]
 * @param {number} [opts.nPerGroup=5]
 * @param {number} [opts.spreadStart=50]   Initial spread multiplier (%)
 * @returns {HTMLElement}
 */
export function variancePartitionWidget(opts = {}) {
  const {
    width: W = 660,
    nPerGroup = 5,
    spreadStart = 0,
    spreadMin = 0,
    spreadMax = 100,
    colorBetween = "#e64626",
    colorWithin = "#404040",
    colorPoints = ["#4477aa", "#cc6633", "#228833", "#aa3377"],
    nGroups = 4,
  } = opts;

  // Grand mean is fixed; group mean offsets are randomised each sample.
  const grandMean = 66;
  const meanSpreadSD = 15; // how far group means can deviate from grand mean
  const residualSD = 4.0;

  // Random normal generator (Box-Muller transform)
  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  // Generate random group mean offsets and residuals.
  // Offsets are recentred so the grand mean stays fixed.
  let baseMeans = [];
  let seed = [];
  function generateSample() {
    // Random offsets from grand mean (recentred)
    const raw = Array.from({ length: nGroups }, () => randn() * meanSpreadSD);
    const rawMean = raw.reduce((a, b) => a + b, 0) / raw.length;
    baseMeans = raw.map((r) => grandMean + (r - rawMean));

    // Random residuals per point
    seed = [];
    for (let g = 0; g < nGroups; g++) {
      const row = [];
      for (let p = 0; p < nPerGroup; p++) {
        row.push(randn() * residualSD);
      }
      seed.push(row);
    }
  }
  generateSample();

  const margin = { top: 20, right: 30, bottom: 30, left: 50 };
  const plotH = 190;
  const H = margin.top + plotH + margin.bottom;
  const plotW = W - margin.left - margin.right;

  const yMin = 30;
  const yMax = 100;
  const yScale = (v) =>
    margin.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  let spread = spreadStart;

  const box = makeBox();

  // --- SVG ---
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}` });
  svg.style.cssText = "width:100%;display:block;";

  // y-axis
  svg.appendChild(
    svgEl("line", {
      x1: margin.left, y1: margin.top,
      x2: margin.left, y2: margin.top + plotH,
      stroke: "#999", "stroke-width": "1",
    })
  );

  // y-axis ticks and labels
  for (let v = 40; v <= 100; v += 10) {
    const y = yScale(v);
    svg.appendChild(
      svgEl("line", {
        x1: margin.left - 4, y1: y, x2: margin.left, y2: y,
        stroke: "#999", "stroke-width": "1",
      })
    );
    const t = svgEl("text", {
      x: margin.left - 8, y: y + 4,
      "text-anchor": "end", fill: "#666", "font-size": "11px",
    });
    t.textContent = v;
    svg.appendChild(t);
  }

  // y-axis label
  const yLabel = svgEl("text", {
    x: 14, y: margin.top + plotH / 2,
    "text-anchor": "middle", fill: "#666", "font-size": "12px",
    transform: `rotate(-90, 14, ${margin.top + plotH / 2})`,
  });
  yLabel.textContent = "Weight gain (g)";
  svg.appendChild(yLabel);

  // x-axis labels (group names)
  const groupLabels = ["Diet 1", "Diet 2", "Diet 3", "Diet 4"];

  for (let g = 0; g < nGroups; g++) {
    const cx = margin.left + plotW * ((g + 1) / (nGroups + 1));
    const t = svgEl("text", {
      x: cx, y: margin.top + plotH + 18,
      "text-anchor": "middle", fill: "#666", "font-size": "12px",
    });
    t.textContent = groupLabels[g];
    svg.appendChild(t);
  }

  // Grand mean line (dashed) — will update position
  const grandMeanLine = svgEl("line", {
    x1: margin.left, x2: margin.left + plotW,
    stroke: "#333", "stroke-width": "1.5", "stroke-dasharray": "6,3",
  });
  svg.appendChild(grandMeanLine);

  const grandMeanLabel = svgEl("text", {
    x: margin.left + 6,
    "text-anchor": "start", fill: "#333", "font-size": "11px",
    "font-weight": "bold",
  });
  svg.appendChild(grandMeanLabel);

  // Dynamic elements group (lines + points, rebuilt on update)
  const dynG = svgEl("g", {});
  svg.appendChild(dynG);

  // --- Legend (top-right) ---
  const legendX = margin.left + plotW - 160;
  const legendY = margin.top + 6;
  const legendG = svgEl("g", {});

  // Between-group legend
  legendG.appendChild(
    svgEl("line", {
      x1: legendX, y1: legendY, x2: legendX + 24, y2: legendY,
      stroke: colorBetween, "stroke-width": "3", opacity: "0.5",
    })
  );
  const legBetween = svgEl("text", {
    x: legendX + 30, y: legendY + 4,
    fill: "#333", "font-size": "11px",
  });
  legBetween.textContent = "Between groups";
  legendG.appendChild(legBetween);

  // Within-group legend
  legendG.appendChild(
    svgEl("line", {
      x1: legendX, y1: legendY + 16, x2: legendX + 24, y2: legendY + 16,
      stroke: colorWithin, "stroke-width": "1", opacity: "0.7",
    })
  );
  const legWithin = svgEl("text", {
    x: legendX + 30, y: legendY + 20,
    fill: "#333", "font-size": "11px",
  });
  legWithin.textContent = "Within groups";
  legendG.appendChild(legWithin);

  svg.appendChild(legendG);

  box.appendChild(svg);

  // --- Slider ---
  const sliderLabel = document.createElement("div");
  sliderLabel.style.cssText =
    "font-size:15px;font-weight:600;color:#222;margin-top:12px;margin-bottom:4px;";
  sliderLabel.textContent = "Difference between diets";
  box.appendChild(sliderLabel);

  const ctrl = document.createElement("div");
  ctrl.style.cssText =
    "display:flex;align-items:center;gap:12px;";
  ctrl.innerHTML =
    '<span style="font-size:14px;color:#666">None</span>' +
    `<input type="range" min="${spreadMin}" max="${spreadMax}" value="${spreadStart}" step="1" ` +
    `style="flex:1;accent-color:${colorBetween};height:6px">` +
    '<span style="font-size:14px;color:#666">Large</span>';
  box.appendChild(ctrl);

  const slider = ctrl.querySelector("input");

  // --- New sample button ---
  const sampleBtn = document.createElement("button");
  sampleBtn.textContent = "New sample";
  sampleBtn.style.cssText =
    "margin-top:8px;padding:6px 16px;font-size:14px;font-weight:600;" +
    "border:2px solid #999;border-radius:4px;background:#fff;color:#333;" +
    "cursor:pointer;";
  sampleBtn.onmouseenter = () => { sampleBtn.style.background = "#f0f0f0"; };
  sampleBtn.onmouseleave = () => { sampleBtn.style.background = "#fff"; };
  sampleBtn.onclick = () => { generateSample(); spread = 0; slider.value = 0; update(); };
  box.appendChild(sampleBtn);

  // --- Stats ---
  const stats = document.createElement("div");
  stats.style.cssText =
    "margin-top:10px;padding-top:10px;border-top:2px solid #ddd;" +
    "font-size:16px;color:#222;";
  box.appendChild(stats);

  // --- Update ---
  function update() {
    const frac = spread / 100;

    // Current group means
    const means = baseMeans.map(
      (m) => grandMean + (m - grandMean) * frac
    );

    // Grand mean line (always at grandMean since means are symmetric)
    const gmY = yScale(grandMean);
    grandMeanLine.setAttribute("y1", gmY);
    grandMeanLine.setAttribute("y2", gmY);
    grandMeanLabel.setAttribute("y", gmY - 4);
    grandMeanLabel.textContent = `Overall mean: ${grandMean.toFixed(1)}`;

    // Clear dynamic elements
    while (dynG.firstChild) dynG.removeChild(dynG.firstChild);

    let ssTreatment = 0;
    let ssResidual = 0;

    for (let g = 0; g < nGroups; g++) {
      const cx = margin.left + plotW * ((g + 1) / (nGroups + 1));
      const gm = means[g];
      const gmY = yScale(gm);

      // Between-group line (group mean to grand mean)
      dynG.appendChild(
        svgEl("line", {
          x1: cx, y1: yScale(grandMean), x2: cx, y2: gmY,
          stroke: colorBetween, "stroke-width": "3", opacity: "0.5",
        })
      );

      // Group mean diamond
      const dSize = 6;
      dynG.appendChild(
        svgEl("polygon", {
          points: `${cx},${gmY - dSize} ${cx + dSize},${gmY} ${cx},${gmY + dSize} ${cx - dSize},${gmY}`,
          fill: colorBetween, stroke: "#fff", "stroke-width": "1.5",
        })
      );

      // SS_treatment contribution
      ssTreatment += nPerGroup * (gm - grandMean) ** 2;

      // Points and within-group lines
      for (let p = 0; p < nPerGroup; p++) {
        const val = gm + seed[g][p];
        const py = yScale(val);
        const jitter = (p - 2) * 6;

        // Within-group line (group mean to jittered point)
        dynG.appendChild(
          svgEl("line", {
            x1: cx, y1: gmY, x2: cx + jitter, y2: py,
            stroke: colorWithin, "stroke-width": "1", opacity: "0.7",
          })
        );

        // Point (with slight horizontal jitter for visibility)
        dynG.appendChild(
          svgEl("circle", {
            cx: cx + jitter, cy: py, r: 4,
            fill: colorPoints[g], opacity: "0.8",
          })
        );

        // SS_residual contribution
        ssResidual += seed[g][p] ** 2;
      }
    }

    const fRatio = ssResidual > 0
      ? (ssTreatment / (nGroups - 1)) / (ssResidual / (nGroups * (nPerGroup - 1)))
      : 0;

    const ratio = ssResidual > 0 ? (ssTreatment / ssResidual).toFixed(1) : "—";
    stats.innerHTML =
      `<span style="color:${colorBetween}"><b>Variation due to diets:</b> ${ssTreatment.toFixed(1)}</span>` +
      ` &middot; ` +
      `<span style="color:${colorWithin}"><b>Leftover variation:</b> ${ssResidual.toFixed(1)}</span>` +
      ` &middot; ` +
      `<b>Ratio: ${ratio}&times;</b>`;
  }

  slider.oninput = () => {
    spread = +slider.value;
    update();
  };

  update();
  return box;
}
