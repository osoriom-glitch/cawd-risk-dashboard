import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell, ScatterChart, Scatter, ReferenceLine,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// HISTORICAL DATA — parsed from CAWD Spill Tracking 2000–2026
// ─────────────────────────────────────────────────────────────────────────────
const HISTORICAL_DATA = [
  {"year":2000,"count":11,"totalGallons":2175,"spills":[{"gallons":75,"mode":"R"},{"gallons":800,"mode":"G"},{"gallons":100,"mode":"R"},{"gallons":100,"mode":"G"},{"gallons":50,"mode":"G"},{"gallons":20,"mode":"G"},{"gallons":50,"mode":"G"},{"gallons":500,"mode":"G"},{"gallons":30,"mode":"R"},{"gallons":150,"mode":"G"},{"gallons":300,"mode":"G"}]},
  {"year":2001,"count":16,"totalGallons":5760,"spills":[{"gallons":10,"mode":"G"},{"gallons":800,"mode":"R"},{"gallons":400,"mode":"G"},{"gallons":50,"mode":"G"},{"gallons":300,"mode":"G"},{"gallons":450,"mode":"R"},{"gallons":300,"mode":"G"},{"gallons":650,"mode":"G"},{"gallons":500,"mode":"G"},{"gallons":200,"mode":"R"},{"gallons":100,"mode":"G"},{"gallons":300,"mode":"R"},{"gallons":200,"mode":"G"},{"gallons":500,"mode":"G"},{"gallons":500,"mode":"G"},{"gallons":500,"mode":"G"}]},
  {"year":2002,"count":16,"totalGallons":3180,"spills":[{"gallons":100,"mode":"D"},{"gallons":250,"mode":"G"},{"gallons":50,"mode":"R"},{"gallons":100,"mode":"R"},{"gallons":500,"mode":"R"},{"gallons":30,"mode":"R"},{"gallons":40,"mode":"R"},{"gallons":50,"mode":"R"},{"gallons":60,"mode":"R"},{"gallons":1000,"mode":"R"},{"gallons":70,"mode":"R"},{"gallons":50,"mode":"G"},{"gallons":80,"mode":"G"},{"gallons":450,"mode":"G"},{"gallons":100,"mode":"R"},{"gallons":250,"mode":"F"}]},
  {"year":2003,"count":14,"totalGallons":3445,"spills":[{"gallons":40,"mode":"R"},{"gallons":100,"mode":"R"},{"gallons":1000,"mode":"R"},{"gallons":50,"mode":"R"},{"gallons":75,"mode":"R"},{"gallons":40,"mode":"D"},{"gallons":40,"mode":"G"},{"gallons":500,"mode":"R"},{"gallons":60,"mode":"G"},{"gallons":400,"mode":"G"},{"gallons":150,"mode":"P"},{"gallons":540,"mode":"R"},{"gallons":300,"mode":"R"},{"gallons":150,"mode":"G"}]},
  {"year":2004,"count":10,"totalGallons":2815,"spills":[{"gallons":500,"mode":"R"},{"gallons":900,"mode":"D"},{"gallons":80,"mode":"G"},{"gallons":60,"mode":"R"},{"gallons":100,"mode":"R"},{"gallons":25,"mode":"R"},{"gallons":150,"mode":"R"},{"gallons":350,"mode":"R"},{"gallons":50,"mode":"R"},{"gallons":600,"mode":"R"}]},
  {"year":2005,"count":5,"totalGallons":825,"spills":[{"gallons":300,"mode":"R"},{"gallons":225,"mode":"D"},{"gallons":180,"mode":"G"},{"gallons":20,"mode":"R"},{"gallons":100,"mode":"G"}]},
  {"year":2006,"count":2,"totalGallons":200,"spills":[{"gallons":150,"mode":"G"},{"gallons":50,"mode":"R"}]},
  {"year":2007,"count":5,"totalGallons":1480,"spills":[{"gallons":400,"mode":"R"},{"gallons":600,"mode":"G"},{"gallons":200,"mode":"R"},{"gallons":250,"mode":"R"},{"gallons":30,"mode":"D"}]},
  {"year":2008,"count":6,"totalGallons":1380,"spills":[{"gallons":135,"mode":"R"},{"gallons":85,"mode":"R"},{"gallons":35,"mode":"G"},{"gallons":400,"mode":"G"},{"gallons":325,"mode":"G"},{"gallons":400,"mode":"F"}]},
  {"year":2009,"count":8,"totalGallons":1835,"spills":[{"gallons":250,"mode":"R"},{"gallons":60,"mode":"R"},{"gallons":150,"mode":"R"},{"gallons":65,"mode":"R"},{"gallons":150,"mode":"R"},{"gallons":200,"mode":"R"},{"gallons":500,"mode":"R"},{"gallons":460,"mode":"G"}]},
  {"year":2010,"count":4,"totalGallons":400,"spills":[{"gallons":50,"mode":"R"},{"gallons":150,"mode":"R"},{"gallons":50,"mode":"F"},{"gallons":150,"mode":"G"}]},
  {"year":2011,"count":8,"totalGallons":2450,"spills":[{"gallons":50,"mode":"R"},{"gallons":55,"mode":"R"},{"gallons":80,"mode":"R"},{"gallons":650,"mode":"R"},{"gallons":200,"mode":"G"},{"gallons":30,"mode":"G"},{"gallons":560,"mode":"G"},{"gallons":825,"mode":"R"}]},
  {"year":2012,"count":8,"totalGallons":5880,"spills":[{"gallons":40,"mode":"G"},{"gallons":40,"mode":"R"},{"gallons":2400,"mode":"R"},{"gallons":900,"mode":"G"},{"gallons":900,"mode":"G"},{"gallons":500,"mode":"D"},{"gallons":850,"mode":"G"},{"gallons":250,"mode":"G"}]},
  {"year":2013,"count":5,"totalGallons":3765,"spills":[{"gallons":700,"mode":"R"},{"gallons":50,"mode":"R"},{"gallons":40,"mode":"R"},{"gallons":2800,"mode":"G"},{"gallons":175,"mode":"R"}]},
  {"year":2014,"count":7,"totalGallons":6488,"spills":[{"gallons":30,"mode":"R"},{"gallons":85,"mode":"R"},{"gallons":257,"mode":"R"},{"gallons":522,"mode":"R"},{"gallons":258,"mode":"R"},{"gallons":4500,"mode":"R"},{"gallons":836,"mode":"R"}]},
  {"year":2015,"count":4,"totalGallons":14471,"spills":[{"gallons":1557,"mode":"R"},{"gallons":40,"mode":"G"},{"gallons":10474,"mode":"R"},{"gallons":2400,"mode":"G"}]},
  {"year":2016,"count":5,"totalGallons":1600,"spills":[{"gallons":212,"mode":"R"},{"gallons":688,"mode":"D"},{"gallons":10,"mode":"R"},{"gallons":630,"mode":"R"},{"gallons":60,"mode":"G"}]},
  {"year":2017,"count":4,"totalGallons":147447,"spills":[{"gallons":1650,"mode":"R"},{"gallons":145000,"mode":"F"},{"gallons":17,"mode":"F"},{"gallons":780,"mode":"R"}]},
  {"year":2018,"count":3,"totalGallons":888,"spills":[{"gallons":380,"mode":"D"},{"gallons":180,"mode":"F"},{"gallons":328,"mode":"G"}]},
  {"year":2019,"count":1,"totalGallons":2008,"spills":[{"gallons":2008,"mode":"G"}]},
  {"year":2020,"count":0,"totalGallons":0,"spills":[]},
  {"year":2021,"count":4,"totalGallons":2849,"spills":[{"gallons":476,"mode":"R"},{"gallons":802,"mode":"R"},{"gallons":454,"mode":"G"},{"gallons":1117,"mode":"R"}]},
  {"year":2022,"count":6,"totalGallons":7891,"spills":[{"gallons":90,"mode":"G"},{"gallons":20,"mode":"R"},{"gallons":1896,"mode":"R"},{"gallons":5625,"mode":"R"},{"gallons":129,"mode":"R"},{"gallons":131,"mode":"R"}]},
  {"year":2023,"count":10,"totalGallons":100705,"spills":[{"gallons":5419,"mode":"R"},{"gallons":506,"mode":"D"},{"gallons":108,"mode":"R"},{"gallons":1301,"mode":"R"},{"gallons":361,"mode":"F"},{"gallons":48269,"mode":"F"},{"gallons":222,"mode":"R"},{"gallons":357,"mode":"F"},{"gallons":44159,"mode":"F"},{"gallons":3,"mode":"F"}]},
  {"year":2024,"count":2,"totalGallons":24458,"spills":[{"gallons":1777,"mode":"R"},{"gallons":22681,"mode":"F"}]},
  {"year":2025,"count":4,"totalGallons":10999,"spills":[{"gallons":9156,"mode":"F"},{"gallons":1798,"mode":"F"},{"gallons":20,"mode":"G"},{"gallons":25,"mode":"F"}]},
  {"year":2026,"count":1,"totalGallons":9429,"spills":[{"gallons":9429,"mode":"F"}]},
];

