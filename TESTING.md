# Local Testing Guide

## Test Scripts

Two test scripts are available to validate the simulator before committing:

### 1. **Quick Check** (5 minutes) - Use this first
```bash
python test_quick_check.py
```

**What it checks:**
- ✓ Required files exist
- ✓ Python modules import correctly
- ✓ Historical data extraction works
- ✓ Optimizer runs (with small sample size for speed)
- ✓ SA1 runs on 5 test budgets
- ✓ Matplotlib available
- ✓ pdflatex installed

**Use case:** Catch obvious errors before spending time on full tests

---

### 2. **Full Test** (15 minutes) - Use before final commit
```bash
python test_full_simulator.py
```

**What it checks:**
- ✓ Historical data extraction (27 years)
- ✓ Lambda0 computation (5 failure modes)
- ✓ Optimizer on 3 budget levels
- ✓ **SA1**: Budget sweep (0.25K - 2M, 80 points) → detects lever entry threshold
- ✓ **SA2**: Cap sensitivity (seeded vs capped allocation)
- ✓ **SA3**: Tornado diagram (volume, lambda, rho sensitivity)
- ✓ Figure generation → PNG files saved
- ✓ LaTeX PDF rebuild

**Outputs:**
- `src/figures/sa1_budget_sweep.png` (allocation curves)
- `src/figures/sa2_cap_comparison.png` (capped vs unconstrained)
- `src/figures/sa3_tornado.png` (sensitivity analysis)
- `src/CAWD Sewer Spill Analysis-Current.pdf` (rebuilt)

---

## Workflow Before Committing

```bash
# Step 1: Quick validation (catch errors fast)
python test_quick_check.py

# If that passes, run full tests
python test_full_simulator.py

# If all tests pass:
git add scripts/generate_sensitivity_figures.py src/CAWD*.tex src/figures/ src/CAWD*.pdf
git commit -m "Your message here"
git push origin ramesh/sensitivity-analysis
```

---

## Test Results Summary

Last full test run (all 6/6 tests passed):

```
✓ Data Extraction: 27 years of historical data
✓ Lambda Computation: 5 failure modes (B=6.94, F=0.77, P=0.05, H=0, O=0)
✓ Optimizer: Runs on 3 budget points
✓ SA1: 80 budget points, threshold=(225, 'I4')
✓ SA2: Seeded: I1=0.5 I4=0.25; Capped: I1=3.0 I2=0.5 I3=1.5 I4=0.5
✓ SA3: Base cost=$605,316 (3 sensitivity rows)
✓ Figures: SA1=283KB, SA2=66KB, SA3=78KB
✓ PDF: Rebuilt successfully

Total runtime: 283 seconds (~5 minutes for full test)
```

---

## Troubleshooting

**Problem: "No module named matplotlib"**
```bash
# Install in the venv
.venv/bin/pip install matplotlib
```

**Problem: "pdflatex not found"**
```bash
# Check if TeX Live is installed
which pdflatex

# If not, install (macOS):
# Option 1: Homebrew
brew install texlive

# Option 2: MacTeX (full installation)
# Download from https://www.tug.org/mactex/
```

**Problem: "Quick check passes but full test hangs on SA1"**
- SA1 takes ~5 minutes (80 budget points × 1500 MC samples each)
- This is normal - don't interrupt unless clearly frozen (>15 min with no output)

**Problem: "Figure files generated but PDF not updated"**
```bash
# Rebuild PDF manually
cd src
pdflatex -interaction=nonstopmode "CAWD Sewer Spill Analysis-Current.tex"
```

---

## What Each Test Component Validates

| Component | Test | Purpose |
|-----------|------|---------|
| Data extraction | Reads 27 years from `src/App.js` | Ensures historical spill data is valid |
| Lambda computation | Calculates failure rate per 100 miles/year | Validates baseline risk model |
| Optimizer (greedy) | Allocates budget to maximize expected utility | Checks that lever selection works |
| SA1 | Budget sweep identifies when I4 enters solution | Shows how diversification threshold changes |
| SA2 | Compares unconstrained vs I1-capped allocation | Validates reallocation logic |
| SA3 | Tornado diagram shows sensitivity to volume, lambda, rho | Confirms which parameters matter most |
| Figures | PNG generation at 180 DPI | Ensures plots render correctly for PDF |
| PDF build | pdflatex compiles LaTeX with figures | Verifies Section 9 figures embed properly |

---

## What the Tests DON'T Validate

- **Numeric correctness of Section 9 prose** (must be updated manually after each run)
- **Visual appearance of figures** (only checks files are created)
- **Correctness of model parameters** (alpha matrix, costs, rho)
- **Historical data accuracy** (only structure, not values)

After running tests successfully, you still need to:
1. Compare actual SA1/SA2/SA3 outputs with Section 9 text
2. Update prose if optimizer outputs changed
3. Rebuild PDF one more time after text changes
4. Review the final PDF visually

---

## Next Steps

After all tests pass:

```bash
# 1. Extract actual numeric outputs
cd /Users/rameshmanian/DevSpace/stanford/MSE250B/cawd-risk-dashboard
.venv/bin/python -c "from pathlib import Path; from scripts.generate_sensitivity_figures import *; text=Path('src/App.js').read_text(); lambda0=compute_lambda0_from_window(extract_historical_data(text)); data,thresh=sa1_budget_sweep(lambda0); print('SA1 threshold:', thresh)"

# 2. Update Section 9 text with actual outputs
# (Edit src/CAWD Sewer Spill Analysis-Current.tex)

# 3. Rebuild PDF
cd src && pdflatex -interaction=nonstopmode "CAWD Sewer Spill Analysis-Current.tex" && cd ..

# 4. Commit everything
git add scripts/ src/*.tex src/figures/ src/*.pdf
git commit -m "Fix SA1/SA2/SA3 allocations and align Section 9 text"
git push origin ramesh/sensitivity-analysis
```
