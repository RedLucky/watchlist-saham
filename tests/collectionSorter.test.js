import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  SORT_OPTIONS,
  sortCollectionItems,
  computeSmartScore,
  computeMacdScore,
  computeProximityScore
} from '../src/lib/collectionSorter.js';

describe('Collection Sorter Engine Suite', () => {
  const mockItems = [
    {
      id: 1,
      ticker: 'BBCA',
      targetBuy: 9500,
      stock: {
        ticker: 'BBCA',
        price: 9800,
        changePercent: 1.5,
        score: 85,
        scores: { fundamental: 90, technical: 75, trending: 80, smartMoney: 85, composite: 85 },
        technicals: {
          macd: { isGoldenCross: true, histogram: 12.5, prevHistogram: -2.0 },
          support: 9400
        }
      }
    },
    {
      id: 2,
      ticker: 'BBRI',
      targetBuy: 5200,
      stock: {
        ticker: 'BBRI',
        price: 5150, // Already below targetBuy! In-zone
        changePercent: -0.5,
        score: 80,
        scores: { fundamental: 85, technical: 70, trending: 60, smartMoney: 70, composite: 80 },
        technicals: {
          macd: { isGoldenCross: false, histogram: -5.0, prevHistogram: -15.0 }, // Rebound
          support: 5100
        }
      }
    },
    {
      id: 3,
      ticker: 'ASII',
      targetBuy: 4800,
      stock: {
        ticker: 'ASII',
        price: 5400, // ~12% above target buy
        changePercent: 4.2, // High daily gainer
        score: 72,
        scores: { fundamental: 75, technical: 80, trending: 85, smartMoney: 95, composite: 72 }, // Smart money spike
        technicals: {
          macd: { isGoldenCross: false, histogram: 5.0, prevHistogram: 2.0 },
          support: 4900
        }
      }
    },
    {
      id: 4,
      ticker: 'ADRO',
      targetBuy: 3000,
      stock: {
        ticker: 'ADRO',
        price: 3600,
        changePercent: -2.0,
        score: 65,
        scores: { fundamental: 70, technical: 50, trending: 40, smartMoney: 50, composite: 65 },
        technicals: {
          macd: { isGoldenCross: false, histogram: -10.0, prevHistogram: -5.0 }, // Bearish
          support: 3100
        }
      }
    }
  ];

  it('1. Memastikan terdapat tepat 7 opsi strategi pengurutan dengan metadata lengkap', () => {
    assert.strictEqual(SORT_OPTIONS.length, 7);
    const ids = SORT_OPTIONS.map(opt => opt.id);
    assert.deepStrictEqual(ids, [
      'SMART_COMBINATION',
      'HIGHEST_SCORE',
      'MACD_CROSS',
      'PROXIMITY_TARGET_BUY',
      'SMART_MONEY',
      'TOP_PERFORMER',
      'ALPHABETICAL'
    ]);

    for (const opt of SORT_OPTIONS) {
      assert.ok(opt.label && opt.label.length > 0);
      assert.ok(opt.shortDesc && opt.shortDesc.length > 0);
      assert.ok(opt.badge && opt.badge.length > 0);
      assert.ok(opt.description && opt.description.length > 0);
      assert.ok(opt.formula && opt.formula.length > 0);
      assert.ok(opt.scenario && opt.scenario.length > 0);
    }
  });

  it('2. Menguji Strategi HIGHEST_SCORE: Mengurutkan dari skor komposit tertinggi ke terendah', () => {
    const sorted = sortCollectionItems(mockItems, 'HIGHEST_SCORE');
    assert.strictEqual(sorted[0].ticker, 'BBCA'); // 85
    assert.strictEqual(sorted[1].ticker, 'BBRI'); // 80
    assert.strictEqual(sorted[2].ticker, 'ASII'); // 72
    assert.strictEqual(sorted[3].ticker, 'ADRO'); // 65
  });

  it('3. Menguji Strategi MACD_CROSS: Mengutamakan Fresh Golden Cross', () => {
    const sorted = sortCollectionItems(mockItems, 'MACD_CROSS');
    assert.strictEqual(sorted[0].ticker, 'BBCA'); // Golden Cross = 100 pts
    assert.strictEqual(sorted[1].ticker, 'ASII'); // Bullish Histogram = 75 pts
    assert.strictEqual(sorted[2].ticker, 'BBRI'); // Rebound Histogram = 55 pts
    assert.strictEqual(sorted[3].ticker, 'ADRO'); // Bearish = 20 pts
  });

  it('4. Menguji Strategi PROXIMITY_TARGET_BUY: Memprioritaskan saham di zona beli / terdekat', () => {
    const sorted = sortCollectionItems(mockItems, 'PROXIMITY_TARGET_BUY');
    assert.strictEqual(sorted[0].ticker, 'BBRI'); // In zone (price <= target)
  });

  it('5. Menguji Strategi SMART_MONEY: Mengurutkan dari inflow akumulasi bandar tertinggi', () => {
    const sorted = sortCollectionItems(mockItems, 'SMART_MONEY');
    assert.strictEqual(sorted[0].ticker, 'ASII'); // Smart money score 95
    assert.strictEqual(sorted[1].ticker, 'BBCA'); // Smart money score 85
    assert.strictEqual(sorted[2].ticker, 'BBRI'); // Smart money score 70
    assert.strictEqual(sorted[3].ticker, 'ADRO'); // Smart money score 50
  });

  it('6. Menguji Strategi TOP_PERFORMER: Mengurutkan dari kenaikan persentase harian tertinggi', () => {
    const sorted = sortCollectionItems(mockItems, 'TOP_PERFORMER');
    assert.strictEqual(sorted[0].ticker, 'ASII'); // +4.2%
    assert.strictEqual(sorted[1].ticker, 'BBCA'); // +1.5%
    assert.strictEqual(sorted[2].ticker, 'BBRI'); // -0.5%
    assert.strictEqual(sorted[3].ticker, 'ADRO'); // -2.0%
  });

  it('7. Menguji Strategi ALPHABETICAL: Mengurutkan alfabetis A-Z', () => {
    const sorted = sortCollectionItems(mockItems, 'ALPHABETICAL');
    assert.strictEqual(sorted[0].ticker, 'ADRO');
    assert.strictEqual(sorted[1].ticker, 'ASII');
    assert.strictEqual(sorted[2].ticker, 'BBCA');
    assert.strictEqual(sorted[3].ticker, 'BBRI');
  });

  it('8. Menguji Strategi SMART_COMBINATION: Sinergi kualitas, MACD, dan jarak target beli', () => {
    const sorted = sortCollectionItems(mockItems, 'SMART_COMBINATION');
    // BBCA has Score 85 + Golden Cross 100 + Near target
    assert.strictEqual(sorted[0].ticker, 'BBCA');
    assert.ok(computeSmartScore(sorted[0]) >= computeSmartScore(sorted[1]));
  });

  it('9. Memastikan pure function tidak memutasi array masukan asli', () => {
    const originalFirstTicker = mockItems[0].ticker;
    sortCollectionItems(mockItems, 'ALPHABETICAL');
    assert.strictEqual(mockItems[0].ticker, originalFirstTicker);
  });
});
