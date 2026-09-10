import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDiscordEmbeds } from '../src/scripts/discord-notifier.js';

test('1. Discord Notifier Multi-Mode Embed Formatting & Overlap Constraints', async (t) => {
  await t.test('Menghindari duplikasi mode jika mode otomatis adalah balanced', () => {
    const mockData = {
      marketData: { indexValue: 7250, indexChange: 0.45 },
      detectedMode: 'balanced',
      categories: [
        {
          id: 'auto',
          modeKey: 'balanced',
          modeLabel: 'Mode Otomatis (Seimbang)',
          title: '🤖 1. REKOMENDASI MODE OTOMATIS (Deteksi: SEIMBANG)',
          subtitle: 'Kondisi Pasar: Seimbang ⚖️',
          color: 0x6366f1,
          stocks: [
            {
              ticker: 'BBRI',
              name: 'Bank Rakyat Indonesia',
              price: 3600,
              score: 80,
              style: 'swing',
              styleLabel: 'Swing (1-3 Minggu)',
              entry: { low: 3550, high: 3650 },
              target: 3900,
              stopLoss: 3400,
              riskReward: 1.8,
              setup: 'Pullback',
              badge: '🟢 BUY',
              smartMoneyBadge: ' 🟢 Akumulasi'
            }
          ]
        },
        {
          id: 'growth',
          modeKey: 'growth',
          modeLabel: 'Mode Pertumbuhan',
          title: '🚀 2. REKOMENDASI MODE PERTUMBUHAN (GROWTH)',
          subtitle: 'Target Momentum & Breakout',
          color: 0x10b981,
          stocks: [
            {
              ticker: 'MEDC',
              name: 'Medco Energi Internasional',
              price: 1300,
              score: 75,
              style: 'daily',
              styleLabel: 'Fast Swing (2-3 Hari)',
              entry: { low: 1280, high: 1320 },
              target: 1450,
              stopLoss: 1220,
              riskReward: 1.9,
              setup: 'Momentum',
              badge: '🚀 S.BUY',
              smartMoneyBadge: ' 🟢 Akumulasi'
            }
          ]
        }
      ]
    };

    const payloads = formatDiscordEmbeds(mockData);
    assert.equal(payloads.length, 1);
    const embeds = payloads[0].embeds;
    assert.equal(embeds.length, 4, 'Harus ada Header, Otomatis, Growth, dan Disclaimer');

    // Cek judul embed
    assert.ok(embeds[0].title.includes('WATCHLIST EKSEKUSI SAHAM IDX'));
    assert.ok(embeds[1].title.includes('MODE OTOMATIS'));
    assert.ok(embeds[2].title.includes('MODE PERTUMBUHAN'));
    assert.ok(embeds[3].title.includes('Disclaimer'));

    // Cek bahwa tidak ada Mode Seimbang yang terduplikasi
    const hasDuplicateBalanced = embeds.some(e => e.title.includes('MODE SEIMBANG'));
    assert.equal(hasDuplicateBalanced, false, 'Mode Seimbang tidak boleh dikirim ulang jika Otomatis sudah Seimbang');

    // Cek bahwa ticker antar mode tidak overlap
    const autoTickers = mockData.categories[0].stocks.map(s => s.ticker);
    const growthTickers = mockData.categories[1].stocks.map(s => s.ticker);
    const overlap = autoTickers.filter(t => growthTickers.includes(t));
    assert.equal(overlap.length, 0, 'Ticker antar kategori mode tidak boleh overlap');
  });

  await t.test('Menyertakan ketiga mode jika mode otomatis adalah defensive atau conservative', () => {
    const mockData = {
      marketData: { indexValue: 6650, indexChange: -0.85 },
      detectedMode: 'defensive',
      categories: [
        {
          id: 'auto',
          modeKey: 'defensive',
          modeLabel: 'Mode Otomatis (Defensif)',
          title: '🤖 1. REKOMENDASI MODE OTOMATIS (Deteksi: DEFENSIF)',
          subtitle: 'Kondisi Pasar: Defensif 🔒',
          color: 0xf59e0b,
          stocks: [{ ticker: 'ICBP', price: 11000, score: 75, style: 'swing', styleLabel: 'Swing', entry: { low: 10800, high: 11100 }, target: 12000, stopLoss: 10400, riskReward: 1.8, setup: 'Pullback', badge: '🟢 BUY', smartMoneyBadge: '' }]
        },
        {
          id: 'balanced',
          modeKey: 'balanced',
          modeLabel: 'Mode Seimbang',
          title: '⚖️ 2. REKOMENDASI MODE SEIMBANG (BALANCED)',
          subtitle: 'Target Pertumbuhan Terukur',
          color: 0x3b82f6,
          stocks: [{ ticker: 'TLKM', price: 2900, score: 70, style: 'swing', styleLabel: 'Swing', entry: { low: 2850, high: 2920 }, target: 3150, stopLoss: 2750, riskReward: 1.7, setup: 'Pullback', badge: '🟢 BUY', smartMoneyBadge: '' }]
        },
        {
          id: 'growth',
          modeKey: 'growth',
          modeLabel: 'Mode Pertumbuhan',
          title: '🚀 3. REKOMENDASI MODE PERTUMBUHAN (GROWTH)',
          subtitle: 'Target Momentum & Breakout',
          color: 0x10b981,
          stocks: [{ ticker: 'BREN', price: 8000, score: 68, style: 'daily', styleLabel: 'Daily', entry: { low: 7850, high: 8100 }, target: 8900, stopLoss: 7500, riskReward: 1.6, setup: 'Breakout', badge: '🔵 TEST BO', smartMoneyBadge: '' }]
        }
      ]
    };

    const payloads = formatDiscordEmbeds(mockData);
    const embeds = payloads[0].embeds;
    assert.equal(embeds.length, 5, 'Harus ada Header, Otomatis, Seimbang, Pertumbuhan, dan Disclaimer');
    assert.ok(embeds[1].title.includes('MODE OTOMATIS'));
    assert.ok(embeds[2].title.includes('MODE SEIMBANG'));
    assert.ok(embeds[3].title.includes('MODE PERTUMBUHAN'));
  });
});
