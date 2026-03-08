/**
 * Interactive assumption-checking widget with progressive hints.
 *
 * Generates random multi-group datasets (2–4 groups) with known properties,
 * renders one diagnostic (QQ plot, boxplot, residuals vs fitted, or dotplot),
 * and provides progressive hints to help the student reason through whether
 * the relevant assumption is met.
 *
 * Used in Tutorial 03.
 *
 * @module assumption-checker
 */

// --- Shared utilities --------------------------------------------------------

/** Box-Muller transform: returns a standard normal variate. */
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Generate n values from N(mean, sd). */
function rnorm(n, mean, sd) {
  return Array.from({ length: n }, () => mean + sd * randn());
}

/** Generate n values from a right-skewed (exponential) distribution. */
function rskew(n, location, scale) {
  return Array.from({ length: n }, () => location - scale * Math.log(Math.random()));
}

/** Compute mean of an array. */
function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Compute standard deviation of an array (sample SD). */
function sd(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / (arr.length - 1));
}

/** Compute quantile using linear interpolation. */
function quantile(sorted, p) {
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Normal quantile approximation (Beasley-Springer-Moro). */
function qnorm(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2,
    -2.759285104469687e2, 1.383577518672690e2,
    -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2,
    -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1,
    -2.400758277161838e0, -2.549732539343734e0,
    4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996e0, 3.754408661907416e0,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q, r;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]
    ) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      ((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]
    ) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

/** Theoretical normal quantiles for a sorted sample of size n. */
function theoreticalQuantiles(n) {
  return Array.from({ length: n }, (_, i) => qnorm((i + 0.5) / n));
}

/** SVG element helper. */
function svgEl(tag, attrs) {
  const ns = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}


// --- Scenarios ---------------------------------------------------------------

const GROUP_COLORS = ["#4477aa", "#cc6633", "#228833", "#aa3377"];
const GROUP_FILLS  = ["#a8c8e8", "#f0d0b0", "#b8dbb8", "#d8a8d0"];

