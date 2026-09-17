import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildResearchPrompt, detectSectorFramework } from '../src/lib/ai/prompter.js';
import { buildSectorThematicQueries } from '../src/lib/ai/search.js';

describe('AI Sector Prompter & Thematic Intelligence Suite', () => {
  it('1. Deteksi sektor AUTO mengidentifikasi Otomotif & Komponen beserta model aging fleet & ICE vs EV', () => {
    const framework = detectSectorFramework('Consumer Cyclicals', 'Auto Components', 'AUTO');
    assert.ok(framework.name.includes('Automotive & Component'));
    assert.ok(framework.rubric.includes('Aging Vehicle Fleet Model'), 'Wajib memuat model penuaan armada kendaraan');
    assert.ok(framework.rubric.includes('GAIKINDO'), 'Wajib memuat data asosiasi otomotif GAIKINDO');
    assert.ok(framework.rubric.includes('ICE (Internal Combustion Engine) vs EV'), 'Wajib memuat komparasi ICE vs EV');
    assert.ok(framework.rubric.includes('OEM') && framework.rubric.includes('Aftermarket'), 'Wajib memuat split OEM vs Aftermarket');
  });

  it('2. Deteksi sektor BBCA mengidentifikasi Perbankan beserta CASA franchise & NPL coverage', () => {
    const framework = detectSectorFramework('Financials', 'Banks', 'BBCA');
    assert.ok(framework.name.includes('Banking & Financial Institutions'));
    assert.ok(framework.rubric.includes('CASA Franchise'), 'Wajib memuat evaluasi dana murah CASA');
    assert.ok(framework.rubric.includes('NPL') && framework.rubric.includes('LAR'), 'Wajib memuat rasio kualitas kredit');
    assert.ok(framework.rubric.includes('BOPO') || framework.rubric.includes('CIR'), 'Wajib memuat efisiensi operasional');
  });

  it('3. Deteksi sektor ADRO mengidentifikasi Energi & Batubara beserta cost curve & transisi hijau', () => {
    const framework = detectSectorFramework('Energy', 'Coal', 'ADRO');
    assert.ok(framework.name.includes('Energy & Natural Resources'));
    assert.ok(framework.rubric.includes('Stripping Ratio'), 'Wajib memuat stripping ratio');
    assert.ok(framework.rubric.includes('Domestic Market Obligation (DMO)'), 'Wajib memuat DMO');
    assert.ok(framework.rubric.includes('Green Transition') || framework.rubric.includes('smelter'), 'Wajib memuat transisi hilirisasi');
  });

  it('4. Deteksi sektor TAPG mengidentifikasi Agribisnis CPO beserta mandat B35/B40 & yield FFB', () => {
    const framework = detectSectorFramework('Consumer Non-Cyclicals', 'Agricultural Products', 'TAPG');
    assert.ok(framework.name.includes('Agribusiness & CPO Plantations'));
    assert.ok(framework.rubric.includes('Mandat Biodiesel B35/B40'), 'Wajib memuat regulasi biodiesel B35/B40');
    assert.ok(framework.rubric.includes('Plantation Age Profile'), 'Wajib memuat profil usia tanaman');
    assert.ok(framework.rubric.includes('FFB'), 'Wajib memuat yield tandan buah segar');
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
});

