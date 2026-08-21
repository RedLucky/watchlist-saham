const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');

const prisma = new PrismaClient();

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
];

const getRandomDelay = (min = 2500, max = 6500) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

async function fetchIdxData(page, ticker) {
  try {
    // 1. Fetch Company Profiles Detail
    const profileUrl = `https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?kodeEmiten=${ticker}&language=id-id`;
    await page.goto(profileUrl, { waitUntil: 'networkidle0' });
    const profileText = await page.evaluate(() => document.body.innerText);
    const profileData = JSON.parse(profileText);

    // 2. Fetch Insider Trades / Keterbukaan Informasi
    // Endpoint: GetNewsSearch
    const newsUrl = `https://www.idx.co.id/primary/NewsAnnouncement/GetNewsSearch?keyword=laporan+kepemilikan&kodeEmiten=${ticker}`;
    await page.goto(newsUrl, { waitUntil: 'networkidle0' });
    const newsText = await page.evaluate(() => document.body.innerText);
    let newsData = {};
    try {
      newsData = JSON.parse(newsText);
    } catch(e) {}

    return { profile: profileData, news: newsData };
  } catch (error) {
    console.error(`Failed to fetch IDX for ${ticker}:`, error.message);
    return null;
  }
}

async function syncOwnership() {
  console.log("=== STARTING PUPPETEER KSEI & INSIDER SCRAPER ===");
  
  // Ambil semua emiten (kecuali indeks) yang terdaftar di database
  const stocks = await prisma.stockData.findMany({
    where: {
      sector: { not: null }, // Menghindari indeks saham seperti ^JKSE
    },
    orderBy: { volume: 'desc' }
  });

  if (stocks.length === 0) {
    console.log("No stocks found in DB.");
    return;
  }

  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  
  const page = await browser.newPage();
  await page.setUserAgent(getRandomUA());
  
  // Set viewport acak agar makin menyerupai layar monitor manusia
  await page.setViewport({
    width: Math.floor(Math.random() * (1920 - 1366 + 1)) + 1366,
    height: Math.floor(Math.random() * (1080 - 768 + 1)) + 768
  });

  const currentMonthStr = new Date().toLocaleString('default', { month: 'short', year: 'numeric' }); // e.g. "Aug 2026"

  for (const stock of stocks) {
    console.log(`\nProcessing ${stock.ticker}...`);
    const data = await fetchIdxData(page, stock.ticker);
    
    if (!data || !data.profile) continue;

    // --- 1. PROSES OWNERSHIP (DIREKSI & PEMEGANG SAHAM UTAMA > 5%) ---
    const pemegangSaham = data.profile.PemegangSaham || [];
    const direktur = data.profile.Direktur || [];
    const komisaris = data.profile.Komisaris || [];
    const dividen = data.profile.Dividen || [];

    const ownershipObj = {
      shareholders: pemegangSaham,
      directors: direktur,
      commissioners: komisaris,
      updatedAt: new Date().toISOString()
    };

    // --- 2. PROSES INSIDER TRADES (Keterbukaan Informasi BEI) ---
    const newsItems = data.news?.Items || [];
    const insiderTradesObj = newsItems.map(item => ({
      date: item.PublishedDate,
      title: item.Title,
      url: `https://www.idx.co.id/id/berita/pengumuman/${item.ItemId}`
    })).slice(0, 10); // Ambil 10 laporan terbaru

    // --- 3. SIMPAN KE DATABASE ---
    await prisma.stockData.update({
      where: { ticker: stock.ticker },
      data: {
        ownership: JSON.stringify(ownershipObj),
        insiderTrades: JSON.stringify(insiderTradesObj),
        dividendHistory: JSON.stringify(dividen)
      }
    });

    console.log(`[SUCCESS] ${stock.ticker} updated (Ownership, Insider, Dividend).`);
    if (insiderTradesObj.length > 0) {
      console.log(`  -> Found ${insiderTradesObj.length} Insider Disclosures.`);
    }

    // Jeda secara acak agar polanya tidak bisa ditebak WAF (Cloudflare BEI)
    const waitTime = getRandomDelay(3000, 8000);
    console.log(`  -> Bersembunyi... menunggu ${waitTime}ms sebelum emiten berikutnya...`);
    await delay(waitTime);
    
    // Ganti sidik jari peramban (User Agent) secara acak untuk emiten selanjutnya
    await page.setUserAgent(getRandomUA());
  }

  await browser.close();
  await prisma.$disconnect();
  console.log("\n=== SCRAPING COMPLETED ===");
}

syncOwnership().catch(console.error);
