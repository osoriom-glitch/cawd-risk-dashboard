import React, { useMemo, useState, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell, ReferenceLine,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// HISTORICAL DATA — parsed from CAWD Spill Tracking xlsx 2000–2026
// mode keys: B=Blockage, F=Pipe Failure, P=Pump Failure, H=Hydraulic Overload, O=Operational
// ─────────────────────────────────────────────────────────────────────────────
const HISTORICAL_DATA = [
  {"year":2000,"count":11,"totalGallons":2175,"spills":[{"gallons":75,"mode":"B"},{"gallons":800,"mode":"U"},{"gallons":100,"mode":"B"},{"gallons":100,"mode":"U"},{"gallons":50,"mode":"U"},{"gallons":20,"mode":"U"},{"gallons":50,"mode":"B"},{"gallons":500,"mode":"B"},{"gallons":30,"mode":"B"},{"gallons":150,"mode":"B"},{"gallons":300,"mode":"B"}]},
  {"year":2001,"count":16,"totalGallons":5760,"spills":[{"gallons":10,"mode":"B"},{"gallons":800,"mode":"B"},{"gallons":400,"mode":"U"},{"gallons":50,"mode":"U"},{"gallons":300,"mode":"U"},{"gallons":450,"mode":"B"},{"gallons":300,"mode":"U"},{"gallons":650,"mode":"U"},{"gallons":500,"mode":"U"},{"gallons":200,"mode":"B"},{"gallons":100,"mode":"U"},{"gallons":300,"mode":"B"},{"gallons":200,"mode":"B"},{"gallons":500,"mode":"U"},{"gallons":500,"mode":"U"},{"gallons":500,"mode":"B"}]},
  {"year":2002,"count":16,"totalGallons":3180,"spills":[{"gallons":100,"mode":"B"},{"gallons":250,"mode":"B"},{"gallons":50,"mode":"B"},{"gallons":100,"mode":"B"},{"gallons":500,"mode":"B"},{"gallons":30,"mode":"B"},{"gallons":40,"mode":"B"},{"gallons":50,"mode":"B"},{"gallons":60,"mode":"B"},{"gallons":1000,"mode":"B"},{"gallons":70,"mode":"B"},{"gallons":50,"mode":"B"},{"gallons":80,"mode":"B"},{"gallons":450,"mode":"B"},{"gallons":100,"mode":"B"},{"gallons":250,"mode":"F"}]},
  {"year":2003,"count":14,"totalGallons":3445,"spills":[{"gallons":40,"mode":"B"},{"gallons":100,"mode":"B"},{"gallons":1000,"mode":"B"},{"gallons":50,"mode":"B"},{"gallons":75,"mode":"B"},{"gallons":40,"mode":"B"},{"gallons":40,"mode":"B"},{"gallons":500,"mode":"B"},{"gallons":60,"mode":"B"},{"gallons":400,"mode":"B"},{"gallons":150,"mode":"P"},{"gallons":540,"mode":"B"},{"gallons":300,"mode":"B"},{"gallons":150,"mode":"B"}]},
  {"year":2004,"count":10,"totalGallons":2815,"spills":[{"gallons":500,"mode":"B"},{"gallons":900,"mode":"B"},{"gallons":80,"mode":"B"},{"gallons":60,"mode":"B"},{"gallons":100,"mode":"B"},{"gallons":25,"mode":"B"},{"gallons":150,"mode":"B"},{"gallons":350,"mode":"B"},{"gallons":50,"mode":"B"},{"gallons":600,"mode":"B"}]},
  {"year":2005,"count":5,"totalGallons":825,"spills":[{"gallons":300,"mode":"B"},{"gallons":225,"mode":"B"},{"gallons":180,"mode":"B"},{"gallons":20,"mode":"B"},{"gallons":100,"mode":"B"}]},
  {"year":2006,"count":2,"totalGallons":200,"spills":[{"gallons":150,"mode":"B"},{"gallons":50,"mode":"B"}]},
  {"year":2007,"count":5,"totalGallons":1480,"spills":[{"gallons":400,"mode":"B"},{"gallons":600,"mode":"B"},{"gallons":200,"mode":"B"},{"gallons":250,"mode":"B"},{"gallons":30,"mode":"B"}]},
  {"year":2008,"count":6,"totalGallons":1380,"spills":[{"gallons":135,"mode":"B"},{"gallons":85,"mode":"B"},{"gallons":35,"mode":"B"},{"gallons":400,"mode":"B"},{"gallons":325,"mode":"B"},{"gallons":400,"mode":"F"}]},
  {"year":2009,"count":8,"totalGallons":1835,"spills":[{"gallons":250,"mode":"B"},{"gallons":60,"mode":"B"},{"gallons":150,"mode":"B"},{"gallons":65,"mode":"B"},{"gallons":150,"mode":"B"},{"gallons":200,"mode":"B"},{"gallons":500,"mode":"B"},{"gallons":460,"mode":"B"}]},
  {"year":2010,"count":4,"totalGallons":400,"spills":[{"gallons":50,"mode":"B"},{"gallons":150,"mode":"B"},{"gallons":50,"mode":"F"},{"gallons":150,"mode":"F"}]},
  {"year":2011,"count":8,"totalGallons":2450,"spills":[{"gallons":50,"mode":"B"},{"gallons":55,"mode":"B"},{"gallons":80,"mode":"B"},{"gallons":650,"mode":"B"},{"gallons":200,"mode":"B"},{"gallons":30,"mode":"B"},{"gallons":560,"mode":"B"},{"gallons":825,"mode":"B"}]},
  {"year":2012,"count":8,"totalGallons":5880,"spills":[{"gallons":40,"mode":"B"},{"gallons":40,"mode":"B"},{"gallons":2400,"mode":"B"},{"gallons":900,"mode":"B"},{"gallons":900,"mode":"B"},{"gallons":500,"mode":"B"},{"gallons":850,"mode":"B"},{"gallons":250,"mode":"B"}]},
  {"year":2013,"count":5,"totalGallons":3765,"spills":[{"gallons":700,"mode":"B"},{"gallons":50,"mode":"B"},{"gallons":40,"mode":"B"},{"gallons":2800,"mode":"B"},{"gallons":175,"mode":"B"}]},
  {"year":2014,"count":7,"totalGallons":6488,"spills":[{"gallons":30,"mode":"B"},{"gallons":85,"mode":"B"},{"gallons":257,"mode":"B"},{"gallons":522,"mode":"B"},{"gallons":258,"mode":"B"},{"gallons":4500,"mode":"B"},{"gallons":836,"mode":"B"}]},
  {"year":2015,"count":4,"totalGallons":14471,"spills":[{"gallons":1557,"mode":"B"},{"gallons":40,"mode":"B"},{"gallons":10474,"mode":"B"},{"gallons":2400,"mode":"B"}]},
  {"year":2016,"count":5,"totalGallons":1600,"spills":[{"gallons":212,"mode":"B"},{"gallons":688,"mode":"B"},{"gallons":10,"mode":"B"},{"gallons":630,"mode":"B"},{"gallons":60,"mode":"B"}]},
  {"year":2017,"count":4,"totalGallons":147447,"spills":[{"gallons":1650,"mode":"B"},{"gallons":145000,"mode":"F"},{"gallons":17,"mode":"F"},{"gallons":780,"mode":"B"}]},
  {"year":2018,"count":2,"totalGallons":708,"spills":[{"gallons":380,"mode":"B"},{"gallons":328,"mode":"B"}]},
  {"year":2019,"count":1,"totalGallons":2008,"spills":[{"gallons":2008,"mode":"F"}]},
  {"year":2020,"count":0,"totalGallons":0,"spills":[]},
  {"year":2021,"count":4,"totalGallons":2849,"spills":[{"gallons":476,"mode":"B"},{"gallons":802,"mode":"B"},{"gallons":454,"mode":"B"},{"gallons":1117,"mode":"B"}]},
  {"year":2022,"count":6,"totalGallons":7891,"spills":[{"gallons":90,"mode":"B"},{"gallons":20,"mode":"B"},{"gallons":1896,"mode":"B"},{"gallons":5625,"mode":"B"},{"gallons":129,"mode":"B"},{"gallons":131,"mode":"B"}]},
  {"year":2023,"count":9,"totalGallons":100348,"spills":[{"gallons":5419,"mode":"B"},{"gallons":506,"mode":"B"},{"gallons":108,"mode":"B"},{"gallons":1301,"mode":"B"},{"gallons":361,"mode":"F"},{"gallons":48269,"mode":"F"},{"gallons":222,"mode":"B"},{"gallons":44159,"mode":"F"},{"gallons":3,"mode":"F"}]},
  {"year":2024,"count":2,"totalGallons":24458,"spills":[{"gallons":1777,"mode":"F"},{"gallons":22681,"mode":"F"}]},
  {"year":2025,"count":2,"totalGallons":9176,"spills":[{"gallons":9156,"mode":"F"},{"gallons":20,"mode":"B"}]},
  {"year":2026,"count":1,"totalGallons":9429,"spills":[{"gallons":9429,"mode":"F"}]}
];

const CURRENT_YEAR = 2026;
const SYSTEM_MILES = 77.57;

// ─────────────────────────────────────────────────────────────────────────────
// FAILURE MODES — exactly matching Formulas_ failure_modes list
// ─────────────────────────────────────────────────────────────────────────────
const modes = [
  { key: "B", label: "Blockage" },
  { key: "F", label: "Pipe Failure" },
  { key: "P", label: "Pump Failure" },
  { key: "H", label: "Hydraulic Overload" },
  { key: "O", label: "Operational Failure" },
];

const levers = [
  { key: "I1", label: "Preventive Maintenance", short: "Maint." },
  { key: "I2", label: "Workforce Capacity",     short: "Workforce" },
  { key: "I3", label: "Execution Quality",      short: "Execution" },
  { key: "I4", label: "Risk-Based Targeting",   short: "Targeting" },
];

// λ₀ from Formulas_: lambda0 dict (failures per 100 miles/year, from slides)
const DEFAULT_LAMBDA0 = { B:6.483, F:0.884, P:0.049, H:0.200, O:0.100 };

// α matrix from Formulas_: alpha_matrix dict, same order [I1,I2,I3,I4]
const DEFAULT_ALPHA = {
  B: { I1:0.040, I2:0.015, I3:0.010, I4:0.028 },
  F: { I1:0.015, I2:0.004, I3:0.006, I4:0.020 },
  P: { I1:0.000, I2:0.020, I3:0.022, I4:0.002 },
  H: { I1:0.000, I2:0.003, I3:0.002, I4:0.015 },
  O: { I1:0.000, I2:0.015, I3:0.032, I4:0.005 },
};

const DEFAULT_COST = { I1:1, I2:1, I3:1, I4:1 };

// q matrix from Formulas_: q dict — P(category c | failure mode k), cats [1,2,3,4]
const Q_MATRIX = {
  B: [0.045, 0.352, 0.503, 0.101],
  F: [0.083, 0.611, 0.000, 0.306],
  P: [0.220, 0.353, 0.424, 0.003],
  H: [0.300, 0.456, 0.243, 0.001],
  O: [0.150, 0.425, 0.425, 0.000],
};

// historical_gallons from Formulas_ — used in sample_gallons_for_category()
const HIST_GALLONS = {
  B: [1205,2460,2830,3295,2815,825,200,2960,980,1835,200,2450,5880,3765,6488,14471,1590,2447,708,2849,7891,7556,1777,20],
  F: [250,400,50,150,145000,17,180,2008,361,48269,357,44159,3,3,22681,9156,1798,25,9429],
  O: [60],
};

// ─────────────────────────────────────────────────────────────────────────────
// RISK PARAMETERS — from Formulas_
// RHO = 10_000_000 dollars (Formulas_ default)
// GAMMA = 0.091 (board-elicited, 1/GAMMA ≈ $10.99M ≈ $10M)
// ─────────────────────────────────────────────────────────────────────────────
const GAMMA       = 0.091;
const RHO_DOLLARS = 10_000_000; // matching Formulas_ RHO exactly

// ─────────────────────────────────────────────────────────────────────────────
// SEEDED RNG — mulberry32. Used ONLY by the Sensitivity tab so that the budget
// sweep, maintenance-cap analysis, and tornado diagram are fully reproducible.
// The Dashboard / Cost / Optimizer tabs keep using Math.random (live "Re-run MC").
// ─────────────────────────────────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SENS_SEED = 12345; // fixed seed → board sees identical numbers every load

// ─────────────────────────────────────────────────────────────────────────────
// COST MODEL — exact match to Formulas_ spill_cost(category, gallons)
// ─────────────────────────────────────────────────────────────────────────────
function spillCost(category, gallons) {
  if (category === 1) { const om = gallons < 200 ? 50000 : 100000; return om + 10 * gallons; }
  if (category === 2) return 100000 + 5 * gallons;
  if (category === 3) return 50000  + 3 * gallons;
  if (category === 4) return 10000;
  return 10000;
}

// ─────────────────────────────────────────────────────────────────────────────
// VOLUME SAMPLING — exact match to Formulas_ sample_gallons_for_category()
// Accepts an optional rng (defaults to Math.random) so seeded runs are possible.
// ─────────────────────────────────────────────────────────────────────────────
function sampleGallons(category, modeKey, rng = Math.random) {
  const data = HIST_GALLONS[modeKey];
  if (data) {
    let candidates;
    if      (category === 1) candidates = data.filter(g => g > 0);
    else if (category === 2) candidates = data.filter(g => g > 1000);
    else if (category === 3) candidates = data.filter(g => g >= 50 && g <= 1000);
    else                     candidates = data.filter(g => g < 50);
    if (candidates.length > 0) return candidates[Math.floor(rng() * candidates.length)];
  }
  // log-uniform fallback matching Formulas_
  if (category === 1) return Math.exp(rng() * (Math.log(150000) - Math.log(50))   + Math.log(50));
  if (category === 2) return Math.exp(rng() * (Math.log(50000)  - Math.log(1000)) + Math.log(1000));
  if (category === 3) return Math.exp(rng() * (Math.log(1000)   - Math.log(50))   + Math.log(50));
  return 1 + rng() * 49;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY — matches Formulas_ expected_utility():
//   U(-C) = 1 - exp(C / rho)   ← NOTE: 1 minus, not negative
//   x clipped at 50 to avoid overflow
// ─────────────────────────────────────────────────────────────────────────────
function expUtility(costDollars, rho = RHO_DOLLARS) {
  const x = Math.min(costDollars / rho, 50);
  return 1 - Math.exp(x);
}

// ─────────────────────────────────────────────────────────────────────────────
// CAUSE → FAILURE MODE mapping (spreadsheet upload AND embedded data)
// Stricter than a catch-all: blank / unrecognized causes go to "U" (Unknown),
// NOT silently to Blockage. Unknown rows are counted in totals but EXCLUDED from
// the per-mode λ₀ rate (you can't attribute a rate to a cause you never observed).
// Pipe-failure keywords expanded to catch miscodes ("patch broke off",
// "tree fell ... broke the main"). Foreign-object jams ("water key wedged") = B.
// ─────────────────────────────────────────────────────────────────────────────
function causeToMode(causeStr) {
  const c = (causeStr || "").trim().toLowerCase();
  if (c === "") return "U"; // no recorded cause → Unknown
  if (c.includes("pump"))                                                   return "P";
  if (c.includes("hydraulic") || c.includes("i&i") || c.includes("inflow")) return "H";
  if (["broken","break","pipe","liner","sag","fitting","dip","damage","crack","patch","broke","collapse","tree fell"].some(k => c.includes(k))) return "F";
  if (["jetting","operational","operator"].some(k => c.includes(k)))        return "O";
  if (["root","grease","grit","rag","fog","debris","rock","solids","wipe","block","water key","wedged"].some(k => c.includes(k))) return "B";
  return "U"; // recognized nothing → Unknown, not Blockage
}

// ─────────────────────────────────────────────────────────────────────────────
// SPREADSHEET CSV PARSER
// ─────────────────────────────────────────────────────────────────────────────
function isLineSegmentCol(val) {
  return /^[A-Z]\d+/i.test((val || "").trim());
}

function excelSerialToYear(serial) {
  const d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  return d.getUTCFullYear();
}

function parseCAWDCsv(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const spills = [];
  let currentYear = null;

  for (const line of lines) {
    if (/^(DATE|CAWD|YEAR|\s*$)/i.test(line)) continue;
    if (/NO SPILLS/i.test(line)) continue;

    const cols = line.split(/[,\t]/).map(c => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 3) continue;

    const col0 = cols[0];
    const asNum = parseFloat(col0);

    if (/^\d{4}$/.test(col0) && cols.length === 1) { currentYear = parseInt(col0); continue; }

    let gallons, causeStr, year;
    if (!isNaN(asNum) && asNum > 30000 && asNum < 50000) {
      year = excelSerialToYear(Math.round(asNum));
    } else if (/^\d{4}-\d{2}-\d{2}/.test(col0) || /^\d{1,2}\/\d{1,2}\/\d{4}/.test(col0)) {
      year = parseInt(col0.replace(/-.*/, "").split("/").pop());
    } else if (/^\d{4}$/.test(col0)) {
      year = parseInt(col0);
    } else {
      year = currentYear;
    }

    if (!year || year < 1990 || year > 2100) continue;
    currentYear = year;

    if (isLineSegmentCol(cols[2])) {
      gallons  = parseFloat(cols[3]);
      causeStr = cols[5] || "";
    } else {
      gallons  = parseFloat(cols[2]);
      causeStr = cols[3] || "";
    }

    if (!isFinite(gallons) || gallons <= 0) continue;

    spills.push({ year, gallons, mode: causeToMode(causeStr), cause: causeStr });
  }

  const byYear = {};
  for (const s of spills) {
    if (!byYear[s.year]) byYear[s.year] = { year:s.year, count:0, totalGallons:0, spills:[] };
    byYear[s.year].count++;
    byYear[s.year].totalGallons += s.gallons;
    byYear[s.year].spills.push({ gallons:s.gallons, mode:s.mode });
  }
  return Object.values(byYear).sort((a,b) => a.year - b.year);
}

// ─────────────────────────────────────────────────────────────────────────────
// MATH UTILITIES — Poisson / weighted choice accept an optional rng
// ─────────────────────────────────────────────────────────────────────────────
function poissonSample(lambda, rng = Math.random) {
  if (lambda <= 0) return 0;
  const limit = Math.exp(-lambda);
  let count = 0, product = 1;
  do { count++; product *= rng(); } while (product > limit);
  return count - 1;
}

function weightedChoice(weights, rng = Math.random) {
  const total = weights.reduce((a,b) => a+b, 0);
  let r = rng() * total, cum = 0;
  for (let i = 0; i < weights.length; i++) { cum += weights[i]; if (r <= cum) return i; }
  return weights.length - 1;
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
    let r = 0;
    for (const l of levers) r += (alpha[m.key]?.[l.key]||0) * (investment[l.key]||0);
    result[m.key] = (lambda0[m.key]||0) * Math.exp(-r);
  }
  return result;
}

function sumValues(obj) { return Object.values(obj).reduce((a,b) => a+Number(b||0), 0); }

function fmt(x, d=2) {
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits:d, minimumFractionDigits:d });
}

