import numpy as np
import matplotlib.pyplot as plt
import pandas as pd

RNG_SEED = 42
N_SCENARIOS = 50_000
BUDGET_UNITS = 10.0      # 10 units = $1M, 1 unit = $100k
RHO = 10_000_000          # risk tolerance in dollars; 500k, 1M, 2M, 5M

failure_modes = [
    "Blockage",
    "Pipe Failure",
    "Pump Failure",
    "Hydraulic Overload",
    "Operational Failure"
]

lambda0 = {
    "Blockage": 6.483,
    "Pipe Failure": 0.884,
    "Pump Failure": 0.049,
    "Hydraulic Overload": 0.200,
    "Operational Failure": 0.100,
}

q = {
    "Blockage": np.array([0.045, 0.352, 0.503, 0.101]),
    "Pipe Failure": np.array([0.083, 0.611, 0.000, 0.306]),
    "Pump Failure": np.array([0.220, 0.353, 0.424, 0.003]),
    "Hydraulic Overload": np.array([0.300, 0.456, 0.243, 0.001]),
    "Operational Failure": np.array([0.150, 0.425, 0.425, 0.000]),
}

alpha_matrix = {
    "Blockage": np.array([0.040, 0.015, 0.010, 0.028]),
    "Pipe Failure": np.array([0.015, 0.004, 0.006, 0.020]),
    "Pump Failure": np.array([0.000, 0.020, 0.022, 0.002]),
    "Hydraulic Overload": np.array([0.000, 0.003, 0.002, 0.015]),
    "Operational Failure": np.array([0.000, 0.015, 0.032, 0.005]),
}

historical_gallons = {
    "Blockage": np.array([
        1205, 2460, 2830, 3295, 2815, 825, 200, 2960, 980, 1835,
        200, 2450, 5880, 3765, 6488, 14471, 1590, 2447, 708, 2849,
        7891, 7556, 1777, 20
    ], dtype=float),
    "Pipe Failure": np.array([
        250, 400, 50, 150, 145000, 17, 180, 2008, 361, 48269,
        357, 44159, 3, 3, 22681, 9156, 1798, 25, 9429
    ], dtype=float),
    "Operational Failure": np.array([60], dtype=float),
}


def spill_cost(category, gallons):
    if category == 1:
        om = 50_000 if gallons < 200 else 100_000
        return om + 10 * gallons
    if category == 2:
        return 100_000 + 5 * gallons
    if category == 3:
        return 50_000 + 3 * gallons
    if category == 4:
        return 10_000
    raise ValueError("category must be 1, 2, 3, or 4")


def sample_gallons_for_category(category, mode, rng):
    if mode in historical_gallons:
        data = historical_gallons[mode]

        if category == 1:
            candidates = data[data > 0]
        elif category == 2:
            candidates = data[data > 1000]
        elif category == 3:
            candidates = data[(data >= 50) & (data <= 1000)]
        else:
            candidates = data[data < 50]

        if len(candidates) > 0:
            return float(rng.choice(candidates))

    if category == 1:
        return float(np.exp(rng.uniform(np.log(50), np.log(150000))))
    if category == 2:
        return float(np.exp(rng.uniform(np.log(1000), np.log(50000))))
    if category == 3:
        return float(np.exp(rng.uniform(np.log(50), np.log(1000))))
    if category == 4:
        return float(rng.uniform(1, 50))


def lambda_after_investment(I):
    I = np.asarray(I, dtype=float)
    return {
        mode: lambda0[mode] * np.exp(-np.dot(alpha_matrix[mode], I))
        for mode in failure_modes
    }


def simulate_annual_costs(I, n_scenarios=N_SCENARIOS, seed=RNG_SEED):
    rng = np.random.default_rng(seed)
    lam = lambda_after_investment(I)
    annual_costs = np.zeros(n_scenarios)

    for mode in failure_modes:
        counts = rng.poisson(lam[mode], size=n_scenarios)
        probs = q[mode] / q[mode].sum()

        for s, n in enumerate(counts):
            if n == 0:
                continue

            categories = rng.choice([1, 2, 3, 4], size=n, p=probs)

            for category in categories:
                gallons = sample_gallons_for_category(category, mode, rng)
                annual_costs[s] += spill_cost(int(category), gallons)

    return annual_costs


def summarize(samples):
    return {
        "mean": samples.mean(),
        "median": np.median(samples),
        "p90": np.quantile(samples, 0.90),
        "p95": np.quantile(samples, 0.95),
        "prob_gt_1m": np.mean(samples > 1_000_000),
        "expected_utility": expected_utility(samples),
    }


def expected_utility(samples, rho=RHO):
    """
    Utility is applied to negative cost:
        U(-C) = 1 - exp(C/rho)

    Higher expected utility is better.
    """
    x = np.clip(samples / rho, None, 50)  # avoids numerical overflow
    return np.mean(1 - np.exp(x))


def objective_value(samples, rho=RHO):
    """
    We minimize negative expected utility.
    Lower objective value is better.
    """
    return -expected_utility(samples, rho)


def optimize_allocation_random_search_fast(n_candidates=300, n_scenarios=2000, seed=999):
    rng = np.random.default_rng(seed)

    candidates = [
        np.array([10, 0, 0, 0], dtype=float),
        np.array([0, 10, 0, 0], dtype=float),
        np.array([0, 0, 10, 0], dtype=float),
        np.array([0, 0, 0, 10], dtype=float),
        np.array([2.5, 2.5, 2.5, 2.5], dtype=float),
    ]

    for _ in range(n_candidates):
        weights = rng.dirichlet(np.ones(4))
        candidates.append(BUDGET_UNITS * weights)

    results = []

    for I in candidates:
        samples = simulate_annual_costs(I, n_scenarios=n_scenarios, seed=123)
        value = objective_value(samples)
        results.append((value, I))

    results.sort(key=lambda x: x[0])
    return results[:10]


