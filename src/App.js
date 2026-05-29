import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const modes = [
  { key: "R", label: "Root Intrusion" },
  { key: "G", label: "Grease / FOG" },
  { key: "D", label: "Debris / Wipes" },
  { key: "F", label: "Pipe Failure" },
  { key: "P", label: "Pump Station Failure" },
];

const levers = [
  { key: "I1", label: "Preventive Maintenance", short: "Maint." },
  { key: "I2", label: "Workforce Capacity",     short: "Workforce" },
  { key: "I3", label: "Execution Quality",      short: "Execution" },
  { key: "I4", label: "Risk-Based Targeting",   short: "Targeting" },
];

const defaultLambda0 = { R: 2.6, G: 0.4, D: 0.2, F: 1.6, P: 0.6 };

// αki: log-rate reduction per unit investment. I1=0 for P is intentional —
// preventive maintenance does not affect pump-station mechanical/electrical faults.
const defaultAlpha = {
  R: { I1: 0.035, I2: 0.010, I3: 0.012, I4: 0.025 },
  G: { I1: 0.020, I2: 0.008, I3: 0.010, I4: 0.015 },
  D: { I1: 0.015, I2: 0.005, I3: 0.008, I4: 0.010 },
  F: { I1: 0.010, I2: 0.004, I3: 0.006, I4: 0.020 },
  P: { I1: 0.000, I2: 0.012, I3: 0.014, I4: 0.003 },
};

const defaultCost = { I1: 1, I2: 1, I3: 1, I4: 1 };

// ─────────────────────────────────────────────────────────────────────────────
// CAWD RISK AVERSION PARAMETERS (fixed — not a user lever)
// γ (gamma) = 0.091  →  risk aversion coefficient elicited from CAWD board
// ρ (rho)   = 1/γ = 10.989...  (in $100K units, matching investment scale)
//           ≈ $1,098,901 in dollar terms
// U(−C) = −exp(C / ρ)  where C is annual spill cost in $100K units
// ─────────────────────────────────────────────────────────────────────────────
const GAMMA = 0.091;
const RHO   = 1 / GAMMA; // ≈ 10.989  ($100K units)

const defaultSeverity = {
  R: { medianVolume: 350, sigma: 1.15, pSurface: 0.10 },
  G: { medianVolume: 400, sigma: 1.20, pSurface: 0.12 },
  D: { medianVolume: 300, sigma: 1.10, pSurface: 0.08 },
  F: { medianVolume: 600, sigma: 1.25, pSurface: 0.18 },
  P: { medianVolume: 900, sigma: 1.35, pSurface: 0.22 },
};

// ─────────────────────────────────────────────────────────────────────────────
// CAWD COST MODEL  (slide 10)
// Returns cost in $100K units to match the investment/RHO scale.
// Cat 1: reaches surface water
//   ≥200 gal  → $100k + $10/gal   →  1.0 + 0.0001*vol  ($100K units)
//   <200 gal  → $50k  + $10/gal   →  0.5 + 0.0001*vol
// Cat 2: no surface water, vol > 1000 gal → $100k + $5/gal
// Cat 3: no surface water, 50–1000 gal   → $50k  + $3/gal
// Cat 4: no surface water, <50 gal       → $10k  + $0
// ─────────────────────────────────────────────────────────────────────────────
function spillCost(volume, reachesSurface) {
  // raw dollars
  let raw;
  if (reachesSurface) {
    const fixed = volume >= 200 ? 100000 : 50000;
    raw = fixed + 10 * volume;
  } else if (volume > 1000) {
    raw = 100000 + 5 * volume;
  } else if (volume >= 50) {
    raw = 50000 + 3 * volume;
  } else {
    raw = 10000;
  }
  return raw / 100000; // convert to $100K units
}

function classifySpill(volume, reachesSurface) {
  if (reachesSurface)  return "C1";
  if (volume > 1000)   return "C2";
  if (volume >= 50)    return "C3";
  return "C4";
}

// ─────────────────────────────────────────────────────────────────────────────
// MATH UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function poissonSample(lambda) {
  if (lambda <= 0) return 0;
  const limit = Math.exp(-lambda);
  let count = 0, product = 1;
  do { count++; product *= Math.random(); } while (product > limit);
  return count - 1;
}

function normalSample() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function lognormalSample(median, sigma) {
  const m = Math.max(1, median || 1);
  const s = Math.max(0.05, sigma || 0.05);
  return Math.exp(Math.log(m) + s * normalSample());
}

function poissonCdf(k, lambda) {
  if (lambda <= 0) return 1;
  let term = Math.exp(-lambda), sum = term;
  for (let n = 1; n <= k; n++) { term *= lambda / n; sum += term; }
  return Math.min(1, sum);
}

