#!/usr/bin/env python3
import json
import math
import os
from pathlib import Path

import matplotlib.pyplot as plt


CURRENT_YEAR = 2026
SYSTEM_MILES = 77.57

MODES = ["B", "F", "P", "H", "O"]
LEVERS = ["I1", "I2", "I3", "I4"]

ALPHA = {
    "B": {"I1": 0.040, "I2": 0.015, "I3": 0.010, "I4": 0.028},
    "F": {"I1": 0.015, "I2": 0.004, "I3": 0.006, "I4": 0.020},
    "P": {"I1": 0.000, "I2": 0.020, "I3": 0.022, "I4": 0.002},
    "H": {"I1": 0.000, "I2": 0.003, "I3": 0.002, "I4": 0.015},
    "O": {"I1": 0.000, "I2": 0.015, "I3": 0.032, "I4": 0.005},
}

COSTS = {"I1": 1.0, "I2": 1.0, "I3": 1.0, "I4": 1.0}

Q_MATRIX = {
    "B": [0.045, 0.352, 0.503, 0.101],
    "F": [0.083, 0.611, 0.000, 0.306],
    "P": [0.220, 0.353, 0.424, 0.003],
    "H": [0.300, 0.456, 0.243, 0.001],
    "O": [0.150, 0.425, 0.425, 0.000],
}

HIST_GALLONS = {
    "B": [1205, 2460, 2830, 3295, 2815, 825, 200, 2960, 980, 1835, 200, 2450, 5880, 3765, 6488, 14471, 1590, 2447, 708, 2849, 7891, 7556, 1777, 20],
    "F": [250, 400, 50, 150, 145000, 17, 180, 2008, 361, 48269, 357, 44159, 3, 3, 22681, 9156, 1798, 25, 9429],
    "O": [60],
}

SENS_SEED = 12345
MC_SENS_RUNS = 1500
MC_SA1_RUNS = 1600
ENTRY_THRESHOLD = 0.5
PERSIST_STEPS = 3
RHO_DOLLARS = 10_000_000


def mulberry32(seed):
    a = seed & 0xFFFFFFFF

    def rand():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = (a ^ (a >> 15)) * (1 | a)
        t &= 0xFFFFFFFF
        t = (t + ((t ^ (t >> 7)) * (61 | t))) & 0xFFFFFFFF
        t = (t ^ (t >> 14)) & 0xFFFFFFFF
        return t / 4294967296.0

    return rand


def extract_historical_data(app_js_text):
    marker = "const HISTORICAL_DATA = ["
    start = app_js_text.find(marker)
    if start == -1:
        raise RuntimeError("Could not find HISTORICAL_DATA in App.js")
    arr_start = app_js_text.find("[", start)

    depth = 0
    end = None
    for i in range(arr_start, len(app_js_text)):
        ch = app_js_text[i]
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if end is None:
        raise RuntimeError("Could not parse HISTORICAL_DATA array")

    json_text = app_js_text[arr_start:end]
    return json.loads(json_text)


def window_exposure_years(data):
    years = [d["year"] for d in data]
    min_y, max_y = min(years), max(years)
    span = (max_y - min_y) + (0.25 if max_y >= 2026 else 1.0)
    if min_y <= 2020 <= max_y:
        span -= 1.0
    return max(span, 1.0)


def compute_lambda0_from_window(data):
    denom = window_exposure_years(data)
    counts = {"B": 0, "F": 0, "P": 0, "H": 0, "O": 0}
    for yr in data:
        for s in yr["spills"]:
            m = s["mode"]
            if m in counts:
                counts[m] += 1

    out = {}
    for m in MODES:
        out[m] = (counts[m] / denom) * (100.0 / SYSTEM_MILES)
    return out


def compute_lambdas(lambda0, alpha, inv):
    out = {}
    for m in MODES:
        r = 0.0
        for l in LEVERS:
            r += alpha[m].get(l, 0.0) * inv.get(l, 0.0)
        out[m] = lambda0[m] * math.exp(-r)
    return out


def spill_cost(category, gallons):
    if category == 1:
        om = 50000 if gallons < 200 else 100000
        return om + 10 * gallons
    if category == 2:
        return 100000 + 5 * gallons
    if category == 3:
        return 50000 + 3 * gallons
    if category == 4:
        return 10000
    return 10000


