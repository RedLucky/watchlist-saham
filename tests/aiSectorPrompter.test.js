import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildResearchPrompt, detectSectorFramework } from '../src/lib/ai/prompter.js';
import { buildSectorThematicQueries, isClickbaitTitle, calculateSignalScore } from '../src/lib/ai/search.js';

describe('AI Sector Prompter & Thematic Intelligence Suite', () => {
  it('1. Deteksi sektor AUTO mengidentifikasi Otomotif & Komponen beserta model aging fleet & ICE vs EV', () => {
    const framework = detectSectorFramework('Consumer Cyclicals', 'Auto Components', 'AUTO');
    assert.strictEqual(framework.id, 'automotive-parts');
    assert.ok(framework.name.includes('Automotive'));
    assert.ok(framework.rubric.includes('Aging Vehicle Fleet Model'), 'Wajib memuat model penuaan armada kendaraan');
    assert.ok(framework.rubric.includes('GAIKINDO'), 'Wajib memuat data asosiasi otomotif GAIKINDO');
    assert.ok(framework.rubric.includes('ICE vs EV') || framework.rubric.includes('Powertrain Transition'), 'Wajib memuat transisi EV');
    assert.ok(framework.rubric.includes('OEM') && framework.rubric.includes('Aftermarket'), 'Wajib memuat split OEM vs Aftermarket');
  });

  it('2. Deteksi sektor BBCA mengidentifikasi Perbankan beserta CASA franchise & NPL coverage', () => {
    const framework = detectSectorFramework('Financials', 'Banks', 'BBCA');
    assert.strictEqual(framework.id, 'bank');
    assert.ok(framework.name.includes('Bank'));
    assert.ok(framework.rubric.includes('CASA Ratio'), 'Wajib memuat evaluasi dana murah CASA');
    assert.ok(framework.rubric.includes('NPL') && framework.rubric.includes('LDR'), 'Wajib memuat rasio kualitas kredit');
    assert.ok(framework.rubric.includes('BOPO') || framework.rubric.includes('CIR'), 'Wajib memuat efisiensi operasional');
  });

  it('3. Deteksi sektor ADRO mengidentifikasi Energi & Batubara beserta cost curve & transisi hijau', () => {
    const framework = detectSectorFramework('Energy', 'Coal', 'ADRO');
    assert.strictEqual(framework.id, 'coal-mining');
    assert.ok(framework.name.includes('Coal') || framework.name.includes('Batu Bara'));
    assert.ok(framework.rubric.includes('Stripping Ratio'), 'Wajib memuat stripping ratio');
    assert.ok(framework.rubric.includes('PLN DMO'), 'Wajib memuat DMO');
    assert.ok(framework.rubric.includes('green diversification') || framework.rubric.includes('cost curves'), 'Wajib memuat kurva biaya/transisi');
  });

  it('4. Deteksi sektor TAPG mengidentifikasi Agribisnis CPO beserta mandat B35/B40 & yield FFB', () => {
    const framework = detectSectorFramework('Consumer Non-Cyclicals', 'Agricultural Products', 'TAPG');
    assert.strictEqual(framework.id, 'cpo');
    assert.ok(framework.name.includes('CPO') || framework.name.includes('Sawit'));
    assert.ok(framework.rubric.includes('Biodiesel B35/B40'), 'Wajib memuat regulasi biodiesel B35/B40');
    assert.ok(framework.rubric.includes('Age Profile'), 'Wajib memuat profil usia tanaman');
    assert.ok(framework.rubric.includes('FFB'), 'Wajib memuat yield tandan buah segar');
  });

  it('4b. Deteksi sektor unggas CPIN mengidentifikasi Poultry beserta DOC price & feed margin', () => {
    const framework = detectSectorFramework('Consumer Non-Cyclicals', 'Animal Feed', 'CPIN');
    assert.strictEqual(framework.id, 'poultry');
    assert.ok(framework.name.includes('Poultry'));
    assert.ok(framework.rubric.includes('DOC Price'));
    assert.ok(framework.rubric.includes('Feed Margin'));
  });

  it('4c. Deteksi sektor pelayaran SMDR mengidentifikasi Shipping beserta freight rate & umur armada', () => {
    const framework = detectSectorFramework('Transportation & Logistics', 'Marine Transportation', 'SMDR');
    assert.strictEqual(framework.id, 'shipping');
    assert.ok(framework.name.includes('Shipping'));
    assert.ok(framework.rubric.includes('Freight Rate'));
    assert.ok(framework.rubric.includes('Vessel Utilization'));
  });

  it('4d. Deteksi sektor rumah sakit MIKA mengidentifikasi Rumah Sakit beserta BOR & LOS', () => {
    const framework = detectSectorFramework('Healthcare', 'Healthcare Providers', 'MIKA');
    assert.strictEqual(framework.id, 'rumah-sakit');
    assert.ok(framework.name.includes('Rumah Sakit'));
    assert.ok(framework.rubric.includes('BOR (Bed Occupancy Ratio)'));
  });


  it('5. buildResearchPrompt menghasilkan prompt 7-babak lengkap dengan compliance rules', () => {
    const mockStock = {
      ticker: 'AUTO',
      name: 'PT Astra Otoparts Tbk',
      sector: 'Consumer Cyclicals',
      subSector: 'Auto Components',
      price: 2150,
      changePercent: 1.5,
      fundamentals: JSON.stringify({
        roe: 16.5,
        roa: 11.2,
        opm: 9.8,
        npm: 8.5,
        der: 0.28,
        eps: 380,
        per: 5.6,
        pbv: 0.85,
        pegRatio: 0.65,
        dividendYield: 6.8,
        currentRatio: 2.1
      }),
      technicals: JSON.stringify({
        rsi: 54.2,
        macdHistogram: 3.5,
        ma20: 2100,
        ma50: 2050,
        high52w: 2450,
        low52w: 1850
      })
    };

    const prompt = buildResearchPrompt(mockStock, '[Berita Terkini]\nAUTO siapkan capex Rp 500 miliar.');

    // Verifikasi 7 babak wajib
    assert.ok(prompt.includes('## 1. Bedah Unit Bisnis & Rencana Strategis Perusahaan'));
    assert.ok(prompt.includes('## 2. Analisis Kebutuhan Pasar, Siklus Industri & Market-Fit'));
    assert.ok(prompt.includes('## 3. Keunggulan Bersaing (Moat) & Posisi vs Kompetitor'));
    assert.ok(prompt.includes('## 4. Analisis Fundamental & Valuasi Saham'));
    assert.ok(prompt.includes('## 5. Arah Tren & Momentum Teknikal'));
    assert.ok(prompt.includes('## 6. Analisis Sentimen Berita & Katalis Terkini'));
    assert.ok(prompt.includes('## 7. Prospek 1–2 Tahun ke Depan & Rekomendasi Akhir'));

    // Verifikasi kepatuhan format output
    assert.ok(prompt.includes('SKOR AI: [0-100]'));
    assert.ok(prompt.includes('KESIMPULAN: [BELI / JUAL / HOLD]'));
    assert.ok(prompt.includes('ALASAN SINGKAT:'));
  });

  it('6. buildResearchPrompt tangguh terhadap data finansial dan teknikal null / kosong', () => {
    const emptyStock = {
      ticker: 'TEST',
      name: 'PT Test Tbk',
      sector: null,
      subSector: null,
      price: 1000,
      changePercent: null,
      fundamentals: null,
      technicals: null
    };

    const prompt = buildResearchPrompt(emptyStock, '');
    assert.ok(prompt.includes('TEST'));
    assert.ok(prompt.includes('Rp 1.000'));
    assert.ok(prompt.includes('## 1. Bedah Unit Bisnis'));
  });

  it('7. buildSectorThematicQueries menghasilkan query tematik spesifik capex, industri, dan kompetitor berbasis kata kunci murni', () => {
    const autoQueries = buildSectorThematicQueries('AUTO', 'Astra Otoparts', 'Consumer Cyclicals', 'Auto Components');
    assert.ok(autoQueries.length >= 3);
    assert.ok(autoQueries.some(q => q.category === 'Rencana Bisnis & Capex'));
    assert.ok(autoQueries.some(q => q.category === 'Siklus Industri & Kebutuhan Pasar'));
    assert.ok(autoQueries.some(q => q.category === 'Pangsa Pasar & Kompetitor'));

    // Pastikan query mengandung keyword industri spesifik, bukan sekadar ticker
    const industryQuery = autoQueries.find(q => q.category === 'Siklus Industri & Kebutuhan Pasar');
    assert.ok(industryQuery.query.includes('suku cadang') && industryQuery.query.includes('mobil listrik EV'));

    const bankQueries = buildSectorThematicQueries('BBCA', 'Bank Central Asia', 'Financials', 'Banks');
    assert.ok(bankQueries.some(q => q.category === 'Kredit, CASA & Kualitas Aset'));
    assert.ok(bankQueries.some(q => q.category === 'Kompetisi & Transformasi Digital'));
    const bankCreditQuery = bankQueries.find(q => q.category === 'Kredit, CASA & Kualitas Aset');
    assert.ok(bankCreditQuery.query.includes('dana murah CASA') && bankCreditQuery.query.includes('NPL'));
  });

  it('8. isClickbaitTitle menyaring rekomendasi harian spekulatif dan meloloskan aksi korporasi riil', () => {
    // Judul-judul clickbait / rekomendasi trading harian yang wajib dibuang
    const clickbaits = [
      'Rekomendasi Saham Hari Ini: Ada BBCA, BBRI, ASII, Simak Target Harganya',
      'Menu Saham Pilihan 17 September: Cek Potensi Cuan BBNI',
      'Saham BBCA Melemah Hari Ini, Saatnya Beli?',
      'Intip Saham BBCA Hari Ini pada Sesi Pertama',
      'IHSG Merah Membara, Cek Rekomendasi Saham Layak Beli Hari Ini',
      'Ide Trading Hari Ini: Saham ADRO dan PTBA Menarik Dicermati'
    ];

    for (const title of clickbaits) {
      assert.strictEqual(isClickbaitTitle(title), true, `Gagal memfilter clickbait: ${title}`);
    }

    // Judul-judul rilis aksi korporasi / kinerja nyata yang wajib lolos
    const legitimateNews = [
      'Laba Bersih BBCA Capai Rp 50 Triliun di Kuartal III-2026',
      'Astra Otoparts (AUTO) Anggarkan Belanja Modal Capex Rp 500 Miliar',
      'Bank Mandiri Siap Bagikan Dividen Interim Rp 25 per Saham',
      'ADRO Realisasikan Ekspansi Smelter Aluminium di Kaltara',
      'Pendapatan Astra Otoparts Tumbuh 12 Persen Terdorong Ekspor'
    ];

    for (const title of legitimateNews) {
      assert.strictEqual(isClickbaitTitle(title), false, `Salah memfilter berita fundamental: ${title}`);
    }
  });

  it('9. calculateSignalScore memprioritaskan artikel dengan deskripsi kaya, angka riil, dan media kredibel', () => {
    const highQualityArticle = {
      title: 'Astra Otoparts Siapkan Belanja Modal Capex Rp 500 Miliar untuk Pabrik Baru',
      desc: 'PT Astra Otoparts Tbk (AUTO) mengalokasikan belanja modal capex sebesar Rp 500 miliar guna mendanai ekspansi lini perakitan komponen dan pengisian daya kendaraan listrik.',
      source: 'Bisnis.com'
    };

    const noisyListicle = {
      title: 'IHSG Melemah, Saham BBCA, BBRI, BMRI, BBNI, ASII, TLKM Dilepas Asing',
      desc: '',
      source: 'Unknown Blog'
    };

    const highScore = calculateSignalScore(highQualityArticle.title, highQualityArticle.desc, highQualityArticle.source);
    const lowScore = calculateSignalScore(noisyListicle.title, noisyListicle.desc, noisyListicle.source);

    assert.ok(highScore >= 60, `Skor artikel berkualitas tinggi harus >= 60, didapat: ${highScore}`);
    assert.ok(highScore > lowScore, `Skor artikel substantif (${highScore}) wajib lebih tinggi dari listicle tanpa cuplikan (${lowScore})`);
  });

  it('10. buildResearchPrompt menyertakan instruksi ANTI-CLICKBAIT & STRICT FACT-FILTERING MANDATE', () => {
    const sampleStock = {
      ticker: 'BBCA',
      name: 'PT Bank Central Asia Tbk',
      sector: 'Financials',
      subSector: 'Banks',
      price: 10200,
      fundamentals: JSON.stringify({ roe: 21.5, der: 4.2 }),
      technicals: JSON.stringify({ rsi: 55 })
    };

    const prompt = buildResearchPrompt(sampleStock, '[Berita Utama]\n- Dividen interim cair.');
    assert.ok(prompt.includes('[ANTI-CLICKBAIT FILTER]'), 'Prompt harus memiliki header anti-clickbait');
    assert.ok(prompt.includes('[ANTI-CLICKBAIT & STRICT FACT-FILTERING MANDATE]'), 'Babak 6 harus memiliki mandat anti-clickbait');
    assert.ok(prompt.includes('Abaikan judul sensasional, rekomendasi harian broker'), 'Wajib menginstruksikan pengabaian rekomendasi broker harian');
  });
});