const SCENARIOS = [
  // --- 2 groups, large (n = 20) ---
  {
    id: "2g_normal_equal_large",
    n: 20, nGroups: 2, normality: true, equalVar: true,
    generate() {
      return { groups: [
        { data: rnorm(20, 10, 2),   desc: "20 obs, normal (mean 10, SD 2)" },
        { data: rnorm(20, 14, 2.5), desc: "20 obs, normal (mean 14, SD 2.5)" },
      ]};
    },
  },
  {
    id: "2g_normal_unequal_large",
    n: 20, nGroups: 2, normality: true, equalVar: false,
    generate() {
      return { groups: [
        { data: rnorm(20, 10, 2), desc: "20 obs, normal (mean 10, SD 2)" },
        { data: rnorm(20, 14, 8), desc: "20 obs, normal (mean 14, SD 8)" },
      ]};
    },
  },
  {
    id: "2g_skewed_equal_large",
    n: 20, nGroups: 2, normality: false, equalVar: true,
    generate() {
      return { groups: [
        { data: rnorm(20, 10, 2), desc: "20 obs, normal (mean 10, SD 2)" },
        { data: rskew(20, 8, 2),  desc: "20 obs, right-skewed" },
      ]};
    },
  },
  {
    id: "2g_skewed_unequal_large",
    n: 20, nGroups: 2, normality: false, equalVar: false,
    generate() {
      return { groups: [
        { data: rnorm(20, 10, 2), desc: "20 obs, normal (mean 10, SD 2)" },
        { data: rskew(20, 8, 6),  desc: "20 obs, right-skewed, large spread" },
      ]};
    },
  },
  // --- 2 groups, small (n = 10) ---
  {
    id: "2g_normal_equal_small",
    n: 10, nGroups: 2, normality: true, equalVar: true,
    generate() {
      return { groups: [
        { data: rnorm(10, 10, 2),   desc: "10 obs, normal (mean 10, SD 2)" },
        { data: rnorm(10, 14, 2.5), desc: "10 obs, normal (mean 14, SD 2.5)" },
      ]};
    },
  },
  {
    id: "2g_skewed_unequal_small",
    n: 10, nGroups: 2, normality: false, equalVar: false,
    generate() {
      return { groups: [
        { data: rnorm(10, 10, 2), desc: "10 obs, normal (mean 10, SD 2)" },
        { data: rskew(10, 8, 6),  desc: "10 obs, right-skewed, large spread" },
      ]};
    },
  },
  // --- 3 groups, large (n = 20) ---
  {
    id: "3g_normal_equal_large",
    n: 20, nGroups: 3, normality: true, equalVar: true,
    generate() {
      return { groups: [
        { data: rnorm(20, 10, 2),   desc: "20 obs, normal (mean 10, SD 2)" },
        { data: rnorm(20, 14, 2.5), desc: "20 obs, normal (mean 14, SD 2.5)" },
        { data: rnorm(20, 18, 2),   desc: "20 obs, normal (mean 18, SD 2)" },
      ]};
    },
  },
  {
    id: "3g_normal_unequal_large",
    n: 20, nGroups: 3, normality: true, equalVar: false,
    generate() {
      return { groups: [
        { data: rnorm(20, 10, 2), desc: "20 obs, normal (mean 10, SD 2)" },
        { data: rnorm(20, 14, 7), desc: "20 obs, normal (mean 14, SD 7)" },
        { data: rnorm(20, 18, 2), desc: "20 obs, normal (mean 18, SD 2)" },
      ]};
    },
  },
  {
    id: "3g_skewed_equal_small",
    n: 10, nGroups: 3, normality: false, equalVar: true,
    generate() {
      return { groups: [
        { data: rnorm(10, 10, 2), desc: "10 obs, normal (mean 10, SD 2)" },
        { data: rnorm(10, 14, 2), desc: "10 obs, normal (mean 14, SD 2)" },
        { data: rskew(10, 8, 2),  desc: "10 obs, right-skewed" },
      ]};
    },
  },
  // --- 4 groups, large (n = 20) ---
  {
    id: "4g_normal_equal_large",
    n: 20, nGroups: 4, normality: true, equalVar: true,
    generate() {
      return { groups: [
        { data: rnorm(20, 8, 2),    desc: "20 obs, normal (mean 8, SD 2)" },
        { data: rnorm(20, 12, 2.5), desc: "20 obs, normal (mean 12, SD 2.5)" },
        { data: rnorm(20, 16, 2),   desc: "20 obs, normal (mean 16, SD 2)" },
        { data: rnorm(20, 20, 2.5), desc: "20 obs, normal (mean 20, SD 2.5)" },
      ]};
    },
  },
  {
    id: "4g_normal_unequal_small",
    n: 10, nGroups: 4, normality: true, equalVar: false,
    generate() {
      return { groups: [
        { data: rnorm(10, 8, 2),  desc: "10 obs, normal (mean 8, SD 2)" },
        { data: rnorm(10, 12, 7), desc: "10 obs, normal (mean 12, SD 7)" },
        { data: rnorm(10, 16, 2), desc: "10 obs, normal (mean 16, SD 2)" },
        { data: rnorm(10, 20, 8), desc: "10 obs, normal (mean 20, SD 8)" },
      ]};
    },
  },
  {
    id: "4g_skewed_unequal_large",
    n: 20, nGroups: 4, normality: false, equalVar: false,
    generate() {
      return { groups: [
        { data: rnorm(20, 8, 2),  desc: "20 obs, normal (mean 8, SD 2)" },
        { data: rnorm(20, 12, 7), desc: "20 obs, normal (mean 12, SD 7)" },
        { data: rskew(20, 10, 2), desc: "20 obs, right-skewed" },
        { data: rskew(20, 14, 5), desc: "20 obs, right-skewed, large spread" },
      ]};
    },
  },
];


// --- Diagnostics -------------------------------------------------------------

