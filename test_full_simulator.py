#!/usr/bin/env python3
"""
Comprehensive simulator test for the CAWD sensitivity analysis pipeline.
Tests: data extraction → lambda computation → optimizer → figure generation → PDF build.

Run before committing:
  python test_full_simulator.py
"""

import sys
import subprocess
import time
from pathlib import Path


def test_data_extraction():
    """Test 1: Extract historical data from App.js"""
    print("\n" + "=" * 80)
    print("TEST 1: Data Extraction from App.js")
    print("=" * 80)
    
    try:
        from scripts.generate_sensitivity_figures import extract_historical_data
        
        app_js = Path("src/App.js")
        if not app_js.exists():
            print("✗ FAIL: src/App.js not found")
            return False
        
        text = app_js.read_text(encoding='utf-8')
        data = extract_historical_data(text)
        
        if not isinstance(data, list) or len(data) == 0:
            print("✗ FAIL: Historical data is empty")
            return False
        
        # Validate structure
        required_fields = ["year", "spills"]
        if not all(k in data[0] for k in required_fields):
            print(f"✗ FAIL: Missing fields in historical data. Has: {data[0].keys()}")
            return False
        
        print(f"✓ OK: Extracted {len(data)} years of historical data")
        print(f"   Year range: {data[0]['year']} - {data[-1]['year']}")
        print(f"   Sample: {len(data[0]['spills'])} spills in {data[0]['year']}")
        return True
    
    except Exception as e:
        print(f"✗ FAIL: {type(e).__name__}: {e}")
        return False


def test_lambda_computation():
    """Test 2: Compute lambda0 from historical window"""
    print("\n" + "=" * 80)
    print("TEST 2: Lambda Computation")
    print("=" * 80)
    
    try:
        from scripts.generate_sensitivity_figures import (
            extract_historical_data, compute_lambda0_from_window, MODES
        )
        
        text = Path("src/App.js").read_text(encoding='utf-8')
        data = extract_historical_data(text)
        lambda0 = compute_lambda0_from_window(data)
        
        if not isinstance(lambda0, dict):
            print("✗ FAIL: lambda0 is not a dict")
            return False
        
        if not all(m in lambda0 for m in MODES):
            print(f"✗ FAIL: Missing modes in lambda0. Has: {lambda0.keys()}")
            return False
        
        if not all(lambda0[m] >= 0 for m in MODES):
            print("✗ FAIL: Some lambda values are negative")
            return False
        
        print(f"✓ OK: Computed lambda0 for {len(MODES)} failure modes:")
        for m in MODES:
            print(f"   {m}: λ = {lambda0[m]:.4f} per 100 miles per year")
        return True
    
    except Exception as e:
        print(f"✗ FAIL: {type(e).__name__}: {e}")
        return False


