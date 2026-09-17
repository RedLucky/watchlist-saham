/**
 * Modul Pencarian Berita & Konteks Finansial Saham Indonesia (BEI)
 * Menggunakan agregasi Bing News RSS (cuplikan ringkasan artikel lengkap)
 * dan Google News RSS (fallback cepat), tanpa dependensi eksternal / zero-dependency.
 */

const MAX_NEWS_AGE_DAYS = 90; // Hanya sertakan berita dalam 90 hari terakhir

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
 * 1. Ambil berita dari Bing News RSS (menyertakan teks cuplikan / deskripsi artikel)
 */
async function fetchFromBingNews(query, maxItems = 5) {
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
        // Bersihkan jika deskripsi memotong kalimat
        const cleanDesc = desc.replace(/\s+/g, ' ');
        itemText += `\n  Ringkasan: "${cleanDesc}"`;
      }

      items.push(itemText);
    }

    return items;
  } catch (err) {
    return [];
  }
}

/**
 * 2. Fallback Google News RSS jika Bing News tidak memberikan hasil
 */
async function fetchFromGoogleNews(query, maxItems = 5) {
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

      const dateFmt = formatDate(rawDate);
      const datePrefix = dateFmt ? `[${dateFmt}] ` : '';

      items.push(`- ${datePrefix}${cleanTitle}`);
    }

    return items;
  } catch (err) {
    return [];
  }
}

/**
 * Helper to build sector-specific search queries using general and specific industry keywords.
 * Avoids hardcoded emiten ticker checks; dynamically classifies based on sector, subsector,
 * and corporate domain terminology.
 */
function buildSectorThematicQueries(cleanTicker, cleanName, sector = '', subSector = '') {
  const metaText = `${sector} ${subSector} ${cleanName}`.toLowerCase();
  const queries = [];

  // Query 1: Strategi umum perusahaan, belanja modal (capex), dan target pertumbuhan
  queries.push({
    category: 'Rencana Bisnis & Capex',
    query: `${cleanName} rencana bisnis belanja modal capex ekspansi target`
  });

  // Query 2 & 3: Pencarian tematik berbasis kata kunci industri umum & spesifik
  if (
    metaText.includes('auto') ||
    metaText.includes('component') ||
    metaText.includes('komponen') ||
    metaText.includes('spare part') ||
    metaText.includes('suku cadang') ||
    metaText.includes('otomotif') ||
    metaText.includes('ban ') ||
    metaText.includes('kendaraan')
  ) {
    queries.push({
      category: 'Siklus Industri & Kebutuhan Pasar',
      query: `${cleanName} suku cadang spare part otomotif mobil listrik EV Gaikindo`
    });
    queries.push({
      category: 'Pangsa Pasar & Kompetitor',
      query: `${cleanName} pangsa pasar persaingan industri aftermarket OEM`
    });
  } else if (
    metaText.includes('bank') ||
    metaText.includes('financ') ||
    metaText.includes('keuangan') ||
    metaText.includes('pembiayaan') ||
    metaText.includes('asuransi')
  ) {
    queries.push({
      category: 'Kredit, CASA & Kualitas Aset',
      query: `${cleanName} pertumbuhan kredit dana murah CASA NPL margin bunga`
    });
    queries.push({
      category: 'Kompetisi & Transformasi Digital',
      query: `${cleanName} perbankan digital efisiensi BOPO pangsa pasar`
    });
  } else if (
    metaText.includes('batu bara') ||
    metaText.includes('batubara') ||
    metaText.includes('coal') ||
    metaText.includes('oil') ||
    metaText.includes('gas') ||
    metaText.includes('minyak') ||
    metaText.includes('energy') ||
    metaText.includes('energi')
  ) {
    queries.push({
      category: 'Siklus Komoditas & Regulasi',
      query: `${cleanName} batubara komoditas energi DMO ekspor royalti`
    });
    queries.push({
      category: 'Hilirisasi & Diversifikasi',
      query: `${cleanName} hilirisasi energi hijau transisi smelter capex`
    });
  } else if (
    metaText.includes('sawit') ||
    metaText.includes('cpo') ||
    metaText.includes('perkebunan') ||
    metaText.includes('plantation') ||
    metaText.includes('palma')
  ) {
    queries.push({
      category: 'Mandat Biodiesel & Harga CPO',
      query: `${cleanName} kelapa sawit CPO mandat biodiesel B40 B35 ekspor`
    });
    queries.push({
      category: 'Produktivitas & Tanaman',
      query: `${cleanName} produksi tandan buah segar yield replanting perkebunan`
    });
  } else if (
    metaText.includes('nikel') ||
    metaText.includes('nickel') ||
    metaText.includes('tembaga') ||
    metaText.includes('copper') ||
    metaText.includes('emas') ||
    metaText.includes('gold') ||
    metaText.includes('mineral') ||
    metaText.includes('metal') ||
    metaText.includes('tambang')
  ) {
    queries.push({
      category: 'Smelter & Rantai Pasok Baterai EV',
      query: `${cleanName} tambang mineral smelter nikel tembaga baterai EV RKAB`
    });
    queries.push({
      category: 'Pasar & Regulasi Ekspor',
      query: `${cleanName} cadangan tambang hilirisasi ekspor kuota produksi`
    });
  } else if (
    metaText.includes('telecom') ||
    metaText.includes('telko') ||
    metaText.includes('telekomunikasi') ||
    metaText.includes('menara') ||
    metaText.includes('tower') ||
    metaText.includes('data center') ||
    metaText.includes('fiber')
  ) {
    queries.push({
      category: 'Trafik Data & ARPU',
      query: `${cleanName} trafik data ARPU seluler internet broadband FMC`
    });
    queries.push({
      category: 'Infrastruktur & Kompetisi',
      query: `${cleanName} fiber optik data center menara telekomunikasi`
    });
  } else if (
    metaText.includes('propert') ||
    metaText.includes('real estate') ||
    metaText.includes('konstruksi') ||
    metaText.includes('construct') ||
    metaText.includes('infrastruktur') ||
    metaText.includes('semen')
  ) {
    queries.push({
      category: 'Pasar Properti & Suku Bunga',
      query: `${cleanName} marketing sales properti KPR suku bunga kontrak baru`
    });
    queries.push({
      category: 'Arus Kas & Backlog Proyek',
      query: `${cleanName} backlog kontrak recurring income pendapatan berulang`
    });
  } else if (
    metaText.includes('makan') ||
    metaText.includes('minum') ||
    metaText.includes('food') ||
    metaText.includes('beverage') ||
    metaText.includes('farmasi') ||
    metaText.includes('pharma') ||
    metaText.includes('kesehatan') ||
    metaText.includes('health') ||
    metaText.includes('consumer')
  ) {
    queries.push({
      category: 'Daya Beli & Inovasi Produk',
      query: `${cleanName} daya beli konsumsi bahan baku harga jual margin`
    });
    queries.push({
      category: 'Distribusi & Pangsa Pasar',
      query: `${cleanName} pangsa pasar jaringan distribusi ritel penjualan`
    });
  } else {
    // Sektor umum / komersial lainnya
    queries.push({
      category: 'Dinamika Industri & Pasar',
      query: `${cleanName} prospek industri permintaan pasar produk jasa`
    });
    queries.push({
      category: 'Pangsa Pasar & Posisi Kompetitif',
      query: `${cleanName} pangsa pasar posisi kompetitor keunggulan bisnis`
    });
  }

  return queries;
}