const DIAGNOSTICS = {
  qq: {
    assumption: "normality",
    title: "Normal QQ plot",
    question: "Is the normality assumption met?",
    render(svg, W, H, allData) {
      const margin = { top: 30, right: 20, bottom: 42, left: 45 };
      const pW = W - margin.left - margin.right;
      const pH = H - margin.top - margin.bottom;

      const groups = allData.groups;
      const residuals = [];
      for (const g of groups) {
        const m = mean(g.data);
        for (const v of g.data) residuals.push(v - m);
      }
      residuals.sort((a, b) => a - b);

      const tq = theoreticalQuantiles(residuals.length);

      const xMin = Math.min(...tq) - 0.3, xMax = Math.max(...tq) + 0.3;
      const yMin = Math.min(...residuals) - 0.5, yMax = Math.max(...residuals) + 0.5;
      const xScale = (v) => margin.left + ((v - xMin) / (xMax - xMin)) * pW;
      const yScale = (v) => margin.top + pH - ((v - yMin) / (yMax - yMin)) * pH;

      // Axes
      svg.appendChild(svgEl("line", {
        x1: margin.left, y1: margin.top + pH, x2: margin.left + pW, y2: margin.top + pH,
        stroke: "#999", "stroke-width": "1",
      }));
      svg.appendChild(svgEl("line", {
        x1: margin.left, y1: margin.top, x2: margin.left, y2: margin.top + pH,
        stroke: "#999", "stroke-width": "1",
      }));

      // X-axis tick marks at SD values
      for (const tick of [-2, -1, 0, 1, 2]) {
        if (tick < xMin || tick > xMax) continue;
        const tx = xScale(tick);
        svg.appendChild(svgEl("line", {
          x1: tx, y1: margin.top + pH, x2: tx, y2: margin.top + pH + 4,
          stroke: "#999", "stroke-width": "1",
        }));
        const tickLabel = svgEl("text", {
          x: tx, y: margin.top + pH + 15,
          "text-anchor": "middle", fill: "#666", "font-size": "10px",
        });
        tickLabel.textContent = tick;
        svg.appendChild(tickLabel);
      }

      // Axis labels
      const xLabel = svgEl("text", {
        x: margin.left + pW / 2, y: H - 2,
        "text-anchor": "middle", fill: "#666", "font-size": "12px",
      });
      xLabel.textContent = "Theoretical quantiles (standard deviations)";
      svg.appendChild(xLabel);

      const yLabel = svgEl("text", {
        x: 14, y: margin.top + pH / 2,
        "text-anchor": "middle", fill: "#666", "font-size": "12px",
        transform: `rotate(-90, 14, ${margin.top + pH / 2})`,
      });
      yLabel.textContent = "Sample quantiles";
      svg.appendChild(yLabel);

      // Reference line (Q1 to Q3)
      const q1Idx = Math.floor(residuals.length * 0.25);
      const q3Idx = Math.floor(residuals.length * 0.75);
      const slope = (residuals[q3Idx] - residuals[q1Idx]) / (tq[q3Idx] - tq[q1Idx]);
      const intercept = residuals[q1Idx] - slope * tq[q1Idx];
      const lineY = (x) => slope * x + intercept;

      svg.appendChild(svgEl("line", {
        x1: xScale(xMin), y1: yScale(lineY(xMin)),
        x2: xScale(xMax), y2: yScale(lineY(xMax)),
        stroke: "#c62828", "stroke-width": "1.5", "stroke-dasharray": "5,3",
      }));

      // Title
      const title = svgEl("text", {
        x: margin.left + pW / 2, y: 16,
        "text-anchor": "middle", fill: "#444", "font-size": "13px", "font-weight": "600",
      });
      title.textContent = "Normal QQ plot";
      svg.appendChild(title);

      // Points
      for (let i = 0; i < residuals.length; i++) {
        svg.appendChild(svgEl("circle", {
          cx: xScale(tq[i]), cy: yScale(residuals[i]), r: 4,
          fill: "#4477aa", opacity: "0.8",
        }));
      }
    },
    hints(scenario) {
      const n = scenario.n * scenario.nGroups;
      const large = n >= 30;
      if (scenario.normality) {
        return [
          `The x-axis shows standard deviations from the mean. Points between \u22121 and +1 cover about 68% of the data. If those follow the line, the central bulk is normal.`,
          large
            ? `With ${n} residuals (above the n \u2265 30 guideline), ANOVA is robust to moderate non-normality. Some wobble at the tails is expected \u2014 look for systematic curvature, not individual outliers.`
            : `With only ${n} residuals (below n \u2265 30), the Central Limit Theorem does not guarantee robustness. The QQ plot matters more here. A formal test like Shapiro-Wilk (shapiro.test() in R) could supplement this visual check.`,
        ];
      } else {
        return [
          `Focus on the central region (\u22121 to +1 on the x-axis). Do the points follow the line there? Then look at the tails \u2014 do they curve away systematically?`,
          large
            ? `The points curve away from the line in a consistent direction. This is not random scatter \u2014 it is a pattern that suggests the residuals are skewed. However, with ${n} residuals, ANOVA can tolerate moderate skew.`
            : `The points curve away from the line consistently, suggesting the residuals are skewed. With only ${n} residuals, this is a concern \u2014 ANOVA is less robust at small sample sizes. Consider a formal test (shapiro.test()) or a non-parametric alternative.`,
        ];
      }
    },
  },

  boxplot: {
    assumption: "equalVar",
    title: "Boxplots by group",
    question: "Is the equal variance assumption met?",
    render(svg, W, H, allData) {
      const margin = { top: 30, right: 20, bottom: 35, left: 45 };
      const pW = W - margin.left - margin.right;
      const pH = H - margin.top - margin.bottom;

      const groups = allData.groups;
      const nG = groups.length;
      const all = groups.flatMap((g) => g.data);
      const yMin = Math.min(...all) - 1, yMax = Math.max(...all) + 1;
      const yScale = (v) => margin.top + pH - ((v - yMin) / (yMax - yMin)) * pH;

      // Axes
      svg.appendChild(svgEl("line", {
        x1: margin.left, y1: margin.top + pH, x2: margin.left + pW, y2: margin.top + pH,
        stroke: "#999", "stroke-width": "1",
      }));
      svg.appendChild(svgEl("line", {
        x1: margin.left, y1: margin.top, x2: margin.left, y2: margin.top + pH,
        stroke: "#999", "stroke-width": "1",
      }));

      // Y-axis label
      const yLabel = svgEl("text", {
        x: 14, y: margin.top + pH / 2,
        "text-anchor": "middle", fill: "#666", "font-size": "12px",
        transform: `rotate(-90, 14, ${margin.top + pH / 2})`,
      });
      yLabel.textContent = "Value";
      svg.appendChild(yLabel);

      // Title
      const title = svgEl("text", {
        x: margin.left + pW / 2, y: 16,
        "text-anchor": "middle", fill: "#444", "font-size": "13px", "font-weight": "600",
      });
      title.textContent = "Boxplots by group";
      svg.appendChild(title);

      // Draw boxplots — position evenly
      const boxW = pW * Math.min(0.22, 0.7 / nG);

      for (let gi = 0; gi < nG; gi++) {
        const g = groups[gi];
        const cx = margin.left + pW * ((gi + 1) / (nG + 1));
        const color = GROUP_FILLS[gi];
        const stroke = GROUP_COLORS[gi];

        const sorted = [...g.data].sort((a, b) => a - b);
        const q1 = quantile(sorted, 0.25);
        const med = quantile(sorted, 0.5);
        const q3 = quantile(sorted, 0.75);
        const iqr = q3 - q1;
        const wLo = Math.max(sorted[0], q1 - 1.5 * iqr);
        const wHi = Math.min(sorted[sorted.length - 1], q3 + 1.5 * iqr);

        // Whiskers
        svg.appendChild(svgEl("line", {
          x1: cx, y1: yScale(wHi), x2: cx, y2: yScale(q3),
          stroke, "stroke-width": "1.5",
        }));
        svg.appendChild(svgEl("line", {
          x1: cx - boxW * 0.3, y1: yScale(wHi), x2: cx + boxW * 0.3, y2: yScale(wHi),
          stroke, "stroke-width": "1.5",
        }));
        svg.appendChild(svgEl("line", {
          x1: cx, y1: yScale(q1), x2: cx, y2: yScale(wLo),
          stroke, "stroke-width": "1.5",
        }));
        svg.appendChild(svgEl("line", {
          x1: cx - boxW * 0.3, y1: yScale(wLo), x2: cx + boxW * 0.3, y2: yScale(wLo),
          stroke, "stroke-width": "1.5",
        }));

        // Box
        const boxTop = yScale(q3);
        const boxBot = yScale(q1);
        svg.appendChild(svgEl("rect", {
          x: cx - boxW / 2, y: boxTop, width: boxW, height: Math.max(1, boxBot - boxTop),
          fill: color, stroke, "stroke-width": "1.5", rx: "2",
        }));

        // Median
        svg.appendChild(svgEl("line", {
          x1: cx - boxW / 2, y1: yScale(med), x2: cx + boxW / 2, y2: yScale(med),
          stroke, "stroke-width": "2",
        }));

        // Outliers
        for (const v of sorted) {
          if (v < wLo || v > wHi) {
            svg.appendChild(svgEl("circle", {
              cx, cy: yScale(v), r: 3,
              fill: "none", stroke, "stroke-width": "1.5",
            }));
          }
        }

        // Label
        const lbl = svgEl("text", {
          x: cx, y: margin.top + pH + 18,
          "text-anchor": "middle", fill: "#666", "font-size": nG > 3 ? "10px" : "12px",
        });
        lbl.textContent = `Group ${gi + 1}`;
        svg.appendChild(lbl);
      }
    },
    hints(scenario) {
      const small = scenario.n <= 10;
      if (scenario.equalVar) {
        return [
          `Compare the height of the boxes (the interquartile range). Equal variance means similar spread, not similar medians \u2014 the boxes can be at different positions.`,
          small
            ? `The boxes look similar in height. With only ${scenario.n} per group, boxplots can be misleading \u2014 the IQR is estimated from few points. Check the SD ratio numerically (in R) to be sure.`
            : `The boxes are roughly the same height. Some difference is expected with random sampling. A useful rule: if the largest SD is less than twice the smallest, the assumption is reasonable.`,
        ];
      } else {
        return [
          `Compare the height of the boxes (the interquartile range). Equal variance means similar spread, not similar medians.`,
          small
            ? `At least one box is clearly taller. With only ${scenario.n} per group, even moderate differences in spread can distort the F test. Compute the SD ratio in R to confirm.`
            : `At least one box is clearly taller than the others. That group is more variable. If the ratio of the largest to smallest SD exceeds 2, the equal variance assumption is questionable.`,
        ];
      }
    },
  },

  rvf: {
    assumption: "equalVar",
    title: "Residuals vs fitted values",
    question: "Is the equal variance assumption met?",
    render(svg, W, H, allData) {
      const margin = { top: 30, right: 20, bottom: 35, left: 45 };
      const pW = W - margin.left - margin.right;
      const pH = H - margin.top - margin.bottom;

      const groups = allData.groups;
      const points = [];
      const fittedVals = [];
      for (let gi = 0; gi < groups.length; gi++) {
        const m = mean(groups[gi].data);
        fittedVals.push(m);
        for (const v of groups[gi].data) {
          points.push({ fitted: m, resid: v - m, gi });
        }
      }

      const allResid = points.map((p) => p.resid);
      const fMin = Math.min(...fittedVals) - 2, fMax = Math.max(...fittedVals) + 2;
      const rMin = Math.min(...allResid) - 1, rMax = Math.max(...allResid) + 1;

      const xScale = (v) => margin.left + ((v - fMin) / (fMax - fMin)) * pW;
      const yScale = (v) => margin.top + pH - ((v - rMin) / (rMax - rMin)) * pH;

      // Axes
      svg.appendChild(svgEl("line", {
        x1: margin.left, y1: margin.top + pH, x2: margin.left + pW, y2: margin.top + pH,
        stroke: "#999", "stroke-width": "1",
      }));
      svg.appendChild(svgEl("line", {
        x1: margin.left, y1: margin.top, x2: margin.left, y2: margin.top + pH,
        stroke: "#999", "stroke-width": "1",
      }));

      // Zero line
      svg.appendChild(svgEl("line", {
        x1: margin.left, y1: yScale(0), x2: margin.left + pW, y2: yScale(0),
        stroke: "#999", "stroke-width": "1", "stroke-dasharray": "4,3",
      }));

      // Axis labels
      const xLabel = svgEl("text", {
        x: margin.left + pW / 2, y: H - 5,
        "text-anchor": "middle", fill: "#666", "font-size": "12px",
      });
      xLabel.textContent = "Fitted values";
      svg.appendChild(xLabel);

      const yLabel = svgEl("text", {
        x: 14, y: margin.top + pH / 2,
        "text-anchor": "middle", fill: "#666", "font-size": "12px",
        transform: `rotate(-90, 14, ${margin.top + pH / 2})`,
      });
      yLabel.textContent = "Residuals";
      svg.appendChild(yLabel);

      // Title
      const title = svgEl("text", {
        x: margin.left + pW / 2, y: 16,
        "text-anchor": "middle", fill: "#444", "font-size": "13px", "font-weight": "600",
      });
      title.textContent = "Residuals vs fitted values";
      svg.appendChild(title);

      // Points — NO jitter on x-axis; points sit at exact fitted values
      for (const p of points) {
        svg.appendChild(svgEl("circle", {
          cx: xScale(p.fitted), cy: yScale(p.resid), r: 4,
          fill: GROUP_COLORS[p.gi], opacity: "0.75",
        }));
      }
    },
    hints(scenario) {
      const small = scenario.n <= 10;
      if (scenario.equalVar) {
        return [
          `Compare the vertical spread of points at each fitted value. A fan shape (wider on one side) indicates unequal variance.`,
          small
            ? `The spread looks similar at each fitted value, but with only ${scenario.n} points per group it is hard to judge. Compute the SD ratio in R for a clearer picture.`
            : `The spread looks similar at each fitted value. Random scatter around the zero line with similar width is what we want to see.`,
        ];
      } else {
        return [
          `Compare the vertical spread of points at each fitted value. A fan shape (wider on one side) indicates unequal variance.`,
          small
            ? `At least one column is more spread out than the others. With ${scenario.n} per group, this fan shape is particularly concerning because the pooled variance estimate is based on very few observations.`
            : `At least one column of points is much more spread out than the others. This fan shape means the groups have different variability.`,
        ];
      }
    },
  },

  dotplot: {
    assumption: "equalVar",
    title: "Dotplot by group",
    question: "Is the equal variance assumption met?",
    render(svg, W, H, allData) {
      const margin = { top: 30, right: 20, bottom: 35, left: 45 };
      const pW = W - margin.left - margin.right;
      const pH = H - margin.top - margin.bottom;

      const groups = allData.groups;
      const nG = groups.length;
      const all = groups.flatMap((g) => g.data);
      const yMin = Math.min(...all) - 1, yMax = Math.max(...all) + 1;
      const yScale = (v) => margin.top + pH - ((v - yMin) / (yMax - yMin)) * pH;

      // Axes
      svg.appendChild(svgEl("line", {
        x1: margin.left, y1: margin.top + pH, x2: margin.left + pW, y2: margin.top + pH,
        stroke: "#999", "stroke-width": "1",
      }));
      svg.appendChild(svgEl("line", {
        x1: margin.left, y1: margin.top, x2: margin.left, y2: margin.top + pH,
        stroke: "#999", "stroke-width": "1",
      }));

      // Y-axis label
      const yLabel = svgEl("text", {
        x: 14, y: margin.top + pH / 2,
        "text-anchor": "middle", fill: "#666", "font-size": "12px",
        transform: `rotate(-90, 14, ${margin.top + pH / 2})`,
      });
      yLabel.textContent = "Value";
      svg.appendChild(yLabel);

      // Title
      const title = svgEl("text", {
        x: margin.left + pW / 2, y: 16,
        "text-anchor": "middle", fill: "#444", "font-size": "13px", "font-weight": "600",
      });
      title.textContent = "Dotplot by group";
      svg.appendChild(title);

      // Draw dots with jitter — position evenly
      const jitterW = pW * Math.min(0.08, 0.25 / nG);

      for (let gi = 0; gi < nG; gi++) {
        const g = groups[gi];
        const cx = margin.left + pW * ((gi + 1) / (nG + 1));
        const color = GROUP_COLORS[gi];

        for (const v of g.data) {
          const jx = cx + (Math.random() - 0.5) * 2 * jitterW;
          svg.appendChild(svgEl("circle", {
            cx: jx, cy: yScale(v), r: 3.5,
            fill: color, opacity: "0.7",
          }));
        }

        // Group label
        const lbl = svgEl("text", {
          x: cx, y: margin.top + pH + 18,
          "text-anchor": "middle", fill: "#666", "font-size": nG > 3 ? "10px" : "12px",
        });
        lbl.textContent = `Group ${gi + 1}`;
        svg.appendChild(lbl);
      }
    },
    hints(scenario) {
      const small = scenario.n <= 10;
      if (scenario.equalVar) {
        return [
          `Compare the vertical spread of dots in each group. Equal variance means similar spread, not similar centres. Imagine drawing a rectangle around each cloud of points.`,
          small
            ? `The groups span a similar range, but with only ${scenario.n} dots per group, a single outlier can change the picture. Compute the SD ratio in R to check.`
            : `The groups span a similar range. You could estimate the SD ratio by eye: if no cloud is noticeably wider than the others, the ratio of largest to smallest SD is likely below 2.`,
        ];
      } else {
        return [
          `Compare the vertical spread of dots in each group. At least one cloud of points covers a much wider range than the others.`,
          small
            ? `The spread is clearly different. With only ${scenario.n} per group, visual assessment is unreliable \u2014 but when the difference is this obvious, the SD ratio almost certainly exceeds 2.`
            : `The spread is clearly different. When one group is this much more spread out, the ratio of the largest to smallest SD likely exceeds 2 and the equal variance assumption is questionable.`,
        ];
      }
    },
  },
};

