/**
 * Modul Pencarian Berita & Konteks Finansial Saham Indonesia (BEI)
 * Menggunakan agregasi Bing News RSS (cuplikan ringkasan artikel lengkap)
 * dan Google News RSS (fallback cepat), tanpa dependensi eksternal / zero-dependency.
 */

const MAX_NEWS_AGE_DAYS = 90; // Hanya sertakan berita dalam 90 hari terakhir
const { matchAlphaLegendSector } = require('./sectorIntelligence.js');

function cleanCompanyName(companyName) {
  if (!companyName) return '';
  return companyName
    .replace(/^(PT\.?|Perseroan Terbatas)\s+/i, '')
    .replace(/\s+(Tbk\.?|\(Persero\).*)$/ig, '')
    .trim();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return '';
  }
}

function isRecent(dateStr) {
  if (!dateStr) return true;
  try {
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return true;
    const cutoff = Date.now() - (MAX_NEWS_AGE_DAYS * 24 * 60 * 60 * 1000);
    return time >= cutoff;
  } catch (e) {
    return true;
  }
}

/**
 * Filter mendeteksi judul berita clickbait, rumor harian, rekomendasi trading broker, atau kompilasi listicle spekulatif.
 * Memastikan AI hanya memproses berita aksi korporasi nyata, realisasi belanja modal, dan kinerja bisnis fundamental.
 */
function isClickbaitTitle(title) {
  if (!title || typeof title !== 'string') return true;
  const t = title.trim();

  // Pola judul clickbait, listicle harian, atau rekomendasi spekulatif
  const clickbaitPatterns = [
    /\brekomendasi saham\b/i,
    /\bsaham pilihan\b/i,
    /\bmenu saham\b/i,
    /\bsaham jagoan\b/i,
    /\bide trading\b/i,
    /\btrading plan\b/i,
    /\bsimak target harga\b/i,
    /\btarget harga potensial\b/i,
    /\bpotensi cuan\b/i,
    /\bberpotensi cuan\b/i,
    /\blayak beli\b/i,
    /\bintip saham\b/i,
    /\bkoleksi saham\b/i,
    /\bpantau saham\b/i,
    /\bcermati saham\b/i,
    /\bcek saham\b/i,
    /\bsaham-saham ini berpotensi\b/i,
    /\bsaatnya beli\?/i,
    /\bsaatnya serok/i,
    /\brekomendasi analis\b/i,
    /\bkonsensus analis\b/i,
    /\btop (gainers|losers)\b/i,
    /\bdaftar saham cuan\b/i,
    /\bihsg.*(melemah|menguat|anjlok|merah|hijau).*?(simak|cek|intip|rekomendasi)/i
  ];

  const hasClickbaitPattern = clickbaitPatterns.some((pat) => pat.test(t));
  if (!hasClickbaitPattern) return false;

  // Pengecualian (whitelist): jika judul memuat metrik angka / aksi korporasi riil
  const concreteSignalRegex = /\b(laba bersih|dividen interim|bagikan dividen|kinerja kuartal|pendapatan melonjak|akuisisi|merger|capex|right issue|buyback|rupiah|triliun|miliar)\b/i;
  const hasConcreteSignal = concreteSignalRegex.test(t);

  // Jika judul diawali dengan format rekomendasi/menu broker harian, tetap buang
  const pureRecommendationPrefix = /^(rekomendasi saham|menu saham|ide trading|cek saham|intip saham|ihsg)/i.test(t);
  if (pureRecommendationPrefix) return true;

  return !hasConcreteSignal;
}

/**
 * Menghitung skor sinyal informasi berita (0 - 100).
 * Memberikan bobot prioritas tinggi kepada:
 * 1. Keberadaan ringkasan/cuplikan substansial (>40 karakter)
 * 2. Angka & metrik finansial riil (Rp, %, triliun, miliar, laba, dividen, capex)
 * 3. Media bisnis & ekonomi kredibel (Bisnis.com, Kontan, CNBC, Katadata, Investor Daily, Bloomberg Technoz, IDNFinancials)
 * Mengurangi bobot untuk kompilasi listicle dengan terlalu banyak kode saham.
 */
