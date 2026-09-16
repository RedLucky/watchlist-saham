import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractTickerAndIntent,
  parseBuyHoldSell,
  parseAiScore,
  extractReason,
  buildDiscordEmbed,
  STOP_WORDS
} from '../src/scripts/discord-bot.js';

test('1. Discord Bot Ticker & Intent Parsing Suite', async (t) => {
  await t.test('Mengekstrak ticker ELSA dari kalimat natural language', async () => {
    const res = await extractTickerAndIntent('tolong cek harga elsa sekarang dan analisamu apa?');
    assert.ok(res !== null, 'Harus mendeteksi ticker');
    assert.equal(res.ticker, 'ELSA');
    assert.equal(res.forceRefresh, false);
  });

  await t.test('Mendeteksi ticker BBRI dari pesan ringkas', async () => {
    const res = await extractTickerAndIntent('analisa bbri dong');
    assert.ok(res !== null);
    assert.equal(res.ticker, 'BBRI');
    assert.equal(res.forceRefresh, false);
  });

  await t.test('Mendeteksi intent analisa ulang (force refresh)', async () => {
    const res = await extractTickerAndIntent('analisa ulang elsa');
    assert.ok(res !== null);
    assert.equal(res.ticker, 'ELSA');
    assert.equal(res.forceRefresh, true);
  });

  await t.test('Mengabaikan percakapan biasa tanpa ticker saham', async () => {
    const res = await extractTickerAndIntent('halo apa kabar kamu hari ini?');
    assert.equal(res, null);
  });

  await t.test('Mengabaikan stop words 4 huruf bahasa Indonesia', async () => {
    assert.ok(STOP_WORDS.has('YANG'));
    assert.ok(STOP_WORDS.has('DONG'));
    assert.ok(STOP_WORDS.has('BISA'));
    assert.ok(STOP_WORDS.has('PADA'));
  });
});

test('2. Discord Bot Recommendation & Score Parser Suite', async (t) => {
  await t.test('Mengekstrak rekomendasi BELI, JUAL, dan HOLD secara akurat', () => {
    assert.equal(parseBuyHoldSell('KESIMPULAN: **BELI**\nALASAN: Valuasi murah'), 'BELI');
    assert.equal(parseBuyHoldSell('REKOMENDASI: JUAL\nALASAN: Margin turun drastis'), 'JUAL');
    assert.equal(parseBuyHoldSell('VERDICT: HOLD'), 'HOLD');
    assert.equal(parseBuyHoldSell(''), 'HOLD');
  });

  await t.test('Mengekstrak skor kuantitatif AI (0-100)', () => {
    assert.equal(parseAiScore('SKOR AI: 85\nKESIMPULAN: BELI', 'BELI'), 85);
    assert.equal(parseAiScore('SKOR KUANTITATIF: 42', 'HOLD'), 42);
    assert.equal(parseAiScore('Tidak ada skor tertulis', 'BELI'), 75);
    assert.equal(parseAiScore('Tidak ada skor tertulis', 'JUAL'), 25);
  });

  await t.test('Mengekstrak alasan ringkas dari hasil riset', () => {
    const content = '## 1. Kesimpulan\nBagus.\n## 4. Rekomendasi Akhir\nKESIMPULAN: BELI\nALASAN SINGKAT: Valuasi PER rendah dengan prospek dividen tinggi.';
    const reason = extractReason(content);
    assert.ok(reason.includes('Valuasi PER rendah'));
  });
});

test('3. Discord Bot Embed Builder Suite', async (t) => {
  await t.test('Membangun Discord Embed untuk hasil riset ter-cache', () => {
    const mockStock = {
      ticker: 'ELSA',
      name: 'Elnusa Tbk',
      price: 725,
      changePercent: 1.25,
      sector: 'Energy',
      fundamentals: JSON.stringify({ per: 6.5, pbv: 0.8, roe: 14.5, der: 0.4 })
    };
    const mockResearch = {
      buyHoldSell: 'BELI',
      score: 82,
      content: 'ALASAN SINGKAT: Kinerja operasional solid dan terdiskon.',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 hari lalu
    };

    const embed = buildDiscordEmbed(mockStock, mockResearch, true, 3);
    const json = embed.toJSON();

    assert.ok(json.title.includes('ELSA'));
    assert.equal(json.color, 0x10B981); // Hijau untuk BELI
    assert.ok(json.footer.text.includes('3 hari yang lalu'));
    assert.ok(json.fields.some(f => f.name.includes('Harga Terkini')));
    assert.ok(json.fields.some(f => f.name.includes('Rekomendasi AI') && f.value.includes('BELI')));
  });

  await t.test('Membangun Discord Embed untuk riset baru (warna kuning untuk HOLD)', () => {
    const mockStock = {
      ticker: 'BBRI',
      name: 'Bank Rakyat Indonesia',
      price: 3350,
      changePercent: -0.5,
      sector: 'Financials',
      fundamentals: JSON.stringify({ per: 10.2, pbv: 1.6, roe: 18.0, der: 1.1 })
    };
    const mockResearch = {
      buyHoldSell: 'HOLD',
      score: 55,
      content: 'ALASAN SINGKAT: Menunggu konfirmasi breakout resisten.',
      createdAt: new Date()
    };

    const embed = buildDiscordEmbed(mockStock, mockResearch, false, 0, 85.2);
    const json = embed.toJSON();

    assert.equal(json.color, 0xF59E0B); // Kuning untuk HOLD
    assert.ok(json.footer.text.includes('85.2s'));
  });
});

