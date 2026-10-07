/**
 * Bloomberg CA: Live Corporate Actions & Catalyst Calendar Engine
 * 
 * Aggregates, timelines, and structures critical corporate catalysts for Indonesian (IDX) equities:
 * 1. Dividend Schedule (Cum Date, Ex Date, Recording/DPS Date, Payment Date, DPS Rupiah, Yield)
 * 2. Multi-Year Historical Dividend Track Record (Compiled from IDX & Yahoo Finance)
 * 3. Earnings Release Seasons (Q1, Q2, Q3, FY estimated windows)
 * 4. General Meetings (RUPST / RUPSLB Annual & Extraordinary General Meetings)
 */

const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const MERGE_WINDOW_MS = 15 * ONE_DAY_MS;
const MAX_SANITY_YIELD_RATIO = 0.40; // Max 40% yield to guard against corrupted API data

/**
 * Format date string to Indonesian locale (e.g., '20 Apr 2026')
 */
export function formatIndoDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime()) || d.getFullYear() <= 1970) return '-';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return String(dateStr);
  }
}

/**
 * Compute days difference relative to today
 */
export function getDaysDifference(targetDateStr) {
  if (!targetDateStr) return null;
  try {
    const target = new Date(targetDateStr);
    if (isNaN(target.getTime()) || target.getFullYear() <= 1970) return null;
    const now = new Date();
    // Normalize time to start of day for clean day counts
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const diffTime = startOfTarget.getTime() - startOfToday.getTime();
    return Math.round(diffTime / ONE_DAY_MS);
  } catch (e) {
    return null;
  }
}

/**
 * Format user-friendly relative countdown badge
 */
export function formatCountdown(daysDiff, eventType = 'DEFAULT') {
  if (daysDiff === null || daysDiff === undefined) return '-';
  if (daysDiff === 0) return 'Hari Ini ◉';
  if (daysDiff === 1) return 'Besok …';
  if (daysDiff === -1) return 'Kemarin';
  if (daysDiff > 0) return `${daysDiff} hari lagi`;
  return `${Math.abs(daysDiff)} hari lalu`;
}

/**
 * Resolve DPS (Dividend Per Share in IDR) from IDX record with multi-layered fallbacks
 */
function resolveDps({
  rawDps = 0,
  rawTotal = 0,
  sharesOutstanding = 0,
  stockPrice = 0,
  yahooDividends = [],
  dateRef = null,
  fundDividendRate = 0
}) {
  let dps = Number(rawDps || 0);
  const total = Number(rawTotal || 0);
  const shares = Number(sharesOutstanding || 0);

  // 1. If direct DPS is given and sane, use it
  if (dps > 0) {
    // Check if missing decimal (e.g. 5694 when stock price is 5000 -> 5.694)
    if (stockPrice > 0 && (dps / stockPrice) > MAX_SANITY_YIELD_RATIO) {
      if ((dps / 1000 / stockPrice) <= MAX_SANITY_YIELD_RATIO) {
        dps = dps / 1000;
      }
    }
    return Math.round(dps * 100) / 100;
  }

  // 2. If DPS is 0 or empty but CashDividenTotal and sharesOutstanding exist, compute matematis
  if (total > 0 && shares > 0) {
    const computed = total / shares;
    if (computed > 0 && (stockPrice <= 0 || (computed / stockPrice) <= MAX_SANITY_YIELD_RATIO)) {
      return Math.round(computed * 100) / 100;
    }
  }

  // 3. Check Yahoo Finance dividend history around the same target date
  if (dateRef && Array.isArray(yahooDividends) && yahooDividends.length > 0) {
    const targetTime = new Date(dateRef).getTime();
    if (!isNaN(targetTime)) {
      const match = yahooDividends.find((y) => {
        const yTime = new Date(y.date).getTime();
        return Math.abs(yTime - targetTime) <= MERGE_WINDOW_MS;
      });
      if (match && Number(match.dividends) > 0) {
        return Number(match.dividends);
      }
    }
  }

  // 4. Fallback to fundamental dividendRate if available
  if (Number(fundDividendRate) > 0) {
    return Number(fundDividendRate);
  }

  return 0;
}