function calculateSignalScore(title = '', desc = '', source = '') {
  let score = 0;
  const fullText = `${title} ${desc}`.toLowerCase();

  // 1. Kualitas ringkasan / deskripsi artikel
  if (desc && desc.length > 40 && desc.trim().toLowerCase() !== title.trim().toLowerCase()) {
    score += 25;
    if (desc.length > 100) score += 10;
  }

  // 2. Metrik moneter & finansial konkret
  if (/(\brp|\$|triliun|miliar|juta|persen|%|\bton\b|\bbarel\b)/i.test(fullText)) {
    score += 20;
  }
  if (/\b(laba|rugi|pendapatan|omset|omzet|penjualan|ebitda|margin|kinerja|dividen|capex)\b/i.test(fullText)) {
    score += 15;
  }
  if (/\b(kuartal|semester|q[1-4]|h[1-2]|tahunan|yoy|mom|qoq)\b/i.test(fullText)) {
    score += 10;
  }
  if (/\b(akuisisi|merger|ekspansi|pabrik|kontrak|proyek|investasi|smelter|tender|ekspor)\b/i.test(fullText)) {
    score += 15;
  }

  // 3. Kredibilitas media bisnis & ekonomi resmi
  const s = (source || '').toLowerCase();
  if (
    s.includes('kontan') ||
    s.includes('bisnis.com') ||
    s.includes('cnbc') ||
    s.includes('katadata') ||
    s.includes('investor') ||
    s.includes('bloomberg') ||
    s.includes('reuters') ||
    s.includes('idnfinancials') ||
    s.includes('emitennews') ||
    s.includes('jakarta globe')
  ) {
    score += 15;
  }

  // 4. Penalti jika artikel berupa listicle kompilasi pasar (banyak kode saham)
  const tickerMatches = title.match(/\b[A-Z]{4}\b/g) || [];
  if (tickerMatches.length >= 3) {
    score -= 20;
  }

  return Math.max(0, score);
}

/**
 * 1. Ambil berita dari Bing News RSS (menyertakan teks cuplikan / deskripsi artikel)
 */
async function fetchFromBingNews(query, maxItems = 6) {
  try {
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(7000)
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    const items = [];

    for (const block of itemBlocks) {
      if (items.length >= maxItems) break;

      const titleMatch = block.match(/<title>(.*?)<\/title>/i);
      const descMatch = block.match(/<description>(.*?)<\/description>/i);
      const dateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/i);
      const sourceMatch = block.match(/<News:Source>(.*?)<\/News:Source>/i);

      if (!titleMatch) continue;

      const rawDate = dateMatch ? dateMatch[1] : '';
      if (!isRecent(rawDate)) continue; // Abaikan berita usang (> 90 hari)

      const title = (titleMatch[1] || '')
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();

      // Saring judul clickbait harian / rumor non-fundamental
      if (isClickbaitTitle(title)) continue;

      const desc = (descMatch ? descMatch[1] : '')
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();

      const source = (sourceMatch ? sourceMatch[1] : '')
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();

      const dateFmt = formatDate(rawDate);
      const datePrefix = dateFmt ? `[${dateFmt}] ` : '';
      const sourceSuffix = source ? ` (${source})` : '';

      let itemText = `- ${datePrefix}${title}${sourceSuffix}`;
      if (desc && desc.length > 25 && desc !== title) {
        // Bersihkan spasi berlebih
        const cleanDesc = desc.replace(/\s+/g, ' ');
        itemText += `\n  Ringkasan: "${cleanDesc}"`;
      }

      const signalScore = calculateSignalScore(title, desc, source);

      items.push({
        title,
        desc,
        source,
        dateFmt,
        itemText,
        signalScore
      });
    }

    return items;
  } catch (err) {
    return [];
  }
}

/**
 * 2. Fallback Google News RSS jika Bing News tidak memberikan hasil
 */
async function fetchFromGoogleNews(query, maxItems = 4) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(7000)
    });

    if (!res.ok) return [];

    const xml = await res.text();
    const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    const items = [];

    for (const block of itemBlocks) {
      if (items.length >= maxItems) break;

      const titleMatch = block.match(/<title>(.*?)<\/title>/i);
      const dateMatch = block.match(/<pubDate>(.*?)<\/pubDate>/i);

      if (!titleMatch) continue;

      const rawDate = dateMatch ? dateMatch[1] : '';
      if (!isRecent(rawDate)) continue;

      const cleanTitle = (titleMatch[1] || '')
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();

      // Saring judul clickbait
      if (isClickbaitTitle(cleanTitle)) continue;

      const dateFmt = formatDate(rawDate);
      const datePrefix = dateFmt ? `[${dateFmt}] ` : '';

      const itemText = `- ${datePrefix}${cleanTitle}`;
      const signalScore = calculateSignalScore(cleanTitle, '', '');

      items.push({
        title: cleanTitle,
        desc: '',
        source: '',
        dateFmt,
        itemText,
        signalScore
      });
    }

    return items;
  } catch (err) {
    return [];
  }
}

/**
 * Helper to build sector-specific search queries using general and specific industry keywords.
 * Leverages the 35 Alpha Legend sector intelligence catalog with structured query templates.
 */
