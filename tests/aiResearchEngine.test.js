import { describe, it } from 'node:test';
import assert from 'node:assert';

// Ekstraksi section regex yang disempurnakan (sama dengan implementasi ai-worker.js)
function extractSection(responseContent, sectionNum) {
  if (!responseContent || !sectionNum) return null;
  const regex = new RegExp(`(?:^|\\n)#{2,3}\\s*${sectionNum}[.:\\s][\\s\\S]*?(?=(?:\\n#{2,3}\\s*\\d|$))`, 'i');
  const match = responseContent.match(regex);
  return match ? match[0].trim() : null;
}

// Parser rekomendasi (ai-worker.js)
function parseBuyHoldSell(content) {
  if (!content) return 'HOLD';
  const cleanUpper = content.toUpperCase().replace(/[*_#[\]()]/g, ' ');
  const match = cleanUpper.match(/(?:KESIMPULAN|REKOMENDASI|VERDICT|RECOMMENDATION)\s*:\s*(BELI|BUY|JUAL|SELL|HOLD|TAHAN)/i);
  if (match) {
    const verdict = match[1].trim();
    if (verdict === 'BELI' || verdict === 'BUY') return 'BELI';
    if (verdict === 'JUAL' || verdict === 'SELL') return 'JUAL';
    return 'HOLD';
  }
  const tail = cleanUpper.slice(-400);
  if (tail.includes('BELI') || tail.includes(' BUY ')) return 'BELI';
  if (tail.includes('JUAL') || tail.includes(' SELL ')) return 'JUAL';
  return 'HOLD';
}

// Parser skor AI (ai-worker.js)
function parseAiScore(content, buyHoldSell) {
  if (!content) return 50;
  const clean = content.replace(/[*_#[\]()]/g, ' ');
  const match = clean.match(/(?:SKOR|SCORE|NILAI)\s*(?:AI)?\s*:\s*(\d{1,3})/i);
  if (match) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val) && val >= 0 && val <= 100) return val;
  }
  if (buyHoldSell === 'BELI' || buyHoldSell === 'BUY') return 85;
  if (buyHoldSell === 'JUAL' || buyHoldSell === 'SELL') return 30;
  return 50;
}

describe('AI Research Engine & Worker Architecture Suite', () => {
  const sampleReportStandard = `
## 1. Kesimpulan Fundamental & Kinerja Bisnis
BBCA membukukan pertumbuhan kredit 14% YoY didorong oleh segmen korporasi dan konsumer.

## 2. Valuasi & Harga Wajar
Valuasi PBV berada pada level 4.2x dengan PER 21x. Margin of safety tipis namun terkompensasi ROE tinggi.

## 3. Arah Tren & Momentum Teknikal
RSI 14 berada di area netral 54 dengan histogram MACD menunjukkan konvergensi bullish di atas MA20.

## 4. Analisis Sentimen Berita & Katalis Terkini
Sentimen dividen interim dan rilis kinerja Q2 memperkuat minat investor institusi asing.

## 5. Rekomendasi Akhir
SKOR AI: 88
KESIMPULAN: BELI
ALASAN SINGKAT: Fundamental solid dengan ROE prima di atas 21%.
`;

  it('1. Ekstraksi section harus sukses mengekstrak Bagian 2 (Valuasi) dan Bagian 3 (Tren)', () => {
    const valSection = extractSection(sampleReportStandard, 2);
    const trendSection = extractSection(sampleReportStandard, 3);

    assert.ok(valSection, 'Section 2 harus ditemukan');
    assert.ok(valSection.includes('Valuasi & Harga Wajar'), 'Harus berisi judul valuasi');
    assert.ok(valSection.includes('Margin of safety tipis'), 'Harus berisi konten valuasi');

    assert.ok(trendSection, 'Section 3 harus ditemukan');
    assert.ok(trendSection.includes('Arah Tren & Momentum'), 'Harus berisi judul tren');
    assert.ok(trendSection.includes('histogram MACD'), 'Harus berisi konten tren');
  });

  it('2. Ekstraksi section tahan terhadap variasi format markdown (titik dua, spasi, H3)', () => {
    const variantContent = `
### 2: Analisis Valuasi Saham
PER saat ini 12x vs rata-rata industri 15x.

## 3. Momentum Tren
Tren bullish jangka menengah.
`;
    const val = extractSection(variantContent, 2);
    assert.ok(val, 'Section 2 dengan variasi ### 2: harus tetap berhasil diekstrak');
    assert.ok(val.includes('PER saat ini 12x'));

    const trend = extractSection(variantContent, 3);
    assert.ok(trend, 'Section 3 harus berhasil diekstrak');
  });

  it('3. Parser rekomendasi harus mengenali BELI, JUAL, HOLD dengan variasi markdown', () => {
    assert.strictEqual(parseBuyHoldSell('**KESIMPULAN**: **BELI**'), 'BELI');
    assert.strictEqual(parseBuyHoldSell('VERDICT: SELL NOW'), 'JUAL');
    assert.strictEqual(parseBuyHoldSell('Rekomendasi: TAHAN'), 'HOLD');
    assert.strictEqual(parseBuyHoldSell('Teks panjang tanpa pola eksplisit tapi di akhir disarankan BELI.'), 'BELI');
  });

  it('4. Parser skor AI harus mengekstrak nilai integer 0-100 atau fallback secara akurat', () => {
    assert.strictEqual(parseAiScore('**SKOR AI**: 92', 'BELI'), 92);
    assert.strictEqual(parseAiScore('Nilai AI: 45', 'HOLD'), 45);
    // Fallback saat skor tidak tertulis eksplisit
    assert.strictEqual(parseAiScore('Tanpa skor numerik', 'BELI'), 85);
    assert.strictEqual(parseAiScore('Tanpa skor numerik', 'JUAL'), 30);
    assert.strictEqual(parseAiScore('Tanpa skor numerik', 'HOLD'), 50);
  });

  it('5. Logika deteksi task macet (stale recovery) harus mendeteksi task > 10 menit', () => {
    const STALE_TIMEOUT_MS = 10 * 60 * 1000;
    const now = Date.now();

    const freshTask = { status: 'PROCESSING', updatedAt: new Date(now - 2 * 60 * 1000) }; // 2 menit lalu
    const staleTask = { status: 'PROCESSING', updatedAt: new Date(now - 15 * 60 * 1000) }; // 15 menit lalu

    const isFreshStale = freshTask.status === 'PROCESSING' && (now - freshTask.updatedAt.getTime() > STALE_TIMEOUT_MS);
    const isOldStale = staleTask.status === 'PROCESSING' && (now - staleTask.updatedAt.getTime() > STALE_TIMEOUT_MS);

    assert.strictEqual(isFreshStale, false, 'Task 2 menit yang lalu bukan stale');
    assert.strictEqual(isOldStale, true, 'Task 15 menit yang lalu harus terdeteksi stale');
  });

  it('6. Batas kesegaran riset 30 hari vs opsi force', () => {
    const CACHE_DAYS = 30;
    const now = Date.now();

    const research20DaysAgo = new Date(now - 20 * 24 * 60 * 60 * 1000);
    const research40DaysAgo = new Date(now - 40 * 24 * 60 * 60 * 1000);

    const is20Valid = (now - research20DaysAgo.getTime()) <= (CACHE_DAYS * 24 * 60 * 60 * 1000);
    const is40Valid = (now - research40DaysAgo.getTime()) <= (CACHE_DAYS * 24 * 60 * 60 * 1000);

    assert.strictEqual(is20Valid, true, 'Riset 20 hari lalu masih dalam masa validitas');
    assert.strictEqual(is40Valid, false, 'Riset 40 hari lalu sudah kedaluwarsa dan boleh dianalisis ulang');
  });
});