def test_optimizer():
    """Test 3: Run greedy optimizer on small budgets"""
    print("\n" + "=" * 80)
    print("TEST 3: Greedy Optimizer")
    print("=" * 80)
    
    try:
        from scripts.generate_sensitivity_figures import (
            extract_historical_data, compute_lambda0_from_window,
            greedy_optimize, ALPHA, COSTS, SENS_SEED
        )
        
        text = Path("src/App.js").read_text(encoding='utf-8')
        lambda0 = compute_lambda0_from_window(extract_historical_data(text))
        
        # Test on two budgets
        budgets = [0.25, 0.5, 1.0]
        for budget in budgets:
            result = greedy_optimize(
                lambda0, ALPHA, COSTS, budget, 
                step=0.25, runs=500, seed=SENS_SEED  # Use 500 samples for speed
            )
            
            inv = result['investment']
            total_spent = sum(inv.values())
            
            if not isinstance(inv, dict):
                print(f"✗ FAIL: Budget {budget}: investment is not a dict")
                return False
            
            if total_spent < 0 or total_spent > budget + 0.001:
                print(f"✗ FAIL: Budget {budget}: spent {total_spent} > {budget}")
                return False
            
            print(f"✓ OK: Budget ${budget*100:.0f}K: I1={inv['I1']:.2f} I2={inv['I2']:.2f} I3={inv['I3']:.2f} I4={inv['I4']:.2f}")
        
        return True
    
    except Exception as e:
        print(f"✗ FAIL: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_sensitivity_analyses():
    """Test 4: Generate SA1, SA2, SA3 outputs"""
    print("\n" + "=" * 80)
    print("TEST 4: Sensitivity Analyses")
    print("=" * 80)
    
    try:
        from scripts.generate_sensitivity_figures import (
            extract_historical_data, compute_lambda0_from_window,
            sa1_budget_sweep, sa2_cap, sa3_tornado
        )
        
        text = Path("src/App.js").read_text(encoding='utf-8')
        lambda0 = compute_lambda0_from_window(extract_historical_data(text))
        
        # SA1: Budget sweep
        print("  Running SA1 (budget sweep)...", end=" ", flush=True)
        sa1_data, sa1_threshold = sa1_budget_sweep(lambda0)
        print(f"✓ {len(sa1_data)} budget points, threshold={sa1_threshold}")
        
        # SA2: Cap sensitivity
        print("  Running SA2 (cap sensitivity)...", end=" ", flush=True)
        sa2_seeded, sa2_capped, sa2_cap = sa2_cap(lambda0)
        print(f"✓ Seeded: {sa2_seeded['investment']}")
        
        # SA3: Tornado
        print("  Running SA3 (tornado)...", end=" ", flush=True)
        sa3_rows, sa3_base_cost, sa3_base_utility = sa3_tornado(lambda0)
        print(f"✓ {len(sa3_rows)} sensitivity rows, base cost=${sa3_base_cost:,.0f}")
        
        return True
    
    except Exception as e:
        print(f"✗ FAIL: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_figure_generation():
    """Test 5: Generate all three figures"""
    print("\n" + "=" * 80)
    print("TEST 5: Figure Generation (Matplotlib)")
    print("=" * 80)
    
    try:
        import matplotlib
        matplotlib.use('Agg')  # Non-interactive backend
        
        from scripts.generate_sensitivity_figures import (
            extract_historical_data, compute_lambda0_from_window,
            sa1_budget_sweep, sa2_cap, sa3_tornado,
            render_sa1, render_sa2, render_sa3
        )
        
        text = Path("src/App.js").read_text(encoding='utf-8')
        lambda0 = compute_lambda0_from_window(extract_historical_data(text))
        
        out_dir = Path("src/figures")
        out_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate analyses
        sa1_data, sa1_threshold = sa1_budget_sweep(lambda0)
        sa2_seeded, sa2_capped, sa2_cap_val = sa2_cap(lambda0)
        sa3_rows, sa3_base_cost, sa3_base_utility = sa3_tornado(lambda0)
        
        # Render figures
        print("  Rendering SA1...", end=" ", flush=True)
        render_sa1(sa1_data, sa1_threshold, out_dir / "sa1_budget_sweep.png")
        print("✓")
        
        print("  Rendering SA2...", end=" ", flush=True)
        render_sa2(sa2_seeded, sa2_capped, sa2_cap_val, out_dir / "sa2_cap_comparison.png")
        print("✓")
        
        print("  Rendering SA3...", end=" ", flush=True)
        render_sa3(sa3_rows, sa3_base_cost, sa3_base_utility, out_dir / "sa3_tornado.png")
        print("✓")
        
        # Verify files exist
        files = [
            out_dir / "sa1_budget_sweep.png",
            out_dir / "sa2_cap_comparison.png",
            out_dir / "sa3_tornado.png",
        ]
        
        for f in files:
            if not f.exists():
                print(f"✗ FAIL: {f} not created")
                return False
            size = f.stat().st_size
            print(f"    {f.name}: {size:,} bytes")
        
        return True
    
    except Exception as e:
        print(f"✗ FAIL: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_latex_build():
    """Test 6: Rebuild PDF with pdflatex"""
    print("\n" + "=" * 80)
    print("TEST 6: LaTeX PDF Build")
    print("=" * 80)
    
    try:
        latex_file = Path("src/CAWD Sewer Spill Analysis-Current.tex")
        if not latex_file.exists():
            print(f"✗ FAIL: {latex_file} not found")
            return False
        
        # Run pdflatex
        print(f"  Running pdflatex...", end=" ", flush=True)
        result = subprocess.run(
            ["pdflatex", "-interaction=nonstopmode", "CAWD Sewer Spill Analysis-Current.tex"],
            cwd=Path("src"),
            capture_output=True,
            timeout=120,
        )
        
        if result.returncode != 0:
            print(f"✗ FAIL: pdflatex returned {result.returncode}")
            # Print last few lines of output for debugging
            output_lines = result.stdout.decode('utf-8', errors='ignore').split('\n')
            for line in output_lines[-20:]:
                if line.strip():
                    print(f"    {line}")
            return False
        
        pdf_file = Path("src/CAWD Sewer Spill Analysis-Current.pdf")
        if not pdf_file.exists():
            print(f"✗ FAIL: PDF not created")
            return False
        
        size = pdf_file.stat().st_size
        print(f"✓ {size:,} bytes")
        return True
    
    except subprocess.TimeoutExpired:
        print(f"✗ FAIL: pdflatex timeout (>120s)")
        return False
    except Exception as e:
        print(f"✗ FAIL: {type(e).__name__}: {e}")
        return False


def main():
    print("\n")
    print("╔" + "=" * 78 + "╗")
    print("║" + " " * 78 + "║")
    print("║" + "FULL SIMULATOR TEST - CAWD Sensitivity Analysis Pipeline".center(78) + "║")
    print("║" + " " * 78 + "║")
    print("╚" + "=" * 78 + "╝")
    
    start_time = time.time()
    
    tests = [
        ("Data Extraction", test_data_extraction),
        ("Lambda Computation", test_lambda_computation),
        ("Optimizer", test_optimizer),
        ("Sensitivity Analyses", test_sensitivity_analyses),
        ("Figure Generation", test_figure_generation),
        ("LaTeX Build", test_latex_build),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except KeyboardInterrupt:
            print("\n\n✗ Test interrupted by user")
            return 1
        except Exception as e:
            print(f"\n✗ Unexpected error in {name}: {type(e).__name__}: {e}")
            results.append((name, False))
    
    elapsed = time.time() - start_time
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passed = sum(1 for _, p in results if p)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")
    
    print(f"\n{passed}/{total} tests passed in {elapsed:.1f}s")
    
    if passed == total:
        print("\n✓ All tests passed! Ready to commit.")
        return 0
    else:
        print(f"\n✗ {total - passed} test(s) failed. Fix before committing.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
