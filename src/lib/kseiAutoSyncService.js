import puppeteer from 'puppeteer';
import AdmZip from 'adm-zip';
import { ingestKseiText, getKseiStoredPeriods } from './kseiService';

/**
 * Launches a headless Puppeteer browser with cross-environment resilience (Linux / Alpine / Docker)
 */
async function createBrowser() {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  return await puppeteer.launch({
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
}

/**
 * Scrapes available monthly KSEI securities ownership publications from KSEI portal
 */
export async function getAvailableKseiPublications() {
  let browser = null;
  try {
    browser = await createBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto('https://www.ksei.co.id/id/publikasi/data-dan-statistik/kepemilikan-efek?page=1', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    const items = await page.evaluate(() => {
      const results = [];
      const elements = document.querySelectorAll('.data-item');
      elements.forEach(el => {
        const titleEl = el.querySelector('.data-item-title');
        const linkEl = el.querySelector('a.btn-download');
        const dayEl = el.querySelector('.date-day');
        const monthEl = el.querySelector('.date-month');
        if (titleEl && linkEl && linkEl.href) {
          results.push({
            title: titleEl.innerText.trim(),
            zipUrl: linkEl.href.trim(),
            day: dayEl ? dayEl.innerText.trim() : '',
            month: monthEl ? monthEl.innerText.trim() : '',
          });
        }
      });
      return results;
    });

    // Parse date for each publication (e.g. BalanceposEfek20260731.zip -> 2026-07-31)
    const publications = items.map(item => {
      const match = item.zipUrl.match(/BalanceposEfek(\d{4})(\d{2})(\d{2})\.zip/i);
      let dateFormatted = null;
      let monthCode = null;
      if (match) {
        const [, y, m, d] = match;
        dateFormatted = `${y}-${m}-${d}`;
        monthCode = `${y}-${m}`;
      }
      return {
        ...item,
        dateFormatted,
        monthCode,
      };
    });

    return publications;
  } catch (error) {
    console.error('[KSEI AutoSync] Error fetching publications list:', error);
    throw new Error(`Gagal memuat daftar publikasi KSEI: ${error.message}`);
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
  }
}

/**
 * Downloads a ZIP file inside browser context, unzips in memory, and returns the raw text content
 */
export async function downloadAndExtractKseiZip(zipUrl) {
  let browser = null;
  try {
    browser = await createBrowser();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // First visit KSEI domain to establish session/cookies and bypass WAF
    await page.goto('https://www.ksei.co.id/id/publikasi/data-dan-statistik/kepemilikan-efek?page=1', {
      waitUntil: 'networkidle2',
      timeout: 45000
    });

    // Fetch the zip blob directly within browser context
    const base64Data = await page.evaluate(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP Error ${res.status} when fetching zip`);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }, zipUrl);

    if (!base64Data || base64Data.length === 0) {
      throw new Error('File ZIP kosong atau gagal diunduh.');
    }

    const zipBuffer = Buffer.from(base64Data, 'base64');
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    // Find the data text file inside the zip (e.g. Balancepos20260731.txt)
    const textEntry = entries.find(e => e.entryName.endsWith('.txt') || e.entryName.endsWith('.csv') || !e.isDirectory);
    if (!textEntry) {
      throw new Error('Tidak ditemukan file teks data di dalam arsip ZIP KSEI.');
    }

    const rawText = zip.readAsText(textEntry, 'utf8');
    return {
      fileName: textEntry.entryName,
      content: rawText,
      sizeBytes: zipBuffer.length
    };
  } catch (error) {
    console.error(`[KSEI AutoSync] Error downloading zip (${zipUrl}):`, error);
    throw new Error(`Gagal mengunduh/mengekstrak data ZIP KSEI: ${error.message}`);
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) {}
    }
  }
}

/**
 * Discovers and automatically synchronizes missing KSEI periods into the database
 */
export async function autoSyncKseiData(options = {}) {
  const { specificZipUrl, targetMonthCode } = options;
  const storedPeriods = await getKseiStoredPeriods();
  const publications = await getAvailableKseiPublications();

  // Find unsynced publications
  const toSync = publications.filter(pub => {
    if (specificZipUrl && pub.zipUrl === specificZipUrl) return true;
    if (targetMonthCode && pub.monthCode === targetMonthCode) return true;
    if (specificZipUrl || targetMonthCode) return false;

    // Check if this date / month is already in storedPeriods
    const isAlreadyStored = storedPeriods.some(sp => {
      if (!sp) return false;
      const str = String(sp).toUpperCase();
      if (pub.dateFormatted && str.includes(pub.dateFormatted)) return true;
      if (pub.monthCode && str.includes(pub.monthCode)) return true;
      return false;
    });

    return !isAlreadyStored;
  });

  if (toSync.length === 0) {
    return {
      success: true,
      syncedCount: 0,
      message: 'Semua periode KSEI yang tersedia di portal resmi sudah tersimpan di database.',
      results: [],
      storedPeriods,
      publications
    };
  }

  const results = [];
  let totalUpdated = 0;

  for (const pub of toSync) {
    try {
      console.log(`[KSEI AutoSync] Downloading & Ingesting ${pub.title} (${pub.zipUrl})...`);
      const extracted = await downloadAndExtractKseiZip(pub.zipUrl);
      const ingestResult = await ingestKseiText(extracted.content);

      totalUpdated += ingestResult.updatedCount || 0;
      results.push({
        title: pub.title,
        zipUrl: pub.zipUrl,
        dateFormatted: pub.dateFormatted,
        fileName: extracted.fileName,
        updatedCount: ingestResult.updatedCount,
        status: 'SUCCESS'
      });
    } catch (err) {
      console.error(`[KSEI AutoSync] Failed to process ${pub.title}:`, err);
      results.push({
        title: pub.title,
        zipUrl: pub.zipUrl,
        dateFormatted: pub.dateFormatted,
        status: 'ERROR',
        error: err.message
      });
    }
  }

  const updatedStoredPeriods = await getKseiStoredPeriods();

  return {
    success: results.some(r => r.status === 'SUCCESS'),
    syncedCount: results.filter(r => r.status === 'SUCCESS').length,
    totalUpdatedStocks: totalUpdated,
    results,
    storedPeriods: updatedStoredPeriods,
    publications
  };
}