def sample_gallons(category, mode_key, rng):
    data = HIST_GALLONS.get(mode_key)
    if data:
        if category == 1:
            candidates = [g for g in data if g > 0]
        elif category == 2:
            candidates = [g for g in data if g > 1000]
        elif category == 3:
            candidates = [g for g in data if 50 <= g <= 1000]
        else:
            candidates = [g for g in data if g < 50]

        if candidates:
            idx = int(rng() * len(candidates))
            return candidates[idx]

    if category == 1:
        return math.exp(rng() * (math.log(150000) - math.log(50)) + math.log(50))
    if category == 2:
        return math.exp(rng() * (math.log(50000) - math.log(1000)) + math.log(1000))
    if category == 3:
        return math.exp(rng() * (math.log(1000) - math.log(50)) + math.log(50))
    return 1 + rng() * 49


def poisson_sample(lmbda, rng):
    if lmbda <= 0:
        return 0
    limit = math.exp(-lmbda)
    count = 0
    product = 1.0
    while True:
        count += 1
        product *= rng()
        if product <= limit:
            return count - 1


def weighted_choice(weights, rng):
    total = sum(weights)
    r = rng() * total
    cum = 0.0
    for i, w in enumerate(weights):
        cum += w
        if r <= cum:
            return i
    return len(weights) - 1


def exp_utility(cost_dollars, rho=RHO_DOLLARS):
    x = min(cost_dollars / rho, 50)
    return 1 - math.exp(x)


def simulate_year(lambdas, rng):
    total_cost = 0.0
    for m in MODES:
        count = poisson_sample(lambdas.get(m, 0.0), rng)
        for _ in range(count):
            cat_idx = weighted_choice(Q_MATRIX[m], rng)
            category = cat_idx + 1
            gallons = sample_gallons(category, m, rng)
            total_cost += spill_cost(category, gallons)
    return total_cost


def eu_for(lambda0, alpha, inv, runs, rng):
    lambdas = compute_lambdas(lambda0, alpha, inv)
    s = 0.0
    for _ in range(runs):
        year_cost = simulate_year(lambdas, rng)
        s += exp_utility(year_cost)
    return s / runs


def eu_for_seed(lambda0, alpha, inv, runs, seed):
    return eu_for(lambda0, alpha, inv, runs, mulberry32(seed))


def greedy_optimize(lambda0, alpha, costs, budget, step=0.25, runs=MC_SENS_RUNS, seed=SENS_SEED):
    if seed is None:
        seed = SENS_SEED

    inv = {"I1": 0.0, "I2": 0.0, "I3": 0.0, "I4": 0.0}
    remaining = budget

    t = 0
    while remaining >= step and t < 1000:
        step_seed = seed + t * 1000
        current_eu = eu_for_seed(lambda0, alpha, inv, runs, step_seed)
        best_lever = None
        best_eu = -1e99
        for lever in LEVERS:
            cost = costs.get(lever, 1.0)
            if cost * step > remaining:
                continue
            trial = dict(inv)
            trial[lever] += step
            trial_eu = eu_for_seed(lambda0, alpha, trial, runs, step_seed)
            if trial_eu > best_eu:
                best_eu = trial_eu
                best_lever = lever
        if best_lever is None or best_eu <= current_eu:
            break
        inv[best_lever] += step
        remaining -= costs.get(best_lever, 1.0) * step
        t += 1

    final_eu = eu_for_seed(lambda0, alpha, inv, runs, seed + 1_000_000)
    return {"investment": inv, "remaining": remaining, "finalEU": final_eu}


def greedy_optimize_capped(lambda0, alpha, costs, budget, cap_i1, step=0.25, runs=MC_SENS_RUNS, seed=SENS_SEED + 9999):
    if seed is None:
        seed = SENS_SEED + 9999

    inv = {"I1": 0.0, "I2": 0.0, "I3": 0.0, "I4": 0.0}
    remaining = budget

    t = 0
    while remaining >= step and t < 1000:
        step_seed = seed + t * 1000
        current_eu = eu_for_seed(lambda0, alpha, inv, runs, step_seed)
        best_lever = None
        best_eu = -1e99
        for lever in LEVERS:
            cost = costs.get(lever, 1.0)
            if cost * step > remaining:
                continue
            if lever == "I1" and inv["I1"] + step > cap_i1:
                continue
            trial = dict(inv)
            trial[lever] += step
            trial_eu = eu_for_seed(lambda0, alpha, trial, runs, step_seed)
            if trial_eu > best_eu:
                best_eu = trial_eu
                best_lever = lever
        if best_lever is None or best_eu <= current_eu:
            break
        inv[best_lever] += step
        remaining -= costs.get(best_lever, 1.0) * step
        t += 1

    final_eu = eu_for_seed(lambda0, alpha, inv, runs, seed + 1_000_000)
    return {"investment": inv, "remaining": remaining, "finalEU": final_eu}