/**
 * Fungsi utama: Agregator berita & riset tematik internet cerdas
 * Mengambil berita umum, rencana capex, serta dinamika sektor & kompetitor secara paralel
 */
async function fetchLatestStockNews(ticker, companyName = '', sector = '', subSector = '') {
  try {
    const cleanTicker = (ticker || '').toUpperCase().replace(/\.JK$/, '');
    const cleanName = cleanCompanyName(companyName);

    // Kumpulan query tematik yang akan dijalankan secara paralel
    const thematicQueries = buildSectorThematicQueries(cleanTicker, cleanName, sector, subSector);

    // Tambahkan pencarian berita korporasi utama
    const primaryQuery = cleanName ? `${cleanTicker} ${cleanName} saham` : `${cleanTicker} saham`;
    const allSearchTasks = [
      { category: 'Berita & Sentimen Utama', query: primaryQuery },
      ...thematicQueries
    ];

    // Eksekusi semua pencarian Bing News secara paralel dengan timeout aman
    const searchPromises = allSearchTasks.map(async (task) => {
      let results = await fetchFromBingNews(task.query, 3);
      if (!results || results.length === 0) {
        results = await fetchFromGoogleNews(task.query, 2);
      }
      return { category: task.category, items: results || [] };
    });

    const settled = await Promise.allSettled(searchPromises);

    // Gabungkan & deduplikasi artikel berdasarkan judul
    const seenTitles = new Set();
    const formattedSections = [];

    for (const res of settled) {
      if (res.status !== 'fulfilled') continue;
      const { category, items } = res.value;
      const uniqueItems = [];

      for (const item of items) {
        // Ambil baris pertama judul untuk deduplikasi
        const firstLine = item.split('\n')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        if (firstLine && !seenTitles.has(firstLine)) {
          seenTitles.add(firstLine);
          uniqueItems.push(item);
        }
      }

      if (uniqueItems.length > 0) {
        formattedSections.push(`[${category}]\n${uniqueItems.join('\n')}`);
      }
    }

    if (formattedSections.length === 0) {
      // Fallback ke pencarian ticker tunggal sederhana jika query kompleks tidak membuahkan hasil
      const fallbackItems = await fetchFromBingNews(`saham ${cleanTicker}`, 4);
      if (fallbackItems.length > 0) {
        return `[Berita Terkini Saham]\n${fallbackItems.join('\n')}`;
      }
      return `Tidak ada berita spesifik terkini yang terindeks untuk ${cleanTicker} dalam 90 hari terakhir. Analis harus mengacu pada fundamental historis dan dinamika sektor.`;
    }

    return formattedSections.join('\n\n');
  } catch (err) {
    console.error(`[AI-Search] Error fetching thematic news for ${ticker}:`, err.message);
    return `Pencarian berita internet untuk ${ticker} sedang tidak dapat diakses (koneksi timeout). Analisis didasarkan pada laporan keuangan resmi.`;
  }
}

module.exports = { fetchLatestStockNews, cleanCompanyName, buildSectorThematicQueries };