def print_summary(label, I):
    samples = simulate_annual_costs(I, n_scenarios=N_SCENARIOS, seed=RNG_SEED)
    stats = summarize(samples)
    lam = lambda_after_investment(I)

    print(f"\n--- {label} ---")
    print(f"I units: {np.round(I, 3)}")
    print(f"$ allocation: {np.round(np.asarray(I) * 100_000, 0)}")
    print(f"Total lambda: {sum(lam.values()):.3f}")
    print(f"Mean annual cost: ${stats['mean']:,.0f}")
    print(f"Median annual cost: ${stats['median']:,.0f}")
    print(f"P90 annual cost: ${stats['p90']:,.0f}")
    print(f"P95 annual cost: ${stats['p95']:,.0f}")
    print(f"P(annual cost > $1M): {100 * stats['prob_gt_1m']:.1f}%")
    print(f"Expected utility E[U(-C)]: {stats['expected_utility']:.6f}")

    print("Mode lambdas:")
    for mode, value in lam.items():
        print(f"  {mode}: {value:.3f}")

def simulate_spill_events(I, n_scenarios=N_SCENARIOS, seed=RNG_SEED):
    rng = np.random.default_rng(seed)
    lam = lambda_after_investment(I)
    rows = []

    for scenario in range(n_scenarios):
        for mode in failure_modes:
            n = rng.poisson(lam[mode])
            probs = q[mode] / q[mode].sum()
            categories = rng.choice([1, 2, 3, 4], size=n, p=probs)

            for category in categories:
                gallons = sample_gallons_for_category(category, mode, rng)
                cost = spill_cost(int(category), gallons)
                rows.append((scenario, mode, int(category), gallons, cost))

    return pd.DataFrame(rows, columns=["scenario", "mode", "category", "gallons", "cost"])

baseline_I = np.array([0, 0, 0, 0], dtype=float)
current_slide_I = np.array([10, 0, 0, 0], dtype=float)

print_summary("Baseline", baseline_I)
print_summary("Current slide allocation: all preventive maintenance", current_slide_I)

top_candidates = optimize_allocation_random_search_fast()

print("\nTop candidates from rough search:")
for value, I in top_candidates:
    print(np.round(I, 3), f"negative expected utility objective={value:.6f}")

best_I = None
best_value = np.inf

for _, I in top_candidates:
    samples = simulate_annual_costs(I, n_scenarios=50_000, seed=42)
    value = objective_value(samples)

    if value < best_value:
        best_value = value
        best_I = I

print_summary(f"Expected-utility optimized allocation, rho=${RHO:,.0f}", best_I)
print(f"Final negative expected utility objective: {best_value:.6f}")

events = simulate_spill_events(current_slide_I)

# 1. Baseline vs optimized annual cost distribution

baseline_samples = simulate_annual_costs(
    baseline_I,
    n_scenarios=50_000
)

optimized_samples = simulate_annual_costs(
    current_slide_I,
    n_scenarios=50_000
)

plt.figure(figsize=(9, 5))

plt.hist(
    baseline_samples,
    bins=60,
    alpha=0.5,
    label="Baseline"
)

plt.hist(
    optimized_samples,
    bins=60,
    alpha=0.5,
    label="Optimized"
)

plt.xlabel("Annual cost ($)")
plt.ylabel("Number of scenarios")
plt.title("Baseline vs Optimized Annual Spill Cost")
plt.legend()

plt.show()

# 2. Category distribution
events["category"].value_counts().sort_index().plot(kind="bar", figsize=(7, 5))
plt.xlabel("Spill category")
plt.ylabel("Number of simulated spills")
plt.title("Simulated Spill Category Distribution")
plt.show()

# 3. Failure mode distribution
events["mode"].value_counts().plot(kind="bar", figsize=(8, 5))
plt.xlabel("Failure mode")
plt.ylabel("Number of simulated spills")
plt.title("Simulated Failure Mode Distribution")
plt.xticks(rotation=30, ha="right")
plt.show()

# 4. Volume distribution
plt.figure(figsize=(8, 5))
bins = np.logspace(
    np.log10(events["gallons"].min()),
    np.log10(events["gallons"].max()),
    80
)

plt.hist(events["gallons"], bins=bins)
plt.xscale("log")
plt.xlabel("Gallons spilled")
plt.ylabel("Number of spills")
plt.title("Spill Volume Distribution")
plt.show()

# 5. Log-scale volume distribution, better for huge outliers
plt.figure(figsize=(8, 5))
plt.hist(np.log10(events["gallons"] + 1), bins=60)
plt.xlabel("log10(gallons + 1)")
plt.ylabel("Number of spills")
plt.title("Log-Scale Spill Volume Distribution")
plt.show()

# 6. Volume by category
events.boxplot(column="gallons", by="category", figsize=(8, 5))
plt.yscale("log")
plt.xlabel("Category")
plt.ylabel("Gallons spilled, log scale")
plt.title("Spill Volume by Category")
plt.suptitle("")
plt.show()

# 7. Cost by failure mode
events.boxplot(column="cost", by="mode", figsize=(10, 5))
plt.yscale("log")
plt.xlabel("Failure mode")
plt.ylabel("Cost, log scale")
plt.title("Spill Cost by Failure Mode")
plt.suptitle("")
plt.xticks(rotation=30, ha="right")
plt.show()
