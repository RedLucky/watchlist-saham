/**
 * Bloomberg CA: Live Corporate Actions & Catalyst Calendar Engine
 * 
 * Aggregates and timelines critical corporate catalysts:
 * - Dividend dates (Cum, Ex, Payment)
 * - RUPS (General Meetings AGM / EGM)
 * - Earnings Release estimated windows
 * - Rights Issues, Stock Splits, and Warrants
 */

/**
 * Helper to compute days difference from today
 */
function getDaysDifference(targetDateStr) {
  if (!targetDateStr) return null;
  try {
    const target = new Date(targetDateStr);
    if (isNaN(target.getTime())) return null;
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    return null;
  }
}

/**
 * Format relative day countdown
 */
function formatCountdown(daysDiff) {
  if (daysDiff === null) return '-';
  if (daysDiff === 0) return 'Hari Ini 🔔';
  if (daysDiff === 1) return 'Besok ⏳';
  if (daysDiff === -1) return 'Kemarin';
  if (daysDiff > 0) return `${daysDiff} hari lagi`;
  return `${Math.abs(daysDiff)} hari lalu`;
}

/**
 * Build Corporate Actions & Catalyst Timeline
 */
export function buildCorporateActionsTimeline({
  dividendHistory = [],
  fundamentals = {},
  ticker = ''
}) {
  const events = [];
  const now = new Date();
  const currentYear = now.getFullYear();

  // 1. Dividend Events
  const divList = Array.isArray(dividendHistory) ? dividendHistory : [];
  if (divList.length > 0) {
    const sortedDivs = [...divList].sort((a, b) => new Date(b.date || b.paymentDate || 0) - new Date(a.date || a.paymentDate || 0));
    const latestDiv = sortedDivs[0];

    if (latestDiv) {
      const divDateStr = latestDiv.date || latestDiv.paymentDate;
      const daysDiff = getDaysDifference(divDateStr);

      events.push({
        type: 'DIVIDEND',
        icon: '💰',
        title: `Dividen Kas ${latestDiv.amount ? `Rp ${Number(latestDiv.amount).toLocaleString('id-ID')}` : ''}`,
        date: divDateStr,
        daysDiff,
        countdown: formatCountdown(daysDiff),
        status: (daysDiff !== null && daysDiff >= 0) ? 'Mendatang' : 'Terealisasi',
        badgeColor: (daysDiff !== null && daysDiff >= 0) ? 'emerald' : 'slate',
        description: `Pembagian dividen kas emiten ${ticker} untuk tahun buku terkait.`
      });
    }
  }

  // 2. Earnings Release Season Estimates (Kuartalan BEI)
  const currentMonth = now.getMonth(); // 0-indexed (0=Jan, 11=Dec)
  let nextReportName = 'Laporan Keuangan Q1';
  let targetMonth = 'April - Mei';

  if (currentMonth >= 0 && currentMonth <= 3) {
    nextReportName = `Laporan Keuangan Tahunan (FY ${currentYear - 1})`;
    targetMonth = `Maret - April ${currentYear}`;
  } else if (currentMonth >= 4 && currentMonth <= 6) {
    nextReportName = `Laporan Keuangan Q1 ${currentYear}`;
    targetMonth = `Mei - Juni ${currentYear}`;
  } else if (currentMonth >= 7 && currentMonth <= 9) {
    nextReportName = `Laporan Keuangan Q2 ${currentYear}`;
    targetMonth = `Juli - Agustus ${currentYear}`;
  } else {
    nextReportName = `Laporan Keuangan Q3 ${currentYear}`;
    targetMonth = `Oktober - November ${currentYear}`;
  }

  events.push({
    type: 'EARNINGS',
    icon: '📑',
    title: nextReportName,
    date: targetMonth,
    daysDiff: null,
    countdown: 'Jadwal Musiman',
    status: 'Estimasi Musim Rilis',
    badgeColor: 'blue',
    description: `Jendela resmi penyampaian laporan keuangan berkala ke OJK & BEI.`
  });

  // 3. RUPS Tahunan (Musim RUPS Tahunan April - Juni)
  events.push({
    type: 'RUPS',
    icon: '🏛️',
    title: `Musim RUPS Tahunan (RUPST ${currentYear})`,
    date: `April - Juni ${currentYear}`,
    daysDiff: null,
    countdown: 'Agenda Tahunan',
    status: 'Jadwal Reguler',
    badgeColor: 'purple',
    description: `Rapat Umum Pemegang Saham Tahunan untuk persetujuan dividen & laporan direksi.`
  });

  return events;
}