const NORMALITY_DIAGNOSTICS = ["qq"];
const EQUAL_VAR_DIAGNOSTICS = ["boxplot", "rvf", "dotplot"];


// --- Widget ------------------------------------------------------------------

/**
 * Creates the assumption checker widget with progressive hints.
 *
 * @param {Object} [opts]
 * @returns {HTMLElement}
 */
export function assumptionCheckerWidget(opts = {}) {
  const svgW = 420, svgH = 220;
  const ACCENT = "#e64626";

  let round = 0;
  let currentScenario, currentDiagKey, currentDiag, currentData;

  // --- Container ---
  const box = document.createElement("div");
  box.style.cssText =
    "background:#fff;border:2px solid #e0e0e0;border-radius:12px;" +
    "overflow:hidden;font-family:system-ui,sans-serif;font-size:15px;color:#222;" +
    "max-width:720px;width:100%;";

  // Header
  const header = document.createElement("div");
  header.style.cssText =
    `background:${ACCENT};color:#fff;padding:14px 20px;font-size:17px;font-weight:700;`;
  box.appendChild(header);

  // Body
  const body = document.createElement("div");
  body.style.cssText = "padding:20px;";
  box.appendChild(body);

  // Data description
  const dataBox = document.createElement("div");
  dataBox.style.cssText =
    "background:#f9f6f3;border:1px solid #e8e0d8;border-radius:8px;padding:14px;margin-bottom:18px;";
  body.appendChild(dataBox);

  // SVG container
  const svgContainer = document.createElement("div");
  svgContainer.style.cssText = "text-align:center;margin-bottom:18px;";
  body.appendChild(svgContainer);

  // Question
  const questionEl = document.createElement("div");
  questionEl.style.cssText = "font-size:16px;font-weight:600;margin-bottom:14px;";
  body.appendChild(questionEl);

  // Hints area
  const hintsArea = document.createElement("div");
  hintsArea.style.cssText = "display:flex;flex-direction:column;gap:10px;";
  body.appendChild(hintsArea);

  // Footer
  const footer = document.createElement("div");
  footer.style.cssText =
    "padding:14px 20px;border-top:1px solid #eee;display:flex;" +
    "justify-content:flex-end;align-items:center;gap:10px;";
  box.appendChild(footer);

  const nextBtn = document.createElement("button");
  nextBtn.style.cssText =
    `background:${ACCENT};color:#fff;border:none;border-radius:6px;` +
    "padding:10px 24px;font-size:14px;font-weight:600;cursor:pointer;";
  nextBtn.textContent = "Start";
  nextBtn.onmouseenter = () => (nextBtn.style.opacity = "0.85");
  nextBtn.onmouseleave = () => (nextBtn.style.opacity = "1");
  footer.appendChild(nextBtn);

  // --- Hint button factory ---
  function makeHintBtn(label) {
    const btn = document.createElement("button");
    btn.style.cssText =
      "background:#fff;color:#555;border:2px solid #ccc;border-radius:8px;" +
      "padding:10px 16px;font-size:14px;font-weight:600;cursor:pointer;" +
      "text-align:left;width:100%;transition:border-color 0.15s;";
    btn.textContent = label;
    btn.onmouseenter = () => { if (btn.dataset.revealed !== "true") btn.style.borderColor = ACCENT; };
    btn.onmouseleave = () => { if (btn.dataset.revealed !== "true") btn.style.borderColor = "#ccc"; };
    return btn;
  }

  // --- Round logic ---
  function newRound() {
    round++;

    // Pick scenario
    currentScenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    currentData = currentScenario.generate();

    // Pick diagnostic
    const pool = Math.random() < 0.35 ? NORMALITY_DIAGNOSTICS : EQUAL_VAR_DIAGNOSTICS;
    currentDiagKey = pool[Math.floor(Math.random() * pool.length)];
    currentDiag = DIAGNOSTICS[currentDiagKey];

    // Header
    header.innerHTML =
      `Does the data meet the assumptions of the test? <span style="font-weight:400;font-size:13px;opacity:0.85">\u2014 Round ${round}</span>`;

    // Data description
    const groups = currentData.groups;
    dataBox.innerHTML =
      `<div style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin-bottom:6px;">Data</div>` +
      groups.map((g, i) =>
        `<div style="margin-bottom:${i < groups.length - 1 ? 4 : 0}px;"><strong>Group ${i + 1}:</strong> ${g.desc}</div>`
      ).join("");

    // Render diagnostic
    svgContainer.innerHTML = "";
    const svg = svgEl("svg", { viewBox: `0 0 ${svgW} ${svgH}` });
    svg.style.cssText =
      "display:inline-block;width:100%;max-width:420px;" +
      "border:1px solid #eee;border-radius:8px;background:#fafafa;";
    currentDiag.render(svg, svgW, svgH, currentData);
    svgContainer.appendChild(svg);

    // Question
    questionEl.textContent = currentDiag.question;

    // Build hint buttons
    const hints = currentDiag.hints(currentScenario);
    hintsArea.innerHTML = "";

    hints.forEach((hintText, i) => {
      const btn = makeHintBtn(`Hint ${i + 1}`);
      btn.onclick = () => {
        btn.dataset.revealed = "true";
        btn.style.cssText =
          "background:#f9f6f3;color:#333;border:2px solid #e8e0d8;border-radius:8px;" +
          "padding:10px 16px;font-size:14px;font-weight:400;cursor:default;" +
          "text-align:left;width:100%;line-height:1.5;";
        btn.textContent = hintText;
        btn.onclick = null;
        btn.onmouseenter = null;
        btn.onmouseleave = null;
      };
      hintsArea.appendChild(btn);
    });

    nextBtn.textContent = "Next \u2192";
  }

  nextBtn.onclick = () => newRound();

  // Start with instructions
  header.innerHTML = `Does the data meet the assumptions of the test?`;
  dataBox.innerHTML =
    `<div style="font-size:14px;line-height:1.6;">` +
    `You will see a diagnostic from a random dataset. Look at it, decide whether the assumption holds, then use the hints to check.</div>`;
  svgContainer.innerHTML = "";
  questionEl.textContent = "";
  hintsArea.innerHTML = "";

  return box;
}
