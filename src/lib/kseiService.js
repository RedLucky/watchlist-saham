import { prisma } from './prisma';

/**
 * Parses a single line of pipe-delimited KSEI data
 * Format:
 * Date|Code|Type|Sec. Num|Price|Local IS|Local CP|Local PF|Local IB|Local ID|Local MF|Local SC|Local FD|Local OT|Total|Foreign IS|Foreign CP|Foreign PF|Foreign IB|Foreign ID|Foreign MF|Foreign SC|Foreign FD|Foreign OT|Total
 */
export function parseKseiRow(line) {
  if (!line || typeof line !== 'string') return null;
  const parts = line.split('|').map(s => s.trim());
  if (parts.length < 25) return null;

  const [
    rawDate,
    ticker,
    type,
    rawSecNum,
    rawPrice,
    localIS, localCP, localPF, localIB, localID, localMF, localSC, localFD, localOT, localTotal,
    foreignIS, foreignCP, foreignPF, foreignIB, foreignID, foreignMF, foreignSC, foreignFD, foreignOT, foreignTotal
  ] = parts;

  // Validate ticker and secNum
  if (!ticker || ticker.length < 3 || ticker.length > 6) return null;

  const secNum = Number(rawSecNum) || 0;
  if (secNum <= 0) return null;

  const price = Number(rawPrice) || 0;
  const dateFormatted = formatKseiDate(rawDate);

  const local = {
    is: Number(localIS) || 0,
    cp: Number(localCP) || 0,
    pf: Number(localPF) || 0,
    ib: Number(localIB) || 0,
    id: Number(localID) || 0,
    mf: Number(localMF) || 0,
    sc: Number(localSC) || 0,
    fd: Number(localFD) || 0,
    ot: Number(localOT) || 0,
    total: Number(localTotal) || 0
  };

  const foreign = {
    is: Number(foreignIS) || 0,
    cp: Number(foreignCP) || 0,
    pf: Number(foreignPF) || 0,
    ib: Number(foreignIB) || 0,
    id: Number(foreignID) || 0,
    mf: Number(foreignMF) || 0,
    sc: Number(foreignSC) || 0,
    fd: Number(foreignFD) || 0,
    ot: Number(foreignOT) || 0,
    total: Number(foreignTotal) || 0
  };

  const retailShares = local.id + foreign.id;
  const controllerShares = local.cp + foreign.cp;
  const institutionalShares = (local.is + local.pf + local.ib + local.mf + local.sc) +
                              (foreign.is + foreign.pf + foreign.ib + foreign.mf + foreign.sc);
  const freeFloatShares = Math.max(0, secNum - controllerShares);

  const retailPercent = Number(((retailShares / secNum) * 100).toFixed(4));
  const controllerPercent = Number(((controllerShares / secNum) * 100).toFixed(4));
  const foreignPercent = Number(((foreign.total / secNum) * 100).toFixed(4));
  const institutionalPercent = Number(((institutionalShares / secNum) * 100).toFixed(4));
  const pensionPercent = Number((((local.pf + foreign.pf) / secNum) * 100).toFixed(4));
  const mutualFundPercent = Number((((local.mf + foreign.mf) / secNum) * 100).toFixed(4));
  const freeFloatPercent = Number(((freeFloatShares / secNum) * 100).toFixed(4));

  return {
    date: dateFormatted,
    rawDate,
    ticker: ticker.toUpperCase(),
    type: type || 'EQUITY',
    secNum,
    price,
    marketCap: price * secNum,
    local,
    foreign,
    retailShares,
    controllerShares,
    institutionalShares,
    freeFloatShares,
    retailPercent,
    controllerPercent,
    foreignPercent,
    institutionalPercent,
    pensionPercent,
    mutualFundPercent,
    freeFloatPercent,
  };
}

/**
 * Normalizes date string like "31-JUL-2026" or "2026-07-31" into "YYYY-MM-DD"
 */
export function formatKseiDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];

  const months = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
  };

  const parts = dateStr.trim().split('-');
  if (parts.length === 3 && parts[1] && months[parts[1].toUpperCase()]) {
    const day = parts[0].padStart(2, '0');
    const month = months[parts[1].toUpperCase()];
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }

  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}

  return dateStr;
}

/**
 * Computes month-over-month deltas for an array of KSEI snapshots
 */
