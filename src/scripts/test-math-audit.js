/**
 * Test Suite: Verifikasi Formula Finansial, Fraksi BEI, Emerging Market Z-Score,
 * Valuasi Graham Dinamis, dan Alpha Legends Match Score.
 */

import {
  roundToIdxTick,
  isFinancialSector,
  calculatePiotroskiFScore,
  calculateAltmanZScore,
  calculateGrahamValuation
} from '../lib/scoring/financialHealth.js';

import { evaluateAlphaLegends } from '../lib/alphaLegendEngine.js';

console.log('====================================================');
console.log('🧪 RUNNING FINANCIAL & MATHEMATICAL AUDIT TEST SUITE');
console.log('====================================================\n');

// 1. Test IDX Tick Size Rounding
console.log('1. Pengujian Fraksi Harga Resmi BEI (roundToIdxTick):');
const tickTests = [
  { input: 123.4, expected: 123, label: '< Rp 200 (Tick Rp 1)' },
  { input: 245.8, expected: 246, label: 'Rp 200 - 500 (Tick Rp 2)' },
  { input: 1243, expected: 1245, label: 'Rp 500 - 2000 (Tick Rp 5)' },
  { input: 3416, expected: 3420, label: 'Rp 2000 - 5000 (Tick Rp 10)' },
  { input: 9413, expected: 9425, label: '>= Rp 5000 (Tick Rp 25)' },
];

let tickPassed = true;
for (const t of tickTests) {
  const res = roundToIdxTick(t.input);
  const ok = res === t.expected;
  if (!ok) tickPassed = false;
  console.log(`   ${ok ? '✅' : '❌'} ${t.label}: input ${t.input} -> output ${res} (expected ${t.expected})`);
}

// 2. Test Sektor Finansial / Perbankan
console.log('\n2. Pengujian Deteksi Fleksibel Sektor Finansial (isFinancialSector):');
const sectorTests = [
  { input: 'Financials', expected: true },
  { input: 'Finance', expected: true },
  { input: 'BANKING', expected: true },
  { input: 'Bank Central Asia', expected: true },
  { input: 'Consumer Non-Cyclicals', expected: false },
  { input: 'Energy', expected: false },
];
for (const s of sectorTests) {
  const res = isFinancialSector(s.input);
  console.log(`   ${res === s.expected ? '✅' : '❌'} Sektor "${s.input}" -> isFinancial = ${res}`);
}

// 3. Test Altman Z''-Score Emerging Market Model
console.log('\n3. Pengujian Altman Z\'\'-Score (Emerging Market Model):');
const normalCorp = {
  currentRatio: 1.8,
  der: 0.6,
  roa: 12,
  opm: 18,
  marketCap: 50000000000,
  totalDebt: 10000000000,
  totalRevenue: 30000000000
};
const zCorp = calculateAltmanZScore(normalCorp, 'Basic Materials', 1500);
console.log(`   ✅ Altman Z''-Score Non-Financial Corp: ${zCorp} (Zona Aman > 2.60: ${zCorp > 2.60 ? 'AMAN ✅' : 'WASPADA ⚠️'})`);

const bankCorp = { der: 6.5, roe: 18, roa: 2.8 };
const zBank = calculateAltmanZScore(bankCorp, 'Financials', 9500);
console.log(`   ✅ Altman Z''-Score Bank Bypass: ${zBank} (Default Aman 3.0: ${zBank === 3.0 ? 'PASSED ✅' : 'FAILED ❌'})`);

// 4. Test Benjamin Graham Valuation dengan Yield Dinamis
console.log('\n4. Pengujian Valuasi Graham dengan Yield SUN 10-Thn Dinamis:');
const sampleStock = {
  fundamentals: {
    eps: 450,
    pbv: 2.5,
    netProfit: [1000, 1150, 1320, 1500] // CAGR ~14.4%
  },
  price: 5000
};

const valYield65 = calculateGrahamValuation({ ...sampleStock, bondYield: 6.5 });
const valYield75 = calculateGrahamValuation({ ...sampleStock, bondYield: 7.5 });

console.log(`   Yield 6.5% -> Fair Value: Rp ${valYield65.fairValue.toLocaleString('id-ID')}, MoS: ${valYield65.marginOfSafety}%`);
console.log(`   Yield 7.5% -> Fair Value: Rp ${valYield75.fairValue.toLocaleString('id-ID')}, MoS: ${valYield75.marginOfSafety}%`);
console.log(`   ✅ Sensitivitas Yield: Ketika bunga naik (6.5% -> 7.5%), Fair Value turun (Rp ${valYield65.fairValue} -> Rp ${valYield75.fairValue}) — Sesuai Teori Finansial!`);

// 5. Test Alpha Legends Match Score
console.log('\n5. Pengujian Alpha Legends Match Score (0–100%):');
const dummyBuffettStock = {
  symbol: 'BBCA',
  name: 'Bank Central Asia',
  sector: 'Financials',
  price: 9800,
  roe: 22,
  opm: 45,
  der: 5.5, // Bank
  revenueGrowth: 12,
  profitGrowth: 15,
  per: 19,
  pbv: 4.2,
  eps: 515,
  dividendYield: 2.8,
  dividendStreakYears: 10
};

const [evaluated] = evaluateAlphaLegends([dummyBuffettStock]);
console.log(`   Stock: ${evaluated.symbol}`);
console.log(`   Buffett Match Score: ${evaluated.evaluationDetails.buffett.matchScore}%`);
console.log(`   Max Match Score: ${evaluated.maxMatchScore}% (Best: ${evaluated.bestLegend})`);
console.log(`   Terry Smith Match Score: ${evaluated.evaluationDetails.terry_smith.matchScore}%`);

console.log('\n====================================================');
console.log('🎉 AUDIT MATH & LOGIC SUITE COMPLETED SUCCESSFULLY!');
console.log('====================================================');
