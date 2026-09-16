import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  extractTickersFromText,
  buildPrecalculatedFinancialContext,
  buildAdvisorPromptMessages,
  parseThinkingAndResponse
} from '../src/lib/ai/chatAdvisorEngine.js';
import { aiPriorityMutex, AI_PRIORITY, runWithAiLock } from '../src/lib/ai/aiPriorityMutex.js';

describe('AI Stock Consultation & Advisor Suite', () => {
  it('1. extractTickersFromText mengekstrak kode saham 4 huruf dan mengabaikan stopword umum', () => {
    const text1 = 'Saya punya saham BBRI di modal 5200, apakah BISA kita hold atau DARI sekarang cut loss?';
    const tickers1 = extractTickersFromText(text1);
    assert.deepStrictEqual(tickers1, ['BBRI']);

    const text2 = 'Tolong bandingkan antara BMRI, BBCA, dan TLKM untuk dividen 1 tahun ke depan.';
    const tickers2 = extractTickersFromText(text2);
    assert.ok(tickers2.includes('BMRI'));
    assert.ok(tickers2.includes('BBCA'));
    assert.ok(tickers2.includes('TLKM'));
    assert.strictEqual(tickers2.length, 3);
  });

  it('2. buildPrecalculatedFinancialContext menghitung floating PnL dan simulasi averaging secara deterministik', () => {
    const stockMap = {
      BBRI: {
        ticker: 'BBRI',
        name: 'Bank Rakyat Indonesia',
        sector: 'Financials',
        price: 4800,
        changePercent: -1.5,
        fundamentals: { roe: 18.5, per: 11.2, pbv: 2.1, der: 5.2, dividendYield: 10.4 },
        technicals: { support: 4650, resistance: 5000 },
        kseiLatest: { bfi: 1.8 }
      }
    };

    const userPortfolios = [
      {
        ticker: 'BBRI',
        averagePrice: 5200,
        totalShares: 5000, // 50 lot
        investedValue: 26000000
      }
    ];

    const ctx = buildPrecalculatedFinancialContext({
      tickers: ['BBRI'],
      userPortfolios,
      stockMap
    });

    assert.strictEqual(ctx.length, 1);
    const bbri = ctx[0];
    assert.strictEqual(bbri.ticker, 'BBRI');
    assert.strictEqual(bbri.price, 4800);
    assert.strictEqual(bbri.divYield, 10.4);

    // Verifikasi matematika kepemilikan
    assert.ok(bbri.holdingDetail);
    assert.strictEqual(bbri.holdingDetail.avgPrice, 5200);
    assert.strictEqual(bbri.holdingDetail.totalLots, 50);
    // Floating Loss = ((4800 - 5200) / 5200) * 100 = -7.69%
    assert.strictEqual(bbri.holdingDetail.floatingPnLPct, -7.69);
    // Floating Loss nominal = (4800 * 5000) - 26,000,000 = -2,000,000
    assert.strictEqual(bbri.holdingDetail.floatingPnLRp, -2000000);

    // Simulasi averaging (+50 lot di 4.650):
    // Total modal baru = 26,000,000 + (4650 * 5000) = 49,250,000
    // Total lembar baru = 10,000
    // Avg baru = 4.925
    assert.strictEqual(bbri.holdingDetail.simulations[0].newAvgPrice, 4925);
  });

  it('3. buildAdvisorPromptMessages membatasi riwayat percakapan (sliding window) dan menyertakan aturan anti-halusinasi', () => {
    const history = [
      { role: 'user', content: 'Halo pesan 1' },
      { role: 'assistant', content: 'Jawaban 1' },
      { role: 'user', content: 'Halo pesan 2' },
      { role: 'assistant', content: 'Jawaban 2' },
      { role: 'user', content: 'Halo pesan 3' },
      { role: 'assistant', content: 'Jawaban 3' }
    ];

    const messages = buildAdvisorPromptMessages({
      history,
      userMessage: 'Pertanyaan terbaru',
      financialContext: [],
      maxHistoryTurns: 4
    });

    // 1 system prompt + 4 history messages + 1 user message = 6
    assert.strictEqual(messages.length, 6);
    assert.strictEqual(messages[0].role, 'system');
    assert.ok(messages[0].content.includes('ATURAN ANTI-HALUSINASI'));
    assert.ok(messages[0].content.includes('<think>'));
    assert.strictEqual(messages[messages.length - 1].content, 'Pertanyaan terbaru');
  });

  it('4. parseThinkingAndResponse memisahkan tag <think> dari konten final secara bersih', () => {
    const rawAiOutput = `<think>
1. Audit Fakta: BBRI harga 4.800, modal 5.200 (loss -7.69%).
2. Audit Risiko: Yield dividen 10.4% kuat, BFI positif akumulasi.
3. Formulasi: Sarankan averaging di support 4.650.
</think>

Berdasarkan analisis kuantitatif terhadap **BBRI**, posisi Anda saat ini floating loss **-7.69%**.

Rekomendasi taktis:
- **Averaging Down**: Siapkan order beli di area support **Rp 4.650**.`;

    const parsed = parseThinkingAndResponse(rawAiOutput);
    assert.ok(parsed.thinking.includes('Audit Fakta: BBRI'));
    assert.ok(!parsed.content.includes('<think>'));
    assert.ok(parsed.content.includes('Berdasarkan analisis kuantitatif'));
    assert.ok(parsed.content.includes('Rp 4.650'));
  });

  it('5. aiPriorityMutex memprioritaskan task HIGH di depan antrean LOW', async () => {
    const executionOrder = [];

    // Kunci mutex sementara
    const blockerPromise = aiPriorityMutex.runWithAiLock(async () => {
      await new Promise(r => setTimeout(r, 50));
      executionOrder.push('BLOCKER');
    }, AI_PRIORITY.NORMAL, 'blocker');

    // Masukkan task LOW (background worker)
    const lowPromise = aiPriorityMutex.runWithAiLock(async () => {
      executionOrder.push('LOW_TASK');
    }, AI_PRIORITY.LOW, 'background-worker');

    // Masukkan task HIGH (user chat)
    const highPromise = aiPriorityMutex.runWithAiLock(async () => {
      executionOrder.push('HIGH_TASK');
    }, AI_PRIORITY.HIGH, 'interactive-chat');

    await Promise.all([blockerPromise, lowPromise, highPromise]);

    // Verifikasi task HIGH dieksekusi sebelum task LOW meskipun task LOW masuk antre lebih dulu
    assert.deepStrictEqual(executionOrder, ['BLOCKER', 'HIGH_TASK', 'LOW_TASK']);
  });
});