/**
 * Normalize dividend type label
 */
function normalizeDividendType(rawType) {
  if (!rawType) return 'Dividen Tunai';
  const lower = String(rawType).toLowerCase().trim();
  if (lower === 'dt' || lower.includes('final')) return 'Dividen Tunai Final';
  if (lower === 'dti' || lower.includes('interim')) return 'Dividen Tunai Interim';
  if (lower.includes('spesial') || lower.includes('special')) return 'Dividen Spesial';
  return rawType;
}

/**
 * Parse an individual dividend item into structured schedule object
 */
export function parseDividendScheduleItem(div, fundamentals = {}, stockPrice = 0) {
  if (!div || typeof div !== 'object') return null;

  const cumDateRaw = div.TanggalCum || div.TanggalEx || div.date || null;
  const exDateRaw = div.TanggalExRegulerDanNegosiasi || div.TanggalEx || null;
  const recordingDateRaw = div.TanggalDPS || div.TanggalRecording || null;
  const paymentDateRaw = div.TanggalPembayaran || div.paymentDate || null;

  const shares = Number(fundamentals.sharesOutstanding || 0);
  const rawDps = Number(div.CashDividenPerSaham ?? div.amount ?? div.dividend ?? 0);
  const rawTotal = Number(div.CashDividenTotal ?? 0);
  const yahooDividends = Array.isArray(fundamentals.yahooDividendHistory) ? fundamentals.yahooDividendHistory : [];
  const fundRate = Number(fundamentals.dividendRate || 0);

  const dps = resolveDps({
    rawDps,
    rawTotal,
    sharesOutstanding: shares,
    stockPrice,
    yahooDividends,
    dateRef: cumDateRaw || paymentDateRaw,
    fundDividendRate: fundRate
  });

  const yieldPercent = (stockPrice > 0 && dps > 0)
    ? Number(((dps / stockPrice) * 100).toFixed(2))
    : null;

  const fiscalYear = div.TahunBuku || (cumDateRaw ? String(new Date(cumDateRaw).getFullYear()) : '');
  const type = normalizeDividendType(div.Jenis || div.type);

  // Determine stage and timeline days
  const cumDaysDiff = getDaysDifference(cumDateRaw);
  const payDaysDiff = getDaysDifference(paymentDateRaw);

  let stage = 'COMPLETED';
  let status = 'Telah Terealisasi ✓';
  let badgeColor = 'slate';
  let actionMessage = 'Dividen telah selesai dibayarkan ke rekening dana nasabah (RDN).';
  let countdown = formatCountdown(payDaysDiff ?? cumDaysDiff);

  if (cumDaysDiff !== null && cumDaysDiff >= 0) {
    stage = 'CUM_ACTIVE';
    status = 'Menjelang Cum Date ◉';
    badgeColor = 'emerald';
    actionMessage = 'Saham harus dibeli atau dipertahankan paling lambat pada Cum Date untuk berhak menerima dividen.';
    countdown = formatCountdown(cumDaysDiff);
  } else if (payDaysDiff !== null && payDaysDiff >= 0) {
    stage = 'WAITING_PAYMENT';
    status = 'Menunggu Pembayaran …';
    badgeColor = 'blue';
    actionMessage = 'Cum Date telah terlewati. Dana dividen akan otomatis masuk ke RDN pada Payment Date.';
    countdown = `${formatCountdown(payDaysDiff)} (Cair)`;
  }

  return {
    raw: div,
    type,
    fiscalYear,
    dps,
    totalAmount: rawTotal,
    yieldPercent,
    cumDate: cumDateRaw,
    cumDateFormatted: formatIndoDate(cumDateRaw),
    exDate: exDateRaw,
    exDateFormatted: formatIndoDate(exDateRaw),
    recordingDate: recordingDateRaw,
    recordingDateFormatted: formatIndoDate(recordingDateRaw),
    paymentDate: paymentDateRaw,
    paymentDateFormatted: formatIndoDate(paymentDateRaw),
    cumDaysDiff,
    payDaysDiff,
    stage,
    status,
    badgeColor,
    actionMessage,
    countdown
  };
}