function fmtDollars(dollars) {
  if (!Number.isFinite(dollars)) return "—";
  if (dollars >= 1e6) return `$${fmt(dollars/1e6,2)}M`;
  if (dollars >= 1000) return `$${fmt(dollars/1000,0)}k`;
  return `$${fmt(dollars,0)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATE ONE YEAR — accepts optional rng for seeded runs
// ─────────────────────────────────────────────────────────────────────────────
function simulateYear(lambdas, rng = Math.random) {
  let n = 0, totalCost = 0;
  for (const m of modes) {
    const count = poissonSample(lambdas[m.key]||0, rng);
    n += count;
    for (let j = 0; j < count; j++) {
      const catIdx  = weightedChoice(Q_MATRIX[m.key], rng);
      const category = catIdx + 1;
      const gallons  = sampleGallons(category, m.key, rng);
      totalCost += spillCost(category, gallons);
    }
  }
  return { n, totalCost };
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTE CARLO — Dashboard/Cost tabs (live, Math.random)
// ─────────────────────────────────────────────────────────────────────────────
function monteCarlo(lambdas, runs, threshold) {
  const HIST_MAX = 15;
  const hist = Array.from({length:HIST_MAX+1}, (_,i) => ({
    spills: i<HIST_MAX ? String(i) : `${HIST_MAX}+`, count:0,
  }));
  const catCounts = [0,0,0,0];
  let totalSpills=0, totalCost=0, totalUtility=0;
  let cntAtLeastOne=0, cntOverThreshold=0, cntCostOver1M=0;
  const annualCosts = [];

  for (let r = 0; r < runs; r++) {
    let n=0, yearCost=0;
    for (const m of modes) {
      const count = poissonSample(lambdas[m.key]||0);
      n += count;
      for (let j = 0; j < count; j++) {
        const catIdx  = weightedChoice(Q_MATRIX[m.key]);
        const category = catIdx + 1;
        const gallons  = sampleGallons(category, m.key);
        yearCost += spillCost(category, gallons);
        catCounts[catIdx]++;
      }
    }
    totalSpills  += n;
    totalCost    += yearCost;
    totalUtility += expUtility(yearCost);
    annualCosts.push(yearCost);
    hist[Math.min(n, HIST_MAX)].count++;
    if (n >= 1)             cntAtLeastOne++;
    if (n > threshold)      cntOverThreshold++;
    if (yearCost > 1000000) cntCostOver1M++;
  }

  function pct(arr, p) {
    const s = [...arr].sort((a,b)=>a-b);
    return s[Math.max(0,Math.ceil(s.length*p)-1)]||0;
  }

  return {
    mean:            totalSpills  / runs,
    expectedCost:    totalCost    / runs,
    expectedUtility: totalUtility / runs,
    pAtLeastOne:     cntAtLeastOne    / runs,
    pOverThreshold:  cntOverThreshold / runs,
    pCostOver1M:     cntCostOver1M    / runs,
    p90Cost:         pct(annualCosts, 0.90),
    p95Cost:         pct(annualCosts, 0.95),
    hist:            hist.map(d=>({...d, probability:d.count/runs})),
    catMeans: [
      {category:"Cat 1", count:catCounts[0]/runs},
      {category:"Cat 2", count:catCounts[1]/runs},
      {category:"Cat 3", count:catCounts[2]/runs},
      {category:"Cat 4", count:catCounts[3]/runs},
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// E[U] EVALUATION — accepts an rng so the optimizer can run seeded
// ─────────────────────────────────────────────────────────────────────────────
function euFor(lambda0, alpha, inv, runs, rng = Math.random) {
  const lambdas = computeLambdas(lambda0, alpha, inv);
  let sumU = 0;
  for (let r = 0; r < runs; r++) { const {totalCost} = simulateYear(lambdas, rng); sumU += expUtility(totalCost); }
  return sumU / runs;
}

// euForSeed: create a fresh seeded RNG for each call — used by the seeded optimizer
// so each candidate evaluation gets identical stochasticity (fair comparison).
function euForSeed(lambda0, alpha, inv, runs, seed) {
  return euFor(lambda0, alpha, inv, runs, mulberry32(seed));
}

// ─────────────────────────────────────────────────────────────────────────────
// GREEDY OPTIMIZER — Dashboard/Optimizer tabs (live)
// ─────────────────────────────────────────────────────────────────────────────
const MC_OPT_RUNS      = 400;   // live optimizer (Dashboard/Optimizer)
const MC_SENS_RUNS     = 1500;  // seeded sensitivity sweep — more runs, no noise penalty
const ENTRY_THRESHOLD  = 0.5;   // a lever "enters" when it holds ≥ 0.5 units ($50K)
const PERSIST_STEPS    = 3;     // …and stays there for ≥ 3 consecutive budget steps

function greedyOptimize(lambda0, alpha, costs, budget, step=0.25, runs=MC_OPT_RUNS, rng=Math.random) {
  const inv = {I1:0,I2:0,I3:0,I4:0};
  let remaining = budget;
  let currentEU = euFor(lambda0, alpha, inv, runs, rng);
  const path = [{step:0, eu:currentEU, lambda:sumValues(computeLambdas(lambda0,alpha,inv)), ...inv}];
  let t = 0;
  while (remaining >= step && t < 1000) {
    let bestLever=null, bestEU=-Infinity;
    for (const lever of levers) {
      const cost = costs[lever.key]||1;
      if (cost*step > remaining) continue;
      const trial = {...inv, [lever.key]:inv[lever.key]+step};
      const trialEU = euFor(lambda0, alpha, trial, runs, rng);
      if (trialEU > bestEU) { bestEU=trialEU; bestLever=lever.key; }
    }
    if (!bestLever || bestEU <= currentEU) break;
    inv[bestLever] += step;
    remaining -= (costs[bestLever]||1)*step;
    currentEU = bestEU; t++;
    path.push({step:t, eu:currentEU, lambda:sumValues(computeLambdas(lambda0,alpha,inv)), ...inv});
  }
  return {investment:inv, remaining, path, finalEU:currentEU};
}

// ─────────────────────────────────────────────────────────────────────────────
// SEEDED GREEDY OPTIMIZER — Sensitivity tab only.
// At each decision step t, all candidates (current inv + each trial) are evaluated
// with the SAME fresh seed (seed + t*1000), giving a fair identical-MC comparison.
// Matches the Python generate_sensitivity_figures.py greedy_optimize() exactly.
// ─────────────────────────────────────────────────────────────────────────────
function greedyOptimizeSeeded(lambda0, alpha, costs, budget, step=0.25, runs=MC_SENS_RUNS, seed=SENS_SEED) {
  const inv = {I1:0,I2:0,I3:0,I4:0};
  let remaining = budget;
  let t = 0;
  while (remaining >= step && t < 1000) {
    const stepSeed = seed + t * 1000;
    const currentEU = euForSeed(lambda0, alpha, inv, runs, stepSeed);
    let bestLever=null, bestEU=-Infinity;
    for (const lever of levers) {
      const cost = costs[lever.key]||1;
      if (cost*step > remaining) continue;
      const trial = {...inv, [lever.key]:inv[lever.key]+step};
      const trialEU = euForSeed(lambda0, alpha, trial, runs, stepSeed); // same seed → fair
      if (trialEU > bestEU) { bestEU=trialEU; bestLever=lever.key; }
    }
    if (!bestLever || bestEU <= currentEU) break;
    inv[bestLever] += step;
    remaining -= (costs[bestLever]||1)*step;
    t++;
  }
  const finalEU = euForSeed(lambda0, alpha, inv, runs, seed + 1000000);
  return {investment:inv, remaining, finalEU};
}

function greedyOptimizeCappedSeeded(lambda0, alpha, costs, budget, capI1, step=0.25, runs=MC_SENS_RUNS, seed=SENS_SEED+9999) {
  const inv = {I1:0,I2:0,I3:0,I4:0};
  let remaining = budget;
  let t = 0;
  while (remaining >= step && t < 1000) {
    const stepSeed = seed + t * 1000;
    const currentEU = euForSeed(lambda0, alpha, inv, runs, stepSeed);
    let bestLever=null, bestEU=-Infinity;
    for (const lever of levers) {
      const cost = costs[lever.key]||1;
      if (cost*step > remaining) continue;
      if (lever.key==="I1" && inv.I1+step > capI1) continue;
      const trial = {...inv,[lever.key]:inv[lever.key]+step};
      const trialEU = euForSeed(lambda0, alpha, trial, runs, stepSeed); // same seed → fair
      if (trialEU>bestEU){bestEU=trialEU;bestLever=lever.key;}
    }
    if (!bestLever||bestEU<=currentEU) break;
    inv[bestLever]+=step;
    remaining-=(costs[bestLever]||1)*step;
    t++;
  }
  const finalEU = euForSeed(lambda0, alpha, inv, runs, seed + 1000000);
  return {investment:inv, remaining, finalEU};
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORICAL ANALYTICS
// λ₀ = (cause-attributed events in window) / (elapsed years of exposure) × 100/miles
// Denominator = fractional elapsed years. Data runs through end of March 2026, so
// 2026 contributes 0.25 yr. The zero-spill year 2020 is treated as a full year of
// exposure that is REMOVED from the denominator (per team decision), so any window
// containing 2020 has 1.00 yr subtracted. Unknown-cause ("U") rows are counted in
// totals/Historical but EXCLUDED here — no rate is attributed to an unrecorded cause.
// ─────────────────────────────────────────────────────────────────────────────
const DATA_END_FRACTION = 0.25; // through end of March 2026 → 2026 = quarter year

function windowExposureYears(data) {
  if (!data.length) return 1;
  const years = data.map(d => d.year);
  const minY = Math.min(...years);
  const maxY = Math.max(...years);
  // elapsed span: full years from minY up to maxY, with maxY=2026 only a quarter
  let span = (maxY - minY) + (maxY >= 2026 ? DATA_END_FRACTION : 1.0);
  // subtract the zero-spill 2020 if it lies inside the window
  if (minY <= 2020 && maxY >= 2020) span -= 1.0;
  return span > 0 ? span : 1;
}

function computeLambda0FromWindow(data) {
  const denom = windowExposureYears(data);
  const mc = {B:0,F:0,P:0,H:0,O:0}; // U intentionally absent → excluded from rate
  data.forEach(yr => yr.spills.forEach(s => { if (mc[s.mode] !== undefined) mc[s.mode]++; }));
  const result = {};
  for (const m of modes) result[m.key] = (mc[m.key]/denom) * (100/SYSTEM_MILES);
  return result;
}

function historicalStats(data) {
  const valid = data.filter(d => d.count >= 0);
  const avgSpills  = valid.length ? valid.reduce((s,d)=>s+d.count,0)/valid.length : 0;
  const avgGallons = valid.length ? valid.reduce((s,d)=>s+d.totalGallons,0)/valid.length : 0;
  const totalSpills = valid.reduce((s,d)=>s+d.count,0);
  const mc = {B:0,F:0,P:0,H:0,O:0,U:0};
  valid.forEach(yr => yr.spills.forEach(s => { if(mc[s.mode]!==undefined) mc[s.mode]++; }));
  return {avgSpills, avgGallons, totalSpills, modeCounts:mc, years:valid.length};
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const CAT_COLORS  = {"Cat 1":"#ef4444","Cat 2":"#f97316","Cat 3":"#22c55e","Cat 4":"#38bdf8"};
const MODE_COLORS = {B:"#38bdf8",F:"#f97316",P:"#34d399",H:"#a78bfa",O:"#facc15",U:"#64748b"};

function Kpi({title,value,subtitle,accent}) {
  return (
    <div style={{borderRadius:14,border:"1px solid #1e293b",background:"linear-gradient(135deg,#0f172a 60%,#1e293b)",padding:"14px 16px",boxShadow:"0 2px 12px #0008",borderLeft:accent?`3px solid ${accent}`:undefined}}>
      <div style={{fontSize:10,color:"#94a3b8",letterSpacing:"0.06em",textTransform:"uppercase"}}>{title}</div>
      <div style={{fontSize:21,fontWeight:800,color:"#f1f5f9",margin:"5px 0 3px",fontFamily:"'DM Mono',monospace"}}>{value}</div>
      <div style={{fontSize:10,color:"#64748b"}}>{subtitle}</div>
    </div>
  );
}
function Panel({title,children,style}) {
  return (
    <div style={{borderRadius:14,border:"1px solid #1e293b",background:"#0f172a",padding:16,boxShadow:"0 2px 12px #0008",...style}}>
      <h2 style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{title}</h2>
      {children}
    </div>
  );
}
function ChartCard({title,children}) {
  return (
    <div style={{borderRadius:14,border:"1px solid #1e293b",background:"#0f172a",padding:16,boxShadow:"0 2px 12px #0008"}}>
      <h2 style={{margin:"0 0 12px",fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{title}</h2>
      {children}
    </div>
  );
}
function NInput({label,value,onChange,step=0.1}) {
  return (
    <label style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,fontSize:12,color:"#cbd5e1"}}>
      <span>{label}</span>
      <input type="number" step={step} value={value} onChange={e=>onChange(Number(e.target.value))}
        style={{width:96,borderRadius:7,border:"1px solid #334155",background:"#020617",padding:"4px 7px",textAlign:"right",color:"#f1f5f9",fontSize:12}}/>
    </label>
  );
}
const TON  = {borderRadius:9,padding:"5px 13px",fontSize:11,fontWeight:700,background:"#f1f5f9",color:"#0f172a",border:"none",cursor:"pointer"};
const TOFF = {borderRadius:9,padding:"5px 13px",fontSize:11,fontWeight:600,background:"#1e293b",color:"#94a3b8",border:"none",cursor:"pointer"};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [alpha,       setAlpha]      = useState(DEFAULT_ALPHA);
  const [costs,       setCosts]      = useState(DEFAULT_COST);
  const [investment,  setInvestment] = useState({I1:1.5,I2:1.0,I3:1.0,I4:1.5});
  const [runs,        setRuns]       = useState(5000);
  const [budget,      setBudget]     = useState(5.5);
  const [thresholdN,  setThresholdN] = useState(5);
  const [tab,         setTab]        = useState("dashboard");
  const [baseline,    setBaseline]   = useState("historical");
  const [manualL0,    setManualL0]   = useState(DEFAULT_LAMBDA0);
  const [histView,    setHistView]   = useState("historical");
  const [rerun,       setRerun]      = useState(0);

  const [liveDataset, setLiveDataset] = useState(null);
  const [uploadMsg,   setUploadMsg]   = useState("");
  const [uploadOk,    setUploadOk]    = useState(false);
  const fileRef = useRef(null);

  const activeDataset = liveDataset || HISTORICAL_DATA;

  const baselineData = useMemo(() => {
    if (baseline === "5yr")  return activeDataset.filter(d => d.year >= CURRENT_YEAR-4);
    if (baseline === "10yr") return activeDataset.filter(d => d.year >= CURRENT_YEAR-9);
    if (baseline === "manual") return [];
    return activeDataset;
  }, [baseline, activeDataset]);

  const lambda0 = useMemo(() => {
    if (baseline === "manual") return manualL0;
    if (baselineData.length === 0) return DEFAULT_LAMBDA0;
    return computeLambda0FromWindow(baselineData);
  }, [baseline, baselineData, manualL0]);

  const baselineLambda  = useMemo(() => sumValues(lambda0), [lambda0]);
  const scenarioLambdas = useMemo(() => computeLambdas(lambda0, alpha, investment), [lambda0,alpha,investment]);
  const scenarioLambda  = useMemo(() => sumValues(scenarioLambdas), [scenarioLambdas]);
  const threshold       = Math.max(0, Math.round(thresholdN));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mc = useMemo(() => monteCarlo(scenarioLambdas, Math.max(100,runs), threshold),
    [scenarioLambdas, runs, threshold, rerun]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mcBase = useMemo(() => monteCarlo(computeLambdas(lambda0,alpha,{I1:0,I2:0,I3:0,I4:0}), Math.max(100,runs), threshold),
    [lambda0, alpha, runs, threshold, rerun]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const optimized = useMemo(() => greedyOptimize(lambda0, alpha, costs, budget),
    [lambda0, alpha, costs, budget, rerun]);

  const optLambdas = useMemo(() => computeLambdas(lambda0, alpha, optimized.investment), [lambda0,alpha,optimized.investment]);
  const optLambda  = sumValues(optLambdas);
  const pGTn       = 1 - poissonCdf(threshold, scenarioLambda);

  const histDataForView = useMemo(() => {
    if (histView === "5yr")  return activeDataset.filter(d => d.year >= CURRENT_YEAR-4);
    if (histView === "10yr") return activeDataset.filter(d => d.year >= CURRENT_YEAR-9);
    return activeDataset;
  }, [histView, activeDataset]);

  const histSummary = useMemo(() => historicalStats(histDataForView), [histDataForView]);

  const modeChart   = modes.map(m=>({mode:m.key,name:m.label,baseline:+lambda0[m.key].toFixed(3),scenario:+scenarioLambdas[m.key].toFixed(3),optimized:+optLambdas[m.key].toFixed(3)}));
  const investChart = levers.map(l=>({lever:l.short,scenario:investment[l.key],optimized:optimized.investment[l.key]}));
  const histChart   = histDataForView.map(d=>({year:d.year,count:d.count,gallons:d.totalGallons}));
  const histModeChart = modes.map(m=>({mode:m.key,label:m.label,count:histSummary.modeCounts[m.key]||0}));

  const baselineLabel = {
    "5yr":"Last 5 yrs (Board)","10yr":"Last 10 yrs","historical":"Full history (2000–2026)","manual":"Manual"
  }[baseline];

  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadMsg(""); setUploadOk(false);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setUploadMsg("Please upload a .csv file. Export your CAWD spreadsheet as CSV first."); return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = parseCAWDCsv(ev.target.result);
        if (!parsed.length) { setUploadMsg("No valid spill rows found. Check the format guide below."); return; }
        setLiveDataset(parsed);
        setUploadOk(true);
        setUploadMsg(`✓ Loaded ${parsed.length} year(s) · ${parsed.reduce((s,d)=>s+d.count,0)} spills · ${parsed.reduce((s,d)=>s+d.totalGallons,0).toLocaleString()} gallons`);
      } catch(err) { setUploadMsg("Parse error: " + err.message); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const tabs = ["dashboard","historical","data","cost","optimizer","sensitivity","inputs","model"];

  // ── Sensitivity Analysis state ───────────────────────────────────────────
  const [sensBudgetMax,   setSensBudgetMax]   = useState(20);
  const [sensI1Cap,       setSensI1Cap]       = useState(3);
  const [sensVolScenario, setSensVolScenario] = useState("base");

  // ── SA1: Budget sweep — SEEDED. Each budget point runs the greedy optimizer
  // with a fresh seed derived from SENS_SEED + the budget index, so the whole
  // sweep is deterministic (identical on every load) but each point is still
  // an independent draw. More runs (MC_SENS_RUNS) → low noise.
  const budgetSweep = useMemo(() => {
    const results = [];
    let idx = 0;
    for (let b = 0.25; b <= sensBudgetMax + 1e-9; b += 0.25) {
      // greedyOptimizeSeeded: each budget point uses seed SENS_SEED+idx, and
      // within that run each decision step uses stepSeed = seed + t*1000,
      // so all candidates at each step share identical MC (fair comparison).
      const opt = greedyOptimizeSeeded(lambda0, alpha, costs, +b.toFixed(2), 0.25, MC_SENS_RUNS, SENS_SEED + idx);
      results.push({
        budget: +b.toFixed(2),
        budgetDollars: +(b * 100).toFixed(0),
        eu: +opt.finalEU.toFixed(4),
        I1: +opt.investment.I1.toFixed(2),
        I2: +opt.investment.I2.toFixed(2),
        I3: +opt.investment.I3.toFixed(2),
        I4: +opt.investment.I4.toFixed(2),
        lambda: +sumValues(computeLambdas(lambda0, alpha, opt.investment)).toFixed(3),
      });
      idx++;
    }
    return results;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lambda0, alpha, costs, sensBudgetMax]);

  // ── Threshold detection with PERSISTENCE ──────────────────────────────────
  // A second lever has genuinely "entered" only when some non-I1 lever holds
  // ≥ ENTRY_THRESHOLD units for ≥ PERSIST_STEPS consecutive budget points.
  // We report the FIRST budget point of that persistent run, not the blip.
  const budgetThreshold = useMemo(() => {
    const others = ["I2","I3","I4"];
    for (let i = 0; i < budgetSweep.length; i++) {
      // does any non-I1 lever clear the entry threshold here?
      const entrant = others.find(k => budgetSweep[i][k] >= ENTRY_THRESHOLD);
      if (!entrant) continue;
      // check it (or any non-I1 lever) persists for the next PERSIST_STEPS-1 points
      let persists = true;
      for (let j = i; j < Math.min(i + PERSIST_STEPS, budgetSweep.length); j++) {
        const stillIn = others.some(k => budgetSweep[j][k] >= ENTRY_THRESHOLD);
        if (!stillIn) { persists = false; break; }
      }
      // require we actually had enough points to confirm persistence
      if (persists && i + PERSIST_STEPS <= budgetSweep.length) {
        return { ...budgetSweep[i], entrant };
      }
    }
    return null;
  }, [budgetSweep]);

  // ── SA2: uses the seeded-per-step optimizers (same logic as Python script) ──
  // Unconstrained seeded optimum at current budget — apples-to-apples with capped
  const seededOpt = useMemo(() =>
    greedyOptimizeSeeded(lambda0, alpha, costs, budget, 0.25, MC_SENS_RUNS, SENS_SEED + 7777),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [lambda0, alpha, costs, budget]);
  const seededOptLambda = sumValues(computeLambdas(lambda0, alpha, seededOpt.investment));

  const cappedOpt = useMemo(() =>
    greedyOptimizeCappedSeeded(lambda0, alpha, costs, budget, sensI1Cap, 0.25, MC_SENS_RUNS, SENS_SEED + 8888),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [lambda0, alpha, costs, budget, sensI1Cap]);

  const cappedLambda = sumValues(computeLambdas(lambda0, alpha, cappedOpt.investment));

  // ── SA3: Tornado — SEEDED volume / λ / ρ overrides ─────────────────────────
  function mcWithVolumeOverride(lambdas, runs, volMode, rng) {
    const r = rng || mulberry32(SENS_SEED + 1);
    const CAT_MIN = {1:50,   2:1001, 3:50,  4:1};
    const CAT_MAX = {1:145000,2:50000,3:1000,4:49};
    let totalCost = 0, totalUtility = 0, cntOver1M = 0;
    for (let i = 0; i < runs; i++) {
      let yearCost = 0;
      for (const m of modes) {
        const count = poissonSample(lambdas[m.key]||0, r);
        for (let j = 0; j < count; j++) {
          const catIdx = weightedChoice(Q_MATRIX[m.key], r);
          const category = catIdx+1;
          let gallons;
          if      (volMode==="min") gallons = CAT_MIN[category];
          else if (volMode==="max") gallons = CAT_MAX[category];
          else                      gallons = sampleGallons(category, m.key, r);
          yearCost += spillCost(category, gallons);
        }
      }
      totalCost    += yearCost;
      totalUtility += expUtility(yearCost);
      if (yearCost > 1000000) cntOver1M++;
    }
    return {
      expectedCost:    totalCost    / runs,
      expectedUtility: totalUtility / runs,
      pCostOver1M:     cntOver1M    / runs,
    };
  }

  const tornadoRuns = 4000; // seeded → can afford more runs
  const tornadoData = useMemo(() => {
    const base  = mcWithVolumeOverride(scenarioLambdas, tornadoRuns, "base", mulberry32(SENS_SEED + 100));
    const vMin  = mcWithVolumeOverride(scenarioLambdas, tornadoRuns, "min",  mulberry32(SENS_SEED + 101));
    const vMax  = mcWithVolumeOverride(scenarioLambdas, tornadoRuns, "max",  mulberry32(SENS_SEED + 102));

    const lambdaLow  = Object.fromEntries(modes.map(m=>[m.key,(scenarioLambdas[m.key]||0)*0.5]));
    const lambdaHigh = Object.fromEntries(modes.map(m=>[m.key,(scenarioLambdas[m.key]||0)*2.0]));
    const lLow  = mcWithVolumeOverride(lambdaLow,  tornadoRuns, "base", mulberry32(SENS_SEED + 103));
    const lHigh = mcWithVolumeOverride(lambdaHigh, tornadoRuns, "base", mulberry32(SENS_SEED + 104));

    function mcRho(lambdas,runs,rhoOverride,rng) {
      const r = rng || mulberry32(SENS_SEED + 200);
      let totalUtility=0,totalCost=0;
      for(let i=0;i<runs;i++){
        let yearCost=0;
        for(const m of modes){
          const count=poissonSample(lambdas[m.key]||0, r);
          for(let j=0;j<count;j++){
            const catIdx=weightedChoice(Q_MATRIX[m.key], r);
            const category=catIdx+1;
            const gallons=sampleGallons(category,m.key,r);
            yearCost+=spillCost(category,gallons);
          }
        }
        totalCost+=yearCost;
        totalUtility+=(1-Math.exp(Math.min(yearCost/rhoOverride,50)));
      }
      return {expectedCost:totalCost/runs, expectedUtility:totalUtility/runs};
    }
    const rhoLow  = mcRho(scenarioLambdas, tornadoRuns, RHO_DOLLARS*0.1, mulberry32(SENS_SEED + 105));
    const rhoHigh = mcRho(scenarioLambdas, tornadoRuns, RHO_DOLLARS*10,  mulberry32(SENS_SEED + 106));

    const baseC = base.expectedCost;
    const rows = [
      {label:"Spill volume (min→max)",        low:vMin.expectedCost,  high:vMax.expectedCost,  base:baseC},
      {label:"Failure rate λ (×0.5 → ×2)",    low:lLow.expectedCost,  high:lHigh.expectedCost, base:baseC},
      {label:"Risk tolerance ρ (×0.1 → ×10)", low:rhoLow.expectedCost,high:rhoHigh.expectedCost,base:baseC},
    ].map(r=>({
      ...r,
      swing: Math.abs(r.high - r.low),
      lowDelta:  r.low  - r.base,
      highDelta: r.high - r.base,
    })).sort((a,b)=>b.swing-a.swing);

    return {base, vMin, vMax, lLow, lHigh, rows, baseC};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioLambdas]);

  return (
    <div style={{minHeight:"100vh",background:"#020617",padding:"16px 12px",color:"#e2e8f0",fontFamily:"'IBM Plex Sans',system-ui,sans-serif"}}>
      <div style={{maxWidth:1200,margin:"0 auto"}}>

        {/* ── Header ── */}
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",flexWrap:"wrap",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
            <div>
              <h1 style={{margin:0,fontSize:21,fontWeight:800,color:"#f8fafc",letterSpacing:"-0.02em"}}>
                CAWD Sewer Spill O&M Risk Dashboard
              </h1>
              <p style={{margin:"3px 0 0",fontSize:11,color:"#64748b"}}>
                Monte Carlo PRA · SAM model · U(−C)=1−e<sup>C/ρ</sup> · λ₀ window: <strong style={{color:"#7dd3fc"}}>{baselineLabel}</strong>
                {liveDataset && <span style={{color:"#22c55e",marginLeft:8}}>· uploaded dataset active</span>}
              </p>
              <span style={{display:"inline-block",marginTop:3,borderRadius:20,background:"#1e3a5f",padding:"2px 10px",fontSize:10,fontWeight:700,color:"#7dd3fc"}}>
                Stanford MS&E 250B · Spring 2026 · Annabelle Jayadinata· Khang Do · Ramesh Manian · Maura Osorio
              </span>
            </div>
            <button onClick={()=>setRerun(x=>x+1)}
              style={{borderRadius:11,background:"#f1f5f9",padding:"7px 15px",fontWeight:700,fontSize:12,color:"#0f172a",border:"none",cursor:"pointer"}}>
              ↺ Re-run MC
            </button>
          </div>

          <div style={{marginTop:10,background:"#0f172a",borderRadius:11,border:"1px solid #1e293b",padding:"10px 14px",display:"flex",flexWrap:"wrap",gap:14,alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:11,color:"#94a3b8",marginRight:3}}>Baseline λ₀:</span>
              {[["5yr","Last 5 yrs (Board)"],["10yr","Last 10 yrs"],["historical","Full history"],["manual","Manual"]].map(([k,label])=>(
                <button key={k} onClick={()=>setBaseline(k)}
                  style={baseline===k ? {...TON,background:"#38bdf8",color:"#0f172a"} : TOFF}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{display:"flex",gap:14,alignItems:"center"}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em"}}>γ</div>
                <div style={{fontSize:14,fontWeight:800,color:"#a78bfa",fontFamily:"'DM Mono',monospace"}}>{GAMMA}</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:9,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.06em"}}>ρ (Formulas_)</div>
                <div style={{fontSize:14,fontWeight:800,color:"#facc15",fontFamily:"'DM Mono',monospace"}}>${fmt(RHO_DOLLARS/1e6,0)}M</div>
              </div>
              <div style={{fontSize:10,color:"#475569",maxWidth:180}}>All model outputs update when window changes</div>
            </div>
          </div>

          <div style={{marginTop:7,background:"#0f172a",borderRadius:9,border:"1px solid #1e293b",padding:"7px 12px",display:"flex",flexWrap:"wrap",gap:10,alignItems:"center"}}>
            <span style={{fontSize:10,color:"#64748b"}}>Active λ₀:</span>
            {modes.map(m=>(
              <div key={m.key} style={{textAlign:"center"}}>
                <div style={{fontSize:9,color:MODE_COLORS[m.key]}}>{m.label.split(" ")[0]}</div>
                <div style={{fontSize:12,fontWeight:700,color:"#f1f5f9",fontFamily:"'DM Mono',monospace"}}>{fmt(lambda0[m.key],3)}</div>
              </div>
            ))}
            <div style={{textAlign:"center",marginLeft:4}}>
              <div style={{fontSize:9,color:"#94a3b8"}}>Σλ</div>
              <div style={{fontSize:12,fontWeight:700,color:"#22c55e",fontFamily:"'DM Mono',monospace"}}>{fmt(baselineLambda,3)}</div>
            </div>
          </div>
        </div>

        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:14}}>
          {tabs.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={tab===t?TON:TOFF}>
              {t[0].toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>

        {/* ══ DASHBOARD ══════════════════════════════════════════════════════ */}
        {tab==="dashboard" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
              <Kpi title="Expected annual spills" value={fmt(scenarioLambda)} subtitle={`λ₀ baseline: ${fmt(baselineLambda)}`} accent="#38bdf8"/>
              <Kpi title="Expected annual cost" value={fmtDollars(mc.expectedCost)} subtitle={`No invest: ${fmtDollars(mcBase.expectedCost)}`} accent="#f97316"/>
              <Kpi title="P(≥1 spill)" value={`${fmt(100*(1-Math.exp(-scenarioLambda)),1)}%`} subtitle={`No invest: ${fmt(100*(1-Math.exp(-baselineLambda)),1)}%`} accent="#22c55e"/>
              <Kpi title={`P(N>${threshold}) Poisson`} value={`${fmt(100*pGTn,1)}%`} subtitle={`MC: ${fmt(100*mc.pOverThreshold,1)}%`} accent="#a78bfa"/>
              <Kpi title="E[U(−C)]" value={fmt(mc.expectedUtility,4)} subtitle={`No invest: ${fmt(mcBase.expectedUtility,4)}`} accent="#facc15"/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <ChartCard title="Failure Mode λ — Baseline vs Scenario">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={modeChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                    <XAxis dataKey="mode" stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                    <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                    <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <Bar dataKey="baseline" name="Baseline λ₀" fill="#475569" radius={[3,3,0,0]}/>
                    <Bar dataKey="scenario" name="Scenario λ"  fill="#38bdf8" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="MC Annual Spill Count Distribution">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={mc.hist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                    <XAxis dataKey="spills" stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                    <YAxis tickFormatter={v=>`${(v*100).toFixed(0)}%`} stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                    <Tooltip formatter={v=>`${fmt(100*v,2)}%`} contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}}/>
                    <Bar dataKey="probability" name="Probability" fill="#22c55e" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <ChartCard title="Expected Spills by Category — q matrix (MC)">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={mc.catMeans}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                    <XAxis dataKey="category" stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                    <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                    <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}}/>
                    <Bar dataKey="count" name="Spills/yr" radius={[3,3,0,0]}>
                      {mc.catMeans.map(e=><Cell key={e.category} fill={CAT_COLORS[e.category]||"#94a3b8"}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p style={{margin:"5px 0 0",fontSize:10,color:"#475569"}}>Category probabilities from q matrix (Formulas_). Cat 1–4 per mode, not volume threshold.</p>
              </ChartCard>

              <Panel title="Investment Sliders">
                <NInput label={`P(N>${threshold}) threshold n`} value={thresholdN} step={1} onChange={v=>setThresholdN(Math.max(0,Math.round(v)))}/>
                <div style={{display:"flex",flexDirection:"column",gap:9,marginTop:10}}>
                  {levers.map(l=>(
                    <div key={l.key}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#94a3b8",marginBottom:2}}>
                        <span>{l.label}</span>
                        <span style={{fontFamily:"'DM Mono',monospace",color:"#f1f5f9"}}>{fmt(investment[l.key])}</span>
                      </div>
                      <input type="range" min="0" max="10" step="0.25" value={investment[l.key]}
                        onChange={e=>setInvestment({...investment,[l.key]:Number(e.target.value)})}
                        style={{width:"100%",accentColor:"#38bdf8"}}/>
                    </div>
                  ))}
                </div>
                <p style={{margin:"6px 0 0",fontSize:10,color:"#475569"}}>1 unit ≈ $100K O&M effort (BUDGET_UNITS=10 = $1M)</p>
              </Panel>
            </div>
          </div>
        )}

        {/* ══ HISTORICAL ═════════════════════════════════════════════════════ */}
        {tab==="historical" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:11,color:"#94a3b8"}}>View:</span>
              {[["historical","All years"],["10yr","Last 10 yrs"],["5yr","Last 5 yrs (Board)"]].map(([k,label])=>(
                <button key={k} onClick={()=>setHistView(k)}
                  style={histView===k?{...TON,background:"#38bdf8",color:"#0f172a"}:TOFF}>{label}</button>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10}}>
              <Kpi title="Avg spills/year" value={fmt(histSummary.avgSpills,1)} subtitle={`${histSummary.years} years`} accent="#38bdf8"/>
              <Kpi title="Total spills" value={histSummary.totalSpills} subtitle={`${histDataForView[0]?.year}–${histDataForView[histDataForView.length-1]?.year}`} accent="#f97316"/>
              <Kpi title="Avg volume/year" value={`${fmt(histSummary.avgGallons/1000,1)}k gal`} subtitle="Mean annual" accent="#facc15"/>
              <Kpi title="Model λ (scenario)" value={fmt(scenarioLambda,2)} subtitle={`λ₀ from: ${baselineLabel.split("(")[0].trim()}`} accent="#22c55e"/>
              <Kpi title="Model vs observed" value={`${scenarioLambda>histSummary.avgSpills?"+":""}${fmt(100*(scenarioLambda-histSummary.avgSpills)/Math.max(0.01,histSummary.avgSpills),1)}%`} subtitle="Δ vs historical avg" accent="#a78bfa"/>
            </div>

            <ChartCard title="Annual Spill Count">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={histChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                  <XAxis dataKey="year" stroke="#475569" tick={{fill:"#94a3b8",fontSize:10}}/>
                  <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                  <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}}/>
                  <Bar dataKey="count" name="Observed spills" fill="#38bdf8" radius={[3,3,0,0]}/>
                  <ReferenceLine y={histSummary.avgSpills} stroke="#facc15" strokeDasharray="4 4" label={{value:`Avg ${fmt(histSummary.avgSpills,1)}`,fill:"#facc15",fontSize:10,position:"insideTopRight"}}/>
                  <ReferenceLine y={scenarioLambda} stroke="#22c55e" strokeDasharray="4 4" label={{value:`λ ${fmt(scenarioLambda,1)}`,fill:"#22c55e",fontSize:10,position:"insideBottomRight"}}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <ChartCard title="Annual Gallons Spilled">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={histChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                    <XAxis dataKey="year" stroke="#475569" tick={{fill:"#94a3b8",fontSize:10}}/>
                    <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:10}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                    <Tooltip formatter={v=>`${fmt(v,0)} gal`} contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}}/>
                    <Bar dataKey="gallons" name="Gallons" fill="#f97316" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
                <p style={{margin:"5px 0 0",fontSize:10,color:"#475569"}}>2017 = 145k gal Hatton Canyon pipe. 2023 = multiple pipe failures.</p>
              </ChartCard>

              <ChartCard title="Spills by Failure Mode">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={histModeChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                    <XAxis dataKey="mode" stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                    <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                    <Tooltip formatter={(v,_,p)=>[v,p.payload.label||""]} contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}}/>
                    <Bar dataKey="count" name="Spills" radius={[3,3,0,0]}>
                      {histModeChart.map(e=><Cell key={e.mode} fill={MODE_COLORS[e.mode]||"#94a3b8"}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <Panel title="Year-by-Year Record">
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid #1e293b"}}>
                      {["Year","Spills","Gallons","Blockage","Pipe Fail","Pump","Hydraulic","Operational","Unknown"].map(h=>(
                        <th key={h} style={{padding:"5px 7px",textAlign:"left",color:"#64748b",fontWeight:600,fontSize:10}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {histDataForView.map(d=>{
                      const mc_={B:0,F:0,P:0,H:0,O:0,U:0};
                      d.spills.forEach(s=>{if(mc_[s.mode]!==undefined)mc_[s.mode]++;});
                      const isRecent = d.year >= CURRENT_YEAR-4;
                      return (
                        <tr key={d.year} style={{borderBottom:"1px solid #0f172a",background:isRecent?"#0f1f3d":undefined}}>
                          <td style={{padding:"4px 7px",fontWeight:700,color:isRecent?"#7dd3fc":"#e2e8f0"}}>{d.year}{isRecent?" ★":""}</td>
                          <td style={{padding:"4px 7px",fontFamily:"'DM Mono',monospace"}}>{d.count}</td>
                          <td style={{padding:"4px 7px",fontFamily:"'DM Mono',monospace"}}>{d.totalGallons.toLocaleString()}</td>
                          {["B","F","P","H","O","U"].map(m=>(
                            <td key={m} style={{padding:"4px 7px",fontFamily:"'DM Mono',monospace",color:mc_[m]>0?MODE_COLORS[m]:"#334155"}}>{mc_[m]||"—"}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{margin:"7px 0 0",fontSize:10,color:"#475569"}}>★ = last 5 years (Board view). 2020 = zero spills (removed from λ₀ denominator). U = cause not recorded (counted in totals, excluded from λ₀ rate; all in 2000–2001).</p>
            </Panel>
          </div>
        )}

        {/* ══ DATA UPLOAD ════════════════════════════════════════════════════ */}
        {tab==="data" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Panel title="Upload Updated CAWD Spill Data">
              <p style={{margin:"0 0 12px",fontSize:12,color:"#94a3b8",lineHeight:1.7}}>
                Export your CAWD Sewage Spill Tracking spreadsheet as CSV and upload it here.
                The parser handles <strong style={{color:"#7dd3fc"}}>both CAWD spreadsheet formats</strong> automatically —
                the early format (2000–2012: DATE, LOCATION, GALLONS, CAUSE) and
                the later format (2013+: DATE, LOCATION, LINE SEGMENT, GALLONS, RECOVERED, CAUSE, ...).
                Once uploaded, the dataset replaces the embedded data across all tabs.
              </p>

              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
                <button onClick={()=>fileRef.current?.click()}
                  style={{borderRadius:9,background:"#1e3a5f",border:"1px solid #38bdf8",color:"#7dd3fc",padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  📂 Upload CSV
                </button>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleUpload} style={{display:"none"}}/>
                {liveDataset && (
                  <button onClick={()=>{setLiveDataset(null);setUploadMsg("");setUploadOk(false);}}
                    style={{borderRadius:9,background:"#1e293b",border:"1px solid #ef4444",color:"#ef4444",padding:"8px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                    ✕ Clear upload
                  </button>
                )}
              </div>
              {uploadMsg && (
                <div style={{padding:"8px 12px",borderRadius:8,background:uploadOk?"#0f2b1f":"#2b0f0f",border:`1px solid ${uploadOk?"#22c55e":"#ef4444"}`,fontSize:12,color:uploadOk?"#22c55e":"#ef4444",marginBottom:10}}>
                  {uploadMsg}
                </div>
              )}

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:4}}>
                <div>
                  <h3 style={{margin:"0 0 6px",fontSize:12,fontWeight:700,color:"#e2e8f0"}}>Early format (2000–2012)</h3>
                  <pre style={{margin:0,background:"#020617",border:"1px solid #1e293b",borderRadius:7,padding:"8px 10px",fontSize:11,color:"#94a3b8",overflowX:"auto"}}>
{`DATE,SPILL LOCATION,GALLONS SPILLED,CAUSE OF SPILL
36565,Del Mar Easment,75,Roots
36580,Lazarro & Mesa,800,
36776,Carmel Meadows,50,Grit/Grease
36826,High Meadows,500,Grit/Grease`}
                  </pre>
                  <p style={{margin:"5px 0 0",fontSize:10,color:"#475569"}}>DATE can be Excel serial (36565) or text date. CAUSE can be blank.</p>
                </div>
                <div>
                  <h3 style={{margin:"0 0 6px",fontSize:12,fontWeight:700,color:"#e2e8f0"}}>Later format (2013+)</h3>
                  <pre style={{margin:0,background:"#020617",border:"1px solid #1e293b",borderRadius:7,padding:"8px 10px",fontSize:11,color:"#94a3b8",overflowX:"auto"}}>
{`DATE,SPILL LOCATION,LINE SEGMENT,GALLONS SPILLED,GALLONS RECOVERED,CAUSE OF SPILL,DURATION,GPM
41278,3285 Camino Del Monte,M746-M747,700,0,Free flowing roots,47 Minutes,N/A
41357,3 SW of 5th on Santa Rita,O770-O773,50,0,Roots,123 Minutes,N/A`}
                  </pre>
                  <p style={{margin:"5px 0 0",fontSize:10,color:"#475569"}}>Parser detects line segment column (e.g. M746-M747) and adjusts gallons column automatically.</p>
                </div>
              </div>

              <div style={{marginTop:12,background:"#0f1f3d",borderRadius:8,border:"1px solid #1e3a5f",padding:"10px 12px"}}>
                <h3 style={{margin:"0 0 6px",fontSize:12,fontWeight:700,color:"#7dd3fc"}}>Cause → Failure Mode mapping</h3>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:6,fontSize:11,color:"#94a3b8"}}>
                  {[["Blockage (B)","Roots, Grease, Grit, Rags, FOG, Debris, Rocks, foreign objects"],["Pipe Failure (F)","Broken, Break, Pipe, Liner, Sag, Fitting, Damage, Crack, Patch, Collapse, storm/tree"],["Pump Failure (P)","Pump"],["Hydraulic Overload (H)","Hydraulic, I&I, Inflow"],["Operational (O)","Jetting, Operational, Operator"],["Unknown (U)","Blank or unrecognized cause — counted in totals, EXCLUDED from λ₀ rate"]].map(([mode,causes])=>(
                    <div key={mode}><span style={{color:"#f1f5f9",fontWeight:600}}>{mode}:</span> {causes}</div>
                  ))}
                </div>
              </div>
            </Panel>

            {liveDataset && (
              <Panel title={`Uploaded Dataset Preview — ${liveDataset.length} years · ${liveDataset.reduce((s,d)=>s+d.count,0)} spills`}>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                    <thead>
                      <tr style={{borderBottom:"1px solid #1e293b"}}>
                        {["Year","Spills","Gallons","B","F","P","H","O","U"].map(h=>(
                          <th key={h} style={{padding:"5px 8px",textAlign:"left",color:"#64748b",fontSize:10,fontWeight:600}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {liveDataset.map(d=>{
                        const mc_={B:0,F:0,P:0,H:0,O:0,U:0};
                        d.spills.forEach(s=>{if(mc_[s.mode]!==undefined)mc_[s.mode]++;});
                        return (
                          <tr key={d.year} style={{borderBottom:"1px solid #0f172a"}}>
                            <td style={{padding:"4px 8px",fontFamily:"'DM Mono',monospace",color:"#7dd3fc",fontWeight:700}}>{d.year}</td>
                            <td style={{padding:"4px 8px",fontFamily:"'DM Mono',monospace"}}>{d.count}</td>
                            <td style={{padding:"4px 8px",fontFamily:"'DM Mono',monospace"}}>{d.totalGallons.toLocaleString()}</td>
                            {["B","F","P","H","O","U"].map(m=>(
                              <td key={m} style={{padding:"4px 8px",fontFamily:"'DM Mono',monospace",color:mc_[m]>0?MODE_COLORS[m]:"#334155"}}>{mc_[m]||"—"}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            <Panel title="Embedded Dataset Summary (fallback when no upload)">
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
                <Kpi title="Years" value="2000–2026" subtitle="26.25 yr span (thru Mar 2026)" accent="#38bdf8"/>
                <Kpi title="Total spills" value={HISTORICAL_DATA.reduce((s,d)=>s+d.count,0)} subtitle="From CAWD xlsx" accent="#f97316"/>
                <Kpi title="Blockage / Unknown" value={`${HISTORICAL_DATA.reduce((s,d)=>s+d.spills.filter(x=>x.mode==="B").length,0)} / ${HISTORICAL_DATA.reduce((s,d)=>s+d.spills.filter(x=>x.mode==="U").length,0)}`} subtitle="U = cause not recorded (excl. from rate)" accent="#a78bfa"/>
                <Kpi title="λ₀ denominator" value="25.25 yr" subtitle="26.25 − 1.0 (2020 removed)" accent="#22c55e"/>
              </div>
            </Panel>
          </div>
        )}

        {/* ══ COST ═══════════════════════════════════════════════════════════ */}
        {tab==="cost" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
              <Kpi title="Expected annual cost" value={fmtDollars(mc.expectedCost)} subtitle={`No invest: ${fmtDollars(mcBase.expectedCost)}`} accent="#f97316"/>
              <Kpi title="P90 annual cost" value={fmtDollars(mc.p90Cost)} subtitle="90th pct year" accent="#ef4444"/>
              <Kpi title="P95 annual cost" value={fmtDollars(mc.p95Cost)} subtitle="95th pct year" accent="#ef4444"/>
              <Kpi title="P(cost > $1M)" value={`${fmt(100*mc.pCostOver1M,1)}%`} subtitle={`No invest: ${fmt(100*mcBase.pCostOver1M,1)}%`} accent="#a78bfa"/>
              <Kpi title="E[U(−C)]" value={fmt(mc.expectedUtility,4)} subtitle={`ρ=$${fmt(RHO_DOLLARS/1e6,0)}M (Formulas_)`} accent="#facc15"/>
            </div>
            <Panel title="Cost Model — spill_cost(category, gallons) from Formulas_">
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid #1e293b"}}>
                      {["Category","Condition","O&M Fixed","Per-gallon","Python code"].map(h=>(
                        <th key={h} style={{padding:"5px 8px",textAlign:"left",color:"#64748b",fontSize:11,fontWeight:600}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Cat 1","gal≥200, surface water","$100,000","$10/gal","om=100k if gal≥200 else 50k; +10×gal"],
                      ["Cat 1","gal<200, surface water","$50,000","$10/gal",""],
                      ["Cat 2",">1,000 gal, no SW","$100,000","$5/gal","100k+5×gal"],
                      ["Cat 3","50–1,000 gal, no SW","$50,000","$3/gal","50k+3×gal"],
                      ["Cat 4","<50 gal, no SW","$10,000","—","10k flat"],
                    ].map(([cat,cond,fixed,fine,code])=>(
                      <tr key={cat+cond} style={{borderBottom:"1px solid #0f172a"}}>
                        <td style={{padding:"5px 8px",fontWeight:700,color:CAT_COLORS[cat]||"#94a3b8"}}>{cat}</td>
                        <td style={{padding:"5px 8px",color:"#cbd5e1"}}>{cond}</td>
                        <td style={{padding:"5px 8px",fontFamily:"'DM Mono',monospace"}}>{fixed}</td>
                        <td style={{padding:"5px 8px",fontFamily:"'DM Mono',monospace"}}>{fine}</td>
                        <td style={{padding:"5px 8px",fontFamily:"'DM Mono',monospace",fontSize:10,color:"#64748b"}}>{code}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel title="Utility — expected_utility() from Formulas_">
              <p style={{margin:"0 0 10px",fontSize:12,color:"#94a3b8",lineHeight:1.7}}>
                <code style={{color:"#7dd3fc"}}>U(−C) = 1 − exp(C/ρ)</code> · ρ = ${fmt(RHO_DOLLARS/1e6,0)}M (Formulas_ default) ·
                γ = {GAMMA} (board-elicited, 1/γ ≈ ${fmt(1/GAMMA/1e6,2)}M ≈ ρ).
                x clipped at 50 to match Formulas_ overflow guard. Higher E[U] is better (closer to 1).
              </p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Kpi title="Scenario E[U]"      value={fmt(mc.expectedUtility,4)}      subtitle="Current investment" accent="#facc15"/>
                <Kpi title="No-investment E[U]" value={fmt(mcBase.expectedUtility,4)}  subtitle="I=[0,0,0,0]"        accent="#475569"/>
              </div>
            </Panel>
          </div>
        )}

        {/* ══ OPTIMIZER ══════════════════════════════════════════════════════ */}
        {tab==="optimizer" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <p style={{margin:0,fontSize:12,color:"#64748b"}}>
              Greedy optimizer maximizes E[U(−C)] matching Formulas_ objective_value(). ρ=${fmt(RHO_DOLLARS/1e6,0)}M. λ₀: <strong style={{color:"#7dd3fc"}}>{baselineLabel}</strong>.
            </p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
              <Kpi title="Optimized E[spills]" value={fmt(optLambda)} subtitle={`Baseline: ${fmt(baselineLambda)}`} accent="#22c55e"/>
              <Kpi title="Reduction" value={`${fmt(100*(baselineLambda-optLambda)/Math.max(0.001,baselineLambda),1)}%`} subtitle={`${fmt(baselineLambda-optLambda)} fewer/yr`} accent="#38bdf8"/>
              <Kpi title="Optimized E[U]" value={fmt(optimized.finalEU,4)} subtitle="Higher = better" accent="#facc15"/>
              <Kpi title="Unallocated" value={`$${fmt(optimized.remaining*100,0)}K`} subtitle="After allocation" accent="#f97316"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <ChartCard title="Manual vs Optimized Allocation">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={investChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                    <XAxis dataKey="lever" stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                    <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                    <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}}/>
                    <Legend wrapperStyle={{fontSize:11}}/>
                    <Bar dataKey="scenario"  name="Manual"    fill="#38bdf8" radius={[3,3,0,0]}/>
                    <Bar dataKey="optimized" name="Optimized" fill="#f97316" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="E[U] as Budget Allocated">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={optimized.path}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                    <XAxis dataKey="step" stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                    <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                    <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}}/>
                    <Line type="monotone" dataKey="eu" name="E[U]" stroke="#facc15" strokeWidth={2} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        )}

        {/* ══ SENSITIVITY ════════════════════════════════════════════════════ */}
        {tab==="sensitivity" && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{background:"#0f1f3d",borderRadius:10,border:"1px solid #1e3a5f",padding:"10px 14px"}}>
              <p style={{margin:0,fontSize:12,color:"#cbd5e1",lineHeight:1.6}}>
                These three analyses are <strong style={{color:"#7dd3fc"}}>seeded</strong> (fixed RNG, {MC_SENS_RUNS.toLocaleString()} runs/point) so the
                numbers are reproducible — the board sees the same result on every load, and the "Re-run MC"
                button does not perturb them. Baseline λ₀ window: <strong style={{color:"#7dd3fc"}}>{baselineLabel}</strong>.
              </p>
            </div>

            {/* ── SA1: Budget Sweep ── */}
            <Panel title="① Budget Threshold — When does a second lever enter the solution?">
              <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"center",marginBottom:12}}>
                <NInput label="Sweep up to ($100K units)" value={sensBudgetMax} step={1}
                  onChange={v=>setSensBudgetMax(Math.max(2,Math.min(40,Math.round(v))))}/>
                {budgetThreshold ? (
                  <div style={{padding:"6px 14px",borderRadius:8,background:"#0f2b1f",border:"1px solid #22c55e",fontSize:12,color:"#22c55e",fontWeight:700}}>
                    First non-maintenance lever ({levers.find(l=>l.key===budgetThreshold.entrant)?.short}) enters at <strong>${(budgetThreshold.budget*100).toFixed(0)}K</strong> (budget = {budgetThreshold.budget} units)
                    &nbsp;— I1={budgetThreshold.I1}, I2={budgetThreshold.I2}, I3={budgetThreshold.I3}, I4={budgetThreshold.I4}
                  </div>
                ) : (
                  <div style={{padding:"6px 14px",borderRadius:8,background:"#0f2b1f",border:"1px solid #22c55e",fontSize:12,color:"#22c55e",fontWeight:700}}>
                    100% Preventive Maintenance across the entire ${sensBudgetMax*100}K sweep — no second lever clears {ENTRY_THRESHOLD} units
                  </div>
                )}
              </div>

              {/* Where does the $1M proposal sit? */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,marginBottom:12}}>
                {(() => {
                  const at10 = budgetSweep.find(r => Math.abs(r.budget - 10) < 1e-6);
                  return (
                    <>
                      <Kpi title="At $1M (10 units)" value={at10 ? `I1=${at10.I1}` : "—"}
                        subtitle={at10 ? `I2=${at10.I2} I3=${at10.I3} I4=${at10.I4}` : ""} accent="#38bdf8"/>
                      <Kpi title="Threshold for diversification"
                        value={budgetThreshold ? `$${(budgetThreshold.budget*100).toFixed(0)}K` : `>$${sensBudgetMax*100}K`}
                        subtitle={budgetThreshold ? "Second lever enters here" : "Beyond sweep range"} accent="#facc15"/>
                      <Kpi title="$1M proposal status"
                        value={(!budgetThreshold || 10 < budgetThreshold.budget) ? "All-in I1 ✓" : "Diversified"}
                        subtitle={(!budgetThreshold || 10 < budgetThreshold.budget) ? "Below threshold → 100% maintenance" : "Above threshold"}
                        accent="#22c55e"/>
                    </>
                  );
                })()}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <ChartCard title="Investment Allocation by Budget">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={budgetSweep}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                      <XAxis dataKey="budgetDollars" stroke="#475569" tick={{fill:"#94a3b8",fontSize:10}}
                        label={{value:"Budget ($K)",position:"insideBottom",offset:-4,fill:"#64748b",fontSize:10}}/>
                      <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:10}}
                        label={{value:"Units",angle:-90,position:"insideLeft",fill:"#64748b",fontSize:10}}/>
                      <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}}
                        labelFormatter={v=>`Budget: $${v}K`}/>
                      <Legend wrapperStyle={{fontSize:10}}/>
                      {/* $1M proposal marker */}
                      <ReferenceLine x={1000} stroke="#f1f5f9" strokeDasharray="4 4"
                        label={{value:"$1M proposal",fill:"#f1f5f9",fontSize:9,position:"top"}}/>
                      {budgetThreshold && (
                        <ReferenceLine x={budgetThreshold.budget*100} stroke="#facc15" strokeDasharray="4 4"
                          label={{value:"diversify",fill:"#facc15",fontSize:9,position:"top"}}/>
                      )}
                      <Line type="monotone" dataKey="I1" name="Preventive Maint." stroke="#38bdf8" strokeWidth={2} dot={false}/>
                      <Line type="monotone" dataKey="I2" name="Workforce"          stroke="#22c55e" strokeWidth={2} dot={false}/>
                      <Line type="monotone" dataKey="I3" name="Execution"          stroke="#f97316" strokeWidth={2} dot={false}/>
                      <Line type="monotone" dataKey="I4" name="Targeting"          stroke="#a78bfa" strokeWidth={2} dot={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="E[U] Improvement by Budget">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={budgetSweep}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                      <XAxis dataKey="budgetDollars" stroke="#475569" tick={{fill:"#94a3b8",fontSize:10}}
                        label={{value:"Budget ($K)",position:"insideBottom",offset:-4,fill:"#64748b",fontSize:10}}/>
                      <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:10}}/>
                      <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}}
                        labelFormatter={v=>`Budget: $${v}K`}/>
                      <ReferenceLine x={1000} stroke="#f1f5f9" strokeDasharray="4 4"/>
                      <Line type="monotone" dataKey="eu" name="E[U]" stroke="#facc15" strokeWidth={2} dot={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
              <p style={{margin:"8px 0 0",fontSize:10,color:"#475569"}}>
                A lever counts as "entered" only when it holds ≥ {ENTRY_THRESHOLD} units (${(ENTRY_THRESHOLD*100).toFixed(0)}K) for ≥ {PERSIST_STEPS} consecutive
                budget steps — this filters Monte-Carlo noise so a single jittery step doesn't read as diversification.
                The white dashed line marks the $1M proposal.
              </p>
            </Panel>

            {/* ── SA2: I1 Cap ── */}
            <Panel title="② Maintenance Cap — What happens if we can only put a limited amount into preventive maintenance?">
              <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"center",marginBottom:12}}>
                <NInput label="Max I1 (Preventive Maint.) units" value={sensI1Cap} step={0.25}
                  onChange={v=>setSensI1Cap(Math.max(0,v))}/>
                <div style={{fontSize:12,color:"#94a3b8"}}>Budget: {budget} units (${(budget*100).toFixed(0)}K)</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:12}}>
                <Kpi title="Unconstrained E[spills]" value={fmt(seededOptLambda,3)}
                  subtitle="No cap on I1 (seeded)" accent="#38bdf8"/>
                <Kpi title="Capped E[spills]" value={fmt(cappedLambda,3)}
                  subtitle={`I1 ≤ ${sensI1Cap} units`} accent="#f97316"/>
                <Kpi title="Cost of constraint" value={`+${fmt(cappedLambda-seededOptLambda,3)} spills/yr`}
                  subtitle="Additional expected spills" accent="#ef4444"/>
                <Kpi title="Capped E[U]" value={fmt(cappedOpt.finalEU,4)}
                  subtitle={`vs unconstrained ${fmt(seededOpt.finalEU,4)}`} accent="#facc15"/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <ChartCard title="Unconstrained Optimal Allocation">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={levers.map(l=>({lever:l.short,units:seededOpt.investment[l.key]}))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                      <XAxis dataKey="lever" stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                      <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                      <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}}/>
                      <Bar dataKey="units" name="Units allocated" fill="#38bdf8" radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title={`Capped Allocation (I1 ≤ ${sensI1Cap} units)`}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={levers.map(l=>({lever:l.short,units:cappedOpt.investment[l.key],cap:l.key==="I1"?sensI1Cap:undefined}))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                      <XAxis dataKey="lever" stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                      <YAxis stroke="#475569" tick={{fill:"#94a3b8",fontSize:11}}/>
                      <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",borderRadius:8}}/>
                      <Bar dataKey="units" name="Units allocated" radius={[3,3,0,0]}>
                        {levers.map(l=>(
                          <Cell key={l.key} fill={l.key==="I1"?"#ef4444":"#f97316"}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p style={{margin:"6px 0 0",fontSize:10,color:"#475569"}}>Red = constrained lever. Model redirects remaining budget to next best lever.</p>
                </ChartCard>
              </div>
            </Panel>

            {/* ── SA3: Tornado / Volume Extremes ── */}
            <Panel title="③ Tornado — How do extreme assumptions change expected annual cost?">
              <p style={{margin:"0 0 12px",fontSize:12,color:"#94a3b8",lineHeight:1.6}}>
                Each row varies one input from its minimum to maximum extreme while holding everything else at the base scenario.
                Bar width = total swing in expected annual cost. Base = {fmtDollars(tornadoData.baseC)}.
              </p>

              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
                <span style={{fontSize:11,color:"#94a3b8"}}>Volume scenario preview:</span>
                {[["min","All spills at minimum volume"],["base","Historical distribution (base)"],["max","All spills at maximum volume"]].map(([k,label])=>(
                  <button key={k} onClick={()=>setSensVolScenario(k)}
                    style={sensVolScenario===k?{...TON,background:"#38bdf8",color:"#0f172a"}:TOFF}>{label}</button>
                ))}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:10,marginBottom:14}}>
                <Kpi title="Min volume E[cost]" value={fmtDollars(tornadoData.vMin.expectedCost)}
                  subtitle="All spills at category floor" accent="#22c55e"/>
                <Kpi title="Base E[cost]" value={fmtDollars(tornadoData.base.expectedCost)}
                  subtitle="Historical volume distribution" accent="#38bdf8"/>
                <Kpi title="Max volume E[cost]" value={fmtDollars(tornadoData.vMax.expectedCost)}
                  subtitle="All spills at category ceiling" accent="#ef4444"/>
                <Kpi title="Volume swing" value={fmtDollars(tornadoData.vMax.expectedCost - tornadoData.vMin.expectedCost)}
                  subtitle="Max − Min expected cost" accent="#f97316"/>
              </div>

              {/* Cost tornado */}
              <ChartCard title="Tornado — Swing in Expected Annual Cost">
                <p style={{margin:"0 0 10px",fontSize:11,color:"#64748b"}}>
                  Each bar shows how much expected annual cost changes from base ({fmtDollars(tornadoData.baseC)}) when the variable is at its extreme.
                  ρ does not change cost (only utility) — see utility panel below.
                </p>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {tornadoData.rows.map((row,i)=>{
                    const maxSwing = Math.max(...tornadoData.rows.map(r=>r.swing), 1);
                    const scaleW = (v) => `${Math.abs(v)/maxSwing*45}%`;
                    return (
                      <div key={i}>
                        <div style={{fontSize:11,color:"#94a3b8",marginBottom:3}}>{row.label}</div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <div style={{width:"45%",display:"flex",justifyContent:"flex-end"}}>
                            <div style={{
                              width: scaleW(row.lowDelta), minWidth: row.swing > 0 ? 2 : 0,
                              background: row.lowDelta < 0 ? "#22c55e" : "#ef4444",
                              height:22,borderRadius:"4px 0 0 4px",
                              display:"flex",alignItems:"center",justifyContent:"flex-end",
                              paddingRight:4,fontSize:9,color:"#f1f5f9",fontFamily:"'DM Mono',monospace"
                            }}>{row.swing > 0 ? fmtDollars(row.low) : ""}</div>
                          </div>
                          <div style={{width:2,height:28,background:"#475569"}}/>
                          <div style={{width:"45%",display:"flex",justifyContent:"flex-start"}}>
                            <div style={{
                              width: scaleW(row.highDelta), minWidth: row.swing > 0 ? 2 : 0,
                              background: row.highDelta > 0 ? "#ef4444" : "#22c55e",
                              height:22,borderRadius:"0 4px 4px 0",
                              display:"flex",alignItems:"center",
                              paddingLeft:4,fontSize:9,color:"#f1f5f9",fontFamily:"'DM Mono',monospace"
                            }}>{row.swing > 0 ? fmtDollars(row.high) : "—"}</div>
                          </div>
                        </div>
                        <div style={{fontSize:9,color:"#475569",marginTop:2}}>
                          Swing: {fmtDollars(row.swing)} &nbsp;|&nbsp; Base: {fmtDollars(row.base)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>

              {/* Utility tornado — shows rho effect which is invisible in cost panel */}
              <ChartCard title="Tornado — Swing in Expected Utility E[U(−C)]">
                <p style={{margin:"0 0 10px",fontSize:11,color:"#64748b"}}>
                  Same rows, now showing utility delta. Base E[U] = {fmt(tornadoData.baseU,4)}.
                  Risk tolerance (ρ) only appears here — it has no cost effect.
                </p>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {tornadoData.rows.map((row,i)=>{
                    const maxUSwing = Math.max(...tornadoData.rows.map(r=>r.utilitySwing), 0.001);
                    const scaleW = (v) => `${Math.abs(v)/maxUSwing*45}%`;
                    return (
                      <div key={i}>
                        <div style={{fontSize:11,color:"#94a3b8",marginBottom:3}}>{row.label}</div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <div style={{width:"45%",display:"flex",justifyContent:"flex-end"}}>
                            <div style={{
                              width: scaleW(row.lowUtilityDelta), minWidth:2,
                              background: row.lowUtilityDelta > 0 ? "#22c55e" : "#ef4444",
                              height:22,borderRadius:"4px 0 0 4px",
                              display:"flex",alignItems:"center",justifyContent:"flex-end",
                              paddingRight:4,fontSize:9,color:"#f1f5f9",fontFamily:"'DM Mono',monospace"
                            }}>{fmt(row.lowUtilityDelta,3)}</div>
                          </div>
                          <div style={{width:2,height:28,background:"#475569"}}/>
                          <div style={{width:"45%",display:"flex",justifyContent:"flex-start"}}>
                            <div style={{
                              width: scaleW(row.highUtilityDelta), minWidth:2,
                              background: row.highUtilityDelta > 0 ? "#22c55e" : "#ef4444",
                              height:22,borderRadius:"0 4px 4px 0",
                              display:"flex",alignItems:"center",
                              paddingLeft:4,fontSize:9,color:"#f1f5f9",fontFamily:"'DM Mono',monospace"
                            }}>{fmt(row.highUtilityDelta,3)}</div>
                          </div>
                        </div>
                        <div style={{fontSize:9,color:"#475569",marginTop:2}}>
                          Utility swing: {fmt(row.utilitySwing,4)} &nbsp;|&nbsp; Base E[U]: {fmt(row.baseUtility,4)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p style={{margin:"12px 0 0",fontSize:10,color:"#475569"}}>
                  Green = improves utility vs base · Red = reduces utility.
                  ρ ×0.1 (very risk-averse) drastically reduces utility; ρ ×10 (near risk-neutral) improves it.
                </p>
              </ChartCard>
            </Panel>
          </div>
        )}

        {/* ══ INPUTS ═════════════════════════════════════════════════════════ */}
        {tab==="inputs" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {baseline==="manual" ? (
              <Panel title="Manual λ₀ (active when Manual selected above)">
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {modes.map(m=>(<NInput key={m.key} label={`${m.label} (${m.key})`} value={manualL0[m.key]} onChange={v=>setManualL0({...manualL0,[m.key]:Math.max(0,v)})}/>))}
                </div>
              </Panel>
            ) : (
              <Panel title={`Auto λ₀ from ${baselineLabel} — read only`}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:8}}>
                  {modes.map(m=>(
                    <div key={m.key} style={{background:"#020617",borderRadius:7,border:"1px solid #1e293b",padding:"7px 10px"}}>
                      <div style={{fontSize:10,color:MODE_COLORS[m.key]}}>{m.label}</div>
                      <div style={{fontSize:15,fontWeight:700,fontFamily:"'DM Mono',monospace",color:"#f1f5f9"}}>{fmt(lambda0[m.key],4)}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Panel title="Simulation Settings">
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <NInput label="MC runs" value={runs} step={1000} onChange={v=>setRuns(Math.max(100,Math.round(v)))}/>
                  <NInput label="Budget ($100K units)" value={budget} onChange={v=>setBudget(Math.max(0,v))}/>
                </div>
                <h3 style={{margin:"12px 0 7px",fontSize:12,fontWeight:700,color:"#e2e8f0"}}>Investment unit costs (ci)</h3>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {levers.map(l=>(<NInput key={l.key} label={l.label} value={costs[l.key]} onChange={v=>setCosts({...costs,[l.key]:Math.max(0.01,v)})}/>))}
                </div>
              </Panel>
              <Panel title="α matrix (from Formulas_ alpha_matrix)">
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                    <thead>
                      <tr style={{borderBottom:"1px solid #1e293b"}}>
                        <th style={{padding:"4px 6px",textAlign:"left",color:"#64748b",fontSize:10}}>Mode</th>
                        {levers.map(l=><th key={l.key} style={{padding:"4px 6px",textAlign:"left",color:"#64748b",fontSize:10}}>{l.short}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {modes.map(m=>(
                        <tr key={m.key} style={{borderBottom:"1px solid #0f172a"}}>
                          <td style={{padding:"4px 6px",fontWeight:600,color:MODE_COLORS[m.key],fontSize:10}}>{m.label}</td>
                          {levers.map(l=>(
                            <td key={l.key} style={{padding:"4px 6px"}}>
                              <input type="number" step="0.001" value={alpha[m.key][l.key]}
                                onChange={e=>setAlpha({...alpha,[m.key]:{...alpha[m.key],[l.key]:Number(e.target.value)}})}
                                style={{width:72,borderRadius:6,border:"1px solid #334155",background:"#020617",padding:"3px 5px",color:"#f1f5f9",fontSize:10,textAlign:"right"}}/>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{margin:"6px 0 0",fontSize:10,color:"#475569"}}>P/I1=0.000: PM has no effect on pump-station failures per Formulas_. All other values from Formulas_ alpha_matrix exactly.</p>
              </Panel>
            </div>
          </div>
        )}

        {/* ══ MODEL ══════════════════════════════════════════════════════════ */}
        {tab==="model" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Panel title="PRA Equations — aligned to Formulas_">
              <div style={{display:"flex",flexDirection:"column",gap:8,fontSize:12,color:"#cbd5e1",lineHeight:1.8}}>
                <p style={{margin:0}}><strong>N<sub>k</sub>(I) ~ Poisson(λ<sub>k</sub>(I))</strong> — per Formulas_ simulate_annual_costs()</p>
                <p style={{margin:0}}><strong>N(I) = N<sub>B</sub>+N<sub>F</sub>+N<sub>P</sub>+N<sub>H</sub>+N<sub>O</sub></strong></p>
                <p style={{margin:0}}><strong>λ<sub>k</sub>(I) = λ<sub>k0</sub>·exp(−Σα<sub>ki</sub>I<sub>i</sub>)</strong> — lambda_after_investment()</p>
                <p style={{margin:0}}><strong>cat ~ Categorical(q<sub>kc</sub>)</strong> — rng.choice([1,2,3,4], p=probs)</p>
                <p style={{margin:0}}><strong>gallons = sample_gallons_for_category(cat, mode)</strong> — historical array or log-uniform</p>
                <p style={{margin:0}}><strong>C = spill_cost(cat, gallons)</strong> — fixed O&M + per-gal fine</p>
                <p style={{margin:0}}><strong>U(−C) = 1−exp(C/ρ)</strong> — expected_utility(), ρ=${fmt(RHO_DOLLARS/1e6,0)}M, clip at 50</p>
                <p style={{margin:0,color:"#22c55e"}}><strong>max E[U] s.t. Σc<sub>i</sub>I<sub>i</sub>≤B</strong> — objective_value()</p>
                <p style={{margin:0}}><strong>λ<sub>k0</sub> window:</strong> cause-attributed events / elapsed yrs × 100/77.57 mi (2020 yr removed; Unknown excluded; 2026 = ¼ yr)</p>
              </div>
            </Panel>
            <Panel title="q Matrix & SAM">
              <div style={{display:"flex",flexDirection:"column",gap:10,fontSize:12,color:"#cbd5e1"}}>
                <div>
                  <h3 style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:"#94a3b8"}}>q<sub>kc</sub> = P(cat c | mode k) from Formulas_</h3>
                  <table style={{fontSize:10,borderCollapse:"collapse",width:"100%"}}>
                    <thead>
                      <tr style={{borderBottom:"1px solid #1e293b"}}>
                        <th style={{padding:"3px 5px",textAlign:"left",color:"#64748b"}}>Mode</th>
                        <th style={{padding:"3px 5px",color:"#ef4444"}}>Cat1</th>
                        <th style={{padding:"3px 5px",color:"#f97316"}}>Cat2</th>
                        <th style={{padding:"3px 5px",color:"#22c55e"}}>Cat3</th>
                        <th style={{padding:"3px 5px",color:"#38bdf8"}}>Cat4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modes.map(m=>(
                        <tr key={m.key} style={{borderBottom:"1px solid #0f172a"}}>
                          <td style={{padding:"3px 5px",color:MODE_COLORS[m.key]}}>{m.label}</td>
                          {Q_MATRIX[m.key].map((v,i)=>(
                            <td key={i} style={{padding:"3px 5px",fontFamily:"'DM Mono',monospace"}}>{v.toFixed(3)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 style={{margin:"0 0 4px",fontSize:11,fontWeight:700,color:"#94a3b8"}}>SAM: Management → Actions → System</h3>
                  <p style={{margin:"2px 0",fontSize:11}}>M1(Maint. Freq) → A1(Maintain Lines) → B, F</p>
                  <p style={{margin:"2px 0",fontSize:11}}>M2(Add Staff) → A1,A2(Surveillance) → B, F, H</p>
                  <p style={{margin:"2px 0",fontSize:11}}>M3(Training) → A3(Response) → O, P</p>
                  <p style={{margin:"2px 0",fontSize:11}}>M4(Risk Targeting) → A4(Reliable Exec) → O</p>
                  <p style={{margin:"2px 0",fontSize:11}}>B, F, P, H, O → Sewer Spill event</p>
                </div>
                <p style={{fontSize:10,color:"#64748b"}}>All constants, formulas, and logic aligned to Formulas_ Python file exactly.</p>
              </div>
            </Panel>
          </div>
        )}

      </div>
    </div>
  );
}
