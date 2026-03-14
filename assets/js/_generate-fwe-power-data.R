# assets/js/_generate-fwe-power-data.R
# Run once to generate pre-computed values for fwe-power-widget.js
# Output: paste into the JS DATA constant
#
# Two separate loops: FWE under the null (all means = 0),
# power under the alternative (group 2 has effect = 1).
# This matches Aaron's tutorial code structure.

set.seed(2026)
n_per_group <- 10
n_sims <- 10000
alpha <- 0.05
effect_size <- 1  # matches Aaron's tutorial code

cat("const DATA = {\n")

for (k in 2:10) {
  # --- FWE under the null (all means = 0) ---
  fwe_tukey <- 0
  fwe_unadj <- 0

  for (i in 1:n_sims) {
    data <- data.frame(
      value = rnorm(k * n_per_group, mean = 0, sd = 1),
      group = factor(rep(1:k, each = n_per_group))
    )

    model <- aov(value ~ group, data = data)

    # Tukey
    tukey <- TukeyHSD(model)
    if (any(tukey$group[, "p adj"] < alpha)) fwe_tukey <- fwe_tukey + 1

    # Unadjusted t-tests
    p_values <- c()
    for (j in 1:(k - 1)) {
      for (l in (j + 1):k) {
        tt <- t.test(value ~ group, data = subset(data, group %in% c(j, l)))
        p_values <- c(p_values, tt$p.value)
      }
    }
    if (any(p_values < alpha)) fwe_unadj <- fwe_unadj + 1
  }

  # --- Power under the alternative (group 2 has effect) ---
  power_tukey <- 0
  power_unadj <- 0

  for (i in 1:n_sims) {
    means <- rep(0, k)
    means[2] <- effect_size

    data <- data.frame(
      value = unlist(lapply(1:k, function(g) rnorm(n_per_group, mean = means[g]))),
      group = factor(rep(1:k, each = n_per_group))
    )

    model <- aov(value ~ group, data = data)

    # Tukey: check specific pair (2-1)
    tukey <- TukeyHSD(model)
    pair_name <- "2-1"
    if (pair_name %in% rownames(tukey$group) && tukey$group[pair_name, "p adj"] < alpha) {
      power_tukey <- power_tukey + 1
    }

    # Unadjusted t-test for pair 1 vs 2
    tt_12 <- t.test(value ~ group, data = subset(data, group %in% c(1, 2)))
    if (tt_12$p.value < alpha) power_unadj <- power_unadj + 1
  }

  cat(sprintf(
    "  %d: { fweTukey: %.3f, fweUnadj: %.3f, powerTukey: %.3f, powerUnadj: %.3f },\n",
    k,
    fwe_tukey / n_sims, fwe_unadj / n_sims,
    power_tukey / n_sims, power_unadj / n_sims
  ))
}

cat("};\n")