const CURRENT_YEAR = 2026;

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

const defaultAlpha = {
  R: { I1: 0.035, I2: 0.010, I3: 0.012, I4: 0.025 },
  G: { I1: 0.020, I2: 0.008, I3: 0.010, I4: 0.015 },
  D: { I1: 0.015, I2: 0.005, I3: 0.008, I4: 0.010 },
  F: { I1: 0.010, I2: 0.004, I3: 0.006, I4: 0.020 },
  P: { I1: 0.000, I2: 0.012, I3: 0.014, I4: 0.003 },
};

const defaultCost = { I1: 1, I2: 1, I3: 1, I4: 1 };

const defaultSeverity = {
  R: { medianVolume: 350, sigma: 1.15, pSurface: 0.10 },
  G: { medianVolume: 400, sigma: 1.20, pSurface: 0.12 },
  D: { medianVolume: 300, sigma: 1.10, pSurface: 0.08 },
  F: { medianVolume: 600, sigma: 1.25, pSurface: 0.18 },
  P: { medianVolume: 900, sigma: 1.35, pSurface: 0.22 },
};

// CAWD risk aversion — fixed, board-elicited
const GAMMA = 0.091;
const RHO   = 1 / GAMMA; // ≈ 10.989 ($100K units)

// ─────────────────────────────────────────────────────────────────────────────
// CAWD COST MODEL — returns cost in $100K units
// ─────────────────────────────────────────────────────────────────────────────
function spillCost(volume, reachesSurface) {
  let raw;
  if (reachesSurface) {
    raw = (volume >= 200 ? 100000 : 50000) + 10 * volume;
  } else if (volume > 1000) {
    raw = 100000 + 5 * volume;
  } else if (volume >= 50) {
    raw = 50000 + 3 * volume;
  } else {
    raw = 10000;
  }
  return raw / 100000; // $100K units
}

