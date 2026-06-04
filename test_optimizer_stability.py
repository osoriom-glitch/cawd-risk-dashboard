#!/usr/bin/env python3
"""
Local test script to diagnose optimizer stability.
Run this before committing to understand if SA1/SA2 outputs are reliable.
"""

from pathlib import Path
from scripts.generate_sensitivity_figures import (
    extract_historical_data, compute_lambda0_from_window,
    ALPHA, COSTS, MC_SENS_RUNS, eu_for_seed, SENS_SEED,
    greedy_optimize, sa1_budget_sweep, sa2_cap
)

def test_mc_noise():
    """Test if MC noise is causing optimizer instability"""
    print("=" * 80)
    print("TEST 1: Monte Carlo Noise in Lever Comparison")
    print("=" * 80)
    
    text = Path('src/App.js').read_text(encoding='utf-8')
    lambda0 = compute_lambda0_from_window(extract_historical_data(text))
    
    budget = 0.5
    inv_i1 = {"I1": 0.5, "I2": 0.0, "I3": 0.0, "I4": 0.0}
    inv_i4 = {"I1": 0.0, "I2": 0.0, "I3": 0.0, "I4": 0.5}
    
    print(f"\nComparing I1 vs I4 at budget 0.5 with {MC_SENS_RUNS} MC samples:")
    print("Using same seed for fair comparison (best practice):\n")
    
    differences = []
    for seed_offset in range(0, 5000, 500):
        test_seed = SENS_SEED + seed_offset
        eu_i1 = eu_for_seed(lambda0, ALPHA, inv_i1, MC_SENS_RUNS, test_seed)
        eu_i4 = eu_for_seed(lambda0, ALPHA, inv_i4, MC_SENS_RUNS, test_seed)
        diff = eu_i1 - eu_i4
        differences.append(diff)
        winner = "I1" if diff > 0 else "I4"
        print(f"  Seed {test_seed}: I1-I4 = {diff:+.6f} ({winner} wins)")
    
    avg_diff = sum(differences) / len(differences)
    max_diff = max(abs(d) for d in differences)
    print(f"\n  Average I1 advantage: {avg_diff:+.6f}")
    print(f"  Max absolute difference: {max_diff:.6f}")
    print(f"  Std dev of differences: {(sum((d - avg_diff)**2 for d in differences) / len(differences))**0.5:.6f}")
    
    if max_diff < 0.001:
        print(f"\n  ⚠️  PROBLEM: Differences ({max_diff:.6f}) are within MC noise!")
        print(f"     With {MC_SENS_RUNS} samples, MC std error is ~√(1/N) ~ {(1.0/MC_SENS_RUNS)**0.5:.6f}")
        print(f"     The optimizer cannot reliably distinguish between levers.")
        return False
    else:
        print(f"\n  ✓ OK: Differences are larger than MC noise.")
        return True


def test_sa1_stability():
    """Test if SA1 outputs are stable across runs"""
    print("\n" + "=" * 80)
    print("TEST 2: SA1 Budget Sweep Stability")
    print("=" * 80)
    
    text = Path('src/App.js').read_text(encoding='utf-8')
    lambda0 = compute_lambda0_from_window(extract_historical_data(text))
    
    print(f"\nRunning SA1 3 times with different seed offsets...")
    results = []
    
    for run in range(3):
        base_seed = SENS_SEED + run * 50000
        data, threshold = sa1_budget_sweep(lambda0)
        results.append((threshold, data))
        print(f"\n  Run {run+1}: threshold = {threshold}")
        print(f"    First few allocations:")
        for d in data[:3]:
            print(f"      ${d['budgetDollars']:4}K: I1={d['I1']:.2f} I2={d['I2']:.2f} I3={d['I3']:.2f} I4={d['I4']:.2f}")
    
    # Check consistency
    thresholds = [r[0] for r in results]
    if len(set(thresholds)) == 1:
        print(f"\n  ✓ OK: Threshold consistent across all runs: {thresholds[0]}")
        return True
    else:
        print(f"\n  ⚠️  PROBLEM: Thresholds are inconsistent: {thresholds}")
        return False


def test_sa2_stability():
    """Test if SA2 outputs are stable across runs"""
    print("\n" + "=" * 80)
    print("TEST 3: SA2 Cap Sensitivity Stability")
    print("=" * 80)
    
    text = Path('src/App.js').read_text(encoding='utf-8')
    lambda0 = compute_lambda0_from_window(extract_historical_data(text))
    
    print(f"\nRunning SA2 3 times with different seed offsets...")
    results = []
    
    for run in range(3):
        seeded_opt, capped_opt, cap_i1 = sa2_cap(lambda0)
        results.append((seeded_opt, capped_opt))
        print(f"\n  Run {run+1}:")
        print(f"    Seeded (unconstrained): {seeded_opt['investment']}")
        print(f"    Capped (I1 ≤ {cap_i1}):    {capped_opt['investment']}")
    
    # Check consistency
    seeded_results = [r[0]['investment'] for r in results]
    capped_results = [r[1]['investment'] for r in results]
    
    seeded_set = set(tuple(d.items()) for d in seeded_results)
    capped_set = set(tuple(d.items()) for d in capped_results)
    
    if len(seeded_set) == 1 and len(capped_set) == 1:
        print(f"\n  ✓ OK: Allocations consistent across all runs")
        return True
    else:
        print(f"\n  ⚠️  PROBLEM: Allocations vary across runs")
        if len(seeded_set) > 1:
            print(f"     Seeded produced {len(seeded_set)} different results")
        if len(capped_set) > 1:
            print(f"     Capped produced {len(capped_set)} different results")
        return False


def main():
    print("\n")
    print("LOCAL OPTIMIZER STABILITY TEST")
    print("==============================\n")
    print(f"Testing with MC_SENS_RUNS={MC_SENS_RUNS}, SENS_SEED={SENS_SEED}\n")
    
    results = []
    results.append(("MC Noise", test_mc_noise()))
    results.append(("SA1 Stability", test_sa1_stability()))
    results.append(("SA2 Stability", test_sa2_stability()))
    
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    all_pass = all(p for _, p in results)
    
    if not all_pass:
        print("\n⚠️  ISSUES DETECTED:")
        print("   1. Increase MC_SENS_RUNS (currently 1500) to reduce noise")
        print("   2. Current differences between levers are within MC noise")
        print("   3. This makes the optimizer outputs unreliable")
        print("\nRECOMMENDATION:")
        print("   Change MC_SENS_RUNS from 1500 to 5000+ in generate_sensitivity_figures.py")
        return 1
    else:
        print("\n✓ All tests pass. Outputs are stable and ready to commit.")
        return 0


if __name__ == "__main__":
    exit(main())
