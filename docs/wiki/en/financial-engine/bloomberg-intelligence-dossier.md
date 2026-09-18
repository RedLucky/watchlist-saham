# Bloomberg Intelligence (BI): AI Stock Research Dossier Engine

## 1. Overview & Core Architecture
The **Bloomberg Intelligence (BI)** module aggregates institutional-grade equity research summaries directly into the Stock Explorer workspace.

Mirroring Bloomberg's `BI` proprietary analysis, this engine integrates the application's offline LLM inference model (`aiStockResearch` via `llama.cpp`) to synthesize complex multi-dimensional company fundamentals, consensus recommendation (`BUY`, `HOLD`, `SELL`), intrinsic valuation models, and trend momentum into an executive dossier.

---

## 2. Dossier Attributes & Schema
Stored within PostgreSQL via Prisma (`model AiStockResearch`), each research record contains:
- **`ticker`**: Primary IDX ticker symbol (e.g. `BBCA`, `TLKM`).
- **`buyHoldSell`**: Quantitative consensus action recommendation (`BUY`, `HOLD`, or `SELL`).
- **`score`**: Composite rating index ($0 - 100$).
- **`valuation`**: Narrative summary of fair value, margin of safety, and multiple expectations.
- **`trend`**: Capital flow, smart money accumulation, and technical breakout commentary.
- **`content`**: Full institutional research memo (Markdown formatted).
- **`createdAt`**: Generation timestamp for recency validation.

---

## 3. Comprehensive 35-Sector Alpha Legend Intelligence & Relational Rubrics

To eliminate generic qualitative summaries, the AI Research Engine is fully unified with all **35 granular industries** from the **Alpha Legend Screener** (`src/data/alphaLegendSectors.js`) via a dedicated intelligence engine (`src/lib/ai/sectorIntelligence.js`):

### A. Sector Intelligence Taxonomy & Resolution:
1. **Direct Slug Resolution**: Matches official `StockData.subSector` slugs (e.g. `automotive-parts`, `poultry`, `shipping`, `cpo`, `bank-syariah`, `rumah-sakit`).
2. **Semantic Keyword Taxonomy**: Zero hardcoded ticker arrays. Matches sector, subsector, and corporate activities against curated financial dictionaries (e.g. `['auto part', 'spare part', 'suku cadang', 'ban', 'tire', 'shock absorber']`).
3. **Multi-Query Thematic Search Expansion**: Automatically builds up to 4 concurrent search tasks per ticker (yielding up to 16 comprehensive news snippets per equity):
   - Task 1: Primary Stock News & Sentiment (`{ticker} {name} saham`).
   - Task 2: Corporate Capex, Expansion & Financial Strategy (`{name} rencana bisnis belanja modal capex ekspansi target`).
   - Task 3: Industry Demand Dynamics, Macro Lag Cycles & Market-Fit (`{name} [niche macro queries]`).
   - Task 4: Market Share, Peer Moat Benchmarking & Forward Catalysts (`{name} [competitor & capacity queries]`).
   - Fetch volume upgraded to up to 4 rich news items with excerpts per search task via Bing RSS and Google RSS fallback.

### B. Industry Relational Models & KPIs across 35 Sectors:
- **Automotive Parts (`automotive-parts`)**: Aging Vehicle Fleet Model (GAIKINDO 2-5y lag driving non-discretionary replacement part demand for 3-7y old cars), ICE vs EV/Hybrid component vulnerability, OEM factory contracts vs Aftermarket/OES (Shop&Drive) cash flows, GPM, ITO, ROIC.
- **Banking & Islamic Banking (`bank`, `bank-syariah`)**: CASA franchise vs Cost of Funds (CoF), segment loan growth, NPL/LAR provisioning coverage (>200%), digital BOPO/CIR, and FDR/NPF for Sharia.
- **Energy, Coal & Downstream Mining (`coal-mining`, `oil-gas`, `oil-gas-services`, `nickel-mining`)**: Cash cost curves, stripping ratios, mine life, mandatory 25% PLN DMO cap, Class 1 HPAL MHP (battery grade) vs Class 2 RKEF NPI (stainless steel), RKAB quotas.
- **Agribusiness & CPO (`cpo`, `poultry`)**: Mandatory Biodiesel B35/B40 domestic absorption floor, palm age profile (prime 8-18y vs senile replanting), FFB yield & OER (>23%), DOC price, broiler culling, and feedmill margins.
- **Logistics, Shipping & Infrastructure (`shipping`, `shipping-port`, `courier-logistics`, `jalan-tol`, `airlines`, `car-rental`, `taxi-services`)**: Baltic Dry/freight rates, vessel utilization & fleet age, TEUs port throughput, e-commerce parcel OPM, biennial toll tariff adjustments, and Seat Load Factor (SLF).
- **Healthcare & Pharmaceuticals (`rumah-sakit`, `healthcare-lab`, `farmasi`)**: Bed Occupancy Ratio (BOR), Length of Stay (LOS), private vs BPJS mix, outpatient test volumes, ethical vs OTC GPM, and API import dependency.
- **Consumer, Retail, Property & Others (`ritel`, `fmcg`, `restaurant`, `properti`, `industrial-estate`, `konstruksi`, `ebt`, `utilities`, `perhotelan`, `media`, `tower`, `telco-provider`, `pulp-paper`, `semen`, `financing`, `insurance`)**: SSSG, CCC, NAV landbank discount, recurring utility revenue, contract burn rate, take-or-pay PPA contracts, and audience share.