function classifySpill(volume, reachesSurface) {
  if (reachesSurface) return "C1";
  if (volume > 1000)  return "C2";
  if (volume >= 50)   return "C3";
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
  return Math.exp(Math.log(Math.max(1, median)) + Math.max(0.05, sigma) * normalSample());
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

function fmtDollars(x100k) {
  // x100k is in $100K units — convert to readable dollars
  const dollars = x100k * 100000;
  if (dollars >= 1000000) return `$${fmt(dollars/1000000, 2)}M`;
  if (dollars >= 1000)    return `$${fmt(dollars/1000, 0)}k`;
  return `$${fmt(dollars, 0)}`;
}

function expUtility(costIn100k) {
  return -Math.exp(costIn100k / RHO);
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATE ONE YEAR
// ─────────────────────────────────────────────────────────────────────────────
function simulateYear(lambdas, severity) {
  let n = 0, totalCost = 0, yearVolume = 0, yearCat1 = 0, yearCat2 = 0;
  for (const m of modes) {
    const count = poissonSample(lambdas[m.key] || 0);
    n += count;
    for (let j = 0; j < count; j++) {
      const sev = severity[m.key];
      const volume = lognormalSample(sev.medianVolume, sev.sigma);
      const toSurface = Math.random() < Math.max(0, Math.min(1, sev.pSurface));
      totalCost += spillCost(volume, toSurface);
      yearVolume += volume;
      const cat = classifySpill(volume, toSurface);
      if (cat === "C1") yearCat1++;
      if (cat === "C2") yearCat2++;
    }
  }
  return { n, totalCost, yearCat1, yearCat2, yearVolume };
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTE CARLO ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function monteCarlo(lambdas, severity, runs, threshold) {
  const HIST_MAX = 15;
  const hist = Array.from({ length: HIST_MAX + 1 }, (_, i) => ({
    spills: i < HIST_MAX ? String(i) : `${HIST_MAX}+`, count: 0,
  }));
  const catTotals = { C1: 0, C2: 0, C3: 0, C4: 0 };
  const modeVolArr = Object.fromEntries(modes.map((m) => [m.key, []]));
  let totalSpills = 0, totalVolume = 0, totalCost = 0, totalUtility = 0;
  let cntAtLeastOne = 0, cntOverThreshold = 0, cntCat1Year = 0;
  let cntCat2PlusYear = 0, cntVolOver10k = 0, cntCostOver1M = 0;
  const annualCosts = [];

  for (let r = 0; r < runs; r++) {
    let n = 0, yearCost = 0, yearVolume = 0, yearCat1 = 0, yearCat2 = 0;
    for (const m of modes) {
      const count = poissonSample(lambdas[m.key] || 0);
      n += count;
      for (let j = 0; j < count; j++) {
        const sev = severity[m.key];
        const volume = lognormalSample(sev.medianVolume, sev.sigma);
        const toSurface = Math.random() < Math.max(0, Math.min(1, sev.pSurface));
        const cat = classifySpill(volume, toSurface);
        yearCost += spillCost(volume, toSurface);
        yearVolume += volume;
        catTotals[cat]++;
        modeVolArr[m.key].push(volume);
        if (cat === "C1") yearCat1++;
        if (cat === "C2") yearCat2++;
      }
    }
    totalSpills += n; totalVolume += yearVolume; totalCost += yearCost;
    totalUtility += expUtility(yearCost);
    annualCosts.push(yearCost);
    hist[Math.min(n, HIST_MAX)].count++;
    if (n >= 1) cntAtLeastOne++;
    if (n > threshold) cntOverThreshold++;
    if (yearCat1 >= 1) cntCat1Year++;
    if (yearCat1 + yearCat2 >= 1) cntCat2PlusYear++;
    if (yearVolume > 10000) cntVolOver10k++;
    if (yearCost > 10) cntCostOver1M++; // 10 = $1M in $100K units
  }

  function pct(arr, p) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.max(0, Math.ceil(s.length * p) - 1)];
  }

  const modeVolumeStats = Object.fromEntries(modes.map((m) => {
    const arr = modeVolArr[m.key];
    return [m.key, {
      p25: pct(arr,0.25), median: pct(arr,0.50), p75: pct(arr,0.75), p90: pct(arr,0.90),
      mean: arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0,
    }];
  }));

  return {
    mean: totalSpills/runs,
    expectedVolume: totalVolume/runs,
    expectedCost: totalCost/runs,          // $100K units
    expectedUtility: totalUtility/runs,
    pAtLeastOne: cntAtLeastOne/runs,
    pOverThreshold: cntOverThreshold/runs,
    pAtLeastOneCat1: cntCat1Year/runs,
    pAtLeastOneCat2P: cntCat2PlusYear/runs,
    pVolOver10k: cntVolOver10k/runs,
    pCostOver1M: cntCostOver1M/runs,
    p90Cost: pct(annualCosts, 0.90),
    p95Cost: pct(annualCosts, 0.95),
    hist: hist.map((d) => ({ ...d, probability: d.count/runs })),
    catMeans: [
      { category: "Cat 1", key: "C1", count: catTotals.C1/runs },
      { category: "Cat 2", key: "C2", count: catTotals.C2/runs },
      { category: "Cat 3", key: "C3", count: catTotals.C3/runs },
      { category: "Cat 4", key: "C4", count: catTotals.C4/runs },
    ],
    modeVolumeStats,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RISK-AVERSE GREEDY OPTIMIZER
// ─────────────────────────────────────────────────────────────────────────────
const MC_OPT_RUNS = 400;

function expectedUtilityFor(lambda0, alpha, inv, severity, runs) {
  const lambdas = computeLambdas(lambda0, alpha, inv);
  let sumU = 0;
  for (let r = 0; r < runs; r++) {
    const { totalCost } = simulateYear(lambdas, severity);
    sumU += expUtility(totalCost);
  }
  return sumU / runs;
}

function greedyOptimize(lambda0, alpha, costs, budget, severity, step = 0.25) {
  const inv = { I1: 0, I2: 0, I3: 0, I4: 0 };
  let remaining = budget;
  let currentEU = expectedUtilityFor(lambda0, alpha, inv, severity, MC_OPT_RUNS);
  const path = [{ step: 0, eu: currentEU, lambda: sumValues(computeLambdas(lambda0, alpha, inv)), ...inv }];
  let t = 0;
  while (remaining >= step && t < 1000) {
    let bestLever = null, bestEU = -Infinity;
    for (const lever of levers) {
      const cost = costs[lever.key] || 1;
      if (cost * step > remaining) continue;
      const trial = { ...inv, [lever.key]: inv[lever.key] + step };
      const trialEU = expectedUtilityFor(lambda0, alpha, trial, severity, MC_OPT_RUNS);
      if (trialEU > bestEU) { bestEU = trialEU; bestLever = lever.key; }
    }
    if (!bestLever || bestEU <= currentEU) break;
    inv[bestLever] += step;
    remaining -= (costs[bestLever] || 1) * step;
    currentEU = bestEU;
    t++;
    path.push({ step: t, eu: currentEU, lambda: sumValues(computeLambdas(lambda0, alpha, inv)), ...inv });
  }
  return { investment: inv, remaining, path, finalEU: currentEU };
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORICAL ANALYTICS HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function getWindowData(years) {
  return HISTORICAL_DATA.filter(d => years.includes(d.year));
}

function historicalStats(data) {
  const validYears = data.filter(d => d.count >= 0);
  const avgSpills = validYears.length ? validYears.reduce((s,d) => s+d.count, 0) / validYears.length : 0;
  const avgGallons = validYears.length ? validYears.reduce((s,d) => s+d.totalGallons, 0) / validYears.length : 0;
  const modeCounts = { R:0, G:0, D:0, F:0, P:0 };
  validYears.forEach(yr => yr.spills.forEach(sp => { modeCounts[sp.mode] = (modeCounts[sp.mode]||0)+1; }));
  const totalSpills = validYears.reduce((s,d)=>s+d.count,0);
  return { avgSpills, avgGallons, modeCounts, totalSpills, years: validYears.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const CAT_COLORS = { "Cat 1": "#ef4444", "Cat 2": "#f97316", "Cat 3": "#22c55e", "Cat 4": "#38bdf8" };
const MODE_COLORS = { R: "#38bdf8", G: "#facc15", D: "#a78bfa", F: "#f97316", P: "#34d399" };
const MODE_LABELS = { R: "Root Intrusion", G: "Grease/FOG", D: "Debris/Wipes", F: "Pipe Failure", P: "Pump Failure" };

function Kpi({ title, value, subtitle, accent }) {
  return (
    <div style={{ borderRadius:16, border:"1px solid #1e293b", background:"linear-gradient(135deg,#0f172a 60%,#1e293b)", padding:"18px 20px", boxShadow:"0 2px 12px #0008", borderLeft: accent?`3px solid ${accent}`:undefined }}>
      <div style={{ fontSize:11, color:"#94a3b8", letterSpacing:"0.06em", textTransform:"uppercase" }}>{title}</div>
      <div style={{ fontSize:24, fontWeight:800, color:"#f1f5f9", margin:"6px 0 4px", fontFamily:"'DM Mono',monospace" }}>{value}</div>
      <div style={{ fontSize:11, color:"#64748b" }}>{subtitle}</div>
    </div>
  );
}

function Panel({ title, children, style }) {
  return (
    <div style={{ borderRadius:16, border:"1px solid #1e293b", background:"#0f172a", padding:20, boxShadow:"0 2px 12px #0008", ...style }}>
      <h2 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, color:"#e2e8f0" }}>{title}</h2>
      {children}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ borderRadius:16, border:"1px solid #1e293b", background:"#0f172a", padding:20, boxShadow:"0 2px 12px #0008" }}>
      <h2 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700, color:"#e2e8f0" }}>{title}</h2>
      {children}
    </div>
  );
}