export function enrichKseiHistoryWithDeltas(history = []) {
  if (!Array.isArray(history) || history.length === 0) return [];

  // Sort chronologically ascending
  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return sorted.map((curr, idx) => {
    if (idx === 0) {
      return {
        ...curr,
        deltaRetail: 0,
        deltaRetailPct: 0,
        deltaForeign: 0,
        deltaForeignPct: 0,
        deltaPension: 0,
        deltaMutualFund: 0,
        deltaInsurance: 0,
        deltaCorporate: 0,
        deltaSmartMoney: 0,
        deltaRetailRp: 0,
        deltaSmartMoneyRp: 0,
        bfi: 0,
        verdict: 'Neutral ⚪',
      };
    }

    const prev = sorted[idx - 1];

    const deltaRetail = curr.retailShares - prev.retailShares;
    const deltaRetailPct = Number((curr.retailPercent - prev.retailPercent).toFixed(4));

    const deltaForeign = curr.foreign.total - prev.foreign.total;
    const deltaForeignPct = Number((curr.foreignPercent - prev.foreignPercent).toFixed(4));

    const deltaPension = curr.local.pf - prev.local.pf;
    const deltaMutualFund = curr.local.mf - prev.local.mf;
    const deltaInsurance = curr.local.is - prev.local.is;
    const deltaCorporate = curr.local.cp - prev.local.cp;

    const deltaSmartMoney = (deltaForeign + deltaPension + deltaMutualFund + deltaInsurance);
    const deltaRetailRp = Math.round(deltaRetail * (curr.price || prev.price || 0));
    const deltaSmartMoneyRp = Math.round(deltaSmartMoney * (curr.price || prev.price || 0));

    const floatBase = curr.freeFloatShares > 0 ? curr.freeFloatShares : curr.secNum;
    const bfi = floatBase > 0 ? Number((((deltaSmartMoney - deltaRetail) / floatBase) * 100).toFixed(2)) : 0;

    let verdict = 'Neutral ⚪';
    if (bfi >= 2.0 || (deltaSmartMoney > 0 && deltaRetail < 0)) {
      verdict = bfi >= 3.5 ? 'Super Akumulasi 🚀' : 'Akumulasi Institusi 🟢';
    } else if (bfi <= -2.0 || (deltaSmartMoney < 0 && deltaRetail > 0)) {
      verdict = bfi <= -3.5 ? 'Distribusi Masif 🔴' : 'Distribusi Ritel Masuk 🔴';
    } else if (deltaSmartMoney > 0) {
      verdict = 'Akumulasi Diam-Diam 🟡';
    }

    return {
      ...curr,
      deltaRetail,
      deltaRetailPct,
      deltaForeign,
      deltaForeignPct,
      deltaPension,
      deltaMutualFund,
      deltaInsurance,
      deltaCorporate,
      deltaSmartMoney,
      deltaRetailRp,
      deltaSmartMoneyRp,
      bfi,
      verdict,
    };
  });
}

/**
 * Ingest raw text KSEI payload into the PostgreSQL database
 */
export async function ingestKseiText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Data KSEI kosong atau tidak valid.');
  }

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) {
    throw new Error('Tidak ada baris data KSEI yang ditemukan.');
  }

  // Parse lines
  const parsedRows = [];
  let snapshotDate = null;

  for (const line of lines) {
    // Skip header line if present
    if (line.toLowerCase().startsWith('date|code') || line.toLowerCase().startsWith('date|')) {
      continue;
    }
    const parsed = parseKseiRow(line);
    if (parsed) {
      parsedRows.push(parsed);
      if (!snapshotDate) snapshotDate = parsed.date;
    }
  }

  if (parsedRows.length === 0) {
    throw new Error('Gagal mem-parsing data. Pastikan format sesuai pemisah pipa (Date|Code|Type|Sec. Num|...).');
  }

  console.log(`[KseiService] Parsed ${parsedRows.length} valid rows for date: ${snapshotDate}`);

  // Fetch all existing stocks in DB matching these tickers
  const tickers = parsedRows.map(r => r.ticker);
  const existingStocks = await prisma.stockData.findMany({
    where: { ticker: { in: tickers } },
    select: { ticker: true, kseiHistory: true, price: true }
  });

  const stockMap = new Map();
  existingStocks.forEach(s => stockMap.set(s.ticker, s));

  let updatedCount = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
    const chunk = parsedRows.slice(i, i + BATCH_SIZE);

    await Promise.all(
      chunk.map(async (row) => {
        const existing = stockMap.get(row.ticker);
        let history = [];

        if (existing?.kseiHistory) {
          try {
            history = JSON.parse(existing.kseiHistory);
          } catch (e) {
            history = [];
          }
        }

        // Deduplicate or append snapshot by date
        const existingIdx = history.findIndex(h => h.date === row.date);
        if (existingIdx >= 0) {
          history[existingIdx] = row;
        } else {
          history.push(row);
        }

        // Recompute all deltas with sorted history
        const enrichedHistory = enrichKseiHistoryWithDeltas(history);
        const latestSnapshot = enrichedHistory[enrichedHistory.length - 1];

        // Update database
        await prisma.stockData.upsert({
          where: { ticker: row.ticker },
          update: {
            sharesOutstanding: BigInt(Math.round(row.secNum)),
            kseiLatest: JSON.stringify(latestSnapshot),
            kseiHistory: JSON.stringify(enrichedHistory),
          },
          create: {
            ticker: row.ticker,
            name: row.ticker,
            price: row.price || 50,
            sharesOutstanding: BigInt(Math.round(row.secNum)),
            kseiLatest: JSON.stringify(latestSnapshot),
            kseiHistory: JSON.stringify(enrichedHistory),
          }
        });

        updatedCount++;
      })
    );
  }

  return {
    success: true,
    totalRows: lines.length,
    parsedCount: parsedRows.length,
    updatedCount,
    snapshotDate,
  };
}

/**
 * Returns available KSEI snapshot periods stored across the database
 */
export async function getKseiStoredPeriods() {
  const sampleStocks = await prisma.stockData.findMany({
    where: { kseiHistory: { not: null } },
    take: 50,
    select: { kseiHistory: true }
  });

  const periodSet = new Set();

  sampleStocks.forEach(s => {
    if (s.kseiHistory) {
      try {
        const history = JSON.parse(s.kseiHistory);
        history.forEach(h => {
          if (h.date) periodSet.add(h.date);
        });
      } catch (e) {}
    }
  });

  return Array.from(periodSet).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
}

