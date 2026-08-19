/**
 * Valuation Score (0–100)
 * Evaluates whether stock is fairly valued relative to its sector.
 *
 * Sector average PER/PBV benchmarks based on IDX-IC classification.
 */

const SECTOR_AVERAGES = {
  Financials:                   { per: 12, pbv: 2.0 },
  Energy:                       { per: 8,  pbv: 1.5 },
  'Basic Materials':            { per: 12, pbv: 1.8 },
  Industrials:                  { per: 10, pbv: 1.5 },
  'Consumer Non-Cyclicals':     { per: 22, pbv: 3.5 },
  'Consumer Cyclicals':         { per: 18, pbv: 3.0 },
  Healthcare:                   { per: 25, pbv: 4.5 },
  'Properties & Real Estate':   { per: 12, pbv: 1.2 },
  Technology:                   { per: 35, pbv: 5.0 },
  Infrastructures:              { per: 16, pbv: 2.5 },
  'Transportation & Logistics': { per: 14, pbv: 2.0 },
};

export function calculateValuationScore(stock) {
  const { per, pbv } = stock.fundamentals;
  const sector = stock.sector;
  const avg = SECTOR_AVERAGES[sector] || { per: 15, pbv: 2.5 };
  const safePER = Number.isFinite(per) ? per : null;
  const safePBV = Number.isFinite(pbv) ? pbv : null;
  let score = 0;
  const details = [];

  // ── PER vs Sector Average (50%) ────────────────────────────────────
  let perScore = 40; // default if no data

  if (safePER !== null && safePER > 0) {
    const perRatio = avg.per > 0 ? safePER / avg.per : 10;

    if (perRatio <= 0.6) {
      perScore = 100;
      details.push(`Valuasi sangat menarik — PER ${safePER.toFixed(1)} jauh di bawah rata-rata sektor ${avg.per}`);
    } else if (perRatio <= 0.85) {
      perScore = 80;
      details.push(`Valuasi baik — PER ${safePER.toFixed(1)} di bawah rata-rata sektor ${avg.per}`);
    } else if (perRatio <= 1.15) {
      perScore = 55;
      details.push(`Valuasi wajar — PER ${safePER.toFixed(1)} dekat rata-rata sektor ${avg.per}`);
    } else if (perRatio <= 1.5) {
      perScore = 30;
      details.push(`Sedikit mahal — PER ${safePER.toFixed(1)} di atas rata-rata sektor ${avg.per}`);
    } else {
      perScore = 10;
      details.push(`Mahal — PER ${safePER.toFixed(1)} jauh di atas rata-rata sektor`);
    }
  } else if (safePER !== null && safePER <= 0) {
    perScore = 0;
    details.push('Perusahaan memiliki earning negatif — valuasi sulit dinilai');
  } else {
    details.push('Data PER belum tersedia');
  }
  score += perScore * 0.50;

  // ── PBV vs Sector Average (50%) ────────────────────────────────────
  let pbvScore = 40; // default if no data

  if (safePBV !== null && safePBV > 0) {
    const pbvRatio = avg.pbv > 0 ? safePBV / avg.pbv : 10;

    if (pbvRatio <= 0.6) {
      pbvScore = 100;
      details.push(`Undervalued secara book value — PBV ${safePBV.toFixed(1)}x vs rata-rata sektor ${avg.pbv}x`);
    } else if (pbvRatio <= 0.85) {
      pbvScore = 80;
      details.push(`Book value baik — PBV ${safePBV.toFixed(1)}x di bawah rata-rata sektor`);
    } else if (pbvRatio <= 1.15) {
      pbvScore = 55;
      details.push(`Book value wajar — PBV ${safePBV.toFixed(1)}x dekat rata-rata sektor`);
    } else if (pbvRatio <= 1.5) {
      pbvScore = 30;
      details.push(`Book value lebih tinggi — PBV ${safePBV.toFixed(1)}x di atas rata-rata sektor`);
    } else {
      pbvScore = 10;
      details.push(`Valuasi premium — PBV ${safePBV.toFixed(1)}x jauh di atas sektor`);
    }
  } else if (safePBV !== null && safePBV <= 0) {
    pbvScore = 0;
    details.push('Data PBV tidak valid — valuasi book value tidak bisa dihitung');
  } else {
    details.push('Data PBV belum tersedia');
  }
  score += pbvScore * 0.50;

  return {
    score: Math.round(Math.min(100, Math.max(0, score))),
    details,
    metrics: { per: safePER, pbv: safePBV, sectorAvgPER: avg.per, sectorAvgPBV: avg.pbv },
  };
}