function NumberInput({ label, value, onChange, step = 0.1 }) {
  return (
    <label style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, fontSize:13, color:"#cbd5e1" }}>
      <span>{label}</span>
      <input type="number" step={step} value={value} onChange={(e)=>onChange(Number(e.target.value))}
        style={{ width:110, borderRadius:10, border:"1px solid #334155", background:"#020617", padding:"6px 10px", textAlign:"right", color:"#f1f5f9", fontSize:13 }} />
    </label>
  );
}

const TAB_ON  = { borderRadius:10, padding:"7px 16px", fontSize:12, fontWeight:700, background:"#f1f5f9", color:"#0f172a", border:"none", cursor:"pointer" };
const TAB_OFF = { borderRadius:10, padding:"7px 16px", fontSize:12, fontWeight:600, background:"#1e293b", color:"#94a3b8", border:"none", cursor:"pointer" };

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [lambda0,    setLambda0]    = useState(defaultLambda0);
  const [alpha,      setAlpha]      = useState(defaultAlpha);
  const [costs,      setCosts]      = useState(defaultCost);
  const [severity,   setSeverity]   = useState(defaultSeverity);
  const [investment, setInvestment] = useState({ I1:1.5, I2:1.0, I3:1.0, I4:1.5 });
  const [runs,       setRuns]       = useState(5000);
  const [budget,     setBudget]     = useState(5.5);
  const [thresholdN, setThresholdN] = useState(5);
  const [tab,        setTab]        = useState("dashboard");
  const [histView,   setHistView]   = useState("all");   // all | 10yr | 5yr
  const [rerun,      setRerun]      = useState(0);

  const threshold      = Math.max(0, Math.round(thresholdN));
  const baselineLambda = useMemo(() => sumValues(lambda0), [lambda0]);
  const scenarioLambdas = useMemo(() => computeLambdas(lambda0, alpha, investment), [lambda0, alpha, investment]);
  const scenarioLambda  = useMemo(() => sumValues(scenarioLambdas), [scenarioLambdas]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mc = useMemo(() => monteCarlo(scenarioLambdas, severity, Math.max(100, runs), threshold),
    [scenarioLambdas, severity, runs, threshold, rerun]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const optimized = useMemo(() => greedyOptimize(lambda0, alpha, costs, budget, severity),
    [lambda0, alpha, costs, budget, severity, rerun]);

  const optLambdas = useMemo(() => computeLambdas(lambda0, alpha, optimized.investment), [lambda0, alpha, optimized.investment]);
  const optLambda  = sumValues(optLambdas);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mcBaseline = useMemo(() => monteCarlo(computeLambdas(lambda0, alpha, {I1:0,I2:0,I3:0,I4:0}), severity, Math.max(100,runs), threshold),
    [lambda0, alpha, severity, runs, threshold, rerun]);

  const pSpillScenario = 1 - Math.exp(-scenarioLambda);
  const pSpillBase     = 1 - Math.exp(-baselineLambda);
  const pGTn_exact     = 1 - poissonCdf(threshold, scenarioLambda);

  // Historical window
  const histYears = useMemo(() => {
    if (histView === "5yr")  return Array.from({length:5},  (_,i) => CURRENT_YEAR - i).filter(y => y >= 2000);
    if (histView === "10yr") return Array.from({length:10}, (_,i) => CURRENT_YEAR - i).filter(y => y >= 2000);
    return HISTORICAL_DATA.map(d => d.year);
  }, [histView]);

  const histData    = useMemo(() => getWindowData(histYears), [histYears]);
  const histSummary = useMemo(() => historicalStats(histData), [histData]);

  // Chart data
  const modeChart = modes.map((m) => ({
    mode: m.key, name: m.label,
    baseline: +lambda0[m.key].toFixed(3),
    scenario: +scenarioLambdas[m.key].toFixed(3),
    optimized: +optLambdas[m.key].toFixed(3),
  }));
  const investChart = levers.map((l) => ({
    lever: l.short, scenario: investment[l.key], optimized: optimized.investment[l.key],
  }));

  // Historical trend chart
  const histTrendChart = histData.map(d => ({
    year: d.year, count: d.count,
    gallons: Math.round(d.totalGallons),
    lambda: +scenarioLambda.toFixed(2),
  }));

  // Mode breakdown from historical
  const histModeChart = modes.map(m => ({
    mode: m.key,
    label: m.label,
    count: histSummary.modeCounts[m.key] || 0,
  }));

  const tabs = ["dashboard","historical","cost","volume","severity","inputs","optimizer","model"];

  return (
    <div style={{ minHeight:"100vh", background:"#020617", padding:"20px 16px", color:"#e2e8f0", fontFamily:"'IBM Plex Sans',system-ui,sans-serif" }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", flexWrap:"wrap", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
            <div>
              <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:"#f8fafc", letterSpacing:"-0.02em", lineHeight:1.2 }}>
                CAWD Sewer Spill O&M Risk Dashboard
              </h1>
              <p style={{ margin:"4px 0 0", fontSize:12, color:"#64748b", maxWidth:600 }}>
                Monte Carlo PRA + investment simulator · SAM model · risk-averse: max E[U(−C)] · Historical data 2000–2026
              </p>
              <span style={{ display:"inline-block", marginTop:5, borderRadius:20, background:"#1e3a5f", padding:"2px 10px", fontSize:10, fontWeight:700, color:"#7dd3fc", letterSpacing:"0.06em" }}>
                Stanford MS&E 250B · Spring 2026 · Annabelle Jayadinata· Khang Do · Ramesh Manian· Maura Osorio
              </span>
            </div>
            <button onClick={() => setRerun(x=>x+1)}
              style={{ borderRadius:12, background:"#f1f5f9", padding:"9px 18px", fontWeight:700, fontSize:12, color:"#0f172a", border:"none", cursor:"pointer", whiteSpace:"nowrap" }}>
              ↺ Re-run Monte Carlo
            </button>
          </div>

          {/* Risk aversion badge */}
          <div style={{ marginTop:12, background:"#0f172a", borderRadius:12, border:"1px solid #1e293b", padding:"10px 16px", display:"flex", flexWrap:"wrap", gap:20, alignItems:"center" }}>
            <div>
              <div style={{ fontSize:10, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.06em" }}>Risk Aversion γ</div>
              <div style={{ fontSize:18, fontWeight:800, color:"#a78bfa", fontFamily:"'DM Mono',monospace" }}>0.091</div>
            </div>
            <div>
              <div style={{ fontSize:10, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.06em" }}>Risk Tolerance ρ = 1/γ</div>
              <div style={{ fontSize:18, fontWeight:800, color:"#facc15", fontFamily:"'DM Mono',monospace" }}>{RHO.toFixed(4)} ($100K) ≈ ${(RHO/10).toFixed(2)}M</div>
            </div>
            <div style={{ fontSize:11, color:"#475569" }}>U(−C) = −e<sup>C/ρ</sup> · board-elicited · fixed across all scenarios</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:18 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={tab===t ? TAB_ON : TAB_OFF}>
              {t[0].toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* ══ DASHBOARD ══════════════════════════════════════════════════════ */}
        {tab === "dashboard" && (
          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))", gap:12 }}>
              <Kpi title="Expected annual spills" value={fmt(scenarioLambda)} subtitle={`Baseline: ${fmt(baselineLambda)}`} accent="#38bdf8" />
              <Kpi title="Expected annual cost" value={fmtDollars(mc.expectedCost)} subtitle={`Baseline: ${fmtDollars(mcBaseline.expectedCost)}`} accent="#f97316" />
              <Kpi title="P(≥1 spill)" value={`${fmt(100*pSpillScenario,1)}%`} subtitle={`Baseline: ${fmt(100*pSpillBase,1)}%`} accent="#22c55e" />
              <Kpi title={`P(N>${threshold}) exact`} value={`${fmt(100*pGTn_exact,1)}%`} subtitle={`MC: ${fmt(100*mc.pOverThreshold,1)}%`} accent="#a78bfa" />
              <Kpi title="Expected utility E[U]" value={fmt(mc.expectedUtility,4)} subtitle={`γ=0.091, ρ≈${RHO.toFixed(2)}`} accent="#facc15" />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
              <ChartCard title="Failure Mode λ: Baseline vs Scenario">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={modeChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="mode" stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} />
                    <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} />
                    <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}} />
                    <Legend wrapperStyle={{fontSize:12}} />
                    <Bar dataKey="baseline" name="Baseline λ" fill="#475569" radius={[4,4,0,0]} />
                    <Bar dataKey="scenario" name="Scenario λ" fill="#38bdf8" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="MC Distribution of Annual Spill Count">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={mc.hist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="spills" stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} />
                    <YAxis tickFormatter={v=>`${(v*100).toFixed(0)}%`} stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} />
                    <Tooltip formatter={v=>`${fmt(100*v,2)}%`} contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}} />
                    <Bar dataKey="probability" name="Probability" fill="#22c55e" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
              <ChartCard title="Expected Annual Spills by Category">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={mc.catMeans}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="category" stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} />
                    <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} />
                    <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}} />
                    <Bar dataKey="count" name="Spills/yr" radius={[4,4,0,0]}>
                      {mc.catMeans.map(e=><Cell key={e.category} fill={CAT_COLORS[e.category]||"#94a3b8"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p style={{margin:"8px 0 0",fontSize:11,color:"#475569"}}>Cat 1: surface water · Cat 2: no SW &gt;1000 gal · Cat 3: 50–1000 gal · Cat 4: &lt;50 gal</p>
              </ChartCard>

              <Panel title="Investment Scenario Sliders">
                <div style={{marginBottom:10}}>
                  <NumberInput label={`Threshold n for P(N>n)`} value={thresholdN} step={1} onChange={v=>setThresholdN(Math.max(0,Math.round(v)))} />
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {levers.map(l => (
                    <div key={l.key}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#94a3b8",marginBottom:3}}>
                        <span>{l.label}</span>
                        <span style={{fontFamily:"'DM Mono',monospace",color:"#f1f5f9"}}>{fmt(investment[l.key])}</span>
                      </div>
                      <input type="range" min="0" max="10" step="0.25" value={investment[l.key]}
                        onChange={e=>setInvestment({...investment,[l.key]:Number(e.target.value)})}
                        style={{width:"100%",accentColor:"#38bdf8"}} />
                    </div>
                  ))}
                </div>
                <p style={{margin:"8px 0 0",fontSize:11,color:"#475569"}}>1 unit ≈ $100K O&M effort.</p>
              </Panel>
            </div>
          </div>
        )}

        {/* ══ HISTORICAL TAB ═════════════════════════════════════════════════ */}
        {tab === "historical" && (
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            {/* Window selector */}
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:13,color:"#94a3b8",marginRight:4}}>View window:</span>
              {[["all","All years (2000–2026)"],["10yr","Last 10 years"],["5yr","Last 5 years (Board view)"]].map(([k,label])=>(
                <button key={k} onClick={()=>setHistView(k)}
                  style={histView===k ? {...TAB_ON,fontSize:12} : {...TAB_OFF,fontSize:12}}>
                  {label}
                </button>
              ))}
            </div>

            {/* Summary KPIs */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:12}}>
              <Kpi title="Avg spills/year" value={fmt(histSummary.avgSpills,1)} subtitle={`Over ${histSummary.years} years`} accent="#38bdf8" />
              <Kpi title="Total spills" value={histSummary.totalSpills} subtitle={`${histYears[0]}–${histYears[histYears.length-1]}`} accent="#f97316" />
              <Kpi title="Avg volume/year" value={`${fmt(histSummary.avgGallons/1000,1)}k gal`} subtitle="Mean annual gallons spilled" accent="#facc15" />
              <Kpi title="Model λ (scenario)" value={fmt(scenarioLambda,2)} subtitle="Expected spills/yr from PRA" accent="#22c55e" />
              <Kpi title="Model vs observed" value={`${fmt(100*(scenarioLambda-histSummary.avgSpills)/Math.max(0.01,histSummary.avgSpills),1)}%`} subtitle="Model over/under vs history" accent="#a78bfa" />
            </div>

            {/* Trend chart */}
            <ChartCard title={`Annual Spill Count — ${histView==="5yr"?"Last 5 Years":histView==="10yr"?"Last 10 Years":"Full History (2000–2026)"}`}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={histTrendChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="year" stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}} />
                  <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} />
                  <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}} />
                  <Legend wrapperStyle={{fontSize:12}} />
                  <Bar dataKey="count" name="Observed spills" fill="#38bdf8" radius={[3,3,0,0]} />
                  <ReferenceLine y={histSummary.avgSpills} stroke="#facc15" strokeDasharray="4 4" label={{value:`Avg ${fmt(histSummary.avgSpills,1)}`,fill:"#facc15",fontSize:11}} />
                  <ReferenceLine y={scenarioLambda} stroke="#22c55e" strokeDasharray="4 4" label={{value:`Model λ ${fmt(scenarioLambda,1)}`,fill:"#22c55e",fontSize:11}} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
              {/* Volume trend */}
              <ChartCard title="Annual Gallons Spilled">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={histTrendChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="year" stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}} />
                    <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} />
                    <Tooltip formatter={v=>`${fmt(v,0)} gal`} contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}} />
                    <Bar dataKey="gallons" name="Gallons spilled" fill="#f97316" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p style={{margin:"6px 0 0",fontSize:11,color:"#475569"}}>Note: 2017 spike = 145k gal Hatton Canyon pipe damage. 2023 spike = multiple pipe failures.</p>
              </ChartCard>

              {/* Mode breakdown */}
              <ChartCard title={`Spill Count by Failure Mode (${histView==="5yr"?"5yr":histView==="10yr"?"10yr":"All"})`}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={histModeChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="mode" stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} />
                    <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} />
                    <Tooltip formatter={(v,_,p)=>[v, MODE_LABELS[p.payload.mode]||p.name]} contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}} />
                    <Bar dataKey="count" name="Spills" radius={[4,4,0,0]}>
                      {histModeChart.map(e=><Cell key={e.mode} fill={MODE_COLORS[e.mode]||"#94a3b8"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Raw table */}
            <Panel title="Year-by-Year Spill Record">
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid #1e293b"}}>
                      {["Year","Spills","Total Gallons","Root","Grease","Debris","Pipe Fail","Pump"].map(h=>(
                        <th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#64748b",fontWeight:600,fontSize:11}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {histData.map(d=>{
                      const mc_ = {R:0,G:0,D:0,F:0,P:0};
                      d.spills.forEach(s=>{ mc_[s.mode]=(mc_[s.mode]||0)+1; });
                      const isRecent = d.year >= CURRENT_YEAR - 4;
                      return (
                        <tr key={d.year} style={{borderBottom:"1px solid #0f172a",background:isRecent?"#0f1f3d":undefined}}>
                          <td style={{padding:"5px 10px",fontWeight:700,color:isRecent?"#7dd3fc":"#e2e8f0"}}>{d.year}{isRecent?" ★":""}</td>
                          <td style={{padding:"5px 10px",fontFamily:"'DM Mono',monospace"}}>{d.count}</td>
                          <td style={{padding:"5px 10px",fontFamily:"'DM Mono',monospace"}}>{d.totalGallons.toLocaleString()}</td>
                          {["R","G","D","F","P"].map(m=>(
                            <td key={m} style={{padding:"5px 10px",fontFamily:"'DM Mono',monospace",color:mc_[m]>0?MODE_COLORS[m]:"#475569"}}>{mc_[m]||"—"}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{margin:"10px 0 0",fontSize:11,color:"#475569"}}>★ = last 5 years (Board view window). 2020 = zero spills recorded.</p>
            </Panel>
          </div>
        )}

        {/* ══ COST TAB ═══════════════════════════════════════════════════════ */}
        {tab === "cost" && (
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:12}}>
              <Kpi title="Expected annual cost" value={fmtDollars(mc.expectedCost)} subtitle={`Baseline: ${fmtDollars(mcBaseline.expectedCost)}`} accent="#f97316" />
              <Kpi title="P90 annual cost" value={fmtDollars(mc.p90Cost)} subtitle="90th percentile year" accent="#ef4444" />
              <Kpi title="P95 annual cost" value={fmtDollars(mc.p95Cost)} subtitle="95th percentile year" accent="#ef4444" />
              <Kpi title="P(cost > $1M)" value={`${fmt(100*mc.pCostOver1M,1)}%`} subtitle={`Baseline: ${fmt(100*mcBaseline.pCostOver1M,1)}%`} accent="#a78bfa" />
              <Kpi title="Expected utility E[U]" value={fmt(mc.expectedUtility,4)} subtitle={`γ=0.091, ρ≈${RHO.toFixed(2)}`} accent="#facc15" />
            </div>

            <Panel title="CAWD Cost Model Reference (slide 10)">
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",fontSize:13,borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid #1e293b"}}>
                      {["Cost Class","Condition","Fixed O&M","Per-gallon fine"].map(h=>(
                        <th key={h} style={{padding:"7px 10px",textAlign:"left",color:"#64748b",fontWeight:600,fontSize:12}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Cat 1","≥200 gal, reaches surface water","$100,000","$10/gal"],
                      ["Cat 1","<200 gal, reaches surface water","$50,000","$10/gal"],
                      ["Cat 2",">1,000 gal, no surface water","$100,000","$5/gal"],
                      ["Cat 3","50–1,000 gal, no surface water","$50,000","$3/gal"],
                      ["Cat 4","<50 gal, no surface water","$10,000","$0"],
                    ].map(([cat,cond,fixed,fine])=>(
                      <tr key={cat+cond} style={{borderBottom:"1px solid #0f172a"}}>
                        <td style={{padding:"7px 10px",fontWeight:700,color:CAT_COLORS[cat]||"#94a3b8"}}>{cat}</td>
                        <td style={{padding:"7px 10px",color:"#cbd5e1"}}>{cond}</td>
                        <td style={{padding:"7px 10px",fontFamily:"'DM Mono',monospace"}}>{fixed}</td>
                        <td style={{padding:"7px 10px",fontFamily:"'DM Mono',monospace"}}>{fine}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Utility Function & Risk Aversion">
              <p style={{margin:"0 0 12px",fontSize:13,color:"#94a3b8",lineHeight:1.7}}>
                U(−C) = −e<sup>C/ρ</sup> · γ = 0.091 (board-elicited) · ρ = 1/γ ≈ {RHO.toFixed(4)} ($100K) ≈ ${(RHO/10).toFixed(2)}M<br />
                The optimizer maximizes E[U] across all investment allocations. Parameters are fixed — not a user lever.
              </p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Kpi title="Scenario E[U]"  value={fmt(mc.expectedUtility,4)}         subtitle="Current investment scenario" accent="#facc15" />
                <Kpi title="Baseline E[U]"  value={fmt(mcBaseline.expectedUtility,4)} subtitle="Zero investment baseline"    accent="#475569" />
              </div>
            </Panel>
          </div>
        )}

        {/* ══ VOLUME TAB ═════════════════════════════════════════════════════ */}
        {tab === "volume" && (
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:12}}>
              <Kpi title="Expected annual volume" value={`${fmt(mc.expectedVolume,0)} gal`} subtitle="MC mean" accent="#facc15" />
              <Kpi title="P(vol>10k gal/yr)" value={`${fmt(100*mc.pVolOver10k,1)}%`} subtitle="MC estimate" accent="#f97316" />
              <Kpi title="P(≥1 Cat 1/yr)" value={`${fmt(100*mc.pAtLeastOneCat1,1)}%`} subtitle="Surface water impact" accent="#ef4444" />
              <Kpi title="P(≥1 Cat 1 or 2/yr)" value={`${fmt(100*mc.pAtLeastOneCat2P,1)}%`} subtitle="Higher-severity year" accent="#f97316" />
            </div>

            <ChartCard title="Volume Percentiles by Failure Mode (per-spill, MC)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={modes.map(m=>({mode:m.key, p25:Math.round(mc.modeVolumeStats[m.key].p25), median:Math.round(mc.modeVolumeStats[m.key].median), p75:Math.round(mc.modeVolumeStats[m.key].p75), p90:Math.round(mc.modeVolumeStats[m.key].p90)}))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="mode" stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} />
                  <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} label={{value:"Gallons",angle:-90,position:"insideLeft",fill:"#64748b",fontSize:11}} />
                  <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}} />
                  <Legend wrapperStyle={{fontSize:12}} />
                  <Bar dataKey="p25" name="P25" fill="#1e3a5f" radius={[3,3,0,0]} />
                  <Bar dataKey="median" name="Median" fill="#38bdf8" radius={[3,3,0,0]} />
                  <Bar dataKey="p75" name="P75" fill="#f97316" radius={[3,3,0,0]} />
                  <Bar dataKey="p90" name="P90" fill="#ef4444" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* ══ SEVERITY TAB ═══════════════════════════════════════════════════ */}
        {tab === "severity" && (
          <Panel title="Severity & Volume Model Parameters">
            <p style={{margin:"0 0 12px",fontSize:13,color:"#64748b"}}>
              Volume ~ Lognormal(log(medianVolume), sigma). Surface water ~ Bernoulli(pSurface). pSurface should be calibrated with GIS data.
            </p>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",fontSize:13,borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{borderBottom:"1px solid #1e293b"}}>
                    {["Failure Mode","Median Volume (gal)","Lognormal σ","P(Surface Water)"].map(h=>(
                      <th key={h} style={{padding:"7px 10px",textAlign:"left",color:"#64748b",fontWeight:600,fontSize:12}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modes.map(m=>(
                    <tr key={m.key} style={{borderBottom:"1px solid #0f172a"}}>
                      <td style={{padding:"7px 10px",fontWeight:600,color:MODE_COLORS[m.key]}}>{m.label}</td>
                      {[["medianVolume",10,1],["sigma",0.05,0.05],["pSurface",0.01,0]].map(([field,step,min])=>(
                        <td key={field} style={{padding:"7px 10px"}}>
                          <input type="number" step={step} value={severity[m.key][field]}
                            onChange={e=>setSeverity({...severity,[m.key]:{...severity[m.key],[field]:Math.max(min,Number(e.target.value))}})}
                            style={{width:100,borderRadius:8,border:"1px solid #334155",background:"#020617",padding:"5px 8px",color:"#f1f5f9",fontSize:13,textAlign:"right"}} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* ══ INPUTS TAB ═════════════════════════════════════════════════════ */}
        {tab === "inputs" && (
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
              <Panel title="Baseline Annual Failure Rates λ₀">
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {modes.map(m=>(
                    <NumberInput key={m.key} label={`${m.label} (${m.key})`} value={lambda0[m.key]}
                      onChange={v=>setLambda0({...lambda0,[m.key]:Math.max(0,v)})} />
                  ))}
                </div>
              </Panel>
              <Panel title="Simulation & Cost Settings">
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  <NumberInput label="Monte Carlo runs" value={runs} step={1000} onChange={v=>setRuns(Math.max(100,Math.round(v)))} />
                  <NumberInput label="Budget ($100K units)" value={budget} onChange={v=>setBudget(Math.max(0,v))} />
                </div>
                <h3 style={{margin:"18px 0 8px",fontSize:14,fontWeight:700,color:"#e2e8f0"}}>Cost per investment unit (ci)</h3>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {levers.map(l=>(
                    <NumberInput key={l.key} label={l.label} value={costs[l.key]} onChange={v=>setCosts({...costs,[l.key]:Math.max(0.01,v)})} />
                  ))}
                </div>
              </Panel>
            </div>
            <Panel title="Effectiveness Matrix αki">
              <p style={{margin:"0 0 10px",fontSize:12,color:"#64748b"}}>λk(I) = λk0·exp(−Σi αki·Ii). P/I1=0 is intentional.</p>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",fontSize:13,borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid #1e293b"}}>
                      <th style={{padding:"7px 10px",textAlign:"left",color:"#64748b",fontSize:12}}>Mode</th>
                      {levers.map(l=><th key={l.key} style={{padding:"7px 10px",textAlign:"left",color:"#64748b",fontSize:12}}>{l.short}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {modes.map(m=>(
                      <tr key={m.key} style={{borderBottom:"1px solid #0f172a"}}>
                        <td style={{padding:"7px 10px",fontWeight:600,color:MODE_COLORS[m.key]}}>{m.label}</td>
                        {levers.map(l=>(
                          <td key={l.key} style={{padding:"7px 10px"}}>
                            <input type="number" step="0.001" value={alpha[m.key][l.key]}
                              onChange={e=>setAlpha({...alpha,[m.key]:{...alpha[m.key],[l.key]:Number(e.target.value)}})}
                              style={{width:90,borderRadius:8,border:"1px solid #334155",background:"#020617",padding:"5px 8px",color:"#f1f5f9",fontSize:13,textAlign:"right"}} />
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

        {/* ══ OPTIMIZER TAB ══════════════════════════════════════════════════ */}
        {tab === "optimizer" && (
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            <p style={{margin:0,fontSize:13,color:"#64748b"}}>
              Greedy risk-averse optimizer: maximizes E[U(−C)] = E[−e<sup>C/ρ</sup>]. Fixed γ=0.091, ρ≈{RHO.toFixed(2)} ($100K).
            </p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:12}}>
              <Kpi title="Optimized E[spills]" value={fmt(optLambda)} subtitle={`Baseline: ${fmt(baselineLambda)}`} accent="#22c55e" />
              <Kpi title="Spill reduction" value={`${fmt(100*(baselineLambda-optLambda)/baselineLambda,1)}%`} subtitle={`${fmt(baselineLambda-optLambda)} fewer/yr`} accent="#38bdf8" />
              <Kpi title="Optimized E[U]" value={fmt(optimized.finalEU,4)} subtitle={`γ=0.091`} accent="#facc15" />
              <Kpi title="Unallocated budget" value={`$${fmt(optimized.remaining*100,0)}K`} subtitle="After greedy allocation" accent="#f97316" />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
              <ChartCard title="Manual vs Optimized Allocation">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={investChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="lever" stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} />
                    <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} />
                    <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}} />
                    <Legend wrapperStyle={{fontSize:12}} />
                    <Bar dataKey="scenario"  name="Manual"    fill="#38bdf8" radius={[4,4,0,0]} />
                    <Bar dataKey="optimized" name="Optimized" fill="#f97316" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="E[U] as Budget is Allocated">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={optimized.path}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="step" stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} />
                    <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:12}} />
                    <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}} />
                    <Line type="monotone" dataKey="eu" name="E[U]" stroke="#facc15" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        )}

        {/* ══ MODEL TAB ══════════════════════════════════════════════════════ */}
        {tab === "model" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
            <Panel title="PRA & Investment Equations">
              <div style={{display:"flex",flexDirection:"column",gap:10,fontSize:13,color:"#cbd5e1",lineHeight:1.8}}>
                <p style={{margin:0}}><strong>Failure count:</strong> N<sub>k</sub> ~ Poisson(λ<sub>k</sub>)</p>
                <p style={{margin:0}}><strong>Total spills:</strong> N = Σ<sub>k</sub> N<sub>k</sub></p>
                <p style={{margin:0}}><strong>Investment effect:</strong> λ<sub>k</sub>(I) = λ<sub>k0</sub>·exp(−Σ<sub>i</sub> α<sub>ki</sub>I<sub>i</sub>)</p>
                <p style={{margin:0}}><strong>Volume:</strong> V|k ~ Lognormal(log(μ<sub>k</sub>), σ<sub>k</sub>)</p>
                <p style={{margin:0}}><strong>Surface water:</strong> R|k ~ Bernoulli(p<sub>surface,k</sub>)</p>
                <p style={{margin:0}}><strong>Spill cost:</strong> CAWD table → C (in $100K units)</p>
                <p style={{margin:0}}><strong>Utility:</strong> U(−C)=−e<sup>C/ρ</sup> · γ=0.091, ρ=1/γ≈{RHO.toFixed(4)}</p>
                <p style={{margin:0,color:"#22c55e"}}><strong>Objective:</strong> max<sub>I</sub> E[U(−C(I,ω))] s.t. Σ<sub>i</sub>c<sub>i</sub>I<sub>i</sub>≤B, I<sub>i</sub>≥0</p>
                <p style={{margin:0}}><strong>P(N&gt;n):</strong> 1−Σ<sub>k=0</sub><sup>n</sup>e<sup>−λ</sup>λ<sup>k</sup>/k!</p>
              </div>
            </Panel>
            <Panel title="SAM Structure">
              <div style={{display:"flex",flexDirection:"column",gap:14,fontSize:13,color:"#cbd5e1"}}>
                <div><h3 style={{margin:"0 0 4px",fontSize:13,fontWeight:700,color:"#94a3b8"}}>Management → Actions</h3>
                  <p style={{margin:0}}>M1→A1 · M2→A1,A2,A3 · M3→A3,A4 · M4→A2</p></div>
                <div><h3 style={{margin:"0 0 4px",fontSize:13,fontWeight:700,color:"#94a3b8"}}>Actions → Failure Modes</h3>
                  <p style={{margin:0}}>A1→B,F · A2→B,F,H · A3→O,P · A4→O</p></div>
                <div><h3 style={{margin:"0 0 4px",fontSize:13,fontWeight:700,color:"#94a3b8"}}>Investment Levers</h3>
                  {levers.map(l=><p key={l.key} style={{margin:"2px 0"}}><strong>{l.key}:</strong> {l.label}</p>)}</div>
                <div style={{fontSize:11,color:"#64748b"}}>P/I1=0: PM has no effect on pump-station mechanical faults. I2 & I3 are the key levers for pump failures.</div>
              </div>
            </Panel>
          </div>
        )}

      </div>
    </div>
  );
}
