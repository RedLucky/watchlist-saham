/**
 * Monthly Seasonality & Performance Engine
 * Calculates 5-year monthly return matrix, intra-month highs/lows, average traded prices,
 * win rates, and best/worst month indicators for Indonesian stocks (IDX).
 */

export function calculateMonthlySeasonality(historicalRows = []) {
  if (!Array.isArray(historicalRows) || historicalRows.length === 0) {
    return createEmptySeasonalityResponse();
  }

  // Filter and sanitize valid historical rows
  const validRows = historicalRows
    .filter(row => row && row.date && (row.close != null || row.adjClose != null))
    .map(row => {
      const dateObj = new Date(row.date);
      const close = Number(row.close ?? row.adjClose ?? 0);
      const open = Number(row.open ?? close);
      const high = Number(row.high ?? Math.max(open, close));
      const low = Number(row.low ?? Math.min(open, close));
      const volume = Number(row.volume ?? 0);
      return {
        date: dateObj,
        year: dateObj.getFullYear(),
        month: dateObj.getMonth() + 1, // 1-indexed (1..12)
        day: dateObj.getDate(),
        open,
        high,
        low,
        close,
        volume
      };
    })
    .sort((a, b) => a.date - b.date);

  if (validRows.length === 0) {
    return createEmptySeasonalityResponse();
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Generate list of target years (past 5 years up to current year, e.g., 2022..2026 or 2021..2026)
  const availableYears = Array.from(new Set(validRows.map(r => r.year))).sort((a, b) => b - a);
  const years = availableYears.slice(0, 5); // Latest 5 years, descending (e.g. 2026, 2025, 2024, 2023, 2022)

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

      const highPrice = Math.max(...monthDays.map(d => d.high));
      const lowPrice = Math.min(...monthDays.map(d => d.low).filter(l => l > 0));

      const totalPriceSum = monthDays.reduce((acc, d) => acc + d.close, 0);
      const avgPrice = Math.round(totalPriceSum / monthDays.length);

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

  let bestMonth = null;
  let worstMonth = null;

  for (let m = 1; m <= 12; m++) {
    const stats = monthStats[m];
    const n = stats.totalYearsEvaluated;
    if (n > 0) {
      stats.winRatePercent = Number(((stats.plusCount / n) * 100).toFixed(1));
      stats.avgReturnPercent = Number((stats.returnsList.reduce((a, b) => a + b, 0) / n).toFixed(2));
      stats.avgHighPercent = Number((stats.highsList.reduce((a, b) => a + b, 0) / n).toFixed(2));
      stats.avgLowPercent = Number((stats.lowsList.reduce((a, b) => a + b, 0) / n).toFixed(2));
      stats.avgMonthlyPrice = Math.round(stats.pricesList.reduce((a, b) => a + b, 0) / n);
    }
    stats.monthName = monthNames[m];

    // Evaluate best and worst months based on winRate and avgReturn
    if (n > 0) {
      const monthScore = stats.winRatePercent * 100 + stats.avgReturnPercent;
      if (!bestMonth || monthScore > bestMonth.score) {
        bestMonth = {
          month: m,
          name: monthNames[m],
          winRatePercent: stats.winRatePercent,
          avgReturnPercent: stats.avgReturnPercent,
          avgHighPercent: stats.avgHighPercent,
          score: monthScore
        };
      }
      if (!worstMonth || monthScore < worstMonth.score) {
        worstMonth = {
          month: m,
          name: monthNames[m],
          winRatePercent: stats.winRatePercent,
          avgReturnPercent: stats.avgReturnPercent,
          avgLowPercent: stats.avgLowPercent,
          score: monthScore
        };
      }
    }
  }

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
  const years = [new Date().getFullYear()];
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