def mc_with_volume_override(lambdas, runs, vol_mode, rng, rho=RHO_DOLLARS):
    cat_min = {1: 50, 2: 1001, 3: 50, 4: 1}
    cat_max = {1: 145000, 2: 50000, 3: 1000, 4: 49}

    total_cost = 0.0
    total_u = 0.0
    for _ in range(runs):
        year_cost = 0.0
        for m in MODES:
            count = poisson_sample(lambdas.get(m, 0.0), rng)
            for _ in range(count):
                cat_idx = weighted_choice(Q_MATRIX[m], rng)
                category = cat_idx + 1
                if vol_mode == "min":
                    gallons = cat_min[category]
                elif vol_mode == "max":
                    gallons = cat_max[category]
                else:
                    gallons = sample_gallons(category, m, rng)
                year_cost += spill_cost(category, gallons)
        total_cost += year_cost
        total_u += exp_utility(year_cost, rho)

    return {"expectedCost": total_cost / runs, "expectedUtility": total_u / runs}


def sa1_budget_sweep(lambda0):
    data = []
    idx = 0
    budget = 0.25
    while budget <= 20.000001:
        # Use a higher MC budget for SA1 to reduce point-level jitter in the utility curve.
        opt = greedy_optimize(lambda0, ALPHA, COSTS, round(budget, 2), 0.25, MC_SA1_RUNS, SENS_SEED + idx)
        inv = opt["investment"]
        data.append(
            {
                "budget": round(budget, 2),
                "budgetDollars": int(round(budget * 100)),
                "eu": opt["finalEU"],
                "I1": inv["I1"],
                "I2": inv["I2"],
                "I3": inv["I3"],
                "I4": inv["I4"],
            }
        )
        idx += 1
        budget += 0.25

    threshold = None
    for i in range(len(data)):
        entrant = None
        for k in ["I2", "I3", "I4"]:
            if data[i][k] >= ENTRY_THRESHOLD:
                entrant = k
                break
        if entrant is None:
            continue

        if i + PERSIST_STEPS > len(data):
            continue

        persists = True
        for j in range(i, i + PERSIST_STEPS):
            if not any(data[j][k] >= ENTRY_THRESHOLD for k in ["I2", "I3", "I4"]):
                persists = False
                break

        if persists:
            threshold = (data[i]["budgetDollars"], entrant)
            break

    return data, threshold


def sa2_cap(lambda0):
    budget = 5.5
    cap_i1 = 3.0

    seeded_opt = greedy_optimize(lambda0, ALPHA, COSTS, budget, 0.25, MC_SENS_RUNS, SENS_SEED + 7777)
    capped_opt = greedy_optimize_capped(lambda0, ALPHA, COSTS, budget, cap_i1, 0.25, MC_SENS_RUNS, SENS_SEED + 8888)

    return seeded_opt, capped_opt, cap_i1


def sa3_tornado(lambda0):
    base_investment = {"I1": 1.5, "I2": 1.0, "I3": 1.0, "I4": 1.5}
    scenario_lambdas = compute_lambdas(lambda0, ALPHA, base_investment)

    runs = 4000
    base = mc_with_volume_override(scenario_lambdas, runs, "base", mulberry32(SENS_SEED + 100))
    vmin = mc_with_volume_override(scenario_lambdas, runs, "min", mulberry32(SENS_SEED + 101))
    vmax = mc_with_volume_override(scenario_lambdas, runs, "max", mulberry32(SENS_SEED + 102))

    lambda_low = {m: scenario_lambdas[m] * 0.5 for m in MODES}
    lambda_high = {m: scenario_lambdas[m] * 2.0 for m in MODES}
    llow = mc_with_volume_override(lambda_low, runs, "base", mulberry32(SENS_SEED + 103))
    lhigh = mc_with_volume_override(lambda_high, runs, "base", mulberry32(SENS_SEED + 104))
    rlow = mc_with_volume_override(scenario_lambdas, runs, "base", mulberry32(SENS_SEED + 105), RHO_DOLLARS * 0.1)
    rhigh = mc_with_volume_override(scenario_lambdas, runs, "base", mulberry32(SENS_SEED + 106), RHO_DOLLARS * 10)

    rows = [
        {
            "label": "Spill volume (min -> max)",
            "low": vmin["expectedCost"],
            "high": vmax["expectedCost"],
            "base": base["expectedCost"],
            "lowUtility": vmin["expectedUtility"],
            "highUtility": vmax["expectedUtility"],
            "baseUtility": base["expectedUtility"],
        },
        {
            "label": "Failure rate lambda (x0.5 -> x2)",
            "low": llow["expectedCost"],
            "high": lhigh["expectedCost"],
            "base": base["expectedCost"],
            "lowUtility": llow["expectedUtility"],
            "highUtility": lhigh["expectedUtility"],
            "baseUtility": base["expectedUtility"],
        },
        {
            "label": "Risk tolerance rho (x0.1 -> x10)",
            "low": base["expectedCost"],
            "high": base["expectedCost"],
            "base": base["expectedCost"],
            "lowUtility": rlow["expectedUtility"],
            "highUtility": rhigh["expectedUtility"],
            "baseUtility": base["expectedUtility"],
        },
    ]

    for r in rows:
        r["swing"] = abs(r["high"] - r["low"])
        r["lowDelta"] = r["low"] - r["base"]
        r["highDelta"] = r["high"] - r["base"]
        r["lowUtilityDelta"] = r["lowUtility"] - r["baseUtility"]
        r["highUtilityDelta"] = r["highUtility"] - r["baseUtility"]

    rows.sort(key=lambda x: x["swing"], reverse=True)
    return rows, base["expectedCost"], base["expectedUtility"]


