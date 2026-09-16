import { describe, it } from 'node:test';
import assert from 'node:assert';
import { analyzeNewsSentiment } from '../src/lib/newsSentimentEngine.js';

describe('Bloomberg NSENT: News Sentiment & Catalyst Tagging Suite', () => {
  it('1. Mendeteksi sentimen positif dan katalis dividen & laba', () => {
    const mockArticles = [
      { title: 'Laba Bersih BBCA Melonjak Rekor Tertinggi di Semester I 2026', summary: 'Kinerja positif didorong oleh pertumbuhan kredit.' },
      { title: 'BBCA Siap Tebar Dividen Tunai Jumbo Interim', summary: 'Cum date dijadwalkan akhir bulan.' }
    ];

    const result = analyzeNewsSentiment(mockArticles);

    assert.ok(result.score > 0, 'Skor harus positif');
    assert.strictEqual(result.badgeColor, 'emerald');
    assert.ok(result.positiveMentions >= 2);
    assert.strictEqual(result.negativeMentions, 0);
    assert.ok(result.catalystTags.some(t => t.includes('Dividen')));
    assert.ok(result.catalystTags.some(t => t.includes('Laba')));
  });

  it('2. Mendeteksi sentimen negatif dan katalis risiko hukum / utang', () => {
    const mockArticles = [
      { title: 'Emiten Terancam Pailit Akibat Utang Bengkak dan Gagal Bayar', summary: 'Kreditur ajukan gugatan PKPU di pengadilan.' },
      { title: 'Suspensi Saham Diperpanjang karena Belum Bayar Denda Bursa', summary: 'Perusahaan mengalami defisit dan rugi operasional.' }
    ];

    const result = analyzeNewsSentiment(mockArticles);

    assert.ok(result.score < 0, 'Skor harus negatif');
    assert.strictEqual(result.badgeColor, 'rose');
    assert.ok(result.negativeMentions >= 2);
    assert.ok(result.catalystTags.some(t => t.includes('Risiko Hukum / Utang')));
  });

  it('3. Membatasi rentang skor antara -100 dan +100', () => {
    const extremePositiveArticles = Array(10).fill({
      title: 'Laba meroket dividen rekor ekspansi akuisisi untung tumbuh kontrak bullish buyback profit surge'
    });

    const resultPos = analyzeNewsSentiment(extremePositiveArticles);
    assert.strictEqual(resultPos.score, 100);

    const extremeNegativeArticles = Array(10).fill({
      title: 'Rugi anjlok merosot pailit gugatan suspensi utang default denda penipuan tekor collapse'
    });

    const resultNeg = analyzeNewsSentiment(extremeNegativeArticles);
    assert.strictEqual(resultNeg.score, -100);
  });

  it('4. Menangani input berita kosong atau non-array secara aman', () => {
    const resEmpty = analyzeNewsSentiment([]);
    const resNull = analyzeNewsSentiment(null);

    assert.strictEqual(resEmpty.score, 0);
    assert.strictEqual(resEmpty.articlesCount, 0);
    assert.deepStrictEqual(resEmpty.catalystTags, []);

    assert.strictEqual(resNull.score, 0);
    assert.strictEqual(resNull.articlesCount, 0);
  });
});
