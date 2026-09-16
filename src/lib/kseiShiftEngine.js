/**
 * Bloomberg OWN / HDS: KSEI Smart Money Ownership Map & MoM Shift Engine
 * 
 * Analyzes Month-over-Month (MoM) institutional ownership shifts from official KSEI data:
 * - Institutional (Mutual Funds, Insurance, Pension Funds, Securities) vs Retail vs Foreign
 * - Smart Money Accumulation vs Distribution verdict
 * - Controller vs Public Free Float breakdown
 */

/**
 * Calculates Month-over-Month (MoM) Ownership Shift from KSEI records
 */
export function calculateKseiOwnershipShift({
  kseiLatest = null,
  kseiHistory = []
}) {
  if (!kseiLatest || typeof kseiLatest !== 'object') {
    return null;
  }

  const history = Array.isArray(kseiHistory) ? kseiHistory : [];
  // Sort history ascending by date
  const sortedHistory = [...history].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const previousRecord = sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1] : null;

  const currentInstPct = Number(kseiLatest.institutionalPercent) || 0;
  const currentRetailPct = Number(kseiLatest.retailPercent) || 0;
  const currentForeignPct = Number(kseiLatest.foreignPercent) || 0;
  const currentControllerPct = Number(kseiLatest.controllerPercent) || 0;
  const currentFreeFloatPct = Number(kseiLatest.freeFloatPercent) || 0;
  const totalShares = Number(kseiLatest.secNum) || 0;

  let momShift = null;
  let verdict = 'Net Neutral / Stabil ⚖️';
  let badgeColor = 'blue';

  if (previousRecord) {
    const prevInstPct = Number(previousRecord.institutionalPercent) || 0;
    const prevRetailPct = Number(previousRecord.retailPercent) || 0;
    const prevForeignPct = Number(previousRecord.foreignPercent) || 0;
    const prevDate = previousRecord.date || 'Bulan Sebelumnya';

    const diffInstPct = Number((currentInstPct - prevInstPct).toFixed(3));
    const diffRetailPct = Number((currentRetailPct - prevRetailPct).toFixed(3));
    const diffForeignPct = Number((currentForeignPct - prevForeignPct).toFixed(3));

    const diffInstShares = Math.round((diffInstPct / 100) * totalShares);
    const diffRetailShares = Math.round((diffRetailPct / 100) * totalShares);

    if (diffInstPct > 0.30 && diffRetailPct < -0.20) {
      verdict = 'Smart Money Akumulasi Masif 🐋';
      badgeColor = 'emerald';
    } else if (diffInstPct > 0.05) {
      verdict = 'Akumulasi Institusi Ringan 🟢';
      badgeColor = 'emerald';
    } else if (diffInstPct < -0.30 && diffRetailPct > 0.20) {
      verdict = 'Smart Money Distribusi ke Ritel 🚨';
      badgeColor = 'rose';
    } else if (diffInstPct < -0.05) {
      verdict = 'Distribusi Institusi Ringan 🔴';
      badgeColor = 'rose';
    }

    momShift = {
      prevDate,
      diffInstPct,
      diffRetailPct,
      diffForeignPct,
      diffInstShares,
      diffRetailShares
    };
  }

  // Detailed breakdown of domestic institutional holders
  const local = kseiLatest.local || {};
  const foreign = kseiLatest.foreign || {};

  const institutionalDetail = [
    {
      category: 'Dana Pensiun (PF)',
      localPct: totalShares > 0 ? Number(((local.pf || 0) / totalShares * 100).toFixed(2)) : 0,
      foreignPct: totalShares > 0 ? Number(((foreign.pf || 0) / totalShares * 100).toFixed(2)) : 0,
      icon: '🛡️'
    },
    {
      category: 'Reksa Dana (MF)',
      localPct: totalShares > 0 ? Number(((local.mf || 0) / totalShares * 100).toFixed(2)) : 0,
      foreignPct: totalShares > 0 ? Number(((foreign.mf || 0) / totalShares * 100).toFixed(2)) : 0,
      icon: '📈'
    },
    {
      category: 'Asuransi (IS)',
      localPct: totalShares > 0 ? Number(((local.is || 0) / totalShares * 100).toFixed(2)) : 0,
      foreignPct: totalShares > 0 ? Number(((foreign.is || 0) / totalShares * 100).toFixed(2)) : 0,
      icon: '🏛️'
    },
    {
      category: 'Perbankan (IB)',
      localPct: totalShares > 0 ? Number(((local.ib || 0) / totalShares * 100).toFixed(2)) : 0,
      foreignPct: totalShares > 0 ? Number(((foreign.ib || 0) / totalShares * 100).toFixed(2)) : 0,
      icon: '🏦'
    },
    {
      category: 'Sekuritas (SC)',
      localPct: totalShares > 0 ? Number(((local.sc || 0) / totalShares * 100).toFixed(2)) : 0,
      foreignPct: totalShares > 0 ? Number(((foreign.sc || 0) / totalShares * 100).toFixed(2)) : 0,
      icon: '💼'
    }
  ];

  return {
    date: kseiLatest.date,
    totalShares,
    institutionalPercent: currentInstPct,
    retailPercent: currentRetailPct,
    foreignPercent: currentForeignPct,
    controllerPercent: currentControllerPct,
    freeFloatPercent: currentFreeFloatPct,
    verdict,
    badgeColor,
    momShift,
    institutionalDetail
  };
}