def render_sa1(data, threshold, out_path):
    budgets = [d["budgetDollars"] for d in data]
    i1 = [d["I1"] for d in data]
    i2 = [d["I2"] for d in data]
    i3 = [d["I3"] for d in data]
    i4 = [d["I4"] for d in data]
    eu = [d["eu"] for d in data]

    # Centered moving-average overlay keeps raw signal visible while clarifying trend.
    def centered_moving_average(values, window=9):
        if window <= 1 or len(values) < 3:
            return values[:]
        half = window // 2
        out = []
        for i in range(len(values)):
            lo = max(0, i - half)
            hi = min(len(values), i + half + 1)
            out.append(sum(values[lo:hi]) / (hi - lo))
        return out

    eu_smooth = centered_moving_average(eu, window=9)

    fig, axes = plt.subplots(1, 2, figsize=(14, 5), dpi=180)

    ax = axes[0]
    ax.plot(budgets, i1, label="Preventive Maint.", color="#38bdf8", linewidth=2)
    ax.plot(budgets, i2, label="Workforce", color="#22c55e", linewidth=2)
    ax.plot(budgets, i3, label="Execution", color="#f97316", linewidth=2)
    ax.plot(budgets, i4, label="Targeting", color="#a78bfa", linewidth=2)
    ax.axvline(1000, color="black", linestyle="--", linewidth=1.2, label="$1M proposal")
    if threshold is not None:
        ax.axvline(threshold[0], color="#facc15", linestyle="--", linewidth=1.2, label=f"Diversify ({threshold[1]})")
    ax.set_title("Investment Allocation by Budget")
    ax.set_xlabel("Budget ($K)")
    ax.set_ylabel("Units")
    ax.grid(alpha=0.25)
    ax.legend(fontsize=8)

    ax2 = axes[1]
    ax2.plot(budgets, eu, color="#facc15", linewidth=1.2, alpha=0.45, label="Raw MC estimate")
    ax2.plot(budgets, eu_smooth, color="#38bdf8", linewidth=2.4, label="9-point moving average")
    ax2.axvline(1000, color="black", linestyle="--", linewidth=1.2)
    ax2.set_title("Expected Utility by Budget")
    ax2.set_xlabel("Budget ($K)")
    ax2.set_ylabel("E[U(-C)]")
    ax2.grid(alpha=0.25)
    ax2.legend(fontsize=8, loc="best")

    fig.suptitle("SA1: Budget-Threshold Sensitivity", fontsize=14)
    fig.tight_layout()
    fig.savefig(out_path, bbox_inches="tight")
    plt.close(fig)


def render_sa2(seeded_opt, capped_opt, cap_i1, out_path):
    labels = ["Maint.", "Workforce", "Execution", "Targeting"]
    uncon = [seeded_opt["investment"][k] for k in LEVERS]
    capd = [capped_opt["investment"][k] for k in LEVERS]

    fig, axes = plt.subplots(1, 2, figsize=(12, 5), dpi=180)

    ax = axes[0]
    ax.bar(labels, uncon, color="#38bdf8")
    uncon_top = max(max(uncon) * 1.5, 0.6)
    ax.set_ylim(0, uncon_top)
    ax.set_title("Unconstrained Allocation ($550K budget)")
    ax.set_ylabel("Units")
    ax.grid(axis="y", alpha=0.25)

    ax2 = axes[1]
    colors = ["#ef4444", "#22c55e", "#f97316", "#a78bfa"]
    ax2.bar(labels, capd, color=colors)
    capd_top = cap_i1 * 1.3
    ax2.axhline(cap_i1, color="black", linestyle="--", linewidth=1.1, label=f"I1 cap = {cap_i1}u")
    ax2.set_ylim(0, capd_top)
    ax2.set_title(f"Capped Allocation (I1 ≤ {cap_i1}u, full budget deployed)")
    ax2.grid(axis="y", alpha=0.25)
    ax2.legend(fontsize=8)

    fig.suptitle("SA2: Maintenance-Cap Sensitivity (Budget = $550K)", fontsize=14)
    fig.tight_layout()
    fig.savefig(out_path, bbox_inches="tight")
    plt.close(fig)


