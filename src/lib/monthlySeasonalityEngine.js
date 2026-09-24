/**
 * Monthly Seasonality & Performance Engine
 * Calculates 5-year monthly return matrix, intra-month highs/lows, average traded prices,
 * win rates, and best/worst month indicators for Indonesian stocks (IDX).
 */

function parseDateComponents(dateVal) {
  if (!dateVal) return null;

  // If string, parse YYYY-MM-DD directly to prevent timezone skew (WIB vs UTC)
  if (typeof dateVal === 'string') {
    const datePart = dateVal.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return { year, month, day, date: new Date(Date.UTC(year, month - 1, day)) };
      }
    }
  }

  // Fallback for Date objects or timestamps
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    date: d
  };
}

export function calculateMonthlySeasonality(historicalRows = []) {
  if (!Array.isArray(historicalRows) || historicalRows.length === 0) {
    return createEmptySeasonalityResponse();
  }

  // Filter and sanitize valid historical rows
  const validRows = historicalRows
    .map(row => {
      if (!row || !row.date) return null;
      const parsedDate = parseDateComponents(row.date);
      if (!parsedDate) return null;

      const close = Number(row.close ?? row.adjClose ?? 0);
      const open = Number(row.open ?? close);
      const high = Number(row.high ?? Math.max(open, close));
      const low = Number(row.low ?? Math.min(open, close));
      const volume = Number(row.volume ?? 0);

      if (!Number.isFinite(close) || close <= 0) return null;

      return {
        date: parsedDate.date,
        year: parsedDate.year,
        month: parsedDate.month, // 1-indexed (1..12)
        day: parsedDate.day,
        open: Number.isFinite(open) && open > 0 ? open : close,
        high: Number.isFinite(high) && high > 0 ? high : Math.max(open, close),
        low: Number.isFinite(low) && low > 0 ? low : Math.min(open, close),
        close,
        volume: Number.isFinite(volume) && volume >= 0 ? volume : 0
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (validRows.length === 0) {
    return createEmptySeasonalityResponse();
  }

  const currentDate = new Date();
  const currentYear = currentDate.getUTCFullYear();
  const currentMonth = currentDate.getUTCMonth() + 1;

  // Generate list of target years (past 5 years up to current year, e.g. 2026, 2025, 2024, 2023, 2022)
  const yearSet = new Set(validRows.map(r => r.year));
  yearSet.add(currentYear);
  const years = Array.from(yearSet).sort((a, b) => b - a).slice(0, 5);

  // Group rows by year and month
  const grouped = {};
  validRows.forEach(row => {
    if (!grouped[row.year]) grouped[row.year] = {};
    if (!grouped[row.year][row.month]) grouped[row.year][row.month] = [];
    grouped[row.year][row.month].push(row);
  });

  const matrix = {};
  const monthStats = {};
  for (let m = 1; m <= 12; m++) {
    monthStats[m] = {
      month: m,
      plusCount: 0,
      minusCount: 0,
      flatCount: 0,
      totalYearsEvaluated: 0,
      winRatePercent: 0,
      avgReturnPercent: 0,
      avgHighPercent: 0,
      avgLowPercent: 0,
      avgMonthlyPrice: 0,
      returnsList: [],
      highsList: [],
      lowsList: [],
      pricesList: []
    };
  }

  years.forEach(yr => {
    matrix[yr] = {};
    let yearOpen = null;
    let yearClose = null;

    for (let m = 1; m <= 12; m++) {
      const monthDays = grouped[yr]?.[m] || [];
      const isFutureMonth = yr > currentYear || (yr === currentYear && m > currentMonth);

      if (isFutureMonth) {
        matrix[yr][m] = {
          status: 'FUTURE',
          returnPercent: null,
          open: null,
          close: null,
          high: null,
          low: null,
          avgPrice: null,
          maxHighPercent: null,
          maxLowPercent: null
        };
        continue;
      }

      if (monthDays.length === 0) {
        matrix[yr][m] = {
          status: 'NO_DATA',
          returnPercent: null,
          open: null,
          close: null,
          high: null,
          low: null,
          avgPrice: null,
          maxHighPercent: null,
          maxLowPercent: null
        };
        continue;
      }

      const firstDay = monthDays[0];
      const lastDay = monthDays[monthDays.length - 1];
      const openPrice = firstDay.open > 0 ? firstDay.open : firstDay.close;
      const closePrice = lastDay.close;

      if (yearOpen === null && openPrice > 0) yearOpen = openPrice;
      if (closePrice > 0) yearClose = closePrice;

      const validHighs = monthDays.map(d => d.high).filter(h => Number.isFinite(h) && h > 0);
      const highPrice = validHighs.length > 0 ? Math.max(...validHighs) : Math.max(openPrice, closePrice);

      const validLows = monthDays.map(d => d.low).filter(l => Number.isFinite(l) && l > 0);
      const lowPrice = validLows.length > 0 ? Math.min(...validLows) : Math.min(openPrice, closePrice);

      const validCloses = monthDays.map(d => d.close).filter(c => Number.isFinite(c) && c > 0);
      const avgPrice = validCloses.length > 0
        ? Math.round(validCloses.reduce((acc, c) => acc + c, 0) / validCloses.length)
        : Math.round(closePrice || openPrice || 0);

      const returnPercent = openPrice > 0 
        ? Number((((closePrice - openPrice) / openPrice) * 100).toFixed(2))
        : 0;

      const maxHighPercent = openPrice > 0 
        ? Number((((highPrice - openPrice) / openPrice) * 100).toFixed(2))
        : 0;

      const maxLowPercent = openPrice > 0 
        ? Number((((lowPrice - openPrice) / openPrice) * 100).toFixed(2))
        : 0;

      let status = 'FLAT';
      if (returnPercent > 0) status = 'PLUS';
      else if (returnPercent < 0) status = 'MINUS';

      matrix[yr][m] = {
        status,
        returnPercent,
        open: openPrice,
        close: closePrice,
        high: highPrice,
        low: lowPrice,
        avgPrice,
        maxHighPercent,
        maxLowPercent,
        tradingDays: monthDays.length
      };

      // Accumulate month stats across evaluated years
      const stats = monthStats[m];
      stats.totalYearsEvaluated += 1;
      stats.returnsList.push(returnPercent);
      stats.highsList.push(maxHighPercent);
      stats.lowsList.push(maxLowPercent);
      stats.pricesList.push(avgPrice);

      if (status === 'PLUS') stats.plusCount += 1;
      else if (status === 'MINUS') stats.minusCount += 1;
      else stats.flatCount += 1;
    }

    // Full Year Return % calculation
    const yearReturnPercent = (yearOpen && yearClose && yearOpen > 0)
      ? Number((((yearClose - yearOpen) / yearOpen) * 100).toFixed(2))
      : 0;

    matrix[yr].yearSummary = {
      open: yearOpen,
      close: yearClose,
      returnPercent: yearReturnPercent,
      isYtd: yr === currentYear
    };
  });

  // Calculate final averages per month
  const monthNames = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const evaluatedMonthList = [];

  for (let m = 1; m <= 12; m++) {
    const stats = monthStats[m];
    const n = stats.totalYearsEvaluated;
    if (n > 0) {
      stats.winRatePercent = Number(((stats.plusCount / n) * 100).toFixed(1));
      stats.avgReturnPercent = Number((stats.returnsList.reduce((a, b) => a + b, 0) / n).toFixed(2));
      stats.avgHighPercent = Number((stats.highsList.reduce((a, b) => a + b, 0) / n).toFixed(2));
      stats.avgLowPercent = Number((stats.lowsList.reduce((a, b) => a + b, 0) / n).toFixed(2));
      stats.avgMonthlyPrice = Math.round(stats.pricesList.reduce((a, b) => a + b, 0) / n);
      
      const compositeScore = stats.winRatePercent * 100 + stats.avgReturnPercent;
      evaluatedMonthList.push({
        month: m,
        name: monthNames[m],
        winRatePercent: stats.winRatePercent,
        avgReturnPercent: stats.avgReturnPercent,
        avgHighPercent: stats.avgHighPercent,
        avgLowPercent: stats.avgLowPercent,
        avgMonthlyPrice: stats.avgMonthlyPrice,
        score: compositeScore
      });
    }
    stats.monthName = monthNames[m];
  }

  // Sort evaluated months descending by score
  evaluatedMonthList.sort((a, b) => b.score - a.score);

  const bestMonth = evaluatedMonthList.length > 0 ? evaluatedMonthList[0] : null;
  const worstMonth = evaluatedMonthList.length > 1 
    ? evaluatedMonthList[evaluatedMonthList.length - 1] 
    : (evaluatedMonthList.length === 1 ? evaluatedMonthList[0] : null);

  // Calculate overall 5-year monthly win rate
  let totalEvaluatedCells = 0;
  let totalPlusCells = 0;
  for (let m = 1; m <= 12; m++) {
    totalEvaluatedCells += monthStats[m].totalYearsEvaluated;
    totalPlusCells += monthStats[m].plusCount;
  }
  const overallWinRate = totalEvaluatedCells > 0
    ? Number(((totalPlusCells / totalEvaluatedCells) * 100).toFixed(1))
    : 0;

  return {
    years,
    matrix,
    monthStats,
    overallWinRate,
    bestMonth,
    worstMonth,
    totalEvaluatedCells,
    totalPlusCells
  };
}

function createEmptySeasonalityResponse() {
  const currentYr = new Date().getUTCFullYear();
  const years = [currentYr];
  const monthStats = {};
  for (let m = 1; m <= 12; m++) {
    monthStats[m] = {
      month: m,
      monthName: ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][m],
      plusCount: 0,
      minusCount: 0,
      flatCount: 0,
      totalYearsEvaluated: 0,
      winRatePercent: 0,
      avgReturnPercent: 0,
      avgHighPercent: 0,
      avgLowPercent: 0,
      avgMonthlyPrice: 0,
    };
  }

  return {
    years,
    matrix: {},
    monthStats,
    overallWinRate: 0,
    bestMonth: null,
    worstMonth: null,
    totalEvaluatedCells: 0,
    totalPlusCells: 0
  };
}
