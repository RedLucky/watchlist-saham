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
 * Fungsi utama: Agregator berita cerdas dengan ringkasan isi artikel
 */
async function fetchLatestStockNews(ticker, companyName = '') {
  try {
    const cleanTicker = (ticker || '').toUpperCase().replace(/\.JK$/, '');
    const cleanName = cleanCompanyName(companyName);

    // Prioritas 1: Bing News RSS dengan Ticker + Nama Emiten (mendapatkan ringkasan artikel lengkap)
    const primaryQuery = cleanName ? `${cleanTicker} ${cleanName} saham` : `${cleanTicker} saham`;
    let items = await fetchFromBingNews(primaryQuery, 5);

    // Prioritas 2: Fallback Bing News dengan query ticker
    if (items.length === 0) {
      items = await fetchFromBingNews(`saham ${cleanTicker}`, 5);
    }

    // Prioritas 3: Fallback ke Google News RSS
    if (items.length === 0) {
      items = await fetchFromGoogleNews(primaryQuery, 5);
    }
    if (items.length === 0) {
      items = await fetchFromGoogleNews(`saham ${cleanTicker} BEI`, 5);
    }

    if (items.length === 0) {
      return `Tidak ada berita spesifik terkini yang terindeks untuk ${cleanTicker} dalam 90 hari terakhir.`;
    }

    return items.join('\n');
  } catch (err) {
    console.error(`[AI-Search] Error fetching news for ${ticker}:`, err.message);
    return `Pencarian berita internet untuk ${ticker} sedang tidak dapat diakses (koneksi timeout).`;
  }
}

module.exports = { fetchLatestStockNews, cleanCompanyName };