def _format_cost_delta(value):
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:+.1f}M"
    return f"${value / 1_000:+.0f}K"


def _format_utility_delta(value):
    return f"{value:+.3f}"


def _annotate_barh(ax, value, y, text):
    if abs(value) < 1e-9:
        ax.text(0, y, "0", ha="center", va="center", fontsize=8, color="#334155")
        return
    x = value / 2
    ax.text(x, y, text, ha="center", va="center", fontsize=8, color="white", fontweight="bold")


def _draw_tornado_panel(ax, y, lows, highs, labels, xlabel, title, formatter):
    for i in range(len(labels)):
        low_color = "#22c55e" if lows[i] < 0 else "#ef4444"
        high_color = "#ef4444" if highs[i] > 0 else "#22c55e"
        ax.barh(y[i], lows[i], color=low_color, alpha=0.9)
        ax.barh(y[i], highs[i], color=high_color, alpha=0.9)
        _annotate_barh(ax, lows[i], y[i], formatter(lows[i]))
        _annotate_barh(ax, highs[i], y[i], formatter(highs[i]))

    span = max(max(abs(v) for v in lows + highs), 1e-6)
    ax.axvline(0, color="black", linewidth=1.1)
    ax.set_xlim(-1.15 * span, 1.15 * span)
    ax.set_yticks(y)
    ax.set_yticklabels(labels)
    ax.set_xlabel(xlabel)
    ax.set_title(title)
    ax.grid(axis="x", alpha=0.25)


def render_sa3(rows, base_cost, base_utility, out_path):
    labels = [r["label"] for r in rows]
    cost_lows = [r["lowDelta"] for r in rows]
    cost_highs = [r["highDelta"] for r in rows]
    utility_lows = [r["lowUtilityDelta"] for r in rows]
    utility_highs = [r["highUtilityDelta"] for r in rows]
    y = list(range(len(rows)))

    fig, axes = plt.subplots(1, 2, figsize=(14, 5), dpi=180, sharey=True)

    _draw_tornado_panel(
        axes[0],
        y,
        cost_lows,
        cost_highs,
        labels,
        "Change in expected annual cost ($)",
        f"Expected Cost Delta (Base = ${base_cost:,.0f})",
        _format_cost_delta,
    )
    _draw_tornado_panel(
        axes[1],
        y,
        utility_lows,
        utility_highs,
        labels,
        "Change in expected utility",
        f"Expected Utility Delta (Base = {base_utility:.3f})",
        _format_utility_delta,
    )
    axes[1].tick_params(labelleft=False)

    fig.suptitle("SA3: Tornado Diagram", fontsize=14)

    fig.tight_layout()
    fig.savefig(out_path, bbox_inches="tight")
    plt.close(fig)


def main():
    repo_root = Path(__file__).resolve().parents[1]
    app_js = repo_root / "src" / "App.js"
    out_dir = repo_root / "src" / "figures"
    out_dir.mkdir(parents=True, exist_ok=True)

    text = app_js.read_text(encoding="utf-8")
    historical_data = extract_historical_data(text)
    lambda0 = compute_lambda0_from_window(historical_data)

    sa1, threshold = sa1_budget_sweep(lambda0)
    seeded_opt, capped_opt, cap_i1 = sa2_cap(lambda0)
    rows, base_cost, base_utility = sa3_tornado(lambda0)

    render_sa1(sa1, threshold, out_dir / "sa1_budget_sweep.png")
    render_sa2(seeded_opt, capped_opt, cap_i1, out_dir / "sa2_cap_comparison.png")
    render_sa3(rows, base_cost, base_utility, out_dir / "sa3_tornado.png")

    print("Generated:")
    print(out_dir / "sa1_budget_sweep.png")
    print(out_dir / "sa2_cap_comparison.png")
    print(out_dir / "sa3_tornado.png")


if __name__ == "__main__":
    main()
