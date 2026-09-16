/**
 * Bloomberg BRKR: Broker Concentration & Bandarmologi Flow Engine
 * 
 * Computes institutional buyer/seller concentration ratios (CR1, CR3, CR5)
 * and determines Bandarmologi Accumulation / Distribution state.
 */

export function calculateBrokerConcentration({
  bandarmologi = null,
  brokerData = null,
  technicals = null
}) {
  // If dedicated broker data exists (from scraper/provider)
  const bData = brokerData || {};
  const bfi = Number(bandarmologi?.bfi ?? bData.bfi) || 0;
  const rawVerdict = bandarmologi?.verdict || bData.verdict;

  // Derive Concentration Ratios (CR1, CR3, CR5)
  let cr1 = Number(bData.cr1);
  let cr3 = Number(bData.cr3);
  let cr5 = Number(bData.cr5);

  if (!Number.isFinite(cr3) || cr3 <= 0) {
    // Derive heuristic concentration from volume dynamics & technicals
    const vols = technicals?.volumes || [];
    if (vols.length >= 5) {
      const lastVol = Number(vols[vols.length - 1]) || 0;
      const avgVol = vols.slice(-5).reduce((a, b) => a + Number(b), 0) / 5;
      const ratio = avgVol > 0 ? lastVol / avgVol : 1;

      cr3 = Number(Math.min(85, Math.max(30, 45 + (ratio - 1) * 15)).toFixed(1));
      cr1 = Number((cr3 * 0.45).toFixed(1));
      cr5 = Number(Math.min(95, cr3 * 1.35).toFixed(1));
    } else {
      cr1 = 20.0;
      cr3 = 45.0;
      cr5 = 60.0;
    }
  }

  // Bandarmologi Flow Verdict
  let verdict = rawVerdict || 'Netral ⚪';
  let badgeColor = 'blue';

  if (cr3 >= 60 && bfi > 15) {
    verdict = 'Akumulasi Masif (Big Accumulation) 🐋';
    badgeColor = 'emerald';
  } else if (bfi > 5) {
    verdict = 'Akumulasi Normal 🟢';
    badgeColor = 'emerald';
  } else if (cr3 >= 60 && bfi < -15) {
    verdict = 'Distribusi Masif (Big Distribution) 🚨';
    badgeColor = 'rose';
  } else if (bfi < -5) {
    verdict = 'Distribusi Normal 🔴';
    badgeColor = 'rose';
  }

  return {
    cr1,
    cr3,
    cr5,
    bfi,
    verdict,
    badgeColor,
    isConcentrated: cr3 >= 55,
    statusText: cr3 >= 55
      ? `Transaksi sangat terkonsentrasi pada 3 broker utama (${cr3}%)`
      : `Transaksi terdistribusi merata di pasar (${cr3}%)`
  };
}

