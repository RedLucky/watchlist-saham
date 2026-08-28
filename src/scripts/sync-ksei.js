const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');
const AdmZip = require('adm-zip');

const prisma = new PrismaClient();

/**
 * Normalizes date string like "31-JUL-2026" or "2026-07-31" into "YYYY-MM-DD"
 */
function formatKseiDate(dateStr) {
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

  return dateStr.trim();
}

/**
 * Parses a single line of pipe-delimited KSEI data
 */
function parseKseiRow(line) {
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
 * Enriches historical array with month-over-month deltas (+/-)
 */
function enrichKseiHistoryWithDeltas(history) {
  if (!Array.isArray(history) || history.length === 0) return [];

  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return sorted.map((current, idx) => {
    if (idx === 0) {
      return {
        ...current,
        delta: {
          retailShares: 0,
          retailPercent: 0,
          foreignShares: 0,
          foreignPercent: 0,
          controllerShares: 0,
          controllerPercent: 0,
          institutionalShares: 0,
          pensionShares: 0,
          mutualFundShares: 0,
        }
      };
    }

    const prev = sorted[idx - 1];
    const prevForeignTotal = prev.foreign?.total || 0;
    const currForeignTotal = current.foreign?.total || 0;
    const prevPensionTotal = (prev.local?.pf || 0) + (prev.foreign?.pf || 0);
    const currPensionTotal = (current.local?.pf || 0) + (current.foreign?.pf || 0);
    const prevMutualFundTotal = (prev.local?.mf || 0) + (prev.foreign?.mf || 0);
    const currMutualFundTotal = (current.local?.mf || 0) + (current.foreign?.mf || 0);

    return {
      ...current,
      delta: {
        retailShares: current.retailShares - prev.retailShares,
        retailPercent: Number((current.retailPercent - prev.retailPercent).toFixed(4)),
        foreignShares: currForeignTotal - prevForeignTotal,
        foreignPercent: Number((current.foreignPercent - prev.foreignPercent).toFixed(4)),
        controllerShares: current.controllerShares - prev.controllerShares,
        controllerPercent: Number((current.controllerPercent - prev.controllerPercent).toFixed(4)),
        institutionalShares: current.institutionalShares - prev.institutionalShares,
        pensionShares: currPensionTotal - prevPensionTotal,
        mutualFundShares: currMutualFundTotal - prevMutualFundTotal,
      }
    };
  });
}

/**
 * Ingests raw KSEI text into Prisma StockData
 */
async function ingestRawKseiText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const parsedRows = [];

  for (const line of lines) {
    if (line.toLowerCase().startsWith('date|')) continue;
    const row = parseKseiRow(line);
    if (row) parsedRows.push(row);
  }

  if (parsedRows.length === 0) {
    throw new Error('Tidak ada baris data KSEI valid yang dapat diuraikan.');
  }

  const existingStocks = await prisma.stockData.findMany({
    select: { ticker: true, kseiHistory: true }
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

        const existingIdx = history.findIndex(h => h.date === row.date);
        if (existingIdx >= 0) {
          history[existingIdx] = row;
        } else {
          history.push(row);
        }

        const enrichedHistory = enrichKseiHistoryWithDeltas(history);
        const latestSnapshot = enrichedHistory[enrichedHistory.length - 1];

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

  return { updatedCount, snapshotDate: parsedRows[0]?.date };
}

/**
 * Main background sync function for KSEI ZIP publications
 */
async function syncKseiPublications() {
  console.log('=== [KSEI-SCRAPER] STARTING AUTOMATIC KSEI ZIP SYNC ===');

  // 1. Get stored periods from DB
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

  const storedPeriods = Array.from(periodSet);
  console.log(`[KSEI-SCRAPER] Current Stored Periods in DB (${storedPeriods.length}):`, storedPeriods);

  // 2. Launch Puppeteer browser
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    console.log('[KSEI-SCRAPER] Navigating to KSEI publications portal...');
    await page.goto('https://www.ksei.co.id/id/publikasi/data-dan-statistik/kepemilikan-efek?page=1', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    // Extract available publication items
    const publications = await page.evaluate(() => {
      const items = [];
      const elements = document.querySelectorAll('.data-item');
      elements.forEach(el => {
        const titleEl = el.querySelector('.data-item-title');
        const linkEl = el.querySelector('a.btn-download');
        const dayEl = el.querySelector('.date-day');
        const monthEl = el.querySelector('.date-month');
        if (titleEl && linkEl && linkEl.href) {
          items.push({
            title: titleEl.innerText.trim(),
            zipUrl: linkEl.href.trim(),
            day: dayEl ? dayEl.innerText.trim() : '',
            month: monthEl ? monthEl.innerText.trim() : ''
          });
        }
      });
      return items;
    });

    console.log(`[KSEI-SCRAPER] Found ${publications.length} publication items on portal:`);

    const missingPubs = [];
    for (const pub of publications) {
      const match = pub.zipUrl.match(/BalanceposEfek(\d{4})(\d{2})(\d{2})\.zip/i);
      let dateFormatted = null;
      let monthCode = null;
      if (match) {
        const [, y, m, d] = match;
        dateFormatted = `${y}-${m}-${d}`;
        monthCode = `${y}-${m}`;
      }

      const isAlreadySaved = storedPeriods.some(sp => {
        if (!sp) return false;
        const str = String(sp).toUpperCase();
        if (dateFormatted && str.includes(dateFormatted)) return true;
        if (monthCode && str.includes(monthCode)) return true;
        return false;
      });

      console.log(`  - ${pub.title} (${dateFormatted || pub.zipUrl}) -> ${isAlreadySaved ? 'ALREADY SAVED ✓' : 'MISSING (NEEDS DOWNLOAD) ⚠️'}`);

      if (!isAlreadySaved) {
        missingPubs.push({ ...pub, dateFormatted, monthCode });
      }
    }

    if (missingPubs.length === 0) {
      console.log('[KSEI-SCRAPER] All available KSEI publications are already synchronized. No new data to download.');
      return;
    }

    console.log(`\n[KSEI-SCRAPER] Starting download & ingestion for ${missingPubs.length} missing period(s)...`);

    for (const pub of missingPubs) {
      console.log(`\n[KSEI-SCRAPER] Downloading ${pub.title} (${pub.zipUrl})...`);

      const base64Data = await page.evaluate(async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }, pub.zipUrl);

      if (!base64Data) {
        console.error(`[KSEI-SCRAPER] Failed to download ZIP for ${pub.title}`);
        continue;
      }

      const zipBuffer = Buffer.from(base64Data, 'base64');
      const zip = new AdmZip(zipBuffer);
      const entries = zip.getEntries();
      const textEntry = entries.find(e => e.entryName.endsWith('.txt') || e.entryName.endsWith('.csv') || !e.isDirectory);

      if (!textEntry) {
        console.error(`[KSEI-SCRAPER] No text file found inside ZIP for ${pub.title}`);
        continue;
      }

      const rawText = zip.readAsText(textEntry, 'utf8');
      console.log(`[KSEI-SCRAPER] Extracted ${textEntry.entryName} (${rawText.split('\n').length} lines). Ingesting to database...`);

      const result = await ingestRawKseiText(rawText);
      console.log(`[KSEI-SCRAPER] [SUCCESS] Ingested ${result.updatedCount} stocks for snapshot date ${result.snapshotDate}`);
    }

  } catch (error) {
    console.error('[KSEI-SCRAPER] Error during KSEI sync:', error.message);
  } finally {
    await browser.close();
    await prisma.$disconnect();
    console.log('\n=== [KSEI-SCRAPER] KSEI SYNC COMPLETED ===\n');
  }
}

if (require.main === module) {
  syncKseiPublications().catch(console.error);
}

module.exports = { syncKseiPublications };