/**
 * Compile historical dividend list merging IDX records and Yahoo Finance history
 */
export function compileHistoricalDividends({
  dividendHistory = [],
  fundamentals = {},
  stockPrice = 0
}) {
  const mergedList = [];
  const seenDates = new Set();

  // 1. Process IDX records
  const idxList = Array.isArray(dividendHistory) ? dividendHistory : [];
  for (const div of idxList) {
    const parsed = parseDividendScheduleItem(div, fundamentals, stockPrice);
    if (!parsed) continue;

    const dateKey = parsed.cumDate || parsed.paymentDate;
    if (dateKey) {
      seenDates.add(dateKey.slice(0, 10));
    }

    mergedList.push({
      date: parsed.cumDate || parsed.paymentDate,
      dateFormatted: parsed.cumDateFormatted !== '-' ? parsed.cumDateFormatted : parsed.paymentDateFormatted,
      cumDateFormatted: parsed.cumDateFormatted,
      exDateFormatted: parsed.exDateFormatted,
      paymentDateFormatted: parsed.paymentDateFormatted,
      fiscalYear: parsed.fiscalYear || '-',
      type: parsed.type,
      dps: parsed.dps,
      yieldPercent: parsed.yieldPercent,
      totalAmount: parsed.totalAmount,
      source: 'IDX'
    });
  }

  // 2. Process Yahoo Finance dividend history
  const yahooList = Array.isArray(fundamentals.yahooDividendHistory) ? fundamentals.yahooDividendHistory : [];
  for (const y of yahooList) {
    if (!y.date || !Number.isFinite(Number(y.dividends))) continue;
    const yDateKey = y.date.slice(0, 10);

    // If an IDX event already covers this window within 15 days, skip duplicate
    const isAlreadyCovered = [...seenDates].some((seen) => {
      const diff = Math.abs(new Date(seen).getTime() - new Date(yDateKey).getTime());
      return diff <= MERGE_WINDOW_MS;
    });

    if (!isAlreadyCovered) {
      seenDates.add(yDateKey);
      const dpsVal = Number(y.dividends);
      const yDate = new Date(y.date);
      const yieldPct = stockPrice > 0 ? Number(((dpsVal / stockPrice) * 100).toFixed(2)) : null;

      mergedList.push({
        date: y.date,
        dateFormatted: formatIndoDate(y.date),
        cumDateFormatted: formatIndoDate(y.date),
        exDateFormatted: '-',
        paymentDateFormatted: '-',
        fiscalYear: String(yDate.getFullYear()),
        type: 'Dividen Kas Historis',
        dps: dpsVal,
        yieldPercent: yieldPct,
        totalAmount: 0,
        source: 'YAHOO'
      });
    }
  }

  // Sort descending by date
  return mergedList.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

/**
 * Build Corporate Actions & Catalyst Timeline
 * 
 * Returns an Array of catalyst events for timeline rendering, with attached:
 * - timeline.dividendSchedule (The active/latest dividend with 4 official IDX dates)
 * - timeline.historicalDividends (Compiled multi-year dividend track record)
 * - timeline.dividendSummary (Key metrics: yield, payout ratio, streak, annual rate)
 */
export function buildCorporateActionsTimeline({
  dividendHistory = [],
  fundamentals = {},
  ticker = '',
  price = 0
}) {
  const events = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const stockPrice = Number(price || fundamentals.price || 0);

  // 1. Process Dividends
  const divList = Array.isArray(dividendHistory) ? dividendHistory : [];
  let primaryDividendSchedule = null;

  if (divList.length > 0) {
    // Sort to find the most relevant dividend (active upcoming first, or newest)
    const parsedDivs = divList
      .map((d) => parseDividendScheduleItem(d, fundamentals, stockPrice))
      .filter(Boolean);

    // Pick active one (CUM_ACTIVE or WAITING_PAYMENT) if exists, else newest
    const activeDiv = parsedDivs.find((d) => d.stage === 'CUM_ACTIVE' || d.stage === 'WAITING_PAYMENT');
    const sortedParsed = [...parsedDivs].sort((a, b) => new Date(b.cumDate || b.paymentDate || 0) - new Date(a.cumDate || a.paymentDate || 0));
    primaryDividendSchedule = activeDiv || sortedParsed[0] || null;

    if (primaryDividendSchedule) {
      const dpsStr = primaryDividendSchedule.dps > 0
        ? `Rp ${Number(primaryDividendSchedule.dps).toLocaleString('id-ID')}`
        : '';
      const displayTitle = dpsStr
        ? `Dividen Kas ${dpsStr}`
        : 'Dividen Kas';

      const dateDisplay = primaryDividendSchedule.cumDateFormatted !== '-'
        ? `Cum: ${primaryDividendSchedule.cumDateFormatted}`
        : (primaryDividendSchedule.paymentDateFormatted !== '-' ? `Cair: ${primaryDividendSchedule.paymentDateFormatted}` : '-');

      events.push({
        type: 'DIVIDEND',
        icon: '¤',
        title: displayTitle,
        date: dateDisplay,
        daysDiff: primaryDividendSchedule.cumDaysDiff ?? primaryDividendSchedule.payDaysDiff,
        countdown: primaryDividendSchedule.countdown,
        status: primaryDividendSchedule.status,
        badgeColor: primaryDividendSchedule.badgeColor,
        description: `Pembagian ${primaryDividendSchedule.type.toLowerCase()} emiten ${ticker} ${primaryDividendSchedule.fiscalYear ? `Tahun Buku ${primaryDividendSchedule.fiscalYear}` : ''}. ${primaryDividendSchedule.actionMessage}`,
        schedule: primaryDividendSchedule
      });
    }
  }

  // 2. Earnings Release Season Estimates (Kuartalan BEI)
  const currentMonth = now.getMonth(); // 0-indexed (0=Jan, 11=Dec)
  let nextReportName = 'Laporan Keuangan Q1';
  let targetMonth = `April - Mei ${currentYear}`;

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
    icon: '▤',
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
    icon: '▥',
    title: `Musim RUPS Tahunan (RUPST ${currentYear})`,
    date: `April - Juni ${currentYear}`,
    daysDiff: null,
    countdown: 'Agenda Tahunan',
    status: 'Jadwal Reguler',
    badgeColor: 'purple',
    description: `Rapat Umum Pemegang Saham Tahunan untuk persetujuan dividen & laporan pertanggungjawaban direksi.`
  });

  // Compile full multi-year historical dividends
  const historicalDividends = compileHistoricalDividends({
    dividendHistory,
    fundamentals,
    stockPrice
  });

  const dividendSummary = {
    dividendYield: fundamentals.dividendYield != null ? Number(fundamentals.dividendYield) : null,
    payoutRatio: fundamentals.payoutRatio != null ? Number(fundamentals.payoutRatio) : null,
    dividendStreakYears: fundamentals.dividendStreakYears || 0,
    annualRate: fundamentals.dividendRate || (primaryDividendSchedule?.dps ?? 0),
    hasDividends: historicalDividends.length > 0
  };

  // Attach metadata properties to the events array to maintain full backward compatibility
  events.dividendSchedule = primaryDividendSchedule;
  events.historicalDividends = historicalDividends;
  events.dividendSummary = dividendSummary;

  return events;
}