function computeLambdas(lambda0, alpha, investment) {
  const result = {};
  for (const m of modes) {
    let reduction = 0;
    for (const l of levers) reduction += (alpha[m.key]?.[l.key] || 0) * (investment[l.key] || 0);
    result[m.key] = (lambda0[m.key] || 0) * Math.exp(-reduction);
  }
  return result;
}

function sumValues(obj) {
  return Object.values(obj).reduce((a, b) => a + Number(b || 0), 0);
}

function fmt(x, d = 2) {
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPONENTIAL UTILITY   U(−C) = −exp(C / ρ)
// C is in $100K units. ρ = RHO = 1/GAMMA ≈ 10.989 ($100K units).
// ─────────────────────────────────────────────────────────────────────────────
function expUtility(costIn100k) {
  return -Math.exp(costIn100k / RHO);
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATE ONE YEAR — returns totalCost in $100K units
// ─────────────────────────────────────────────────────────────────────────────
function simulateYear(lambdas, severity) {
  let n = 0, totalCost = 0, yearCat1 = 0, yearCat2 = 0, yearVolume = 0;
  for (const m of modes) {
    const count = poissonSample(lambdas[m.key] || 0);
    n += count;
    for (let j = 0; j < count; j++) {
      const sev = severity[m.key];
      const volume = lognormalSample(sev.medianVolume, sev.sigma);
      const toSurface = Math.random() < Math.max(0, Math.min(1, sev.pSurface));
      totalCost += spillCost(volume, toSurface); // already in $100K units
      yearVolume += volume;
      const cat = classifySpill(volume, toSurface);
      if (cat === "C1") yearCat1++;
      if (cat === "C2") yearCat2++;
    }
  }
  return { n, totalCost, yearCat1, yearCat2, yearVolume };
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTE CARLO ENGINE  — costs in $100K units, utility uses fixed RHO/GAMMA
// ─────────────────────────────────────────────────────────────────────────────
function monteCarlo(lambdas, severity, runs, threshold) {
  const HIST_MAX = 15;
  const hist = Array.from({ length: HIST_MAX + 1 }, (_, i) => ({
    spills: i < HIST_MAX ? String(i) : `${HIST_MAX}+`, count: 0,
  }));

  const catTotals  = { C1: 0, C2: 0, C3: 0, C4: 0 };
  const modeTotals = Object.fromEntries(modes.map((m) => [m.key, 0]));
  const modeVolArr = Object.fromEntries(modes.map((m) => [m.key, []]));

  let totalSpills = 0, totalVolume = 0, totalCost = 0, totalUtility = 0;
  let cntAtLeastOne = 0, cntOverThreshold = 0;
  let cntCat1Year = 0, cntCat2PlusYear = 0, cntVolOver10k = 0;
  let cntCostOver1M = 0;
  const annualCosts = [];

  for (let r = 0; r < runs; r++) {
    let n = 0, yearCost = 0, yearVolume = 0, yearCat1 = 0, yearCat2 = 0;

    for (const m of modes) {
      const count = poissonSample(lambdas[m.key] || 0);
      modeTotals[m.key] += count;
      n += count;
      for (let j = 0; j < count; j++) {
        const sev = severity[m.key];
        const volume = lognormalSample(sev.medianVolume, sev.sigma);
        const toSurface = Math.random() < Math.max(0, Math.min(1, sev.pSurface));
        const cat = classifySpill(volume, toSurface);
        yearCost   += spillCost(volume, toSurface);
        yearVolume += volume;
        catTotals[cat]++;
        modeVolArr[m.key].push(volume);
        if (cat === "C1") yearCat1++;
        if (cat === "C2") yearCat2++;
      }
    }

    totalSpills  += n;
    totalVolume  += yearVolume;
    totalCost    += yearCost;
    totalUtility += expUtility(yearCost);
    annualCosts.push(yearCost);
    hist[Math.min(n, HIST_MAX)].count++;

    if (n >= 1)                      cntAtLeastOne++;
    if (n > threshold)               cntOverThreshold++;
    if (yearCat1 >= 1)               cntCat1Year++;
    if (yearCat1 + yearCat2 >= 1)    cntCat2PlusYear++;
    if (yearVolume > 10000)          cntVolOver10k++;
    if (yearCost > 1_000_000)        cntCostOver1M++;
  }

  // Percentile helper
  function pct(arr, p) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.max(0, Math.ceil(s.length * p) - 1)];
  }

  const modeVolumeStats = Object.fromEntries(
    modes.map((m) => {
      const arr = modeVolArr[m.key];
      return [m.key, {
        p25: pct(arr, 0.25), median: pct(arr, 0.50),
        p75: pct(arr, 0.75), p90:    pct(arr, 0.90),
        mean: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
      }];
    })
  );

  return {
    mean:             totalSpills  / runs,
    expectedVolume:   totalVolume  / runs,
    expectedCost:     totalCost    / runs,
    expectedUtility:  totalUtility / runs,
    pAtLeastOne:      cntAtLeastOne    / runs,
    pOverThreshold:   cntOverThreshold / runs,
    pAtLeastOneCat1:  cntCat1Year      / runs,
    pAtLeastOneCat2P: cntCat2PlusYear  / runs,
    pVolOver10k:      cntVolOver10k    / runs,
    pCostOver1M:      cntCostOver1M    / runs,
    p90Cost:          pct(annualCosts, 0.90),
    p95Cost:          pct(annualCosts, 0.95),
    hist:             hist.map((d) => ({ ...d, probability: d.count / runs })),
    catMeans: [
      { category: "Cat 1", key: "C1", count: catTotals.C1 / runs },
      { category: "Cat 2", key: "C2", count: catTotals.C2 / runs },
      { category: "Cat 3", key: "C3", count: catTotals.C3 / runs },
      { category: "Cat 4", key: "C4", count: catTotals.C4 / runs },
    ],
    modeMeans:        Object.fromEntries(Object.entries(modeTotals).map(([k, v]) => [k, v / runs])),
    modeVolumeStats,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RISK-AVERSE GREEDY OPTIMIZER
// At each step, tries each lever increment and picks the one that maximizes
// expected utility gain (= most negative → least negative U) per unit cost.
// Uses MC_OPT_RUNS quick simulations per candidate to estimate E[U].
// ─────────────────────────────────────────────────────────────────────────────
const MC_OPT_RUNS = 400; // fast inner loop — increase for smoother curves

function expectedUtilityForAllocation(lambda0, alpha, inv, severity, runs) {
  const lambdas = computeLambdas(lambda0, alpha, inv);
  let sumU = 0;
  for (let r = 0; r < runs; r++) {
    const { totalCost } = simulateYear(lambdas, severity);
    sumU += expUtility(totalCost);
  }
  return sumU / runs;
}

function greedyOptimizeRiskAverse(lambda0, alpha, costs, budget, severity, step = 0.25) {
  const inv = { I1: 0, I2: 0, I3: 0, I4: 0 };
  let remaining = budget;

  let currentEU = expectedUtilityForAllocation(lambda0, alpha, inv, severity, MC_OPT_RUNS);

  const path = [{
    step: 0,
    eu: currentEU,
    lambda: sumValues(computeLambdas(lambda0, alpha, inv)),
    ...inv,
  }];
  let t = 0;

  while (remaining >= step && t < 1000) {
    let bestLever = null, bestEU = -Infinity;

    for (const lever of levers) {
      const cost = costs[lever.key] || 1;
      if (cost * step > remaining) continue;
      const trial = { ...inv, [lever.key]: inv[lever.key] + step };
      const trialEU = expectedUtilityForAllocation(lambda0, alpha, trial, severity, MC_OPT_RUNS);
      if (trialEU > bestEU) { bestEU = trialEU; bestLever = lever.key; }
    }

    if (!bestLever || bestEU <= currentEU) break;
    inv[bestLever] += step;
    remaining -= (costs[bestLever] || 1) * step;
    currentEU = bestEU;
    t++;
    path.push({
      step: t,
      eu: currentEU,
      lambda: sumValues(computeLambdas(lambda0, alpha, inv)),
      ...inv,
    });
  }

  return { investment: inv, remaining, path, finalEU: currentEU };
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const CAT_COLORS = { "Cat 1": "#ef4444", "Cat 2": "#f97316", "Cat 3": "#22c55e", "Cat 4": "#38bdf8" };
const MODE_COLORS = { R: "#38bdf8", G: "#facc15", D: "#a78bfa", F: "#f97316", P: "#34d399" };

function Kpi({ title, value, subtitle, accent }) {
  return (
    <div style={{
      borderRadius: 16, border: "1px solid #1e293b",
      background: "linear-gradient(135deg,#0f172a 60%,#1e293b)",
      padding: "20px 22px", boxShadow: "0 2px 12px #0008",
      borderLeft: accent ? `3px solid ${accent}` : undefined,
    }}>
      <div style={{ fontSize: 11, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9", margin: "8px 0 4px", fontFamily: "'DM Mono', monospace" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#64748b" }}>{subtitle}</div>
    </div>
  );
}

function NumberInput({ label, value, onChange, step = 0.1 }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 13, color: "#cbd5e1" }}>
      <span>{label}</span>
      <input type="number" step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: 110, borderRadius: 10, border: "1px solid #334155", background: "#020617", padding: "6px 10px", textAlign: "right", color: "#f1f5f9", fontSize: 13 }} />
    </label>
  );
}