function buildSectorThematicQueries(cleanTicker, cleanName, sector = '', subSector = '') {
  const matched = matchAlphaLegendSector(sector, subSector, cleanName);
  const queries = [
    {
      category: 'Rencana Bisnis & Capex',
      query: `${cleanName} rencana bisnis belanja modal capex ekspansi target`
    }
  ];

  if (matched.searchQueries && matched.searchQueries.length > 0) {
    matched.searchQueries.forEach((item, idx) => {
      if (typeof item === 'function') {
        queries.push({
          category: idx === 0 ? 'Siklus Industri & Kebutuhan Pasar' : 'Pangsa Pasar & Kompetitor',
          query: item(cleanName)
        });
      } else if (item && typeof item.query === 'function') {
        queries.push({
          category: item.category || (idx === 0 ? 'Siklus Industri & Kebutuhan Pasar' : 'Pangsa Pasar & Kompetitor'),
          query: item.query(cleanName)
        });
      }
    });
  }

  return queries;
}

/**
 * Fungsi utama: Agregator berita & riset tematik internet cerdas
 * Mengambil berita umum, rencana capex, serta dinamika sektor & kompetitor secara paralel
 * Dilengkapi dengan filter clickbait dan peringkat skor sinyal (signal-to-noise ranking).
 */
async function fetchLatestStockNews(ticker, companyName = '', sector = '', subSector = '') {
  try {
    const cleanTicker = (ticker || '').toUpperCase().replace(/\.JK$/, '');
    const cleanName = cleanCompanyName(companyName);

    // Kumpulan query tematik yang akan dijalankan secara paralel
    const thematicQueries = buildSectorThematicQueries(cleanTicker, cleanName, sector, subSector);

    // Tambahkan pencarian berita korporasi utama berfokus fundamental (kinerja, laba, dividen, capex)
    const primaryQuery = cleanName
      ? `"${cleanName}" (laba OR pendapatan OR kinerja OR dividen OR capex OR ekspansi)`
      : `${cleanTicker} (laba OR pendapatan OR kinerja OR dividen OR capex)`;

    const allSearchTasks = [
      { category: 'Berita & Sentimen Utama', query: primaryQuery },
      ...thematicQueries
    ];

    // Eksekusi semua pencarian Bing News secara paralel dengan timeout aman
    const searchPromises = allSearchTasks.map(async (task) => {
      let results = await fetchFromBingNews(task.query, 6);
      if (!results || results.length === 0) {
        results = await fetchFromGoogleNews(task.query, 4);
      }
      return { category: task.category, items: results || [] };
    });

    const settled = await Promise.allSettled(searchPromises);

    // Gabungkan & deduplikasi artikel berdasarkan judul dengan urutan skor sinyal tertinggi
    const seenTitles = new Set();
    const formattedSections = [];

    for (const res of settled) {
      if (res.status !== 'fulfilled') continue;
      const { category, items } = res.value;
      if (!items || items.length === 0) continue;

      // Urutkan artikel dari skor sinyal tertinggi ke terendah
      items.sort((a, b) => b.signalScore - a.signalScore);

      const uniqueFormattedItems = [];
      for (const item of items) {
        const normTitle = (item.title || item.itemText || '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');

        if (normTitle && !seenTitles.has(normTitle)) {
          seenTitles.add(normTitle);
          uniqueFormattedItems.push(item.itemText);
        }

        // Ambil maksimal 3-4 artikel berkepadatan informasi tertinggi per kategori
        if (uniqueFormattedItems.length >= 3) break;
      }

      if (uniqueFormattedItems.length > 0) {
        formattedSections.push(`[${category}]\n${uniqueFormattedItems.join('\n')}`);
      }
    }

    if (formattedSections.length === 0) {
      // Fallback ke pencarian ticker tunggal sederhana jika query boolean tidak membuahkan hasil
      const fallbackQuery = cleanName ? `"${cleanName}" saham` : `${cleanTicker} saham`;
      const fallbackItems = await fetchFromBingNews(fallbackQuery, 4);
      if (fallbackItems && fallbackItems.length > 0) {
        fallbackItems.sort((a, b) => b.signalScore - a.signalScore);
        const formatted = fallbackItems.map((it) => it.itemText);
        return `[Berita Terkini Saham]\n${formatted.join('\n')}`;
      }
      return `Tidak ada berita spesifik terkini yang terindeks untuk ${cleanTicker} dalam 90 hari terakhir. Analis harus mengacu pada fundamental historis dan dinamika sektor.`;
    }

    return formattedSections.join('\n\n');
  } catch (err) {
    console.error(`[AI-Search] Error fetching thematic news for ${ticker}:`, err.message);
    return `Pencarian berita internet untuk ${ticker} sedang tidak dapat diakses (koneksi timeout). Analisis didasarkan pada laporan keuangan resmi.`;
  }
}

module.exports = {
  fetchLatestStockNews,
  cleanCompanyName,
  buildSectorThematicQueries,
  isClickbaitTitle,
  calculateSignalScore
};
