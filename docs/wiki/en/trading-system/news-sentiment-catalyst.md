# Bloomberg NSENT: News Sentiment Score & Market Catalyst Tagging Engine

## 1. Overview & Core Purpose
The **Bloomberg NSENT** module delivers quantitative news sentiment scoring (normalized from $-100$ to $+100$) and automatic market catalyst extraction from live Indonesian financial news streams.

News headlines significantly bias institutional liquidity and retail order flow. NSENT provides an objective, algorithmic metric to gauge whether market narrative is overwhelmingly bullish, neutral, or burdened by legal/default risks.

---

## 2. Sentiment Scoring & Classification Logic

### 2.1. Keyword Weighting & Aggregation
Each news item is scanned against curated institutional Indonesian and English equity lexicons:
- **Positive Keywords** (`laba`, `dividen`, `rekor`, `melonjak`, `ekspansi`, `akuisisi`, `untung`, `pertumbuhan`, `kontrak`, `buyback`, `profit`, `surge`, `growth`): adds $+15$ points.
- **Negative Keywords** (`rugi`, `anjlok`, `merosot`, `pailit`, `gugatan`, `suspensi`, `utang`, `bengkak`, `default`, `denda`, `penipuan`, `loss`, `lawsuit`, `probe`): subtracts $-18$ points (defensive risk penalty).

The raw score is averaged across the analyzed articles and clamped to $[-100, +100]$:

$$\text{Normalized Score} = \max\left(-100, \min\left(100, \text{round}\left(\frac{\sum \text{Article Scores}}{N}\right)\right)\right)$$

### 2.2. Verdict Thresholds
- **Score $\ge +40$**: "Sangat Positif / Katalis Kuat 🚀" (`emerald`)
- **Score $> +10$**: "Sentimen Positif 🟢" (`emerald`)
- **$-10 \le \text{Score} \le +10$**: "Netral ⚖️" (`blue`)
- **Score $< -10$**: "Sentimen Negatif 🔴" (`rose`)
- **Score $\le -40$**: "Sangat Negatif / Berita Buruk 🚨" (`rose`)

### 2.3. Automated Catalyst Tagging
Regex filters detect primary corporate event types:
- **Dividen Tunai 💰**: Cum-date, DPS, dividend distribution.
- **Kinerja Laba 📈**: Revenue, net income, EBITDA earnings expansion.
- **Aksi Korporasi 🏛️**: Mergers, acquisitions, rights issues, share buybacks.
- **Ekspansi Bisnis 🏭**: New factories, capex, project awards.
- **Risiko Hukum / Utang ⚠️**: PKPU lawsuits, debt default, trading suspensions.

---

## 3. Implementation Details
- **Engine**: `src/lib/newsSentimentEngine.js`.
- **API Handler**: Integrated into `GET /api/stocks/[ticker]` as `newsSentiment`.
- **UI Component**: Mounted inside `src/components/BloombergIntelligencePanel.jsx` in Stock Explorer.

