/**
 * Bloomberg NSENT: News Sentiment Score & Market Catalyst Tagging Engine
 * 
 * Analyzes market news headlines and summaries to compute aggregate sentiment (-100 to +100)
 * and extracts relevant market catalyst tags.
 */

const POSITIVE_KEYWORDS = [
  'laba', 'dividen', 'rekor', 'melonjak', 'ekspansi', 'akuisisi', 'untung', 'tumbuh',
  'kontrak', 'meroket', 'bullish', 'buyback', 'surplus', 'pertumbuhan', 'kinerja positif',
  'profit', 'growth', 'surge', 'record', 'gain', 'expansion', 'dividend', 'rebound'
];

const NEGATIVE_KEYWORDS = [
  'rugi', 'anjlok', 'merosot', 'turun', 'pkr', 'pailit', 'gugatan', 'suspensi',
  'utang', 'bengkak', 'default', 'denda', 'penipuan', 'tekor', 'bearish', 'drop',
  'loss', 'penalty', 'lawsuit', 'probe', 'decline', 'plunge', 'deficit', 'fall'
];

const CATALYST_PATTERNS = [
  { tag: 'Dividen Tunai 💰', regex: /dividen|dividend|cum[\s-]date|dps/i },
  { tag: 'Kinerja Laba 📈', regex: /laba|profit|pendapatan|revenue|ebitda|kinerja|earnings/i },
  { tag: 'Aksi Korporasi 🏛️', regex: /akuisisi|merger|rights[\s-]issue|split|rups|buyback/i },
  { tag: 'Ekspansi Bisnis 🏭', regex: /ekspansi|pabrik|proyek|kontrak|investasi|capex/i },
  { tag: 'Risiko Hukum / Utang ⚠️', regex: /pailit|pkpu|gugatan|utang|default|suspensi|denda/i }
];

// Sentiment Scoring Constants
const POSITIVE_KEYWORD_WEIGHT = 15;
const NEGATIVE_KEYWORD_WEIGHT = 18; // slightly higher penalty for negative risk
const SENTIMENT_MIN_SCORE = -100;
const SENTIMENT_MAX_SCORE = 100;
const THRESHOLD_VERY_BULLISH = 40;
const THRESHOLD_BULLISH = 10;
const THRESHOLD_VERY_BEARISH = -40;
const THRESHOLD_BEARISH = -10;

/**
 * Analyzes news headlines and summaries
 */
export function analyzeNewsSentiment(articles = []) {
  if (!Array.isArray(articles) || articles.length === 0) {
    return {
      score: 0,
      verdict: 'Netral / Tanpa Berita Baru ⚖️',
      badgeColor: 'blue',
      positiveMentions: 0,
      negativeMentions: 0,
      catalystTags: [],
      articlesCount: 0
    };
  }

  let totalPoints = 0;
  let positiveMentions = 0;
  let negativeMentions = 0;
  const detectedCatalysts = new Set();

  articles.forEach(article => {
    const text = `${article.title || ''} ${article.summary || article.description || ''}`.toLowerCase();
    let articleScore = 0;

    POSITIVE_KEYWORDS.forEach(kw => {
      if (text.includes(kw)) {
        articleScore += POSITIVE_KEYWORD_WEIGHT;
        positiveMentions++;
      }
    });

    NEGATIVE_KEYWORDS.forEach(kw => {
      if (text.includes(kw)) {
        articleScore -= NEGATIVE_KEYWORD_WEIGHT;
        negativeMentions++;
      }
    });

    CATALYST_PATTERNS.forEach(cat => {
      if (cat.regex.test(text)) {
        detectedCatalysts.add(cat.tag);
      }
    });

    totalPoints += articleScore;
  });

  // Normalize score between -100 and +100
  const count = Math.max(1, articles.length);
  const normalizedScore = Math.max(
    SENTIMENT_MIN_SCORE, 
    Math.min(SENTIMENT_MAX_SCORE, Math.round(totalPoints / count))
  );

  let verdict = 'Netral ⚖️';
  let badgeColor = 'blue';

  if (normalizedScore >= THRESHOLD_VERY_BULLISH) {
    verdict = 'Sangat Positif / Katalis Kuat 🚀';
    badgeColor = 'emerald';
  } else if (normalizedScore > THRESHOLD_BULLISH) {
    verdict = 'Sentimen Positif 🟢';
    badgeColor = 'emerald';
  } else if (normalizedScore <= THRESHOLD_VERY_BEARISH) {
    verdict = 'Sangat Negatif / Berita Buruk 🚨';
    badgeColor = 'rose';
  } else if (normalizedScore < THRESHOLD_BEARISH) {
    verdict = 'Sentimen Negatif 🔴';
    badgeColor = 'rose';
  }

  return {
    score: normalizedScore,
    verdict,
    badgeColor,
    positiveMentions,
    negativeMentions,
    catalystTags: Array.from(detectedCatalysts),
    articlesCount: articles.length
  };
}

