#!/usr/bin/env python3
"""
QUICK SIMULATOR TEST - Fast local validation (5 minutes)
Use this before committing to catch obvious errors.

Run:
  python test_quick_check.py
"""

import sys
import subprocess
from pathlib import Path


def main():
    print("\n" + "=" * 80)
    print("QUICK SIMULATOR VALIDATION")
    print("=" * 80 + "\n")
    
    tests = []
    
    # 1. Check files exist
    print("1. Checking required files...", end=" ", flush=True)
    required_files = [
        "src/App.js",
        "src/CAWD Sewer Spill Analysis-Current.tex",
        "scripts/generate_sensitivity_figures.py",
    ]
    for f in required_files:
        if not Path(f).exists():
            print(f"✗\n   Missing: {f}")
            return 1
    print("✓")
    tests.append(("Files", True))
    
    # 2. Import modules
    print("2. Checking imports...", end=" ", flush=True)
    try:
        from scripts.generate_sensitivity_figures import (
            extract_historical_data, compute_lambda0_from_window,
            sa1_budget_sweep, sa2_cap, sa3_tornado
        )
        print("✓")
        tests.append(("Imports", True))
    except Exception as e:
        print(f"✗\n   {e}")
        return 1
    
    # 3. Extract and check data
    print("3. Extracting historical data...", end=" ", flush=True)
    try:
        text = Path("src/App.js").read_text(encoding='utf-8')
        data = extract_historical_data(text)
        lambda0 = compute_lambda0_from_window(data)
        print(f"✓ ({len(data)} years)")
        tests.append(("Data", True))
    except Exception as e:
        print(f"✗\n   {e}")
        return 1
    
    # 4. Run quick optimizer test
    print("4. Testing optimizer (2 budgets)...", end=" ", flush=True)
    try:
        from scripts.generate_sensitivity_figures import (
            greedy_optimize, ALPHA, COSTS, SENS_SEED
        )
        
        for budget in [0.25, 0.5]:
            result = greedy_optimize(
                lambda0, ALPHA, COSTS, budget,
                step=0.25, runs=200, seed=SENS_SEED  # Fast: 200 samples
            )
            if 'investment' not in result or 'finalEU' not in result:
                raise ValueError("Missing optimizer output keys")
        
        print("✓")
        tests.append(("Optimizer", True))
    except Exception as e:
        print(f"✗\n   {e}")
        return 1
    
    # 5. Run one SA with few points
    print("5. Testing SA1 (quick: 5 budget points)...", end=" ", flush=True)
    try:
        from scripts.generate_sensitivity_figures import (
            greedy_optimize, ALPHA, COSTS, MC_SENS_RUNS, SENS_SEED
        )
        
        # Test just 5 budget points instead of 80
        budgets_to_test = [0.25, 0.5, 1.0, 1.5, 2.0]
        quick_sa1_data = []
        for i, budget in enumerate(budgets_to_test):
            opt = greedy_optimize(
                lambda0, ALPHA, COSTS, budget, 0.25, 200, SENS_SEED + i
            )
            inv = opt['investment']
            quick_sa1_data.append({
                'budget': budget,
                'I1': inv['I1'],
                'I2': inv['I2'],
                'I3': inv['I3'],
                'I4': inv['I4'],
            })
        
        # Check structure
        if not all('I1' in d and 'budget' in d for d in quick_sa1_data):
            raise ValueError("Invalid SA1 data structure")
        
        print("✓")
        tests.append(("SA1", True))
    except Exception as e:
        print(f"✗\n   {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    # 6. Test figure generation (matplotlib import)
    print("6. Testing matplotlib...", end=" ", flush=True)
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        print("✓")
        tests.append(("Matplotlib", True))
    except Exception as e:
        print(f"✗\n   {e}")
        return 1
    
    # 7. Check pdflatex availability
    print("7. Checking pdflatex...", end=" ", flush=True)
    try:
        result = subprocess.run(
            ["pdflatex", "--version"],
            capture_output=True,
            timeout=5
        )
        if result.returncode == 0:
            print("✓")
            tests.append(("pdflatex", True))
        else:
            print("✗\n   pdflatex not working")
            return 1
    except Exception as e:
        print(f"✗\n   {e}")
        return 1
    
    # Summary
    print("\n" + "=" * 80)
    print("RESULTS")
    print("=" * 80)
    
    passed = sum(1 for _, p in tests if p)
    for name, result in tests:
        status = "✓" if result else "✗"
        print(f"{status} {name}")
    
    print(f"\n{passed}/{len(tests)} checks passed")
    
    if passed == len(tests):
        print("\n✓ Quick check passed!")
        print("\nTo run FULL tests (SA1/SA2/SA3 + figure generation + PDF build):")
        print("  python test_full_simulator.py")
        return 0
    else:
        print(f"\n✗ {len(tests) - passed} check(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
