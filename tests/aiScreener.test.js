import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildScreenerAiMessages,
  parseScreenerAiResponse,
  filterStocksByAiCriteria
} from '../src/lib/ai/screenerPrompt.js';

describe('AI Stock Screener Suite', () => {
  it('1. buildScreenerAiMessages menghasilkan struktur prompt yang benar', () => {
    const prompt = 'Cari saham bank dividen di atas 5%';
    const messages = buildScreenerAiMessages(prompt);

    assert.strictEqual(messages.length, 2);
    assert.strictEqual(messages[0].role, 'system');
    assert.strictEqual(messages[1].role, 'user');
    assert.strictEqual(messages[1].content, prompt);
  });

  it('2. parseScreenerAiResponse mengurai JSON bersih dan JSON terbungkus markdown', () => {
    const rawJson = '{"sector": "Financials", "minDividendYield": 5.5, "minRoe": 14, "maxPer": 15, "maxPbv": 2.0, "maxDer": 1.2, "smartMoneyOnly": true, "syariahOnly": false, "explanation": "Filter perbankan dividen."}';
    const parsed = parseScreenerAiResponse(rawJson);

    assert.strictEqual(parsed.sector, 'Financials');
    assert.strictEqual(parsed.minDividendYield, 5.5);
    assert.strictEqual(parsed.minRoe, 14);
    assert.strictEqual(parsed.maxPer, 15);
    assert.strictEqual(parsed.maxPbv, 2.0);
    assert.strictEqual(parsed.maxDer, 1.2);
    assert.strictEqual(parsed.smartMoneyOnly, true);
    assert.strictEqual(parsed.syariahOnly, false);
    assert.strictEqual(parsed.explanation, 'Filter perbankan dividen.');

    // Markdown block test
    const markdownWrapped = '```json\n{"sector": "Energy", "minDividendYield": 6, "smartMoneyOnly": false}\n```';
    const parsedMarkdown = parseScreenerAiResponse(markdownWrapped);
    assert.strictEqual(parsedMarkdown.sector, 'Energy');
    assert.strictEqual(parsedMarkdown.minDividendYield, 6);
  });

  it('3. parseScreenerAiResponse menangani string rusak dengan fallback aman', () => {
    const brokenJson = 'Bukan json sama sekali... error';
    const parsed = parseScreenerAiResponse(brokenJson);

    assert.strictEqual(parsed.sector, null);
    assert.strictEqual(parsed.minDividendYield, null);
    assert.ok(parsed.explanation.includes('tidak dapat diuraikan'));
  });

  it('4. filterStocksByAiCriteria menyaring data saham sesuai kriteria AI', () => {
    const mockStocks = [
      {
        ticker: 'BBCA',
        sector: 'Financials',
        price: 10000,
        fundamentals: { roe: 21, per: 20, pbv: 4.5, der: 4.0, dividendYield: 3.5 },
        kseiLatest: JSON.stringify({ bfi: 2.5, delta: { foreignShares: 1000000 } })
      },
      {
        ticker: 'BJBR',
        sector: 'Financials',
        price: 1100,
        fundamentals: { roe: 13, per: 7.5, pbv: 0.8, der: 5.0, dividendYield: 8.5 },
        kseiLatest: JSON.stringify({ bfi: 1.0, delta: { foreignShares: 50000 } })
      },
      {
        ticker: 'PTBA',
        sector: 'Energy',
        price: 2500,
        fundamentals: { roe: 18, per: 6.0, pbv: 1.2, der: 0.6, dividendYield: 12.0 },
        kseiLatest: JSON.stringify({ bfi: -1.0, delta: { foreignShares: -10000 } })
      }
    ];

    // Filter A: Sektor Financials dengan Dividen Yield >= 5%
    const criteriaA = {
      sector: 'Financials',
      minDividendYield: 5.0,
      minRoe: null,
      minOpm: null,
      maxPer: null,
      maxPbv: null,
      maxDer: null,
      smartMoneyOnly: false,
      syariahOnly: false
    };
    const resultsA = filterStocksByAiCriteria(mockStocks, criteriaA);
    assert.strictEqual(resultsA.length, 1);
    assert.strictEqual(resultsA[0].ticker, 'BJBR');

    // Filter B: Smart Money Accumulation Only
    const criteriaB = {
      sector: null,
      minDividendYield: null,
      minRoe: null,
      minOpm: null,
      maxPer: null,
      maxPbv: null,
      maxDer: null,
      smartMoneyOnly: true,
      syariahOnly: false
    };
    const resultsB = filterStocksByAiCriteria(mockStocks, criteriaB);
    assert.strictEqual(resultsB.length, 2);
    assert.ok(resultsB.some(s => s.ticker === 'BBCA'));
    assert.ok(resultsB.some(s => s.ticker === 'BJBR'));
    assert.ok(!resultsB.some(s => s.ticker === 'PTBA'));
  });

  it('5. filterStocksByAiCriteria menangani array kosong atau null secara aman', () => {
    const res1 = filterStocksByAiCriteria([], {});
    const res2 = filterStocksByAiCriteria(null, {});
    assert.deepStrictEqual(res1, []);
    assert.deepStrictEqual(res2, []);
  });
});
