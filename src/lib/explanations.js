// Penjelasan Generator
// Membuat penjelasan ramah pemula dalam bahasa yang sederhana untuk setiap pilihan saham

import { getSectorLabelID } from './sectorUniverse';

export function generateExplanations(stock, subScores, tradeSetup, sectorStrength) {
  const explanations = [];
  const sectorName = getSectorLabelID(stock.sector);

  // Penjelasan Fundamental
  if (subScores.fundamental.score >= 75) {
    const roe = stock.fundamentals.roe;
    const roeStr = Number.isFinite(roe) ? `${roe.toFixed(1)}%` : 'tinggi';
    explanations.push(
      `Fundamental kuat — ROE sebesar ${roeStr} menunjukkan perusahaan sangat efisien dalam menghasilkan laba dari modal pemegang saham.`
    );
  } else if (subScores.fundamental.score >= 50) {
    explanations.push('Fundamental cukup baik — perusahaan memiliki kinerja keuangan yang stabil.');
  }

  // Penjelasan Sektor
  if (sectorStrength && sectorStrength.rank <= 2) {
    explanations.push(
      `Sektor ${sectorName} adalah salah satu yang terkuat saat ini — saham di sektor yang kuat cenderung berkinerja lebih baik.`
    );
  } else if (sectorStrength && sectorStrength.rank <= 5) {
    explanations.push(
      `Sektor ${sectorName} menunjukkan performa di atas rata-rata akhir-akhir ini.`
    );
  }

  // Penjelasan Smart Money
  if (subScores.smartMoney.score >= 75) {
    explanations.push(
      'Terdeteksi akumulasi smart money — investor institusi (pemain besar) telah membeli saham ini secara bertahap selama beberapa hari terakhir.'
    );
  } else if (subScores.smartMoney.score >= 50) {
    explanations.push(
      'Ada aktivitas pembelian institusi — pemain besar mungkin sedang mengambil posisi.'
    );
  }

  // Penjelasan Teknikal/Entry
  const setupLower = (tradeSetup.setup || '').toLowerCase();
  if (setupLower === 'pullback') {
    explanations.push(
      'Harga sedang koreksi (pullback) ke level support — ini biasanya titik masuk risiko rendah karena Anda membeli dekat harga "lantai".'
    );
  } else if (setupLower === 'breakout') {
    explanations.push(
      'Harga menembus level resistance dengan volume kuat — ini bisa menandakan awal dari pergerakan naik baru.'
    );
  } else if (setupLower === 'scalp' || setupLower === 'scalping') {
    explanations.push(
      'Momentum scalping sangat kuat — harga bergerak agresif di atas MA9 dengan konfirmasi volume tinggi.'
    );
  } else if (subScores.technical.score >= 60) {
    explanations.push(
      'Tren teknikal positif — arah harga keseluruhan sedang bergerak naik.'
    );
  }

  // Penjelasan Valuasi
  if (subScores.valuation.score >= 75) {
    explanations.push(
      'Harga saham tampak murah (undervalued) dibanding perusahaan sejenis di sektornya — ada potensi harga mengejar ketertinggalan.'
    );
  }

  // Penjelasan Dividen
  if (subScores.dividend.score >= 70) {
    const dy = stock.fundamentals.dividendYield;
    const dyStr = Number.isFinite(dy) ? `${dy.toFixed(1)}%` : 'baik';
    explanations.push(
      `Yield dividen bagus sebesar ${dyStr} — Anda mendapatkan penghasilan pasif hanya dengan memegang saham ini.`
    );
  }

  // Penjelasan Volume/Trending
  if (subScores.trending.score >= 75) {
    explanations.push(
      'Saham sedang tren — volume perdagangan lebih tinggi dari biasanya, menandakan minat pasar yang kuat.'
    );
  }

  // Penjelasan Risk/Reward
  if (tradeSetup.riskReward >= 2.5) {
    explanations.push(
      `Rasio risk/reward sangat menarik yaitu ${tradeSetup.riskReward}:1 — potensi keuntungan ${tradeSetup.riskReward}x lebih besar dari potensi kerugian.`
    );
  }

  // Jika alasan terlalu sedikit, tambahkan satu yang umum
  if (explanations.length < 2) {
    explanations.push(
      'Saham ini lolos semua filter kualitas dan menunjukkan kombinasi sinyal positif yang seimbang.'
    );
  }

  return explanations;
}