### C. Mandatory 7-Section Institutional Report Structure:
1. `## 1. Bedah Unit Bisnis & Rencana Strategis Perusahaan`
2. `## 2. Analisis Kebutuhan Pasar, Siklus Industri & Market-Fit`
3. `## 3. Keunggulan Bersaing (Moat) & Posisi vs Kompetitor`
4. `## 4. Analisis Fundamental & Valuasi Saham`
5. `## 5. Arah Tren & Momentum Teknikal`
6. `## 6. Analisis Sentimen Berita & Katalis Terkini`
7. `## 7. Prospek 1–2 Tahun ke Depan & Rekomendasi Akhir` (with `SKOR AI: [0-100]`, `KESIMPULAN: [BELI/HOLD/JUAL]`, and `ALASAN SINGKAT`)

---

## 4. UI Integration & Real-time Action Flow
- **Panel**: `src/components/BloombergIntelligencePanel.jsx` & `src/components/StockExplorer.jsx`.
- **Thematic Header Icons**: Dynamic section badges (🏢 Unit Bisnis, 🔄 Siklus Pasar, 🛡️ Moat & Kompetitor, 📊 Valuasi, 📈 Teknikal, 📰 Berita, 🎯 Prospek).
- **Summary Cards & Snippet Sanitization**: Summary cards in `BloombergIntelligencePanel` pass narrative snippets through `formatPreviewSnippet` to strip markdown headers (`## ...`), divider lines, and raw bullet/asterisk formatting, ensuring clean multi-line display without raw markup leakage.
- **Comprehensive Markdown Rendering (`renderAiMarkdown`)**:
  - Full institutional research memos rendered via a custom CommonMark-compliant parser supporting H1–H5 headings, horizontal dividers (`---`, `***`, `___`), blockquotes (`>`), multi-line code fences (```` ``` ````), inline code (`` `code` ``), inline math (`$math$`), bold-italics, strikethrough, and clickable external links (`[label](url)`).
  - **Dynamic Callout Cards**: Intelligently renders `SKOR AI:`, `KESIMPULAN: [BELI/HOLD/JUAL]`, and `ALASAN SINGKAT:` into structured callout boxes, even if formatted with leading/trailing bold wrappers by the LLM.
  - **Table Component**: Multi-line markdown tables (`| col1 | col2 |`) are parsed into native HTML `<table>` elements with styled headers, alternating rows, and responsive horizontal scrolling.
  - **Multiplication Safety**: Non-whitespace boundary matching prevents financial arithmetic equations (e.g. `Price = 500 * 22.5 = 11.250`) from false-matching as italic delimiters.
- **Interactive Deep Dive**: One-click action button (`onOpenFullResearch` / `Lihat Riset AI`) instantly pops open the full `aiResearch` markdown dialog without leaving the Stock Explorer interface.

---

## 5. Anti-Clickbait Filtering & Signal-to-Noise Ranking Engine

To prevent LLM hallucination and ensure research memos are grounded purely on verifiable corporate facts, the web context pipeline (`src/lib/ai/search.js` and `src/lib/ai/prompter.js`) implements a two-stage signal-ranking architecture:

### A. Anti-Clickbait Title Filtration (`isClickbaitTitle`)
- **Noise Elimination**: Automatically purges speculative daily trading notes, listicles, and sensationalist headlines matching patterns such as:
  - Daily broker picks: `rekomendasi saham`, `menu saham`, `saham pilihan`, `saham jagoan`, `ide trading`, `trading plan`.
  - Price target bait: `simak target harga`, `target harga potensial`, `potensi cuan`, `layak beli`, `intip saham`, `saatnya beli?`.
  - Market wrap noise: `ihsg melemah... cek rekomendasi`, `top gainers/losers`.
- **Corporate Action Whitelist**: Preserves articles containing verifiable financial figures and corporate disclosures (e.g. `laba bersih`, `dividen interim`, `capex`, `akuisisi`, `rights issue`, `buyback`, `miliar`, `triliun`).

### B. Signal-to-Noise Scoring (`calculateSignalScore`)
Each retrieved news item is scored from $0 - 100$ and sorted descending before section compilation:
1. **Snippet Richness (+25 to +35 pts)**: High credit for substantive body descriptions (>40 chars) extracted via Bing RSS.
2. **Monetary & Operational Figures (+20 pts)**: Concrete metrics (`Rp`, `%`, `triliun`, `miliar`, `ton`, `barel`).
3. **Core Financial Actions (+15 pts)**: Performance metrics (`laba`, `pendapatan`, `ebitda`, `capex`, `dividen`).
4. **Institutional Source Credibility (+15 pts)**: Verified financial media outlets (`Bisnis.com`, `Kontan`, `CNBC Indonesia`, `Katadata`, `Investor Daily`, `Bloomberg Technoz`, `IDNFinancials`, `Jakarta Globe`).
5. **Listicle Penalty (-20 pts)**: Heavily penalizes articles referencing 3+ tickers simultaneously.

### C. Targeted Boolean Querying
Replaces verbose raw text with targeted boolean queries:
- Primary Corporate Query: `"${cleanName}" (laba OR pendapatan OR kinerja OR dividen OR capex OR ekspansi)`
- Capex Expansion Query: `"${cleanName}" (rencana bisnis OR belanja modal OR capex OR ekspansi OR target laba)`

### D. Hardened LLM Anti-Clickbait Prompt Mandate
Section 4 and Section 6 in `prompter.js` inject the `[ANTI-CLICKBAIT & STRICT FACT-FILTERING MANDATE]`, commanding the AI to strictly ignore broker morning calls and ground sentiment evaluations solely on official corporate actions and audited quarterly releases.