function Panel({ title, children, style }) {
  return (
    <div style={{ borderRadius: 16, border: "1px solid #1e293b", background: "#0f172a", padding: 20, boxShadow: "0 2px 12px #0008", ...style }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.02em" }}>{title}</h2>
      {children}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ borderRadius: 16, border: "1px solid #1e293b", background: "#0f172a", padding: 20, boxShadow: "0 2px 12px #0008" }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{title}</h2>
      {children}
    </div>
  );
}

const TAB_ON  = { borderRadius: 10, padding: "7px 18px", fontSize: 13, fontWeight: 700, background: "#f1f5f9", color: "#0f172a", border: "none", cursor: "pointer" };
const TAB_OFF = { borderRadius: 10, padding: "7px 18px", fontSize: 13, fontWeight: 600, background: "#1e293b", color: "#94a3b8", border: "none", cursor: "pointer" };

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [lambda0,    setLambda0]    = useState(defaultLambda0);
  const [alpha,      setAlpha]      = useState(defaultAlpha);
  const [costs,      setCosts]      = useState(defaultCost);
  const [severity,   setSeverity]   = useState(defaultSeverity);
  const [investment, setInvestment] = useState({ I1: 1.5, I2: 1.0, I3: 1.0, I4: 1.5 });
  const [runs,       setRuns]       = useState(5000);
  const [budget,     setBudget]     = useState(5.5);
  const [thresholdN, setThresholdN] = useState(5);
  const [tab,        setTab]        = useState("dashboard");
  const [rerun,      setRerun]      = useState(0);

  const threshold      = Math.max(0, Math.round(thresholdN));
  const baselineLambda = useMemo(() => sumValues(lambda0), [lambda0]);

  const scenarioLambdas = useMemo(() => computeLambdas(lambda0, alpha, investment), [lambda0, alpha, investment]);
  const scenarioLambda  = useMemo(() => sumValues(scenarioLambdas), [scenarioLambdas]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mc = useMemo(
    () => monteCarlo(scenarioLambdas, severity, Math.max(100, runs), threshold),
    [scenarioLambdas, severity, runs, threshold, rerun]
  );

  // Risk-averse optimizer uses fixed GAMMA/RHO — no rho state needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const optimized = useMemo(
    () => greedyOptimizeRiskAverse(lambda0, alpha, costs, budget, severity),
    [lambda0, alpha, costs, budget, severity, rerun]
  );

  const optLambdas = useMemo(() => computeLambdas(lambda0, alpha, optimized.investment), [lambda0, alpha, optimized.investment]);
  const optLambda  = sumValues(optLambdas);

  // Baseline MC for comparison KPIs (zero investment)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mcBaseline = useMemo(
    () => monteCarlo(computeLambdas(lambda0, alpha, { I1:0,I2:0,I3:0,I4:0 }), severity, Math.max(100, runs), threshold),
    [lambda0, alpha, severity, runs, threshold, rerun]
  );

  const pSpillScenario = 1 - Math.exp(-scenarioLambda);
  const pSpillBase     = 1 - Math.exp(-baselineLambda);
  const pGTn_exact     = 1 - poissonCdf(threshold, scenarioLambda);

  const modeChart = modes.map((m) => ({
    mode: m.key, name: m.label,
    baseline: Number(lambda0[m.key].toFixed(3)),
    scenario: Number(scenarioLambdas[m.key].toFixed(3)),
    optimized: Number(optLambdas[m.key].toFixed(3)),
  }));

  const investChart = levers.map((l) => ({
    lever: l.short,
    scenario:  investment[l.key],
    optimized: optimized.investment[l.key],
  }));

  const volumeDistChart = modes.map((m) => ({
    mode: m.key,
    p25:    Number(mc.modeVolumeStats[m.key].p25.toFixed(0)),
    median: Number(mc.modeVolumeStats[m.key].median.toFixed(0)),
    p75:    Number(mc.modeVolumeStats[m.key].p75.toFixed(0)),
    p90:    Number(mc.modeVolumeStats[m.key].p90.toFixed(0)),
  }));

  const tabs = ["dashboard", "cost", "volume", "severity", "inputs", "optimizer", "model"];

  return (
    <div style={{ minHeight: "100vh", background: "#020617", padding: "24px 20px", color: "#e2e8f0", fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                CAWD Sewer Spill O&M Risk Dashboard
              </h1>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b", maxWidth: 620 }}>
                Monte Carlo PRA + investment simulator · SAM model · risk-averse objective: maximize E[U(−C)] with exponential utility
              </p>
              <span style={{ display: "inline-block", marginTop: 6, borderRadius: 20, background: "#1e3a5f", padding: "3px 12px", fontSize: 11, fontWeight: 700, color: "#7dd3fc", letterSpacing: "0.06em" }}>
                Stanford MS&E 250B · Spring 2026 · Annabelle Jayadinata · Khang Do · Ramesh Manian· Maura Osorio
              </span>
            </div>
            <button onClick={() => setRerun((x) => x + 1)}
              style={{ borderRadius: 12, background: "#f1f5f9", padding: "10px 20px", fontWeight: 700, fontSize: 13, color: "#0f172a", border: "none", cursor: "pointer", whiteSpace: "nowrap", marginTop: 4 }}>
              ↺ Re-run Monte Carlo
            </button>
          </div>

          {/* Risk aversion info badge — fixed, not a lever */}
          <div style={{ marginTop: 14, background: "#0f172a", borderRadius: 14, border: "1px solid #1e293b", padding: "12px 18px", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 11, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>Risk Aversion Coefficient</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#a78bfa", fontFamily: "'DM Mono',monospace", marginTop: 2 }}>γ = 0.091</div>
            </div>
            <div>
              <span style={{ fontSize: 11, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>Risk Tolerance ρ = 1/γ</span>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#facc15", fontFamily: "'DM Mono',monospace", marginTop: 2 }}>ρ = {RHO.toFixed(4)} ($100K units) ≈ ${(RHO/10).toFixed(2)}M</div>
            </div>
            <div style={{ fontSize: 12, color: "#475569", maxWidth: 340 }}>
              U(−C) = −e<sup>C/ρ</sup> · elicited from CAWD board · fixed across all scenarios
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={tab === t ? TAB_ON : TAB_OFF}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ══ DASHBOARD ═══════════════════════════════════════════════════════ */}
        {tab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: 14 }}>
              <Kpi title="Expected annual spills" value={fmt(scenarioLambda)}
                subtitle={`Baseline: ${fmt(baselineLambda)}`} accent="#38bdf8" />
              <Kpi title="Expected annual cost" value={`$${fmt(mc.expectedCost/1000,0)}k`}
                subtitle={`Baseline: $${fmt(mcBaseline.expectedCost/1000,0)}k`} accent="#f97316" />
              <Kpi title="P(≥1 spill)" value={`${fmt(100*pSpillScenario,1)}%`}
                subtitle={`Baseline: ${fmt(100*pSpillBase,1)}%`} accent="#22c55e" />
              <Kpi title={`P(N > ${threshold}) exact Poisson`} value={`${fmt(100*pGTn_exact,1)}%`}
                subtitle={`MC: ${fmt(100*mc.pOverThreshold,1)}%`} accent="#a78bfa" />
              <Kpi title="Expected utility E[U]" value={fmt(mc.expectedUtility,4)}
                subtitle={`γ=0.091, ρ≈${RHO.toFixed(2)} · more negative = worse`} accent="#facc15" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <ChartCard title="Failure Mode Contributions">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={modeChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="mode" stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="baseline" name="Baseline λ" fill="#475569" radius={[4,4,0,0]} />
                    <Bar dataKey="scenario" name="Scenario λ" fill="#38bdf8" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="MC Distribution of Annual Spill Count">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={mc.hist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="spills" stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${(v*100).toFixed(0)}%`} stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip formatter={(v) => `${fmt(100*v,2)}%`} contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                    <Bar dataKey="probability" name="Probability" fill="#22c55e" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <ChartCard title="Expected Annual Spills by Category">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={mc.catMeans}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="category" stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                    <Bar dataKey="count" name="Spills/year" radius={[4,4,0,0]}>
                      {mc.catMeans.map((e) => <Cell key={e.category} fill={CAT_COLORS[e.category] || "#94a3b8"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p style={{ margin: "8px 0 0", fontSize: 11, color: "#475569" }}>
                  Cat 1: surface water · Cat 2: no SW, &gt;1000 gal · Cat 3: no SW, 50–1000 gal · Cat 4: no SW, &lt;50 gal
                </p>
              </ChartCard>

              <Panel title="Investment Scenario Sliders">
                <div style={{ marginBottom: 12 }}>
                  <NumberInput label={`Threshold n for P(N > n)`} value={thresholdN} step={1}
                    onChange={(v) => setThresholdN(Math.max(0, Math.round(v)))} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {levers.map((l) => (
                    <div key={l.key}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#94a3b8", marginBottom: 4 }}>
                        <span>{l.label}</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", color: "#f1f5f9" }}>{fmt(investment[l.key])}</span>
                      </div>
                      <input type="range" min="0" max="10" step="0.25" value={investment[l.key]}
                        onChange={(e) => setInvestment({ ...investment, [l.key]: Number(e.target.value) })}
                        style={{ width: "100%", accentColor: "#38bdf8" }} />
                    </div>
                  ))}
                </div>
                <p style={{ margin: "10px 0 0", fontSize: 11, color: "#475569" }}>1 unit ≈ $100K O&M effort.</p>
              </Panel>
            </div>
          </div>
        )}

        {/* ══ COST TAB ════════════════════════════════════════════════════════ */}
        {tab === "cost" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: 14 }}>
              <Kpi title="Expected annual cost" value={`$${fmt(mc.expectedCost/1000,0)}k`}
                subtitle={`Baseline: $${fmt(mcBaseline.expectedCost/1000,0)}k`} accent="#f97316" />
              <Kpi title="P90 annual cost" value={`$${fmt(mc.p90Cost/1000,0)}k`}
                subtitle="90th percentile year" accent="#ef4444" />
              <Kpi title="P95 annual cost" value={`$${fmt(mc.p95Cost/1000,0)}k`}
                subtitle="95th percentile year" accent="#ef4444" />
              <Kpi title="P(annual cost > $1M)" value={`${fmt(100*mc.pCostOver1M,1)}%`}
                subtitle={`Baseline: ${fmt(100*mcBaseline.pCostOver1M,1)}%`} accent="#a78bfa" />
              <Kpi title="Expected utility E[U]" value={fmt(mc.expectedUtility,4)}
                subtitle={`γ=0.091, ρ≈${RHO.toFixed(2)}`} accent="#facc15" />
            </div>

            <Panel title="CAWD Cost Model Reference (slide 10)">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      {["Cost Class", "Condition", "Fixed O&M", "Per-gallon fine"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Cat 1", "≥200 gal, reaches surface water",     "$100,000", "$10/gal"],
                      ["Cat 1", "<200 gal, reaches surface water",      "$50,000",  "$10/gal"],
                      ["Cat 2", ">1,000 gal, no surface water",         "$100,000", "$5/gal"],
                      ["Cat 3", "50–1,000 gal, no surface water",       "$50,000",  "$3/gal"],
                      ["Cat 4", "<50 gal, no surface water",            "$10,000",  "$0"],
                    ].map(([cat, cond, fixed, fine]) => (
                      <tr key={cat+cond} style={{ borderBottom: "1px solid #0f172a" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: CAT_COLORS[cat] || "#94a3b8" }}>{cat}</td>
                        <td style={{ padding: "8px 10px", color: "#cbd5e1" }}>{cond}</td>
                        <td style={{ padding: "8px 10px", fontFamily: "'DM Mono',monospace" }}>{fixed}</td>
                        <td style={{ padding: "8px 10px", fontFamily: "'DM Mono',monospace" }}>{fine}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Utility Function & Risk Aversion">
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
                U(−C) = −e<sup>C/ρ</sup> &nbsp;·&nbsp; γ = 0.091 (elicited from CAWD board) &nbsp;·&nbsp; ρ = 1/γ ≈ {RHO.toFixed(4)} ($100K units) ≈ ${(RHO/10).toFixed(2)}M<br />
                The optimizer maximizes E[U] by choosing how to allocate the O&M budget across the four investment levers.<br />
                These parameters are fixed — not a user lever — reflecting CAWD's board-elicited risk attitude.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Kpi title="Scenario E[U]"  value={fmt(mc.expectedUtility,4)}         subtitle="Current investment scenario" accent="#facc15" />
                <Kpi title="Baseline E[U]"  value={fmt(mcBaseline.expectedUtility,4)} subtitle="Zero investment baseline"    accent="#475569" />
              </div>
            </Panel>
          </div>
        )}

        {/* ══ VOLUME TAB ══════════════════════════════════════════════════════ */}
        {tab === "volume" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: 14 }}>
              <Kpi title="Expected annual volume" value={`${fmt(mc.expectedVolume,0)} gal`} subtitle="MC mean" accent="#facc15" />
              <Kpi title="P(vol > 10,000 gal/yr)" value={`${fmt(100*mc.pVolOver10k,1)}%`} subtitle="MC estimate" accent="#f97316" />
              <Kpi title="P(≥1 Cat 1/year)" value={`${fmt(100*mc.pAtLeastOneCat1,1)}%`} subtitle="Surface water impact" accent="#ef4444" />
              <Kpi title="P(≥1 Cat 1 or 2/year)" value={`${fmt(100*mc.pAtLeastOneCat2P,1)}%`} subtitle="Higher-severity year" accent="#f97316" />
            </div>

            <ChartCard title="Volume Percentiles by Failure Mode (per-spill)">
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>Per individual simulated spill. Volume is analytics only — it enters the cost model but not the spill-count objective.</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={volumeDistChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="mode" stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} label={{ value: "Gallons", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="p25" name="P25" fill="#1e3a5f" radius={[3,3,0,0]} />
                  <Bar dataKey="median" name="Median" fill="#38bdf8" radius={[3,3,0,0]} />
                  <Bar dataKey="p75" name="P75" fill="#f97316" radius={[3,3,0,0]} />
                  <Bar dataKey="p90" name="P90" fill="#ef4444" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <Panel title="Per-Spill Volume Statistics by Failure Mode">
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      {["Failure Mode","Mean","P25","Median","P75","P90"].map((h) => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 12 }}>{h} (gal)</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modes.map((m) => {
                      const s = mc.modeVolumeStats[m.key];
                      return (
                        <tr key={m.key} style={{ borderBottom: "1px solid #0f172a" }}>
                          <td style={{ padding: "8px 10px", fontWeight: 600, color: MODE_COLORS[m.key] }}>{m.label}</td>
                          {[s.mean,s.p25,s.median,s.p75,s.p90].map((v,i) => (
                            <td key={i} style={{ padding: "8px 10px", fontFamily: "'DM Mono',monospace" }}>{fmt(v,0)}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}

        {/* ══ SEVERITY TAB ════════════════════════════════════════════════════ */}
        {tab === "severity" && (
          <Panel title="Severity & Volume Model Parameters">
            <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748b" }}>
              Volume ~ Lognormal(log(medianVolume), sigma). Surface water outcome ~ Bernoulli(pSurface).
              pSurface should be calibrated with GIS data given CAWD's proximity to Monterey Bay.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1e293b" }}>
                    {["Failure Mode","Median Volume (gal)","Lognormal σ","P(Reaches Surface Water)"].map((h) => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modes.map((m) => (
                    <tr key={m.key} style={{ borderBottom: "1px solid #0f172a" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: MODE_COLORS[m.key] }}>{m.label}</td>
                      {[
                        { field: "medianVolume", step: 10,   min: 1,    max: 1 },
                        { field: "sigma",        step: 0.05, min: 0.05, max: 1 },
                        { field: "pSurface",     step: 0.01, min: 0,    max: 1 },
                      ].map(({ field, step, min }) => (
                        <td key={field} style={{ padding: "8px 10px" }}>
                          <input type="number" step={step} value={severity[m.key][field]}
                            onChange={(e) => setSeverity({ ...severity, [m.key]: { ...severity[m.key], [field]: Math.max(min, Number(e.target.value)) } })}
                            style={{ width: 100, borderRadius: 8, border: "1px solid #334155", background: "#020617", padding: "5px 8px", color: "#f1f5f9", fontSize: 13, textAlign: "right" }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* ══ INPUTS TAB ══════════════════════════════════════════════════════ */}
        {tab === "inputs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <Panel title="Baseline Annual Failure Rates λ₀">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {modes.map((m) => (
                    <NumberInput key={m.key} label={`${m.label} (${m.key})`} value={lambda0[m.key]}
                      onChange={(v) => setLambda0({ ...lambda0, [m.key]: Math.max(0, v) })} />
                  ))}
                </div>
              </Panel>
              <Panel title="Simulation & Cost Settings">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <NumberInput label="Monte Carlo runs" value={runs} step={1000}
                    onChange={(v) => setRuns(Math.max(100, Math.round(v)))} />
                  <NumberInput label="Budget ($100K units)" value={budget}
                    onChange={(v) => setBudget(Math.max(0, v))} />
                </div>
                <h3 style={{ margin: "20px 0 10px", fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>Cost per investment unit (ci)</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {levers.map((l) => (
                    <NumberInput key={l.key} label={l.label} value={costs[l.key]}
                      onChange={(v) => setCosts({ ...costs, [l.key]: Math.max(0.01, v) })} />
                  ))}
                </div>
              </Panel>
            </div>

            <Panel title="Effectiveness Matrix αki">
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>
                λk(I) = λk0 · exp(−Σi αki·Ii). P/I1=0 is intentional (pump stations not affected by preventive maintenance).
              </p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontSize: 12 }}>Mode</th>
                      {levers.map((l) => <th key={l.key} style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontSize: 12 }}>{l.short}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {modes.map((m) => (
                      <tr key={m.key} style={{ borderBottom: "1px solid #0f172a" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600, color: MODE_COLORS[m.key] }}>{m.label}</td>
                        {levers.map((l) => (
                          <td key={l.key} style={{ padding: "8px 10px" }}>
                            <input type="number" step="0.001" value={alpha[m.key][l.key]}
                              onChange={(e) => setAlpha({ ...alpha, [m.key]: { ...alpha[m.key], [l.key]: Number(e.target.value) } })}
                              style={{ width: 90, borderRadius: 8, border: "1px solid #334155", background: "#020617", padding: "5px 8px", color: "#f1f5f9", fontSize: 13, textAlign: "right" }} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}

        {/* ══ OPTIMIZER TAB ═══════════════════════════════════════════════════ */}
        {tab === "optimizer" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
              Greedy risk-averse optimizer: at each step allocates one unit to the lever with the highest marginal expected-utility gain.
              Objective: max E[U(−C(I))] = max E[−e<sup>C/ρ</sup>]. Fixed γ = 0.091, ρ ≈ {RHO.toFixed(2)} ($100K units).
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: 14 }}>
              <Kpi title="Optimized E[spills]" value={fmt(optLambda)} subtitle={`Baseline: ${fmt(baselineLambda)}`} accent="#22c55e" />
              <Kpi title="Spill reduction" value={`${fmt(100*(baselineLambda-optLambda)/baselineLambda,1)}%`}
                subtitle={`${fmt(baselineLambda-optLambda)} fewer/yr`} accent="#38bdf8" />
              <Kpi title="Optimized E[U]" value={fmt(optimized.finalEU,4)}
                subtitle={`γ=0.091, ρ≈${RHO.toFixed(2)}`} accent="#facc15" />
              <Kpi title="Unallocated budget" value={`$${fmt(optimized.remaining*100,0)}K`}
                subtitle="After greedy allocation" accent="#f97316" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <ChartCard title="Manual vs Optimized Allocation">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={investChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="lever" stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="scenario"  name="Manual"    fill="#38bdf8" radius={[4,4,0,0]} />
                    <Bar dataKey="optimized" name="Optimized" fill="#f97316" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="E[U] as Budget is Allocated (Greedy Path)">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={optimized.path}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="step" stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="eu" name="E[U]" stroke="#facc15" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <ChartCard title="Optimized vs Baseline: Failure Mode λ">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={modeChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="mode" stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis stroke="#475569" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="baseline"  name="Baseline λ"  fill="#475569" radius={[4,4,0,0]} />
                  <Bar dataKey="optimized" name="Optimized λ" fill="#22c55e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* ══ MODEL TAB ═══════════════════════════════════════════════════════ */}
        {tab === "model" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <Panel title="PRA & Investment Equations">
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: "#cbd5e1", lineHeight: 1.8 }}>
                <p style={{ margin: 0 }}><strong>Failure count:</strong> N<sub>k</sub> ~ Poisson(λ<sub>k</sub>)</p>
                <p style={{ margin: 0 }}><strong>Total spills:</strong> N = Σ<sub>k</sub> N<sub>k</sub></p>
                <p style={{ margin: 0 }}><strong>Investment effect:</strong> λ<sub>k</sub>(I) = λ<sub>k0</sub> · exp(−Σ<sub>i</sub> α<sub>ki</sub> I<sub>i</sub>)</p>
                <p style={{ margin: 0 }}><strong>Volume:</strong> V|k ~ Lognormal(log(μ<sub>k</sub>), σ<sub>k</sub>)</p>
                <p style={{ margin: 0 }}><strong>Surface water:</strong> R|k ~ Bernoulli(p<sub>surface,k</sub>)</p>
                <p style={{ margin: 0 }}><strong>Spill cost:</strong> C = fixed O&M + per-gal fine (CAWD table)</p>
                <p style={{ margin: 0 }}><strong>Utility:</strong> U(−C) = −e<sup>C/ρ</sup> · γ=0.091, ρ=1/γ≈{RHO.toFixed(4)} ($100K units)</p>
                <p style={{ margin: 0, color: "#22c55e" }}><strong>Risk-averse objective:</strong> max<sub>I</sub> E[U(−C(I,ω))] s.t. Σ<sub>i</sub> c<sub>i</sub>I<sub>i</sub> ≤ B, I<sub>i</sub> ≥ 0</p>
                <p style={{ margin: 0 }}><strong>P(N &gt; n):</strong> 1 − Σ<sub>k=0</sub><sup>n</sup> e<sup>−λ</sup>λ<sup>k</sup>/k!</p>
              </div>
            </Panel>
            <Panel title="SAM Structure">
              <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13, color: "#cbd5e1" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#94a3b8" }}>Management → Actions</h3>
                  <p style={{ margin: 0 }}>M1 → A1 · M2 → A1,A2,A3 · M3 → A3,A4 · M4 → A2</p>
                </div>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#94a3b8" }}>Actions → Failure Modes</h3>
                  <p style={{ margin: 0 }}>A1 → B,F · A2 → B,F,H · A3 → O,P · A4 → O</p>
                </div>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#94a3b8" }}>Failure Modes → Spill → Cost</h3>
                  <p style={{ margin: 0 }}>B,F,P,H,O → S → CAWD cost table → C → U(−C)</p>
                </div>
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#94a3b8" }}>Investment Levers</h3>
                  {levers.map((l) => <p key={l.key} style={{ margin: "2px 0" }}><strong>{l.key}:</strong> {l.label}</p>)}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  P/I1=0: PM has no effect on pump-station mechanical/electrical faults.
                  Workforce (I2) and execution quality (I3) are the dominant levers for pump failures.
                </div>
              </div>
            </Panel>
          </div>
        )}

      </div>
    </div>
  );
}
